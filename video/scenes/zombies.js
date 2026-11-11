// "What if you were dropped into a zombie invasion in the USA": cartoon (folk) style. Three sets: an American
// suburban street at dusk (lights go out), a picked-clean grocery aisle, and the Pentagon.
import { THREE, scene, camera, sun, hemi, setWaterTable, GROUND_BOTTOM, box, solid, canvasTex, V, ease, start, fxOptions } from "./kit.js";
import { folk, outline, canvasPlane, HEAD, SKINS, walkPose } from "./folk.js";

fxOptions.ao = false;
scene.fog = null;
setWaterTable(GROUND_BOTTOM - 1, 0);
const toon = (c, e = 0) => new THREE.MeshToonMaterial({ color: c, emissive: e });
const flat = c => new THREE.MeshBasicMaterial({ color: c });
const add = (m, x, y, z) => { m.position.set(x, y, z); scene.add(m); return m; };
const inked = []; const ink = m => { inked.push(m); return m; };
const SET = { street: 0, store: 100, plan: 200, map: 300 };
const SHOT_SET = { start: "street", hook: "street", power: "street", phone: "street", store: "store", plan: "plan", escape: "map", cta: "street" };
const skyTex = stops => canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); stops.forEach(([p, c]) => gr.addColorStop(p, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const DUSK = skyTex([[0, "#2b2350"], [0.45, "#7a3f6e"], [0.75, "#e0794a"], [1, "#f6b25a"]]);
const NIGHT = skyTex([[0, "#070a1c"], [0.6, "#141c3e"], [1, "#2a2f55"]]);
const DAY = skyTex([[0, "#4a8fd6"], [1, "#bfe0f5"]]);

// ---------- the street ----------
const lamps = [], homes = [];
let car, hazards = [], flag, tower;
{
  const asphalt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#3b3d42"; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},0.06)`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } }, 10, 3);
  const road = add(new THREE.Mesh(new THREE.PlaneGeometry(60, 9), new THREE.MeshToonMaterial({ map: asphalt })), 0, 0, 1); road.rotation.x = -Math.PI / 2;
  for (let x = -28; x < 28; x += 3) box(x, x + 1.6, 0.005, 0.012, 0.92, 1.08, solid(0xf2c230));      // centre line
  box(-30, 30, 0, 0.14, -5.2, -3.4, solid(0xcfcac0));                                                // sidewalk
  box(-30, 30, 0, 0.16, -3.5, -3.35, solid(0x9a958c));                                                // curb
  const lawn = add(new THREE.Mesh(new THREE.PlaneGeometry(60, 14), toon(0x5f9a45)), 0, 0.13, -12.2); lawn.rotation.x = -Math.PI / 2;
  // houses: lit windows that can go dark
  const homeSpec = [[-11, 0xe9d8b4, 0x8a3b32], [-4.5, 0xb9d3e6, 0x3a4a5a], [2, 0xf1e6d2, 0x5a3a2a], [8.5, 0xd6e4c4, 0x6a3030], [15, 0xe8c9a8, 0x3a3a4a]];
  for (const [x, wall, roofC] of homeSpec) {
    const z = -10;
    ink(add(new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.8, 4), toon(wall)), x, 1.53, z));
    const roof = ink(add(new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.7, 4), toon(roofC)), x, 3.78, z)); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.82);
    ink(add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.08), toon(0x6b4128)), x, 0.88, z + 2.02));
    const winM = flat(0xffd77a);
    for (const dx of [-1.4, 1.4]) { const w = add(new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), winM), x + dx, 1.75, z + 2.03); box(x + dx - 0.5, x + dx + 0.5, 1.3, 1.36, z + 2, z + 2.12, solid(0xf3efe6)); void w; }
    homes.push(winM);
    // a round toon tree beside each house
    ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.6, 8), toon(0x6b4a2b)), x + 3.1, 0.9, z + 2.4));
    ink(add(new THREE.Mesh(new THREE.SphereGeometry(1.05, 16, 12), toon(0x3f7a36)), x + 3.1, 2.3, z + 2.4));
  }
  // street lights
  for (const x of [-7, 0.8, 8.5]) {
    ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 8), toon(0x3a3d44)), x, 2.1, -3.8));
    ink(add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.0), toon(0x3a3d44)), x, 4.15, -3.35));
    const headM = flat(0xfff1c0);
    ink(add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.3), headM), x, 4.08, -2.9));
    const l = new THREE.PointLight(0xffd9a0, 10, 9, 1.4); l.position.set(x, 3.8, -2.8); scene.add(l);
    lamps.push({ headM, l });
  }
  // US flag on a pole
  ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 5, 8), toon(0xdedede)), -3.2, 2.6, -6));
  const flagTex = canvasTex(380, 200, (g, w, h) => {
    for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#c8102e"; g.fillRect(0, i * h / 13, w, h / 13 + 1); }
    g.fillStyle = "#1f3a7a"; g.fillRect(0, 0, w * 0.42, h * 7 / 13);
    g.fillStyle = "#fff"; for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { g.beginPath(); g.arc(12 + c * 25 + (r % 2) * 6, 11 + r * 20, 4, 0, 7); g.fill(); }
  });
  flag = add(new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.9, 24, 1), new THREE.MeshToonMaterial({ map: flagTex, side: THREE.DoubleSide })), -2.32, 4.6, -6);
  flag.userData.x0 = Float32Array.from(flag.geometry.attributes.position.array);
  // stop sign
  ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 8), toon(0x9a9a9a)), -5.2, 1.15, -3.7));
  const stop = add(canvasPlane(0.75, 0.75, (g, w, h) => {
    g.fillStyle = "#fff"; g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(w / 2 + w / 2 * Math.cos(a), h / 2 + h / 2 * Math.sin(a)); } g.fill();
    g.fillStyle = "#c8102e"; g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(w / 2 + w * 0.45 * Math.cos(a), h / 2 + h * 0.45 * Math.sin(a)); } g.fill();
    g.fillStyle = "#fff"; g.font = "bold 150px Arial"; g.textAlign = "center"; g.fillText("STOP", w / 2, h / 2 + 52);
  }), -5.2, 2.4, -3.66);
  void stop;
  // abandoned car, door open, hazards blinking
  car = new THREE.Group();
  const paint = toon(0xe04a36, 0x3a0e08), glass = toon(0x9fc3e0, 0x2a3a4a), dark = toon(0x2a2a2a), chrome = toon(0xc9ced6, 0x22252a);
  // body: a sedan side profile (bonnet, windscreen, roof, rear window, boot), extruded across and rounded off
  const W = 1.7, b = 0.1;
  const prof = [[-2.0, 0.3], [2.0, 0.3], [2.1, 0.55], [2.0, 0.82], [0.95, 0.95], [0.35, 1.42], [-0.85, 1.45], [-1.5, 1.0], [-2.0, 0.92], [-2.1, 0.55]];
  const shape = new THREE.Shape(); prof.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: W - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 4, curveSegments: 4 });
  bodyGeo.translate(0, 0, -(W - 2 * b) / 2);
  car.add(ink(new THREE.Mesh(bodyGeo, paint)));
  // glass: side windows (with a door pillar) and the front and rear screens, sitting just proud of the body
  const sideWin = [[0.86, 1.0], [0.36, 1.37], [-0.8, 1.4], [-1.38, 1.02]];
  for (const sz of [-1, 1]) {
    const ws = new THREE.Shape(); sideWin.forEach(([x, y], i) => i ? ws.lineTo(x, y) : ws.moveTo(x, y)); ws.closePath();
    const wm = new THREE.Mesh(new THREE.ShapeGeometry(ws), glass); wm.position.z = sz * (W / 2 + 0.005); if (sz < 0) wm.rotation.y = Math.PI, wm.scale.x = -1; car.add(wm);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.02), paint); pillar.position.set(-0.22, 1.2, sz * (W / 2 + 0.01)); car.add(pillar);
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.02), dark); line.position.set(-0.2, 0.62, sz * (W / 2 + 0.01)); car.add(line);           // door seam
    for (const hx of [0.4, -0.75]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.03), chrome); h.position.set(hx, 0.8, sz * (W / 2 + 0.015)); car.add(h); }
    const mirror = ink(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.16), paint)); mirror.position.set(0.82, 1.02, sz * (W / 2 + 0.08)); car.add(mirror);
  }
  const screen = (x0, y0, x1, y1, w) => {
    // a quad on the sloped face between (x0,y0) and (x1,y1), pushed out along the face normal
    let nx = -(y1 - y0), ny = x1 - x0; if (ny < 0) { nx = -nx; ny = -ny; } const nl = Math.hypot(nx, ny); nx = nx / nl * (b + 0.015); ny = ny / nl * (b + 0.015);
    const ix = (x1 - x0) * 0.06, iy = (y1 - y0) * 0.06, hw = w / 2;
    const P = [[x0 + ix, y0 + iy], [x1 - ix, y1 - iy]];
    const v = new Float32Array([P[0][0] + nx, P[0][1] + ny, -hw, P[0][0] + nx, P[0][1] + ny, hw, P[1][0] + nx, P[1][1] + ny, hw, P[1][0] + nx, P[1][1] + ny, -hw]);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(v, 3)); g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
    const m = new THREE.Mesh(g, glass.clone()); m.material.side = THREE.DoubleSide; return car.add(m);
  };
  screen(0.95, 0.95, 0.35, 1.42, W - 0.25); screen(-1.5, 1.0, -0.85, 1.45, W - 0.25);
  // front: headlights, grille, bumper; back: tail lights and bumper
  for (const sz of [-1, 1]) {
    const hl = ink(new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), flat(0xfff6d0))); hl.scale.set(0.35, 0.8, 1.2); hl.position.set(2.1, 0.7, sz * 0.55); car.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.34), flat(0xd61f1f)); tl.position.set(-2.16, 0.74, sz * 0.58); car.add(tl);
  }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.7), dark); grille.position.set(2.17, 0.6, 0); car.add(grille);
  for (const bx of [2.2, -2.2]) { const bp = ink(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, W + 0.06), chrome)); bp.position.set(bx, 0.38, 0); car.add(bp); }
  const plate = canvasPlane(0.42, 0.14, (g, w, h) => { g.fillStyle = "#f4f4f4"; g.fillRect(0, 0, w, h); g.strokeStyle = "#1f3a7a"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = "#1f3a7a"; g.font = "bold 110px Arial"; g.textAlign = "center"; g.fillText("ZMB 88", w / 2, h * 0.82); });
  plate.position.set(2.29, 0.38, 0); plate.rotation.y = Math.PI / 2; car.add(plate);
  // wheels with tyres, hubcaps and dark arches behind them
  for (const [px, pz] of [[1.3, 1], [1.3, -1], [-1.3, 1], [-1.3, -1]]) {
    const z = pz * (W / 2 - 0.08);
    const arch = new THREE.Mesh(new THREE.CircleGeometry(0.44, 24, 0, Math.PI), dark); arch.position.set(px, 0.32, pz * (W / 2 + 0.006)); if (pz < 0) arch.rotation.y = Math.PI; car.add(arch);
    const wh = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 22), dark)); wh.rotation.x = Math.PI / 2; wh.position.set(px, 0.36, z); car.add(wh);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.28, 16), chrome); hub.rotation.x = Math.PI / 2; hub.position.set(px, 0.36, z); car.add(hub);
  }
  for (const [px, pz] of [[2.12, 0.78], [2.12, -0.78], [-2.12, 0.78], [-2.12, -0.78]]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.12), flat(0xff9a1a)); h.position.set(px, 0.62, pz); car.add(h); hazards.push(h); }
  car.position.set(3.4, 0, 1.6); car.rotation.y = -0.85; scene.add(car);
  // cell tower poking up behind the houses
  tower = new THREE.Group();
  const steel = toon(0x8a8f99);
  for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 11, 6), steel); leg.position.set(dx * 0.7, 5.5, dz * 0.7); leg.rotation.set(dz * 0.04, 0, -dx * 0.04); tower.add(leg); }
  for (let y = 1; y < 11; y += 1.2) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.04), steel); r.position.y = y; r.rotation.z = 0.5; tower.add(r); }
  for (let i = 0; i < 3; i++) { const pan = ink(new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.1), toon(0xe8e8e8))); const a = i * Math.PI * 2 / 3; pan.position.set(0.45 * Math.cos(a), 10.4, 0.45 * Math.sin(a)); pan.rotation.y = -a; tower.add(pan); }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), flat(0xff2a2a)); beacon.position.y = 11.2; tower.add(beacon); tower.userData.beacon = beacon;
  tower.position.set(5.5, 0, -22); scene.add(tower);
}

