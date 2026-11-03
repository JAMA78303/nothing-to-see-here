// "What happens if you fall into a black hole": a ray-traced black hole (light bent by gravity,
// glowing accretion disk, starfield) behind a stylised astronaut who gets stretched and reddened.
import { THREE, scene, camera, sun, hemi, setWaterTable, ease, lerp, V, moveCamera, start } from "./kit.js";

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
      for (int k = 0; k < 2; k++) {
        float scale = k == 0 ? 220.0 : 520.0;
        vec3 p = d * scale, cell = floor(p);
        float h = hash(cell);
        if (h > 0.985) {
          vec3 c = cell + vec3(hash(cell + 1.3), hash(cell + 2.7), hash(cell + 4.1));
          float dist = length(p - c);
          float b = smoothstep(0.22, 0.0, dist) * (h - 0.985) * 90.0;
          col += b * mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.85, 0.7), hash(cell + 9.0));
        }
      }
      // faint nebula haze
      float n = fbm(d.xy * 3.0 + d.z * 2.0);
      col += vec3(0.07, 0.03, 0.11) * smoothstep(0.55, 0.95, n) * 0.5 + vec3(0.004, 0.008, 0.016) * n;
      return col;
    }
    vec3 disk(vec3 hit, vec3 rayDir, out float alpha) {
      float r = length(hit.xz);
      float inner = 2.6, outer = 13.0;
      float edge = smoothstep(inner, inner + 0.6, r) * smoothstep(outer, outer - 4.0, r);
      float phi = atan(hit.z, hit.x);
      float spin = uTime * 3.0 / pow(r, 1.5);
      float swirl = fbm(vec2(r * 1.6 + fbm(vec2(phi * 2.0 + spin, r)) * 2.0, (phi + spin) * 4.0 + r * 0.7));
      float bands = 0.7 + 0.3 * sin(r * 3.2 + swirl * 9.0);
      float t = clamp(pow(inner / r, 1.1), 0.0, 1.0);
      vec3 hot = vec3(1.0, 0.96, 0.88), mid = vec3(1.0, 0.62, 0.22), cool = vec3(0.75, 0.22, 0.06);
      vec3 col = mix(mix(cool, mid, smoothstep(0.15, 0.5, t)), hot, smoothstep(0.55, 1.0, t));
      // relativistic beaming: the side spinning toward us is brighter
      vec3 orbit = normalize(vec3(-hit.z, 0.0, hit.x));
      float beam = pow(clamp(1.0 + 0.75 * dot(orbit, -rayDir), 0.25, 1.9), 2.0);
      float I = edge * (0.35 + 0.9 * swirl) * bands * pow(inner / r, 1.2) * beam * 3.2 * uDiskGain;
      alpha = clamp(I * 0.8, 0.0, 0.97);
      return col * I;
    }
    void main() {
      vec4 v = uInvProj * vec4(vNdc, 1.0, 1.0);
      vec3 dir = normalize((uCamMatrix * vec4(v.xyz / v.w, 0.0)).xyz);
      vec3 pos = uCamPos, vel = dir;
      vec3 hcross = cross(pos, vel);
      float h2 = dot(hcross, hcross);
      vec3 col = vec3(0.0); float trans = 1.0; bool absorbed = false;
      for (int i = 0; i < 360; i++) {
        float r = length(pos);
        if (r < 1.0) { absorbed = true; break; }
        if (r > 70.0) break;
        float dt = clamp(0.06 * r, 0.03, 1.2);
        vec3 prev = pos;
        vel += -1.5 * h2 * pos / pow(r, 5.0) * dt;   // light bending around a Schwarzschild black hole
        pos += vel * dt;
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

// ---------- astronaut (built from simple shapes, lit by the disk's glow) ----------
const suit = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.55, metalness: 0.05 });
const visorMat = new THREE.MeshStandardMaterial({ color: 0xffb347, roughness: 0.12, metalness: 0.9, emissive: 0x331800 });
const astro = new THREE.Group();
const body = new THREE.Group();
astro.add(body);
const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.7, 6, 16), suit);
torso.position.y = 0.2;
const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), suit);
helmet.position.y = 1.15;
const visor = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.28, Math.PI * 0.42), visorMat);
visor.position.set(0, 1.15, 0.12);
const pack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.35), new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.6 }));
pack.position.set(0, 0.35, -0.45);
const limb = (len, r) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), suit);
const armL = limb(0.6, 0.13), armR = limb(0.6, 0.13), legL = limb(0.7, 0.16), legR = limb(0.7, 0.16);
armL.position.set(-0.6, 0.35, 0.05); armL.rotation.z = 0.6;
armR.position.set(0.6, 0.45, 0.05); armR.rotation.z = -1.0;
legL.position.set(-0.22, -0.75, 0); legL.rotation.z = 0.15;
legR.position.set(0.22, -0.75, 0); legR.rotation.z = -0.25;
for (const m of [torso, helmet, visor, pack, armL, armR, legL, legR]) body.add(m);
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

// ---------- timeline ----------
const cams = {
  start:   { pos: V(0, 3, 60),     look: V(0, 0, 0) },
  intro:   { pos: V(0, 2.2, 30),   look: V(0, 0, 0) },
  disk:    { pos: V(-14, 6, 20),   look: V(0, 0, 0) },
  lens:    { pos: V(0, 0.9, 19),   look: V(0, 0.2, 0) },
  closer:  { pos: V(2.2, 2.8, 14), look: V(3.0, 2.4, 0.6) },
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
  suit.color.setRGB(lerp(0.95, 0.75, red), lerp(0.95, 0.12, red), lerp(0.95, 0.08, red));
  suit.emissive.setRGB(0.25 * red, 0.02 * red, 0);
  const fade = 1 - ease((frozen - 0.6) / 0.4);
  for (const m of [suit, visorMat]) { m.transparent = fade < 1; m.opacity = fade; }
  fill.position.set(astro.position.x, astro.position.y - 1.5, astro.position.z - 2);
});
