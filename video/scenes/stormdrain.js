// "Where rain goes after the storm drain": rain runs down the gutter with litter, drops through the
// grate, bypasses the sewer, rushes through a storm pipe and pours untreated into a river.
import {
  THREE, scene, camera, sun, hemi, GROUND_BOTTOM, box, groundBox, solid, setWaterTable, canvasTex,
  house, tree, cloud, ease, lerp, V, moveCamera, start, pipeBand, flow, waterBlob,
} from "./kit.js";

const RIVER = { x0: 76, x1: 92, bed: -3, surface: -1.6 };
groundBox(-30, RIVER.x0, GROUND_BOTTOM, 0, -40, 0);
groundBox(RIVER.x0, RIVER.x1, GROUND_BOTTOM, RIVER.bed, -40, 0);
groundBox(RIVER.x1, 130, GROUND_BOTTOM, 0, -40, 0);

// ---------- street: sidewalk at the front, curb, road running along x ----------
const ROAD = { x0: -30, x1: 70 };
const CURB_Z = -1.5;
const roadMat = new THREE.MeshLambertMaterial({ color: 0x3c3f44 });
box(ROAD.x0, ROAD.x1, 0, 0.1, -10, CURB_Z, () => roadMat);
box(ROAD.x0, ROAD.x1, 0, 0.32, CURB_Z, 0, solid(0xbdb8ae));                // sidewalk
for (let x = ROAD.x0; x < ROAD.x1; x += 3) box(x, x + 1.6, 0.1, 0.11, -6.1, -5.9, solid(0xf2f2f2));
// parked car
const car = new THREE.Group();
box(-0.1, 4.1, 0.45, 1.3, -4.4, -2.4, solid(0xc0392b), car);
box(0.8, 3.0, 1.3, 2.0, -4.3, -2.5, solid(0xc0392b), car);
box(0.9, 2.9, 1.35, 1.95, -4.32, -2.48, solid(0x9fc4dc), car);
for (const [x, z] of [[0.8, -2.4], [3.2, -2.4], [0.8, -4.4], [3.2, -4.4]]) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16), new THREE.MeshLambertMaterial({ color: 0x1b1b1b }));
  w.rotation.x = Math.PI / 2;
  w.position.set(x, 0.45, z);
  car.add(w);
}
car.position.set(-7, 0, 0);
scene.add(car);

// storm drain grate in the gutter
const DRAIN_X = 6;
box(DRAIN_X - 0.7, DRAIN_X + 0.7, 0.1, 0.12, CURB_Z - 0.9, CURB_Z, solid(0x2a2c2f));
for (let i = 0; i < 6; i++) box(DRAIN_X - 0.6 + i * 0.24, DRAIN_X - 0.52 + i * 0.24, 0.12, 0.13, CURB_Z - 0.85, CURB_Z - 0.05, solid(0x111111));

// gutter water: a shallow sheet along the curb
const gutterMat = new THREE.MeshPhongMaterial({ color: 0x5aa7d8, transparent: true, opacity: 0, shininess: 90 });
const gutter = box(-12, DRAIN_X, 0.1, 0.15, CURB_Z - 0.8, CURB_Z, () => gutterMat);

// ---------- underground: catch basin, storm pipe to the river, sewer pipe going elsewhere ----------
pipeBand([V(DRAIN_X, 0, 0), V(DRAIN_X, -2.4, 0)], 0.55);               // catch basin
const STORM = [V(DRAIN_X, -2.4, 0), V(20, -2.9, 0), V(66, -3.3, 0), V(RIVER.x0, -0.7, 0)];
pipeBand(STORM, 0.55);
const SEWER = [V(-14, -4.6, 0), V(30, -5.6, 0), V(44, -9.5, 0)];      // dives away towards the plant
pipeBand(SEWER, 0.4);

// outfall: a concrete headwall on the river bank with the pipe mouth
box(RIVER.x0 - 0.3, RIVER.x0 + 0.05, -2.2, 0.3, -5, -0.6, solid(0xb8b3a8));
const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), new THREE.MeshBasicMaterial({ color: 0x1a1c1e }));
mouth.rotation.y = Math.PI / 2;
mouth.position.set(RIVER.x0 + 0.06, -0.8, -2.8);
scene.add(mouth);
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.1, 8, 24), new THREE.MeshLambertMaterial({ color: 0x8c9196 }));
ring.rotation.y = Math.PI / 2;
ring.position.copy(mouth.position);
scene.add(ring);

