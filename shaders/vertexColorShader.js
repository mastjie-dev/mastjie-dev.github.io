const unlitShader = `
struct VSOutput {
    @builtin(position) position: vec4f,
    @location(1) color: vec3f,
};

struct Material {
    dummy: f32,
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

@group(0) @binding(0) var<uniform> material: Material;
@group(1) @binding(0) var<uniform> scene: Scene;
@group(2) @binding(0) var<uniform> camera: Camera;
@group(3) @binding(0) var<uniform> model: Model;

@vertex fn main_vertex(
    @location(0) position: vec3f,
    @location(1) color: vec3f,
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
    return vec4f(input.color, 1.);
}
`

export default unlitShader