// ---------- characters ----------
const MAX = { body: 0x2f8fd6, outfit: "polo", hairStyle: "swoop", hair: 0x9a5a22, shoes: 0xffffff };
const maxSt = folk({ ...MAX, face: "surprised" }); scene.add(maxSt);
const ZSKIN = 0xa9c98f;
const zSpec = [
  { body: 0x7a8f5a, hair: 0x3a3226, hairStyle: "bowl" }, { body: 0x9a4a4a, hair: 0x1d1a1a, hairStyle: "slick" },
  { body: 0x5a6a9a, hair: 0x6a4a2a, hairStyle: "swoop" }, { body: 0xb8a070, hair: 0x2a2a2a, hairStyle: "bun" },
  { body: 0x6a5a7a, hair: 0x4a3a2a, hairStyle: "swoop" }, { body: 0x8a7a5a, hairStyle: "none", hat: "hardhat" },
];
const mkZombie = o => { const z = folk({ shoes: 0x3a3a3a, ...o, skin: ZSKIN, torn: true, face: "zombie" }); scene.add(z); return z; };
// street zombies: [start x, start z, phase]
const streetZ = zSpec.map((o, i) => { const z = mkZombie(o); z.userData.p = [[-2.4, -1.4], [2.5, -0.9], [-3.1, 2.7], [3.3, 2.0], [-1.0, -3.2], [1.3, -2.8]][i]; z.userData.ph = i * 1.3; return z; });

