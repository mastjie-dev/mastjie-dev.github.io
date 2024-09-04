import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import VARS from '../cores/VARS.js'
import { PipelineDescriptorBuilder, RenderPassDescriptorBuilder } from '../cores/Builder.js'

import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import { OrthographicCamera } from '../scenes/Camera.js'
import NodeCore from '../scenes/NodeCore.js'
import Vector3 from '../math/Vector3.js'
import BoundingCircle from '../math/BoundingCircle.js'
import BoundingBox2D from '../math/BoundingBox2D.js'

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
    output.position = camera.projection * camera.view * model.matrix * vec4f(position, 0., 1.);
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

const instancingSC = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

struct Camera {
    projection: mat4x4<f32>,
    view: mat4x4<f32>,
};

struct Model {
    matrix: array<mat4x4f, 10>,
};

@group(0) @binding(0) var<uniform> color: vec3f;
@group(1) @binding(0) var<uniform> model: Model;
@group(2) @binding(0) var<uniform> camera: Camera;

@vertex fn main_vertex(
    @builtin(instance_index) id: u32,
    @location(0) position: vec2f,
) -> VSOutput
{
    var output: VSOutput;
    let transform = model.matrix[id] * vec4f(position, 0., 1.);
    output.position = camera.projection * camera.view * transform;
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

    const box2dLine = GeometryUtils.createBox2DLine(2, 2)
    const circleLine = GeometryUtils.createCircleLine(1)

    const blue = new BufferCore("blue", "uniform", new Float32Array([0, 0, 1]), VARS.Buffer.Uniform)
    const white = new BufferCore("white", "uniform", new Float32Array([1, 1, 1]), VARS.Buffer.Uniform)
    const red = new BufferCore("white", "uniform", new Float32Array([1, 0, 0]), VARS.Buffer.Uniform)

    const whiteLineMat = new BaseMaterial()
    whiteLineMat.shader = instancingSC
    whiteLineMat.cullMode = "none"
    whiteLineMat.topology = "line-list"
    whiteLineMat.addBuffer(white)

    const redLineMat = new BaseMaterial()
    redLineMat.shader = lineSC
    redLineMat.cullMode = "none"
    redLineMat.topology = "line-list"
    redLineMat.addBuffer(red)

    const orthoUnit = 30
    const aspect = width / height
    const camera = new OrthographicCamera(-orthoUnit*aspect, orthoUnit*aspect, orthoUnit, -orthoUnit, .1, 100)
    camera.position.set(0, 0, -1)

    const player = new Mesh(circleLine, redLineMat)
    player.position.x = -5
    player.scale.set(2, 2, 0)

    const playerBounding = new BoundingCircle(2)
    playerBounding.position.copy(player.position)

    const pipes = new Mesh(box2dLine, redLineMat)
    pipes.scale.set(2, 20, 0)
    pipes.position.set(20, 20, 0)

    const pipesBounding = new BoundingBox2D()
    pipesBounding.min.set(-1, -20)
    pipesBounding.max.set(1, 20)
    pipesBounding.position.copy(pipes.position)

    const meshes = [player, pipes]

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
        
    const gravity = 20
    let acceleration = 0

    const updatePlayer = (dt) => {
        if (acceleration < 0) {
            acceleration += .5
        }
        player.position.y += (gravity + acceleration) * dt
        player.updateMatrixWorld()
        player.updateBuffer()
        instance.writeBuffer(player.buffer)
    }

    const scrollSpeed = 10
    const updatePipes = (dt) => {
        pipes.position.x -= scrollSpeed * dt
        pipes.updateMatrixWorld()
        pipes.updateBuffer()
        instance.writeBuffer(pipes.buffer)

        if (pipes.position.x < -50) {
            pipes.position.x = 50
        }

        pipesBounding.position.copy(pipes.position)
    }

    const checkCollision = (playerBounding, pipesBounding) => {
        const hit = playerBounding.intersectBox(pipesBounding)

        if (hit) {
            console.log(hit)
        }
    }

    const render = (delta) => {
        const dt = 1 / 60
        // updatePlayer(dt)
        updatePipes(dt)
        checkCollision(playerBounding, pipesBounding)

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
            pass.drawIndexed(ro.mesh.geometry.index.length, ro.mesh.count)
        }
        pass.end()

        instance.submitEncoder([encoder.finish()])
        // requestAnimationFrame(render)
    }
    requestAnimationFrame(render)

    document.body.appendChild(canvas)

    document.body.addEventListener("keydown", e => {
        if (e.code === "Space") {
            acceleration = -40
        }
    })
}

main()

