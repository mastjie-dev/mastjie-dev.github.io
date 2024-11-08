import WebGPUInstance from '../cores/WebGPUInstance.js'
import { DepthTexture, RenderTargetTexture } from '../cores/TextureCore.js'
import RenderPassDescriptor from '../cores/RenderPassDescriptor.js'
import SamplerCore from '../cores/SamplerCore.js'

import Scene from '../scenes/Scene.js'
import { OrthographicCamera, PerspectiveCamera } from '../scenes/Camera.js'
import Helper from '../scenes/Helper.js'
import { CameraControl } from '../scenes/Controls.js'

import GLTFLoader from '../loader/gltf.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import MaterialLibs from '../scenes/MaterialLibs.js'
import Mesh from '../scenes/Mesh.js'

const mainShader = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(1) normal: vec3f,
    @location(0) uv: vec2f,
    @location(2) worldPosition: vec4f,
};

struct FSOutput {
    @location(0) normal: vec4f,
    @location(1) albedo: vec4f,
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
@group(1) @binding(0) var<uniform> scene: Scene;
@group(2) @binding(0) var<uniform> camera: Camera;
@group(3) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
) -> VSOutput
{
    let transform = model.matrix * vec4f(position, 1.);

    var output: VSOutput;
    output.position = camera.projection * camera.view * transform;
    output.normal = (model.normal * vec4f(normal, 0.)).xyz;
    output.uv = uv;
    output.worldPosition = transform;

    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> FSOutput
{
    var output: FSOutput;
    output.normal = vec4f(normalize(input.normal), 1.);
    output.albedo = input.worldPosition;

    return output;
}
`

const postShader = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(1) normal: vec3f,
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
@group(0) @binding(1) var gNormal: texture_2d<f32>;
@group(0) @binding(2) var gAlbedo: texture_2d<f32>;
@group(0) @binding(3) var mapSampler: sampler;

@group(1) @binding(0) var<uniform> scene: Scene;
@group(2) @binding(0) var<uniform> camera: Camera;
@group(3) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
) -> VSOutput
{
    let transform = model.matrix * vec4f(position, 1.);

    var output: VSOutput;
    output.position = camera.projection * camera.view * transform;
    output.normal = (model.normal * vec4f(normal, 0.)).xyz;
    output.uv = uv;

    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f
{

    let t = sin(scene.time) + cos(scene.time);

    let uv = vec2f(input.uv.x, (input.uv.y * -1.) + 1.);
    let nr = textureSample(gNormal, mapSampler, uv).rgb;
    let wp = textureSample(gAlbedo, mapSampler, uv).rgb;

    let p = normalize(vec3f(-3, t, 1));
    let l = dot(p, nr);
    let color = vec3f(l*2.);

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

    const gNormal = new RenderTargetTexture(width, height, 8)
    gNormal.name = "gNormal"
    gNormal.format = "rgba16float"
    const gAlbedo = new RenderTargetTexture(width, height)
    const depthTexture = new DepthTexture(width, height)

    instance
        // .createTexture(gAlbedo)
        // .createTexture(gNormal)
        .createTexture(depthTexture)

    const mainCamera = new PerspectiveCamera(75, width / height)
    mainCamera.position.set(15, 40, 40)

    const gltfLoader = new GLTFLoader()
    const gltfScenes = await gltfLoader.load("../public/gltf", "deaverhouse.glb")

    const material = MaterialLibs.unlit()
    material.shader = mainShader

    const scene = new Scene()
    gltfScenes.forEach(model => {
        model.scale.setUniform(2)
        model.children.forEach(child => {
            child.material = material
        })
        model.position.y = 5
        scene.addNode(model)
    })

    const targets = [
        { format: gNormal.format, blend: false },
        { format: gAlbedo.format, blend: false },
    ]
    const mainGroups = instance.bindScene(scene, mainCamera, targets)

    // POST SCENE

    const v = 1
    const h = v
    const postCamera = new OrthographicCamera(-h, h, -v, v)
    postCamera.position.z = 1

    const postGeometry = GeometryLibs.createPlane(2, 2)
    const postMaterial = MaterialLibs.unlit()
    postMaterial.shader = postShader
    postMaterial.cullMode = "none"
    postMaterial.depthWriteEnabled = false
    postMaterial.addTexture(gNormal)
    postMaterial.addTexture(gAlbedo)
    postMaterial.addSampler(new SamplerCore())

    const postQuad = new Mesh(postGeometry, postMaterial)

    const postScene = new Scene()
    postScene.addNode(postQuad)

    const postGroups = instance.bindScene(postScene, postCamera)

    const rpDesc = new RenderPassDescriptor()
    rpDesc.addColorAttachment()
    rpDesc.setDSAView(depthTexture.GPUTexture.createView())

    const postRPD = new RenderPassDescriptor()
    // postRPD.disableColorAttachment()
    postRPD.disableDepthStencilAttachment()

    const render = (dt) => {
        postScene.buffer.data[0] = dt*.001
        instance.writeBuffer(postScene.buffer)

        const encoder = instance.createCommandEncoder()

        {
            rpDesc.setCAView(gNormal.GPUTexture.createView(), 0)
            rpDesc.setCAView(gAlbedo.GPUTexture.createView(), 1)
            const pass = encoder.beginRenderPass(rpDesc.get())

            pass.setBindGroup(1, scene.bindGroup.GPUBindGroup)
            pass.setBindGroup(2, mainCamera.bindGroup.GPUBindGroup)

            for (let mGroup of mainGroups) {
                pass.setPipeline(mGroup.pipeline)
                pass.setBindGroup(0, mGroup.material)

                for (let primitive of mGroup.primitives) {
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

            // post render
        }

        {
            postRPD.setCAView(context.getCurrentTexture().createView())
            const postGroup = postGroups[0]

            const postPass = encoder.beginRenderPass(postRPD.get())
            postPass.setPipeline(postGroup.pipeline)
            postPass.setBindGroup(0, postGroup.material)
            postPass.setBindGroup(1, postScene.bindGroup.GPUBindGroup)
            postPass.setBindGroup(2, postCamera.bindGroup.GPUBindGroup)

            const primitive = postGroup.primitives[0]
            postPass.setBindGroup(3, primitive.instances[0].transform)
            postPass.setVertexBuffer(0, primitive.attributes[0])
            postPass.setVertexBuffer(1, primitive.attributes[1])
            postPass.setVertexBuffer(2, primitive.attributes[2])
            postPass.setIndexBuffer(primitive.indexBuffer, primitive.indexFormat)
            postPass.drawIndexed(primitive.indexLength)
            postPass.end()
        }

        const finish = encoder.finish()
        instance.submitEncoder([finish])
        // requestAnimationFrame(render)
    }
    requestAnimationFrame(render)

    document.body.appendChild(canvas)
}

main()