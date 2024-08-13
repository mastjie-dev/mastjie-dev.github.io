import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import { DepthTexture, StorageTexture, TargetTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import VARS from '../cores/VARS.js'

import BaseGeometry from '../scenes/BaseGeometry.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import BindGroup from '../cores/BindGroup.js'
import BindGroupLayout from '../cores/BindGroupLayout.js'
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
    @location(1) uv: vec2f,
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
    let st = uv * 10.;
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
    const computeModule = instance.createShaderModule(computeCode)
    const st2d = new StorageTexture("st2d", 256, 256)
    instance.createAndWriteTexture(st2d)

    const computeObject = {
        bindGroupLayout: new BindGroupLayout(),
        bindGroup: new BindGroup(),
        textures: [st2d],
        pipeline: null,
        workgroups: [32, 32, 1]
    }

    instance
        .createBindGroupLayoutEntries(st2d, computeObject.bindGroupLayout.entries)
        .createBindGroupLayout(computeObject, computeObject.bindGroupLayout.entries)
        .createBindGroupEntries(st2d, computeObject.bindGroup.entries)
        .createBindGroup(computeObject, computeObject.bindGroup.entries)

    const computePipelineLayout = instance
        .createPipelineLayout(computeObject.bindGroupLayout.GPUBindGroupLayout)

    instance.createComputePipeline(computeObject, computePipelineLayout, computeModule)

    /**
     *  Render Stage
     */
    const shaderModule = instance.createShaderModule(shaderCode)
    const data = GeometryUtils.createPlane(2, 2, 1, 1)
    
    const geo = new BaseGeometry()
    geo.addAttributes(new BufferCore(
        "position", "attribute", data.position, VARS.Buffer.Attribute32x3))
    geo.addAttributes(new BufferCore("uv", "attributes", data.uv, VARS.Buffer.Attribute32x2))
    geo.addIndex(new BufferCore("index", "index", data.index, VARS.Buffer.IndexUint16))

    const worleyTexture = new TargetTexture("worley", 256, 256)

    const mat = new BaseMaterial()
    mat.addTexture(worleyTexture)
    mat.addSampler(new SamplerCore())

    instance
        .createAndWriteBuffer(geo.attributes[0])
        .createAndWriteBuffer(geo.attributes[1])
        .createAndWriteBuffer(geo.index)
        .createVertexBufferLayout(geo)

        .createAndWriteTexture(worleyTexture)
        .createSampler(mat.samplers[0])
        .createBindGroupLayoutEntries(mat.textures[0], mat.bindGroupLayout.entries)
        .createBindGroupLayoutEntries(mat.samplers[0], mat.bindGroupLayout.entries)
        .createBindGroupLayout(mat, mat.bindGroupLayout.entries)

        .createBindGroupEntries(mat.textures[0], mat.bindGroup.entries)
        .createBindGroupEntries(mat.samplers[0], mat.bindGroup.entries)
        .createBindGroup(mat, mat.bindGroup.entries)

    const mesh = new Mesh(geo, mat)
    const renderPipelineLayout = instance.createPipelineLayout(mat.bindGroupLayout.GPUBindGroupLayout)
    
    const pipelineDescriptor = PipelineDescriptorBuilder
        .start()
        .layout(renderPipelineLayout)
        .vertex(shaderModule, geo.vertexBufferLayout)
        .fragment(shaderModule, canvasFormat)
        .end()
    
    const renderObject = instance.createRenderPipeline(mesh, pipelineDescriptor)

    const renderPassDescriptor = structuredClone(VARS.RenderPassDescriptor.Basic)

    instance.custom(device => {
        const encoder = device.createCommandEncoder()

        const computePass = encoder.beginComputePass()
        computePass.setPipeline(computeObject.pipeline)
        computePass.setBindGroup(0, computeObject.bindGroup.GPUBindGroup)
        computePass.dispatchWorkgroups(...computeObject.workgroups)
        computePass.end()

        instance.copyTextureToTexture(encoder, st2d, worleyTexture)

        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView()
        
        const renderPass = encoder.beginRenderPass(renderPassDescriptor)
        renderPass.setPipeline(renderObject.pipeline)
        renderPass.setVertexBuffer(0, geo.attributes[0].GPUBuffer)
        renderPass.setVertexBuffer(1, geo.attributes[1].GPUBuffer)
        renderPass.setBindGroup(0, mat.bindGroup.GPUBindGroup)
        renderPass.setIndexBuffer(geo.index.GPUBuffer, geo.index.format)
        renderPass.drawIndexed(geo.index.length)
        renderPass.end()

        device.queue.submit([encoder.finish()])
    })

    document.body.appendChild(canvas)
}

main()