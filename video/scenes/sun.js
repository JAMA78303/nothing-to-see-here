// "What if the Sun disappeared?": three sets the camera cuts between: space (Sun, Earth, Moon),
// the back yard (day -> sudden night -> frost) and a deep-sea vent under the ice.
import {
  THREE, scene, camera, sun, hemi, GROUND_BOTTOM, groundBox, box, solid, setWaterTable, canvasTex,
  house, tree, cloud, ease, lerp, V, start, fxOptions,
} from "./kit.js";

fxOptions.ao = false;
const SPACE = V(0, 600, 0), DEEP = V(500, 0, 0);
const SET = { hook: "yard", intro: "space", gravity: "space", dark: "yard", drift: "space", cold: "yard", ice: "space", deep: "deep", cta: "space", start: "space" };

// ---------- shared starfield (used by the space sky and the night yard sky) ----------
const starTex = canvasTex(8, 8, (g, w, h) => { const r = g.createRadialGradient(4, 4, 0, 4, 4, 4); r.addColorStop(0, "#fff"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); });
function starfield(center, radius, count, size) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const v = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(radius);
    pos.set([v.x + center.x, v.y + center.y, v.z + center.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: starTex, transparent: true, depthWrite: false, fog: false, sizeAttenuation: false, color: new THREE.Color(1.6, 1.6, 1.8) }));
  scene.add(pts);
  return pts;
}

// ---------- space set ----------
const spaceStars = starfield(SPACE, 380, 2600, 3);
const sunCore = new THREE.Mesh(new THREE.SphereGeometry(4, 40, 30), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.0, 0.8), fog: false }));
sunCore.position.copy(SPACE);
scene.add(sunCore);
const glowTex = canvasTex(256, 256, (g, w, h) => {
  const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  r.addColorStop(0, "rgba(255,220,150,1)"); r.addColorStop(0.25, "rgba(255,170,60,0.55)"); r.addColorStop(1, "rgba(255,120,20,0)");
  g.fillStyle = r; g.fillRect(0, 0, w, h);
});
const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
corona.scale.setScalar(26);
corona.position.copy(SPACE);
scene.add(corona);
const sunLight = new THREE.PointLight(0xfff2dd, 2500, 0, 2);
sunLight.position.copy(SPACE);
scene.add(sunLight);

const ORBIT_R = 32;
const earthTex = canvasTex(1024, 512, (g, w, h) => {
  g.fillStyle = "#1f5fa8"; g.fillRect(0, 0, w, h);
  const blob = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); for (let a = 0; a < 6.3; a += 0.3) { const rr = r * (0.7 + Math.random() * 0.5); g.lineTo(x + Math.cos(a) * rr * 1.6, y + Math.sin(a) * rr); } g.fill(); };
  for (let i = 0; i < 26; i++) blob(Math.random() * w, 110 + Math.random() * 290, 30 + Math.random() * 60, ["#3f8f3f", "#6b8f3a", "#a88f5a"][i % 3]);
  g.fillStyle = "#f4f8fb"; g.fillRect(0, 0, w, 40); g.fillRect(0, h - 40, w, 40);
  g.globalAlpha = 0.55;
  for (let i = 0; i < 70; i++) { g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(Math.random() * w, 60 + Math.random() * 390, 40 + Math.random() * 80, 8 + Math.random() * 10, 0, 0, 7); g.fill(); }
});
const earthMat = new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.8 });
const earth = new THREE.Mesh(new THREE.SphereGeometry(1.6, 48, 32), earthMat);
scene.add(earth);
const iceShell = new THREE.Mesh(new THREE.SphereGeometry(1.63, 48, 32), new THREE.MeshStandardMaterial({ color: 0xdff2ff, roughness: 0.4, transparent: true, opacity: 0 }));
earth.add(iceShell);
const atmo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x7fb8ff, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35 }));
atmo.scale.setScalar(5.4);
earth.add(atmo);
const moon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), new THREE.MeshStandardMaterial({ color: 0xbdbdbd, roughness: 1 }));
scene.add(moon);
const orbitLine = new THREE.Mesh(new THREE.TorusGeometry(ORBIT_R, 0.04, 6, 200), new THREE.MeshBasicMaterial({ color: 0x6a8fbf, transparent: true, opacity: 0.5, fog: false }));
orbitLine.rotation.x = Math.PI / 2;
orbitLine.position.copy(SPACE);
scene.add(orbitLine);
// the last light and the gravity "letting go": expanding shells from where the Sun was
const shell = color => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 240), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m.rotation.x = Math.PI / 2;
  m.position.copy(SPACE);
  scene.add(m);
  return m;
};
const lightFront = shell(new THREE.Color(3.0, 2.2, 0.8));
const gravFront = shell(new THREE.Color(1.4, 0.8, 3.0));
// countdown label floating near Earth
const timerCanvas = document.createElement("canvas");
timerCanvas.width = 512; timerCanvas.height = 160;
const timerTex = new THREE.CanvasTexture(timerCanvas);
timerTex.colorSpace = THREE.SRGBColorSpace;
const timer = new THREE.Sprite(new THREE.SpriteMaterial({ map: timerTex, depthWrite: false, fog: false }));
timer.scale.set(9, 2.8, 1);
scene.add(timer);
let lastTimer = "";
function setTimer(seconds) {
  const s = Math.max(0, Math.round(seconds)), txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  if (txt === lastTimer) return;
  lastTimer = txt;
  const g = timerCanvas.getContext("2d");
  g.clearRect(0, 0, 512, 160);
  g.fillStyle = "rgba(10,10,20,0.6)"; g.beginPath(); g.roundRect(56, 10, 400, 140, 30); g.fill();
  g.fillStyle = "#ffd27a"; g.font = "bold 100px Arial"; g.textAlign = "center"; g.fillText(txt, 256, 118);
  timerTex.needsUpdate = true;
}
// straight-line escape path
const pathLine = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 80, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.4, 1.6), transparent: true, opacity: 0.5, fog: false }));
scene.add(pathLine);
const rim = new THREE.DirectionalLight(0x9fb8ff, 0);
scene.add(rim);

