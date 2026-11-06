// Ink outlines for the 3D world. Shaders and values from mromidev/claude-animated-shorts (MIT); pass ported to three's EffectComposer.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import * as THREE from "three";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";
const NOINK = 3;
const DEF = {
  // round 2 (reviewer: "world outlines ~1.5x thicker, pure black on every silhouette"): widths x1.5 (creases follow
  // via creaseScale), pure near-black, far opacity 0.75 -> 0.95; fog tint of the ink 0.6 -> 0.3 (compMat fogInk)
  color: "#030303",
  strength: 1,
  widthNear: 5.1,
  widthFar: 3.3,
  distNear: 6,
  distFar: 90,
  creaseScale: 0.8,
  // round 3: creases 0.64 -> 0.8 (building corners)
  depthLo: 0.01,
  depthHi: 0.03,
  angleLo: 35,
  angleHi: 50,
  concaveGain: 0.7,
  // depth jumps from 1 %; creases from 35 deg (roof eaves)
  farOpacity: 0.95,
  fadeNear: 150,
  fadeFar: 450
};
const FS_VERT = (
  /* glsl */
  `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
);
const NORMAL_VERT = (
  /* glsl */
  `
#include <common>
uniform mat3 cutUv;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  vN = transformedNormal;
  vCut = (cutUv * vec3(uv, 1.0)).xy;
  #include <begin_vertex>
  #include <project_vertex>
  vV = mvPosition.xyz;
}`
);
const NORMAL_FRAG = (
  /* glsl */
  `
uniform sampler2D tCut;
uniform float cut;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  if (cut > 0.0 && texture2D(tCut, vCut).a < cut) discard;
  vec3 n;
  if (dot(vN, vN) < 1e-8) n = normalize(cross(dFdx(vV), dFdy(vV)));   // geometry without normals
  else n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);            // back faces of double-sided planes
  gl_FragColor = vec4(n, 1.0);
}`
);
const MASK_FRAG = (
  /* glsl */
  `
#include <packing>
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform sampler2D tMainDepth;
uniform vec2 texel;
uniform float cNear;
uniform float cFar;
uniform float p00;
uniform float p11;
uniform float wNear;
uniform float wFar;
uniform float dNear;
uniform float dFar;
uniform float creaseScale;
uniform float depthLo;
uniform float depthHi;
uniform float cosLo;
uniform float cosHi;
uniform float concaveGain;
uniform float farOpacity;
uniform float fadeNear;
uniform float fadeFar;
uniform float strength;
uniform float useMain;
uniform float pxScale;   // output px per 1080x1920 px
uniform vec2 fogRange;   // scene fog near / far (m); far <= near = no fog tint
uniform float fogStart;  // ink stays pure black up to here (m), then tints toward the fog colour
varying vec2 vUv;

// pixel steps along x, y and both diagonals, and their length in px
const vec2 STEP[4] = vec2[4](vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, -1.0));
const float SLEN[4] = float[4](1.0, 1.0, 1.41421, 1.41421);
#define RMAX 9   // covers 5.1 px x pxScale 1.333 = 6.8 px at 1440x2560 (+0.5 AA ramp)

// textureLod: explicit LOD inside loops (nearest-filtered targets, no derivatives needed)
float dist(sampler2D t, vec2 uv) { return -perspectiveDepthToViewZ(textureLod(t, uv, 0.0).x, cNear, cFar); }
vec3 viewPos(vec2 uv, float d) { vec2 n = uv * 2.0 - 1.0; return vec3(n.x * d / p00, n.y * d / p11, -d); }

// crease strength between this pixel (n0, P0) and a neighbour
float crease(vec3 n0, vec3 P0, float zc, vec2 uq, float zq) {
  vec4 nq = textureLod(tNormal, uq, 0.0);
  if (nq.a < 0.5 || abs(zq - zc) > zc * depthLo) return 0.0;       // sky / depth jump: not a crease
  float k = 1.0 - smoothstep(cosHi, cosLo, dot(n0, nq.xyz));
  if (dot(viewPos(uq, zq) - P0, n0) > 0.0) k *= concaveGain;        // neighbour in front of our tangent plane: concave
  return k;
}

