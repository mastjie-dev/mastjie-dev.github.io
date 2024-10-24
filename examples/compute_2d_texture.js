import WebGPUInstance from '../cores/WebGPUInstance.js'
import { StorageTexture, CopyTargetTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import { RenderPassDescriptorBuilder } from '../cores/Builder.js'

import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import BindGroup from '../cores/BindGroup.js'
import BindGroupLayout from '../cores/BindGroupLayout.js'
import Compute from '../scenes/Compute.js'
import { PipelineDescriptorBuilder } from '../cores/Builder.js'

const shaderCode = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@group(0) @binding(0) var map: texture_2d<f32>;
@group(0) @binding(1) var smp: sampler;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
) -> VSOutput
{
    var output: VSOutput;
    output.position = vec4f(position, 1.);
    output.uv = uv;
    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f 
{
    let color = textureSample(map, smp, input.uv).rgb;
    return vec4f(color, 1.);
}
`

const computeCode = `
@group(0) @binding(0) var st2d: texture_storage_2d<bgra8unorm, write>;

// Worley: https://thebookofshaders.com/12/
fn rand( p: vec2f ) -> vec2f {
    return fract(sin(vec2f(dot(p,vec2f(127.1,311.7)),dot(p,vec2f(269.5,183.3))))*43758.5453);
}

@compute @workgroup_size(8, 8, 1) 
fn main_compute(
    @builtin(global_invocation_id) id: vec3<u32>,
)
{
    let uv = vec2f(f32(id.x), f32(id.y)) / 256.;
    let st = uv * 8.;
    let fl = floor(st);
    let fr = fract(st);
    var mDist = 1.;

    for (var i = -1; i <= 1; i++) {
        for(var j = -1; j <= 1; j++) {
            let n = vec2f(f32(i), f32(j));
            let r = rand(n+fl);
            let p = n + r - fr;
            let d = length(p);
            mDist = min(mDist, d);
        }
    }

    let cl = vec4f(vec3f(mDist), 1.);
    textureStore(st2d, id.xy, cl);
}
`

async function main() {
    const width = window.innerWidth
    const height = window.innerHeight
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    canvas.style.display = "block"
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat()

    const instance = new WebGPUInstance()
    await instance.init()

    const context = canvas.getContext("webgpu")
    context.configure({
        device: instance.device,
        format: canvasFormat
    })

    /**
     *  Compute Stage
     */
    const worleyStorage = new StorageTexture(256, 256)
    
    const compute = new Compute()
    compute.shader = computeCode
    compute.setWorkgroups(32, 32)
    compute.addTexture(worleyStorage)

    instance.bindComputeResources(compute)
    const comPPL = instance.createPipelineLayout(compute.bindGroupLayout.GPUBindGroupLayout)
    instance.createComputePipeline(compute, comPPL)

    /**
     *  Render Stage
     */
    const worleyTexture = new CopyTargetTexture(256, 256)

    const geo = GeometryUtils.createPlane(2, 2)
    const mat = new BaseMaterial()
    mat.shader = shaderCode
    mat.addTexture(worleyTexture)
    mat.addSampler(new SamplerCore())

    const mesh = new Mesh(geo, mat)

    instance.bindMeshesResources(mesh)

    const renderPipelineLayout = instance
        .createPipelineLayout(mesh.material.bindGroupLayout.GPUBindGroupLayout)

    const pipelineDescriptor = PipelineDescriptorBuilder
        .start()
        .layout(renderPipelineLayout)
        .vertex(mesh.material.shaderModule, mesh.geometry.vertexBufferLayout)
        .fragment(mesh.material.shaderModule, canvasFormat)
        .end()

    const renderObject = instance.createRenderPipeline(mesh, pipelineDescriptor)

    const renderPassDescriptor = RenderPassDescriptorBuilder
        .start()
        .disableStencilAttachment()
        .end()

    const encoder = instance.createCommandEncoder()

    const computePass = encoder.beginComputePass()
    computePass.setPipeline(compute.pipeline)
    computePass.setBindGroup(0, compute.bindGroup.GPUBindGroup)
    computePass.dispatchWorkgroups(...compute.workgroups)
    computePass.end()

    instance.copyTextureToTexture(encoder, worleyStorage, worleyTexture)

    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView()

    const renderPass = encoder.beginRenderPass(renderPassDescriptor)
    renderPass.setPipeline(renderObject.pipeline)

    let i = 0
    for (let attr of mesh.geometry.attributes) {
        renderPass.setVertexBuffer(i, attr.GPUBuffer)
        ++i
    }

    renderPass.setBindGroup(0, mat.bindGroup.GPUBindGroup)
    renderPass.setIndexBuffer(geo.index.GPUBuffer, geo.index.format)
    renderPass.drawIndexed(geo.index.length)
    renderPass.end()

    instance.submitEncoder([encoder.finish()])

    document.body.appendChild(canvas)
}

main()