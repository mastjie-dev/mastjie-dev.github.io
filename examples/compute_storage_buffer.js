import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import { DepthTexture } from '../cores/TextureCore.js'
import VARS from '../cores/VARS.js'

import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import BindGroup from '../cores/BindGroup.js'
import BindGroupLayout from '../cores/BindGroupLayout.js'
import { PipelineDescriptorBuilder, RenderPassDescriptorBuilder } from '../cores/Builder.js'
import Stats from '../misc/Stats.js'

const shaderCode = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

struct Camera {
    projection: mat4x4<f32>,
    view: mat4x4<f32>,
};

struct Model {
    matrix: mat4x4<f32>,
    normal: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> color: vec3f;
@group(0) @binding(1) var<storage, read> pos: array<vec3f>;
@group(1) @binding(0) var<uniform> camera: Camera;
@group(2) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
) -> VSOutput
{
    var output: VSOutput;
    let transform = position + pos[0];
    output.position = camera.projection * camera.view * model.matrix * vec4f(transform, 1.);
    output.uv = uv;
    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f 
{
    let c = vec3f(input.uv, 0.);
    return vec4f(c, 1.);
}
`

const computeCode = `
@group(0) @binding(0) var<storage, read_write> pos: array<vec3f>;
@group(0) @binding(1) var<uniform> time: f32;

@compute @workgroup_size(1) 
fn main_compute(
    @builtin(global_invocation_id) id: vec3<u32>,
)
{
    let i = id.x;
    let x = sin(time);
    let y = cos(time);
    pos[i] = vec3f(x, y, 0);
}
`

function bindResource(instance, owner, resource) {
    if (!resource.GPUBuffer) {
        instance.createAndWriteBuffer(resource)
    }

    instance
        .createBindGroupLayoutEntries(resource, owner.bindGroupLayout.entries)
        .createBindGroupLayout(owner, owner.bindGroupLayout.entries)
        .createBindGroupEntries(resource, owner.bindGroup.entries)
        .createBindGroup(owner, owner.bindGroup.entries)
}

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

    const computeModule = instance.createShaderModule(computeCode)

    const storageData = new Float32Array(4)
    const inBuffer = new BufferCore("position in", "storage", storageData, VARS.Buffer.Storage)
    const timeBuffer = new BufferCore("time", "uniform", new Float32Array(1), VARS.Buffer.Uniform)
    timeBuffer.visibility = GPUShaderStage.COMPUTE

    const computeObject = {
        bindGroup: new BindGroup(),
        bindGroupLayout: new BindGroupLayout(),
        pipeline: null,
        workgroups: [1, 1, 1],
    }

    bindResource(instance, computeObject, inBuffer)
    bindResource(instance, computeObject, timeBuffer)

    const computePL = instance.createPipelineLayout(computeObject.bindGroupLayout.GPUBindGroupLayout)
    instance.createComputePipeline(computeObject, computePL, computeModule)

    const geo = GeometryUtils.createBox(2, 2, 2, 1, 1, 1)

    const outBuffer = new BufferCore("position out", "read-only-storage", storageData, VARS.Buffer.Storage)
    outBuffer.usage -= GPUBufferUsage.COPY_SRC
    outBuffer.visibility = GPUShaderStage.VERTEX

    const mat = new BaseMaterial()
    mat.shader = shaderCode
    mat.addBuffer(new BufferCore("blue", "uniform",
        new Float32Array([0, 0, 1]), VARS.Buffer.Uniform))
    mat.addBuffer(outBuffer)

    const mesh = new Mesh(geo, mat)
    mesh.updateMatrixWorld()
    mesh.updateBuffer()

    const camera = new PerspectiveCamera(75, width / height)
    camera.position.set(0, -2, -5)
    camera.updateProjectionMatrix()
    camera.updateViewMatrix()

    instance.bindCamerasResource(camera)
    instance.bindMeshesResources(mesh)

    const renderPL = instance.createPipelineLayout(
        mesh.material.bindGroupLayout.GPUBindGroupLayout,
        camera.bindGroupLayout.GPUBindGroupLayout,
        mesh.bindGroupLayout.GPUBindGroupLayout,
    )
    const rpDesc = PipelineDescriptorBuilder
        .start()
        .layout(renderPL)
        .vertex(mesh.material.shaderModule, mesh.geometry.vertexBufferLayout)
        .fragment(mesh.material.shaderModule, canvasFormat)
        .primitive(mesh.material.cullMode)
        .depthStencil(
            mesh.material.depthWriteEnabled,
            mesh.material.depthFormat,
            mesh.material.depthCompare
        )
        .end()

    const renderObject = instance.createRenderPipeline(mesh, rpDesc)
    const renderPassDescriptor = RenderPassDescriptorBuilder.start().end()

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const rawBuffer = new BufferCore("test", "uniform", storageData, {
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        visibility: GPUShaderStage.FRAGMENT,
    })
    instance.createBuffer(rawBuffer)

    const stats = new Stats()

    const render = (time) => {
        const start = performance.now()

        const encoder = instance.createCommandEncoder()

        timeBuffer.data[0] += .016
        instance.writeBuffer(timeBuffer)

        const computePass = encoder.beginComputePass()
        computePass.setPipeline(computeObject.pipeline)
        computePass.setBindGroup(0, computeObject.bindGroup.GPUBindGroup)
        computePass.dispatchWorkgroups(...computeObject.workgroups)
        computePass.end()

        instance.copyBufferToBuffer(encoder, inBuffer, outBuffer)

        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView()
        renderPassDescriptor.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

        const renderPass = encoder.beginRenderPass(renderPassDescriptor)
        renderPass.setPipeline(renderObject.pipeline)

        let i = 0
        for (let attr of mesh.geometry.attributes) {
            renderPass.setVertexBuffer(i, attr.GPUBuffer)
            ++i
        }

        renderPass.setBindGroup(0, mat.bindGroup.GPUBindGroup)
        renderPass.setBindGroup(1, camera.bindGroup.GPUBindGroup)
        renderPass.setBindGroup(2, mesh.bindGroup.GPUBindGroup)
        renderPass.setIndexBuffer(geo.index.GPUBuffer, geo.index.format)
        renderPass.drawIndexed(geo.index.length)
        renderPass.end()

        instance.submitEncoder([encoder.finish()])

        const end = performance.now()
        stats.update(time, end - start)
        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)

    document.body.appendChild(canvas)
}

main()

