import WebGPUInstance from '../cores/WebGPUInstance.js'
import BufferCore from '../cores/BufferCore.js'
import { DepthTexture } from '../cores/TextureCore.js'
import VARS from '../cores/VARS.js'
import { PipelineDescriptorBuilder, RenderPassDescriptorBuilder } from '../cores/Builder.js'

import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import GeometryUtils from '../scenes/GeometryUtils.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import { DirectionalLight } from '../scenes/Light.js'

import gui from '../misc/gui.js'
import { degreeToRadian } from '../misc/utils.js'

const phongShader = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) uv: vec2f,
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
    strength: f32,
};

@group(0) @binding(0) var<uniform> color: vec3f;
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
    output.position = camera.projection * camera.view * model.matrix * vec4f(position, 1.);
    output.normal = (model.normal * vec4f(normal, 0.)).xyz;
    output.uv = uv;
    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f 
{
    let lPos = normalize(light.position);
    let lum = dot(lPos, normalize(input.normal));

    let _col = vec3f(lum);
    return vec4f(_col, 1.);
}
`

const lineShader = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3f,
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
@group(1) @binding(0) var<uniform> camera: Camera;
@group(2) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f,
) -> VSOutput
{
    var output: VSOutput;
    output.position = camera.projection * camera.view * model.matrix * vec4f(position, 1.);
    output.color = color;
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

    const mainCamera = new PerspectiveCamera(50, width / height, .1, 1000)
    mainCamera.position.set(0, -20, -30)

    const boxGeo = GeometryUtils.createBox(2, 2, 2, 1, 1, 1)
    const sphereGeo = GeometryUtils.createSphereCube(2, 10)
    const gridGeo = GeometryUtils.createGrid(100, 2)

    const blue = new BufferCore("blue", "uniform", new Float32Array([0, 0, 1]), VARS.Buffer.Uniform)
    const white = new BufferCore("white", "uniform", new Float32Array([1, 1, 1]), VARS.Buffer.Uniform)

    const blueMat = new BaseMaterial()
    blueMat.shader = phongShader
    blueMat.addBuffer(blue)

    const whiteLineMat = new BaseMaterial()
    whiteLineMat.shader = lineShader
    whiteLineMat.topology = "line-list"
    whiteLineMat.addBuffer(white)

    const box = new Mesh(boxGeo, blueMat)
    const sphere = new Mesh(sphereGeo, blueMat)
    const grid = new Mesh(gridGeo, whiteLineMat)

    const meshes = [box, sphere, grid]
    box.position.x = 15

    instance.bindMeshesResources(meshes)
    instance.bindCamerasResource(mainCamera)

    const dLight = new DirectionalLight()
    dLight.position.set(0, -10, 0)
    dLight.updateViewSpacePosition(mainCamera)
    instance.bindLightsResource(dLight)

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


    const rpDesc = RenderPassDescriptorBuilder.start().end()
    rpDesc.colorAttachments[0].clearValue = [.3, .3, .4, 0]

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const render = () => {
        mainCamera.updateViewMatrix()

        dLight.updateViewSpacePosition(mainCamera)
        dLight.updateBuffer()

        box.updateMatrixWorld()
        box.updateNormalMatrix(mainCamera)
        box.updateBuffer()

        sphere.updateMatrixWorld()
        sphere.updateNormalMatrix(mainCamera)
        sphere.updateBuffer()

        instance
            .writeBuffer(mainCamera.buffer)
            .writeBuffer(box.buffer)
            .writeBuffer(sphere.buffer)
            .writeBuffer(dLight.buffer)

        const encoder = instance.createCommandEncoder()

        rpDesc.colorAttachments[0].view = context.getCurrentTexture().createView()
        rpDesc.depthStencilAttachment.view = depthTexture.GPUTexture.createView()
        const pass = encoder.beginRenderPass(rpDesc)

        for (let rObj of renderObjects) {
            pass.setPipeline(rObj.pipeline)

            let i = 0
            for (let attr of rObj.mesh.geometry.attributes) {
                pass.setVertexBuffer(i, attr.GPUBuffer)
                ++i
            }

            pass.setBindGroup(0, rObj.mesh.material.bindGroup.GPUBindGroup)
            pass.setBindGroup(1, mainCamera.bindGroup.GPUBindGroup)
            pass.setBindGroup(2, rObj.mesh.bindGroup.GPUBindGroup)
            pass.setBindGroup(3, dLight.bindGroup.GPUBindGroup)
            pass.setIndexBuffer(rObj.mesh.geometry.index.GPUBuffer,
                rObj.mesh.geometry.index.format)
            pass.drawIndexed(rObj.mesh.geometry.index.length)
        }
        pass.end()

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
                    value: 0,
                    min: -10,
                    max: 10,
                    step: 1,
                    func(e) {
                        lightControl(Number(e), 1)
                    }
                },
                {
                    label: "Position Y",
                    type: "range",
                    value: 0,
                    min: -10,
                    max: 10,
                    step: 1,
                    func(e) {
                        lightControl(Number(e), 2)
                    }
                },
                {
                    label: "Position Z",
                    type: "range",
                    value: 0,
                    min: -10,
                    max: 10,
                    step: 1,
                    func(e) {
                        lightControl(Number(e), 3)
                    }
                }
            ]
        },
    ]

    gui(params)
}

main()