// river with an oil sheen that spreads from the outfall
box(RIVER.x0, RIVER.x1, RIVER.bed, RIVER.surface, -40, 0, () => new THREE.MeshPhongMaterial({ color: 0x3f8fc8, transparent: true, opacity: 0.88, shininess: 90 }));
const sheen = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({
  transparent: true, opacity: 0, depthWrite: false,
  map: canvasTex(128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    ["#ff5fa2", "#ffd84d", "#5ff0a8", "#5fb4ff", "#b07bff", "rgba(0,0,0,0)"].forEach((c, i, a) => grad.addColorStop(i / (a.length - 1), c));
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  }),
}));
sheen.rotation.x = -Math.PI / 2;
sheen.position.set(RIVER.x0 + 3, RIVER.surface + 0.02, -3);
scene.add(sheen);

// ---------- backdrop ----------
for (const [x, z, w, s] of [[-14, -18, 10, 0.9], [2, -19, 11, 1], [18, -18, 10, 0.9], [34, -20, 11, 1], [50, -19, 10, 0.9], [64, -21, 10, 0.9], [100, -22, 10, 0.9]])
  house(x, z, w, s);
for (const [x, z, s] of [[-6, -13, 1.1], [10, -12, 1.2], [26, -13, 1], [42, -12, 1.2], [58, -13, 1.1], [72, -10, 1.3], [95, -9, 1.2], [88, -16, 1.4]]) tree(x, z, s);
const clouds = [[-8, 18, -40, 2.2], [20, 21, -50, 2.6], [50, 19, -45, 2.4], [82, 22, -50, 2.6]].map(([x, y, z, s]) => cloud(x, y, z, s));

// ---------- rain ----------
const rainMat = new THREE.MeshBasicMaterial({ color: 0xe4f1ff, transparent: true, opacity: 0.85 });
const rain = [];
for (let i = 0; i < 420; i++) {
  const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.05), rainMat);
  r.userData = { x: -14 + Math.random() * 30, z: -12 + Math.random() * 13, phase: Math.random() };
  scene.add(r);
  rain.push(r);
}

// ---------- litter: travels down the gutter, then out of the outfall and down the river ----------
let seed = 9;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const litterKinds = [
  () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 12), new THREE.MeshLambertMaterial({ color: 0xd62d2d })); m.rotation.z = Math.PI / 2; return m; }, // can
  () => new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.25), new THREE.MeshLambertMaterial({ color: [0xffc531, 0x3fa9f5, 0xff6f91][Math.floor(rand() * 3)] })), // wrapper
  () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6), new THREE.MeshLambertMaterial({ color: 0xf1e6d0 })); m.rotation.z = Math.PI / 2; return m; }, // butt
  () => new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshLambertMaterial({ color: [0xd98b2b, 0x9bb83a][Math.floor(rand() * 2)] })), // leaf
];
const litter = [];
for (let i = 0; i < 16; i++) {
  const holder = new THREE.Group();
  holder.add(litterKinds[i % litterKinds.length]());
  if (i % 4 === 3) holder.children[0].scale.set(1, 0.15, 0.7);
  holder.userData = {
    gx: -11 + rand() * 14, gz: CURB_Z - 0.2 - rand() * 0.5, gspeed: 1.2 + rand() * 0.8,
    rx: rand() * 6, rz: -0.6 - rand() * 4, rspeed: 0.7 + rand() * 0.6, spin: rand() * 3,
  };
  holder.scale.setScalar(2);
  scene.add(holder);
  litter.push(holder);
}

// ---------- water flows ----------
const rainwater = waterBlob(0x6fb6e6, 0x163a55);
const sewage = waterBlob(0x8a7a42, 0x2a2410);
const fGutter = flow([V(-11, 0.16, CURB_Z - 0.4), V(DRAIN_X, 0.16, CURB_Z - 0.4), V(DRAIN_X, -0.2, CURB_Z - 0.4)], 50, rainwater, 0.12, 2.2);
const fBasin = flow([V(DRAIN_X, -0.1, 0.05), V(DRAIN_X, -2.4, 0.05)], 18, rainwater, 0.16, 0.9);
const fStorm = flow(STORM.map(p => V(p.x, p.y, 0.05)), 170, rainwater, 0.26, 6);
const fSewer = flow(SEWER.map(p => V(p.x, p.y, 0.05)), 60, sewage, 0.2, 4);
// the gush from the outfall: blobs arcing out into the river
const gush = [];
for (let i = 0; i < 70; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.14 + rand() * 0.1, 8, 6), rainwater);
  m.userData = { phase: i / 70, vx: 2.4 + rand() * 1.4, vz: (rand() - 0.5) * 0.8, vy: 0.4 + rand() * 0.8 };
  scene.add(m);
  gush.push(m);
}

