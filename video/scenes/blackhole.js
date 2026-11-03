// "What happens if you fall into a black hole": a ray-traced black hole (light bent by gravity,
// glowing accretion disk, starfield) behind a stylised astronaut who gets stretched and reddened.
import { THREE, scene, camera, renderer, sun, hemi, setWaterTable, ease, lerp, V, moveCamera, start } from "./kit.js";

// space, not a back yard
scene.background = new THREE.Color(0x000000);
scene.fog = null;
hemi.intensity = 0.12;
setWaterTable(-1000, 0);

// ---------- the black hole: a full-screen ray tracer (Schwarzschild radius = 1, at the origin) ----------
const bhUniforms = {
  uCamPos: { value: new THREE.Vector3() },
  uCamMatrix: { value: new THREE.Matrix4() },
  uInvProj: { value: new THREE.Matrix4() },
  uTime: { value: 0 },
  uDiskGain: { value: 1 },
};
const bh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: bhUniforms,
  depthTest: false, depthWrite: false,
  vertexShader: `varying vec2 vNdc; void main() { vNdc = position.xy; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
  fragmentShader: `
    uniform vec3 uCamPos; uniform mat4 uCamMatrix; uniform mat4 uInvProj; uniform float uTime; uniform float uDiskGain;
    varying vec2 vNdc;
    float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      float a = hash(vec3(i, 1.0)), b = hash(vec3(i + vec2(1, 0), 1.0)), c = hash(vec3(i + vec2(0, 1), 1.0)), d = hash(vec3(i + vec2(1, 1), 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; } return v; }
    vec3 stars(vec3 d) {
      vec3 col = vec3(0.0);
      // four layers, from a dense haze of faint stars to a few bright ones with glow and sparkle
      for (int k = 0; k < 4; k++) {
        float scale = k == 0 ? 120.0 : k == 1 ? 260.0 : k == 2 ? 520.0 : 1000.0;
        float thresh = k == 0 ? 0.975 : k == 1 ? 0.95 : k == 2 ? 0.9 : 0.82;
        vec3 p = d * scale, cell = floor(p);
        for (int n = 0; n < 2; n++) {                       // also check the neighbouring cell along the view
          vec3 cc = cell + (n == 0 ? vec3(0.0) : sign(p - cell - 0.5));
          float h = hash(cc);
          if (h <= thresh) continue;
          vec3 c = normalize(cc + vec3(hash(cc + 1.3), hash(cc + 2.7), hash(cc + 4.1))) * scale;   // on the sky sphere
          vec3 off = p - c;
          float dist = length(off);
          float b = (h - thresh) / (1.0 - thresh);
          float size = k == 0 ? 0.32 : k == 1 ? 0.26 : 0.22;
          float twinkle = 0.85 + 0.15 * sin(uTime * (2.0 + 5.0 * hash(cc + 7.0)) + h * 40.0);
          float core = smoothstep(size, 0.0, dist) * b;
          float bright = k == 0 ? 4.0 : k == 1 ? 2.2 : k == 2 ? 1.3 : 0.7;
          vec3 tint = mix(vec3(0.62, 0.74, 1.0), vec3(1.0, 0.8, 0.58), hash(cc + 9.0));
          col += core * bright * twinkle * tint;
          if (k == 0) {
            col += exp(-dist * 3.0) * b * 0.5 * tint;                     // soft glow
            if (b > 0.55) {                                               // four-point sparkle on the brightest
              vec3 u = normalize(cross(d, vec3(0.0, 1.0, 0.0)));
              vec3 v = cross(d, u);
              float x = abs(dot(off, u)), y = abs(dot(off, v));
              float spike = exp(-x * 14.0) * exp(-y * 1.6) + exp(-y * 14.0) * exp(-x * 1.6);
              col += spike * (b - 0.55) * 2.2 * twinkle * tint;
            }
          }
        }
      }
      // a Milky Way band: dusty glow along a great circle
      vec3 axis = normalize(vec3(0.35, 1.0, 0.2));
      float band = exp(-pow(dot(d, axis) / 0.14, 2.0));
      float dust = fbm(vec2(atan(d.z, d.x) * 6.0, d.y * 9.0));
      float clouds = fbm(vec2(atan(d.z, d.x) * 14.0, d.y * 20.0) + 3.0);
      col += band * (vec3(0.025, 0.022, 0.035) * (0.3 + clouds) * smoothstep(0.4, 0.85, dust) + vec3(0.006, 0.005, 0.006) * clouds);
      col += vec3(0.03, 0.012, 0.05) * smoothstep(0.65, 0.95, fbm(d.xy * 2.5 + d.z)) * 0.5;
      return col;
    }
    vec3 diskCol(float t) {          // black-body-ish ramp: deep red -> orange -> white
      return mix(mix(vec3(0.65, 0.12, 0.02), vec3(1.0, 0.5, 0.12), smoothstep(0.0, 0.45, t)), vec3(1.0, 0.93, 0.82), smoothstep(0.45, 1.0, t));
    }
    // emission of the disk at a point near the y = 0 plane
    vec3 disk(vec3 hit, vec3 rayDir, out float alpha) {
      float r = length(hit.xz);
      float inner = 2.6, outer = 16.0;
      float edge = smoothstep(inner - 0.1, inner + 0.35, r) * pow(1.0 - smoothstep(inner, outer, r), 1.6);
      float phi = atan(hit.z, hit.x);
      float spin = uTime * 2.4 / pow(r, 1.5);
      float a = phi + spin;
      // domain-warped turbulence, stretched along the orbit into filaments
      vec2 q = vec2(r * 2.2, a * 2.0);
      vec2 w = vec2(fbm(q + vec2(0.0, uTime * 0.05)), fbm(q + vec2(5.2, 1.3)));
      float gas = fbm(vec2(r * 3.0 + w.x * 2.5, a * 7.0 + w.y * 3.0));
      float fil = fbm(vec2(r * 14.0 + gas * 3.0, a * 2.5));
      float clumps = pow(fbm(vec2(r * 1.3, a * 5.0 - uTime * 0.2)), 2.2) * 2.0;
      float dens = edge * (0.15 + 0.7 * gas + 1.1 * pow(fil, 1.6) + clumps);
      // Doppler: approaching side brighter and bluer, receding side dimmer and redder
      vec3 orbit = normalize(vec3(-hit.z, 0.0, hit.x));
      float beta = 0.38 / sqrt(r / inner);
      float dop = 1.0 / (1.0 - beta * dot(orbit, -rayDir));
      dop = clamp(dop, 0.5, 1.8);
      float gred = sqrt(clamp(1.0 - 1.0 / r, 0.0, 1.0));       // gravitational redshift near the hole
      float temp = clamp(pow(inner / r, 0.9) * dop * gred * 1.05, 0.0, 1.4);
      vec3 col = diskCol(min(temp, 1.0));
      col = mix(col, vec3(0.75, 0.85, 1.0), smoothstep(1.05, 1.4, temp) * 0.6);   // blue-white where it's hottest
      float I = dens * pow(dop, 2.2) * gred * pow(inner / r, 1.35) * 1.7 * uDiskGain;
      alpha = clamp(dens * 0.85, 0.0, 0.96);
      return col * I;
    }
    void main() {
      vec4 v = uInvProj * vec4(vNdc, 1.0, 1.0);
      vec3 dir = normalize((uCamMatrix * vec4(v.xyz / v.w, 0.0)).xyz);
      vec3 pos = uCamPos, vel = dir;
      vec3 hcross = cross(pos, vel);
      float h2 = dot(hcross, hcross);
      vec3 col = vec3(0.0); float trans = 1.0; bool absorbed = false;
      for (int i = 0; i < 480; i++) {
        float r = length(pos);
        if (r < 1.0) { absorbed = true; break; }
        if (r > 80.0) break;
        float dt = clamp(0.045 * r * smoothstep(0.9, 3.0, r) + 0.012, 0.012, 1.1);
        vec3 prev = pos;
        vel += -1.5 * h2 * pos / pow(r, 5.0) * dt;   // light bending around a Schwarzschild black hole
        pos += vel * dt;
        // soft glowing haze hugging the disk (hot gas above and below the plane)
        float rr = length(pos.xz);
        float haze = exp(-pow(pos.y / (0.12 + 0.035 * rr), 2.0)) * smoothstep(2.4, 3.2, rr) * (1.0 - smoothstep(4.0, 15.0, rr));
        col += trans * diskCol(pow(2.6 / max(rr, 2.6), 0.8)) * haze * dt * 0.035 * uDiskGain / max(rr * 0.25, 0.6);
        if (prev.y * pos.y < 0.0) {
          vec3 hit = mix(prev, pos, prev.y / (prev.y - pos.y));
          float a; vec3 c = disk(hit, normalize(vel), a);
          col += trans * c; trans *= 1.0 - a;
          if (trans < 0.02) break;
        }
      }
      if (!absorbed) col += trans * stars(normalize(vel));
      gl_FragColor = vec4(col, 1.0);
    }`,
}));
bh.frustumCulled = false;
bh.renderOrder = -1;
scene.add(bh);

// ---------- astronaut: a detailed suit built from primitives ----------
// reflections for the visor and suit: a dark sky with the disk's orange glow around the horizon
const envTex = (() => {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 512, 256);
  const band = g.createLinearGradient(0, 96, 0, 160);
  band.addColorStop(0, "rgba(255,150,60,0)"); band.addColorStop(0.5, "rgba(255,190,110,1)"); band.addColorStop(1, "rgba(255,120,40,0)");
  g.fillStyle = band; g.fillRect(0, 96, 512, 64);
  g.fillStyle = "#fff";
  for (let i = 0; i < 260; i++) g.fillRect(Math.random() * 512, Math.random() * 256, 1, 1);
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.PMREMGenerator(renderer).fromEquirectangular(t).texture;
})();
const astroMats = [];
const mat = (color, opts = {}) => {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.0, envMap: envTex, envMapIntensity: 0.6, ...opts });
  m.userData.base = m.color.clone();
  m.userData.baseEmissive = m.emissive.clone();
  astroMats.push(m);
  return m;
};
const suit = mat(0xf1f1ee, { roughness: 0.7 });
const seam = mat(0xd9d9d4, { roughness: 0.75 });
const metal = mat(0xb9bec4, { roughness: 0.35, metalness: 0.8, envMapIntensity: 1.0 });
const dark = mat(0x5d6168, { roughness: 0.6 });
const stripe = mat(0xc8302b, { roughness: 0.6 });
const visorMat = mat(0xffc66e, { roughness: 0.06, metalness: 1.0, envMapIntensity: 2.2, emissive: 0x2a1400 });
const lightMats = [0xff3b30, 0x34c759, 0x0a84ff, 0xffd60a].map(c => mat(c, { emissive: c, emissiveIntensity: 1.6 }));

const astro = new THREE.Group();
const body = new THREE.Group();
astro.add(body);
const add = (geo, m, x, y, z, parent = body, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
};
// torso, waist, chest panel with lights
add(new THREE.CapsuleGeometry(0.4, 0.5, 8, 20), suit, 0, 0.3, 0).scale.set(1.05, 1, 0.8);
add(new THREE.TorusGeometry(0.36, 0.05, 10, 28), seam, 0, -0.08, 0, body, Math.PI / 2).scale.set(1.05, 0.8, 1);
add(new THREE.SphereGeometry(0.4, 20, 14), suit, 0, -0.28, 0).scale.set(1.0, 0.7, 0.8);
add(new THREE.BoxGeometry(0.42, 0.26, 0.1), dark, 0, 0.4, 0.33);
lightMats.forEach((m, i) => add(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), m, -0.13 + i * 0.087, 0.44, 0.39, body, Math.PI / 2));
add(new THREE.BoxGeometry(0.3, 0.05, 0.02), metal, 0, 0.33, 0.385);
// backpack (life support) with tanks and an antenna
add(new THREE.BoxGeometry(0.72, 0.9, 0.32), seam, 0, 0.35, -0.48);
for (const x of [-0.2, 0.2]) add(new THREE.CylinderGeometry(0.1, 0.1, 0.75, 14), metal, x, 0.38, -0.68);
add(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), dark, 0.28, 1.0, -0.5);
// helmet: shell, neck ring and a gold mirror visor
add(new THREE.TorusGeometry(0.27, 0.06, 10, 28), metal, 0, 0.88, 0, body, Math.PI / 2);
add(new THREE.SphereGeometry(0.42, 32, 24), suit, 0, 1.22, 0);
add(new THREE.SphereGeometry(0.39, 32, 24, -Math.PI * 0.4, Math.PI * 0.8, Math.PI * 0.22, Math.PI * 0.42), visorMat, 0, 1.22, 0.06);
add(new THREE.TorusGeometry(0.33, 0.025, 8, 32, Math.PI * 0.9), seam, 0, 1.25, 0.12, body, 0, 0, Math.PI * 0.05).scale.set(1.15, 1.05, 1);
// limbs: upper part, joint ring, lower part, glove or boot
function limb(parent, x, y, angle, upper, lower, r, isLeg) {
  const g = new THREE.Group();
  g.position.set(x, y, 0);
  g.rotation.z = angle;
  parent.add(g);
  add(new THREE.SphereGeometry(r * 1.25, 16, 12), suit, 0, 0, 0, g);                          // shoulder / hip
  add(new THREE.CapsuleGeometry(r, upper, 6, 14), suit, 0, -upper / 2 - r * 0.4, 0, g);
  if (!isLeg) add(new THREE.TorusGeometry(r * 1.02, 0.025, 8, 20), stripe, 0, -upper * 0.35, 0, g, Math.PI / 2);
  const j = new THREE.Group();
  j.position.y = -upper - r * 0.6;
  j.rotation.z = isLeg ? -angle * 0.6 : angle * 0.35;
  g.add(j);
  add(new THREE.TorusGeometry(r * 1.05, 0.04, 8, 20), seam, 0, 0, 0, j, Math.PI / 2);          // elbow / knee ring
  add(new THREE.CapsuleGeometry(r * 0.95, lower, 6, 14), suit, 0, -lower / 2 - r * 0.3, 0, j);
  if (isLeg) {
    add(new THREE.CapsuleGeometry(r * 1.15, 0.12, 6, 14), dark, 0, -lower - r * 0.7, 0.04, j).scale.set(1, 1, 1.15);   // boot
    add(new THREE.BoxGeometry(r * 2.3, 0.07, r * 3.2), dark, 0, -lower - r * 1.55, 0.09, j);                            // sole
  } else {
    add(new THREE.TorusGeometry(r * 0.95, 0.03, 8, 18), metal, 0, -lower - r * 0.2, 0, j, Math.PI / 2);               // wrist ring
    add(new THREE.SphereGeometry(r * 1.05, 14, 10), dark, 0, -lower - r * 0.75, 0, j).scale.set(1, 1.25, 0.8);       // glove
  }
}
limb(body, -0.5, 0.55, 0.75, 0.32, 0.3, 0.12, false);
limb(body, 0.5, 0.6, -1.05, 0.32, 0.3, 0.12, false);
limb(body, -0.2, -0.42, 0.18, 0.36, 0.34, 0.15, true);
limb(body, 0.2, -0.42, -0.28, 0.36, 0.34, 0.15, true);
body.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = false; });
scene.add(astro);

// light from the disk: warm key from below/behind, cool rim from the starfield
sun.color.set(0xffa64d);
sun.intensity = 2.4;
sun.position.set(0, -6, -10);
sun.castShadow = false;
const rim = new THREE.DirectionalLight(0xdfe8ff, 2.2);
rim.position.set(-2, 6, 12);
scene.add(rim);
const fill = new THREE.PointLight(0xff8a3d, 10, 30);
scene.add(fill);

const RED = new THREE.Color(0x8a1206), RED_GLOW = new THREE.Color(0x3a0400);

// ---------- timeline ----------
const cams = {
  start:   { pos: V(0, 3, 60),     look: V(0, 0, 0) },
  intro:   { pos: V(0, 2.2, 30),   look: V(0, 0, 0) },
  disk:    { pos: V(-14, 6, 20),   look: V(0, 0, 0) },
  lens:    { pos: V(0, 0.9, 19),   look: V(0, 0.2, 0) },
  closer:  { pos: V(5.4, 4.3, 7.8), look: V(2.6, 2.1, 0.2) },
  stretch: { pos: V(2.0, 2.2, 12), look: V(2.4, 1.7, 0.4) },
  frozen:  { pos: V(0.8, 1.5, 13), look: V(0.9, 0.9, 0.3) },
  through: { pos: V(0, 0.3, 4),    look: V(0, 0, 0) },
  cta:     { pos: V(0, 2.5, 26),   look: V(0, 0, 0) },
};

start((time, tl) => {
  const look = moveCamera(cams, tl);
  camera.lookAt(look);
  camera.updateMatrixWorld();
  bhUniforms.uCamPos.value.copy(camera.position);
  bhUniforms.uCamMatrix.value.copy(camera.matrixWorld);
  bhUniforms.uInvProj.value.copy(camera.projectionMatrixInverse);
  bhUniforms.uTime.value = time;
  bhUniforms.uDiskGain.value = tl.shot === "through" ? 1 - 0.8 * ease(tl.k / 0.8) : 1;

  // the astronaut drifts in, stretches toward the hole, then reddens and freezes
  const closer = tl.prog("closer"), stretch = tl.prog("stretch"), frozen = tl.prog("frozen");
  astro.visible = closer > 0 && tl.prog("through") < 0.5;
  // path: drifting in above the disk, diagonally toward the hole so the stretch reads on screen
  const P0 = V(5.2, 4.2, 1.2), P1 = V(3.5, 2.9, 0.9), P2 = V(2.5, 2.05, 0.6), P3 = V(2.05, 1.7, 0.5);
  const k1 = ease(Math.min(1, Math.max(0, closer))), k2 = ease(Math.min(1, Math.max(0, stretch))), k3 = ease(Math.min(1, Math.max(0, frozen) / 0.6));
  astro.position.copy(P0).lerp(P1, k1).lerp(P2, k2).lerp(P3, k3);
  // feet point at the hole: the body's long axis lines up with the direction to the centre
  const toHole = astro.position.clone().negate().normalize();
  astro.quaternion.setFromUnitVectors(V(0, -1, 0), toHole);
  body.rotation.y = time * 0.35;
  const s = ease(Math.min(1, Math.max(0, stretch) / 0.85));
  body.scale.set(lerp(1, 0.42, s), lerp(1, 3.3, s), lerp(1, 0.42, s));
  astro.scale.setScalar(0.68);
  const red = ease(Math.min(1, Math.max(0, frozen) / 0.7));
  // redshift: the whole suit drains to deep red, then fades
  const fade = 1 - ease((frozen - 0.6) / 0.4);
  for (const m of astroMats) {
    m.color.copy(m.userData.base).lerp(RED, 0.85 * red);
    m.emissive.copy(m.userData.baseEmissive).lerp(RED_GLOW, red);
    m.transparent = fade < 1;
    m.opacity = fade;
  }
  fill.position.set(astro.position.x, astro.position.y - 1.5, astro.position.z - 2);
});
