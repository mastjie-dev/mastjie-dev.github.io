import WebGPUInstance from '../cores/WebGPUInstance.js'
import { ReadOnlyStorageBuffer, StorageBuffer, UniformBuffer } from '../cores/BufferCore.js'
import { DepthTexture } from '../cores/TextureCore.js'
import RenderPassDescriptor from '../cores/RenderPassDescriptor.js'

import Scene from '../scenes/Scene.js'
import Compute from '../scenes/Compute.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import Stats from '../misc/Stats.js'

const shaderCode = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

struct Scene {
    time: f32,
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
@group(0) @binding(1) var<storage, read> pos: array<vec3f>;
@group(1) @binding(1) var<uniform> scene: Scene;
@group(2) @binding(0) var<uniform> camera: Camera;
@group(3) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
) -> VSOutput
{
    var output: VSOutput;
    let transform = position + pos[0];
    output.position = camera.projection * camera.view * model.matrix * vec4f(transform, 1.);
    output.uv = uv;
    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f 
{
    let c = vec3f(input.uv, 0.);
    return vec4f(c, 1.);
}
`

const computeShader = `
@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<storage, read_write> pos: array<vec3f>;

@compute @workgroup_size(1) 
fn main_compute(
    @builtin(global_invocation_id) id: vec3<u32>,
)
{
    let i = id.x;
    let x = sin(time);
    let y = cos(time);
    pos[i] = vec3f(x, y, 0);
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

    const storageData = new Float32Array(4)
    const storageBuffer = new StorageBuffer(storageData)
    const uniformBuffer = new UniformBuffer(new Float32Array(1))
    uniformBuffer.visibility = GPUShaderStage.COMPUTE

    const compute = new Compute()
    compute.shader = computeShader
    compute.addBuffer(uniformBuffer)
    compute.addBuffer(storageBuffer)
    instance.bindCompute(compute)

    const camera = new PerspectiveCamera(75, width / height)
    camera.position.set(0, -2, -5)

    const geometry = GeometryLibs.createBox(2, 2, 2, 1, 1, 1)
    const readBuffer = new ReadOnlyStorageBuffer(storageData)

    const material = new BaseMaterial()
    material.shader = shaderCode
    material.addBuffer(new UniformBuffer(new Float32Array([1, 1, 1])))
    material.addBuffer(readBuffer)

    const mesh = new Mesh(geometry, material)

    const scene = new Scene()
    scene.addNode(mesh)

    const groups = instance.bindScene(scene, camera)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const rpDesc = new RenderPassDescriptor()
    rpDesc.setDSAView(depthTexture.GPUTexture.createView())

    const stats = new Stats()

    const render = (time) => {
        const start = performance.now()
        uniformBuffer.data[0] += .016
        instance.writeBuffer(uniformBuffer)

        const encoder = instance.createCommandEncoder()

        // compute pass
        const computePass = encoder.beginComputePass()
        computePass.setPipeline(compute.pipeline)
        computePass.setBindGroup(0, compute.bindGroup.GPUBindGroup)
        computePass.dispatchWorkgroups(...compute.workgroups)
        computePass.end()

        instance.copyBufferToBuffer(encoder, storageBuffer, readBuffer)

        // render pass
        rpDesc.setCAView(context.getCurrentTexture().createView())
        const renderPass = encoder.beginRenderPass(rpDesc.get())

        renderPass.setBindGroup(1, scene.bindGroup.GPUBindGroup)
        renderPass.setBindGroup(2, camera.bindGroup.GPUBindGroup)

        for (let group of groups) {
            renderPass.setPipeline(group.pipeline)
            renderPass.setBindGroup(0, group.material)

            for (let primitive of group.primitives) {
                renderPass.setIndexBuffer(primitive.indexBuffer, primitive.indexFormat)

                let i = 0
                for (let attr of primitive.attributes) {
                    renderPass.setVertexBuffer(i, attr)
                    ++i
                }

                for (let instance of primitive.instances) {
                    renderPass.setBindGroup(3, instance.transform)
                    renderPass.drawIndexed(primitive.indexLength, instance.count)
                }
            }

        }

        renderPass.end()

        instance.submitEncoder([encoder.finish()])

        const end = performance.now()
        stats.update(time, end - start)
        // requestAnimationFrame(render)
    }
    requestAnimationFrame(render)

    document.body.appendChild(canvas)
}

main()

