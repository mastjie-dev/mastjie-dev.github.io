import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import { DepthTexture, TargetTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import VARS from '../cores/VARS.js'

import Mesh from '../scenes/Mesh.js'
import BaseGeometry from '../scenes/BaseGeometry.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import { PipelineDescriptorBuilder } from '../cores/Builder.js'

const boxCode = `

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

const quadCode = `

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

struct Model {
    matrix: mat4x4<f32>,
    normal: mat4x4<f32>,
};

struct Unf {
    colorA: vec3f,
    colorB: vec3f,
    time: f32,
};

@group(0) @binding(0) var<uniform> unf: Unf;
@group(0) @binding(1) var leftMap: texture_2d<f32>;
@group(0) @binding(2) var rightMap: texture_2d<f32>;
@group(0) @binding(3) var mapSampler: sampler;
@group(1) @binding(0) var<uniform> model: Model;

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

fn two_colors(colA: vec3f, colB: vec3f) -> vec3f
{
    let j = step(length(colA), 0.);
    return colA * (1. - j) + j * colB;
}

@fragment fn main_fragment(
    input: VSOutput
) -> @location(0) vec4f
{
    let left = textureSample(leftMap, mapSampler, input.uv).rgb;
    let right = textureSample(rightMap, mapSampler, input.uv).rgb;
    var color: vec3f;

    var x = input.uv.x - (sin(unf.time) * .5 + .5);
    let m = step(x, 0.);
    color = two_colors(left, unf.colorA) * (1. - m)
        + m * two_colors(right, unf.colorB);
    
    color *= smoothstep(0, .0025, abs(x));

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
            .createBindGroupEntries(buffer, owner.material.bindGroup.entries)
    })

    owner.material.textures.forEach(texture => {
        instance
            .createAndWriteTexture(texture)
            .createBindGroupLayoutEntries(texture, owner.material.bindGroupLayout.entries)
            .createBindGroupEntries(texture, owner.material.bindGroup.entries)
    })

    owner.material.samplers.forEach(sampler => {
        instance
            .createSampler(sampler)
            .createBindGroupLayoutEntries(sampler, owner.material.bindGroupLayout.entries)
            .createBindGroupEntries(sampler, owner.material.bindGroup.entries)
    })

    instance
        .createBindGroupLayout(owner.material, owner.material.bindGroupLayout.entries)
        .createBindGroup(owner.material, owner.material.bindGroup.entries)       

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

    const mainCamera = new PerspectiveCamera(50, width / height)
    mainCamera.position.set(0, 0, -10)

    let boxData = GeometryUtils.createBox()

    const geometry = new BaseGeometry("box")
    geometry.addAttributes(
        new BufferCore("position", "attribute", boxData.position, VARS.Buffer.Attribute32x3))
    geometry.addAttributes(new BufferCore("uv", "attribute", boxData.uv, VARS.Buffer.Attribute32x2))
    geometry.addIndex(new BufferCore("index", "index", boxData.index, VARS.Buffer.IndexUint16))

    const redMaterial = new BaseMaterial("red")
    redMaterial.addBuffer(
        new BufferCore("red color", "uniform", new Float32Array([1, 0, 0]), VARS.Buffer.Uniform))

    const blueMaterial = new BaseMaterial("red")
    blueMaterial.addBuffer(
        new BufferCore("red color", "uniform", new Float32Array([0, 1, 0]), VARS.Buffer.Uniform))


    const box1 = new Mesh(geometry, redMaterial, "box1")
    const box2 = new Mesh(geometry, blueMaterial, "box2")

    bindResources(instance, mainCamera)
    bindResources(instance, box1)
    bindResources(instance, box2)

    const leftTexture = new TargetTexture(width, height)
    leftTexture.usage += GPUTextureUsage.RENDER_ATTACHMENT
    const rightTexture = new TargetTexture(width, height)
    rightTexture.usage += GPUTextureUsage.RENDER_ATTACHMENT
    // instance.createTexture(leftTexture).createTexture(rightTexture)

    const quadData = GeometryUtils.createPlane(2, 2)
    const quadGeometry = new BaseGeometry()
    quadGeometry.addAttributes(
        new BufferCore("position", "attribute", quadData.position, VARS.Buffer.Attribute32x3))
    quadGeometry.addAttributes(new BufferCore("uv", "attribute", quadData.uv, VARS.Buffer.Attribute32x2))
    quadGeometry.addIndex(new BufferCore("index", "index", quadData.index, VARS.Buffer.IndexUint16))

    const unf = new BufferCore("bg colors", "uniform", new Float32Array([
        250/255, 237/255, 203/255, 0,
        192/255, 222/255, 241/255, 0
    ]), VARS.Buffer.Uniform)
    const quadMaterial = new BaseMaterial("quad mat")
    quadMaterial.addBuffer(unf)
    quadMaterial.addTexture(leftTexture)
    quadMaterial.addTexture(rightTexture)
    quadMaterial.addSampler(new SamplerCore())

    const quad = new Mesh(quadGeometry, quadMaterial)
    bindResources(instance, quad)

    const boxSM = instance.createShaderModule(boxCode)
    const quadSM = instance.createShaderModule(quadCode)

    const boxes = [box1, box2]
    const renderObjects = boxes.map(box => {
        const pipelineLayout = instance.createPipelineLayout(
            mainCamera.bindGroupLayout.GPUBindGroupLayout,
            box.material.bindGroupLayout.GPUBindGroupLayout,
            box.bindGroupLayout.GPUBindGroupLayout,
        )

        const pipelineDescriptor = PipelineDescriptorBuilder
            .start()
            .layout(pipelineLayout)
            .vertex(boxSM, box1.geometry.vertexBufferLayout)
            .fragment(boxSM, canvasFormat)
            .primitive(box.material.cullMode, box.material.topology)
            .depthStencil(
                box.material.depthWriteEnabled,
                box.material.depthFormat,
                box.material.depthCompare)
            .end()

        return instance.createRenderPipeline(box, pipelineDescriptor)
    })

    let renderQuad
    {
        const pipelineLayout = instance.createPipelineLayout(
            quad.material.bindGroupLayout.GPUBindGroupLayout,
            quad.bindGroupLayout.GPUBindGroupLayout
        )

        const pipelineDescriptor = PipelineDescriptorBuilder
            .start()
            .layout(pipelineLayout)
            .vertex(quadSM, quadGeometry.vertexBufferLayout)
            .fragment(quadSM, canvasFormat)
            .end()

        renderQuad = instance.createRenderPipeline(quad, pipelineDescriptor)
    }

    const leftRPDesc = structuredClone(VARS.RenderPassDescriptor.Standard)
    const rightRPDesc = structuredClone(VARS.RenderPassDescriptor.Standard)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const quadRPDesc = structuredClone(VARS.RenderPassDescriptor.Basic)

    const render = () => {
        instance.custom(device => {
            box1.rotation.z += .013
            box1.rotation.x += .01
            box1.updateMatrixWorld()
            box1.updateBuffer()

            box2.worldMatrix.copy(box1.worldMatrix)
            box2.updateBuffer()

            unf.data[7] += 0.016
            
            instance
                .writeBuffer(box1.buffer)
                .writeBuffer(box2.buffer)
                .writeBuffer(unf)

            const encoder = device.createCommandEncoder()

            leftRPDesc.colorAttachments[0].view = leftTexture.GPUTexture.createView()
            leftRPDesc.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

            const leftPass = encoder.beginRenderPass(leftRPDesc)

            leftPass.setPipeline(renderObjects[0].pipeline)
            leftPass.setVertexBuffer(0, renderObjects[0].mesh.geometry.attributes[0].GPUBuffer)
            leftPass.setVertexBuffer(1, renderObjects[0].mesh.geometry.attributes[1].GPUBuffer)
            leftPass.setBindGroup(0, mainCamera.bindGroup.GPUBindGroup)
            leftPass.setBindGroup(1, renderObjects[0].mesh.material.bindGroup.GPUBindGroup)
            leftPass.setBindGroup(2, renderObjects[0].mesh.bindGroup.GPUBindGroup)
            leftPass.setIndexBuffer(renderObjects[0].mesh.geometry.index.GPUBuffer,
                renderObjects[0].mesh.geometry.index.format)
            leftPass.drawIndexed(renderObjects[0].mesh.geometry.index.length)
            leftPass.end()

            rightRPDesc.colorAttachments[0].view = rightTexture.GPUTexture.createView()
            rightRPDesc.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

            const rightPass = encoder.beginRenderPass(rightRPDesc)

            rightPass.setPipeline(renderObjects[1].pipeline)
            rightPass.setVertexBuffer(0, renderObjects[1].mesh.geometry.attributes[0].GPUBuffer)
            rightPass.setVertexBuffer(1, renderObjects[1].mesh.geometry.attributes[1].GPUBuffer)
            rightPass.setBindGroup(0, mainCamera.bindGroup.GPUBindGroup)
            rightPass.setBindGroup(1, renderObjects[1].mesh.material.bindGroup.GPUBindGroup)
            rightPass.setBindGroup(2, renderObjects[1].mesh.bindGroup.GPUBindGroup)
            rightPass.setIndexBuffer(renderObjects[1].mesh.geometry.index.GPUBuffer,
                renderObjects[1].mesh.geometry.index.format)
            rightPass.drawIndexed(renderObjects[1].mesh.geometry.index.length)
            rightPass.end()

            quadRPDesc.colorAttachments[0].view = context.getCurrentTexture().createView()
            const finalPass = encoder.beginRenderPass(quadRPDesc)

            finalPass.setPipeline(renderQuad.pipeline)
            finalPass.setVertexBuffer(0, renderQuad.mesh.geometry.attributes[0].GPUBuffer)
            finalPass.setVertexBuffer(1, renderQuad.mesh.geometry.attributes[1].GPUBuffer)
            finalPass.setBindGroup(0, renderQuad.mesh.material.bindGroup.GPUBindGroup)
            finalPass.setBindGroup(1, renderQuad.mesh.bindGroup.GPUBindGroup)
            finalPass.setIndexBuffer(renderQuad.mesh.geometry.index.GPUBuffer, renderQuad.mesh.geometry.index.format)
            finalPass.drawIndexed(renderQuad.mesh.geometry.index.length)

            finalPass.end()
            const finish = encoder.finish()
            device.queue.submit([finish])
        })
        requestAnimationFrame(render)
    }

    render()

    document.body.appendChild(canvas)
}

main()