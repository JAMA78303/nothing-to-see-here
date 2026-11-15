// "What if you were dropped into a zombie outbreak in England?" in the 2D-characters-in-a-3D-world style.
// Sets along x: LONDON 0 (open-top bus, terraces, clock tower), SHOP 100 (sports shop), TUBE 200, ROAD 300 (gridlock),
// CASTLE 400 (on its hill), YARD 500 (inside: gate, well), WALLS 600 (the battlements).
import { THREE, scene, camera, sun, hemi, V, ease, lerp, start } from "./kit.js";
import { setupStyle, setLight, aimSun, ctex, lam, lit, add, box, makeCard, faceCamera, look, untone, CREAM, NOINK, MAX, maxHair } from "./style2kit.js";
import { facadeHD, cobbleHD } from "./vendor/paint.js";

setupStyle({ ink: { widthNear: 4.2, widthFar: 2.8 }, blur: { aperture: 0.0024, maxblur: 0.007 } });
const SET = { london: 0, shop: 100, tube: 200, road: 300, castle: 400, yard: 500, walls: 600, pub: 700 };
const SHOT_SET = { hook: "london", bat: "shop", tube: "tube", bike: "road", pub: "pub", castle: "castle", well: "yard", loop: "walls" };
const rnd = (() => { let s = 41; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const T = (o, opts = {}, sc = 1) => makeCard({ ...o, skin: o.skin ?? CREAM }, { mode: "stand", expr: "neutral", ...opts }, null, sc);
const label = (text, w, h, bg, fg, font) => { const t = ctex(512, Math.round(512 * h / w), (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, W / 2, H / 2 + 4); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };

// ---------------- the cast ----------------
const max = makeCard({ ...MAX, jacket: "#2f5d8a" }, { mode: "stand", expr: "m_neutral", seed: 4, facing: 0, faceFront: true }, (p) => maxHair(p, MAX.hair, 4, 0));
const sayMax = (o = {}) => max.userData.draw({ facing: 0, faceFront: true, ...o });
const ZSKIN = ["#a9c48e", "#9cb88a", "#b5c99a"], ZCOAT = ["#5a6a5a", "#7a4a3a", "#4a5a7a", "#6a5a4a", "#7a6a3a"];
const zombies = [...Array(14)].map((_, i) => T({ jacket: ZCOAT[i % 5], pants: "#3b3b3b", boots: "#2a2a2a", hat: "hair", hair: ["#3a2a1a", "#6a5a4a", "#2a2a2a"][i % 3], skin: ZSKIN[i % 3] }, { expr: "stern", seed: 120 + i }));
const zDraw = (z, i, time, o = {}) => z.userData.draw({ expr: i % 2 ? "stern" : "shock", side: true, faceFront: true, mode: "push", pose: 0.9, seed: 120 + i, ...o });
// the cricket bat Max carries from shot 2 on
const bat = new THREE.Group(); scene.add(bat);
box(0.11, 0.52, 0.04, lam({ color: "#e8d6a0" }), 0, -0.26, 0, bat); box(0.035, 0.26, 0.035, lam({ color: "#3a2a1a" }), 0, 0.13, 0, bat);

// ---------------- LONDON: terraces, a clock tower, an open-top bus ----------------
const bus = new THREE.Group(); scene.add(bus);
{
  const X = SET.london;
  const road = add(new THREE.PlaneGeometry(200, 10), lam({ color: "#5a5a60" }), X, 0, 0); road.rotation.x = -Math.PI / 2;
  const pave = add(new THREE.PlaneGeometry(200, 6), lam({ color: "#a8a49a" }), X, 0.08, -8); pave.rotation.x = -Math.PI / 2;
  const STY = [{ wall: "#b5543c", shutter: "#f2f2ea" }, { wall: "#d8cdb8", shutter: "#2f3a4a" }, { wall: "#a84c36", shutter: "#f2f2ea" }, { wall: "#e2d8c4", shutter: "#3a4a3a" }];
  for (let i = 0; i < 12; i++) { const w = 5, h = 9 + (i % 3), st = STY[i % 4], x = X - 30 + i * 5.2; box(w, h, 4, [lam({ color: st.wall }), lam({ color: st.wall }), lam({ color: "#6f7a86" }), lam({ color: st.wall }), lam({ map: facadeHD(`uk${i}`, w, h, { ...st, brick: i % 2 === 0, door: true }) }), lam({ color: st.wall })], x, h / 2, -13); }
  // Big Ben: a tall stone tower, four clock faces, a belfry and a steep green spire
  const T0 = V(X - 1.5, 0, -30), stoneTex = ctex(128, 512, (g, w, h) => { g.fillStyle = "#cdb98a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#9a8458"; g.lineWidth = 3; for (let x = 8; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 40) { g.fillStyle = "#b5a070"; g.fillRect(0, y, w, 5); } });
  const stone = lam({ map: stoneTex });
  box(4.4, 30, 4.4, stone, T0.x, 15, T0.z);
  box(5.2, 6, 5.2, stone, T0.x, 33, T0.z);
  const clock = ctex(256, 256, (g, w, h) => { g.fillStyle = "#c9a040"; g.fillRect(0, 0, w, h); g.fillStyle = "#f6f0dc"; g.beginPath(); g.arc(128, 128, 104, 0, 7); g.fill(); g.strokeStyle = "#1a1a1a"; g.lineWidth = 6; g.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = 6; g.beginPath(); g.moveTo(128 + Math.cos(a) * 84, 128 + Math.sin(a) * 84); g.lineTo(128 + Math.cos(a) * 98, 128 + Math.sin(a) * 98); g.stroke(); } g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 52); g.moveTo(128, 128); g.lineTo(176, 150); g.stroke(); });
  for (const [dx, dz, ry] of [[0, 2.62, 0], [2.62, 0, Math.PI / 2], [-2.62, 0, -Math.PI / 2]]) { const f = add(new THREE.PlaneGeometry(4.2, 4.2), lam({ map: clock }), T0.x + dx, 33, T0.z + dz); f.rotation.y = ry; }
  box(4.6, 3.2, 4.6, lam({ color: "#b8a476" }), T0.x, 37.6, T0.z);
  for (let i = 0; i < 3; i++) box(0.6, 2.2, 0.05, lit({ color: "#2a2418" }), T0.x - 1.2 + i * 1.2, 37.6, T0.z + 2.32);
  const spire = add(new THREE.ConeGeometry(3.3, 9, 4), lam({ color: "#4f6a64" }), T0.x, 43.7, T0.z); spire.rotation.y = Math.PI / 4;
  for (const [dx, dz] of [[-2.1, -2.1], [2.1, -2.1], [-2.1, 2.1], [2.1, 2.1]]) { add(new THREE.ConeGeometry(0.3, 2.4, 6), lam({ color: "#c9a040" }), T0.x + dx, 40.4, T0.z + dz); }
  add(new THREE.ConeGeometry(0.18, 2.2, 6), lam({ color: "#c9a040" }), T0.x, 49.2, T0.z);
  // a red phone box
  box(1.0, 2.5, 1.0, lam({ color: "#c0261f" }), X + 5.5, 1.25, -6.2); box(0.7, 1.4, 0.02, lit({ color: "#2a3038" }), X + 5.5, 1.4, -5.69);
  // the bus: lower deck enclosed, upper deck open-topped with a rail
  const red = lit({ color: "#d42a20" }), glass = lit({ color: "#2a3340" });
  box(9, 2.2, 2.5, red, 0, 1.45, 0, bus); box(9, 0.3, 2.5, lam({ color: "#e8e2d4" }), 0, 2.7, 0, bus);
  box(9, 0.1, 2.5, lit({ color: "#8a8478" }), 0, 2.9, 0, bus); for (const z of [1.22, -1.22]) box(9, 0.75, 0.06, red, 0, 3.3, z, bus); for (const x of [4.47, -4.47]) box(0.06, 0.75, 2.5, red, x, 3.3, 0, bus); for (let i = 0; i < 6; i++) box(1.1, 0.8, 0.02, glass, -3.5 + i * 1.4, 1.75, 1.26, bus);
  for (let i = 0; i < 17; i++) box(0.05, 0.5, 0.05, lam({ color: "#e8e2d4" }), -4.4 + i * 0.55, 4.0, 1.22, bus);
  box(9, 0.05, 0.05, lam({ color: "#e8e2d4" }), 0, 4.25, 1.22, bus);
  for (const x of [-3, 3]) for (const z of [1.2, -1.2]) { const w = add(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 20), lit({ color: "#1e1e20" }), x, 0.55, z, bus); w.rotation.x = Math.PI / 2; }
  bus.position.set(X - 0.5, 0, 0.5);
  scene.userData.bus = bus;
}

