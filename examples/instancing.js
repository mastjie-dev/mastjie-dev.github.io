import WebGPUInstance from '../cores/WebGPUInstance.js'
import { UniformBuffer } from '../cores/BufferCore.js'
import { DepthTexture } from '../cores/TextureCore.js'
import RenderPassDescriptor from '../cores/RenderPassDescriptor.js'

import Scene from '../scenes/Scene.js'
import Vector3 from '../math/Vector3.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import InstanceMesh from '../scenes/InstanceMesh.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import NodeCore from '../scenes/NodeCore.js'

const shaderCode = `
struct Camera {
    projection: mat4x4<f32>,
    view: mat4x4<f32>,
};

struct Model {
    matrix: array<mat4x4f, 64>
};

struct Scene {
    time: f32,
};

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@group(0) @binding(0) var<uniform> color: vec3f;
@group(1) @binding(0) var<uniform> scene: Scene;
@group(2) @binding(0) var<uniform> camera: Camera;
@group(3) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @builtin(instance_index) id: u32,
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
) -> VSOutput
{

    let transform = model.matrix[id] * vec4f(position, 1.);

    var output: VSOutput;
    output.position = camera.projection * camera.view * transform;
    output.uv = uv;

    return output;
}

@fragment fn main_fragment(
    input: VSOutput
) -> @location(0) vec4f
{
    return vec4f(color, 1.);
}
`

async function main() {
    const width = window.innerWidth
    const height = window.innerHeight

    const instance = new WebGPUInstance()
    await instance.init()

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    canvas.style.display = "block"
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
    const context = canvas.getContext("webgpu")
    context.configure({
        device: instance.device,
        format: canvasFormat
    })

    const camera = new PerspectiveCamera(55, width / height)
    camera.position.set(0, 0, 20)

    const geometry = GeometryLibs.createBox()

    const material = new BaseMaterial("box material")
    material.shader = shaderCode
    material.addBuffer(new UniformBuffer(new Float32Array([1, 1, .5])))

    const count = 64
    const mesh = new InstanceMesh(geometry, material, count)

    const node = new NodeCore()
    const pos = new Vector3()
    const rot = new Vector3()
    for (let i = 0; i < count; i++) {
        const x = Math.floor(i / 16)
        const y = Math.floor((i / 4) % 4)
        const z = i % 4

        pos.set(x, y, z)
            .subScalar(1.5)
            .normalize()
            .multiplyScalar(8)
        node.position.copy(pos)
        node.updateMatrixWorld()
        mesh.updateInstanceMatrix(i, node.worldMatrix)
    }

    const scene = new Scene()
    scene.addNode(mesh)

    const groups = instance.bindScene(scene, camera)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const rpDesc = new RenderPassDescriptor()
    rpDesc.setDSAView(depthTexture.GPUTexture.createView())

    const render = (t) => {

        // for (let i = 0; i < count; i++) {
        //     const x = Math.floor(i / 16)
        //     const y = Math.floor((i / 4) % 4)
        //     const z = i % 4

        //     pos.set(x, y, z)
        //         .subScalar(1.5)
        //         .normalize()
        //         .multiplyScalar(8)

        //     node.position.copy(pos)
        //     node.rotation.copy(rot)
        //     node.updateMatrixWorld()
        //     mesh.updateMatrix(i, node.worldMatrix)
        // }
        // mesh.updateBuffer()
        // instance.writeBuffer(mesh.buffer)

        const encoder = instance.createCommandEncoder()

        rpDesc.setCAView(context.getCurrentTexture().createView())

        const pass = encoder.beginRenderPass(rpDesc.get())
        pass.setBindGroup(1, scene.bindGroup.GPUBindGroup)
        pass.setBindGroup(2, camera.bindGroup.GPUBindGroup)

        for (let group of groups) {
            pass.setPipeline(group.pipeline)
            pass.setBindGroup(0, group.material)

            for (let primitive of group.primitives) {
                let i = 0
                for (let attr of primitive.attributes) {
                    pass.setVertexBuffer(i, attr)
                    ++i
                }
                pass.setIndexBuffer(primitive.indexBuffer, primitive.indexFormat)

                for (let instance of primitive.instances) {
                    pass.setBindGroup(3, instance.transform)
                    pass.drawIndexed(primitive.indexLength, instance.count)
                }
            }
        }
        pass.end()

        const finish = encoder.finish()
        instance.submitEncoder([finish])

        // requestAnimationFrame(render)
    }
    render()

    document.body.appendChild(canvas)
}

main()