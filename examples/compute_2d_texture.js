import WebGPUInstance from '../cores/WebGPUInstance.js'
import { StorageTexture, CopyTargetTexture } from '../cores/TextureCore.js'
import SamplerCore from '../cores/SamplerCore.js'
import RenderPassDescriptor from '../cores/RenderPassDescriptor.js'

import Scene from '../scenes/Scene.js'
import { OrthographicCamera } from '../scenes/Camera.js'
import Mesh from '../scenes/Mesh.js'
import GeometryLibs from '../scenes/GeometryLibs.js'
import BaseMaterial from '../scenes/BaseMaterial.js'
import Compute from '../scenes/Compute.js'

const shaderCode = `
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
@group(0) @binding(1) var smp: sampler;
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
    output.position = camera.projection * camera.view * model.matrix * vec4f(position, 1.);
    output.uv = uv;
    return output;
}

@fragment fn main_fragment(
    input: VSOutput,
)
    -> @location(0) vec4f 
{
    let color = textureSample(map, smp, input.uv).rgb;
    return vec4f(color, 1.);
}
`

const computeCode = `
@group(0) @binding(0) var st2d: texture_storage_2d<bgra8unorm, write>;

// Worley: https://thebookofshaders.com/12/
fn rand( p: vec2f ) -> vec2f {
    return fract(sin(vec2f(dot(p,vec2f(127.1,311.7)),dot(p,vec2f(269.5,183.3))))*43758.5453);
}

@compute @workgroup_size(8, 8, 1) 
fn main_compute(
    @builtin(global_invocation_id) id: vec3<u32>,
)
{
    let uv = vec2f(f32(id.x), f32(id.y)) / 256.;
    let st = uv * 8.;
    let fl = floor(st);
    let fr = fract(st);
    var mDist = 1.;

    for (var i = -1; i <= 1; i++) {
        for(var j = -1; j <= 1; j++) {
            let n = vec2f(f32(i), f32(j));
            let r = rand(n+fl);
            let p = n + r - fr;
            let d = length(p);
            mDist = min(mDist, d);
        }
    }

    let cl = vec4f(vec3f(mDist), 1.);
    textureStore(st2d, id.xy, cl);
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
    const worleyStorage = new StorageTexture(256, 256)

    const compute = new Compute()
    compute.shader = computeCode
    compute.setWorkgroups(32, 32)
    compute.addTexture(worleyStorage)

    instance.bindCompute(compute)

    /**
     *  Render Stage
     */
    const worleyTexture = new CopyTargetTexture(256, 256)

    const v = 2
    const h = v * width / height
    const camera = new OrthographicCamera(-h, h, -v, v)
    camera.position.z = 1

    const geometry = GeometryLibs.createPlane(2, 2)
    const material = new BaseMaterial()
    material.shader = shaderCode
    material.depthWriteEnabled = false
    material.cullMode = "none"
    material.addTexture(worleyTexture)
    material.addSampler(new SamplerCore())

    const mesh = new Mesh(geometry, material)

    const scene = new Scene()
    scene.addNode(mesh)

    const groups = instance.bindScene(scene, camera)

    const rpDesc = new RenderPassDescriptor()
    rpDesc.disableDepthStencilAttachment()

    const render = () => {
        const encoder = instance.createCommandEncoder()

        const computePass = encoder.beginComputePass()
        computePass.setPipeline(compute.pipeline)
        computePass.setBindGroup(0, compute.bindGroup.GPUBindGroup)
        computePass.dispatchWorkgroups(...compute.workgroups)
        computePass.end()

        instance.copyTextureToTexture(encoder, worleyStorage, worleyTexture)

        rpDesc.setCAView(context.getCurrentTexture().createView())
        const renderPass = encoder.beginRenderPass(rpDesc.get())

        const group = groups[0]
        renderPass.setPipeline(group.pipeline)
        renderPass.setBindGroup(0, group.material)
        renderPass.setBindGroup(1, scene.bindGroup.GPUBindGroup)
        renderPass.setBindGroup(2, camera.bindGroup.GPUBindGroup)

        const primitive = group.primitives[0]
        renderPass.setBindGroup(3, primitive.instances[0].transform)
    
        let i = 0
        for (let attr of primitive.attributes) {
            renderPass.setVertexBuffer(i, attr)
            ++i
        }

        renderPass.setIndexBuffer(primitive.indexBuffer, primitive.indexFormat)
        renderPass.drawIndexed(primitive.indexLength, primitive.instances[0].count)
        renderPass.end()

        instance.submitEncoder([encoder.finish()])
    }
    render()


    document.body.appendChild(canvas)
}

main()