import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import { DepthTexture, ExternalImageTexture, StorageTexture, TargetTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import VARS from '../cores/VARS.js'

import BaseGeometry from '../scenes/BaseGeometry.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import BindGroup from '../cores/BindGroup.js'
import BindGroupLayout from '../cores/BindGroupLayout.js'

import blueNoisePNG from '../public/blue_noise.png'

const shaderCode = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var worley: texture_3d<f32>;
@group(0) @binding(2) var blue: texture_2d<f32>;
@group(0) @binding(3) var smp: sampler;

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
    let st = input.uv - .5;
    let bn = textureSample(blue, smp, input.uv*10.).r;

    let ro = vec3f(0, 0, -3.);
    let rd = normalize(vec3f(st, 1.));
    let step = .2;
    var mDist = 0.;
    var t = 1.;

    for (var i = 0; i < 64; i++) {
        let p = ro + rd * mDist;
        let d = length(p) - 1.;

        var n = textureSample(worley, smp, (p+1.) * .25 + vec3f(time*.1, 0., 0.)).r;
        n = smoothstep(.5, 1., n);
        if (d < 0.) {
            t *= exp(-step*n*1.5);
        }

        mDist += step * bn;
    }

    let color = vec3(1.-t);
    return vec4f(color, 1.);
}
`

const computeCode = `
@group(0) @binding(0) var st3d: texture_storage_3d<bgra8unorm, write>;

// Worley: https://thebookofshaders.com/12/
fn rand(p: vec3f) -> vec3f {
    return fract(sin(vec3f(
        dot(p,vec3f(127.1,311.7, 93.4)),
        dot(p,vec3f(269.5,183.3, 111.2)),
        dot(p,vec3f(391.5,218.1, 149.0))
    ))*43758.5453);
}

