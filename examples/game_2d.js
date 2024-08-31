import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import VARS from '../cores/VARS.js'
import { PipelineDescriptorBuilder, RenderPassDescriptorBuilder } from '../cores/Builder.js'

import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import { OrthographicCamera } from '../scenes/Camera.js'

const lineSC = `
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
@group(1) @binding(0) var<uniform> model: Model;
@group(2) @binding(0) var<uniform> camera: Camera;

@vertex fn main_vertex(
    @location(0) position: vec2f,
) -> VSOutput
{
    var output: VSOutput;
    output.position = camera.projection * camera.view *model.matrix * vec4f(position, 0., 1.);
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
    // let color = textureSample(left, mapSampler, input.uv).rgb;;
    
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

    const box2dLine = GeometryUtils.createBox2DLine(2, 2)
    const circleLine = GeometryUtils.createCircleLine(1)

    const blue = new BufferCore("blue", "uniform", new Float32Array([0, 0, 1]), VARS.Buffer.Uniform)
    const white = new BufferCore("white", "uniform", new Float32Array([1, 1, 1]), VARS.Buffer.Uniform)
    const red = new BufferCore("white", "uniform", new Float32Array([1, 0, 0]), VARS.Buffer.Uniform)

    const whiteLineMat = new BaseMaterial()
    whiteLineMat.shader = lineSC
    whiteLineMat.cullMode = "none"
    whiteLineMat.topology = "line-list"
    whiteLineMat.addBuffer(white)

    const redLineMat = new BaseMaterial()
    redLineMat.shader = lineSC
    redLineMat.cullMode = "none"
    redLineMat.topology = "line-list"
    redLineMat.addBuffer(red)

    const box = new Mesh(box2dLine, whiteLineMat)
    const circle = new Mesh(circleLine, whiteLineMat)
    const meshes = [box, circle]

    box.position.y = -5
    circle.position.x = 8

    const d = 10
    const a = width / height
    const camera = new OrthographicCamera(-d*a, d*a, d, -d, .1, 100)
    camera.position.z = -1

    instance.bindMeshesResources(meshes)
    instance.bindCamerasResource(camera)

    const renderObjects = meshes.map(mesh => {
        const pl = instance.createPipelineLayout(
            mesh.material.bindGroupLayout.GPUBindGroupLayout,
            mesh.bindGroupLayout.GPUBindGroupLayout,
            camera.bindGroupLayout.GPUBindGroupLayout,
        )

        const desc = PipelineDescriptorBuilder
            .start()
            .layout(pl)
            .vertex(mesh.material.shaderModule, mesh.geometry.vertexBufferLayout)
            .fragment(mesh.material.shaderModule, canvasFormat)
            .primitive("none", mesh.material.topology)
            .end()
        
        return instance.createRenderPipeline(mesh, desc)
    })

    const rpDesc = RenderPassDescriptorBuilder
        .start()
        .disableStencilAttachment()
        .end()

    rpDesc.colorAttachments[0].clearColor[1] = 1
        
    const render = () => {
        const encoder = instance.createCommandEncoder()

        rpDesc.colorAttachments[0].view = context.getCurrentTexture().createView()

        const pass = encoder.beginRenderPass(rpDesc)
        for (let ro of renderObjects) {
            pass.setPipeline(ro.pipeline)
            pass.setVertexBuffer(0, ro.mesh.geometry.attributes[0].GPUBuffer)
            pass.setBindGroup(0, ro.mesh.material.bindGroup.GPUBindGroup)
            pass.setBindGroup(1, ro.mesh.bindGroup.GPUBindGroup)
            pass.setBindGroup(2, camera.bindGroup.GPUBindGroup)
            pass.setIndexBuffer(
                ro.mesh.geometry.index.GPUBuffer,
                ro.mesh.geometry.index.format
            )
            pass.drawIndexed(ro.mesh.geometry.index.length)
        }
        pass.end()

        instance.submitEncoder([encoder.finish()])
        // requestAnimationFrame(render)
    }
    render()

    document.body.appendChild(canvas)
}

main()

