// https://64.github.io/tonemapping/

const tonemapShader = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@group(0) @binding(0) var<uniform> texelSize: f32;
@group(0) @binding(1) var map: texture_2d<f32>;
@group(0) @binding(2) var mapSampler: sampler;

fn aces_approx(col: vec3f) -> vec3f
{
    let v =  col * 0.6f;
    let a = 2.51;
    let b = 0.03;
    let c = 2.43;
    let d = 0.59;
    let e = 0.14;
    return clamp((v*(a*v+b))/(v*(c*v+d)+e), vec3f(0.0), vec3f(1.0));
}

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
    input: VSOutput,
)
    -> @location(0) vec4f 
{
    var _col = vec4f(aces_approx(textureSample(map, mapSampler, input.uv).rgb), 1.);
    return _col;
}
`

/**
 --enable-features=Vulkan
 --enable-features=SkiaGraphite
  (and skia_use_dawn = true GN arg) 
 */

export default tonemapShader