import WebGPUInstance from '../cores/WebGPUInstance.js'
import { DepthTexture, ExternalImageTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import { PipelineDescriptorBuilder, RenderPassDescriptorBuilder } from '../cores/Builder.js'

import Mesh from '../scenes/Mesh.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import MaterialLibs from '../scenes/MaterialLibs.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import { DirectionalLight } from '../scenes/Light.js'

import gui from '../misc/gui.js'
import { degreeToRadian, loadImageBitmap } from '../misc/utils.js'
import Vector3 from '../math/Vector3.js'

const phongShader = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) uv: vec2f,
    @location(2) projPos: vec3f,
};

struct Camera {
    projection: mat4x4<f32>,
    view: mat4x4<f32>,
};

struct Model {
    matrix: mat4x4<f32>,
    normal: mat4x4<f32>,
};

struct Light {
    position: vec3f,
    color: vec3f,
    projectionView: mat4x4<f32>,
    strength: f32,
    shadowBias: f32,
    shadowMapSize: f32,
};

@group(0) @binding(0) var<uniform> color: vec3f;
@group(0) @binding(1) var shadowMap: texture_depth_2d;
@group(0) @binding(2) var map: texture_2d<f32>;
@group(0) @binding(3) var shadowMapSampler: sampler_comparison;
@group(0) @binding(4) var mapSampler: sampler;
@group(1) @binding(0) var<uniform> camera: Camera;
@group(2) @binding(0) var<uniform> model: Model;
@group(3) @binding(0) var<uniform> light: Light;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
) -> VSOutput
{
    var output: VSOutput;
    let transform = model.matrix * vec4f(position, 1.);
    var projectionTransform = light.projectionView * transform;
    output.position = camera.projection * camera.view * transform;
    output.normal = (model.normal * vec4f(normal, 0.)).xyz;
    output.uv = uv;
    output.projPos = vec3f(
        projectionTransform.xy * vec2f(.5, -.5) + vec2f(.5),
        projectionTransform.z
    );
    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f 
{

    let lPos = normalize(light.position);
    let lum = dot(lPos, normalize(input.normal));

    let uv = input.projPos.xy;
    let w = input.projPos.z - light.shadowBias;
    let t = 1. / light.shadowMapSize;
    var v: f32;
    v += textureSampleCompare(shadowMap, shadowMapSampler, uv+vec2f(-t, -t), w);
    v += textureSampleCompare(shadowMap, shadowMapSampler, uv+vec2f( 0, -t), w);
    v += textureSampleCompare(shadowMap, shadowMapSampler, uv+vec2f( t, -t), w);
    v += textureSampleCompare(shadowMap, shadowMapSampler, uv+vec2f(-t,  0), w);
    v += textureSampleCompare(shadowMap, shadowMapSampler, uv+vec2f( 0,  0), w);
    v += textureSampleCompare(shadowMap, shadowMapSampler, uv+vec2f( t,  0), w);
    v += textureSampleCompare(shadowMap, shadowMapSampler, uv+vec2f(-t,  t), w);
    v += textureSampleCompare(shadowMap, shadowMapSampler, uv+vec2f( 0,  t), w);
    v += textureSampleCompare(shadowMap, shadowMapSampler, uv+vec2f( t,  t), w);
    v /= 9.;
    if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) { v = 1.; }

    let _col = vec3f(v*lum*light.strength);
    return vec4f(_col, 1.);
}
`

const shadowShader = `
struct Model {
    matrix: mat4x4<f32>,
    normal: mat4x4<f32>,
};

