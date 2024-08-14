import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import VARS from '../cores/VARS.js'
import { DepthTexture } from '../cores/TextureCore.js'
import { PipelineDescriptorBuilder } from '../cores/Builder.js'

import Vector3 from '../math/Vector3.js'

import BaseGeometry from '../scenes/BaseGeometry.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import InstanceMesh from '../scenes/InstanceMesh.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import NodeCore from '../scenes/NodeCore.js'

const shaderCode = `
struct Camera {
    projection: mat4x4<f32>,
    view: mat4x4<f32>,
};

struct Model {
    matrix: array<mat4x4f, 64>
};

struct Color {
    red: vec3f,
    blue: vec3f,
};

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@group(0) @binding(0) var<uniform> colors: Color;
@group(1) @binding(0) var<uniform> camera: Camera;
@group(2) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @builtin(instance_index) id: u32,
    @location(0) position: vec3f,
    @location(1) uv: vec2f,
) -> VSOutput
{

    let transform = model.matrix[id] * vec4f(position, 1.);

    var output: VSOutput;
    output.position = camera.projection * camera.view * transform;
    output.uv = uv;

    return output;
}

@fragment fn main_fragment(
    input: VSOutput
) -> @location(0) vec4f
{
    let color = mix(colors.red, colors.blue, input.uv.y);
    return vec4f(color, 1.);
}
`

async function main() {
    const width = window.innerWidth
    const height = window.innerHeight

    const instance = new WebGPUInstance()
    await instance.init()

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    canvas.style.display = "block"
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
    const context = canvas.getContext("webgpu")
    context.configure({
        device: instance.device,
        format: canvasFormat
    })

    const camera = new PerspectiveCamera(75, width / height)
    camera.position.set(0, 0, -50)
    camera.updateProjectionMatrix()
    camera.updateViewMatrix()

    const data = GeometryUtils.createBox()
    const geo = new BaseGeometry("box geometry")
    geo.addAttributes(
        new BufferCore("position", "attribute", data.position, VARS.Buffer.Attribute32x3))
    geo.addAttributes(new BufferCore("uv", "attributes", data.uv, VARS.Buffer.Attribute32x2))
    geo.addIndex(new BufferCore("index", "index", data.index, VARS.Buffer.IndexUint16))

    const mat = new BaseMaterial("box material")
    mat.addBuffer(new BufferCore("colors", "uniform", new Float32Array([
        1, 0, 0, 0,
        0, 0, 1, 0,
    ]), VARS.Buffer.Uniform))

    const count = 64
    const mesh = new InstanceMesh(geo, mat, count)

    const root = new NodeCore()
    root.updateMatrixWorld()
    root.addChild(mesh)

    const node = new NodeCore()
    const pos = new Vector3()
    const rot = new Vector3()
    for (let i = 0; i < count; i++) {
        const x = Math.floor(i / 16)
        const y = Math.floor((i / 4) % 4)
        const z = i % 4

        pos.set(x, y, z)
            .subScalar(1.5)
            .normalize()
            .multiplyScalar(8)
        node.position.copy(pos)
        node.updateMatrixWorld()
        mesh.updateMatrix(i, node.worldMatrix)
    }
    mesh.updateBuffer()

    instance
        .createAndWriteBuffer(geo.attributes[0])
        .createAndWriteBuffer(geo.attributes[1])
        .createAndWriteBuffer(geo.index)
        .createVertexBufferLayout(geo)

        .createAndWriteBuffer(mat.buffers[0])
        .createBindGroupLayoutEntries(mat.buffers[0], mat.bindGroupLayout.entries)
        .createBindGroupLayout(mat, mat.bindGroupLayout.entries)
        .createBindGroupEntries(mat.buffers[0], mat.bindGroup.entries)
        .createBindGroup(mat, mat.bindGroup.entries)

        .createAndWriteBuffer(mesh.buffer)
        .createBindGroupLayoutEntries(mesh.buffer, mesh.bindGroupLayout.entries)
        .createBindGroupLayout(mesh, mesh.bindGroupLayout.entries)
        .createBindGroupEntries(mesh.buffer, mesh.bindGroup.entries)
        .createBindGroup(mesh, mesh.bindGroup.entries)

        .createAndWriteBuffer(camera.buffer)
        .createBindGroupLayoutEntries(camera.buffer, camera.bindGroupLayout.entries)
        .createBindGroupLayout(camera, camera.bindGroupLayout.entries)
        .createBindGroupEntries(camera.buffer, camera.bindGroup.entries)
        .createBindGroup(camera, camera.bindGroup.entries)

    const shaderModule = instance.createShaderModule(shaderCode)

    const pipelineLayout = instance.createPipelineLayout(
        mesh.material.bindGroupLayout.GPUBindGroupLayout,
        camera.bindGroupLayout.GPUBindGroupLayout,
        mesh.bindGroupLayout.GPUBindGroupLayout,
    )

    const pipelineDescriptor = PipelineDescriptorBuilder
        .start()
        .layout(pipelineLayout)
        .vertex(shaderModule, geo.vertexBufferLayout)
        .fragment(shaderModule, canvasFormat)
        .primitive(mat.cullMode)
        .depthStencil(mat.depthWriteEnabled, mat.depthFormat, mat.depthCompare)
        .end()

    const renderObject = instance.createRenderPipeline(mesh, pipelineDescriptor)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const renderPassDescriptor = structuredClone(VARS.RenderPassDescriptor.Standard)

    const render = (t) => {
        instance.custom(device => {
            rot.x = Math.sin(t / 500)
            rot.z = Math.cos(t / 400)

            root.rotation.x += .003
            root.rotation.z += .002
            root.updateMatrixWorld()
            
            for (let i = 0; i < count; i++) {
                const x = Math.floor(i / 16)
                const y = Math.floor((i / 4) % 4)
                const z = i % 4

                pos.set(x, y, z)
                    .subScalar(1.5)
                    .normalize()
                    .multiplyScalar(8)

                node.position.copy(pos)
                node.rotation.copy(rot)
                node.updateMatrixWorld()
                mesh.updateMatrix(i, node.worldMatrix)
            }
            mesh.updateBuffer()
            instance.writeBuffer(mesh.buffer)

            const encoder = device.createCommandEncoder()

            renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView()
            renderPassDescriptor.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

            const pass = encoder.beginRenderPass(renderPassDescriptor)
            pass.setPipeline(renderObject.pipeline)
            pass.setVertexBuffer(0, geo.attributes[0].GPUBuffer)
            pass.setVertexBuffer(1, geo.attributes[1].GPUBuffer)
            pass.setBindGroup(0, mat.bindGroup.GPUBindGroup)
            pass.setBindGroup(1, camera.bindGroup.GPUBindGroup)
            pass.setBindGroup(2, mesh.bindGroup.GPUBindGroup)
            pass.setIndexBuffer(geo.index.GPUBuffer, geo.index.format)
            pass.drawIndexed(geo.index.length, mesh.count)
            pass.end()

            const finish = encoder.finish()
            device.queue.submit([finish])
        })
        requestAnimationFrame(render)
    }
    render()

    document.body.appendChild(canvas)
}

main()