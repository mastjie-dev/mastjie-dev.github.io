import WebGPUInstance from '/cores/WebGPUInstance.js'
import BufferCore from '/cores/BufferCore.js'
import BaseGeometry from '/scenes/BaseGeometry.js'
import BaseMaterial from '/scenes/BaseMaterial.js'
import Mesh from '/scenes/Mesh.js'
import { PerspectiveCamera } from '/scenes/Camera.js'
import VARS from '/cores/VARS.js'

import GeometryUtils from '../scenes/GeometryUtils.js'

const shaderCode = `
    struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) normal: vec3f,
        @location(1) uv: vec2f,
    };

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
        @location(1) normal: vec3f,
        @location(2) uv: vec2f,
    ) -> VSOutput
    {
        var output: VSOutput;
        let transform = camera.projection * camera.view * model.matrix * vec4f(position, 1.);
        
        output.position = transform;
        output.normal = normal;
        output.uv = uv;

        return output;
    }

    @fragment
    fn main_fragment(
        input: VSOutput
    ) -> @location(0) vec4f
    {
        return vec4f(input.normal, 1.);
        // return vec4f(color, 1.);
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

    const _d = GeometryUtils.createBox(2, 2, 2, 2, 2, 2)

    const boxGeometry = new BaseGeometry("box geometry")
    boxGeometry.addAttributes(
        new BufferCore("position", "attribute", _d.position, VARS.Buffer.Attribute32x3))
    boxGeometry.addAttributes(
            new BufferCore("normal", "attribute", _d.normal, VARS.Buffer.Attribute32x3))
    boxGeometry.addAttributes(new BufferCore("uv", "attribute", _d.uv, VARS.Buffer.Attribute32x2))
    boxGeometry.addIndex(
        new BufferCore("index", "index", _d.index, VARS.Buffer.IndexUint16))

    const boxMaterial = new BaseMaterial("red material")
    boxMaterial.addBuffer(
        new BufferCore("red color", "uniform", new Float32Array([1, 0, 0]), VARS.Buffer.Uniform))

    const boxMesh = new Mesh(boxGeometry, boxMaterial, shaderModule)
    boxMesh.update()
    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight)
    camera.position.set(0, -10, -20)
    camera.update()

    instance
        .createAndWriteBuffer(boxGeometry.attributes[0])
        .createAndWriteBuffer(boxGeometry.attributes[1])
        .createAndWriteBuffer(boxGeometry.attributes[2])
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
            boxMesh.rotation.y += .025
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
            renderPass.setVertexBuffer(1, renderObject.mesh.geometry.attributes[1].GPUBuffer)
            renderPass.setVertexBuffer(2, renderObject.mesh.geometry.attributes[2].GPUBuffer)
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