struct Light {
    position: vec3f,
    color: vec3f,
    strength: f32,
    projection: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> model: Model;
@group(1) @binding(0) var<uniform> light: Light;

@vertex fn main_vertex(
    @location(0) position: vec3f
) -> @builtin(position) vec4f
{
    return light.projection * model.matrix * vec4f(position, 1.);
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

    const bitmap = await loadImageBitmap('../public/f-texture.png')
    const texture = new ExternalImageTexture(bitmap.width, bitmap.height, bitmap)

    const mainCamera = new PerspectiveCamera(50, width / height, .1, 1000)
    mainCamera.position.set(0, -30, -30)

    const dLight = new DirectionalLight()
    dLight.position.set(0, -20, -5)

    const boxGeo = GeometryUtils.createBox(2, 10, 2, 1, 1, 1)
    const sphereGeo = GeometryUtils.createSphereCube(5, 10)
    const gridGeo = GeometryUtils.createGrid(100, 2)
    const planeGeo = GeometryUtils.createPlane(50, 50, 5, 5, { dir: "up" })
    const boxLineGeo = GeometryUtils.createBoxLine(2, 2, 2)
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

    const blueMaterial = MaterialLibs.unlit({ color: new Vector3(0, 1, 0) })
    blueMaterial.shader = phongShader
    blueMaterial.addTexture(dLight.shadowDepthTexture)
    blueMaterial.addTexture(texture)
    blueMaterial.addSampler(compareSampler)
    blueMaterial.addSampler(new SamplerCore({
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
    }))
    const lineMaterial = MaterialLibs.line({ color: new Vector3(1, 0, 0) })

    const box = new Mesh(boxGeo, blueMaterial)
    const sphere = new Mesh(sphereGeo, blueMaterial)
    const plane = new Mesh(planeGeo, blueMaterial)

    const boxLine = new Mesh(boxLineGeo, lineMaterial)

    const meshes = [box, sphere, plane, boxLine]
    const shadowMeshes = [box, sphere, plane]
    box.position.x = 10
    plane.position.y = 3

    instance.bindCamerasResource(mainCamera)
    instance.bindLightsResource(dLight)
    instance.bindMeshesResources(meshes)

    const shadowModule = instance.createShaderModule(shadowShader)
    const shadowObjects = shadowMeshes.map(mesh => {
        const pl = instance.createPipelineLayout(
            mesh.bindGroupLayout.GPUBindGroupLayout,
            dLight.bindGroupLayout.GPUBindGroupLayout
        )

        const desc = PipelineDescriptorBuilder
            .start()
            .layout(pl)
            .vertex(shadowModule, mesh.geometry.vertexBufferLayout)
            .depthStencil(true, "depth32float", "less")
            .primitive(mesh.material.cullMode, mesh.material.topology)
            .end()
        
        return instance.createRenderPipeline(mesh, desc)
    })

    const renderObjects = meshes.map(mesh => {
        const pl = instance.createPipelineLayout(
            mesh.material.bindGroupLayout.GPUBindGroupLayout,
            mainCamera.bindGroupLayout.GPUBindGroupLayout,
            mesh.bindGroupLayout.GPUBindGroupLayout,
            dLight.bindGroupLayout.GPUBindGroupLayout
        )

        const desc = PipelineDescriptorBuilder
            .start()
            .layout(pl)
            .vertex(mesh.material.shaderModule, mesh.geometry.vertexBufferLayout)
            .fragment(mesh.material.shaderModule, canvasFormat)
            .depthStencil(
                mesh.material.depthWriteEnabled,
                mesh.material.depthFormat,
                mesh.material.depthCompare
            )
            .primitive(mesh.material.cullMode, mesh.material.topology)
            .end()

        return instance.createRenderPipeline(mesh, desc)
    })

    const shadowDesc = RenderPassDescriptorBuilder
        .start().disableColorAttachment().disableStencil().end()
    shadowDesc.depthStencilAttachment.view = dLight.shadowDepthTexture.GPUTexture.createView()


    const rpDesc = RenderPassDescriptorBuilder.start().end()
    rpDesc.colorAttachments[0].clearValue = [.3, .3, .4, 0]

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const render = () => {
        mainCamera.updateViewMatrix()

        dLight.updateViewSpacePosition(mainCamera)
        dLight.updateProjectionView()
        dLight.updateBuffer()

        box.updateMatrixWorld()
        box.updateNormalMatrix(mainCamera)
        box.updateBuffer()

        sphere.updateMatrixWorld()
        sphere.updateNormalMatrix(mainCamera)
        sphere.updateBuffer()

        plane.updateMatrixWorld()
        plane.updateNormalMatrix(mainCamera)
        plane.updateBuffer()

        boxLine.localMatrix.copy(dLight.projectionView).inverse()
        boxLine.updateWorldMatrix()
        boxLine.updateBuffer()

        instance
            .writeBuffer(mainCamera.buffer)
            .writeBuffer(box.buffer)
            .writeBuffer(sphere.buffer)
            .writeBuffer(plane.buffer)
            .writeBuffer(dLight.buffer)
            .writeBuffer(boxLine.buffer)

        const encoder = instance.createCommandEncoder()

        // shadow pass
        const shadowPass = encoder.beginRenderPass(shadowDesc)

        for (let sObj of shadowObjects) {
            shadowPass.setPipeline(sObj.pipeline)

            let i = 0
            for (let attr of sObj.mesh.geometry.attributes) {
                shadowPass.setVertexBuffer(i, attr.GPUBuffer)
                ++i
            }

            shadowPass.setBindGroup(0, sObj.mesh.bindGroup.GPUBindGroup)
            shadowPass.setBindGroup(1, dLight.bindGroup.GPUBindGroup)
            shadowPass.setIndexBuffer(sObj.mesh.geometry.index.GPUBuffer,
                sObj.mesh.geometry.index.format)
            shadowPass.drawIndexed(sObj.mesh.geometry.index.length)
        }
        shadowPass.end()

        // main pass
        rpDesc.colorAttachments[0].view = context.getCurrentTexture().createView()
        rpDesc.depthStencilAttachment.view = depthTexture.GPUTexture.createView()
        const mainPass = encoder.beginRenderPass(rpDesc)

        for (let rObj of renderObjects) {
            mainPass.setPipeline(rObj.pipeline)

            let i = 0
            for (let attr of rObj.mesh.geometry.attributes) {
                mainPass.setVertexBuffer(i, attr.GPUBuffer)
                ++i
            }

            mainPass.setBindGroup(0, rObj.mesh.material.bindGroup.GPUBindGroup)
            mainPass.setBindGroup(1, mainCamera.bindGroup.GPUBindGroup)
            mainPass.setBindGroup(2, rObj.mesh.bindGroup.GPUBindGroup)
            mainPass.setBindGroup(3, dLight.bindGroup.GPUBindGroup)
            mainPass.setIndexBuffer(rObj.mesh.geometry.index.GPUBuffer,
                rObj.mesh.geometry.index.format)
            mainPass.drawIndexed(rObj.mesh.geometry.index.length)
        }
        mainPass.end()

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
            dLight.position.x = v
        }
        else if (p === 2) {
            dLight.position.y = v
        }
        else if (p === 3) {
            dLight.position.z = v
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
                    value: dLight.position.x,
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
                    value: dLight.position.y,
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
                    value: dLight.position.z,
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

