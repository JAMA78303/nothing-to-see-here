// "Where your trash actually goes": bin -> garbage truck -> lined landfill pit filled in layers,
// leachate drained by pipes, methane piped to a flare, readable old newspaper, then a park on top.
import {
  THREE, scene, camera, sun, hemi, GROUND_BOTTOM, box, groundBox, solid, setWaterTable, canvasTex,
  house, tree, cloud, ease, lerp, V, moveCamera, start, pipeBand, flow, waterBlob,
} from "./kit.js";

// ---------- the pit: a trapezoid cut into the ground (x 6..18 at the top, 8.5..15.5 at the bottom) ----------
const PIT = { x0: 6, x1: 18, bx0: 8.5, bx1: 15.5, bottom: -11, zBack: -14 };
groundBox(-40, PIT.x0, GROUND_BOTTOM, 0, -40, 0);
groundBox(PIT.x1, 60, GROUND_BOTTOM, 0, -40, 0);
groundBox(PIT.x0, PIT.x1, GROUND_BOTTOM, 0, -40, PIT.zBack);
groundBox(PIT.x0, PIT.x1, GROUND_BOTTOM, PIT.bottom, PIT.zBack, 0);

// a 2D polygon extruded from zBack to the cut face
function prism(points, matFn, z0 = PIT.zBack, z1 = 0) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false }), matFn());
  m.position.z = z0;
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  return m;
}
const tex = (draw, rep) => { const t = canvasTex(256, 256, draw); t.repeat.set(rep, rep); return t; };
const soilTex = tex((g, w, h) => {
  g.fillStyle = "#8a5a33"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) { g.fillStyle = ["#6e4524", "#a6703f", "#5a381c"][i % 3]; g.fillRect(Math.random() * w, Math.random() * h, 4, 3); }
}, 0.35);
const soil = () => new THREE.MeshLambertMaterial({ map: soilTex });
// slope wedges of natural soil
const xAt = (side, y) => side < 0 ? lerp(PIT.x0, PIT.bx0, -y / -PIT.bottom) : lerp(PIT.x1, PIT.bx1, -y / -PIT.bottom);
prism([[PIT.x0, 0], [PIT.x0, PIT.bottom], [PIT.bx0, PIT.bottom]], soil);
prism([[PIT.x1, 0], [PIT.bx1, PIT.bottom], [PIT.x1, PIT.bottom]], soil);

// liner: a clay band, then black plastic, following the pit's sides and floor
function band(offset0, offset1, matFn) {
  const o = d => [[xAt(-1, 0) + d, 0], [xAt(-1, PIT.bottom) + d * 0.9, PIT.bottom + d], [xAt(1, PIT.bottom) - d * 0.9, PIT.bottom + d], [xAt(1, 0) - d, 0]];
  const outer = o(offset0), inner = o(offset1).reverse();
  return prism([...outer, ...inner], matFn);
}
band(0, 0.45, solid(0xb5703f));
band(0.45, 0.62, solid(0x1d1f22));
const gravelTop = PIT.bottom + 1.1;
prism([[xAt(-1, PIT.bottom) + 0.6, PIT.bottom + 0.62], [xAt(1, PIT.bottom) - 0.6, PIT.bottom + 0.62],
  [xAt(1, gravelTop) - 0.62, gravelTop], [xAt(-1, gravelTop) + 0.62, gravelTop]], solid(0x9a9690));
// perforated drain pipes in the gravel, running back from the cut face
for (const x of [10, 12, 14]) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 13.5, 16), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
  p.rotation.x = Math.PI / 2;
  p.position.set(x, PIT.bottom + 0.88, -6.8);
  scene.add(p);
  const end = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), new THREE.MeshBasicMaterial({ color: 0x2b2b2b }));
  end.position.set(x, PIT.bottom + 0.88, 0.02);
  scene.add(end);
}