// phone: battery dying
const phone = new THREE.Group();
phone.add(ink(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.03), toon(0x1c1c1e))));
const phoneScreen = pct => canvasPlane(0.18, 0.37, (g, w, h) => {
  if (pct <= 0) { g.fillStyle = "#050505"; g.fillRect(0, 0, w, h); return; }
  g.fillStyle = "#e9edf2"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#333"; g.lineWidth = 12; g.strokeRect(w / 2 - 90, h * 0.2, 170, 80); g.fillStyle = "#333"; g.fillRect(w / 2 + 80, h * 0.2 + 22, 18, 36);
  g.fillStyle = "#d62f2f"; g.fillRect(w / 2 - 80, h * 0.2 + 10, Math.max(10, 150 * pct / 20), 60);
  g.font = "bold 80px Arial"; g.textAlign = "center"; g.fillText(pct + "%", w / 2, h * 0.52);
  g.font = "bold 46px Arial"; g.fillStyle = "#555"; g.fillText("No Service", w / 2, h * 0.66);
});
const screens = [3, 1, 0].map(p => { const s = phoneScreen(p); s.position.z = 0.017; phone.add(s); return s; });
phone.scale.setScalar(1.3); scene.add(phone);

// ---------- grocery aisle ----------
const storeZ = [];
let can;
{
  const X = SET.store;
  const tiles = canvasTex(128, 128, (g, w, h) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? "#e8e6e0" : "#c9c6be"; g.fillRect(x * 64, y * 64, 64, 64); } }, 8, 14);
  const fl = add(new THREE.Mesh(new THREE.PlaneGeometry(10, 30), new THREE.MeshToonMaterial({ map: tiles })), X, 0, -8); fl.rotation.x = -Math.PI / 2;
  add(new THREE.Mesh(new THREE.PlaneGeometry(14, 6), toon(0xe8e2d4)), X, 3, -22);
  const ceil = add(new THREE.Mesh(new THREE.PlaneGeometry(10, 30), toon(0xd8d6d0)), X, 4.2, -8); ceil.rotation.x = Math.PI / 2;
  for (let z = 2; z > -20; z -= 4) add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 2.2), flat(0xf4f8ff)), X, 4.17, z);
  for (const side of [-1, 1]) {
    const sx = X + side * 1.9;
    ink(box(sx - 0.45, sx + 0.45, 0, 2.6, -20, 1.5, solid(0xe0e0e0)));
    for (const y of [0.35, 0.95, 1.55, 2.15]) {
      box(sx - 0.55, sx + 0.55, y - 0.04, y, -20, 1.5, solid(0xb0b4ba));
      // a few leftover items, the rest picked clean
      for (let z = 1.2; z > -19; z -= 0.45) if (Math.sin(z * 12.9 + y * 7 + side) > 0.82) ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 10), toon([0xd9534f, 0xf0ad4e, 0x5bc0de, 0x5cb85c][Math.abs(Math.round(z * 3)) % 4])), sx - side * 0.25, y + 0.12, z));
    }
  }
  const sign = add(canvasPlane(1.5, 0.45, (g, w, h) => { g.fillStyle = "#1f6fb5"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = "bold 62px Arial"; g.textAlign = "center"; g.fillText("CANNED FOOD", w / 2, h / 2 + 22); }), X, 3.3, -6);
  void sign;
  // the very last can, on the front shelf
  can = ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 14), toon(0xe0a92c)), X + 1.35, 1.08, 0.9));
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.113, 0.113, 0.14, 14, 1, true), toon(0xd62f2f)); can.add(label);
  for (let i = 0; i < 3; i++) { const z = mkZombie(zSpec[i]); z.userData.p = [[X - 0.6, -3.2], [X + 0.6, -4.6], [X - 0.05, -6.2]][i]; z.userData.ph = i * 2.1; storeZ.push(z); }
}
const maxStore = folk({ ...MAX, face: "scared" }); scene.add(maxStore);

