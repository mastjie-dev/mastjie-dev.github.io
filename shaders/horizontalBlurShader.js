// http://demofox.org/gauss.html

const horizontalBlurShader = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@group(0) @binding(0) var<uniform> texelSize: f32;
@group(0) @binding(1) var tDiffuse: texture_2d<f32>;
@group(0) @binding(2) var mapSampler: sampler;

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
    let uv = input.uv;
    var _col = vec4f(0.);

    _col += textureSample(tDiffuse, mapSampler, vec2f(uv.x - 4 * texelSize, uv.y)) * 0.0002;
    _col += textureSample(tDiffuse, mapSampler, vec2f(uv.x - 3 * texelSize, uv.y)) * 0.0060;
    _col += textureSample(tDiffuse, mapSampler, vec2f(uv.x - 2 * texelSize, uv.y)) * 0.0606;
    _col += textureSample(tDiffuse, mapSampler, vec2f(uv.x - 1 * texelSize, uv.y)) * 0.2417;
    _col += textureSample(tDiffuse, mapSampler, uv) * 0.3829;
    _col += textureSample(tDiffuse, mapSampler, vec2f(uv.x - 1 * texelSize, uv.y)) * 0.2417;
    _col += textureSample(tDiffuse, mapSampler, vec2f(uv.x + 2 * texelSize, uv.y)) * 0.0606;
    _col += textureSample(tDiffuse, mapSampler, vec2f(uv.x + 3 * texelSize, uv.y)) * 0.0060;
    _col += textureSample(tDiffuse, mapSampler, vec2f(uv.x + 4 * texelSize, uv.y)) * 0.0002;

    return _col;
}
`

export default horizontalBlurShader