// ---------------- SHOP: a sports shop front, bats in the window ----------------
{
  const X = SET.shop;
  const fl = add(new THREE.PlaneGeometry(40, 20), lam({ color: "#a8a49a" }), X, 0, -2); fl.rotation.x = -Math.PI / 2;
  box(14, 6, 1, lit({ color: "#6aa878", emissive: "#1a3a22" }), X, 3, -3.5);
  add(new THREE.PlaneGeometry(3.2, 0.6), lit({ map: label("SPORTS", 3.2, 0.6, "#1f4a2a", "#f2e6c8", "bold 80px Georgia, serif") }), X, 3.6, -2.98);
  box(5.6, 2.6, 0.05, lit({ color: "#cfe0e8", transparent: true, opacity: 0.35 }), X - 0.4, 1.8, -2.96);
  for (let i = 0; i < 6; i++) { const b = add(new THREE.BoxGeometry(0.12, 0.8, 0.04), lam({ color: "#e8d6a0" }), X - 2.4 + i * 0.75, 1.6, -3.2); b.rotation.z = 0.15; }
  for (let i = 0; i < 5; i++) add(new THREE.SphereGeometry(0.1, 10, 8), lam({ color: "#a8231d" }), X - 2.2 + i * 0.9, 0.85, -3.1);
}