// ---------- the Pentagon ----------
let general, plan;
{
  const X = SET.plan;
  const grass = add(new THREE.Mesh(new THREE.PlaneGeometry(80, 60), toon(0x6aa84f)), X, 0, -15); grass.rotation.x = -Math.PI / 2;
  const pent = (r, hole) => { const s = new THREE.Shape(); for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + i * Math.PI * 2 / 5; s[i ? "lineTo" : "moveTo"](r * Math.cos(a), r * Math.sin(a)); } if (hole) { const p = new THREE.Path(); for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + i * Math.PI * 2 / 5; p[i ? "lineTo" : "moveTo"](hole * Math.cos(a), hole * Math.sin(a)); } s.holes.push(p); } return s; };
  const winTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#d9d4c7"; g.fillRect(0, 0, w, h); g.fillStyle = "#4a5a6a"; for (let y = 8; y < h; y += 20) g.fillRect(8, y, 48, 8); }, 1, 1);
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping; winTex.repeat.set(1.2, 0.9);
  const geo = new THREE.ExtrudeGeometry(pent(16, 9), { depth: 3.2, bevelEnabled: false });
  const pb = ink(new THREE.Mesh(geo, [toon(0xb8b4aa), new THREE.MeshToonMaterial({ map: winTex })]));
  pb.rotation.x = -Math.PI / 2; pb.position.set(X + 4, 0, -30); pb.rotation.z = 0.35; scene.add(pb);
  // monument sign
  ink(box(X - 1.2, X + 1.2, 0, 3.4, -6.4, -5.8, solid(0x8a8478)));
  add(canvasPlane(2.2, 0.6, (g, w, h) => { g.fillStyle = "#f4f1ea"; g.font = "bold 62px Georgia, serif"; g.textAlign = "center"; g.fillText("THE PENTAGON", w / 2, h / 2 + 32); }), X, 3.0, -5.78);
  // flagpole
  ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 5.5, 8), toon(0xdedede)), X + 2.8, 2.75, -5.5));
  general = folk({ body: 0x56633a, outfit: "general", hat: "officer", hatColor: 0x56633a, hairStyle: "none", shoes: 0x1e1e1e, face: "smug" });
  general.position.set(X + 0.5, 0, -0.6); general.rotation.y = -0.35; scene.add(general);
  general.setFace("smug", { mustache: "#8a8a8a" });
  plan = new THREE.Group();
  plan.add(ink(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.8, 0.03), toon(0xc9a86a))));
  const doc = canvasPlane(0.58, 0.76, (g, w, h) => {
    g.fillStyle = "#f6efdc"; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h * 0.17); g.rotate(-0.12); g.strokeStyle = "#c0392b"; g.lineWidth = 10; g.strokeRect(-150, -36, 300, 72); g.fillStyle = "#c0392b"; g.font = "bold 50px Arial"; g.textAlign = "center"; g.fillText("TOP SECRET", 0, 18); g.restore();
    g.fillStyle = "#1b1b1b"; g.textAlign = "center"; g.font = "bold 58px Arial"; g.fillText("ZOMBIE", w / 2, h * 0.38); g.fillText("WAR PLAN", w / 2, h * 0.47);
    g.font = "bold 34px Arial"; g.fillStyle = "#555"; g.fillText("CONPLAN 8888", w / 2, h * 0.56);
    // a little zombie doodle
    const cx = w / 2, cy = h * 0.77; g.fillStyle = "#a9c98f"; g.strokeStyle = "#1b1b1b"; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, 60, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#1b1b1b"; g.beginPath(); g.arc(cx - 22, cy - 10, 12, 0, 7); g.fill(); g.beginPath(); g.arc(cx + 22, cy - 6, 7, 0, 7); g.fill(); g.fillRect(cx - 24, cy + 22, 48, 8);
  });
  doc.position.z = 0.017; plan.add(doc);
  plan.scale.setScalar(1.1); scene.add(plan);
}
const maxPlan = folk({ ...MAX, face: "surprised" }); maxPlan.position.set(SET.plan - 0.65, 0, -0.3); maxPlan.rotation.y = 0.45; scene.add(maxPlan);

