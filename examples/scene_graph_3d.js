import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import { DepthTexture } from '../cores/TextureCore.js'
import VARS from '../cores/VARS.js'

import Mesh from '../scenes/Mesh.js'
import BaseGeometry from '../scenes/BaseGeometry.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import { PipelineDescriptorBuilder } from '../cores/Builder.js'
import NodeCore from '../scenes/NodeCore.js'

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

function bindTransformResource(instance, owner) {
    instance
        .createAndWriteBuffer(owner.buffer)
        .createBindGroupLayoutEntries(owner.buffer, owner.bindGroupLayout.entries)
        .createBindGroupLayout(owner, owner.bindGroupLayout.entries)
        .createBindGroupEntries(owner.buffer, owner.bindGroup.entries)
        .createBindGroup(owner, owner.bindGroup.entries)
}

function bindVisualResource(instance, owner) {
    owner.geometry.attributes.forEach(attribute => {
        if (!attribute.GPUBuffer) {
            instance.createAndWriteBuffer(attribute)
        }
    })
    if (!owner.geometry.index.GPUBuffer) {
        instance.createAndWriteBuffer(owner.geometry.index)
    }
    if (!owner.geometry.vertexBufferLayout) {
        instance.createVertexBufferLayout(owner.geometry)
    }

    owner.material.buffers.forEach(buffer => {
        instance
            .createAndWriteBuffer(buffer)
            .createBindGroupLayoutEntries(buffer, owner.material.bindGroupLayout.entries)
            .createBindGroupLayout(owner.material, owner.material.bindGroupLayout.entries)
            .createBindGroupEntries(buffer, owner.material.bindGroup.entries)
            .createBindGroup(owner.material, owner.material.bindGroup.entries)
    })
}

function bindResources(instance, owner) {
    if (owner.isCamera) {
        owner.updateProjectionMatrix()
        owner.updateViewMatrix()
        bindTransformResource(instance, owner)
    }

    else if (owner.isMesh) {
        owner.updateMatrixWorld()
        owner.updateBuffer()
        bindTransformResource(instance, owner)
        bindVisualResource(instance, owner)
    }

    else {
        owner.updateMatrixWorld()
    }

    if (owner.children.length !== 0) {
        owner.children.forEach(child => {
            bindResources(instance, child)
        })
    }
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

    const mainCamera = new PerspectiveCamera(75, width / height)
    mainCamera.position.set(0, 0, -30)

    const boxData = GeometryUtils.createBox()
    const boxGeo = new BaseGeometry("box")
    boxGeo.addAttributes(
        new BufferCore("position", "attribute", boxData.position, VARS.Buffer.Attribute32x3))
    boxGeo.addAttributes(new BufferCore("uv", "attribute", boxData.uv, VARS.Buffer.Attribute32x2))
    boxGeo.addIndex(new BufferCore("index", "index", boxData.index, VARS.Buffer.IndexUint16))

    const redMat = new BaseMaterial("red")
    redMat.addBuffer(
        new BufferCore("red color", "uniform", new Float32Array([1, 0, 0]), VARS.Buffer.Uniform))

    const greenMat = new BaseMaterial("green")
    greenMat.addBuffer(
        new BufferCore("red color", "uniform", new Float32Array([0, 1, 0]), VARS.Buffer.Uniform))

    const blueMat = new BaseMaterial("blue")
    blueMat.addBuffer(
        new BufferCore("red color", "uniform", new Float32Array([0, 0, 1]), VARS.Buffer.Uniform))

    const box1 = new Mesh(boxGeo, redMat, "box1")
    box1.position.x = -1.5
    box1.scale.set(.5, .5, .5)

    const box2 = new Mesh(boxGeo, greenMat, "box2")
    box2.addChild(box1)
    box2.position.x = 5

    const box3 = new Mesh(boxGeo, blueMat, "box3")
    box3.scale.set(2, 2, 2)

    const rootNode = new NodeCore("root")
    rootNode.addChild(box3)
    rootNode.addChild(box2)

    bindResources(instance, mainCamera)
    bindResources(instance, rootNode)

    const meshes = [box3, box2, box1]
    const renderObjects = []

    const shaderModule = instance.createShaderModule(shaderCode)

    meshes.forEach(mesh => {
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
            .primitive(mesh.material.cullMode)
            .depthStencil(
                mesh.material.depthWriteEnabled,
                mesh.material.depthFormat,
                mesh.material.depthCompare)
            .end()

        renderObjects.push(instance.createRenderPipeline(mesh, pipelineDescriptor))
    })

    const renderPassDesc = structuredClone(VARS.RenderPassDescriptor.Standard)
    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const render = () => {
        instance.custom(device => {
            rootNode.rotation.z += .008
            rootNode.updateMatrixWorld()
            box2.rotation.z -= .016

            for (let box of meshes) {
                box.updateMatrixWorld()
                box.updateBuffer()
                instance.writeBuffer(box.buffer)
            }

            const encoder = device.createCommandEncoder()

            renderPassDesc.colorAttachments[0].view = context.getCurrentTexture().createView()
            renderPassDesc.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

            const pass = encoder.beginRenderPass(renderPassDesc)

            for (let ro of renderObjects) {
                pass.setPipeline(ro.pipeline)
                pass.setVertexBuffer(0, ro.mesh.geometry.attributes[0].GPUBuffer)
                pass.setVertexBuffer(1, ro.mesh.geometry.attributes[1].GPUBuffer)
                pass.setBindGroup(0, mainCamera.bindGroup.GPUBindGroup)
                pass.setBindGroup(1, ro.mesh.material.bindGroup.GPUBindGroup)
                pass.setBindGroup(2, ro.mesh.bindGroup.GPUBindGroup)
                pass.setIndexBuffer(ro.mesh.geometry.index.GPUBuffer, ro.mesh.geometry.index.format)
                pass.drawIndexed(ro.mesh.geometry.index.length)
            }

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