// ---------------- TUBE: an underground entrance, stairs going down ----------------
{
  const X = SET.tube;
  const fl = add(new THREE.PlaneGeometry(40, 20), lam({ color: "#a8a49a" }), X, 0, -2); fl.rotation.x = -Math.PI / 2;
  box(5, 0.05, 4, lit({ color: "#0a0a0c" }), X, 0.03, -2.5);
  for (let i = 0; i < 7; i++) box(4.6, 0.2, 0.5, lit({ color: i % 2 ? "#5a5a5e" : "#6a6a6e" }), X, -0.15 - i * 0.28, -0.9 - i * 0.45);
  for (const s of [-1, 1]) box(0.3, 1.1, 4, lam({ color: "#d8d0c0" }), X + s * 2.5, 0.55, -2.5);
  for (const s of [-1, 1]) box(0.06, 0.06, 4, lam({ color: "#3a3a3a" }), X + s * 2.5, 1.12, -2.5);
  box(0.14, 3.6, 0.14, lam({ color: "#3a3a3a" }), X + 3.1, 1.8, -0.6);
  add(new THREE.PlaneGeometry(2.6, 0.55), lam({ map: label("UNDERGROUND", 2.6, 0.55, "#1f3c88", "#ffffff", "bold 64px Arial") }), X + 3.1, 3.4, -0.52);
  box(14, 7, 1, lam({ color: "#d8cdb8" }), X, 3.5, -6);
}

// ---------------- ROAD: gridlock ----------------
const bike = new THREE.Group(); scene.add(bike);
{
  const X = SET.road;
  const road = add(new THREE.PlaneGeometry(120, 10), lam({ color: "#5a5a60" }), X, 0, 0); road.rotation.x = -Math.PI / 2;
  for (let x = -40; x < 40; x += 4) box(1.8, 0.05, 0.15, lam({ color: "#f2f2ea" }), X + x, 0.03, 0.2);
  const cols = ["#c8231d", "#2f5d8a", "#e0c040", "#3a3a3a", "#f2f2f2", "#5a8a4a"];
  for (let i = 0; i < 14; i++) for (const z of [-1.6, -4.4]) {
    const c = new THREE.Group(); c.position.set(X - 30 + i * 4.6 + rnd(), 0, z); scene.add(c); const m = lam({ color: cols[(i + (z < -3 ? 2 : 0)) % 6] });
    box(3.8, 0.8, 1.8, m, 0, 0.75, 0, c); box(2.0, 0.7, 1.6, m, -0.2, 1.45, 0, c); box(1.9, 0.5, 1.62, lit({ color: "#2a3340" }), -0.2, 1.45, 0, c);
    for (const wx of [-1.2, 1.2]) for (const wz of [0.9, -0.9]) { const w = add(new THREE.CylinderGeometry(0.36, 0.36, 0.2, 14), lit({ color: "#1e1e20" }), wx, 0.36, wz, c); w.rotation.x = Math.PI / 2; }
  }
  for (let i = 0; i < 12; i++) { const w = 5, h = 8 + (i % 3), x = X - 30 + i * 5.2; box(w, h, 4, lam({ map: facadeHD(`ukr${i}`, w, h, { wall: i % 2 ? "#b5543c" : "#d8cdb8", shutter: "#f2f2ea", brick: i % 2 === 1, door: true }) }), x, h / 2, -10); }
  const metal = lit({ color: "#2a2a30" });
  for (const x of [-0.55, 0.55]) { const w = add(new THREE.TorusGeometry(0.34, 0.04, 8, 24), metal, x, 0.36, 0, bike); }
  const bar = (a, b) => { const l = add(new THREE.CylinderGeometry(0.025, 0.025, a.distanceTo(b), 6), lit({ color: "#c8231d" }), 0, 0, 0, bike); l.position.copy(a).lerp(b, 0.5); l.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); };
  bar(V(-0.55, 0.36, 0), V(-0.1, 0.85, 0)); bar(V(-0.1, 0.85, 0), V(0.45, 0.85, 0)); bar(V(0.45, 0.85, 0), V(0.55, 0.36, 0)); bar(V(-0.1, 0.85, 0), V(0.05, 0.36, 0)); bar(V(0.05, 0.36, 0), V(-0.55, 0.36, 0)); bar(V(0.45, 0.85, 0), V(0.4, 1.08, 0));
  box(0.2, 0.04, 0.5, metal, 0.4, 1.1, 0, bike);
}

