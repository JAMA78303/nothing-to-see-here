// Shared scene kit: renderer, yard, soil layers, groundwater, house, props, captions.
// A scene module builds its own set pieces on top and calls start(renderAt).
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
export { THREE };

// cinematic look (soft contact shadows, glow, grading); ?fx=0 renders the plain version
const FX = new URLSearchParams(location.search).get("fx") !== "0";

const W = 1080, H = 1920;
export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
if (FX) {
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.2;
}
document.body.prepend(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = skyTexture();
scene.fog = new THREE.Fog(0xcfe8f7, 60, 140);

export const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 300);

// ---------- lights ----------
export const hemi = new THREE.HemisphereLight(0xdff1ff, 0x6b4a2b, 1.1);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(FX ? 0xfff0d8 : 0xffffff, 2.2);
sun.position.set(-12, 25, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, far: 80 });
scene.add(sun);

// ---------- textures ----------
export function canvasTex(w, h, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  return t;
}
function skyTexture() {
  return canvasTex(4, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    if (FX) {
      grad.addColorStop(0, "#4f9be0");
      grad.addColorStop(0.65, "#8cc4ee");
      grad.addColorStop(1, "#f3e9d8");               // warm haze at the horizon
    } else {
      grad.addColorStop(0, "#5aa9e6");
      grad.addColorStop(1, "#d6eefb");
    }
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
}
export function noisy(base, spots, n = 900, size = 6) {
  return (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      g.fillStyle = spots[i % spots.length];
      g.globalAlpha = 0.35 + Math.random() * 0.4;
      g.beginPath();
      g.ellipse(Math.random() * w, Math.random() * h, size * Math.random() + 1, size * Math.random() * 0.6 + 1, Math.random() * 3, 0, 7);
      g.fill();
    }
    g.globalAlpha = 1;
  };
}
const stripes = (g, w, h) => {
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? "#5fae3a" : "#78c24a";
    g.fillRect((i * w) / 8, 0, w / 8, h);
  }
};

// One cloned texture per box so the pattern keeps real-world scale.
export function mat(drawFn, scale, color) {
  return (sx, sy) => {
    const t = canvasTex(256, 256, drawFn, sx / scale, sy / scale);
    return new THREE.MeshLambertMaterial({ map: t, color: color ?? 0xffffff });
  };
}
export const solid = (color, emissive = 0) => () => new THREE.MeshLambertMaterial({ color, emissive });
export const M = {
  grass: mat(stripes, 16),
  topsoil: mat(noisy("#8a5a33", ["#6e4524", "#a6703f", "#5a381c"]), 3),
  clay: mat(noisy("#a8643a", ["#8c4f2b", "#c27a48", "#7a4223"]), 3),
  deep: mat(noisy("#6b4426", ["#5a381c", "#7d5230", "#4a2e17"]), 3),
  concrete: mat(noisy("#d9d6cf", ["#c7c3ba", "#e8e6e1"], 500, 4), 4),
};

// ---------- ground block: the front face (z = 0) is the cut-away ----------
export const GROUND_BOTTOM = -22;
export const WATER_TABLE = -4.2;
const layers = [
  { top: 0, bottom: -0.25, mat: M.grass },
  { top: -0.25, bottom: -2.4, mat: M.topsoil },
  { top: -2.4, bottom: WATER_TABLE, mat: M.clay },
  { top: WATER_TABLE, bottom: GROUND_BOTTOM, mat: M.deep },
];

export function box(x0, x1, y0, y1, z0, z1, matFn, parent = scene) {
  const sx = x1 - x0, sy = y1 - y0, sz = z1 - z0;
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), matFn(Math.max(sx, sz), sy));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
// a ground region is cut into horizontal soil layers
export function groundBox(x0, x1, y0, y1, z0, z1, parent = scene) {
  for (const L of layers) {
    const top = Math.min(y1, L.top), bot = Math.max(y0, L.bottom);
    if (top > bot) box(x0, x1, bot, top, z0, z1, L.mat, parent);
  }
}
// ground everywhere except a hole x0..x1, zBack..0 whose floor depth may vary: floors = [[x0, x1, depth], ...]
export function groundWithHole(x0, x1, zBack, floors) {
  groundBox(-24, x0, GROUND_BOTTOM, 0, -40, 0);
  groundBox(x1, 24, GROUND_BOTTOM, 0, -40, 0);
  groundBox(x0, x1, GROUND_BOTTOM, 0, -40, zBack);
  for (const [a, b, depth] of floors) groundBox(a, b, GROUND_BOTTOM, depth, zBack, 0);
  setGroundwaterRegions([[-24, x0, 0], [x1, 24, 0], ...floors]);
}