// ---------- trash layers: each a slab of garbage capped by a thin layer of dirt ----------
const trashTex = tex((g, w, h) => {
  g.fillStyle = "#5c5246"; g.fillRect(0, 0, w, h);
  const cols = ["#222", "#e8e8e8", "#3a6ea5", "#c0392b", "#f1c40f", "#7f8c8d", "#27ae60", "#d35400", "#ecf0f1", "#2c3e50"];
  for (let i = 0; i < 260; i++) {
    g.fillStyle = cols[i % cols.length];
    g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(Math.random() * 3);
    if (i % 3) g.fillRect(-9, -5, 6 + Math.random() * 14, 4 + Math.random() * 8);
    else { g.beginPath(); g.ellipse(0, 0, 7 + Math.random() * 8, 5 + Math.random() * 5, 0, 0, 7); g.fill(); }
    g.restore();
  }
}, 0.45);
const LAYER = 1.3, COVER = 0.28;
const layers = [];
for (let y = gravelTop; y < -0.2; y += LAYER + COVER) {
  const y1 = Math.min(-0.05, y + LAYER), y2 = Math.min(0, y1 + COVER);
  const trapezoid = (a, b) => [[xAt(-1, a) + 0.62, a], [xAt(1, a) - 0.62, a], [xAt(1, b) - 0.62, b], [xAt(-1, b) + 0.62, b]];
  const g = new THREE.Group();
  for (const [a, b, mf] of [[y, y1, () => new THREE.MeshLambertMaterial({ map: trashTex })], [y1, y2, soil]]) {
    if (b <= a) continue;
    // build around its own base so it can grow upward
    const shape = new THREE.Shape(trapezoid(a, b).map(([px, py]) => new THREE.Vector2(px, py - y)));
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: -PIT.zBack, bevelEnabled: false }), mf());
    m.position.z = PIT.zBack;
    m.receiveShadow = true;
    g.add(m);
  }
  g.position.y = y;
  scene.add(g);
  layers.push({ g, base: y, top: y2 });
}
const FULL = layers.at(-1).top;

// a readable old newspaper in the middle layer, on the cut face
const paperTex = canvasTex(256, 192, (g, w, h) => {
  g.fillStyle = "#efe6cf"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#222"; g.font = "bold 30px Georgia, serif"; g.textAlign = "center";
  g.fillText("MORNING PAPER", w / 2, 36);
  g.fillRect(12, 46, w - 24, 3);
  g.font = "bold 20px Georgia, serif"; g.fillText("CITY OPENS NEW DUMP", w / 2, 76);
  g.fillStyle = "#777";
  for (let r = 0; r < 8; r++) for (let c = 0; c < 3; c++) g.fillRect(14 + c * 80, 92 + r * 11, 70, 5);
});
const paperLayer = layers[3];
const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.12), new THREE.MeshBasicMaterial({ map: paperTex }));
paper.position.set(12.4, paperLayer.base + 0.62 - paperLayer.base, 0.03);
paper.rotation.z = 0.12;
paperLayer.g.add(paper);

// ---------- methane wells, a pipe to the flare, and leachate pipe to a tank ----------
const wellMat = new THREE.MeshLambertMaterial({ color: 0xe8e4dc });
for (const x of [10, 14]) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 11, 12), wellMat);
  w.position.set(x, -3.6, -1.2);
  scene.add(w);
}
box(9.8, 21.2, 1.75, 1.95, -1.3, -1.1, () => wellMat);
box(20.9, 21.3, 0, 4.2, -1.4, -1.0, solid(0x8c9196));               // flare stack
const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 12), new THREE.MeshBasicMaterial({ color: 0xff9a2e }));
flame.position.set(21.1, 5.0, -1.2);
scene.add(flame);
const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 10), new THREE.MeshBasicMaterial({ color: 0xffe36b }));
flameCore.position.set(21.1, 4.7, -1.2);
scene.add(flameCore);
const flameLight = new THREE.PointLight(0xff9a2e, 0, 10);
flameLight.position.set(21.1, 5, -1);
scene.add(flameLight);
pipeBand([V(PIT.bx0 + 0.6, PIT.bottom + 0.88, 0), V(3, PIT.bottom + 0.88, 0), V(3, 0, 0)], 0.2);
box(1.4, 4.6, 0, 2.2, -4, -1.6, solid(0x6d7a86));                    // leachate tank
box(1.3, 4.7, 2.2, 2.4, -4.1, -1.5, solid(0x56606a));