// ---------------- CASTLE: on a green hill; inside: the gate and the well; the battlements ----------------
const flag = new THREE.Group(); scene.add(flag);
{
  const X = SET.castle;
  const grass = add(new THREE.PlaneGeometry(150, 200), lam({ color: "#6a9a4a" }), X, -0.02, -60); grass.rotation.x = -Math.PI / 2;
  const hill = add(new THREE.SphereGeometry(1, 32, 16), lam({ color: "#5f8f42" }), X, -6, -26); hill.scale.set(26, 13, 16);
  const lane = add(new THREE.PlaneGeometry(2.4, 30), lam({ color: "#9a8a6a" }), X - 2, 0.01, -6); lane.rotation.x = -Math.PI / 2; lane.rotation.z = 0.25;
  const stone = lam({ color: "#b8b0a0" }), castle = new THREE.Group(); castle.position.set(X, 6.4, -26); scene.add(castle);
  const crenel = (w, d, y, parent, x0 = 0, z0 = 0) => { for (let i = 0; i < Math.floor(w / 0.9); i++) box(0.5, 0.6, d, stone, x0 - w / 2 + 0.45 + i * 0.9, y, z0, parent); };
  box(14, 5, 1.2, stone, 0, 2.5, 4, castle); crenel(14, 1.2, 5.3, castle, 0, 4);
  for (const x of [-7, 7]) { add(new THREE.CylinderGeometry(1.8, 1.9, 8, 16), stone, x, 4, 4, castle); add(new THREE.CylinderGeometry(2.0, 2.0, 0.6, 16), stone, x, 8.3, 4, castle); }
  box(3.6, 6.4, 2, stone, 0, 3.2, 4.4, castle); box(1.8, 2.6, 0.1, lit({ color: "#2a1e14" }), 0, 1.3, 5.42, castle);
  box(9, 9, 6, stone, 0, 4.5, -1, castle); crenel(9, 1, 9.3, castle, 0, 2);
  const pole = add(new THREE.CylinderGeometry(0.06, 0.06, 4, 8), lam({ color: "#5a5a5a" }), 0, 11.3, -1, castle);
  void pole; flag.position.set(X + 0.9, 6.4 + 12.6, -27);
  const fl = add(new THREE.PlaneGeometry(1.8, 1.1, 8, 1), lam({ map: ctex(180, 110, (g, w, h) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); g.fillStyle = "#c8102e"; g.fillRect(w / 2 - 12, 0, 24, h); g.fillRect(0, h / 2 - 12, w, 24); }), side: THREE.DoubleSide }), 0, 0, 0, flag);
  flag.userData.cloth = fl;
}
{
  // the yard: stone walls, a portcullis with zombie arms through it, a well
  const X = SET.yard, stone = lam({ color: "#b8b0a0" });
  const fl = add(new THREE.PlaneGeometry(30, 20), lam({ map: cobbleHD() }), X, 0, -2); fl.rotation.x = -Math.PI / 2;
  box(20, 6, 1, stone, X, 3, -5);
  box(3.2, 4, 0.2, lit({ color: "#1a1410" }), X - 3.5, 2, -4.45);
  for (let i = 0; i < 6; i++) box(0.12, 4, 0.12, lit({ color: "#3a3a3a" }), X - 4.9 + i * 0.56, 2, -4.3);
  for (let j = 0; j < 4; j++) box(3.2, 0.12, 0.12, lit({ color: "#3a3a3a" }), X - 3.5, 0.6 + j * 1.0, -4.3);
  for (let i = 0; i < 4; i++) { const arm = add(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 8), lam({ color: "#9cb88a" }), X - 4.6 + i * 0.75, 1.3 + (i % 2) * 0.5, -3.9); arm.rotation.x = Math.PI / 2; arm.userData.arm = i; }
  const well = add(new THREE.CylinderGeometry(0.75, 0.8, 0.9, 20, 1, true), lam({ color: "#9a9284", side: THREE.DoubleSide }), X + 1.6, 0.45, -1.6);
  void well; add(new THREE.CircleGeometry(0.72, 20), lit({ color: "#1a2a3a" }), X + 1.6, 0.6, -1.6).rotation.x = -Math.PI / 2;
  for (const s of [-1, 1]) box(0.1, 1.6, 0.1, lam({ color: "#6b4a2b" }), X + 1.6 + s * 0.7, 1.7, -1.6);
  const roof = add(new THREE.ConeGeometry(1.0, 0.7, 4), lam({ color: "#7a3a2a" }), X + 1.6, 2.75, -1.6); roof.rotation.y = Math.PI / 4;
  box(1.5, 0.06, 0.06, lam({ color: "#6b4a2b" }), X + 1.6, 2.3, -1.6);
}
const bucket = add(new THREE.CylinderGeometry(0.16, 0.13, 0.25, 12), lam({ color: "#7a5434" }), 0, 0, 0);
{
  // the battlements
  const X = SET.walls, stone = lam({ color: "#b8b0a0" });
  box(20, 1.2, 3, stone, X, -0.6, 0);
  for (let i = 0; i < 12; i++) box(0.6, 0.8, 0.5, stone, X - 6 + i * 1.1, 0.4, 1.25);
  box(20, 3, 1, stone, X, -2.1, 1.8);
  const fl = add(new THREE.PlaneGeometry(60, 40), lam({ color: "#6a9a4a" }), X, -3.6, 10); fl.rotation.x = -Math.PI / 2;
}