// ---------- the escape map: a war-room wall map, route from Max to the Pentagon ----------
const US = [[-124.7,48.4],[-124,46.3],[-124.1,42],[-124.2,40.3],[-122.4,37.8],[-120.6,34.6],[-117.1,32.5],[-114.7,32.7],[-111,31.3],[-108.2,31.3],[-106.5,31.8],[-104.5,29.6],[-103,29],[-101.4,29.8],[-99.5,27.5],[-97.4,25.9],[-97.4,27.8],[-94.7,29.4],[-91,29.2],[-89.4,29.1],[-89.6,30.2],[-86.5,30.4],[-85,29.6],[-83.6,29.9],[-82.7,28],[-81.8,26.1],[-80.4,25.2],[-80.1,26.8],[-81,29.5],[-81.4,30.7],[-80.9,32.1],[-79.2,33.2],[-77.9,33.9],[-75.5,35.2],[-76.3,37],[-75.1,38.8],[-74,40.6],[-71.9,41.3],[-70,41.7],[-70.6,42.6],[-70.2,43.7],[-67,44.8],[-67.8,47.1],[-69.2,47.4],[-71.5,45],[-74.9,45],[-76.8,43.6],[-79,43.2],[-79.1,42.7],[-82.7,41.7],[-83.4,42.3],[-82.4,43],[-83.5,46.1],[-84.8,46.5],[-89.6,48],[-95.2,49],[-123.3,49]];
const MW = 1024, MH = 720;
const proj = ([lon, lat]) => [60 + (lon + 125) / 59 * (MW - 120), 70 + (49.5 - lat) / 25 * (MH - 150)];
const ROUTE = [[-108.5, 39.0], [-104.9, 39.7], [-101.5, 39.0], [-98.5, 38.6], [-95.5, 39.4], [-92.3, 38.4], [-90.2, 38.7], [-87.8, 39.5], [-84.5, 39.3], [-81.5, 39.8], [-79.8, 39.2], [-77.06, 38.87]].map(proj);
const ZPTS = [[-103.4, 40.6], [-100.0, 37.9], [-96.5, 40.5], [-93.0, 37.4], [-89.0, 40.4], [-85.6, 38.2], [-82.6, 40.7], [-79.0, 37.9]].map(proj);
let mapMesh, mapCtx;
{
  const X = SET.map;
  add(new THREE.Mesh(new THREE.PlaneGeometry(14, 8), toon(0x5d6b58)), X, 3, -1.2);
  const fl = add(new THREE.Mesh(new THREE.PlaneGeometry(14, 10), toon(0x6b6458)), X, 0, 3); fl.rotation.x = -Math.PI / 2;
  mapMesh = canvasPlane(3.7, 3.7 * MH / MW, () => {});
  mapCtx = mapMesh.material.map.image.getContext("2d");
  mapMesh.material.transparent = false;
  add(mapMesh, X, 2.35, -1.1);
  ink(box(X - 1.95, X + 1.95, 2.35 - 1.42, 2.35 + 1.42, -1.2, -1.14, solid(0x5b3a22)));
}
const mapCanvas = mapMesh.material.map.image;
function drawMap(k, time) {
  const g = mapCtx, sx = mapCanvas.width / MW, sy = mapCanvas.height / MH;
  g.setTransform(sx, 0, 0, sy, 0, 0);
  g.fillStyle = "#cfe3ef"; g.fillRect(0, 0, MW, MH);                              // sea
  g.strokeStyle = "rgba(60,90,120,0.15)"; g.lineWidth = 2; for (let x = 0; x < MW; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, MH); g.stroke(); } for (let y = 0; y < MH; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(MW, y); g.stroke(); }
  g.beginPath(); US.map(proj).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
  g.fillStyle = "#f1e3b8"; g.fill(); g.strokeStyle = "#5a4a2a"; g.lineWidth = 7; g.stroke();
  g.fillStyle = "#3a2e1a"; g.font = "bold 46px Arial"; g.textAlign = "left"; g.fillText("ZOMBIE ESCAPE ROUTE", 40, 52);
  // route drawn progressively
  const prog = Math.min(1, Math.max(0, (k - 0.08) / 0.62));
  const seg = []; let total = 0; for (let i = 1; i < ROUTE.length; i++) { const d = Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]); seg.push(d); total += d; }
  let left = total * prog, head = ROUTE[0];
  g.strokeStyle = "#d62f2f"; g.lineWidth = 9; g.setLineDash([22, 14]); g.beginPath(); g.moveTo(...ROUTE[0]);
  for (let i = 1; i < ROUTE.length && left > 0; i++) { const f = Math.min(1, left / seg[i - 1]); head = [ROUTE[i - 1][0] + (ROUTE[i][0] - ROUTE[i - 1][0]) * f, ROUTE[i - 1][1] + (ROUTE[i][1] - ROUTE[i - 1][1]) * f]; g.lineTo(...head); left -= seg[i - 1]; }
  g.stroke(); g.setLineDash([]);
  // the Pentagon: a little gold pentagon and star at Washington, DC
  const [px, py] = ROUTE[ROUTE.length - 1];
  g.fillStyle = "#e0b84a"; g.strokeStyle = "#3a2e1a"; g.lineWidth = 6; g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; g.lineTo(px + 26 * Math.cos(a), py + 26 * Math.sin(a)); } g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#1f3a7a"; g.font = "bold 34px Arial"; g.textAlign = "center"; g.fillText("PENTAGON", px - 10, py - 40);
  // YOU pin
  const [ux, uy] = ROUTE[0];
  g.fillStyle = "#2f8fd6"; g.beginPath(); g.arc(ux, uy, 16, 0, 7); g.fill(); g.strokeStyle = "#111"; g.lineWidth = 5; g.stroke();
  g.fillStyle = "#1b1b1b"; g.font = "bold 34px Arial"; g.fillText("YOU", ux, uy + 52);
  // zombies popping up along the way as the route reaches them
  ZPTS.forEach(([zx, zy], i) => {
    const near = Math.min(...ROUTE.map(([rx, ry]) => Math.hypot(rx - zx, ry - zy)));
    const passed = Math.hypot(head[0] - ROUTE[0][0], head[1] - ROUTE[0][1]) + 30 > Math.hypot(zx - ROUTE[0][0], zy - ROUTE[0][1]);
    void near;
    if (!passed) return;
    const r = 20 * (1 + 0.1 * Math.sin(time * 6 + i));
    g.fillStyle = "#a9c98f"; g.strokeStyle = "#1b1b1b"; g.lineWidth = 5; g.beginPath(); g.arc(zx, zy, r, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#1b1b1b"; g.beginPath(); g.arc(zx - 8, zy - 5, 5, 0, 7); g.fill(); g.beginPath(); g.arc(zx + 9, zy - 3, 3, 0, 7); g.fill(); g.fillRect(zx - 9, zy + 9, 18, 4);
  });
  // Max's head travelling along the route
  g.fillStyle = "#fff"; g.strokeStyle = "#111"; g.lineWidth = 5; g.beginPath(); g.arc(head[0], head[1], 20, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#9a5a22"; g.beginPath(); g.arc(head[0], head[1] - 8, 20, Math.PI * 1.05, Math.PI * 1.95); g.fill();
  // the big question
  if (k > 0.72) {
    const q = Math.min(1, (k - 0.72) / 0.08), wob = 0.08 * Math.sin(time * 5);
    g.save(); g.translate(MW / 2 + 120, MH / 2 + 10); g.rotate(wob); g.scale(q, q);
    g.font = "900 360px Arial Black, Arial"; g.textAlign = "center"; g.lineWidth = 22; g.strokeStyle = "#1b1b1b"; g.strokeText("?", 0, 120); g.fillStyle = "#d62f2f"; g.fillText("?", 0, 120);
    g.restore();
  }
  mapMesh.material.map.needsUpdate = true;
}
const maxMap = folk({ ...MAX, face: "talk" }); maxMap.position.set(SET.map - 0.75, 0, 1.2); maxMap.rotation.y = 0.35; scene.add(maxMap);
const pointer = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.9, 6), toon(0x8a5a2b))); scene.add(pointer);