// ---------- yard set (at the origin, using the kit's ground and house) ----------
groundBox(-60, 60, GROUND_BOTTOM, 0, -60, 0);
const home = house(0, -10, 12);
for (const [x, z, s] of [[-11, -8, 1.3], [10, -10, 1.1], [-18, -20, 1.4], [16, -22, 1.2]]) tree(x, z, s);
const yardClouds = [[-10, 22, -50, 2.2], [14, 25, -60, 2.6]].map(([x, y, z, s]) => cloud(x, y, z, s));
const skyUniforms = { uNight: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(250, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: "varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform float uNight; varying vec3 vDir;
    void main() {
      float h = clamp(vDir.y, 0.0, 1.0);
      vec3 day = mix(vec3(0.95, 0.9, 0.8), vec3(0.3, 0.58, 0.9), pow(h, 0.5));
      vec3 night = mix(vec3(0.03, 0.04, 0.08), vec3(0.0, 0.0, 0.015), pow(h, 0.5));
      gl_FragColor = vec4(mix(day, night, uNight), 1.0);
    }`,
}));
scene.add(sky);
sky.renderOrder = -2;
const nightStars = starfield(V(0, 0, 0), 240, 1800, 2.5);
const skySun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: new THREE.Color(2.2, 1.9, 1.4) }));
skySun.position.set(-60, 90, -200); skySun.scale.setScalar(70);
scene.add(skySun);
const skyMoon = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.3, 1.25), fog: false, transparent: true }));
skyMoon.position.set(45, 70, -190); skyMoon.lookAt(0, 0, 0);
scene.add(skyMoon);
const frost = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshLambertMaterial({ color: 0xeef6ff, transparent: true, opacity: 0 }));
frost.rotation.x = -Math.PI / 2; frost.position.set(0, 0.02, -30);
scene.add(frost);
const windows = [];
home.traverse(o => { if (o.isMesh && o.material.color?.getHex() === 0x3b6fa8) windows.push(o); });
// thermometer sign on the lawn
const thermoCanvas = document.createElement("canvas");
thermoCanvas.width = 512; thermoCanvas.height = 256;
const thermoTex = new THREE.CanvasTexture(thermoCanvas);
thermoTex.colorSpace = THREE.SRGBColorSpace;
const thermo = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), new THREE.MeshBasicMaterial({ map: thermoTex, fog: false }));
thermo.position.set(-3.2, 2.4, 1);
scene.add(thermo);
box(-3.3, -3.1, 0, 1.5, 0.9, 1.1, solid(0x5d4037));
let lastThermo = "";
function setThermo(c) {
  const f = Math.round(c * 9 / 5 + 32), txt = `${Math.round(c)}°C / ${f}°F`;
  if (txt === lastThermo) return;
  lastThermo = txt;
  const g = thermoCanvas.getContext("2d");
  g.fillStyle = "#1c2733"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#cfd8dc"; g.lineWidth = 10; g.strokeRect(5, 5, 502, 246);
  g.fillStyle = c < 0 ? "#7fd3ff" : "#ffb74d"; g.font = "bold 84px Arial"; g.textAlign = "center"; g.fillText(txt, 256, 160);
  thermoTex.needsUpdate = true;
}

// ---------- deep-sea set: under the ice, a glowing hydrothermal vent ----------
const deep = new THREE.Group();
deep.position.copy(DEEP);
scene.add(deep);
const rockM = new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 1, flatShading: true });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80, 30, 30), rockM);
floor.rotation.x = -Math.PI / 2;
const fp = floor.geometry.attributes.position;
for (let i = 0; i < fp.count; i++) fp.setZ(i, (Math.random() - 0.5) * 0.6);
floor.geometry.computeVertexNormals();
deep.add(floor);
const ice = new THREE.Mesh(new THREE.BoxGeometry(80, 1.2, 80), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.3, transparent: true, opacity: 0.9 }));
ice.position.y = 16;
deep.add(ice);
const chimney = new THREE.Group();
for (let i = 0; i < 6; i++) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.9 - i * 0.12, 1.3 - i * 0.12, 1.1, 9), rockM);
  c.position.y = 0.55 + i * 1.0; c.rotation.y = i;
  chimney.add(c);
}
deep.add(chimney);
const ventGlow = new THREE.PointLight(0xff7a2e, 40, 18);
ventGlow.position.set(0, 5.5, 0);
deep.add(ventGlow);
const lava = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.3) }));
lava.rotation.x = -Math.PI / 2; lava.position.y = 6.05;
deep.add(lava);
const plume = [];
for (let i = 0; i < 90; i++) {
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.35 + Math.random() * 0.4, 8, 6), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, transparent: true, opacity: 0.55, roughness: 1 }));
  p.userData = { ph: Math.random(), dx: (Math.random() - 0.5) * 1.5, dz: (Math.random() - 0.5) * 1.5 };
  deep.add(p);
  plume.push(p);
}
const worms = [];
for (let i = 0; i < 26; i++) {
  const a = Math.random() * 6.3, r = 1.8 + Math.random() * 2.4;
  const w = new THREE.Group();
  const h = 0.8 + Math.random() * 1.2;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, h, 6), new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.8 }));
  tube.position.y = h / 2;
  const plumeTip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd32f2f, emissive: 0x400000 }));
  plumeTip.position.y = h + 0.05; plumeTip.scale.y = 1.6;
  w.add(tube, plumeTip);
  w.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
  w.userData.ph = Math.random() * 6;
  deep.add(w);
  worms.push(w);
}
const deepFog = new THREE.FogExp2(0x041a2b, 0.045);

// ---------- timeline ----------
// space shots are framed relative to Earth (rel: true), so the camera follows it as it moves
const cams = {
  start:   { rel: true, pos: V(16, 6, 6),     look: V(-3, 1.2, 1.5) },
  intro:   { rel: true, pos: V(11, 3.5, 1),   look: V(-3, 1.2, 1.5) },
  gravity: { rel: true, pos: V(8, 5, 8),      look: V(-2.5, 0.8, 1.5) },
  dark:    { pos: V(0, 3.5, 24),  look: V(0, 6, -10) },
  drift:   { rel: true, pos: V(-5, 2.5, 9),   look: V(1, 0, 0) },
  cold:    { pos: V(-1.5, 3.2, 16), look: V(-1.2, 2.6, -6) },
  ice:     { rel: true, pos: V(3.5, 1.5, 6.5), look: V(0, 0, 0) },
  deep:    { pos: V(509, 6, 13),  look: V(500, 4.5, 0) },
  cta:     { rel: true, pos: V(-7, 4, 17),    look: V(0, 0, 0) },
};
const earthPos = (t, tl) => {
  // circles the Sun until gravity lets go (end of "gravity"), then flies off along the tangent
  const omega = 0.05, a0 = 0.6;
  const release = tl.prog("gravity") >= 1 ? tl.since("drift") + 0 : -1;
  const tRel = release >= 0 ? t - release : t;
  const ang = a0 + omega * tRel;
  const p = V(Math.cos(ang) * ORBIT_R, 0, -Math.sin(ang) * ORBIT_R);
  if (release < 0) return p;
  const tangent = V(-Math.sin(ang), 0, -Math.cos(ang)).multiplyScalar(ORBIT_R * omega);
  return p.add(tangent.multiplyScalar(release));
};

start((time, tl) => {
  const where = SET[tl.shot];
  // camera: smooth moves within a set, hard cuts between sets
  setWaterTable(GROUND_BOTTOM - 1, time);

  const intro = tl.prog("intro"), gravity = tl.prog("gravity"), dark = tl.prog("dark"), cold = tl.prog("cold"), ice = tl.prog("ice");
  const inSpace = where === "space", inYard = where === "yard", inDeep = where === "deep";
  scene.background = inSpace || inDeep ? new THREE.Color(inDeep ? 0x041a2b : 0x000000) : null;
  scene.fog = inDeep ? deepFog : null;
  sky.visible = inYard;

  // --- space ---
  const vanish = ease(Math.min(1, Math.max(0, intro - 0.02) / 0.06));
  sunCore.scale.setScalar(Math.max(0.001, 1 - vanish));
  corona.material.opacity = 1 - vanish;
  // last light reaches Earth at the end of "intro"; gravity's change arrives at the end of "gravity"
  const lr = intro <= 0.05 ? 0 : ORBIT_R * (intro - 0.05) / 0.95, gr = gravity <= 0 ? 0 : ORBIT_R * gravity;
  lightFront.visible = intro > 0.05 && gravity < 0.3; lightFront.scale.setScalar(Math.max(0.01, lr + (intro >= 1 ? 4 * Math.max(0, gravity) : 0)));
  gravFront.visible = gravity > 0 && gravity < 1.05; gravFront.scale.setScalar(Math.max(0.01, gr));
  const lit = intro < 1;                        // Earth stays lit until the last light passes
  sunLight.intensity = lit ? 2500 : 0;
  hemi.intensity = inYard ? lerp(1.1, 0.45, ease(dark / 0.1)) : 0.06;
  hemi.color.set(inYard && dark > 0 ? 0x6f86b8 : 0xdff1ff);
  rim.intensity = inSpace && !lit ? 0.8 : 0;
  const ep = earthPos(time, tl).add(SPACE);
  const from = SET[tl.prev] === where ? cams[tl.prev] : cams[tl.shot], to = cams[tl.shot];
  const ck = ease(Math.min(1, tl.k / 0.7));
  const abs = (c, key) => (c.rel ? c[key].clone().add(ep) : c[key]);
  camera.position.lerpVectors(abs(from, "pos"), abs(to, "pos"), ck);
  const look = abs(from, "look").lerp(abs(to, "look"), ck);
  earth.position.copy(ep);
  earth.rotation.y = time * 0.3;
  const mAng = time * 0.8;
  moon.position.set(ep.x + Math.cos(mAng) * 3.6, ep.y + 0.3, ep.z + Math.sin(mAng) * 3.6);
  rim.position.copy(ep).add(V(-10, 6, 12)); rim.target = earth;
  timer.visible = inSpace && intro > 0.05 && intro < 1;
  timer.position.copy(ep).add(V(0, 3.3, 0));
  setTimer(500 * (1 - Math.min(1, Math.max(0, (intro - 0.05) / 0.95))));
  orbitLine.visible = inSpace && tl.prog("drift") < 0;
  pathLine.visible = inSpace && tl.prog("drift") > 0.1;
  if (pathLine.visible) {
    const a = 0.6 + 0.05 * (time - tl.since("drift"));
    const dir = V(-Math.sin(a), 0, -Math.cos(a));
    pathLine.position.copy(ep).add(dir.clone().multiplyScalar(36));
    pathLine.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
  }
  iceShell.material.opacity = 0.9 * ease(ice / 0.8) + (tl.prog("cta") > 0 ? 0.9 : 0);
  atmo.material.opacity = lit ? 0.35 : 0.1;
  spaceStars.visible = inSpace;

  // --- yard: sudden night, house lights, frost, falling temperature ---
  const night = ease(Math.min(1, Math.max(0, dark) / 0.12));
  skyUniforms.uNight.value = night;
  nightStars.visible = inYard && night > 0.05;
  nightStars.material.opacity = night;
  skySun.visible = night < 0.5;
  skyMoon.material.opacity = 1 - ease((dark - 0.35) / 0.15);
  sun.intensity = inYard ? lerp(2.2, 0.0, night) : 0;
  yardClouds.forEach(c => (c.visible = night < 0.5));
  for (const w of windows) w.material.emissive?.setRGB(1.2 * night, 0.85 * night, 0.4 * night);
  frost.material.opacity = 0.75 * ease(cold / 0.9);
  thermo.visible = inYard && cold > 0;
  setThermo(lerp(15, -20, ease(cold / 0.9)));

  // --- deep sea ---
  for (const p of plume) {
    const u = (time * 0.25 + p.userData.ph) % 1;
    p.position.set(p.userData.dx * u * 2, 6.2 + u * 9, p.userData.dz * u * 2);
    p.scale.setScalar(0.6 + u * 1.8);
    p.material.opacity = 0.6 * (1 - u);
  }
  for (const w of worms) w.rotation.z = 0.08 * Math.sin(time * 1.3 + w.userData.ph);
  lava.material.color.setRGB(3 + 0.6 * Math.sin(time * 7), 1.2, 0.3);
  void inDeep;

  camera.lookAt(look);
});
