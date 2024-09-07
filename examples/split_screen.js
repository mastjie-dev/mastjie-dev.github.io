import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import { DepthTexture, RenderTargetTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import { RenderPassDescriptorBuilder } from '../cores/Builder.js'
import VARS from '../cores/VARS.js'

import Mesh from '../scenes/Mesh.js'
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
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
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
    mainCamera.position.set(0, 0, -3)

    const geometry = GeometryUtils.createBox()

    const redMaterial = new BaseMaterial("red")
    redMaterial.shader = boxCode
    redMaterial.addBuffer(
        new BufferCore("red color", "uniform", new Float32Array([1, 0, 0]), VARS.Buffer.Uniform))

    const blueMaterial = new BaseMaterial("red")
    blueMaterial.shader = boxCode
    blueMaterial.addBuffer(
        new BufferCore("red color", "uniform", new Float32Array([0, 1, 0]), VARS.Buffer.Uniform))


    const box1 = new Mesh(geometry, redMaterial, "box1")
    const box2 = new Mesh(geometry, blueMaterial, "box2")

    const leftTexture = new RenderTargetTexture(width, height)
    const rightTexture = new RenderTargetTexture(width, height)

    const quadGeometry = GeometryUtils.createPlane(2, 2)

    const unf = new BufferCore("bg colors", "uniform", new Float32Array([
        250 / 255, 237 / 255, 203 / 255, 0,
        192 / 255, 222 / 255, 241 / 255, 0
    ]), VARS.Buffer.Uniform)

    const quadMaterial = new BaseMaterial("quad mat")
    quadMaterial.shader = quadCode
    quadMaterial.addBuffer(unf)
    quadMaterial.addTexture(leftTexture)
    quadMaterial.addTexture(rightTexture)
    quadMaterial.addSampler(new SamplerCore())

    const quad = new Mesh(quadGeometry, quadMaterial)

    instance.bindCamerasResource(mainCamera)
    instance.bindMeshesResources([box1, box2, quad])

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
            .vertex(box.material.shaderModule, box1.geometry.vertexBufferLayout)
            .fragment(box.material.shaderModule, canvasFormat)
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
            .vertex(quad.material.shaderModule, quadGeometry.vertexBufferLayout)
            .fragment(quad.material.shaderModule, canvasFormat)
            .end()

        renderQuad = instance.createRenderPipeline(quad, pipelineDescriptor)
    }

    const leftRPDesc = RenderPassDescriptorBuilder.start().end()
    const rightRPDesc = structuredClone(leftRPDesc)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const quadRPDesc = RenderPassDescriptorBuilder
        .start()
        .disableStencilAttachment()
        .end()

    const render = () => {
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

        const encoder = instance.createCommandEncoder()

        /**
         * LEFT PASS
         */
        leftRPDesc.colorAttachments[0].view = leftTexture.GPUTexture.createView()
        leftRPDesc.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

        const leftPass = encoder.beginRenderPass(leftRPDesc)
        leftPass.setPipeline(renderObjects[0].pipeline)

        let i = 0
        for (let attr of renderObjects[0].mesh.geometry.attributes) {
            leftPass.setVertexBuffer(i, attr.GPUBuffer)
            ++i
        }
        leftPass.setBindGroup(0, mainCamera.bindGroup.GPUBindGroup)
        leftPass.setBindGroup(1, renderObjects[0].mesh.material.bindGroup.GPUBindGroup)
        leftPass.setBindGroup(2, renderObjects[0].mesh.bindGroup.GPUBindGroup)
        leftPass.setIndexBuffer(renderObjects[0].mesh.geometry.index.GPUBuffer,
            renderObjects[0].mesh.geometry.index.format)
        leftPass.drawIndexed(renderObjects[0].mesh.geometry.index.length)
        leftPass.end()

        /**
         * RIGHT PASS
         */
        rightRPDesc.colorAttachments[0].view = rightTexture.GPUTexture.createView()
        rightRPDesc.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

        const rightPass = encoder.beginRenderPass(rightRPDesc)
        rightPass.setPipeline(renderObjects[1].pipeline)

        i = 0
        for (let attr of renderObjects[1].mesh.geometry.attributes) {
            rightPass.setVertexBuffer(i, attr.GPUBuffer)
            ++i
        }
        rightPass.setBindGroup(0, mainCamera.bindGroup.GPUBindGroup)
        rightPass.setBindGroup(1, renderObjects[1].mesh.material.bindGroup.GPUBindGroup)
        rightPass.setBindGroup(2, renderObjects[1].mesh.bindGroup.GPUBindGroup)
        rightPass.setIndexBuffer(renderObjects[1].mesh.geometry.index.GPUBuffer,
            renderObjects[1].mesh.geometry.index.format)
        rightPass.drawIndexed(renderObjects[1].mesh.geometry.index.length)
        rightPass.end()

        /**
         * FINAL PASS
         */
        quadRPDesc.colorAttachments[0].view = context.getCurrentTexture().createView()
        const finalPass = encoder.beginRenderPass(quadRPDesc)

        finalPass.setPipeline(renderQuad.pipeline)
        i = 0
        for (let attr of renderQuad.mesh.geometry.attributes) {
            finalPass.setVertexBuffer(i, attr.GPUBuffer)
            ++i
        }
        finalPass.setBindGroup(0, renderQuad.mesh.material.bindGroup.GPUBindGroup)
        finalPass.setBindGroup(1, renderQuad.mesh.bindGroup.GPUBindGroup)
        finalPass.setIndexBuffer(renderQuad.mesh.geometry.index.GPUBuffer, renderQuad.mesh.geometry.index.format)
        finalPass.drawIndexed(renderQuad.mesh.geometry.index.length)
        finalPass.end()

        const finish = encoder.finish()
        instance.submitEncoder([finish])
        requestAnimationFrame(render)
    }

    render()

    document.body.appendChild(canvas)
}

main()