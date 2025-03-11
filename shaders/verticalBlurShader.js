// http://demofox.org/gauss.html

const verticalBlurShader = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@group(0) @binding(0) var<uniform> texelSize: f32;
@group(0) @binding(1) var map: texture_2d<f32>;
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

    _col += textureSample(map, mapSampler, vec2f(uv.x, uv.y - 4 * texelSize)) * 0.0002;
    _col += textureSample(map, mapSampler, vec2f(uv.x, uv.y - 3 * texelSize)) * 0.0060;
    _col += textureSample(map, mapSampler, vec2f(uv.x, uv.y - 2 * texelSize)) * 0.0606;
    _col += textureSample(map, mapSampler, vec2f(uv.x, uv.y - 1 * texelSize)) * 0.2417;
    _col += textureSample(map, mapSampler, uv) * 0.3829;
    _col += textureSample(map, mapSampler, vec2f(uv.x, uv.y - 1 * texelSize)) * 0.2417;
    _col += textureSample(map, mapSampler, vec2f(uv.x, uv.y + 2 * texelSize)) * 0.0606;
    _col += textureSample(map, mapSampler, vec2f(uv.x, uv.y + 3 * texelSize)) * 0.0060;
    _col += textureSample(map, mapSampler, vec2f(uv.x, uv.y + 4 * texelSize)) * 0.0002;

    return _col;
}
`

export default verticalBlurShader