import WebGPUInstance from '../cores/WebGPUInstance.js'
import { UniformBuffer } from '../cores/BufferCore.js'
import { CubeTexture, DepthTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import RenderPassDescriptor from '../cores/RenderPassDescriptor.js'

import Scene from '../scenes/Scene.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import MaterialLibs from '../scenes/MaterialLibs.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import { loadImageBitmap } from '../misc/utils.js'

const cubeMapShader = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
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

@group(0) @binding(0) var cubeMap: texture_cube<f32>;
@group(0) @binding(1) var mapSampler: sampler;
@group(1) @binding(0) var<uniform> scene: Scene;
@group(2) @binding(0) var<uniform> camera: Camera;
@group(3) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f
) -> VSOutput
{
    var output: VSOutput;
    output.position = camera.projection * camera.view * model.matrix * vec4f(position, 1.);
    output.normal = (model.matrix * vec4(position, 0.)).xyz;
    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f 
{
    let color = textureSample(cubeMap, mapSampler, input.normal).rgb;
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

    const images = [
        '../public/cubemap/px.png',
        '../public/cubemap/nx.png',
        '../public/cubemap/ny.png',
        '../public/cubemap/py.png',
        '../public/cubemap/pz.png',
        '../public/cubemap/nz.png',
    ]
    const bitmaps = await Promise.all(images.map(loadImageBitmap))

    const camera = new PerspectiveCamera(50, width / height, .1, 1000)
    camera.position.set(5, 10, 10)

    const boxGeometry = GeometryLibs.createBox(2, 2, 2, 1, 1, 1)
    const gridGeometry = GeometryLibs.createGrid(100, 3)


    const cubeTexture = new CubeTexture(bitmaps[0].width, bitmaps[0].height, bitmaps)

    const cubeMapMaterial = new BaseMaterial()
    cubeMapMaterial.shader = cubeMapShader
    cubeMapMaterial.addTexture(cubeTexture)
    cubeMapMaterial.addSampler(new SamplerCore())

    const lineMaterial = MaterialLibs.line()

    const box = new Mesh(boxGeometry, cubeMapMaterial)
    box.scale.setUniform(2)
    const grid = new Mesh(gridGeometry, lineMaterial)

    const scene = new Scene()
    scene.addNode(box)
    scene.addNode(grid)

    const groups = instance.bindScene(scene, camera)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const rpDesc = new RenderPassDescriptor()
    rpDesc.setDSAView(depthTexture.GPUTexture.createView())

    const render = () => {
        box.rotation.x += .016
        box.rotation.y += .008
        box.updateMatrixWorld()
        box.updateBuffer()
        instance.writeBuffer(box.buffer)

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
                    pass.drawIndexed(primitive.indexLength)
                }
            }
        }
        pass.end()

        instance.submitEncoder([encoder.finish()])
        requestAnimationFrame(render)
    }
    render()

    document.body.appendChild(canvas)

    window.addEventListener("resize", () => {
        const w = window.innerWidth
        const h = window.innerHeight

        canvas.width = w
        canvas.height = h

        camera.aspect = w / h
        camera.updateProjectionMatrix()

        depthTexture.destroy()
        depthTexture.width = w
        depthTexture.height = h

        instance.writeBuffer(camera.buffer).createTexture(depthTexture)
        render()
    })
}

main()

