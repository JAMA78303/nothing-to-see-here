// "What if your house had no foundation?": the house sits on soft topsoil, settles, sinks and
// tilts after rain, then cracks. Ghost footings show what a foundation would have done.
import {
  THREE, scene, camera, sun, hemi, M, GROUND_BOTTOM, WATER_TABLE, box, groundBox, solid, setWaterTable,
  house, tree, cloud, arrow, yellowArrowMat, ease, lerp, V, moveCamera, start,
} from "./kit.js";

groundBox(-24, 24, GROUND_BOTTOM, 0, -40, 0);

// the house stands just behind the cut face, so whatever sinks below ground disappears behind the soil
const HOUSE_Z = -3.4, W = 12;
const home = house(0, HOUSE_Z, W);
tree(-11, -8, 1.3);
tree(10.5, -11, 1.1);
tree(-18, -22, 1.4);
house(-20, -28, 9, 0.8);
house(20, -30, 9, 0.8);
cloud(-10, 20, -45, 2);
cloud(13, 23, -55, 2.4);

// ---------- ghost footings: what a foundation would look like ----------
const footMat = new THREE.MeshLambertMaterial({ color: 0xcfcbc3, transparent: true, opacity: 0.95 });
const footings = new THREE.Group();
for (const x of [-W / 2 + 0.4, W / 2 - 0.4]) {
  box(x - 0.35, x + 0.35, WATER_TABLE + 0.6, 0, -6, 0.04, () => footMat, footings);           // wall
  box(x - 1.0, x + 1.0, WATER_TABLE + 0.1, WATER_TABLE + 0.6, -6, 0.04, () => footMat, footings); // wide foot
}
scene.add(footings);
// load arrows: down the footings into the solid layer
const loadArrows = new THREE.Group();
for (const x of [-W / 2 + 0.4, W / 2 - 0.4]) {
  const a = arrow(yellowArrowMat);
  a.rotation.z = Math.PI;
  a.position.set(x, -0.6, 0.5);
  loadArrows.add(a);
}
scene.add(loadArrows);

// weight arrows on the roof, and pressure arrows into the soft soil below the house
const weightArrows = new THREE.Group();
for (const x of [-4, 0, 4]) {
  const a = arrow(yellowArrowMat);
  a.rotation.z = Math.PI;
  a.position.set(x, 12.2, HOUSE_Z + 3.4);
  weightArrows.add(a);
}
scene.add(weightArrows);
const soilArrows = new THREE.Group();
for (const x of [-4.5, -1.5, 1.5, 4.5]) {
  const a = arrow();
  a.rotation.z = Math.PI;
  a.position.set(x, -0.3, 0.5);
  soilArrows.add(a);
}
scene.add(soilArrows);

// wet topsoil: a dark tint over the cut face
const wet = new THREE.Mesh(new THREE.PlaneGeometry(48, 2.4), new THREE.MeshBasicMaterial({ color: 0x1b2a3a, transparent: true, opacity: 0 }));
wet.position.set(0, -1.2, 0.03);
scene.add(wet);

// dirt squeezed up beside the house as it sinks
const bulgeMat = M.topsoil(2, 1);
const bulges = [-W / 2 - 0.9, W / 2 + 0.9].map(x => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), bulgeMat);
  m.position.set(x, 0, HOUSE_Z);
  m.scale.set(1.2, 0.01, 3.4);
  scene.add(m);
  return m;
});

// rain
const rainMat = new THREE.MeshBasicMaterial({ color: 0xe4f1ff, transparent: true, opacity: 0.9 });
const rain = [];
for (let i = 0; i < 420; i++) {
  const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), rainMat);
  r.userData = { x: (Math.random() - 0.5) * 36, z: -16 + Math.random() * 18, phase: Math.random() };
  scene.add(r);
  rain.push(r);
}

// cracks on the front wall (children of the house so they tilt with it)
const crackMat = new THREE.MeshBasicMaterial({ color: 0x2a2520, transparent: true });
const cracks = new THREE.Group();
let seed = 5;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (const [cx, cy, len] of [[-3.3, 6.0, 9], [2.0, 3.1, 7], [4.6, 6.1, 10], [-1.0, 3.0, 6]]) {
  let px = cx, py = cy;
  for (let i = 0; i < len; i++) {
    const l = 0.3 + rand() * 0.3, ang = -Math.PI / 2 + (i % 2 ? 0.7 : -0.7) + (rand() - 0.5) * 0.5;
    const seg = new THREE.Mesh(new THREE.PlaneGeometry(l, 0.07), crackMat);
    seg.position.set(px + Math.cos(ang) * l / 2, py + Math.sin(ang) * l / 2, 3.13);
    seg.rotation.z = ang;
    cracks.add(seg);
    px += Math.cos(ang) * l; py += Math.sin(ang) * l;
  }
}
home.add(cracks);