// ---------- timeline ----------
const cams = {
  start:   { pos: V(0, 9, 26),     look: V(0, 0, -6) },
  intro:   { pos: V(0, 5.5, 17),   look: V(0, 0.5, -5) },
  gutter:  { pos: V(1, 4.6, 6.5),  look: V(2.5, 0, -2.6) },
  drain:   { pos: V(DRAIN_X, 4.2, 7),   look: V(DRAIN_X, -0.8, -1.4) },
  pipe:    { pos: V(10, -1.5, 16), look: V(12, -3.6, -1) },
  rush:    { pos: V(46, -1.2, 15), look: V(46, -3, -1) },
  outfall: { pos: V(80, 1.5, 9),   look: V(77.5, -1.1, -2.6) },
  trash:   { pos: V(82, 4.5, 12),  look: V(81, -1.4, -4) },
  outro:   { pos: V(80, 7.5, 24),  look: V(80, 0, -8) },
};

start((time, tl) => {
  const look = moveCamera(cams, tl);
  setWaterTable(GROUND_BOTTOM - 1, time);
  const at = n => tl.since(n);
  const intro = tl.prog("intro"), pipeP = tl.prog("pipe"), outfallP = tl.prog("outfall");

  // the storm: rain from the intro until the water heads underground
  const storm = intro < 0 ? 0 : Math.min(ease(intro / 0.2), 1 - ease((pipeP - 0.1) / 0.4));
  for (const r of rain) {
    r.visible = storm > 0.01;
    const { x, z, phase } = r.userData;
    r.position.set(x, 14 - ((time * 1.5 + phase) % 1) * 14, z);
  }
  sun.intensity = lerp(2.2, 0.55, storm);
  hemi.intensity = lerp(1.1, 0.7, storm);
  roadMat.color.set(storm > 0.4 ? 0x2b2e33 : 0x3c3f44);
  clouds.forEach(c => c.traverse(o => o.material?.color?.set(storm > 0.4 ? 0x9aa3ad : 0xffffff)));
  gutterMat.opacity = 0.75 * ease((intro - 0.4) / 0.6) * (1 - ease((pipeP - 0.2) / 0.5));

  // water's journey
  fGutter(at("intro") - 1.0, at("rush"));
  fBasin(at("drain") - 0.1, at("rush") + 0.5);
  fStorm(at("drain") + 0.6);
  fSewer(pipeP > 0 ? at("pipe") + 4 : -1);

  // gush out of the outfall into the river
  const gt = at("outfall") + 0.3;
  for (const m of gush) {
    const { phase, vx, vz, vy } = m.userData;
    const u = ((time * 1.3 + phase) % 1);
    m.visible = gt > 0 && gt * 1.3 > phase;
    m.position.set(RIVER.x0 + 0.1 + vx * u, -0.8 + vy * u - 4.9 * u * u * 0.6, -2.8 + vz * u);
    if (m.position.y < RIVER.surface) m.visible = false;
  }
  sheen.material.opacity = 0.55 * ease((tl.prog("trash") - 0.3) / 0.4);
  const sh = 1 + 4.5 * ease((tl.prog("trash") - 0.3) / 0.7);
  sheen.scale.set(sh * 1.4, sh, 1);

  // litter: rides the gutter into the drain, then floats out of the outfall
  for (const l of litter) {
    const { gx, gz, gspeed, rx, rz, rspeed, spin } = l.userData;
    const g = at("gutter") + 0.2, r = at("outfall") + 0.6;
    if (outfallP < 0 || r < 0) {
      const x = gx + gspeed * Math.max(0, g);
      l.visible = intro > 0.3 && x < DRAIN_X;
      l.position.set(x, 0.24, gz);
      l.rotation.y = spin + time * 0.8;
    } else {
      const x = RIVER.x0 + 0.6 + rspeed * r + rx * Math.min(1, r / 3);
      l.visible = x < RIVER.x1 - 0.5;
      l.position.set(x, RIVER.surface + 0.05 + 0.05 * Math.sin(time * 3 + spin), -2.8 + rz * Math.min(1, r / 2.5));
      l.rotation.y = spin + time * 0.5;
    }
  }

  camera.lookAt(look);
});
