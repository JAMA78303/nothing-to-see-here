// "Why basements flood on sunny days": a rising water table pushes in through wall cracks.
import {
  THREE, scene, camera, sun, hemi, M, GROUND_BOTTOM, box, solid, groundWithHole, setWaterTable, waterMaterial,
  house, tree, cloud, arrow, ease, lerp, V, moveCamera, start,
} from "./kit.js";

// Basement (outer, incl. walls): x -4.2..4.2, z -6.2..0 (cut open at the front face), floor at y -3.8
const B = { x0: -4.2, x1: 4.2, zBack: -6.2, floor: -3.8, t: 0.35 };
const IN = { x0: B.x0 + B.t, x1: B.x1 - B.t, zBack: B.zBack + B.t, floor: B.floor + B.t };
groundWithHole(B.x0, B.x1, B.zBack, [[B.x0, B.x1, B.floor]]);

box(B.x0, B.x1, B.floor, IN.floor, B.zBack, 0, M.concrete);         // floor slab
box(B.x0, IN.x0, B.floor, 0, B.zBack, 0, M.concrete);               // left wall
box(IN.x1, B.x1, B.floor, 0, B.zBack, 0, M.concrete);               // right wall
box(B.x0, B.x1, B.floor, 0, B.zBack, IN.zBack, M.concrete);         // back wall
box(B.x0, B.x1, -0.3, 0, B.zBack, 0, solid(0xb9b2a6));              // ceiling joists / house floor

house(0, -3.1, 9.6);
tree(-8.5, -6, 1.3);
tree(8.5, -9, 1.1);
tree(-18, -20, 1.4);
house(-20, -26, 9, 0.8);
cloud(-10, 20, -45, 2);
cloud(13, 23, -55, 2.4);

// ---------- basement contents ----------
const f = IN.floor;
const couch = solid(0x3d7ea6);
box(-3.3, -1.5, f, f + 0.55, -5.7, -4.6, couch);                    // seat
box(-3.3, -1.5, f + 0.55, f + 1.4, -5.8, -5.4, couch);              // back
box(-3.6, -3.3, f, f + 0.9, -5.8, -4.5, couch);                     // arms
box(-1.5, -1.2, f, f + 0.9, -5.8, -4.5, couch);
box(-3.0, -1.6, f, f + 0.06, -3.6, -2.2, solid(0xa8463c));          // rug
box(-0.8, 0.3, f, f + 1.2, -5.8, -4.7, solid(0xf4f4f4, 0x222222)); // washer
const door = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 24), new THREE.MeshLambertMaterial({ color: 0x334455 }));
door.rotation.x = Math.PI / 2;
door.position.set(-0.25, f + 0.6, -4.67);
scene.add(door);
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff1b0 }));
bulb.position.set(0, -0.8, -3);
scene.add(bulb);
box(-0.02, 0.02, -0.65, -0.3, -3.02, -2.98, solid(0x222222));
const lamp = new THREE.PointLight(0xffe7a8, 6, 12);
lamp.position.copy(bulb.position);
scene.add(lamp);

// cardboard boxes that float when the basement floods
const floaters = [[1.2, -5.3, 0.9], [2.2, -5.3, 0.8], [1.6, -5.2, 0.6], [0.6, -2.2, 0.6]].map(([x, z, s], i) => {
  const m = box(-s / 2, s / 2, 0, s * 0.8, -s / 2, s / 2, solid(0xc89b5f));
  m.userData = { x, z, s, baseY: f + (i === 2 ? 0.72 : 0) };
  return m;
});

// sump pit, pump and discharge pipe in the right corner
box(2.7, 3.8, f - 0.01, f + 0.02, -5.8, -4.6, solid(0x2b2b2b));
box(3.0, 3.5, f, f + 0.7, -5.5, -4.9, solid(0x2f5f9e));
const pipeMat = solid(0x8a8f96);
box(3.17, 3.33, f + 0.7, -0.6, -5.3, -5.14, pipeMat);
box(3.17, B.x1 + 0.8, -0.76, -0.6, -5.3, -5.14, pipeMat);
const pumpLight = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
pumpLight.position.set(3.25, f + 0.82, -4.9);
scene.add(pumpLight);

