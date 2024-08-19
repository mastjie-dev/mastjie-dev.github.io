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
import gridHelper from '../scenes/Helper.js'

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

    const data = GeometryUtils.createBox(2, 2, 2, 1, 1, 1)

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
    camera.position.set(0, -10, -25)
    camera.updateProjectionMatrix()
    camera.updateViewMatrix()

    const grid = gridHelper(100, 2)
    grid.updateMatrixWorld()
    grid.updateBuffer()

    bindVertex(instance, mesh.geometry)
    bindResource(instance, mesh.material, mesh.material.buffers[0])
    bindResource(instance, mesh, mesh.buffer)

    bindVertex(instance, grid.geometry)
    bindResource(instance, grid.material, grid.material.buffers[0])
    bindResource(instance, grid, grid.buffer)

    bindResource(instance, camera, camera.buffer)

    const shaderModule = instance.createShaderModule(shaderCode)

    const meshes = [grid, mesh]
    const renderObjects = meshes.map(mh => {
        const renderPL = instance.createPipelineLayout(
            mh.material.bindGroupLayout.GPUBindGroupLayout,
            camera.bindGroupLayout.GPUBindGroupLayout,
            mh.bindGroupLayout.GPUBindGroupLayout,
        )

        const desc = PipelineDescriptorBuilder
            .start()
            .layout(renderPL)
            .vertex(shaderModule, mh.geometry.vertexBufferLayout)
            .fragment(shaderModule, canvasFormat)
            .primitive(mh.material.cullMode, mh.material.topology)
            .depthStencil(
                mh.material.depthWriteEnabled,
                mh.material.depthFormat,
                mh.material.depthCompare
            )
            .end()
        

        return instance.createRenderPipeline(mh, desc)
    })

    const renderPassDescriptor = RenderPassDescriptorBuilder.start().end()

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const render = () => {
        instance.custom(device => {
            const encoder = device.createCommandEncoder()

            renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView()
            renderPassDescriptor.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

            const renderPass = encoder.beginRenderPass(renderPassDescriptor)

            for (let ro of renderObjects) {
                renderPass.setPipeline(ro.pipeline)

                let i = 0
                for (let attr of ro.mesh.geometry.attributes) {
                    renderPass.setVertexBuffer(i, attr.GPUBuffer)
                    i++
                }

                renderPass.setBindGroup(0, ro.mesh.material.bindGroup.GPUBindGroup)
                renderPass.setBindGroup(1, camera.bindGroup.GPUBindGroup)
                renderPass.setBindGroup(2, ro.mesh.bindGroup.GPUBindGroup)
                renderPass.setIndexBuffer(
                    ro.mesh.geometry.index.GPUBuffer,
                    ro.mesh.geometry.index.format)
                renderPass.drawIndexed(ro.mesh.geometry.index.length)
            }

            renderPass.end()

            device.queue.submit([encoder.finish()])

            // requestAnimationFrame(render)
        })
    }
    render()

    document.body.appendChild(canvas)
}

main()