void main() {
  vec4 nc = textureLod(tNormal, vUv, 0.0);
  if (nc.a < 0.5) { gl_FragColor = vec4(0.0); return; }          // sky / empty: ink lives on the near object only
  float zc = dist(tDepth, vUv);

  // characters, cards etc. (not in the world buffer) in front of this pixel: no world ink over them
  if (useMain > 0.5) {
    float zm = dist(tMainDepth, vUv);
    zm = min(zm, dist(tMainDepth, vUv + vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv + vec2(0.0, texel.y)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(0.0, texel.y)));
    if (zm < zc * 0.985 - 0.03) { gl_FragColor = vec4(0.0); return; }
  }

  float t = clamp(log(zc / dNear) / log(dFar / dNear), 0.0, 1.0);
  float w = mix(wNear, wFar, t) * pxScale;           // silhouette line width (output px) at this distance, near side only
  float hc = 0.5 * w * creaseScale;                  // crease line half width (px), drawn on both faces
  float Wc = 1.0 / zc;
  vec3 n0 = nc.xyz;
  vec3 P0 = viewPos(vUv, zc);
  float eD = 0.0, eN = 0.0;
  for (int a = 0; a < 4; a++) {
    for (int r = 1; r <= RMAX; r++) {
      vec2 o = STEP[a] * texel * float(r);
      float d = (float(r) - 0.5) * SLEN[a];          // distance of this pixel's centre to an edge first seen at r
      float cw = clamp(w + 0.5 - d, 0.0, 1.0);       // continuous coverage -> no width popping, built-in AA
      float ch = clamp(hc + 0.5 - d, 0.0, 1.0);
      if (cw <= 0.0 && ch <= 0.0) break;
      float z1 = dist(tDepth, vUv - o), z2 = dist(tDepth, vUv + o);
      // depth jump: this pixel is in front of its neighbours (2nd difference of 1/z < 0; exactly 0 on planes)
      float s = (1.0 / z1 + 1.0 / z2 - 2.0 * Wc) / Wc;
      eD = max(eD, smoothstep(depthLo, depthHi, -s) * cw);
      // crease: normal turns towards a neighbour at the same depth
      if (ch > 0.0) eN = max(eN, max(crease(n0, P0, zc, vUv - o, z1), crease(n0, P0, zc, vUv + o, z2)) * ch);
    }
  }

  float ink = max(eD, eN) * strength * mix(1.0, farOpacity, t) * (1.0 - smoothstep(fadeNear, fadeFar, zc));
  float f0 = max(fogRange.x, fogStart);
  float fogK = fogRange.y > f0 ? clamp((zc - f0) / (fogRange.y - f0), 0.0, 1.0) : 0.0;
  gl_FragColor = vec4(ink, fogK, 0.0, 1.0);
}`
);
const COMP_FRAG = (
  /* glsl */
  `
uniform sampler2D inputBuffer;
uniform sampler2D tMask;
uniform sampler2D tNormal;
uniform vec2 texel;
uniform vec3 inkColor;
uniform vec3 fogColor;
uniform float fogInk;   // how far fully fogged ink moves toward the fog colour (0.3)
uniform int debug;
varying vec2 vUv;
float m(float x, float y) { return texture2D(tMask, vUv + vec2(x, y) * texel).r; }
void main() {
  float a = (4.0 * m(0.0, 0.0)
    + 2.0 * (m(1.0, 0.0) + m(-1.0, 0.0) + m(0.0, 1.0) + m(0.0, -1.0))
    + m(1.0, 1.0) + m(-1.0, 1.0) + m(1.0, -1.0) + m(-1.0, -1.0)) / 16.0;   // 1-2-1 tent = anti-aliasing
  vec4 c = texture2D(inputBuffer, vUv);
  if (debug == 1) { gl_FragColor = vec4(vec3(1.0 - a), 1.0); return; }               // mask only
  if (debug == 2) { gl_FragColor = vec4(texture2D(tNormal, vUv).xyz * 0.5 + 0.5, 1.0); return; } // world normals
  // blend in display (gamma) space like Canvas2D does for the character drawings: coverage -> darkness is linear
  // on screen, so the measured line widths equal the coverage widths (a linear-light blend reads ~30 % thinner)
  float fk = texture2D(tMask, vUv).g;                       // fog amount of the line (max over the AA footprint)
  fk = max(fk, max(texture2D(tMask, vUv + vec2(texel.x, 0.0)).g, texture2D(tMask, vUv - vec2(texel.x, 0.0)).g));
  fk = max(fk, max(texture2D(tMask, vUv + vec2(0.0, texel.y)).g, texture2D(tMask, vUv - vec2(0.0, texel.y)).g));
  vec3 inkC = mix(inkColor, fogColor, fk * fogInk);
  vec3 g = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(pow(mix(g, pow(inkC, vec3(1.0 / 2.2)), a), vec3(2.2)), c.a);
}`
);
const COPY_FRAG = (
  /* glsl */
  `
