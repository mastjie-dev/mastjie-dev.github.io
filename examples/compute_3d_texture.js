import WebGPUInstance from '../cores/WebGPUInstance.js'
import { UniformBuffer } from '../cores/BufferCore.js'
import { ExternalImageTexture, StorageTexture, CopyTargetTexture, RenderTargetTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import RenderPassDescriptorBuilder from '../cores/RenderPassDescriptor.js'

import Scene from '../scenes/Scene.js'
import { OrthographicCamera } from '../scenes/Camera.js'
import Compute from '../scenes/Compute.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import Mesh from '../scenes/Mesh.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import { loadImageBitmap } from '../misc/utils.js'
import RenderPassDescriptor from '../cores/RenderPassDescriptor.js'

const shaderCode = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var worley: texture_3d<f32>;
@group(0) @binding(2) var blue: texture_2d<f32>;
@group(0) @binding(3) var smp: sampler;

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

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f 
{
    let st = input.uv - .5;
    let bn = textureSample(blue, smp, input.uv*8.).r;

    let ro = vec3f(0, 0, -3.);
    let rd = normalize(vec3f(st, 1.));
    let step = .2;
    var mDist = 0.;
    var t = 1.;

    for (var i = 0; i < 64; i++) {
        let p = ro + rd * mDist;
        let d = length(p) - 1.;

        var n = textureSample(worley, smp, (p+1.) * .25 + vec3f(time*.1, 0., 0.)).r;
        n = smoothstep(.5, 1., n);
        if (d < 0.) {
            t *= exp(-step*n*1.5);
        }

        mDist += step * bn;
    }

    let color = vec3(1.-t);
    return vec4f(color, 1.);
}
`

const computeCode = `
@group(0) @binding(0) var st3d: texture_storage_3d<bgra8unorm, write>;

// Worley: https://thebookofshaders.com/12/
fn rand(p: vec3f) -> vec3f {
    return fract(sin(vec3f(
        dot(p,vec3f(127.1,311.7, 93.4)),
        dot(p,vec3f(269.5,183.3, 111.2)),
        dot(p,vec3f(391.5,218.1, 149.0))
    ))*43758.5453);
}

@compute @workgroup_size(4, 4, 4) 
fn main_compute(
    @builtin(global_invocation_id) id: vec3<u32>,
)
{
    let uvw = vec3f(f32(id.x), f32(id.y), f32(id.z)) / 128.;
    let st = uvw * 10.;
    let fl = floor(st);
    let fr = fract(st);
    var mDist = 1.;

    for (var i = -1; i <= 1; i++) {
        for(var j = -1; j <= 1; j++) {
            for (var k = -1; k <= 1; k++) {
                let n = vec3f(f32(i), f32(j), f32(k));
                let r = rand(n+fl);
                let p = n + r - fr;
                let d = length(p);
                mDist = min(mDist, d);
            }
        }
    }

    let cl = vec4f(vec3f(mDist), 1.);
    textureStore(st3d, id, cl);
}
`

const postShader = `
struct VSOutput {
    @builtin(position) position: vec4f,
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

@group(0) @binding(0) var map: texture_2d<f32>;
@group(0) @binding(1) var mapSampler: sampler;
@group(1) @binding(0) var<uniform> scene: Scene;
@group(2) @binding(0) var<uniform> camera: Camera;
@group(3) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
) -> VSOutput
{
    var output: VSOutput;
    output.position = camera.projection * camera.view * vec4f(position, 1.);
    output.uv = uv;
    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f 
{
    let tx = 1. / 256.;
    var color = vec3f(0.);

    color += textureSample(map, mapSampler, input.uv+vec2f(-tx, -tx)).rgb;
    color += textureSample(map, mapSampler, input.uv+vec2f(0  , -tx)).rgb;
    color += textureSample(map, mapSampler, input.uv+vec2f(tx , -tx)).rgb;
    color += textureSample(map, mapSampler, input.uv+vec2f(-tx,   0)).rgb;
    color += textureSample(map, mapSampler, input.uv+vec2f(0  ,   0)).rgb;
    color += textureSample(map, mapSampler, input.uv+vec2f(tx ,   0)).rgb;
    color += textureSample(map, mapSampler, input.uv+vec2f(-tx,  tx)).rgb;
    color += textureSample(map, mapSampler, input.uv+vec2f(0  ,  tx)).rgb;
    color += textureSample(map, mapSampler, input.uv+vec2f(tx ,  tx)).rgb;
    color /= 9.;

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

    /**
     *  Compute Stage
     */

    const volumeStorage = new StorageTexture(128, 128, 128, "3d")
    const compute = new Compute()
    compute.shader = computeCode
    compute.setWorkgroups(32, 32, 32)
    compute.addTexture(volumeStorage)

    instance.bindCompute(compute)

    /**
     *  Render Stage
     */

    const blueNoiseBitmap = await loadImageBitmap("../public/images/blue_noise.png")

    const camera = new OrthographicCamera()
    camera.position.z = 1

    const geometry = GeometryLibs.createPlane(2, 2, 1, 1)

    const time = new UniformBuffer(new Float32Array([0]))
    const worleyTexture = new CopyTargetTexture(128, 128, 128, "3d")
    const blueNoiseTexture = new ExternalImageTexture(blueNoiseBitmap.width,
        blueNoiseBitmap.height, blueNoiseBitmap)

    const material = new BaseMaterial()
    material.shader = shaderCode
    material.depthWriteEnabled = false
    material.cullMode = "none"

    material.addBuffer(time)
    material.addTexture(worleyTexture)
    material.addTexture(blueNoiseTexture)
    material.addSampler(new SamplerCore("", { addressModeU: "mirror-repeat" }))

    const mesh = new Mesh(geometry, material)
    const scene = new Scene()
    scene.addNode(mesh)
    const groups = instance.bindScene(scene, camera)

    // Post processing
    const v = 1
    const h = 1 * width / height
    const postCamera = new OrthographicCamera(-h, h, -v, v)
    postCamera.position.z = 1

    const renderTarget = new RenderTargetTexture(512, 512)
    const postMaterial = new BaseMaterial("post material")
    postMaterial.shader = postShader
    postMaterial.cullMode = "none"
    postMaterial.depthWriteEnabled = false
    postMaterial.addTexture(renderTarget)
    postMaterial.addSampler(new SamplerCore())

    const postQuad = new Mesh(geometry, postMaterial)
    const postScene = new Scene()
    postScene.addNode(postQuad)
    const postGroups = instance.bindScene(postScene, postCamera)
    
    const mainRPD = new RenderPassDescriptor()
    mainRPD.disableDepthStencilAttachment()
    
    const postRPD = new RenderPassDescriptor()
    postRPD.disableDepthStencilAttachment()

    const encoder = instance.createCommandEncoder()

    const computePass = encoder.beginComputePass()
    computePass.setPipeline(compute.pipeline)
    computePass.setBindGroup(0, compute.bindGroup.GPUBindGroup)
    computePass.dispatchWorkgroups(...compute.workgroups)
    computePass.end()
    instance.copyTextureToTexture(encoder, volumeStorage, worleyTexture)
    instance.submitEncoder([encoder.finish()])


    const render = () => {
        time.data[0] += 0.016
        instance.writeBuffer(time)

        const encoder = instance.createCommandEncoder()
        
        mainRPD.setCAView(renderTarget.GPUTexture.createView())
        const mainPass = encoder.beginRenderPass(mainRPD.get())

        const group = groups[0]
        mainPass.setPipeline(group.pipeline)
        mainPass.setBindGroup(0, group.material)
        mainPass.setBindGroup(1, scene.bindGroup.GPUBindGroup)
        mainPass.setBindGroup(2, camera.bindGroup.GPUBindGroup)

        const primitive = group.primitives[0]
        mainPass.setBindGroup(3, primitive.instances[0].transform)

        let i = 0
        for (let attr of primitive.attributes) {
            mainPass.setVertexBuffer(i, attr)
            ++i
        }

        mainPass.setIndexBuffer(primitive.indexBuffer, primitive.indexFormat)
        mainPass.drawIndexed(primitive.indexLength)
        mainPass.end()

        postRPD.setCAView(context.getCurrentTexture().createView())
        const postPass = encoder.beginRenderPass(postRPD.get())

        const postGroup = postGroups[0]
        postPass.setPipeline(postGroup.pipeline)
        postPass.setBindGroup(0, postGroup.material)
        postPass.setBindGroup(1, postScene.bindGroup.GPUBindGroup)
        postPass.setBindGroup(2, postCamera.bindGroup.GPUBindGroup)

        const _primitive = postGroup.primitives[0]
        postPass.setBindGroup(3, _primitive.instances[0].transform)

        i = 0
        for (let attr of _primitive.attributes) {
            postPass.setVertexBuffer(i, attr)
            ++i
        }

        postPass.setIndexBuffer(_primitive.indexBuffer, _primitive.indexFormat)
        postPass.drawIndexed(_primitive.indexLength)
        postPass.end()

        instance.submitEncoder([encoder.finish()])

        // requestAnimationFrame(render)
    }
    render()

    document.body.appendChild(canvas)
}

main()