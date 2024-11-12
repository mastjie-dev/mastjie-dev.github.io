import WebGPUInstance from '../cores/WebGPUInstance.js'
import {UniformBuffer} from '../cores/BufferCore.js'
import { DepthTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import RenderPassDescriptor from '../cores/RenderPassDescriptor.js'

import Scene from '../scenes/Scene.js'
import Mesh from '../scenes/Mesh.js'
import { DirectionalLight } from '../scenes/Light.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import MaterialLibs from '../scenes/MaterialLibs.js'

import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.20/+esm'
import Vector3 from '../math/Vector3.js'

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
    // output.position = camera.projection * camera.view * transform;
    output.position = camera.projection * vsTransform;
    output.worldPos = transform.xyz;
    output.normal = (model.normal * vec4f(normal, 0.)).xyz;
    output.uv = uv;

    output.vsLightPos = (camera.view * vec4f(light.direction, 0.)).xyz;

    return output;
}

@fragment fn main_fragment(
    input: VSOutput
) -> @location(0) vec4f
{
    // let dir = normalize(light.direction - input.worldPos);
    let dir = normalize(input.vsLightPos - input.worldPos);
    let lum = dot(dir, normalize(input.normal));

    let _col = vec3f(lum);

    return vec4f(_col, 1.);
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
    mainCamera.position.set(0, 10, 20)

    const dirLight = new DirectionalLight()
    dirLight.position.set(0, 10, 0)

    const boxGeo = GeometryLibs.createBox(2, 2, 2)
    const sphereGeo = GeometryLibs.createSphereCube(2, 32)
    const planeGeo = GeometryLibs.createPlane(20, 20, 4, 4, { dir: "down"})

    const material = new BaseMaterial("red")
    material.shader = shader
    material.addBuffer(new UniformBuffer(new Float32Array([1, 0, 0])))

    const sphere = new Mesh(sphereGeo, material, "box1")
    sphere.position.x = 4
    const box = new Mesh(boxGeo, material)
    box.position.x = -4
    const plane = new Mesh(planeGeo, material)
    plane.position.y = -2

    const redMat = MaterialLibs.unlit({ color: new Vector3(1, 0, 0) })
    const lightVisual = new Mesh(sphereGeo, redMat)
    lightVisual.scale.setUniform(.25)
    lightVisual.position.copy(dirLight.position)

    const scene = new Scene()
    scene.addNode(sphere)
    scene.addNode(box)
    scene.addNode(plane)
    scene.addNode(lightVisual)
    scene.addNode(dirLight)

    const groups = instance.bindScene(scene, mainCamera)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)
    
    const rpDesc = new RenderPassDescriptor()
    rpDesc.setDSAView(depthTexture.GPUTexture.createView())

    const arr = [sphere, box, plane]

    const render = () => {
        arr.forEach(a => {
            a.updateViewSpaceNormalMatrix(mainCamera)
            a.updateBuffer()
            instance.writeBuffer(a.buffer)
        })
        
        instance
            .writeBuffer(dirLight.buffer)
            .writeBuffer(lightVisual.buffer)

        const encoder = instance.createCommandEncoder()

        rpDesc.setCAView(context.getCurrentTexture().createView())
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

        const finish = encoder.finish()
        instance.submitEncoder([finish])
        // requestAnimationFrame(render)
    }

    render()

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