// ---------- the house, the bin and the garbage truck ----------
house(-15, -11, 10);
tree(-23, -9, 1.2);
tree(-6, -12, 1.1);
tree(26, -12, 1.3);
tree(-30, -22, 1.4);
for (const [x, y, z, s] of [[-16, 20, -45, 2], [6, 23, -55, 2.6], [26, 21, -50, 2.2]]) cloud(x, y, z, s);

const bin = new THREE.Group();
box(-0.45, 0.45, 0, 1.3, -0.45, 0.45, solid(0x2e7d32), bin);
box(-0.5, 0.5, 1.3, 1.42, -0.5, 0.5, solid(0x1b5e20), bin);
const BIN_HOME = V(-12.6, 0, -1.6);
bin.position.copy(BIN_HOME);
scene.add(bin);

const truck = new THREE.Group();
box(0, 2.2, 0.5, 2.6, -1.1, 1.1, solid(0xf4f4f4, 0x222222), truck);   // cab
box(0.3, 2.1, 1.5, 2.4, -1.12, 1.12, solid(0x9fc4dc), truck);         // windscreen side
box(-5.4, 0, 0.5, 3.2, -1.2, 1.2, solid(0x2e7d32), truck);            // body
box(-5.8, -5.4, 0.6, 2.4, -1.15, 1.15, solid(0x1b5e20), truck);       // hopper
const ram = box(-5.35, -4.9, 0.7, 3.0, -1.0, 1.0, solid(0xcfd8dc), truck); // compactor blade (visible when the body opens)
for (const [x, z] of [[1.2, 1.15], [1.2, -1.15], [-3.8, 1.15], [-3.8, -1.15], [-2.6, 1.15], [-2.6, -1.15]]) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16), new THREE.MeshLambertMaterial({ color: 0x1b1b1b }));
  w.rotation.x = Math.PI / 2;
  w.position.set(x, 0.55, z);
  truck.add(w);
}
const TRUCK_HOME = V(-9.6, 0, -3.4);
truck.position.copy(TRUCK_HOME);
scene.add(truck);
const bags = [];
for (let i = 0; i < 8; i++) {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshLambertMaterial({ color: [0x222222, 0xdddddd, 0x3a6ea5][i % 3] }));
  b.userData = { dx: (Math.random() - 0.5) * 0.5, delay: i * 0.06 };
  scene.add(b);
  bags.push(b);
}

// bulldozer that flattens each layer
const dozer = new THREE.Group();
box(-0.9, 0.9, 0.3, 1.2, -0.7, 0.7, solid(0xf4b400), dozer);
box(-0.5, 0.5, 1.2, 1.9, -0.5, 0.5, solid(0xf4b400), dozer);
box(0.9, 1.05, 0.15, 1.1, -0.9, 0.9, solid(0x5f6368), dozer);
box(-1.0, 1.0, 0, 0.35, -0.75, 0.75, solid(0x2b2b2b), dozer);
scene.add(dozer);

// ---------- the park on top ----------
const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x6fbf4a }));
mound.position.set(12, 0, -6.5);
mound.receiveShadow = true;
scene.add(mound);
const parkTrees = [[9.5, -5], [14.5, -7], [12, -9.5]].map(([x, z]) => tree(x, z, 0.7));
const people = [];
for (const [x, z, c] of [[10.8, -2.5, 0xe74c3c], [13.2, -3.2, 0x3498db], [12.2, -2.2, 0xf1c40f], [14.2, -4.5, 0x9b59b6]]) {
  const p = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.45, 4, 8), new THREE.MeshLambertMaterial({ color: c }));
  body.position.y = 0.4;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshLambertMaterial({ color: 0xf1c27d }));
  head.position.y = 0.85;
  p.add(body, head);
  p.userData = { x, z };
  scene.add(p);
  people.push(p);
}