uniform sampler2D tSrc;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(tSrc, vUv);
  #include <colorspace_fragment>
}`
);

// Ported for three's EffectComposer (the original extends the "postprocessing" library's Pass). Same three steps:
// world-only normals + depth -> edge mask -> composite ink over the frame. Character cards (layer NOINK) are rendered
// into their own depth buffer so world lines never draw across a character standing in front of them.
class InkPass extends Pass {
  constructor(scene, camera, options = {}) {
    super();
    const o = { ...DEF, ...options };
    this.world = scene; this.cam = camera; this.debug = 0;
    this.cam.layers.enable(NOINK);
    this.needsSwap = true;
    const rtOpts = (depth) => ({ type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      generateMipmaps: false, depthBuffer: true, samples: 0, depthTexture: depth ? new THREE.DepthTexture(1, 1, THREE.UnsignedIntType) : undefined });
    this.rt = new THREE.WebGLRenderTarget(1, 1, rtOpts(true));
    this.cardRT = new THREE.WebGLRenderTarget(1, 1, rtOpts(true));
    this.maskRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: false });
    this.normalMat = new THREE.ShaderMaterial({ vertexShader: NORMAL_VERT, fragmentShader: NORMAL_FRAG, side: THREE.DoubleSide,
      uniforms: { tCut: { value: null }, cut: { value: 0 }, cutUv: { value: new THREE.Matrix3() } } });
    const fs = (fragmentShader, uniforms) => new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    const texel = new THREE.Vector2(1, 1);
    this.maskMat = fs(MASK_FRAG, {
      tNormal: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, tMainDepth: { value: this.cardRT.depthTexture },
      texel: { value: texel }, cNear: { value: 0.2 }, cFar: { value: 1500 }, p00: { value: 1 }, p11: { value: 1 },
      wNear: { value: o.widthNear }, wFar: { value: o.widthFar }, dNear: { value: o.distNear }, dFar: { value: o.distFar },
      creaseScale: { value: o.creaseScale }, depthLo: { value: o.depthLo }, depthHi: { value: o.depthHi },
      cosLo: { value: Math.cos(o.angleLo * Math.PI / 180) }, cosHi: { value: Math.cos(o.angleHi * Math.PI / 180) },
      concaveGain: { value: o.concaveGain }, farOpacity: { value: o.farOpacity }, fadeNear: { value: o.fadeNear }, fadeFar: { value: o.fadeFar },
      strength: { value: o.strength }, useMain: { value: 1 }, pxScale: { value: 1 }, fogRange: { value: new THREE.Vector2(0, 0) }, fogStart: { value: 60 },
    });
    this.compMat = fs(COMP_FRAG, { inputBuffer: { value: null }, tMask: { value: this.maskRT.texture }, tNormal: { value: this.rt.texture },
      texel: { value: texel }, inkColor: { value: new THREE.Color(o.color) }, debug: { value: 0 }, fogColor: { value: new THREE.Color() }, fogInk: { value: 0.3 } });
    this.fsq = new FullScreenQuad(this.maskMat);
  }
  setSize(width, height) {
    for (const t of [this.rt, this.cardRT, this.maskRT]) t.setSize(width, height);
    this.maskMat.uniforms.texel.value.set(1 / width, 1 / height);
    this.maskMat.uniforms.pxScale.value = height / 1920;
  }
  render(renderer, writeBuffer, readBuffer) {
    const scene = this.world, cam = this.cam, mask = cam.layers.mask, override = scene.overrideMaterial, bg = scene.background;
    const autoClear = renderer.autoClear, shadowAuto = renderer.shadowMap.autoUpdate, clear = new THREE.Color(), alpha = renderer.getClearAlpha();
    renderer.getClearColor(clear); renderer.autoClear = false; renderer.shadowMap.autoUpdate = false;
    scene.background = null; renderer.setClearColor(0x000000, 0);
    // 1) world-only normals + depth
    cam.layers.disable(NOINK); scene.overrideMaterial = this.normalMat;
    renderer.setRenderTarget(this.rt); renderer.clear(true, true, false); renderer.render(scene, cam);
    // 2) character cards' depth (their own alpha-tested materials)
    cam.layers.set(NOINK); scene.overrideMaterial = null;
    renderer.setRenderTarget(this.cardRT); renderer.clear(true, true, false); renderer.render(scene, cam);
    cam.layers.mask = mask; scene.overrideMaterial = override; scene.background = bg;
    renderer.shadowMap.autoUpdate = shadowAuto; renderer.setClearColor(clear, alpha);
    // 3) edge mask
    const u = this.maskMat.uniforms, e = cam.projectionMatrix.elements;
    u.cNear.value = cam.near; u.cFar.value = cam.far; u.p00.value = e[0]; u.p11.value = e[5];
    const fog = scene.fog;
    if (fog && fog.isFog) { u.fogRange.value.set(fog.near, fog.far); this.compMat.uniforms.fogColor.value.copy(fog.color); } else u.fogRange.value.set(0, 0);
    this.fsq.material = this.maskMat; renderer.setRenderTarget(this.maskRT); this.fsq.render(renderer);
    // 4) composite onto the frame
    this.compMat.uniforms.inputBuffer.value = readBuffer.texture; this.compMat.uniforms.debug.value = this.debug;
    this.fsq.material = this.compMat; renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.fsq.render(renderer);
    renderer.autoClear = autoClear;
  }
}
export { InkPass, NOINK };