inked.forEach(outline);
// [prop, holder, offset from the left hand to the prop's centre]
const held = [[phone, maxSt, V(0, 0.2, -0.03)], [plan, general, V(0, 0.3, -0.02)]];

// ---------- timeline ----------
const cams = {
  hook:  [V(0, 2.1, 7.6),    V(0, 1.4, -1)],
  power: [V(0.4, 2.2, 7.6),  V(0.2, 2.0, -3)],
  phone: [V(-0.2, 1.55, 5.6), V(0.35, 1.8, -2)],
  store: [V(99.75, 1.8, 5.6), V(99.85, 1.35, -4)],
  plan:  [V(200.05, 1.8, 5.2), V(200.05, 1.6, -1)],
  cta:   [V(3.3, 3.1, 10.5), V(3.4, 1.45, 1.4)],
  escape: [V(300.1, 2.0, 7.4), V(300.05, 1.75, -1)],
};
function shamble(z, time, x, zz, faceTo) {
  const ph = z.userData.ph;
  z.position.set(x, 0.0 + 0.02 * Math.abs(Math.sin(time * 2.6 + ph)), zz);
  z.rotation.y = Math.atan2(faceTo.x - x, faceTo.z - zz);
  const w = walkPose(time * 0.55 + ph, 1);
  z.pose({ ...w, armL: [0.3 + 0.08 * Math.sin(time * 2 + ph), 1.45, 0.1], armR: [0.3 + 0.08 * Math.sin(time * 2.2 + ph + 1), 1.4, 0.15],
    headRoll: 0.25 * Math.sin(time * 1.3 + ph), headTilt: 0.15, lean: 0.12, sway: 0.08 * Math.sin(time * 1.1 + ph) });
}
let lastSky = null;
start((time, tl) => {
  const shot = tl.shot, k = tl.k, st0 = tl.since(shot);
  const set = SHOT_SET[shot] || "street";
  const [p, l] = cams[shot] || cams.hook;
  camera.position.copy(p).lerp(l, 0.05 * ease(k));
  camera.lookAt(l);

  // lighting: dusk with lights on, then night after the power fails; the store and Pentagon are daylight
  const night = set === "street" && shot !== "hook";
  const out = shot === "power" ? [0.3, 0.42, 0.54, 0.62, 0.7, 0.78, 0.86, 0.94] : null;   // streetlights then houses switch off in turn
  let lightsOn = (i) => shot === "hook" ? true : out ? k < out[i] : false;
  lamps.forEach((L, i) => { const on = lightsOn(i); L.l.intensity = on ? 10 : 0; L.headM.color.setHex(on ? 0xfff1c0 : 0x3a3a3a); });
  homes.forEach((m, i) => m.color.setHex(lightsOn(i + 3) ? 0xffd77a : 0x1a2235));
  const sky = set !== "street" ? DAY : shot === "hook" || (shot === "power" && k < 0.5) ? DUSK : NIGHT;
  if (sky !== lastSky) { scene.background = sky; lastSky = sky; }
  const dark = set === "street" ? (shot === "hook" ? 0 : shot === "power" ? Math.min(1, Math.max(0, (k - 0.3) / 0.6)) : 1) : 0;
  sun.color.set(set === "street" ? 0xffc89a : 0xfff4e0).lerp(new THREE.Color(0xe4e8ff), dark);
  sun.intensity = set === "street" ? 1.9 - 0.8 * dark : 2.4;
  hemi.intensity = set === "street" ? 1.2 - 0.35 * dark : 1.5;
  hemi.color.set(set === "street" ? 0xffd2c0 : 0xffffff).lerp(new THREE.Color(0xd0d6ff), dark);
  const em = 0x6a6a6a;
  HEAD.emissive.setHex(em); SKINS.forEach(m => m.emissive.setHex(em));

  // street business
  for (const [i, h] of hazards.entries()) h.material.color.setHex(Math.sin(time * 7) > 0 ? 0xff9a1a : 0x4a2a10);
  void hazards;
  const fp = flag.geometry.attributes.position, x0 = flag.userData.x0;
  for (let i = 0; i < fp.count; i++) { const x = x0[i * 3]; fp.setZ(i, 0.09 * Math.sin(x * 3.5 - time * 6) * (x + 0.85)); }
  fp.needsUpdate = true;
  tower.userData.beacon.material.color.setHex(shot === "phone" && k > 0.55 ? 0x2a0a0a : (Math.sin(time * 4) > 0 ? 0xff2a2a : 0x5a1010));

  // Max in the street
  const target = maxSt.position;
  maxSt.visible = set === "street";
  phone.visible = shot === "phone";
  maxSt.position.set(0, 0, 1.2); maxSt.rotation.set(0, 0, 0); maxSt.scale.set(1, 1, 1);
  if (shot === "hook") {
    // dropped from the sky: falls, squashes on landing, then spins round at the zombies
    const fall = Math.min(1, st0 / 0.45);
    maxSt.position.y = 3.6 * (1 - fall * fall);
    const land = Math.max(0, st0 - 0.45);
    const squash = land < 0.35 ? 1 - 0.28 * Math.sin(land / 0.35 * Math.PI) : 1;
    maxSt.scale.set(2 - squash, squash, 2 - squash);
    maxSt.setFace(fall < 1 ? "crazy" : land < 0.8 ? "surprised" : "scared", land > 0.8 ? { sweat: true } : {});
    const look = land > 0.8 ? 0.7 * Math.sin((land - 0.8) * 4.5) : 0;
    maxSt.pose(fall < 1 ? { armL: [2.6, 0, 0.3], armR: [2.6, 0, 0.3], legL: [0.4, 0.5], legR: [-0.3, 0.6] }
      : { armL: [0.8 + 0.15 * Math.sin(time * 9), 0.4, 0.6], armR: [0.8 + 0.15 * Math.sin(time * 9 + 1), 0.4, 0.6], headTurn: look, lean: -0.08 });
  }
  if (shot === "power") {
    // flinches each time a light goes out, looking toward it
    maxSt.setFace(k < 0.3 ? "surprised" : "scared", { sweat: k > 0.3 });
    const i = out.findIndex(o => k < o), f = i < 0 ? 1 : Math.max(0, 1 - (out[i] - k) * 12);
    maxSt.pose({ armL: [0.5, 0.9, 1.6], armR: [0.5, 0.9, 1.6], headTurn: 0.5 * Math.sin(k * 9), headTilt: -0.15, lean: -0.1 - 0.06 * f, sway: 0.03 * Math.sin(time * 14) });
    maxSt.position.y = 0.02 * Math.abs(Math.sin(time * 14));
  }
  if (shot === "phone") {
    // stares at the battery, shakes the phone, then it dies
    screens.forEach((s, i) => s.visible = i === (k < 0.3 ? 0 : k < 0.55 ? 1 : 2));
    maxSt.setFace(k < 0.55 ? "grumpy" : "scared", k > 0.55 ? { sweat: true } : {});
    const shake = k > 0.3 && k < 0.6 ? 0.18 * Math.sin(time * 22) : 0;
    maxSt.pose({ armL: [0.25 + shake, 0.95, 1.5], armR: [0.3, 0.2, 0.3], headTilt: 0.12, headTurn: 0.25, lean: k > 0.55 ? -0.1 : 0.04 });
    phone.rotation.set(-0.1, -0.25, 0.08 + shake);
  }
  if (shot === "cta") {
    // safe (for now) on the car roof, waving, zombies reaching up
    const roofC = car.localToWorld(V(-0.25, 1.55, 0));
    maxSt.position.set(roofC.x, roofC.y + 0.03 * Math.abs(Math.sin(time * 6)), roofC.z);
    maxSt.setFace("grin");
    maxSt.pose({ armL: [2.6, 0, 0.5 + 0.45 * Math.sin(time * 9)], armR: [0.4, 0.2, 0.3], headRoll: 0.08 * Math.sin(time * 4.5) });
  }

  // street zombies close in on Max, slowly
  streetZ.forEach((z, i) => {
    z.visible = set === "street";
    if (!z.visible) return;
    if (shot === "cta") {
      // crowded round the outside of the car (ends and the near side), reaching up at Max on the roof
      const [ox, oz] = [[-1.1, 1.5], [0.5, -1.5], [1.4, 1.55], [-1.6, -1.55], [0.2, 1.6], [-0.5, -1.6]][i];
      const c = Math.cos(car.rotation.y), sn = Math.sin(car.rotation.y);
      const x = car.position.x + ox * c + oz * sn, zz = car.position.z - ox * sn + oz * c;
      z.position.set(x + 0.05 * Math.sin(time * 1.7 + i), 0.03 * Math.abs(Math.sin(time * 2.6 + i)), zz);
      const toMax = Math.atan2(maxSt.position.x - x, maxSt.position.z - zz), toCam = Math.atan2(camera.position.x - x, camera.position.z - zz);
      z.rotation.y = toMax + 0.45 * Math.atan2(Math.sin(toCam - toMax), Math.cos(toCam - toMax));
      z.pose({ ...walkPose(time * 0.4 + i, 1), armL: [2.4, 0.4, 0.3 + 0.3 * Math.sin(time * 5 + i)], armR: [2.3, 0.4, 0.3 + 0.3 * Math.sin(time * 5.5 + i)], headTilt: -0.35, headRoll: 0.2 * Math.sin(time * 1.3 + i), lean: -0.05 });
      return;
    }
    const [sx, sz] = z.userData.p;
    const goal = shot === "cta" ? V(car.position.x, 0, car.position.z) : V(target.x, 0, target.z);
    const d = V(goal.x - sx, 0, goal.z - sz); const len = d.length();
    const near = shot === "cta" ? 1.5 : 1.0;
    const walked = Math.max(0, Math.min(len - near, 0.33 * (st0 - (shot === "hook" ? 0.9 : -1.5 - i * 0.3))));
    const x = sx + d.x / len * walked, zz = sz + d.z / len * walked;
    if (shot === "hook" && st0 < 0.9) { z.position.set(sx, 0, sz); z.rotation.y = 0.5 * Math.sin(i); z.pose({ headRoll: 0.2 * Math.sin(time + i), lean: 0.1 }); return; }
    shamble(z, time, x, zz, goal);
  });

  // the store: Max grabs the last can as zombies shuffle down the aisle
  maxStore.visible = storeZ[0].visible = storeZ[1].visible = storeZ[2].visible = set === "store";
  if (set === "store") {
    const grab = Math.min(1, Math.max(0, (k - 0.15) / 0.2));
    maxStore.position.set(SET.store + 0.35, 0.02 * Math.abs(Math.sin(time * 5)), 1.0);
    maxStore.rotation.y = 1.0 - 1.15 * ease(Math.min(1, Math.max(0, (k - 0.4) / 0.15)));
    maxStore.setFace(k < 0.45 ? "surprised" : "scared", k > 0.45 ? { sweat: true } : {});
    const hold = k > 0.4;
    maxStore.pose({ armR: [0.25, 0.2, 0.3], armL: hold ? [0.3 + 0.08 * Math.sin(time * 9), 1.0, 1.4] : [0.4 + 0.3 * grab, 1.2 * grab, 0.3], headTurn: hold ? -0.5 + 0.25 * Math.sin(time * 4) : 0, lean: 0.05 });
    if (k > 0.3) { maxStore.updateMatrixWorld(true); can.position.copy(maxStore.userData.parts.armL.elbow.localToWorld(V(0, -0.25, 0))).add(V(0, 0.1, 0.02)); }
    else can.position.set(SET.store + 1.35, 1.08, 0.9);
    storeZ.forEach((z, i) => { const [sx, sz] = z.userData.p; shamble(z, time, sx, sz + 0.5 * st0, V(maxStore.position.x, 0, maxStore.position.z + 4)); });
  }

  // the Pentagon: a general proudly shows the plan, Max can't believe it
  if (set === "plan") {
    const show = ease(Math.min(1, k / 0.3));
    general.pose({ armL: [0.35, 0.6 + 0.5 * show, 1.4 - 0.2 * show], armR: k > 0.45 ? [0.5, 1.2, 0.3 + 0.15 * Math.sin(time * 8)] : [0.3, 0.2, 0.3], headTilt: -0.05, headRoll: 0.06 * Math.sin(time * 3), lean: -0.05 });
    general.position.y = 0.015 * Math.abs(Math.sin(time * 3));
    maxPlan.setFace(k < 0.4 ? "surprised" : "crazy");
    maxPlan.pose({ armL: [0.8 + 0.15 * Math.sin(time * 7), 0.5, 1.5], armR: [0.8 + 0.15 * Math.sin(time * 7 + 1), 0.5, 1.5], headTurn: 0.3 * Math.sin(time * 6) * (k > 0.4 ? 1 : 0), lean: -0.1 });
    maxPlan.position.y = 0.04 * Math.abs(Math.sin(time * 7));
    plan.rotation.set(0, -0.15 + 0.4 * (1 - show), 0.05);
  }

  // the escape map: Max points along the route, then turns to us: how do you get there?
  maxMap.visible = pointer.visible = set === "map";
  if (set === "map") {
    drawMap(k, time);
    const turn = k > 0.72;
    maxMap.setFace(turn ? "scared" : "talk", turn ? { sweat: true } : {});
    maxMap.rotation.y = turn ? 0.1 : 0.55;
    maxMap.position.y = 0.02 * Math.abs(Math.sin(time * 5));
    const reach = turn ? 0 : 0.25 * Math.sin(k * 9);
    maxMap.pose(turn ? { armL: [1.1, 0.4, 1.2], armR: [1.1, 0.4, 1.2], headTilt: 0.05, headRoll: 0.12 * Math.sin(time * 3) }
      : { armR: [0.25, 0.2, 0.3], armL: [0.9 + reach, 1.2, 0.2], headTurn: 0.6, headTilt: -0.15 });
    maxMap.updateMatrixWorld(true);
    const hand = maxMap.userData.parts.armL.elbow.localToWorld(V(0, -0.25, 0));
    const tip = maxMap.userData.parts.armL.elbow.localToWorld(V(0, -1.0, 0));
    pointer.position.copy(hand).lerp(tip, 0.5); pointer.lookAt(tip); pointer.rotateX(Math.PI / 2);
    pointer.visible = !turn;
  }

  // props live in world space (so they always face the camera) but follow the hand
  for (const [prop, who, off] of held) {
    who.updateMatrixWorld(true);
    prop.position.copy(who.userData.parts.armL.elbow.localToWorld(V(0, -0.25, 0))).add(off);
  }
});
