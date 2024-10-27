import WebGPUInstance from '../cores/WebGPUInstance.js'
import { DepthTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import { RenderPassDescriptorBuilder } from '../cores/Builder.js'

import Scene from '../scenes/Scene.js'
import Mesh from '../scenes/Mesh.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import MaterialLibs from '../scenes/MaterialLibs.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import { DirectionalLight } from '../scenes/Light.js'
import GLTFLoader from '../loader/gltf.js'

import { DirectionalShadow } from '../scenes/Shadow.js'
import gui from '../misc/gui.js'
import { degreeToRadian, loadImageBitmap } from '../misc/utils.js'
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
}

@group(0) @binding(0) var<uniform> color: vec3f;
@group(0) @binding(1) var shadowMap: texture_depth_2d;
@group(0) @binding(2) var shadowSampler: sampler_comparison;
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
    
    var visibility = 0.;
    visibility += textureSampleCompare(shadowMap, shadowSampler, 
        input.lightViewPosition.xy, input.lightViewPosition.z - 0.005);

    let _col = calc_directional_light(dirLight, input.normal) * visibility;
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
    mainCamera.position.set(0, 30, 30)

    const boxGeo = GeometryLibs.createBox(2, 10, 2, 1, 1, 1)
    const sphereGeo = GeometryLibs.createSphereCube(5, 10)
    const gridGeo = GeometryLibs.createGrid(100, 5)
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

    const dirShadow = new DirectionalShadow()

    const blueMaterial = MaterialLibs.unlit({ color: new Vector3(1, 1, 1) })
    blueMaterial.shader = phongShader
    blueMaterial.addTexture(dirShadow.depthTexture)
    blueMaterial.addSampler(compareSampler)

    const lineMaterial = MaterialLibs.line({ color: new Vector3(1, 1, 1) })

    const shadowMaterial = new BaseMaterial("shadow map")
    shadowMaterial.shader = shadowShader
    shadowMaterial.fragmentEnabled = false
    shadowMaterial.depthFormat = "depth32float"

    const sphere = new Mesh(sphereGeo, blueMaterial)
    const plane = new Mesh(planeGeo, blueMaterial)
    const boxLine = new Mesh(boxLineGeo, lineMaterial)

    const gltfLoader = new GLTFLoader()
    const gltf = await gltfLoader.load("../public/gltf", "monkey.gltf")
    const monkey = gltf[0].children[0]
    monkey.material = blueMaterial
    monkey.parent = null
    monkey.scale.setUniform(5)

    plane.position.y = -3
    sphere.position.x = -10
    monkey.position.x = 10

    const dirLight = new DirectionalLight()
    dirLight.position.set(-10, 20, 20)
    dirLight.shadow = dirShadow

    const scene = new Scene()
    scene.addNode(sphere)
    scene.addNode(plane)
    scene.addNode(monkey)
    scene.addNode(dirLight)

    const renderGroups = instance.bindScene(scene, mainCamera)
    const shadowGroups = instance.bindShadowScene(scene, shadowMaterial)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const spDesc = RenderPassDescriptorBuilder.clone()
    RenderPassDescriptorBuilder.disableColorAttachment(spDesc)
    RenderPassDescriptorBuilder.disableStencil(spDesc)
    spDesc.depthStencilAttachment.view = dirShadow.depthTexture.GPUTexture.createView()

    const rpDesc = RenderPassDescriptorBuilder.clone()
    rpDesc.colorAttachments[0].clearValue = [.3, .3, .4, 0]
    rpDesc.depthStencilAttachment.view = depthTexture.GPUTexture.createView()

    const updateWorld = () => {
        mainCamera.updateViewMatrix()

        dirLight.updateBuffer()

        sphere.updateMatrixWorld()
        sphere.updateNormalMatrix()
        sphere.updateBuffer()

        plane.updateMatrixWorld()
        plane.updateNormalMatrix()
        plane.updateBuffer()

        monkey.updateMatrixWorld()
        monkey.updateNormalMatrix()
        monkey.updateBuffer()

        // boxLine.localMatrix.copy(dirLight.projectionView).inverse()
        // boxLine.updateWorldMatrix()
        // boxLine.updateBuffer()
    }

    const render = () => {
        updateWorld()
        instance
            .writeBuffer(mainCamera.buffer)
            .writeBuffer(sphere.buffer)
            .writeBuffer(plane.buffer)
            .writeBuffer(monkey.buffer)
            .writeBuffer(dirLight.buffer)

        const encoder = instance.createCommandEncoder()

        // shadow scene
        const sPass = encoder.beginRenderPass(spDesc)
        sPass.setBindGroup(0, scene.bindGroup.GPUBindGroup)
        sPass.setPipeline(shadowGroups.pipeline)

        for (let primitive of shadowGroups.primitives) {
            sPass.setVertexBuffer(0, primitive.positionBuffer)
            sPass.setIndexBuffer(primitive.indexBuffer, primitive.indexFormat)

            for (let transform of primitive.transforms) {
                sPass.setBindGroup(1, transform)
                sPass.drawIndexed(primitive.indexLength)
            }
        }
        sPass.end()

        // main scene
        rpDesc.colorAttachments[0].view = context.getCurrentTexture().createView()
        const mPass = encoder.beginRenderPass(rpDesc)
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

                for (let transform of primitive.transforms) {
                    mPass.setBindGroup(3, transform)
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

    const sphereControl = (v, p) => {
        if (p === 1) {
            sphere.position.x = v
        }
        else if (p === 2) {
            sphere.position.y = v
        }
        else if (p === 3) {
            sphere.position.z = v
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
            label: "Sphere",
            fields: [
                {
                    label: "Position X",
                    type: "range",
                    value: sphere.position.x,
                    min: -20,
                    max: 20,
                    step: 1,
                    func(e) {
                        sphereControl(Number(e), 1)
                    }
                },
                {
                    label: "Position Y",
                    type: "range",
                    value: sphere.position.x,
                    min: -20,
                    max: 20,
                    step: 1,
                    func(e) {
                        sphereControl(Number(e), 2)
                    }
                },
                {
                    label: "Position Z",
                    type: "range",
                    value: sphere.position.x,
                    min: -20,
                    max: 20,
                    step: 1,
                    func(e) {
                        sphereControl(Number(e), 3)
                    }
                }
            ]
        },
    ]

    gui(params)
}

main()

