import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import { DepthTexture, TargetTexture } from '../cores/TextureCore.js'
import VARS from '../cores/VARS.js'
import { PipelineDescriptorBuilder, RenderPassDescriptorBuilder } from '../cores/Builder.js'

import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import { PerspectiveCamera } from '../scenes/Camera.js'

const unlitShader = `
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

const lineShader = `
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
) -> VSOutput
{
    var output: VSOutput;
    output.position = debugCamera.projection * debugCamera.view * model.matrix * vec4f(position, 1.);
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

    const mainCamera = new PerspectiveCamera(50, width/height, .1, 1000)
    mainCamera.position.set(0, -20, -20)

    const boxGeo = GeometryUtils.createBox(2, 2, 2, 1, 1, 1)
    const gridGeo = GeometryUtils.createGrid(100, 2)

    const blue = new BufferCore("blue", "uniform", new Float32Array([0, 0, 1]), VARS.Buffer.Uniform)
    const white = new BufferCore("white", "uniform", new Float32Array([1, 1, 1]), VARS.Buffer.Uniform)

    const blueMat = new BaseMaterial()
    blueMat.shader = unlitShader
    blueMat.addBuffer(blue)

    const whiteLineMat = new BaseMaterial()
    whiteLineMat.shader = lineShader
    whiteLineMat.topology = "line-list"
    whiteLineMat.addBuffer(white)

    const box = new Mesh(boxGeo, blueMat)
    const grid = new Mesh(gridGeo, whiteLineMat)

    const meshes = [box, grid]

    instance.bindMeshesResources(meshes)
    instance.bindCamerasResource(mainCamera)

    const renderObjects = meshes.map(mesh => {
        const pl = instance.createPipelineLayout(
            mesh.material.bindGroupLayout.GPUBindGroupLayout,
            mainCamera.bindGroupLayout.GPUBindGroupLayout,
            mesh.bindGroupLayout.GPUBindGroupLayout,
        )

        const desc = PipelineDescriptorBuilder
            .start()
            .layout(pl)
            .vertex(mesh.material.shaderModule, mesh.geometry.vertexBufferLayout)
            .fragment(mesh.material.shaderModule, canvasFormat)
            .depthStencil(
                mesh.material.depthWriteEnabled,
                mesh.material.depthFormat,
                mesh.material.depthCompare
            )
            .primitive(mesh.material.cullMode, mesh.material.topology)
            .end()

        return instance.createRenderPipeline(mesh, desc)
    })


    const rpDesc = RenderPassDescriptorBuilder.start().end()

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const render = () => {
        const encoder = instance.createCommandEncoder()

        rpDesc.colorAttachments[0].view = context.getCurrentTexture().createView()
        rpDesc.depthStencilAttachment.view = depthTexture.GPUTexture.createView()
        const pass = encoder.beginRenderPass(rpDesc)

        for (let rObj of renderObjects) {
            pass.setPipeline(rObj.pipeline)
            
            let i = 0
            for (let attr of rObj.mesh.geometry.attributes) {
                pass.setVertexBuffer(i, attr.GPUBuffer)
                ++i
            }

            pass.setBindGroup(0, rObj.mesh.material.bindGroup.GPUBindGroup)
            pass.setBindGroup(1, mainCamera.bindGroup.GPUBindGroup)
            pass.setBindGroup(2, rObj.mesh.bindGroup.GPUBindGroup)
            pass.setIndexBuffer(rObj.mesh.geometry.index.GPUBuffer,
                rObj.mesh.geometry.index.format)
            pass.drawIndexed(rObj.mesh.geometry.index.length)
        }
        pass.end()

        instance.submitEncoder([encoder.finish()])
        // requestAnimationFrame(render)
    }
    render()

    document.body.appendChild(canvas)

    window.addEventListener("resize", () => {
        const w = window.innerWidth
        const h = window.innerHeight

        canvas.width = w
        canvas.height = h

        mainCamera.aspect = w / h
        mainCamera.updateProjectionMatrix()

        depthTexture.destroy()
        depthTexture.width = w
        depthTexture.height = h

        instance.writeBuffer(mainCamera.buffer).createTexture(depthTexture)
        render()
    })
}

main()

