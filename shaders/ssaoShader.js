// https://learnopengl.com/Advanced-Lighting/SSAO

const ssaoShader = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

struct Scene {
    kernelSize: f32,
    radius: f32,
    bias: f32,
    samples: array<vec3f, 64>,
};

struct Camera {
    projection: mat4x4<f32>,
    view: mat4x4<f32>,
};

struct Model {
    matrix: mat4x4<f32>,
    normal: mat4x4<f32>,
};

@group(0) @binding(0) var gPosition: texture_2d<f32>;
@group(0) @binding(1) var gNormal: texture_2d<f32>;
@group(0) @binding(2) var texNoise: texture_2d<f32>;
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
    let fragPos = textureSample(gPosition, mapSampler, input.uv).rgb;
    let normal = normalize(textureSample(gNormal, mapSampler, input.uv).rgb);
    let randomVec = normalize(textureSample(texNoise, mapSampler, input.uv * 10.));

    let tangent = normalize(randomVec - normal * dot(randomVec, normal));
    let bitangent = cross(normal, tangent);
    let TBN = mat3x3(tangent, bitangent, normal);

    var occlusion = 0.;
    let kernelSize = u32(scene.kernelSize);
    for (var i = 0; i < kernelSize; i++) {
        var samplePos = TBN * scene.samples[i];
        samplePos = fragPos + samplePos * radius;

        var offset = vec4f(samplePos, 1.);
        offset = camera.projection * offset;
        offset.xyz /= offset.w;
        offset.xyz = vec3f(offset.xy * vec2f(.5, -.5) + .5, offset.z);

        let sampleDepth = textureSample(gPosition, offset.xy).z;
        let rangeCheck = smoothstep(0., 1., radius / abs(fragPos.z - sampleDepth));
        
        occlusion += (sampleDepth >= samplePos.z + bias ? 1. : 0.) * rangeCheck;
    }
    let _col = vec3f(1. - (occlusion / scene.kernelSize));

    return vec4f(_col, 1.);
}
`

export default ssaoShader