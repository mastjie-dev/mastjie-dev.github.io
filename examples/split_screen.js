import WebGPUInstance from '../cores/WebGPUInstance.js'
import { UniformBuffer } from '../cores/BufferCore.js'
import { DepthTexture, RenderTargetTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import RenderPassDescriptor from '../cores/RenderPassDescriptor.js'

import Scene from '../scenes/Scene.js'
import Mesh from '../scenes/Mesh.js'
import { DirectionalLight } from '../scenes/Light.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import MaterialLibs from '../scenes/MaterialLibs.js'
import PostProcessing from '../scenes/PostProcessing.js'

import GLTFLoader from '../loader/gltf.js'
import { CameraControl } from '../scenes/Controls.js'

import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.20/+esm'
import Vector3 from '../math/Vector3.js'

import horizontalBlurShader from '../shaders/horizontalBlurShader.js'
import verticalBlurShader from '../shaders/verticalBlurShader.js'
import tonemapShader from '../shaders/tonemapShader.js'

const shader = `

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) vsLightPos: vec3f,
};

struct DirectionalLight {
    direction: vec3f,
    color: vec3f,
    strength: f32,
    projectionView: mat4x4<f32>,
};

struct Camera {
    projection: mat4x4<f32>,
    view: mat4x4<f32>
};

struct Model {
    matrix: mat4x4<f32>,
    normal: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> color: vec3f;
@group(1) @binding(0) var<uniform> light: DirectionalLight;
@group(2) @binding(0) var<uniform> camera: Camera;
@group(3) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f
) -> VSOutput
{
    let transform = model.matrix * vec4f(position, 1.);
    let vsTransform = camera.view * transform;

    var output: VSOutput;
    output.position = camera.projection * vsTransform;
    output.worldPos = vsTransform.xyz;
    output.normal = (model.normal * vec4f(normal, 0.)).xyz;
    output.uv = uv;

    output.vsLightPos = (camera.view * vec4f(light.direction, 1.)).xyz;

    return output;
}

@fragment fn main_fragment(
    input: VSOutput
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

@group(0) @binding(0) var<uniform> color: vec3f;
@group(0) @binding(1) var map: texture_2d<f32>;
@group(0) @binding(2) var mapSampler: sampler;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) uv: vec2f,
) -> VSOutput
{
    var output: VSOutput;
    output.position = vec4f(position, 1.);
    output.uv = vec2f(uv.x, uv.y * -1. + 1.);
    return output;
}

@fragment fn main_fragment(
    input: VSOutput
) -> @location(0) vec4f
{
    var color_ = textureSample(map, mapSampler, input.uv).rgb;
    color_ *= vec3f(1., .5, 1.);

    return vec4f(color_, 1.);
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
    mainCamera.position.set(5, 10, 10)

    const dirLight = new DirectionalLight()
    dirLight.position.set(-10, 10, 10)
    dirLight.strength = 2

    const sphereGeo = GeometryLibs.createSphereCube(1, 32)
    const planeGeo = GeometryLibs.createPlane(1, 1, 2, 2, { dir: "down" })

    const material = new BaseMaterial("red")
    material.shader = shader
    material.addBuffer(new UniformBuffer(new Float32Array([1, 1, 1])))
    const plane = new Mesh(planeGeo, material)

    plane.scale.setUniform(20)

    const redMat = MaterialLibs.unlit({ color: new Vector3(1, 0, 0) })
    const lightVisual = new Mesh(sphereGeo, redMat)
    lightVisual.scale.setUniform(.25)
    lightVisual.position.copy(dirLight.position)

    const gltfLoader = new GLTFLoader()
    const gltf = await gltfLoader.load("../public/gltf/", "fantasy_house.glb")
    const house = gltf[0]

    house.children.forEach(child => {
        child.material.shader = shader
    })

    const scene = new Scene()
    scene.addNode(house)
    scene.addNode(plane)
    scene.addNode(lightVisual)
    scene.addNode(dirLight)

    const groups = instance.bindScene(scene, mainCamera)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const rpDesc = new RenderPassDescriptor()
    rpDesc.setDSAView(depthTexture.GPUTexture.createView())

    const frameUpdate = () => {
        mainCamera.updateViewMatrix()
        instance.writeBuffer(mainCamera.buffer)

        for (let child of house.children) {
            child.updateViewSpaceNormalMatrix(mainCamera)
            child.updateBuffer()
            instance.writeBuffer(child.buffer)
        }

        plane.updateViewSpaceNormalMatrix(mainCamera)
        plane.updateBuffer()
        instance.writeBuffer(plane.buffer)
    }

    const renderTarget = new RenderTargetTexture(width, height)

    const testMat = MaterialLibs.unlit({ color: new Vector3(1/height, 0, 0) })
    testMat.addTexture(renderTarget)
    testMat.addSampler(new SamplerCore())
    testMat.shader = verticalBlurShader
    const testPP = new PostProcessing(testMat)

    instance.bindPostProcessing(testPP)

    const render = () => {
        frameUpdate()

        const encoder = instance.createCommandEncoder()

        rpDesc.setCAView(renderTarget.GPUTexture.createView())
        const mainPass = encoder.beginRenderPass(rpDesc.get())

        mainPass.setBindGroup(1, scene.bindGroup.GPUBindGroup)
        mainPass.setBindGroup(2, mainCamera.bindGroup.GPUBindGroup)

        for (let group of groups) {
            mainPass.setBindGroup(0, group.material)
            mainPass.setPipeline(group.pipeline)

            for (let primitive of group.primitives) {
                let i = 0
                for (let attribute of primitive.attributes) {
                    mainPass.setVertexBuffer(i, attribute)
                    ++i
                }

                mainPass.setIndexBuffer(primitive.indexBuffer, primitive.indexFormat)

                for (let instance of primitive.instances) {
                    mainPass.setBindGroup(3, instance.transform)
                    mainPass.drawIndexed(primitive.indexLength)
                }
            }
        }
        mainPass.end()

        testPP.render(encoder, context.getCurrentTexture().createView())

        const finish = encoder.finish()
        instance.submitEncoder([finish])
        // requestAnimationFrame(render)
    }
    requestAnimationFrame(render)

    const gui = new GUI()
    const params = {
        posx: dirLight.position.x,
        posy: dirLight.position.y,
        posz: dirLight.position.z,
    }
    gui.add(params, "posx").min(-10).max(10)
    gui.add(params, "posy").min(0).max(20)
    gui.add(params, "posz").min(-10).max(10)

    gui.onChange(e => {
        const { object } = e
        dirLight.position.set(object.posx, object.posy, object.posz)
        dirLight.updateBuffer()

        lightVisual.position.copy(dirLight.position)
        lightVisual.updateMatrixWorld()
        lightVisual.updateBuffer()

        render()
    })

    document.body.appendChild(canvas)
}

main()