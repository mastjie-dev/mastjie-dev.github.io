import WebGPUInstance from "../cores/WebGPUInstance.js"
import BufferCore from '../cores/BufferCore.js'
import { DepthTexture } from '../cores/TextureCore.js'
import PipelineDescriptorBuilder from "../cores/Builder.js"
import VARS from "../cores/VARS.js"

import BaseGeometry from '../scenes/BaseGeometry.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import { DirectionalShadow } from "../scenes/Shadow.js"
import GeometryUtils from '../scenes/GeometryUtils.js'
import Vector3 from "../math/Vector3.js"
import SamplerCore from "../cores/SamplerCore.js"

const lightingShaderCode = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) shadowPosition: vec3f,
    @location(1) normal: vec3f,
};

struct Camera {
    projection: mat4x4<f32>,
    view: mat4x4<f32>,
};

struct Model {
    matrix: mat4x4<f32>,
    normal: mat4x4<f32>,
};

struct Light {
    projection: mat4x4<f32>,
    view: mat4x4<f32>,
    position: vec3f,
};

struct Material {
    color: vec3f,
};

// @group(0) @binding(0) var<uniform> material: Material;
@group(0) @binding(0) var<uniform> color: vec3f;
@group(0) @binding(1) var shadowMap: texture_depth_2d;
@group(0) @binding(2) var shadowSampler: sampler_comparison;

@group(1) @binding(0) var<uniform> camera: Camera;
@group(2) @binding(0) var<uniform> model: Model;
@group(3) @binding(0) var<uniform> light: Light;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
) -> VSOutput
{
    let transform = model.matrix * vec4f(position, 1.);
    let posFromLight = light.projection * light.view * transform;
    let shadowPosition = vec3f(posFromLight.xy * vec2f(.5, -.5) + vec2f(.5), posFromLight.z);

    var output: VSOutput;
    output.position = camera.projection * camera.view * transform;
    output.shadowPosition = shadowPosition;
    output.normal = normal;
    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
) -> @location(0) vec4f
{
    var visibility = 0.0;
    let oneOverShadowDepthTextureSize = 1.0 / 900.;
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
        let offset = vec2f(vec2(x, y)) * oneOverShadowDepthTextureSize;

        visibility += textureSampleCompare(
            shadowMap, shadowSampler,
            input.shadowPosition.xy + offset, input.shadowPosition.z - 0.007
            );
        }
    }
    visibility /= 9.0;
    return vec4f(color*visibility, 1.);
}
`

const shadowShaderCode = `
struct Light {
    projection: mat4x4<f32>,
    view: mat4x4<f32>,
    position: vec3f,
};