// ---------- groundwater: a front-face overlay, clipped so it can rise ----------
const waterClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), WATER_TABLE);
const gwTex = canvasTex(256, 256, noisy("#3f7fd8", ["#2f66bd", "#5b98e8", "#8fbdf3"], 1400, 9), 16, 6);
const gwMat = new THREE.MeshLambertMaterial({ map: gwTex, emissive: 0x0c2450, clippingPlanes: [waterClip] });
const groundwater = new THREE.Group();
groundwater.position.z = 0.02;
scene.add(groundwater);
// one plane per [x0, x1, top] column of soil, so the water never covers a hole in the cut face
function setGroundwaterRegions(regions) {
  groundwater.clear();
  for (const [x0, x1, top] of regions) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, top - GROUND_BOTTOM), gwMat);
    p.position.set((x0 + x1) / 2, (top + GROUND_BOTTOM) / 2, 0);
    // keep the texture at world scale and continuous across planes
    const uv = p.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (x0 + uv.getX(i) * (x1 - x0) + 24) / 48, (GROUND_BOTTOM + uv.getY(i) * (top - GROUND_BOTTOM) + 22) / 22);
    }
    groundwater.add(p);
  }
}
setGroundwaterRegions([[-24, 24, 0]]);
export function setWaterTable(top, t) {
  waterClip.constant = top;
  gwTex.offset.set(t * 0.02, Math.sin(t * 1.3) * 0.01);
}
export const waterMaterial = () => new THREE.MeshPhongMaterial({ color: 0x4fc3ec, transparent: true, opacity: 0.75, shininess: 80 });

// ---------- house ----------
export function house(cx, cz, w, scale = 1) {
  const g = new THREE.Group();
  const h = 6.2, d = 6;
  box(-w / 2, w / 2, 0, h, -d / 2, d / 2, solid(0xfaf7f0, 0x2a2a2a), g);
  const roofShape = new THREE.Shape([new THREE.Vector2(-d / 2 - 0.6, 0), new THREE.Vector2(d / 2 + 0.6, 0), new THREE.Vector2(0, 2.8)]);
  const roof = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roofShape, { depth: w + 1, bevelEnabled: false }),
    new THREE.MeshLambertMaterial({ map: canvasTex(64, 64, (c, cw, ch) => {
      c.fillStyle = "#d9612f"; c.fillRect(0, 0, cw, ch);
      c.fillStyle = "#b84c22"; for (let y = 0; y < ch; y += 8) c.fillRect(0, y, cw, 2);
    }, 4, 4) })
  );
  roof.rotation.y = Math.PI / 2;
  roof.position.set(-w / 2 - 0.5, h, 0);
  roof.castShadow = true;
  g.add(roof);
  box(w / 4, w / 4 + 0.9, h + 1, h + 3.2, -1, 0, solid(0x9c5a3c), g);
  const glass = solid(0x3b6fa8), frame = solid(0xffffff), shutter = solid(0x1f4f9a);
  const cols = Math.round(w / 2.6);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < cols; i++) {
      const x = -w / 2 + (i + 0.5) * (w / cols);
      const y = row ? 4.4 : 1.7;
      const isDoor = row === 0 && i === Math.floor(cols / 2);
      const ww = isDoor ? 1.8 : 1.1, wh = isDoor ? 2.4 : 1.4;
      const y0 = isDoor ? 0.05 : y - wh / 2;
      box(x - ww / 2 - 0.12, x + ww / 2 + 0.12, y0 - 0.12, y0 + wh + 0.12, d / 2, d / 2 + 0.05, frame, g);
      box(x - ww / 2, x + ww / 2, y0, y0 + wh, d / 2 + 0.05, d / 2 + 0.09, glass, g);
      if (!isDoor) {
        box(x - ww / 2 - 0.6, x - ww / 2 - 0.15, y0, y0 + wh, d / 2, d / 2 + 0.1, shutter, g);
        box(x + ww / 2 + 0.15, x + ww / 2 + 0.6, y0, y0 + wh, d / 2, d / 2 + 0.1, shutter, g);
      }
    }
  }
  g.position.set(cx, 0, cz);
  g.scale.setScalar(scale);
  scene.add(g);
  return g;
}

