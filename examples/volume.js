
const VS = `
  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) pfl: vec3f,
  }

  struct Camera {
    projectionMatrix: mat4x4<f32>,
    viewMatrix: mat4x4<f32>,
    lightMatrix: mat4x4<f32>,
  };

  @group(1) @binding(0) var<uniform> modelMatrix: mat4x4<f32>;
  // @group(1) @binding(1) var<uniform> normalMatrix: mat4x4<f32>;
  @group(2) @binding(0) var<uniform> camera: Camera;

  @vertex
  fn main(
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
  ) -> VertexOutput
  {
    var output: VertexOutput;
    let matrix = camera.projectionMatrix * camera.viewMatrix * modelMatrix;
    let transform = abs(position - 1.);
    let pfl = camera.lightMatrix * modelMatrix * vec4(position, 1.0);

    output.position = matrix * vec4f(position, 1.);
    // output.normal = (normalMatrix * vec4f(normal, 0.)).xyz;
    output.normal = normal;
    output.uv = uv;
    output.pfl = vec3f(pfl.xy * vec2f(.5, -.5) + vec2f(.5), pfl.z);
    return output;
  }
`

const FS = `
  @group(0) @binding(0) var<uniform> color: vec3f;
  @group(0) @binding(1) var shadowMap: texture_depth_2d;
  @group(0) @binding(2) var shadowSampler: sampler_comparison;

  struct VertexInput {
    @builtin(position) position: vec4f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) shadowPos: vec3f,
  }

  @fragment
  fn main(
    input: VertexInput,
  ) -> @location(0) vec4f
  {
    let shadowDepthTextureSize = 800.;
    var visibility = 0.0;
    let oneOverShadowDepthTextureSize = 1.0 / shadowDepthTextureSize;
    for (var y = -1; y <= 1; y++) {
      for (var x = -1; x <= 1; x++) {
        let offset = vec2f(vec2(x, y)) * oneOverShadowDepthTextureSize;

        visibility += textureSampleCompare(
          shadowMap, shadowSampler,
          input.shadowPos.xy + offset, input.shadowPos.z - 0.007
        );
      }
    }
    visibility /= 9.0;

    let lightPos = vec3f(-10, -10, -20);
    let ambientFactor = .3;
    let ld = normalize(lightPos - input.position.xyz);
    let ll = dot(ld, input.normal);

    let fc = vec3f(ll);
    return vec4f(input.normal, 1.);
  }
`

const FSS = `
  @group(0) @binding(0) var tex: texture_2d<f32>;
  @group(0) @binding(1) var sm: sampler;

  struct VertexInput {
    @builtin(position) position: vec4f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
  }

  @fragment
  fn main(
    input: VertexInput,
  ) -> @location(0) vec4f
  {
    // let color = textureSample(tex, sm, input.uv).rgb;
    let color = vec3f(.5);
    return vec4f(color, 1.);
  }
`

const QFS = `
  @group(0) @binding(0) var tex: texture_2d<f32>;
  @group(0) @binding(1) var sm: sampler;

  struct VertexInput {
    @builtin(position) position: vec4f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
  }

  @fragment
  fn main(
    input: VertexInput,
  ) -> @location(0) vec4f
  {
    // let color = textureSample(tex, sm, input.uv).rgb;
    let color = vec3f(.1, .6, .4);
    return vec4f(color, 1.);
  }
`

