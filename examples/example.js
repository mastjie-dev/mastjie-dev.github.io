import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import { DepthTexture, TargetTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import VARS from '../cores/VARS.js'
import { PipelineDescriptorBuilder, RenderPassDescriptorBuilder } from '../cores/Builder.js'

import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import { OrthographicCamera, PerspectiveCamera } from '../scenes/Camera.js'

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
@group(1) @binding(0) var<uniform> debugCamera: Camera;
@group(2) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) uv: vec2f,
) -> VSOutput
{
    var output: VSOutput;
    output.position = debugCamera.projection * debugCamera.view * model.matrix * vec4f(position, 1.);
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

const quadShaderCode = `
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

@group(0) @binding(0) var left: texture_2d<f32>;
@group(0) @binding(1) var right: texture_2d<f32>;
@group(0) @binding(2) var mapSampler: sampler;
@group(1) @binding(0) var<uniform> debugCamera: Camera;
@group(2) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
) -> VSOutput
{
    var output: VSOutput;
    output.position = debugCamera.projection * debugCamera.view * model.matrix * vec4f(position, 1.);
    output.uv = uv;
    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f 
{
    let mid = input.uv.x - .5;
    let leftUV = vec2f(mid*2., input.uv.y);
    let rightUV = vec2f((mid-.5) * 2., input.uv.y);

    let leftView = textureSample(left, mapSampler, leftUV).rgb;
    let rightView = textureSample(right, mapSampler, rightUV).rgb;

    let split = step(mid, 0);
    let color = split * leftView + (1.-split) * rightView; 
    
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

    const halfWidth = width / 2
    const left = new TargetTexture(halfWidth, height)
    left.usage += GPUTextureUsage.RENDER_ATTACHMENT
    const right = new TargetTexture(halfWidth, height)
    right.usage += GPUTextureUsage.RENDER_ATTACHMENT

    const fov = 50
    const aspect = halfWidth / height
    const near = .1
    const far = 100

    const boxGeo = GeometryUtils.createBox(2, 2, 2, 1, 1, 1)
    const gridGeo = GeometryUtils.createGrid(100, 2)
    const boxLineGeo = GeometryUtils.createBoxLine(2, 1, 1)
    const frustumLineGeo = GeometryUtils.createFrustumLine(fov, aspect, far, near)

    const blue = new BufferCore("blue", "uniform", new Float32Array([0, 0, 1]), VARS.Buffer.Uniform)
    const white = new BufferCore("white", "uniform", new Float32Array([1, 1, 1]), VARS.Buffer.Uniform)
    const red = new BufferCore("white", "uniform", new Float32Array([1, 0, 0]), VARS.Buffer.Uniform)

    const blueMat = new BaseMaterial()
    blueMat.addBuffer(blue)

    const whiteLineMat = new BaseMaterial()
    whiteLineMat.topology = "line-list"
    whiteLineMat.addBuffer(white)

    const redLineMat = new BaseMaterial()
    redLineMat.topology = "line-list"
    redLineMat.addBuffer(red)

    const box = new Mesh(boxGeo, blueMat)
    const grid = new Mesh(gridGeo, whiteLineMat)

    const mainCamera = new PerspectiveCamera(fov, aspect, near, far)
    mainCamera.position.set(0, -20, 20)

    const debugCamera = new PerspectiveCamera(75, halfWidth / height)
    debugCamera.position.set(10, -40, -20)
    // debugCamera.target.set(0, 0, 5)

    // Quad
    const quadGeometry = GeometryUtils.createPlane(2, 2)

    const quadMaterial = new BaseMaterial("quad material")
    quadMaterial.depthWriteEnabled = false
    quadMaterial.cullMode = "none"
    quadMaterial.addTexture(left)
    quadMaterial.addTexture(right)
    quadMaterial.addSampler(new SamplerCore())
    const quad = new Mesh(quadGeometry, quadMaterial)

    const quadCamera = new OrthographicCamera(-1, 1, 1, -1, .1, 10)
    quadCamera.position.z = 1

    const mainScene = {
        meshes: [box, grid]
    }
    const debugScene = {
        meshes: [box, grid]
    }
    const quadScene = {
        meshes: [quad]
    }

    instance.bindCameraResource(mainCamera)
    instance.bindCameraResource(debugCamera)
    instance.bindCameraResource(quadCamera)
    instance.bindSceneResource(mainScene)
    instance.bindSceneResource(debugScene)
    instance.bindSceneResource(quadScene)

    const shaderModule = instance.createShaderModule(shaderCode)
    const quadSM = instance.createShaderModule(quadShaderCode)

    const leftROs = mainScene.meshes.map(mesh => {
        const renderPL = instance.createPipelineLayout(
            mesh.material.bindGroupLayout.GPUBindGroupLayout,
            mainCamera.bindGroupLayout.GPUBindGroupLayout,
            mesh.bindGroupLayout.GPUBindGroupLayout,
        )

        const desc = PipelineDescriptorBuilder
            .start()
            .layout(renderPL)
            .vertex(shaderModule, mesh.geometry.vertexBufferLayout)
            .fragment(shaderModule, canvasFormat)
            .primitive(mesh.material.cullMode, mesh.material.topology)
            .depthStencil(
                mesh.material.depthWriteEnabled,
                mesh.material.depthFormat,
                mesh.material.depthCompare
            )
            .end()

        return instance.createRenderPipeline(mesh, desc)
    })

    const rightROs = debugScene.meshes.map(mesh => {
        const renderPL = instance.createPipelineLayout(
            mesh.material.bindGroupLayout.GPUBindGroupLayout,
            debugCamera.bindGroupLayout.GPUBindGroupLayout,
            mesh.bindGroupLayout.GPUBindGroupLayout,
        )

        const desc = PipelineDescriptorBuilder
            .start()
            .layout(renderPL)
            .vertex(shaderModule, mesh.geometry.vertexBufferLayout)
            .fragment(shaderModule, canvasFormat)
            .primitive(mesh.material.cullMode, mesh.material.topology)
            .depthStencil(
                mesh.material.depthWriteEnabled,
                mesh.material.depthFormat,
                mesh.material.depthCompare
            )
            .end()

        return instance.createRenderPipeline(mesh, desc)
    })

    let quadRO
    {
        const pl = instance.createPipelineLayout(
            quad.material.bindGroupLayout.GPUBindGroupLayout,
            quadCamera.bindGroupLayout.GPUBindGroupLayout,
            quad.bindGroupLayout.GPUBindGroupLayout,
        )

        const desc = PipelineDescriptorBuilder
            .start()
            .layout(pl)
            .vertex(quadSM, quad.geometry.vertexBufferLayout)
            .fragment(quadSM, canvasFormat)
            .end()

        quadRO = instance.createRenderPipeline(quad, desc)
    }

    const leftRPD = RenderPassDescriptorBuilder.start().end()
    const rightRPD = RenderPassDescriptorBuilder.start().end()
    const quadRPD = RenderPassDescriptorBuilder
        .start()
        .disableStencilAttachment()
        .end()

    const depthTexture = new DepthTexture(width / 2, height)
    instance.createTexture(depthTexture)

    const render = () => {
        const encoder = instance.createCommandEncoder()

        // left
        {
            leftRPD.colorAttachments[0].view = left.GPUTexture.createView()
            leftRPD.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

            const leftPass = encoder.beginRenderPass(leftRPD)

            for (let ro of leftROs) {
                leftPass.setPipeline(ro.pipeline)

                let i = 0
                for (let attr of ro.mesh.geometry.attributes) {
                    leftPass.setVertexBuffer(i, attr.GPUBuffer)
                    i++
                }

                leftPass.setBindGroup(0, ro.mesh.material.bindGroup.GPUBindGroup)
                leftPass.setBindGroup(1, mainCamera.bindGroup.GPUBindGroup)
                leftPass.setBindGroup(2, ro.mesh.bindGroup.GPUBindGroup)
                leftPass.setIndexBuffer(
                    ro.mesh.geometry.index.GPUBuffer,
                    ro.mesh.geometry.index.format)
                leftPass.drawIndexed(ro.mesh.geometry.index.length)
            }

            leftPass.end()
        }

        // right
        {
            rightRPD.colorAttachments[0].view = right.GPUTexture.createView()
            rightRPD.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

            const rightPass = encoder.beginRenderPass(rightRPD)

            for (let ro of rightROs) {
                rightPass.setPipeline(ro.pipeline)

                let i = 0
                for (let attr of ro.mesh.geometry.attributes) {
                    rightPass.setVertexBuffer(i, attr.GPUBuffer)
                    i++
                }

                rightPass.setBindGroup(0, ro.mesh.material.bindGroup.GPUBindGroup)
                rightPass.setBindGroup(1, debugCamera.bindGroup.GPUBindGroup)
                rightPass.setBindGroup(2, ro.mesh.bindGroup.GPUBindGroup)
                rightPass.setIndexBuffer(
                    ro.mesh.geometry.index.GPUBuffer,
                    ro.mesh.geometry.index.format)
                rightPass.drawIndexed(ro.mesh.geometry.index.length)
            }

            rightPass.end()
        }

        quadRPD.colorAttachments[0].view = context.getCurrentTexture().createView()
        const quadPass = encoder.beginRenderPass(quadRPD)
        quadPass.setPipeline(quadRO.pipeline)
        quadPass.setVertexBuffer(0, quad.geometry.attributes[0].GPUBuffer)
        quadPass.setVertexBuffer(1, quad.geometry.attributes[1].GPUBuffer)
        quadPass.setVertexBuffer(2, quad.geometry.attributes[2].GPUBuffer)
        quadPass.setBindGroup(0, quad.material.bindGroup.GPUBindGroup)
        quadPass.setBindGroup(1, quadCamera.bindGroup.GPUBindGroup)
        quadPass.setBindGroup(2, quad.bindGroup.GPUBindGroup)
        quadPass.setIndexBuffer(
            quad.geometry.index.GPUBuffer,
            quad.geometry.index.format
        )
        quadPass.drawIndexed(quad.geometry.index.length)
        quadPass.end()

        instance.submitEncoder([encoder.finish()])
        // requestAnimationFrame(render)
    }
    render()

    document.body.appendChild(canvas)
}

main()

