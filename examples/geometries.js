import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import { DepthTexture } from '../cores/TextureCore.js'
import VARS from '../cores/VARS.js'

import Mesh from '../scenes/Mesh.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import { PipelineDescriptorBuilder, RenderPassDescriptorBuilder } from '../cores/Builder.js'

const shaderCode = `
struct Camera {
    projection: mat4x4<f32>,
    view: mat4x4<f32>
};

struct Model {
    matrix: mat4x4<f32>,
    normal: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform>camera: Camera;
@group(1) @binding(0) var<uniform>color: vec3f;
@group(2) @binding(0) var<uniform>model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f,
) -> @builtin(position) vec4f
{
    let transform = model.matrix * vec4f(position, 1.);
    return camera.projection * camera.view * transform;
}

@fragment fn main_fragment(

) -> @location(0) vec4f
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

    const shaderModule = instance.createShaderModule(shaderCode)

    const mainCamera = new PerspectiveCamera(75, width / height)
    mainCamera.position.set(0, 0, -2)

    const red = new BufferCore("red", "uniform", new Float32Array([1, 0, 0]), VARS.Buffer.Uniform)
    const green = new BufferCore("green", "uniform", new Float32Array([0, 1, 0]), VARS.Buffer.Uniform)
    const blue = new BufferCore("blue", "uniform", new Float32Array([0, 0, 1]), VARS.Buffer.Uniform)

    const boxGeometry = GeometryUtils.createBox()
    const redMaterial = new BaseMaterial("red")
    redMaterial.addBuffer(red)

    const box = new Mesh(boxGeometry, redMaterial)
    const scene = {
        meshes: [box]
    }

    instance.bindCameraResource(mainCamera)
    instance.bindSceneResource(scene)

    const renderObjects = []
    scene.meshes.forEach(mesh => {
        const pipelineLayout = instance.createPipelineLayout(
            mainCamera.bindGroupLayout.GPUBindGroupLayout,
            mesh.material.bindGroupLayout.GPUBindGroupLayout,
            mesh.bindGroupLayout.GPUBindGroupLayout,
        )

        const pipelineDescriptor = PipelineDescriptorBuilder
            .start()
            .layout(pipelineLayout)
            .vertex(shaderModule, mesh.geometry.vertexBufferLayout)
            .fragment(shaderModule, canvasFormat)
            .primitive(mesh.material.cullMode, mesh.material.topology)
            .depthStencil(
                mesh.material.depthWriteEnabled,
                mesh.material.depthFormat,
                mesh.material.depthCompare)
            .end()

        renderObjects.push(instance.createRenderPipeline(mesh, pipelineDescriptor))
    })

    const renderPassDesc = RenderPassDescriptorBuilder.start().end()

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const render = () => {
        const encoder = instance.createCommandEncoder()

        renderPassDesc.colorAttachments[0].view = context.getCurrentTexture().createView()
        renderPassDesc.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

        const pass = encoder.beginRenderPass(renderPassDesc)

        for (let ro of renderObjects) {
            pass.setPipeline(ro.pipeline)

            let i = 0
            for (let attr of ro.mesh.geometry.attributes) {
                pass.setVertexBuffer(i, attr.GPUBuffer)
                i++
            }

            pass.setBindGroup(0, mainCamera.bindGroup.GPUBindGroup)
            pass.setBindGroup(1, ro.mesh.material.bindGroup.GPUBindGroup)
            pass.setBindGroup(2, ro.mesh.bindGroup.GPUBindGroup)
            pass.setIndexBuffer(ro.mesh.geometry.index.GPUBuffer, ro.mesh.geometry.index.format)
            pass.drawIndexed(ro.mesh.geometry.index.length)
        }
        pass.end()
        instance.submitEncoder([encoder.finish()])
    }
    render()

    document.body.appendChild(canvas)
}

main()