const FSS2 = `

  @group(0) @binding(0) var <uniform> time: f32;
  @group(0) @binding(1) var <uniform> boxMax: vec3f;
  @group(0) @binding(2) var <uniform> camPos: vec3f;
  @group(0) @binding(3) var bn: texture_2d<f32>;
  @group(0) @binding(4) var wn: texture_3d<f32>;
  @group(0) @binding(5) var sm: sampler;

  struct VertexInput {
    @builtin(position) position: vec4f,
    @location(1) uv: vec2f,
  }

  fn intersectAABB(
   rayOrigin: vec3f,
   rayDir: vec3f,
   boxMin: vec3f,
   boxMax: vec3f,
  ) -> vec2f
  {
    let tMin = (boxMin - rayOrigin) / rayDir;
    let tMax = (boxMax - rayOrigin) / rayDir;
    let t1 = min(tMin, tMax);
    let t2 = max(tMin, tMax);
    let tNear = max(max(t1.x, t1.y), t1.z);
    let tFar = min(min(t2.x, t2.y), t2.z);
    return vec2f(tNear, tFar);
  }

  fn insideAABB(
    p: vec3f,
    boxMin: vec3f,
    boxMax: vec3f,
  ) -> u32
  {
    if (
      p.x < boxMin.x ||
      p.x > boxMax.x ||
      p.y < boxMin.y ||
      p.y > boxMax.y ||
      p.z < boxMin.z ||
      p.z > boxMax.z
    ) {return 0;}
    return 1;
  }

  fn calcRayDir(
    camPos: vec3f,
    lookAt: vec3f,
    uv: vec2f
  ) -> vec3f
  {
    let cd = normalize(lookAt - camPos);
    let cr = normalize(cross(vec3f(0., 1., 0.), cd));
    let cu = normalize(cross(cd, cr));

    return mat3x3(-cr, cu, -cd) * normalize(vec3f(uv, -1.));
  }

  fn rand3(
    p: vec3f
  ) -> vec3f
  {
    return fract(
      sin(
        vec3f(
          dot(p,vec3f(127.1,311.7,78.233)),
          dot(p,vec3f(311.9,281.8,12.9898)),
          dot(p,vec3f(269.5,183.3,54.1085))
        )
      )*43758.5453);
  }

  fn worley(
    st: vec3f,
  ) -> f32
  {
    let fl = floor(st);
    let fr = fract(st);
    var mDist = 1.;

    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        for (var k = -1; k <= 1; k++) {
          let n = vec3f(f32(i), f32(j), f32(k));
          let p = rand3(fl + n);
          let d = n + p - fr;
          let dist = length(d);
          mDist = min(mDist, dist);
        }  
      }
    }

    return mDist;
  }
  
  fn raymarch(
    ro: vec3f,
    rd: vec3f,
    near: f32,
    far: f32,
    offset: f32,
  ) -> f32
  {
    var accDist = 0.;
    var t = 1.;
    let step = 1.;

    for (var i = 0; i < 64; i++) {
      let p = ro + rd * accDist;
      let inside = insideAABB(p, -boxMax, boxMax);

      let nl = 1.-textureSample(wn, sm, (p + boxMax) * .08).r;
      let nh = 1.-textureSample(wn, sm, (p + boxMax) * .08).g;
      var n = nh;  
      n = smoothstep(0.4, 1., n);

      t *= exp(-step * 3. * n * f32(inside));
      accDist += step * offset;
    }

    return t;
  }

  @fragment
  fn main(
    input: VertexInput,
  ) -> @location(0) vec4f
  {
    var color = vec3f(0);
    let offset = textureSample(bn, sm, input.uv*10.).r;

    let ro = camPos;
    let rd = calcRayDir(ro, vec3f(0.), abs(input.uv - 1.)-.5);
    let it = intersectAABB(ro, rd, -boxMax, boxMax);
    let d = raymarch(ro, rd, it.x, it.y, offset);
    color += 1.-d;

    return vec4f(color, 1.);
  }
`

const CS = `
  @group(0) @binding(0) var tex: texture_storage_3d<bgra8unorm, write>;

  fn rotate(
    a: f32
  ) -> mat2x2f
  {
    let s = sin(a);
    let c = cos(a);
    return mat2x2f(
      c, -s, s, c
    );
  }

  fn rand3(
    p: vec3f
  ) -> vec3f
  {
    return fract(
      sin(
        vec3f(
          dot(p,vec3f(127.1,311.7,78.233)),
          dot(p,vec3f(311.9,281.8,12.9898)),
          dot(p,vec3f(269.5,183.3,54.1085))
        )
      )*43758.5453);
  }

  fn worley(
    st: vec3f,
  ) -> f32
  {
    let fl = floor(st);
    let fr = fract(st);
    var mDist = 1.;

    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        for (var k = -1; k <= 1; k++) {
          let n = vec3f(f32(i), f32(j), f32(k));
          let p = rand3(fl + n);
          let d = n + p - fr;
          let dist = length(d);
          mDist = min(mDist, dist);
        }  
      }
    }

    return mDist;
  }

  @compute @workgroup_size(4, 4, 4)
  fn compute_texture(
    @builtin(global_invocation_id) id: vec3u,
  )
  {
    let uvw = id;
    let str = vec3f(uvw) / 256.;

    let wa = worley(str*8.);
    let wb = worley(str*16.) * .5;
    let wc = worley(str*32.) * .25;
    let wd = worley(str*64.) * .125;
    let ww = (wa + wb + wc + wd) / 2.;

    let color = vec3f(wa, ww, 0.);

    textureStore(tex, uvw, vec4f(color, 1.));
  }
`

export { VS, FS, CS, FSS, QFS }