// ---------- water inside the basement ----------
const inside = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), waterMaterial());
scene.add(inside);
function setInsideWater(h) {
  inside.visible = h > 0.01;
  inside.scale.set(IN.x1 - IN.x0, Math.max(0.001, h), -IN.zBack);
  inside.position.set(0, f + h / 2, IN.zBack / 2);
  for (const m of floaters) {
    const { x, z, s, baseY } = m.userData;
    const floatY = f + h - s * 0.45;
    m.position.set(x, Math.max(baseY, floatY), z);
  }
}

// ---------- cracks in the walls, with water spurting through ----------
const crackMat = new THREE.MeshBasicMaterial({ color: 0x2a2520, transparent: true });
const cracks = [
  { x: -2.4, y: -1.6, z: IN.zBack + 0.01, axis: "z" },
  { x: 1.6, y: -2.0, z: IN.zBack + 0.01, axis: "z" },
  { x: IN.x0 + 0.01, y: -2.0, z: -2.4, axis: "x" },
  { x: IN.x1 - 0.01, y: -1.4, z: -2.8, axis: "x" },
];
const crackGroup = new THREE.Group();
scene.add(crackGroup);
for (const c of cracks) {
  const g = new THREE.Group();
  let px = 0, py = 0;
  for (let i = 0; i < 6; i++) {
    const len = 0.35 + Math.random() * 0.25, ang = -Math.PI / 2 + (i % 2 ? 0.6 : -0.6) + (Math.random() - 0.5) * 0.4;
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.06), crackMat);
    seg.position.set(px + Math.cos(ang) * len / 2, py + Math.sin(ang) * len / 2, 0);
    seg.rotation.z = ang;
    g.add(seg);
    px += Math.cos(ang) * len; py += Math.sin(ang) * len;
  }
  g.position.set(c.x, c.y + 0.9, c.z);
  if (c.axis === "x") g.rotation.y = c.x < 0 ? Math.PI / 2 : -Math.PI / 2;
  crackGroup.add(g);
}
// drips: each crack sprays a stream of droplets into the room
const dropMat = new THREE.MeshLambertMaterial({ color: 0x5bb4f0, emissive: 0x1a4f80 });
const drops = [];
for (const [ci, c] of cracks.entries()) {
  const out = c.axis === "z" ? V(0, 0, 1) : V(c.x < 0 ? 1 : -1, 0, 0);
  for (let i = 0; i < 18; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), dropMat);
    d.userData = { o: V(c.x, c.y + 0.3, c.z), out, phase: (i / 18) + ci * 0.13, speed: 1.6 + Math.random() * 0.8, spread: (Math.random() - 0.5) * 0.5 };
    scene.add(d);
    drops.push(d);
  }
}
function setDrops(time, amt) {
  for (const d of drops) {
    const { o, out, phase, speed, spread } = d.userData;
    d.visible = amt > 0.01;
    if (!d.visible) continue;
    const tau = ((time * 0.9 + phase) % 1);
    const fwd = tau * speed * amt;
    d.position.set(
      o.x + out.x * fwd + (out.z ? spread : 0),
      Math.max(f, o.y - 4.9 * tau * tau),
      o.z + out.z * fwd + (out.x ? spread : 0),
    );
  }
}

// ---------- rain above ground, and seepage down through the soil ----------
const rainMat = new THREE.MeshBasicMaterial({ color: 0xe4f1ff, transparent: true, opacity: 0.9 });
const rain = [];
for (let i = 0; i < 420; i++) {
  const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), rainMat);
  r.userData = { x: (Math.random() - 0.5) * 34, z: -16 + Math.random() * 18, phase: Math.random() };
  scene.add(r);
  rain.push(r);
}
const seepMat = new THREE.MeshBasicMaterial({ color: 0x4f9be8 });
const seep = [];
for (let i = 0; i < 60; i++) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), seepMat);
  let x = (Math.random() - 0.5) * 22;
  if (Math.abs(x) < 4.6) x = Math.sign(x || 1) * (4.8 + Math.random() * 4);
  s.userData = { x, phase: Math.random() };
  scene.add(s);
  seep.push(s);
}
function setRain(time, amt, waterTop) {
  for (const r of rain) {
    r.visible = amt > 0.01;
    const { x, z, phase } = r.userData;
    r.position.set(x, 14 - ((time * 1.4 + phase) % 1) * 14, z);
  }
  for (const s of seep) {
    s.visible = amt > 0.01;
    const { x, phase } = s.userData;
    s.position.set(x, -0.3 - ((time * 0.45 + phase) % 1) * (-0.3 - waterTop), 0.08);
  }
}