// ---------- rain, leachate drips, gas bubbles ----------
const rainMat = new THREE.MeshBasicMaterial({ color: 0xe4f1ff, transparent: true, opacity: 0.85 });
const rain = [];
for (let i = 0; i < 260; i++) {
  const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.05), rainMat);
  r.userData = { x: 3 + Math.random() * 18, z: -10 + Math.random() * 11, phase: Math.random() };
  scene.add(r);
  rain.push(r);
}
const juiceMat = waterBlob(0x7a5a1e, 0x2a1d08);
const drips = [];
for (let i = 0; i < 46; i++) {
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.06, 8, 6), juiceMat);
  d.userData = { x: 8.6 + Math.random() * 6.8, phase: Math.random() };
  scene.add(d);
  drips.push(d);
}
const fLeach = flow([V(PIT.bx0 + 0.6, PIT.bottom + 0.88, 0.05), V(3, PIT.bottom + 0.88, 0.05), V(3, 0, 0.05)], 30, juiceMat, 0.14, 2.2);
const gasMat = new THREE.MeshBasicMaterial({ color: 0xd8f07a, transparent: true, opacity: 0.85 });
const gas = [];
for (let i = 0; i < 60; i++) {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.09 + Math.random() * 0.08, 8, 6), gasMat);
  b.userData = { x: 9 + Math.random() * 6, y0: PIT.bottom + 1.5 + Math.random() * 6, phase: Math.random() };
  scene.add(b);
  gas.push(b);
}
const fGas = flow([V(10, -2, -1.0), V(10, 1.85, -1.0), V(21.1, 1.85, -1.0), V(21.1, 4.2, -1.0)], 26, gasMat, 0.1, 2.0);

// ---------- timeline ----------
const cams = {
  start:    { pos: V(-14, 6, 22),   look: V(-14, 1.5, -3) },
  intro:    { pos: V(-13, 3.4, 12.5), look: V(-13, 1.5, -3) },
  truck:    { pos: V(-9, 4, 15),    look: V(-9, 1.4, -3) },
  landfill: { pos: V(12, 2.5, 25),  look: V(12, -4.5, -4) },
  layers:   { pos: V(12, 2, 24),    look: V(12, -4, -3) },
  juice:    { pos: V(12, -1, 23),   look: V(12, -5.5, -2) },
  gas:      { pos: V(13.5, 1, 27),  look: V(13.5, -2.5, -4) },
  slow:     { pos: V(12.4, -4.3, 5.2), look: V(12.4, -4.7, -1) },
  outro:    { pos: V(12, 7, 27),    look: V(12, 0.5, -6) },
  cta:      { pos: V(12, 8, 30),    look: V(12, 1, -6) },
};

