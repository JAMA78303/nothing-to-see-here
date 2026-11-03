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