// ---------- pressure arrows (point inward at the basement) ----------
const arrows = new THREE.Group();
scene.add(arrows);
for (const [x, y, rot, size] of [
  [-5.6, -2.9, -Math.PI / 2, 0.65], [-5.6, -1.5, -Math.PI / 2, 0.65],
  [5.6, -2.9, Math.PI / 2, 0.65], [5.6, -1.5, Math.PI / 2, 0.65],
  [-2.4, -6.6, 0, 1], [0, -6.6, 0, 1], [2.4, -6.6, 0, 1],
]) {
  const a = arrow();
  a.position.set(x, y, 0.4);
  a.rotation.z = rot;
  a.userData = { x, y, rot, size };
  arrows.add(a);
}

// ---------- timeline ----------
const cams = {
  start:       { pos: V(0, 14, 44),   look: V(0, 2, -10) },
  intro:       { pos: V(0, 4, 22),    look: V(0, 0.5, -6) },
  underground: { pos: V(0, -1.4, 12), look: V(0, -2.3, -4) },
  soak:        { pos: V(0, 3, 22),    look: V(0, -1.5, -4) },
  rise:        { pos: V(0, -1.2, 21), look: V(0, -4.2, -4) },
  press:       { pos: V(0, -1.6, 22), look: V(0, -3.4, -4) },
  seep:        { pos: V(0, -1.8, 10), look: V(0, -2.3, -5) },
  flood:       { pos: V(0, -1.2, 12), look: V(0, -2.5, -4) },
  outro:       { pos: V(0, 4, 24),    look: V(0, -0.5, -6) },
};

start((time, tl) => {
  const look = moveCamera(cams, tl);
  const soak = tl.prog("soak"), rise = tl.prog("rise"), press = tl.prog("press");
  const seepP = tl.prog("seep"), flood = tl.prog("flood"), outro = tl.prog("outro");

  // a grey, rainy flashback during "soak"
  const storm = soak >= 0 && soak < 1 ? Math.min(ease(soak / 0.15), 1 - ease((soak - 0.85) / 0.15)) : 0;
  sun.intensity = lerp(2.2, 0.5, storm);
  hemi.intensity = lerp(1.1, 0.7, storm);

  // groundwater: deep, a little higher after the rain, then up near the surface
  const waterTop = lerp(lerp(-10, -8.5, ease(soak)), -0.9, ease(rise / 0.85));
  setWaterTable(waterTop, time);
  setRain(time, storm, waterTop);

  // pressure arrows grow and pulse while the water pushes in
  const arrowAmt = press < 0 ? 0 : ease(press / 0.4) * (outro > 0 ? 1 - ease(outro / 0.4) : 1);
  arrows.visible = arrowAmt > 0.01;
  arrows.children.forEach((a, j) => {
    const pulse = 1 + 0.12 * Math.sin(time * 12 + j);
    a.scale.setScalar(Math.max(0.01, arrowAmt * pulse * a.userData.size));
    const nudge = 0.25 * Math.sin(time * 6 + j) * arrowAmt;
    a.position.set(a.userData.x - Math.sin(a.userData.rot) * nudge, a.userData.y + Math.cos(a.userData.rot) * nudge, 0.4);
  });

  // cracks appear, then spray
  crackGroup.visible = seepP > 0;
  crackMat.opacity = ease(seepP / 0.3);
  const dripAmt = seepP < 0 ? 0 : ease(seepP / 0.4) * (outro > 0 ? 1 - ease(outro / 0.3) : 1);
  setDrops(time, dripAmt);

  // the basement fills, then the sump pump drains it in the outro
  const level = lerp(0, 0.18, ease(seepP)) + 0.95 * ease(flood / 0.9);
  setInsideWater(outro > 0 ? level * (1 - 0.85 * ease((outro - 0.15) / 0.6)) : level);
  pumpLight.material.color.set(outro > 0.15 ? 0x34c759 : 0xff3b30);

  camera.lookAt(look);
});
