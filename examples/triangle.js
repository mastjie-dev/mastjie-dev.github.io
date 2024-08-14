import WebGPUInstance from '/cores/WebGPUInstance.js'
import BufferCore from '/cores/BufferCore.js'
import BaseGeometry from '/scenes/BaseGeometry.js'
import BaseMaterial from '/scenes/BaseMaterial.js'
import Mesh from '/scenes/Mesh.js'
import VARS from '/cores/VARS.js'
import { PipelineDescriptorBuilder } from '/cores/Builder.js'

const shaderCode = `
    struct VSOutput {
        @builtin(position) position: vec4f,
    };

    @group(0) @binding(0) var<uniform> color: vec3f;

    @vertex
    fn main_vertex(
        @location(0) position: vec2f,
    ) -> VSOutput
    {
        var output: VSOutput;
        let transform = vec4f(position, 0., 1.);
        output.position = transform;

        return output;
    }

    @fragment
    fn main_fragment(
        input: VSOutput
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
    const vertices = new Float32Array([-1, -1, 1, -1, 0, 1])

    const triGeometry = new BaseGeometry("tris geometry")
    triGeometry.addAttributes(
        new BufferCore("position", "attribute", vertices, VARS.Buffer.Attribute32x2))

    const triMaterial = new BaseMaterial("red material")
    triMaterial.addBuffer(
        new BufferCore("red color", "uniform", new Float32Array([1, 0, 0]), VARS.Buffer.Uniform))

    const triMesh = new Mesh(triGeometry, triMaterial)

    instance
        .createAndWriteBuffer(triGeometry.attributes[0])
        .createVertexBufferLayout(triGeometry)

        .createAndWriteBuffer(triMaterial.buffers[0])
        .createBindGroupLayoutEntries(
            triMaterial.buffers[0], triMaterial.bindGroupLayout.entries)
        .createBindGroupLayout(triMaterial, triMaterial.bindGroupLayout.entries)
        .createBindGroupEntries(triMaterial.buffers[0], triMaterial.bindGroup.entries)
        .createBindGroup(triMaterial, triMaterial.bindGroup.entries)

    const pipelineLayout = instance
        .createPipelineLayout(triMaterial.bindGroupLayout.GPUBindGroupLayout)

    const pipelineDescriptor = PipelineDescriptorBuilder
        .start()
        .label("triangle pipeline")
        .layout(pipelineLayout)
        .vertex(shaderModule, triGeometry.vertexBufferLayout)
        .fragment(shaderModule, canvasFormat)
        .end()

    const renderObject = instance.createRenderPipeline(triMesh, pipelineDescriptor)
    
    instance.custom(device => {
        const renderPassDescriptor = structuredClone(VARS.RenderPassDescriptor.Basic)
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView()

        const encoder = device.createCommandEncoder()

        const renderPass = encoder.beginRenderPass(renderPassDescriptor)
        renderPass.setPipeline(renderObject.pipeline)
        renderPass.setVertexBuffer(0, renderObject.mesh.geometry.attributes[0].GPUBuffer)
        renderPass.setBindGroup(0, renderObject.mesh.material.bindGroup.GPUBindGroup)
        renderPass.draw(3)
        renderPass.end()

        const finish = encoder.finish()
        device.queue.submit([finish])
    })


    document.body.appendChild(canvas)
}

main()