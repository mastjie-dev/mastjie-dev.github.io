import WebGPUInstance from '../cores/WebGPUInstance.js'
import { DepthTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import RenderPassDescriptor from '../cores/RenderPassDescriptor.js'

import Scene from '../scenes/Scene.js'
import Mesh from '../scenes/Mesh.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import MaterialLibs from '../scenes/MaterialLibs.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import { DirectionalLight } from '../scenes/Light.js'
import GLTFLoader from '../loader/gltf.js'

import { DirectionalShadow } from '../scenes/Shadow.js'
import gui from '../misc/gui.js'
import { degreeToRadian } from '../misc/utils.js'
import Vector3 from '../math/Vector3.js'
import BaseMaterial from '../scenes/BaseMaterial.js'

const phongShader = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) uv: vec2f,
    @location(2) worldPosition: vec3f,
    @location(3) lightViewPosition: vec3f,
};

struct Camera {
    projection: mat4x4<f32>,
    view: mat4x4<f32>,
};

struct Model {
    matrix: mat4x4<f32>,
    normal: mat4x4<f32>,
};

struct DirectionalLight {
    direction: vec3f,
    color: vec3f,
    strength: f32,
    projectionView: mat4x4<f32>,
};

struct PointLight {
    position: vec3f,
    color: vec3f,
    strength: f32,
    constant: f32,
    linear: f32,
    quadratic: f32,

};