// ---------------- the Winchester: a cosy booth, zombies pressed against the window ----------------
const lights = [];
const crisps = new THREE.Group(); scene.add(crisps);
{
  const X = SET.pub, wood = lit({ color: "#6b4128" }), dark = lit({ color: "#4a2c18" });
  const fl = add(new THREE.PlaneGeometry(12, 10), lit({ color: "#5a3a26" }), X, 0, -1); fl.rotation.x = -Math.PI / 2;
  box(12, 1.2, 0.2, dark, X, 0.6, -3.4); box(12, 0.08, 0.3, wood, X, 1.22, -3.35);
  const wallM = lit({ color: "#7a2a2a" }); box(4.15, 2.6, 0.2, wallM, X - 3.92, 2.5, -3.5); box(4.15, 2.6, 0.2, wallM, X + 3.92, 2.5, -3.5); box(3.7, 0.6, 0.2, wallM, X, 3.5, -3.5);
  box(3.4, 1.8, 0.05, lit({ color: "#9ab0b8", transparent: true, opacity: 0.25 }), X, 2.25, -3.3);
  for (const [w, h, x, y] of [[3.6, 0.15, 0, 3.2], [3.6, 0.15, 0, 1.3], [0.15, 2.0, -1.75, 2.25], [0.15, 2.0, 1.75, 2.25], [0.1, 1.9, 0, 2.25]]) box(w, h, 0.12, wood, X + x, y, -3.28);
  add(new THREE.PlaneGeometry(3.0, 0.5), lit({ map: label("THE WINCHESTER", 3.0, 0.5, "#2a1a10", "#e8c45a", "bold 54px Georgia, serif") }), X, 3.75, -3.38);
  box(1.6, 0.08, 0.9, wood, X + 0.2, 0.78, -1.6); box(0.1, 0.75, 0.1, dark, X + 0.2, 0.38, -1.6);
  box(2.4, 0.5, 0.7, lit({ color: "#7a1f22" }), X - 0.3, 0.25, -2.6); box(2.4, 1.1, 0.2, lit({ color: "#7a1f22" }), X - 0.3, 1.0, -2.95);
  const night = add(new THREE.PlaneGeometry(14, 6), new THREE.MeshBasicMaterial({ color: 0x1a2030 }), X, 2.4, -6); void night;
  box(0.6, 0.8, 0.12, lit({ color: "#c0261f" }), 0, 0.4, 0, crisps); box(0.62, 0.12, 0.13, lit({ color: "#f2d24a" }), 0, 0.72, 0, crisps);
  crisps.scale.setScalar(0.32); crisps.position.set(X + 0.45, 0.82, -1.5);
  const l = new THREE.PointLight(0xffc27a, 6, 9, 1.6); l.position.set(X + 0.5, 2.6, -0.6); scene.add(l); lights.push(l);
}

