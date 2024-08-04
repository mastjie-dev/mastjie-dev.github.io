import WebGPUInstance from '../cores/WebGPUInstance'
import BufferCore from '../cores/BufferCore'
import BaseGeometry from '../scenes/BaseGeometry'
import BaseMaterial from '../scenes/BaseMaterial'
import Mesh from '../scenes/Mesh'
import { PerspectiveCamera } from '../scenes/Camera'
import VARS from '../cores/VARS'

import data from '../data'

const shaderCode = `
    struct Camera {
        projection: mat4x4<f32>,
        view: mat4x4<f32>,
    };

    struct Model {
        matrix: mat4x4<f32>,
    };

    @group(0) @binding(0) var<uniform> color: vec3f;
    @group(1) @binding(0) var<uniform> model: Model;
    @group(2) @binding(0) var<uniform> camera: Camera;

    @vertex
    fn main_vertex(
        @location(0) position: vec3f,
    ) -> @builtin(position) vec4f
    {
        let transform = camera.projection * camera.view * model.matrix * vec4f(position, 1.);
        return transform;
    }

    @fragment
    fn main_fragment(
        // @builtin(position) vec4f 
    ) -> @location(0) vec4f
    {
        return vec4f(color, 1.);
    }
`

async function main() {
    const instance = new WebGPUInstance()
    await instance.init()

    const canvas = document.createElement("canvas")
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.style.display = "block"
    const context = canvas.getContext("webgpu")
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
    context.configure({
        device: instance.device,
        format: canvasFormat
    })

    const shaderModule = instance.createShaderModule(shaderCode)

    const boxGeometry = new BaseGeometry("box geometry")
    boxGeometry.addAttributes(
        new BufferCore("position", "attribute", data.box.position, VARS.Buffer.Attribute32x3))
    boxGeometry.addIndex(
        new BufferCore("index", "index", data.box.index, VARS.Buffer.IndexUint16))

    const boxMaterial = new BaseMaterial("red material")
    boxMaterial.addBuffer(
        new BufferCore("red color", "uniform", new Float32Array([1, 0, 0]), VARS.Buffer.Uniform))

    const boxMesh = new Mesh(boxGeometry, boxMaterial, shaderModule)
    boxMesh.update()
    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight)
    camera.position.z = -10
    camera.update()

    instance
        .createAndWriteBuffer(boxGeometry.attributes[0])
        .createAndWriteBuffer(boxGeometry.index)
        .createVertexBufferLayout(boxGeometry)

        .createAndWriteBuffer(boxMaterial.buffers[0])
        .createBindGroupLayoutEntries(
            boxMaterial.buffers[0], boxMaterial.bindGroupLayout.entries)
        .createBindGroupLayout(boxMaterial, boxMaterial.bindGroupLayout.entries)
        .createBindGroupEntries(boxMaterial.buffers[0], boxMaterial.bindGroup.entries)
        .createBindGroup(boxMaterial, boxMaterial.bindGroup.entries)

        .createAndWriteBuffer(boxMesh.buffer)
        .createBindGroupLayoutEntries(boxMesh.buffer, boxMesh.bindGroupLayout.entries)
        .createBindGroupLayout(boxMesh, boxMesh.bindGroupLayout.entries)
        .createBindGroupEntries(boxMesh.buffer, boxMesh.bindGroup.entries)
        .createBindGroup(boxMesh, boxMesh.bindGroup.entries)

        .createAndWriteBuffer(camera.buffer)
        .createBindGroupLayoutEntries(camera.buffer, camera.bindGroupLayout.entries)
        .createBindGroupLayout(camera, camera.bindGroupLayout.entries)
        .createBindGroupEntries(camera.buffer, camera.bindGroup.entries)
        .createBindGroup(camera, camera.bindGroup.entries)

    const pipelineLayout = instance.createPipelineLayout(
        boxMaterial.bindGroupLayout.GPUBindGroupLayout,
        boxMesh.bindGroupLayout.GPUBindGroupLayout,
        camera.bindGroupLayout.GPUBindGroupLayout,
    )
    const renderObject = instance.createRenderPipeline(boxMesh, pipelineLayout, descriptor => {
        descriptor.depthStencil = undefined
    })


    const render = () => {
        instance.custom(device => {
            boxMesh.rotation.x += .025
            boxMesh.rotation.z += .018
            boxMesh.update()

            instance.writeBuffer(boxMesh.buffer)

            const renderPassDescriptor = structuredClone(VARS.RenderPassDescriptor.Standard)
            renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView()
            renderPassDescriptor.depthStencilAttachment = undefined

            const encoder = device.createCommandEncoder()

            const renderPass = encoder.beginRenderPass(renderPassDescriptor)
            renderPass.setPipeline(renderObject.pipeline)
            renderPass.setVertexBuffer(0, renderObject.mesh.geometry.attributes[0].GPUBuffer)
            renderPass.setBindGroup(0, renderObject.mesh.material.bindGroup.GPUBindGroup)
            renderPass.setBindGroup(1, renderObject.mesh.bindGroup.GPUBindGroup)
            renderPass.setBindGroup(2, camera.bindGroup.GPUBindGroup)
            renderPass.setIndexBuffer(renderObject.mesh.geometry.index.GPUBuffer,
                renderObject.mesh.geometry.index.format
            )
            renderPass.drawIndexed(renderObject.mesh.geometry.index.length)
            renderPass.end()

            const finish = encoder.finish()
            device.queue.submit([finish])
        })
        requestAnimationFrame(render)
    }
    render()

    document.body.appendChild(canvas)
}

main()