// ---------- props ----------
export function tree(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3), new THREE.MeshLambertMaterial({ color: 0x6b4a2b }));
  trunk.position.y = 1.5;
  g.add(trunk);
  for (const [dx, dy, dz, r] of [[0, 3.6, 0, 1.8], [1, 3.1, 0.4, 1.3], [-1, 3.2, -0.3, 1.4], [0.2, 4.5, 0, 1.2]]) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshLambertMaterial({ color: 0x3f8a3a, flatShading: true }));
    leaf.position.set(dx, dy, dz);
    g.add(leaf);
  }
  g.traverse(o => (o.castShadow = true));
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  scene.add(g);
  return g;
}

export function cloud(x, y, z, s) {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xc8c8c8 });
  for (const [dx, dy, r] of [[0, 0, 2], [2, -0.3, 1.5], [-2, -0.4, 1.6], [0.8, 1, 1.4]]) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m);
    p.position.set(dx, dy, 0);
    g.add(p);
  }
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  scene.add(g);
  return g;
}

export const arrowMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x888888 });
export const yellowArrowMat = new THREE.MeshLambertMaterial({ color: 0xffd400, emissive: 0x806a00 });
// an arrow pointing +y, base at its origin, 2 units long
export function arrow(material = arrowMat) {
  const a = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4), material);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 16), material);
  shaft.position.y = 0.7; head.position.y = 1.7;
  a.add(shaft, head);
  return a;
}

// ---------- pipes ----------
// above ground: a half pipe (back half only) so the water inside is visible
const pipeMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a6, side: THREE.DoubleSide });
export function halfPipe(a, b, r) {
  const d = b.clone().sub(a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 16, 1, true, Math.PI / 2, Math.PI), pipeMat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.rotation.z = Math.atan2(d.y, d.x) - Math.PI / 2;
  scene.add(m);
}
// below ground: drawn on the cut face, like a cross-section diagram
const pipeInside = new THREE.MeshBasicMaterial({ color: 0x2f3236 });
const pipeWall = new THREE.MeshLambertMaterial({ color: 0xa3a9ae });
export function pipeBand(points, r) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1], d = b.clone().sub(a), ang = Math.atan2(d.y, d.x);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(d.length(), 2 * r), pipeInside);
    inner.position.set(mid.x, mid.y, 0.02);
    inner.rotation.z = ang;
    scene.add(inner);
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(d.length() + 0.12, 0.12), pipeWall);
      edge.position.set(mid.x - Math.sin(ang) * side * r, mid.y + Math.cos(ang) * side * r, 0.03);
      edge.rotation.z = ang;
      scene.add(edge);
    }
    const joint = new THREE.Mesh(new THREE.CircleGeometry(r, 20), pipeInside);
    joint.position.set(b.x, b.y, 0.021);
    scene.add(joint);
  }
}


// ---------- flowing water: blobs that run along a path once it has been reached ----------
export const waterBlob = (color, emissive) => new THREE.MeshLambertMaterial({ color, emissive });
export function flow(points, count, material, r, lapTime) {
  const path = new THREE.CurvePath();
  for (let i = 0; i < points.length - 1; i++) path.add(new THREE.LineCurve3(points[i], points[i + 1]));
  const blobs = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r * (0.7 + Math.random() * 0.5), 10, 8), material);
    m.userData.phase = i / count;
    scene.add(m);
    blobs.push(m);
  }
  // since: seconds since the flow started (< 0 = not yet); stop: seconds since it should drain out
  return (since, stop = -1) => {
    for (const m of blobs) {
      const u = ((since / lapTime + m.userData.phase) % 1 + 1) % 1;
      const reached = since / lapTime >= u;               // first lap: only up to the front
      const drained = stop > 0 && stop / lapTime >= u;    // after stopping: empty from the top
      m.visible = since > 0 && reached && !drained;
      if (m.visible) m.position.copy(path.getPointAt(u));
    }
  };
}

// ---------- timeline helpers ----------
export const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Timing helpers bound to the loaded timing.json
export function timeline(TIMING, t) {
  const shots = TIMING.shots;
  let idx = shots.findIndex(s => t >= s.start && t < s.end);
  if (idx < 0) idx = t >= TIMING.duration ? shots.length - 1 : 0;
  const S = shots[idx];
  const at = n => shots.find(s => s.shot === n);
  return {
    // a cold open (replay) shot has no framing of its own, so the shot after it starts from "start"
    idx, shot: S.shot, prev: idx && !shots[idx - 1].replay ? shots[idx - 1].shot : "start",
    k: (t - S.start) / (S.end - S.start),
    prog: n => { const s = at(n); return (t - s.start) / (s.end - s.start); },
    since: n => t - at(n).start,
  };
}