// ---------------- cameras ----------------
const W = (x, y, z) => V(x, y, z);
const CAMS = {
  hook:   [W(-0.4, 3.9, 6.2), W(-0.7, 6.4, 0)],
  bat:    [W(100.2, 1.5, 5.2), W(100.0, 1.2, -1)],
  tube:   [W(200.9, 2.4, 6.4), W(200.4, 0.6, -2)],
  bike:   [W(300, 1.4, 6.4), W(300, 1.0, 0)],
  pub:    [W(699.95, 1.75, 3.2), W(699.95, 1.75, -3)],
  castle: [W(399.2, 2.4, 9.0), W(400, 7.5, -26)],
  well:   [W(500.6, 1.7, 5.6), W(500.2, 1.4, -2)],
  loop:   [W(600.4, 2.4, 8.6), W(600.1, -1.4, 0)],
};
const allZ = zombies;

start((time, tl) => {
  const shot = tl.shot, k = tl.k, st = tl.since(shot), set = SHOT_SET[shot];
  const golden = set === "castle" || set === "walls" || set === "yard";
  // (the pub sets its own night lighting below)
  setLight(golden ? "golden" : "day", { sunI: 3.2 }); sun.intensity = golden ? 4.2 : 2.6; hemi.intensity = 0.6;
  scene.background = new THREE.Color(golden ? "#f2b37a" : "#a9bfd4"); scene.fog = new THREE.Fog(untone(golden ? "#f0c090" : "#c9d4de"), 30, 160);
  allZ.forEach(z => (z.visible = false)); bat.visible = shot !== "hook"; bucket.visible = false; bike.visible = shot === "bike";
  max.visible = true;

  let p0, l0; [p0, l0] = CAMS[shot]; const p = p0.clone().lerp(l0, 0.1 * ease(k)), l = l0.clone();
  if (shot === "bike") { const bx = SET.road - 6 + st * 4.5; p.x = bx + 0.4; l.x = bx; }
  lights.forEach(l => (l.visible = set === "pub"));
  if (shot === "pub") {
    // waiting for it all to blow over: crisps in the booth, faces at the window
    scene.background = new THREE.Color("#1a2030"); scene.fog = null; sun.intensity = 0.6; hemi.intensity = 0.45;
    max.position.set(SET.pub - 0.55, 0.15, -2.35); sayMax({ expr: k < 0.6 ? "m_happy" : "m_worried", mode: "sit" });
    [0, 1, 2, 3].forEach(i => { const z = allZ[i]; z.visible = true; z.position.set(SET.pub - 1.2 + i * 0.8, 0.2 + (i % 2) * 0.15, -3.75 - (i % 2) * 0.25); zDraw(z, i, time, { side: false, mode: "stand", expr: "shock" }); });
  }
  crisps.visible = shot === "pub";
  if (shot === "castle") { p.lerp(W(399.8, 3.4, 4), ease(k) * 0.4); }
  camera.position.copy(p); camera.lookAt(l);

  if (shot === "hook") {
    // on the top deck of the bus, zombies coming up behind him
    max.position.set(SET.london - 0.2, 2.95, 0.3); sayMax({ expr: k < 0.4 ? "m_shock" : "m_stern" });
    [0, 1, 2].forEach(i => { const z = allZ[i]; z.visible = true; z.position.set(SET.london - 1.5 - i * 0.75 + st * 0.35, 2.95, 0.2 - i * 0.25); zDraw(z, i, time); });
    [3, 4, 5, 6].forEach((i, j) => { const z = allZ[i]; z.visible = true; z.position.set(SET.london - 6 + j * 1.6 + st * 0.4, 0, 2.9 + (j % 2) * 0.6); zDraw(z, i, time); });
  }
  if (shot === "bat") {
    // the cricket bat
    max.position.set(SET.shop - 0.2, 0, 0.3); sayMax({ expr: "m_stern", side: true, mode: "hammer", bat: true, pose: Math.min(1, Math.max(0, (k - 0.45) / 0.15)) });
    const z = allZ[0]; z.visible = true; const hitT = k > 0.6; z.position.set(SET.shop + 0.85 + (hitT ? (k - 0.6) * 4 : 0), hitT ? Math.max(0, (k - 0.6) * 3 - (k - 0.6) ** 2 * 6) : 0, 0.2); zDraw(z, 0, time); z.rotation.z = hitT ? -(k - 0.6) * 6 : 0;
  } else allZ[0].rotation.z = 0;
  if (shot === "tube") {
    // zombies pouring up out of the Underground
    max.position.set(SET.tube + 1.6, 0, 1.4); sayMax({ expr: "m_shock" });
    [0, 1, 2, 3, 4, 5].forEach(i => { const z = allZ[i]; z.visible = true; const u = Math.min(1, st * 0.45 + i * 0.12); z.position.set(SET.tube - 1.4 + (i % 3) * 1.1, -1.9 + 1.9 * u, -3.2 + 2.6 * u); zDraw(z, i, time); });
  }
  if (shot === "bike") {
    const bx = SET.road - 6 + st * 4.5; bike.position.set(bx, 0, 0.9);
    max.position.set(bx - 0.08, 0.62, 0.9); sayMax({ expr: "m_happy", side: true, mode: "push", pose: 0.25 });
    [0, 1].forEach(i => { const z = allZ[i]; z.visible = true; z.position.set(bx - 4 - i * 1.4, 0, 2.2); zDraw(z, i, time); });
  }
  if (shot === "castle") {
    max.position.set(SET.castle - 1.6 + st * 0.6, 0, -1.2); sayMax({ expr: "m_happy", mode: "stroll", phase: (st * 1.2) % 1 });
  }
  if (shot === "well") {
    max.position.set(SET.yard + 0.7, 0, -1.2); sayMax({ expr: k < 0.5 ? "m_stern" : "m_happy", side: true, mode: "push", pose: 0.4 });
    bucket.visible = true; bucket.position.set(SET.yard + 1.6, lerp(0.3, 2.0, Math.min(1, Math.max(0, (k - 0.35) / 0.4))), -1.6);
    scene.traverse(o => { if (o.userData.arm !== undefined) o.position.z = -3.9 + 0.12 * Math.sin(time * 4 + o.userData.arm); });
  }
  if (shot === "loop") {
    max.position.set(SET.walls + 0.2, 0, 0.6); sayMax({ expr: "m_happy", wave: Math.abs(Math.sin(time * 5)) });
    [0, 1, 2, 3, 4].forEach(i => { const z = allZ[i]; z.visible = true; z.position.set(SET.walls - 1.6 + i * 0.8, -3.6, 2.7 + (i % 2) * 0.4); zDraw(z, i, time, { side: false, mode: "stand", expr: "shock" }); });
  }
  // the bat goes in his hand
  if (bat.visible) { const sw = shot === "bat" ? Math.min(1, Math.max(0, (k - 0.45) / 0.15)) : 0; bat.position.set(max.position.x + 0.32, max.position.y + 1.0, max.position.z + 0.05); bat.rotation.set(0, 0, shot === "bat" ? lerp(2.3, -1.2, sw) : 0.3); bat.visible = shot === "tube" || shot === "loop"; }
  flag.userData.cloth.rotation.y = 0.2 * Math.sin(time * 4);
  for (const c of [max, ...allZ]) if (c.visible) faceCamera(c);
  if (look.bokeh) look.bokeh.uniforms.focus.value = shot === "castle" ? 25 : camera.position.distanceTo(max.position.clone().setY(max.position.y + 1.3));
  aimSun(golden ? 140 : -40, golden ? 20 : 42, V(camera.position.x, 0, -2), 60);
});