struct Model {
    matrix: mat4x4<f32>,
    normalMatrix: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform>light: Light;
@group(1) @binding(0) var<uniform>model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f,
) -> @builtin(position) vec4f
{
    return light.projection * light.view * model.matrix * vec4f(position, 1.);
}
`

async function main() {
    const width = 900
    const height = 900

    const instance = new WebGPUInstance()
    await instance.init()

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
    const canvas = document.createElement("canvas")
    canvas.style.display = "block"
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("webgpu")
    context.configure({
        device: instance.device,
        format: canvasFormat,
    })

    const lightingShaderModule = instance.createShaderModule(lightingShaderCode)
    const shadowShaderModule = instance.createShaderModule(shadowShaderCode)

    const boxData = GeometryUtils.createBox()
    const planeData = new GeometryUtils.createPlane()

    const boxGeometry = new BaseGeometry()
    boxGeometry.addAttributes(
        new BufferCore("position", "attributes", boxData.position, VARS.Buffer.Attribute32x3))
    boxGeometry.addAttributes(
        new BufferCore("normal", "attributes", boxData.normal, VARS.Buffer.Attribute32x3))
    boxGeometry.addIndex(new BufferCore("index", "index", boxData.index, VARS.Buffer.IndexUint16))

    const planeGeometry = new BaseGeometry()
    planeGeometry.addAttributes(
        new BufferCore("position", "attribute", planeData.position, VARS.Buffer.Attribute32x3))
    planeGeometry.addAttributes(
        new BufferCore("normal", "attributes", planeData.normal, VARS.Buffer.Attribute32x3))
    planeGeometry.addIndex(
        new BufferCore("index", "index", planeData.index, VARS.Buffer.IndexUint16))

    const shadowDepthTexture = new DepthTexture("shadowDepthTexture", width, height)
    shadowDepthTexture.format = "depth32float"
    instance.createTexture(shadowDepthTexture)

    const compareSampler = new SamplerCore()
    compareSampler.type = "comparison"
    compareSampler.options.compare = "less"

    const materialA = new BaseMaterial("material a")
    materialA.addBuffer(
        new BufferCore("red", "uniform", new Float32Array([1, 0, 0]), VARS.Buffer.Uniform))
    materialA.addTexture(shadowDepthTexture)
    materialA.addSampler(compareSampler)

    const materialB = new BaseMaterial("material b")
    materialB.addBuffer(
        new BufferCore("green", "uniform", new Float32Array([0, 1, 0]), VARS.Buffer.Uniform))
    materialB.addTexture(shadowDepthTexture)
    materialB.addSampler(compareSampler)

    const boxMesh = new Mesh(boxGeometry, materialA, lightingShaderModule)
    boxMesh.position.set(0, -2, 0)
    boxMesh.update()

    const planeMesh = new Mesh(planeGeometry, materialB, lightingShaderModule)
    planeMesh.rotation.x = -Math.PI * .5
    planeMesh.scale.set(10, 10, 10)
    planeMesh.update()

    const mainCamera = new PerspectiveCamera(75, width / height)
    mainCamera.position.set(5, -20, -20)
    mainCamera.update()

    instance
        .createAndWriteBuffer(mainCamera.buffer)
        .createBindGroupLayoutEntries(mainCamera.buffer, mainCamera.bindGroupLayout.entries)
        .createBindGroupLayout(mainCamera, mainCamera.bindGroupLayout.entries)
        .createBindGroupEntries(mainCamera.buffer, mainCamera.bindGroup.entries)
        .createBindGroup(mainCamera, mainCamera.bindGroup.entries)

    const directionalShadow = new DirectionalShadow(-10, 10, 10, -10, .1, 100, new Vector3(-10, -10, 0))
    instance
        .createAndWriteBuffer(directionalShadow.buffer)
        .createBindGroupLayoutEntries(directionalShadow.buffer, directionalShadow.bindGroupLayout.entries)
        .createBindGroupLayout(directionalShadow, directionalShadow.bindGroupLayout.entries)
        .createBindGroupEntries(directionalShadow.buffer, directionalShadow.bindGroup.entries)
        .createBindGroup(directionalShadow, directionalShadow.bindGroup.entries)

    const meshes = [boxMesh, planeMesh]
    const renderObjects = []
    const shadowObjects = []
    meshes.forEach(mesh => {
        instance
            .createAndWriteBuffer(mesh.buffer)
            .createBindGroupLayoutEntries(mesh.buffer, mesh.bindGroupLayout.entries)
            .createBindGroupLayout(mesh, mesh.bindGroupLayout.entries)
            .createBindGroupEntries(mesh.buffer, mesh.bindGroup.entries)
            .createBindGroup(mesh, mesh.bindGroup.entries)

        mesh.geometry.attributes.forEach(attribute => {
            instance.createAndWriteBuffer(attribute)
        })
        instance
            .createAndWriteBuffer(mesh.geometry.index)
            .createVertexBufferLayout(mesh.geometry)

        mesh.material.buffers.forEach(buffer => {
            instance
                .createAndWriteBuffer(buffer)
                .createBindGroupLayoutEntries(buffer, mesh.material.bindGroupLayout.entries)
                .createBindGroupEntries(buffer, mesh.material.bindGroup.entries)
        })
        mesh.material.textures.forEach(texture => {
            instance
                .createBindGroupLayoutEntries(texture, mesh.material.bindGroupLayout.entries)
                .createBindGroupEntries(texture, mesh.material.bindGroup.entries)
        })
        mesh.material.samplers.forEach(sampler => {
            instance
                .createSampler(sampler)
                .createBindGroupLayoutEntries(sampler, mesh.material.bindGroupLayout.entries)
                .createBindGroupEntries(sampler, mesh.material.bindGroup.entries)
        })

        instance
            .createBindGroupLayout(mesh.material, mesh.material.bindGroupLayout.entries)
            .createBindGroup(mesh.material, mesh.material.bindGroup.entries)

        const lightingPipelineLayout = instance.createPipelineLayout(
            mesh.material.bindGroupLayout.GPUBindGroupLayout,
            mainCamera.bindGroupLayout.GPUBindGroupLayout,
            mesh.bindGroupLayout.GPUBindGroupLayout,
            directionalShadow.bindGroupLayout.GPUBindGroupLayout,
        )

        const lightingPipelineDescriptor = PipelineDescriptorBuilder
            .start()
            .label(mesh.name)
            .layout(lightingPipelineLayout)
            .vertex(lightingShaderModule, mesh.geometry.vertexBufferLayout)
            .fragment(lightingShaderModule, canvasFormat)
            .primitive(mesh.material.cullMode)
            .depthStencil(
                mesh.material.depthWriteEnabled,
                mesh.material.depthFormat,
                mesh.material.depthCompare,
            )
            .end()

        renderObjects.push(instance.createRenderPipeline(mesh, lightingPipelineDescriptor))

        const shadowPipelineLayout = instance.createPipelineLayout(
            directionalShadow.bindGroupLayout.GPUBindGroupLayout,
            mesh.bindGroupLayout.GPUBindGroupLayout
        )

        const shadowPipelineDescriptor = PipelineDescriptorBuilder
            .start()
            .label("shadowPipeline")
            .layout(shadowPipelineLayout)
            .vertex(shadowShaderModule, mesh.geometry.vertexBufferLayout)
            .depthStencil(true, "depth32float", "less")
            .end()

        shadowObjects.push(instance.createRenderPipeline(mesh, shadowPipelineDescriptor))
    })

    const depthTexture = new DepthTexture("depthTexture", width, height)
    instance.createTexture(depthTexture)

    const shadowPassDesc = structuredClone(VARS.RenderPassDescriptor.Shadow)
    const renderPassDesc = structuredClone(VARS.RenderPassDescriptor.Standard)

    instance.custom(device => {
        shadowPassDesc.depthStencilAttachment.view = shadowDepthTexture.GPUTexture.createView()

        renderPassDesc.colorAttachments[0].view = context.getCurrentTexture().createView()
        renderPassDesc.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

        const encoder = device.createCommandEncoder()

        const shadowPass = encoder.beginRenderPass(shadowPassDesc)
        for (let so of shadowObjects) {
            shadowPass.setPipeline(so.pipeline)
            shadowPass.setVertexBuffer(0, so.mesh.geometry.attributes[0].GPUBuffer)
            shadowPass.setVertexBuffer(1, so.mesh.geometry.attributes[1].GPUBuffer)
            shadowPass.setBindGroup(0, directionalShadow.bindGroup.GPUBindGroup)
            shadowPass.setBindGroup(1, so.mesh.bindGroup.GPUBindGroup)
            shadowPass.setIndexBuffer(so.mesh.geometry.index.GPUBuffer,
                so.mesh.geometry.index.format)
            shadowPass.drawIndexed(so.mesh.geometry.index.length)
        }
        shadowPass.end()

        const pass = encoder.beginRenderPass(renderPassDesc)
        for (let renderObject of renderObjects) {
            pass.setPipeline(renderObject.pipeline)
            pass.setVertexBuffer(0, renderObject.mesh.geometry.attributes[0].GPUBuffer)
            pass.setVertexBuffer(1, renderObject.mesh.geometry.attributes[1].GPUBuffer)
            pass.setBindGroup(0, renderObject.mesh.material.bindGroup.GPUBindGroup)
            pass.setBindGroup(1, mainCamera.bindGroup.GPUBindGroup)
            pass.setBindGroup(2, renderObject.mesh.bindGroup.GPUBindGroup)
            pass.setBindGroup(3, directionalShadow.bindGroup.GPUBindGroup)
            pass.setIndexBuffer(renderObject.mesh.geometry.index.GPUBuffer,
                renderObject.mesh.geometry.index.format)
            pass.drawIndexed(renderObject.mesh.geometry.index.length)
        }

        pass.end()
        const finish = encoder.finish()
        device.queue.submit([finish])
    })

    document.body.appendChild(canvas)
}

main()

const r = [1, 2, 3, 4, 5, 6]