@compute @workgroup_size(4, 4, 4) 
fn main_compute(
    @builtin(global_invocation_id) id: vec3<u32>,
)
{
    let uvw = vec3f(f32(id.x), f32(id.y), f32(id.z)) / 128.;
    let st = uvw * 10.;
    let fl = floor(st);
    let fr = fract(st);
    var mDist = 1.;

    for (var i = -1; i <= 1; i++) {
        for(var j = -1; j <= 1; j++) {
            for (var k = -1; k <= 1; k++) {
                let n = vec3f(f32(i), f32(j), f32(k));
                let r = rand(n+fl);
                let p = n + r - fr;
                let d = length(p);
                mDist = min(mDist, d);
            }
        }
    }

    let cl = vec4f(vec3f(mDist), 1.);
    textureStore(st3d, id, cl);
}
`
// https://webgpufundamentals.org/webgpu/lessons/webgpu-importing-textures.html
async function loadImageBitmap(url) {
    const res = await fetch(url)
    const blob = await res.blob()
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' })
}

async function main() {
    const width =  512//window.innerWidth
    const height = 512//window.innerHeight
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    canvas.style.display = "block"

    const instance = new WebGPUInstance()
    await instance.init()

    const context = canvas.getContext("webgpu")
    context.configure({
        device: instance.device,
        format: navigator.gpu.getPreferredCanvasFormat()
    })

    /**
     *  Compute Stage
     */
    const computeModule = instance.createShaderModule(computeCode)

    const st3d = new StorageTexture("worleyCompute", 128, 128, 128, "3d")
    instance.createAndWriteTexture(st3d)

    const computeObject = {
        bindGroupLayout: new BindGroupLayout(),
        bindGroup: new BindGroup(),
        textures: [st3d],
        pipeline: null,
        workgroups: [32, 32, 32]
    }

    instance
        .createBindGroupLayoutEntries(st3d, computeObject.bindGroupLayout.entries)
        .createBindGroupLayout(computeObject, computeObject.bindGroupLayout.entries)
        .createBindGroupEntries(st3d, computeObject.bindGroup.entries)
        .createBindGroup(computeObject, computeObject.bindGroup.entries)

    const computePipelineLayout = instance
        .createPipelineLayout(computeObject.bindGroupLayout.GPUBindGroupLayout)

    instance.createComputePipeline(computeObject, computePipelineLayout, computeModule)

    /**
     *  Render Stage
     */
    const blueNoiseBitmap = await loadImageBitmap(blueNoisePNG)

    const shaderModule = instance.createShaderModule(shaderCode)
    const data = GeometryUtils.createPlane(2, 2, 1, 1)

    const geo = new BaseGeometry()
    geo.addAttributes(new BufferCore(
        "position", "attribute", data.position, VARS.Buffer.Attribute32x3))
    geo.addAttributes(new BufferCore("uv", "attributes", data.uv, VARS.Buffer.Attribute32x2))
    geo.addIndex(new BufferCore("index", "index", data.index, VARS.Buffer.IndexUint16))

    const time = new BufferCore("time", "uniform", new Float32Array([0]), VARS.Buffer.Uniform)
    const worleyTexture = new TargetTexture("worley", 128, 128, 128, "3d")
    const blueNoiseTexture = new ExternalImageTexture("blueNoise", blueNoiseBitmap.width,
        blueNoiseBitmap.height, blueNoiseBitmap)

    const mat = new BaseMaterial()
    mat.addBuffer(time)
    mat.addTexture(worleyTexture)
    mat.addTexture(blueNoiseTexture)
    mat.addSampler(new SamplerCore())
    mat.cullMode = "none"

    instance
        .createAndWriteBuffer(geo.attributes[0])
        .createAndWriteBuffer(geo.attributes[1])
        .createAndWriteBuffer(geo.index)
        .createVertexBufferLayout(geo)

        .createAndWriteBuffer(time)
        .createAndWriteTexture(blueNoiseTexture)
        .createAndWriteTexture(worleyTexture)
        .createSampler(mat.samplers[0])
        .createBindGroupLayoutEntries(mat.buffers[0], mat.bindGroupLayout.entries)
        .createBindGroupLayoutEntries(mat.textures[0], mat.bindGroupLayout.entries)
        .createBindGroupLayoutEntries(mat.textures[1], mat.bindGroupLayout.entries)
        .createBindGroupLayoutEntries(mat.samplers[0], mat.bindGroupLayout.entries)
        .createBindGroupLayout(mat, mat.bindGroupLayout.entries)

        .createBindGroupEntries(mat.buffers[0], mat.bindGroup.entries)
        .createBindGroupEntries(mat.textures[0], mat.bindGroup.entries)
        .createBindGroupEntries(mat.textures[1], mat.bindGroup.entries)
        .createBindGroupEntries(mat.samplers[0], mat.bindGroup.entries)
        .createBindGroup(mat, mat.bindGroup.entries)


    const mesh = new Mesh(geo, mat, shaderModule)
    const renderPipelineLayout = instance.createPipelineLayout(mat.bindGroupLayout.GPUBindGroupLayout)
    const renderObject = instance.createRenderPipeline(mesh, renderPipelineLayout)

    const depthTexture = new DepthTexture("depth", width, height)
    depthTexture.format = "depth24plus"
    instance.createTexture(depthTexture)

    const renderPassDescriptor = structuredClone(VARS.RenderPassDescriptor.Standard)

    instance.custom(device => {
        const encoder = device.createCommandEncoder()

        const computePass = encoder.beginComputePass()
        computePass.setPipeline(computeObject.pipeline)
        computePass.setBindGroup(0, computeObject.bindGroup.GPUBindGroup)
        computePass.dispatchWorkgroups(...computeObject.workgroups)
        computePass.end()

        instance.copyTextureToTexture(encoder, st3d, worleyTexture)

        device.queue.submit([encoder.finish()])
    })

    const render = () => {
        instance.custom(device => {
            time.data[0] += 0.016
            instance.writeBuffer(time)

            const encoder = device.createCommandEncoder()

            renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView()
            renderPassDescriptor.depthStencilAttachment.view = depthTexture.GPUTexture.createView()
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
        requestAnimationFrame(render)
    }
    render()

    document.body.appendChild(canvas)
}

main()