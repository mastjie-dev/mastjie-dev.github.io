import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import { DepthTexture } from '../cores/TextureCore.js'
import VARS from '../cores/VARS.js'
import { PipelineDescriptorBuilder, RenderPassDescriptorBuilder } from '../cores/Builder.js'

import BaseGeometry from '../scenes/BaseGeometry.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
// import BindGroup from '../cores/BindGroup.js'
// import BindGroupLayout from '../cores/BindGroupLayout.js'
import { bindResource, bindVertex } from '../scenes/Utils.js'

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
@group(1) @binding(0) var<uniform> camera: Camera;
@group(2) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) uv: vec2f,
) -> VSOutput
{
    var output: VSOutput;
    output.position = camera.projection * camera.view * model.matrix * vec4f(position, 1.);
    output.uv = uv;
    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f 
{
    return vec4f(color, 1.);
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

    const data = GeometryUtils.createBox(2, 2, 2, 15, 15, 15)

    const geo = new BaseGeometry()
    geo.addAttributes(new BufferCore(
        "position", "attribute", data.position, VARS.Buffer.Attribute32x3))
    geo.addAttributes(new BufferCore("uv", "attributes", data.uv, VARS.Buffer.Attribute32x2))
    geo.addIndex(new BufferCore("index", "index", data.index, VARS.Buffer.IndexUint16))

    const mat = new BaseMaterial()
    mat.addBuffer(new BufferCore("blue", "uniform",
        new Float32Array([0, 0, 1]), VARS.Buffer.Uniform))

    const mesh = new Mesh(geo, mat)
    mesh.updateMatrixWorld()
    mesh.updateBuffer()

    const camera = new PerspectiveCamera(75, width / height)
    camera.position.set(0, 0, -15)
    camera.updateProjectionMatrix()
    camera.updateViewMatrix()

    bindVertex(instance, geo)
    bindResource(instance, mat, mat.buffers[0])
    bindResource(instance, mesh, mesh.buffer)
    bindResource(instance, camera, camera.buffer)

    const shaderModule = instance.createShaderModule(shaderCode)

    const renderPL = instance.createPipelineLayout(
        mat.bindGroupLayout.GPUBindGroupLayout,
        camera.bindGroupLayout.GPUBindGroupLayout,
        mesh.bindGroupLayout.GPUBindGroupLayout,
    )
    const rpDesc = PipelineDescriptorBuilder
        .start()
        .layout(renderPL)
        .vertex(shaderModule, geo.vertexBufferLayout)
        .fragment(shaderModule, canvasFormat)
        .primitive(mat.cullMode)
        .depthStencil(
            mat.depthWriteEnabled,
            mat.depthFormat,
            mat.depthCompare
        )
        .end()

    const renderObject = instance.createRenderPipeline(mesh, rpDesc)
    const renderPassDescriptor = RenderPassDescriptorBuilder.start().end()

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const render = () => {
        instance.custom(device => {
            const encoder = device.createCommandEncoder()

            renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView()
            renderPassDescriptor.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

            const renderPass = encoder.beginRenderPass(renderPassDescriptor)
            renderPass.setPipeline(renderObject.pipeline)
            renderPass.setVertexBuffer(0, geo.attributes[0].GPUBuffer)
            renderPass.setVertexBuffer(1, geo.attributes[1].GPUBuffer)
            renderPass.setBindGroup(0, mat.bindGroup.GPUBindGroup)
            renderPass.setBindGroup(1, camera.bindGroup.GPUBindGroup)
            renderPass.setBindGroup(2, mesh.bindGroup.GPUBindGroup)
            renderPass.setIndexBuffer(geo.index.GPUBuffer, geo.index.format)
            renderPass.drawIndexed(geo.index.length)
            renderPass.end()

            device.queue.submit([encoder.finish()])                
            
            // requestAnimationFrame(render)
        })
    }
    render()

    document.body.appendChild(canvas)
}

main()