start((time, tl) => {
  const look = moveCamera(cams, tl);
  setWaterTable(GROUND_BOTTOM - 1, time);
  const truckP = tl.prog("truck"), landfillP = tl.prog("landfill"), layersP = tl.prog("layers");
  const juiceP = tl.prog("juice"), gasP = tl.prog("gas"), outroP = tl.prog("outro");

  // bin tips into the truck, the ram crushes, then the truck drives off toward the landfill
  const lift = ease((truckP - 0.05) / 0.25) * (1 - ease((truckP - 0.4) / 0.2));
  bin.position.set(BIN_HOME.x + 1.3 * lift, 2.3 * lift, BIN_HOME.z - 1.2 * lift);
  bin.rotation.x = -2.3 * lift;
  const dump = tl.since("truck") - 0.5;
  for (const b of bags) {
    const { dx, delay } = b.userData;
    const t = dump - delay;
    b.visible = t > 0 && t < 0.5 && truckP < 1;
    b.position.set(BIN_HOME.x + 1.6 + dx, 3 - 9 * t * t, BIN_HOME.z - 1.8);
  }
  ram.position.x = -0.3 * Math.sin(Math.PI * Math.min(1, Math.max(0, (truckP - 0.45) / 0.25)));
  const drive = ease((truckP - 0.62) / 0.38) + (landfillP > 0 ? 1 : 0);
  truck.position.set(TRUCK_HOME.x + 14 * Math.min(drive, 1), 0, TRUCK_HOME.z);
  truck.visible = landfillP < 0.6;

  // the pit fills layer by layer while the dozer works on top; full from then on
  const fill = landfillP < 1 ? 0 : layersP < 1 ? ease(layersP / 0.95) * layers.length : layers.length;
  layers.forEach((L, i) => {
    const k = Math.min(1, Math.max(0, fill - i));
    L.g.visible = k > 0.01;
    L.g.scale.y = Math.max(0.01, k);
  });
  const topNow = fill > 0 ? lerp(gravelTop, FULL, fill / layers.length) : gravelTop;
  dozer.visible = layersP > 0 && layersP < 1.1;
  dozer.position.set(12 + 2.6 * Math.sin(time * 1.8), topNow, -3.5);
  dozer.rotation.y = Math.cos(time * 1.8) > 0 ? 0 : Math.PI;

  // rain makes the toxic juice, which drips down and is piped to the tank
  const storm = juiceP >= 0 && juiceP < 1 ? Math.min(ease(juiceP / 0.15), 1 - ease((juiceP - 0.6) / 0.3)) : 0;
  for (const r of rain) {
    r.visible = storm > 0.01;
    const { x, z, phase } = r.userData;
    r.position.set(x, 13 - ((time * 1.5 + phase) % 1) * 13, z);
  }
  sun.intensity = lerp(2.2, 0.8, storm);
  hemi.intensity = lerp(1.1, 0.8, storm);
  const dripsOn = juiceP > 0.25 && tl.prog("slow") < 0;
  for (const d of drips) {
    const { x, phase } = d.userData;
    const u = (time * 0.35 + phase) % 1;
    d.visible = dripsOn;
    d.position.set(x, lerp(FULL - 0.2, gravelTop - 0.2, u), 0.06);
  }
  fLeach(juiceP > 0.4 ? tl.since("juice") - 0.4 * (tl.since("juice") / juiceP) : -1, outroP > 0 ? tl.since("outro") : -1);

  // methane bubbles rise to the wells, travel the pipe and burn at the flare
  const slowP = tl.prog("slow");
  const gasOn = gasP > 0 && slowP < 0;
  for (const b of gas) {
    const { x, y0, phase } = b.userData;
    const u = (time * 0.5 + phase) % 1;
    const wx = x < 12 ? 10 : 14;
    b.visible = gasOn;
    b.position.set(lerp(x, wx, u), lerp(y0, FULL, u), 0.07);
  }
  fGas(gasP > 0 ? tl.since("gas") : -1, outroP > 0 ? tl.since("outro") : -1);
  const burning = gasP > 0.15;
  flame.visible = flameCore.visible = burning;
  const flick = 1 + 0.15 * Math.sin(time * 23) + 0.1 * Math.sin(time * 37);
  flame.scale.set(flick, flick * (1 + 0.2 * Math.sin(time * 17)), flick);
  flameLight.intensity = burning ? 6 * flick : 0;

  // park: a grassy hill grows over the full landfill, then trees and people appear
  const park = ease(outroP / 0.5);
  mound.visible = park > 0.01;
  mound.scale.set(6.4, Math.max(0.01, 2.4 * park), 6.4);
  parkTrees.forEach((t, i) => {
    const k = ease((outroP - 0.4 - i * 0.1) / 0.3);
    t.visible = k > 0.01;
    t.scale.setScalar(Math.max(0.01, 0.7 * k));
    const r = Math.hypot(t.position.x - 12, (t.position.z + 6.5) / 6.4 * 6.4) / 6.4;
    t.position.y = 2.4 * park * Math.sqrt(Math.max(0, 1 - r * r));
  });
  people.forEach((p, i) => {
    const k = outroP > 0.6 + i * 0.05;
    p.visible = k;
    const { x, z } = p.userData;
    const r = Math.hypot(x - 12, z + 6.5) / 6.4;
    p.position.set(x + 0.3 * Math.sin(time + i), 2.4 * park * Math.sqrt(Math.max(0, 1 - r * r)), z);
  });

  camera.lookAt(look);
});