struct SpotLight {
    position: vec3f,
    direction: vec3f,
    color: vec3f,
    strength: f32,
    innerLimit: f32,
    outerLimit: f32,
    projectionView: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> color: vec3f;
@group(0) @binding(1) var shadowMap: texture_depth_2d;
@group(0) @binding(2) var shadowSampler: sampler_comparison;
@group(0) @binding(3) var mapSampler: sampler;
@group(1) @binding(0) var<uniform> dirLight: DirectionalLight;
@group(2) @binding(0) var<uniform> camera: Camera;
@group(3) @binding(0) var<uniform> model: Model;

fn calc_directional_light(light: DirectionalLight, normal: vec3f) -> vec3f
{
    let dir = normalize(light.direction);
    return dot(normalize(normal), dir) * light.color * light.strength;
}

fn calc_point_light(light: PointLight, position: vec3f, normal: vec3f) -> vec3f
{
    let dif = light.position - position;
    let dis = length(dif);
    let dir = normalize(dif);
    let att = 1. / (light.constant + light.linear * dis + light.quadratic * (dis + dis)); 
    return dot(normalize(normal), dir) * light.color * light.strength * att;
}

fn calc_spot_light(light: SpotLight, position: vec3f, normal: vec3f) -> vec3f
{
    let dir = normalize(light.position - position);
    let theta = dot(normalize(light.direction), dir);

    let col = dot(normal, dir) * light.color * light.strength;
    let e = light.innerLimit - light.outerLimit;
    let it = clamp((theta - light.outerLimit) / e, 0., 1.);

    return col * it;
}

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
) -> VSOutput
{
    var output: VSOutput;
    let transform = model.matrix * vec4f(position, 1.);
    let clipSpacePos = camera.projection * camera.view * transform;
    let lightSpacePos = dirLight.projectionView * transform;   

    output.position = clipSpacePos;
    output.normal = (model.normal * vec4f(normal, 0.)).xyz;
    output.uv = uv;
    output.worldPosition = transform.xyz;
    output.lightViewPosition = vec3f(
        lightSpacePos.xy * vec2f(.5, -.5) + vec2f(.5),
        lightSpacePos.z);

    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f 
{
    let uvw = input.lightViewPosition;

    var visibility = textureSampleCompare(shadowMap, shadowSampler, 
        uvw.xy, uvw.z - 0.007);

    var _col = calc_directional_light(dirLight, input.normal);
    if (uvw.x > 0. && uvw.x < 1. && uvw.y > 0 && uvw.y < 1.) {
        _col *= visibility;
    }

    return vec4f(_col, 1.);
}
`

const shadowShader = `
struct Model {
    matrix: mat4x4<f32>,
    normal: mat4x4<f32>,
};

struct DirectionalLight {
    direction: vec3f,
    color: vec3f,
    strength: f32,
    projectionView: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> light: DirectionalLight;
@group(1) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f
) -> @builtin(position) vec4f
{
    return light.projectionView * model.matrix * vec4f(position, 1.);
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

    const mainCamera = new PerspectiveCamera(50, width / height, .1, 1000)
    mainCamera.position.set(0, 50, 30)

    const dirShadow = new DirectionalShadow()
    dirShadow.dimension = 20

    const dirLight = new DirectionalLight()
    dirLight.position.set(-10, 20, 20)
    dirLight.shadow = dirShadow

    const planeGeo = GeometryLibs.createPlane(50, 50, 5, 5, { dir: "down" })
    const boxLineGeo = GeometryLibs.createBoxLine(2, 2, 2)
    const points = boxLineGeo.attributes[0].data
    for (let i = 0; i < points.length; i += 3) {
        points[i + 2] = (points[i + 2] + 1) / 2
    }

    const compareSampler = new SamplerCore({
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
        compare: "less",
    })
    compareSampler.type = "comparison"

    const blueMaterial = MaterialLibs.unlit({ color: new Vector3(1, 1, 1) })
    blueMaterial.shader = phongShader
    blueMaterial.addTexture(dirLight.shadow.depthTexture)
    blueMaterial.addSampler(compareSampler)

    const lineMaterial = MaterialLibs.line({ color: new Vector3(1, 0, 0) })

    const shadowMaterial = new BaseMaterial("shadow map")
    shadowMaterial.shader = shadowShader
    shadowMaterial.fragmentEnabled = false
    shadowMaterial.depthFormat = "depth32float"

    const plane = new Mesh(planeGeo, blueMaterial)
    plane.position.y = -3

    const boxLine = new Mesh(boxLineGeo, lineMaterial)
    boxLine.castShadow = false

    const gltfLoader = new GLTFLoader()
    const gltf = await gltfLoader.load("../public/gltf", "monkey.gltf")
    const monkey = gltf[0].children[0]
    monkey.material = blueMaterial
    monkey.parent = null
    monkey.scale.setUniform(5)

    const scene = new Scene()
    scene.addNode(plane)
    scene.addNode(monkey)
    scene.addNode(boxLine)
    scene.addNode(dirLight)

    const renderGroups = instance.bindScene(scene, mainCamera)
    const shadowGroups = instance.bindShadowScene(scene, shadowMaterial)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const spDesc = new RenderPassDescriptor()
    spDesc.disableColorAttachment()
    spDesc.disableStencil()
    spDesc.setDSAView(dirLight.shadow.depthTexture.GPUTexture.createView())

    const rpDesc = new RenderPassDescriptor()
    rpDesc.setDSAView(depthTexture.GPUTexture.createView())
    rpDesc.setClearValue(.2, .2, .5, 1)

    const updateWorld = () => {
        mainCamera.updateViewMatrix()
        dirLight.updateBuffer()

        plane.updateMatrixWorld()
        plane.updateNormalMatrix()
        plane.updateBuffer()

        monkey.updateMatrixWorld()
        monkey.updateNormalMatrix()
        monkey.updateBuffer()

        boxLine.localMatrix.copy(dirLight.shadow.projectionViewMatrix).inverse()
        boxLine.updateWorldMatrix()
        boxLine.updateBuffer()
    }

    const render = () => {
        updateWorld()
        instance
            .writeBuffer(mainCamera.buffer)
            .writeBuffer(plane.buffer)
            .writeBuffer(monkey.buffer)
            .writeBuffer(boxLine.buffer)
            .writeBuffer(dirLight.buffer)

        const encoder = instance.createCommandEncoder()

        // shadow scene
        const sPass = encoder.beginRenderPass(spDesc.get())
        sPass.setBindGroup(0, scene.bindGroup.GPUBindGroup)
        sPass.setPipeline(shadowGroups.pipeline)

        for (let primitive of shadowGroups.primitives) {
            sPass.setVertexBuffer(0, primitive.positionBuffer)
            sPass.setIndexBuffer(primitive.indexBuffer, primitive.indexFormat)

            for (let instance of primitive.instances) {
                sPass.setBindGroup(1, instance.transform)
                sPass.drawIndexed(primitive.indexLength)
            }
        }
        sPass.end()

        // main scene
        rpDesc.setCAView(context.getCurrentTexture().createView())
        const mPass = encoder.beginRenderPass(rpDesc.get())
        mPass.setBindGroup(2, mainCamera.bindGroup.GPUBindGroup)
        mPass.setBindGroup(1, scene.bindGroup.GPUBindGroup)

        for (let group of renderGroups) {
            mPass.setPipeline(group.pipeline)
            mPass.setBindGroup(0, group.material)

            for (let primitive of group.primitives) {
                let i = 0
                for (let attribute of primitive.attributes) {
                    mPass.setVertexBuffer(i, attribute)
                    ++i
                }

                mPass.setIndexBuffer(primitive.indexBuffer, primitive.indexFormat)

                for (let instance of primitive.instances) {
                    mPass.setBindGroup(3, instance.transform)
                    mPass.drawIndexed(primitive.indexLength)
                }
            }
        }
        mPass.end()

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

    const cameraControl = (angle) => {
        const c = Math.cos(angle)
        const s = Math.sin(angle)

        const x = mainCamera.position.x * c - mainCamera.position.z * s
        const z = mainCamera.position.x * s + mainCamera.position.z * c

        mainCamera.position.x = x
        mainCamera.position.z = z

        render()
    }

    const lightControl = (v, p) => {
        if (p === 1) {
            dirLight.position.x = v
        }
        else if (p === 2) {
            dirLight.position.y = v
        }
        else if (p === 3) {
            dirLight.position.z = v
        }

        render()
    }

    const meshControl = (v, p) => {
        if (p === 1) {
            monkey.position.x = v
        }
        else if (p === 2) {
            monkey.position.y = v
        }
        else if (p === 3) {
            monkey.position.z = v
        }
        render()
    }

    let prev = 0
    const params = [
        {
            label: "Camera",
            fields: [
                {
                    label: "Rotation",
                    type: "range",
                    value: 0,
                    min: -180,
                    max: 180,
                    step: 1,
                    func(e) {
                        const theta = Number(e) - prev
                        prev = Number(e)
                        cameraControl(degreeToRadian(theta), "y")
                    }
                }
            ]
        },
        {
            label: "Light",
            fields: [
                {
                    label: "Position X",
                    type: "range",
                    value: dirLight.position.x,
                    min: -20,
                    max: 20,
                    step: 1,
                    func(e) {
                        lightControl(Number(e), 1)
                    }
                },
                {
                    label: "Position Y",
                    type: "range",
                    value: dirLight.position.y,
                    min: -20,
                    max: 20,
                    step: 1,
                    func(e) {
                        lightControl(Number(e), 2)
                    }
                },
                {
                    label: "Position Z",
                    type: "range",
                    value: dirLight.position.z,
                    min: -20,
                    max: 20,
                    step: 1,
                    func(e) {
                        lightControl(Number(e), 3)
                    }
                }
            ]
        },
        {
            label: "Mesh",
            fields: [
                {
                    label: "Position X",
                    type: "range",
                    value: monkey.position.x,
                    min: -20,
                    max: 20,
                    step: 1,
                    func(e) {
                        meshControl(Number(e), 1)
                    }
                },
                {
                    label: "Position Y",
                    type: "range",
                    value: monkey.position.x,
                    min: -20,
                    max: 20,
                    step: 1,
                    func(e) {
                        meshControl(Number(e), 2)
                    }
                },
                {
                    label: "Position Z",
                    type: "range",
                    value: monkey.position.x,
                    min: -20,
                    max: 20,
                    step: 1,
                    func(e) {
                        meshControl(Number(e), 3)
                    }
                }
            ]
        },
    ]

    gui(params)
}

main()