// camera eases from the previous shot's framing into the current one's; returns the look target
export function moveCamera(cams, tl) {
  const from = cams[tl.prev], to = cams[tl.shot];
  const ck = ease(Math.min(1, tl.k / 0.7));
  camera.position.lerpVectors(from.pos, to.pos, ck);
  return from.look.clone().lerp(to.look, ck);
}

// ---------- captions: 1–2 words at a time, highlighted keywords ----------
const captionEl = document.getElementById("caption");
function chunks(words) {
  const out = [];
  const clean = s => s.word.replace(/\.\.\.$/, "");
  for (let i = 0; i < words.length; i++) {
    const w = words[i], next = words[i + 1];
    if (!w.hl && next && !next.hl && (clean(w) + clean(next)).length <= 9 && !/[.,]$/.test(w.word)) {
      out.push({ text: clean(w) + " " + clean(next), start: w.start, hl: false }); i++;
    } else out.push({ text: clean(w), start: w.start, hl: w.hl });
  }
  return out;
}
function setCaption(TIMING, t) {
  const shot = TIMING.shots.find(s => t >= s.start && t < s.end) || TIMING.shots.at(-1);
  let cur = null;
  for (const c of chunks(shot.words)) if (t >= c.start) cur = c;
  if (!cur || t > shot.speechEnd + 0.25) { captionEl.textContent = ""; return; }
  captionEl.textContent = cur.text.replace(/[.,!?]$/, "");
  captionEl.style.color = cur.hl ? "#ffd400" : "#fff";
  const dt = t - cur.start;
  const sc = dt < 0.08 ? 0.7 + (dt / 0.08) * 0.42 : Math.max(1, 1.12 - (dt - 0.08) * 1.2);
  captionEl.style.transform = `scale(${sc})`;
}

// Loads timing, exposes window.renderAt for the renderer, and draws the first frame.
// colour grade, vignette and a touch of film grain, applied after tone mapping
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
  vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = (c - 0.5) * 1.04 + 0.5;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, 0.92);
      c += vec3(-0.005, 0.0, 0.012) * (1.0 - smoothstep(0.0, 0.35, l));   // cool shadows; whites stay white
      vec2 d = (vUv - 0.5) * vec2(0.75, 1.0);
      c *= mix(0.8, 1.0, smoothstep(0.75, 0.3, length(d)));
      float n = fract(sin(dot(vUv * vec2(1080.0, 1920.0) + time, vec2(12.9898, 78.233))) * 43758.5453);
      c += (n - 0.5) * 0.02;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};
// scenes can switch off the heavier effects (e.g. ambient occlusion in empty space)
export const fxOptions = { ao: true, dof: null };   // dof: { focus, aperture, maxblur }
function makeComposer() {
  const target = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(1);
  composer.addPass(new RenderPass(scene, camera));
  if (fxOptions.ao) {
    const ao = new GTAOPass(scene, camera, W, H);
    ao.updateGtaoMaterial({ radius: 2.4, distanceExponent: 1.2, thickness: 2.5, scale: 1.6, samples: 12 });
    ao.blendIntensity = 1.0;
    composer.addPass(ao);
  }
  if (fxOptions.dof) composer.addPass(new BokehPass(scene, camera, fxOptions.dof));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.32, 0.55, 0.9));
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  return { render: t => { grade.uniforms.time.value = t % 10; composer.render(); } };
}

export async function start(draw) {
  const params = new URLSearchParams(location.search);
  const TIMING = await (await fetch(params.get("timing"))).json();
  window.duration = TIMING.duration;
  const flashEl = document.getElementById("flash");
  const composer = FX ? makeComposer() : null;
  window.renderAt = t => {
    // a cold-open shot replays a later moment ("replay": shot name, "from": fraction into it)
    const S = TIMING.shots.find(s => t >= s.start && t < s.end);
    let st = t;
    if (S?.replay) {
      const target = TIMING.shots.find(s => s.shot === S.replay);
      st = Math.min(TIMING.duration, target.start + (S.from ?? 0) * (target.end - target.start) + (t - S.start));
    }
    draw(st, timeline(TIMING, st));
    setCaption(TIMING, t);
    // white flash as the cold open cuts back to the start of the story
    const hook = TIMING.shots.find(s => s.replay);
    const dt = hook ? t - hook.end : 99;
    flashEl.style.opacity = dt > -0.08 && dt < 0.3 ? 0.9 * (1 - (dt < 0 ? -dt / 0.08 : dt / 0.3)) : 0;
    if (composer) composer.render(t); else renderer.render(scene, camera);
  };
  window.renderAt(Number(params.get("t") || 0));
  window.ready = true;
}