// shattering windows: glass shards burst out of two windows
const glassPanes = [];
home.traverse(o => { if (o.isMesh && o.material.color?.getHex() === 0x3b6fa8) glassPanes.push(o); });
const shattered = [glassPanes[0], glassPanes[glassPanes.length - 2]].filter(Boolean);
const shardMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
const shards = [];
for (const pane of shattered) {
  for (let i = 0; i < 26; i++) {
    const g = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0.18, 0.05, 0), V(0.05, 0.2, 0)]);
    const m = new THREE.Mesh(g, shardMat);
    m.userData = { pane, v: V((rand() - 0.5) * 3, 1 + rand() * 3, 2 + rand() * 3), off: V((rand() - 0.5) * 1, (rand() - 0.5) * 1.2, 0), spin: rand() * 12 };
    scene.add(m);
    shards.push(m);
  }
}

// ---------- timeline ----------
const cams = {
  start:   { pos: V(0, 9, 36),   look: V(0, 2, -6) },
  intro:   { pos: V(0, 4.5, 25), look: V(0, 1.5, -4) },
  compare: { pos: V(0, 0.5, 25), look: V(0, -1.2, -2) },
  weight:  { pos: V(0, 3, 26),   look: V(0, 1.5, -3) },
  rain:    { pos: V(0, 4, 27),   look: V(0, 0.5, -3) },
  sink:    { pos: V(-3, 3.5, 29), look: V(0, 0.8, -3) },
  crack:   { pos: V(2, 3, 15),   look: V(1, 1.8, -2) },
  outro:   { pos: V(0, 6.5, 31), look: V(0, 0.5, -6) },
};

start((time, tl) => {
  const look = moveCamera(cams, tl);
  setWaterTable(GROUND_BOTTOM - 1, time);
  const compare = tl.prog("compare"), weight = tl.prog("weight"), rainP = tl.prog("rain");
  const sink = tl.prog("sink"), crack = tl.prog("crack");

  // footings grow down from the walls, then fade out as the story says "without them"
  const footIn = ease(compare / 0.35), footOut = ease(weight / 0.25);
  footings.visible = compare > 0 && footOut < 1;
  footings.scale.y = Math.max(0.01, footIn);
  footMat.opacity = 0.95 * (1 - footOut);
  const loadAmt = ease((compare - 0.45) / 0.25) * (1 - footOut);
  loadArrows.visible = loadAmt > 0.01;
  loadArrows.children.forEach((a, j) => {
    a.scale.setScalar(Math.max(0.01, loadAmt));
    a.position.y = -0.6 - 2 * (((time * 0.8 + j * 0.5) % 1));
  });

  // weight: arrows press on the roof and into the soil
  const wAmt = weight > 0 && sink < 0.5 ? ease((weight - 0.2) / 0.3) : 0;
  weightArrows.visible = soilArrows.visible = wAmt > 0.01;
  weightArrows.children.forEach((a, j) => {
    a.scale.setScalar(Math.max(0.01, wAmt * 1.2));
    a.position.y = 12.2 + 0.3 * Math.sin(time * 6 + j);
  });
  soilArrows.children.forEach((a, j) => {
    a.scale.setScalar(Math.max(0.01, wAmt * (0.8 + 0.1 * Math.sin(time * 9 + j))));
  });

  // rain soaks the topsoil
  const storm = rainP >= 0 && rainP < 1.15 ? Math.min(ease(rainP / 0.15), 1 - ease((rainP - 0.9) / 0.25)) : 0;
  for (const r of rain) {
    r.visible = storm > 0.01;
    const { x, z, phase } = r.userData;
    r.position.set(x, 16 - ((time * 1.4 + phase) % 1) * 16, z);
  }
  sun.intensity = lerp(2.2, 0.6, storm);
  hemi.intensity = lerp(1.1, 0.75, storm);
  wet.material.opacity = 0.35 * ease(rainP / 0.6);

  // settle a little under the weight, then sink and tilt
  const settle = 0.25 * ease(weight);
  const s = ease(Math.min(1, Math.max(0, sink) / 0.9));
  const more = 0.25 * ease(crack);
  home.position.y = -settle - 1.6 * s - more;
  home.rotation.z = -0.12 * s - 0.03 * ease(crack);
  const tremble = sink > 0 && crack < 0.8 ? 0.03 * Math.sin(time * 40) : 0;
  home.position.x = tremble;
  bulges[0].scale.y = Math.max(0.01, 0.35 * s);
  bulges[1].scale.y = Math.max(0.01, 0.8 * s + 0.2 * ease(crack));

  // cracks spread, windows burst
  cracks.visible = crack > 0;
  crackMat.opacity = ease(crack / 0.4);
  cracks.children.forEach((c, i) => (c.visible = i / cracks.children.length < ease(crack / 0.5)));
  const burst = tl.since("crack") - 1.9;  // matches the shatter sound cue
  for (const sh of shards) {
    const { pane, v, off, spin } = sh.userData;
    sh.visible = burst > 0 && burst < 2.5;
    if (!sh.visible) continue;
    const o = pane.localToWorld(off.clone());
    sh.position.set(o.x + v.x * burst, Math.max(0.05, o.y + v.y * burst - 4.9 * burst * burst), o.z + v.z * burst);
    sh.rotation.set(spin * burst, spin * burst * 0.6, 0);
  }
  shattered.forEach(p => (p.visible = burst <= 0));

  camera.lookAt(look);
});
