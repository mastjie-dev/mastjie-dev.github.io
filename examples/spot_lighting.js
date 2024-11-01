import WebGPUInstance from '../cores/WebGPUInstance.js'
import { UniformBuffer } from '../cores/BufferCore.js'
import { DepthTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import RenderPassDescriptor from '../cores/RenderPassDescriptor.js'

import Scene from '../scenes/Scene.js'
import Mesh from '../scenes/Mesh.js'
import { SpotLight } from '../scenes/Light.js'
import { SpotShadow } from '../scenes/Shadow.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import MaterialLibs from '../scenes/MaterialLibs.js'
import { PerspectiveCamera } from '../scenes/Camera.js'
import Matrix4 from '../math/Matrix4.js'

import gui from '../misc/gui.js'

const unlitSC = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPosition: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) lightSpacePosition: vec4f,

};

struct Camera {
    projection: mat4x4<f32>,
    view: mat4x4<f32>,
};

struct Model {
    matrix: mat4x4<f32>,
    normal: mat4x4<f32>,
};

struct SpotLight {
    position: vec3f,
    direction: vec3f,
    color: vec3f,
    strength: f32,
    innerLimit: f32,
    outerLimit: f32,
    projectionView: mat4x4<f32>
};

@group(0) @binding(0) var<uniform> color: vec3f;
@group(0) @binding(1) var shadowMap: texture_depth_2d;
@group(0) @binding(2) var mapSampler: sampler;
@group(0) @binding(3) var shadowSampler: sampler_comparison;
@group(1) @binding(0) var<uniform> spotLight: SpotLight;
@group(2) @binding(0) var<uniform> camera: Camera;
@group(3) @binding(0) var<uniform> model: Model;

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
    let worldPosition = model.matrix * vec4f(position, 1.);
    let clipSpaceView = camera.projection * camera.view * worldPosition;
    let lightSpaceView = spotLight.projectionView * worldPosition;

    var output: VSOutput;
    output.position = clipSpaceView;
    output.worldPosition = worldPosition.xyz;
    output.normal = (model.normal * vec4f(normal, 0.)).xyz;
    output.uv = uv;

    var q = lightSpaceView.xyz / lightSpaceView.w;
    q.x = q.x * .5 + .5;
    q.y = q.y * -.5 + .5;
    output.lightSpacePosition = vec4f(q, lightSpaceView.w);

    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f 
{

    let t = input.lightSpacePosition;
    var v = textureSampleCompare(shadowMap, shadowSampler, t.xy, t.z-.0005);

    let ilum = calc_spot_light(spotLight, input.worldPosition, normalize(input.normal));
    var _color = ilum * v;

    // if (t.x > 0. && t.x < 1. && t.y > 0. && t.y < 1.) {
    //     _color *= v;
    // }

    return vec4f(_color, 1.);
}    
`
const shadowShader = `
struct Model {
    matrix: mat4x4<f32>,
    normal: mat4x4<f32>,
};

struct SpotLight {
    position: vec3f,
    direction: vec3f,
    color: vec3f,
    strength: f32,
    innerLimit: f32,
    outerLimit: f32,
    projectionView: mat4x4<f32>
};

@group(0) @binding(0) var<uniform> light: SpotLight;
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

    const camera = new PerspectiveCamera(75, width / height)
    camera.position.set(-15, 20, 20)

    const spotShadow = new SpotShadow()

    const spotLight = new SpotLight()
    spotLight.outerLimit = .85
    spotLight.position.set(-5, 20, -10)
    spotLight.shadow = spotShadow

    const boxGeometry = GeometryLibs.createBox(2, 2, 2)
    const planeGeometry = new GeometryLibs.createPlane(2, 2, 1, 1, { dir: "down" })
    const boxLineGeometry = GeometryLibs.createBoxLine(2, 2, 2)

    const compSampler = new SamplerCore({
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
        compare: "less"
    })
    compSampler.type = 'comparison'

    const material = new BaseMaterial()
    material.shader = unlitSC
    material.addBuffer(new UniformBuffer(new Float32Array([1, .5, 1])))
    material.addTexture(spotLight.shadow.depthTexture)
    material.addSampler(new SamplerCore())
    material.addSampler(compSampler)

    const box = new Mesh(boxGeometry, material)
    box.scale.setUniform(3)
    const plane = new Mesh(planeGeometry, material)
    plane.scale.setUniform(25, 25, 25)
    plane.position.y = -2

    // const frustum = new Mesh(boxLineGeo, redLineMat)
    // const points = frustum.geometry.attributes[0].data
    // for (let i = 0; i < points.length; i += 3) {
    //     points[i + 2] = (points[i + 2] + 1) / 2
    // }

    const shadowMaterial = new BaseMaterial("shadow map")
    shadowMaterial.shader = shadowShader
    shadowMaterial.fragmentEnabled = false
    shadowMaterial.depthFormat = "depth32float"

    const scene = new Scene()
    scene.addNode(box)
    scene.addNode(plane)
    scene.addNode(spotLight)

    const groups = instance.bindScene(scene, camera)
    const shadowGroup = instance.bindShadowScene(scene, shadowMaterial)

    const depthTexture = new DepthTexture(width, height)
    instance.createTexture(depthTexture)

    const rpDesc = new RenderPassDescriptor()
    rpDesc.setClearValue(.4, .4, .4, 1)
    rpDesc.setDSAView(depthTexture.GPUTexture.createView())

    const spDesc = new RenderPassDescriptor()
    spDesc.disableColorAttachment()
    spDesc.disableStencil()
    spDesc.setDSAView(spotShadow.depthTexture.GPUTexture.createView())

    const render = () => {

        const encoder = instance.createCommandEncoder()

        const shadowPass = encoder.beginRenderPass(spDesc.get())
        shadowPass.setBindGroup(0, scene.bindGroup.GPUBindGroup)
        shadowPass.setPipeline(shadowGroup.pipeline)

        for (let primitive of shadowGroup.primitives) {
            shadowPass.setVertexBuffer(0, primitive.positionBuffer)
            shadowPass.setIndexBuffer(primitive.indexBuffer, primitive.indexFormat)

            for (let txn of primitive.transforms) {
                shadowPass.setBindGroup(1, txn)
                shadowPass.drawIndexed(primitive.indexLength)
            }
        }
        shadowPass.end()


        rpDesc.setCAView(context.getCurrentTexture().createView())
        const mainPass = encoder.beginRenderPass(rpDesc.get())

        mainPass.setBindGroup(1, scene.bindGroup.GPUBindGroup)
        mainPass.setBindGroup(2, camera.bindGroup.GPUBindGroup)

        for (let group of groups) {
            mainPass.setBindGroup(0, group.material)
            mainPass.setPipeline(group.pipeline)

            for (let primitive of group.primitives) {
                let i = 0
                for (let attr of primitive.attributes) {
                    mainPass.setVertexBuffer(i, attr)
                    ++i
                }

                mainPass.setIndexBuffer(primitive.indexBuffer, primitive.indexFormat)

                for (let instance of primitive.instances) {
                    mainPass.setBindGroup(3, instance.transform)
                    mainPass.drawIndexed(primitive.indexLength, instance.count)
                }
            }
        }
        mainPass.end()

        instance.submitEncoder([encoder.finish()])
        // requestAnimationFrame(render)
    }
    requestAnimationFrame(render)

    document.body.appendChild(canvas)
}

main()