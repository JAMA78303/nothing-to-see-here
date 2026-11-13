// "Australia lost a war to birds" (the Emu War, Western Australia, 1932), in the 2D-characters-in-a-3D-world style.
// Sets along x: FIELD 0 (the gun line, the wheat farm at +40, the armoured emu at +80), ROAD 300 (the truck chase),
// HQ 500 (the commander's tent). The emus are our own drawings, in the same ink style as Max.
import { THREE, scene, camera, sun, hemi, V, ease, lerp, start } from "./kit.js";
import { setupStyle, setLight, aimSun, ctex, lam, lit, add, box, makeCard, faceCamera, look, untone, CREAM, NOINK, MAX, maxHair, CARD_W, CARD_H } from "./style2kit.js";
import { Pen } from "./vendor/toon.js";
import { cardShade } from "./vendor/cardshade.js";

setupStyle({ ink: { widthNear: 4.2, widthFar: 2.8 }, blur: { aperture: 0.0024, maxblur: 0.007 } });
const SET = { field: 0, road: 300, hq: 500 };
const SHOT_SET = { hook: "field", farm: "field", split: "field", truck: "road", quit: "field", tanks: "hq", loop: "road" };
const rnd = (() => { let s = 17; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
const lights = {};
const lamp = (set, x, y, z, i = 6, d = 8, col = 0xffc070) => { const l = new THREE.PointLight(col, i, d, 1.6); l.position.set(x, y, z); scene.add(l); (lights[set] ||= []).push(l); return l; };

// ---------------- a slouch hat, drawn on any card's head ----------------
function slouch(p, col = "#8a7650", band = "#4a3a24") {
  const h = p.head ?? { x: 300, y: 309, rot: null }; const rot = p.rot; p.rot = h.rot;
  const x = h.x, y = h.y - 96;
  p.poly([[x - 168, y + 2], [x - 146, y - 92], [x - 104, y - 66], [x - 96, y + 4]], col);                       // the turned-up side
  p.ell(x + 12, y + 8, 196, 32, col);                                                                                    // brim
  p.poly([[x - 92, y + 4], [x - 78, y - 66], [x - 26, y - 100], [x + 44, y - 100], [x + 90, y - 62], [x + 100, y + 4]], col);
  p.poly([[x - 90, y - 12], [x + 98, y - 12], [x + 100, y + 4], [x - 92, y + 4]], band, 0);
  p.rot = rot;
}

// ---------------- the emu: side view, facing right; run frames, standing, pecking, armoured, in a hat ----------------
const EMU_INK = "#241726";
function drawEmu(g, o) {
  const p = new Pen(g); g.clearRect(0, 0, 600, 1000);
  const run = o.mode === "run", ph = (o.phase || 0) * Math.PI * 2, bob = run ? 16 * Math.abs(Math.sin(ph)) : 0;
  const bx = 270, by = 520 - bob, hip = [bx + 40, by + 80];
  const leg = (off, col) => {
    const a = run ? 0.62 * Math.sin(ph + off) : (off ? -0.08 : 0.1), bend = run ? 0.95 * Math.max(0, Math.cos(ph + off)) : 0;
    const j = [hip[0] + Math.sin(a) * 180, hip[1] + Math.cos(a) * 180], b = a - bend, f = [j[0] + Math.sin(b) * 195, j[1] + Math.cos(b) * 195];
    p.line([hip, j, f], col, 22);
    for (const [dx, dy] of [[54, 6], [40, -10], [-22, 4]]) p.line([f, [f[0] + dx, f[1] + dy]], col, 12);
  };
  leg(Math.PI, "#6e675c"); leg(0, "#8f887a");
  // shaggy body
  const body = []; for (let i = 0; i <= 36; i++) { const a = i / 36 * Math.PI * 2, r = 1 + (Math.sin(a) > 0.2 ? 0.08 * Math.sin(i * 2.7) : 0); body.push([bx + Math.cos(a) * 182 * r, by + Math.sin(a) * 118 * r - 18 * Math.cos(a)]); }
  p.poly(body, "#6b4a2e");
  let s = 5; const rr = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 46; i++) { const x = bx - 150 + rr() * 300, y = by - 70 + rr() * 150; p.stroke([[x, y], [x - 22 - rr() * 20, y + 26 + rr() * 22]], 6, rr() < 0.5 ? "#4a3020" : "#8a6a46"); }
  if (o.armor) {                                                       // riveted armour plates and a little turret
    p.poly([[bx - 170, by - 10], [bx - 120, by - 108], [bx + 120, by - 108], [bx + 178, by - 10], [bx + 150, by + 70], [bx - 150, by + 70]], "#7d848c");
    for (let i = 0; i < 9; i++) p.dot(bx - 130 + i * 32, by - 88, 7, "#4a4f55");
    for (let i = 0; i < 9; i++) p.dot(bx - 130 + i * 32, by + 52, 7, "#4a4f55");
    p.poly([[bx - 50, by - 108], [bx - 40, by - 172], [bx + 70, by - 172], [bx + 84, by - 108]], "#6d747c");
    p.line([[bx + 74, by - 146], [bx + 210, by - 160]], "#55595f", 20);
  }
  // neck and head
  const peck = o.mode === "peck";
  const neck = peck ? [[bx + 120, by - 30], [bx + 220, by + 90], [bx + 250, by + 300], [bx + 262, by + 380]] : [[bx + 118, by - 40], [bx + 178, by - 150], [bx + 196, by - 270], [bx + 190, by - 340]];
  p.line(neck, "#7d8696", 40);
  p.poly([[bx + 90, by - 70], [bx + 160, by - 120], [bx + 186, by - 70], [bx + 150, by + 10]], "#5a3e26", 0);
  const [hx, hy] = neck[neck.length - 1];
  p.ell(hx, hy, 40, 31, "#6f8ab0");
  const bd = peck ? 1 : 0;
  p.poly([[hx + 30, hy - 8 + bd * 10], [hx + 82, hy + 4 + bd * 30], [hx + 28, hy + 14 + bd * 8]], "#3a3a3a");
  p.dot(hx + 8, hy - 6, 12, "#ffffff"); p.dot(hx + 13, hy - 5, 6.5, EMU_INK);
  p.stroke([[hx - 14, hy - 24], [hx + 26, hy - 12]], 8);
  if (o.hat) {                                                         // Max's slouch hat, at emu size, cocked to one side
    const x = hx + 2, y = hy - 30;
    p.poly([[x - 64, y + 2], [x - 56, y - 36], [x - 40, y - 26], [x - 36, y + 2]], "#8a7650");
    p.ell(x + 4, y + 4, 74, 13, "#8a7650");
    p.poly([[x - 36, y + 2], [x - 30, y - 26], [x - 10, y - 40], [x + 18, y - 40], [x + 36, y - 24], [x + 40, y + 2]], "#8a7650");
    p.poly([[x - 35, y - 6], [x + 39, y - 6], [x + 40, y + 2], [x - 36, y + 2]], "#4a3a24", 0);
  }
}
const emuTex = o => { const t = ctex(600, 1000, (g) => drawEmu(g, o)); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
const EMU = {
  run: [...Array(8)].map((_, i) => emuTex({ mode: "run", phase: i / 8 })), stand: emuTex({ mode: "stand" }),
  peck: [emuTex({ mode: "peck" }), emuTex({ mode: "stand" })], armor: [...Array(8)].map((_, i) => emuTex({ mode: "run", phase: i / 8, armor: true })),
  hat: emuTex({ mode: "stand", hat: true }),
};
const emus = [];
function emuCard(scale = 0.86) {
  const mat = cardShade(new THREE.MeshLambertMaterial({ map: EMU.stand, alphaTest: 0.5, side: THREE.DoubleSide }));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * scale, CARD_H * scale), mat);
  m.layers.set(NOINK); m.castShadow = true;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: EMU.stand, alphaTest: 0.5 });
  const g = new THREE.Group(); g.add(m); m.position.y = (CARD_H / 2 - CARD_H * 0.025) * scale;
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.38 * scale, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.2, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; blob.scale.set(1, 0.45, 1); blob.layers.set(NOINK); g.add(blob);
  g.userData.set = (tex, dir) => { if (mat.map !== tex) { mat.map = tex; m.customDepthMaterial.map = tex; } m.scale.x = dir; };
  scene.add(g); emus.push(g); return g;
}
const runTex = (time, speed, off, set = EMU.run) => set[Math.floor((((time * speed + off) % 1) + 1) % 1 * 8)];

// ---------------- people ----------------
const SOLDIER = { ...MAX, jacket: "#8a7a4a", pants: "#6a5e3a", boots: "#3a2a1a", buttons: "#c9a84a" };
const max = makeCard(SOLDIER, { mode: "stand", expr: "m_neutral", seed: 4, facing: 0, faceFront: true }, (p) => { maxHair(p, MAX.hair, 4, 0); slouch(p); });
const mate = makeCard({ jacket: "#8a7a4a", pants: "#6a5e3a", boots: "#3a2a1a", buttons: "#c9a84a", hat: "hair", hair: "#3a2a1a", skin: CREAM }, { mode: "stand", expr: "neutral", seed: 40 }, (p) => slouch(p));
const farmer = makeCard({ jacket: "#6a8aa8", pants: "#4a4038", boots: "#3a2a1a", hat: "hair", hair: "#7a5a3a", skin: CREAM }, { mode: "stand", expr: "stern", seed: 21 }, (p) => slouch(p, "#9a7a50", "#5a3a20"));
const major = makeCard({ jacket: "#7a6a3a", pants: "#5a4e30", boots: "#2a1a10", hat: "cap", cap: "#6a5a30", moustache: "#5a3a20", buttons: "#e8c45a", skin: CREAM }, { mode: "stand", expr: "nervous", seed: 33 });
const people = [max, mate, farmer, major];
const sayMax = (o = {}) => max.userData.draw({ facing: 0, faceFront: true, ...o });

// ---------------- the outback: dry grass, a wheat farm, a fence, a windmill ----------------
{
  const grass = ctex(256, 256, (g, w, h) => { g.fillStyle = "#c9a865"; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.strokeStyle = `rgba(${rnd() < 0.5 ? "120,90,40" : "235,210,150"},0.35)`; g.lineWidth = 2; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y - 8); g.stroke(); } }, 60, 30);
  const ground = add(new THREE.PlaneGeometry(800, 300), lam({ map: grass }), 250, 0, -60); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  const hills = add(new THREE.SphereGeometry(1, 24, 12), lam({ color: "#b5875a" }), 60, -6, -150); hills.scale.set(220, 18, 30);
  // wheat: clumps of drawn stalks
  const wheatTex = ctex(128, 256, (g, w, h) => { for (let i = 0; i < 9; i++) { const x = 14 + i * 12 + rnd() * 6, dx = (rnd() - 0.5) * 16; g.strokeStyle = "#b8902e"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, h); g.lineTo(x + dx, 50 + rnd() * 30); g.stroke(); g.fillStyle = "#e6c25a"; g.beginPath(); g.ellipse(x + dx, 44 + rnd() * 30, 7, 20, dx * 0.02, 0, 7); g.fill(); } });
  wheatTex.wrapS = wheatTex.wrapT = THREE.ClampToEdgeWrapping;
  const wheatM = lam({ map: wheatTex, alphaTest: 0.5, side: THREE.DoubleSide });
  const field = add(new THREE.PlaneGeometry(40, 30), lam({ color: "#d9b456" }), 44, 0.005, -10); field.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 420; i++) {
    const x = 26 + rnd() * 36, z = -22 + rnd() * 24, flat = x > 36 && x < 46 && z > -6;
    const w = add(new THREE.PlaneGeometry(0.6, 1.1), wheatM, x, flat ? 0.04 : 0.55, z); w.layers.set(NOINK); w.castShadow = false;
    if (flat) { w.rotation.set(-Math.PI / 2, 0, rnd() * 6); } else w.rotation.y = (rnd() - 0.5) * 0.6;
  }
  const post = lam({ color: "#7a5a3a" });
  for (let x = -14; x < 64; x += 2.5) { box(0.12, 1.2, 0.12, post, x, 0.6, -7); }
  for (const y of [0.55, 0.95]) { const wire = add(new THREE.CylinderGeometry(0.01, 0.01, 78, 4), lit({ color: "#555" }), 25, y, -7); wire.rotation.z = Math.PI / 2; }
  // windmill pump
  const wm = new THREE.Group(); wm.position.set(-9, 0, -22); scene.add(wm);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const a = V(sx * 1.1, 0, sz * 1.1), b = V(sx * 0.2, 8, sz * 0.2), l = add(new THREE.BoxGeometry(0.12, a.distanceTo(b), 0.12), lam({ color: "#9aa0a6" }), 0, 0, 0, wm); l.position.copy(a).lerp(b, 0.5); l.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); }
  const rotor = new THREE.Group(); rotor.position.set(0, 8.3, 0.5); wm.add(rotor); wm.userData.rotor = rotor;
  for (let i = 0; i < 12; i++) { const bl = add(new THREE.BoxGeometry(0.28, 1.5, 0.04), lam({ color: "#d8dde2" }), 0, 0, 0, rotor); bl.rotation.z = i / 12 * Math.PI * 2; bl.position.set(Math.sin(-bl.rotation.z) * 0.95, Math.cos(bl.rotation.z) * 0.95, 0); }
  box(0.3, 0.3, 0.6, lam({ color: "#9aa0a6" }), 0, 8.3, 0, wm);
  scene.userData.windmill = rotor;
  // a farmhouse with a red iron roof
  box(7, 3, 5, lam({ color: "#e8dcc0" }), 52, 1.5, -34); const roof = add(new THREE.CylinderGeometry(0.1, 4.8, 2.0, 4), lam({ color: "#a8453a" }), 52, 4.0, -34); roof.rotation.y = Math.PI / 4; roof.scale.set(1.05, 1, 0.75);
  // the dirt road for the truck chase
  const road = add(new THREE.PlaneGeometry(200, 5), lam({ color: "#b08a5a" }), 330, 0.01, -1); road.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 60; i++) { const b = add(new THREE.SphereGeometry(0.25 + rnd() * 0.4, 8, 6), lam({ color: "#9a8a6a" }), 260 + rnd() * 140, 0, -6 - rnd() * 10); b.scale.y = 0.5; }
}

// ---------------- the Lewis gun ----------------
function lewis() {
  const g = new THREE.Group(), dark = lam({ color: "#2b2d30" }), steel = lam({ color: "#4a4e54" });
  const barrel = add(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 12), dark, 0.25, 0, 0, g); barrel.rotation.z = Math.PI / 2;
  const tip = add(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), steel, 0.85, 0, 0, g); tip.rotation.z = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 22), steel, 0.05, 0.12, 0, g);
  box(0.4, 0.1, 0.08, lam({ color: "#6b4a2e" }), -0.42, -0.04, 0, g);
  for (const [dx, dz] of [[0.35, 0.25], [0.35, -0.25], [-0.3, 0]]) { const a = V(0.3, 0, 0), b = V(dx, -0.95, dz), l = add(new THREE.CylinderGeometry(0.02, 0.02, a.distanceTo(b), 6), dark, 0, 0, 0, g); l.position.copy(a).lerp(b, 0.5); l.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); }
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshBasicMaterial({ map: ctex(128, 96, (c, w, h) => { const gr = c.createRadialGradient(w * 0.3, h / 2, 2, w * 0.3, h / 2, w * 0.6); gr.addColorStop(0, "#fffbe0"); gr.addColorStop(0.35, "#ffd040"); gr.addColorStop(1, "rgba(255,140,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false }));
  flash.position.set(1.25, 0, 0); flash.layers.set(NOINK); g.add(flash); g.userData.flash = flash;
  scene.add(g); return g;
}
const gun = lewis(); gun.position.set(-0.05, 0.95, 1.55); gun.rotation.y = 0.45;

// ---------------- the truck ----------------
const truck = new THREE.Group(); scene.add(truck);
{
  const ol = lam({ color: "#5a6a3a" }), dk = lam({ color: "#3c4626" });
  box(4.2, 0.35, 1.7, dk, 0, 0.7, 0, truck);
  box(1.4, 1.1, 1.6, ol, 1.1, 1.4, 0, truck); box(1.0, 0.75, 1.3, ol, 2.0, 1.15, 0, truck);
  add(new THREE.PlaneGeometry(0.9, 0.5), lit({ color: "#26303a" }), 1.1, 1.65, 0.81, truck);
  box(2.4, 0.5, 1.7, ol, -0.95, 1.12, 0, truck);
  for (const [x, z] of [[1.6, 0.85], [1.6, -0.85], [-1.4, 0.85], [-1.4, -0.85]]) { const w = add(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 20), lam({ color: "#1e1e20" }), x, 0.45, z, truck); w.rotation.x = Math.PI / 2; const hub = add(new THREE.CylinderGeometry(0.18, 0.18, 0.32, 12), lam({ color: "#8a8f6a" }), x, 0.45, z, truck); hub.rotation.x = Math.PI / 2; }
  const tg = lewis(); tg.position.set(-0.9, 1.75, 0.2); tg.scale.setScalar(0.9); truck.add(tg); truck.userData.gun = tg;
}

// ---------------- a small tank, to run beside the emu ----------------
const tank = new THREE.Group(); scene.add(tank);
{
  const ol = lam({ color: "#5c6b3c" }), dk = lam({ color: "#2e3226" });
  box(1.5, 0.38, 0.9, ol, 0, 0.42, 0, tank); box(0.75, 0.3, 0.6, ol, -0.05, 0.76, 0, tank);
  const barrel = add(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 10), dk, 0.65, 0.78, 0, tank); barrel.rotation.z = Math.PI / 2;
  for (const z of [0.42, -0.42]) { box(1.6, 0.3, 0.2, dk, 0, 0.18, z, tank); for (let i = 0; i < 5; i++) { const w = add(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 12), lam({ color: "#4a4a44" }), -0.6 + i * 0.3, 0.18, z, tank); w.rotation.x = Math.PI / 2; } }
}

// ---------------- HQ: the commander's tent ----------------
{
  const X = SET.hq, canvas = lit({ color: "#c9b88a", side: THREE.BackSide });
  const tent = add(new THREE.CylinderGeometry(4.5, 4.5, 8, 4, 1, true), canvas, X, 1.6, -2); tent.rotation.y = Math.PI / 4; tent.scale.set(1, 1, 1);
  const top = add(new THREE.ConeGeometry(4.5, 2.4, 4, 1, true), canvas, X, 6.8, -2); top.rotation.y = Math.PI / 4;
  const fl = add(new THREE.PlaneGeometry(10, 10), lit({ color: "#8a7650" }), X, 0, -2); fl.rotation.x = -Math.PI / 2;
  box(2.2, 0.08, 1.1, lit({ color: "#6b4128" }), X + 0.4, 0.85, -0.6); for (const sx of [-1, 1]) box(0.08, 0.85, 0.9, lit({ color: "#4a2e1a" }), X + 0.4 + sx * 1.0, 0.42, -0.6);
  add(new THREE.PlaneGeometry(1.2, 0.8), lit({ map: ctex(256, 170, (g, w, h) => { g.fillStyle = "#e8dcb8"; g.fillRect(0, 0, w, h); g.strokeStyle = "#8a6a40"; g.lineWidth = 3; g.beginPath(); g.moveTo(20, 120); g.bezierCurveTo(80, 40, 160, 150, 236, 60); g.stroke(); g.fillStyle = "#c0392b"; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(60 + i * 18, 60 + (i % 3) * 25, 6, 0, 7); g.fill(); } }) }), X + 0.5, 0.9, -0.6).rotation.x = -Math.PI / 2 + 0.05;
  add(new THREE.SphereGeometry(0.1, 12, 10), glow(1.8, 1.5, 0.9), X + 1.2, 1.15, -0.8); box(0.08, 0.3, 0.08, lit({ color: "#3a3a3a" }), X + 1.2, 0.98, -0.8);
  lamp("hq", X + 1.2, 1.4, -0.4, 6, 8, 0xffd08a); lamp("hq", X + 1.5, 2.5, 2, 3, 9, 0xfff0d0);
}

// ---------------- sparks (bullets pinging off the armoured emu) and dust puffs ----------------
const fxMat = (col) => new THREE.MeshBasicMaterial({ map: ctex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 30); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]); g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill(); }), transparent: true, depthWrite: false });
const sparks = [...Array(6)].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), fxMat(["#fffbe0", "rgba(255,200,40,0)"])); m.layers.set(NOINK); scene.add(m); return m; });
const puffs = [...Array(10)].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), fxMat(["rgba(200,170,120,0.9)", "rgba(200,170,120,0)"])); m.layers.set(NOINK); scene.add(m); return m; });

// the flock: enough cards for the biggest shot
for (let i = 0; i < 18; i++) emuCard(0.8 + rnd() * 0.12);
const E = emus.map(() => ({ x0: rnd(), z0: rnd(), off: rnd(), sp: 1.6 + rnd() * 0.6 }));

// ---------------- cameras ----------------
const W = (x, y, z) => V(x, y, z);
const CAMS = {
  hook: [W(-0.7, 1.5, 5.6), W(0.5, 1.0, -6)], farm: [W(41.5, 1.6, 5.4), W(41, 0.9, -2)], split: [W(-0.8, 2.2, 6.6), W(0.9, 0.6, -6)],
  quit: [W(-0.2, 1.5, 5.6), W(-0.6, 1.2, -4)], hq: [W(500.7, 1.55, 3.2), W(500.3, 1.25, -0.8)], armor: [W(80.35, 1.4, 5.8), W(80.35, 0.9, -0.5)],
};

start((time, tl) => {
  const shot = tl.shot, k = tl.k, st = tl.since(shot);
  const armor = shot === "tanks" && k > 0.45, set = armor ? "field" : SHOT_SET[shot];
  for (const [s, ls] of Object.entries(lights)) for (const l of ls) l.visible = s === set;
  const outdoor = set !== "hq", golden = shot === "quit" || shot === "loop";
  setLight(golden ? "golden" : "day", { sunI: 3.2 });
  sun.intensity = outdoor ? (golden ? 4.6 : 3.2) : 0; hemi.intensity = outdoor ? 0.55 : 0.3;
  scene.background = outdoor ? new THREE.Color(golden ? "#f2b37a" : "#8fc4ea") : new THREE.Color("#2a2418");
  scene.fog = outdoor ? new THREE.Fog(untone(golden ? "#f0c090" : "#e6d6ae"), 40, 180) : null;
  scene.userData.windmill.rotation.z = -time * 2.2;

  // ---- camera ----
  let p, l;
  const truckX = shot === "truck" ? SET.road + lerp(0, 13, k) : SET.road + 30;
  if (shot === "truck") { p = W(truckX + 0.3, 2.0, 8.6); l = W(truckX - 0.2, 1.2, 0); }
  else if (shot === "loop") { p = W(SET.road + 30.6, 1.75, lerp(6.8, 5.6, ease(k))); l = W(SET.road + 30.3, 1.55, 0); }
  else { const [p0, l0] = CAMS[armor ? "armor" : shot === "tanks" ? "hq" : shot]; p = p0.clone().lerp(l0, 0.1 * ease(armor ? (k - 0.45) / 0.55 : k)); l = l0.clone(); }
  if (shot === "split") p.x += 0.06 * Math.sin(st * 40) * Math.max(0, 1 - st * 2);
  camera.position.copy(p); camera.lookAt(l);

  // ---- people ----
  people.forEach(c => (c.visible = false));
  gun.visible = shot === "hook" || shot === "split"; gun.userData.flash.visible = false;
  const firing = (shot === "hook" && st > 0.6) || (shot === "split" && st < 1.0);
  if (gun.visible && firing) { gun.userData.flash.visible = Math.sin(time * 70) > 0.2; gun.userData.flash.quaternion.copy(camera.quaternion); }
  if (shot === "hook" || shot === "split") {
    max.visible = mate.visible = true; max.position.set(-0.85, 0, 1.6); mate.position.set(-1.75, 0, 0.9);
    sayMax({ side: true, mode: "push", pose: 0.25 + (firing ? 0.04 * Math.sin(time * 60) : 0), expr: shot === "hook" ? (k < 0.55 ? "m_stern" : "m_shock") : (k < 0.3 ? "m_stern" : "m_shock") });
    mate.userData.draw({ side: true, mode: "push", pose: 0.1, expr: k < 0.5 ? "neutral" : "shock", seed: 40 });
  }
  if (shot === "farm") { farmer.visible = true; farmer.position.set(40.4, 0, 1.3); farmer.userData.draw({ expr: Math.sin(st * 6) > 0 ? "stern" : "shock", seed: 21 }); }
  if (shot === "quit") { max.visible = true; max.position.set(lerp(-0.2, -1.3, k), 0, lerp(0.4, -0.8, k)); sayMax({ expr: "m_worried", mode: "stroll", phase: (st * 0.8) % 1 }); }
  if (shot === "tanks" && !armor) { major.visible = true; major.position.set(SET.hq + 0.1, 0, 0.0); major.userData.draw({ expr: Math.sin(st * 4) > 0 ? "nervous" : "shock", seed: 33 }); }
  if (shot === "truck") max.visible = true;

  // ---- the truck ----
  truck.visible = shot === "truck" || shot === "loop";
  truck.position.set(truckX, shot === "truck" ? 0.04 * Math.abs(Math.sin(time * 13)) : 0, -0.6);
  truck.rotation.z = shot === "truck" ? 0.025 * Math.sin(time * 9) : 0.02;
  truck.userData.gun.userData.flash.visible = shot === "truck" && Math.sin(time * 70) > 0.4 && k < 0.6;
  if (truck.userData.gun.userData.flash.visible) truck.userData.gun.userData.flash.quaternion.copy(camera.quaternion);
  if (shot === "truck") { max.position.set(truckX - 1.5, 1.32 + truck.position.y, -0.2); sayMax({ expr: k < 0.4 ? "m_stern" : "m_worried" }); }

  // ---- emus ----
  emus.forEach(e => (e.visible = false));
  const show = (i, x, z, tex, dir) => { const e = emus[i]; e.visible = true; e.position.set(x, 0, z); e.userData.set(tex, dir); return e; };
  if (shot === "hook") E.slice(0, 16).forEach((d, i) => { const row = i % 4; show(i, 4.2 - st * 0.75 + (row - 1.5) * 1.3 + d.x0 * 0.8, -15 + st * 2.6 + Math.floor(i / 4) * 1.6 + d.z0 * 0.6, runTex(time, d.sp, d.off), -1); });
  if (shot === "farm") E.slice(0, 9).forEach((d, i) => { const x = 38.2 + (i % 5) * 1.25 + d.x0 * 0.5, z = -3.6 + Math.floor(i / 5) * 1.6 + d.z0 * 0.5; show(i, x, z, Math.sin(time * 3 + i * 1.7) > 0 ? EMU.peck[0] : EMU.peck[1], i % 2 ? 1 : -1); });
  if (shot === "split") E.slice(0, 16).forEach((d, i) => {
    const a = i / 16 * Math.PI * 2 + d.off, burst = Math.max(0, st - 0.55) * 3.4, x = 2.2 + (d.x0 - 0.5) * 2.6 + Math.cos(a) * burst, z = -6.5 + (d.z0 - 0.5) * 2.4 + Math.sin(a) * burst * 0.8;
    show(i, x, z, burst > 0 ? runTex(time, d.sp * 1.3, d.off) : EMU.stand, Math.cos(a) > 0 ? 1 : -1);
  });
  if (shot === "truck") E.slice(0, 8).forEach((d, i) => show(i, SET.road - 4 + st * 5.6 + i * 1.1 + d.x0, 0.6 + (i % 3) * 0.9 - 1.6 * (i % 2), runTex(time, 2.3, d.off), 1));
  if (shot === "quit") E.slice(0, 7).forEach((d, i) => show(i, 0.6 + i * 1.15, -6.4 + d.z0 * 0.3, EMU.stand, -1));
  const ak = armor ? (k - 0.45) / 0.55 : 0;
  tank.visible = armor; tank.position.set(80.8 + lerp(-0.5, 0.5, ak), 0.02 * Math.abs(Math.sin(time * 18)), -0.9); tank.scale.setScalar(0.8);
  if (armor) show(0, 79.75 + lerp(-0.5, 0.5, ak), 0.2, runTex(time, 2.0, 0), 1);
  if (shot === "loop") {
    show(0, SET.road + 30.95, 0, EMU.hat, -1).position.set(SET.road + 31.1, 1.33, -0.6);
    E.slice(1, 6).forEach((d, i) => show(i + 1, SET.road + 27.5 + i * 1.3, 1.0 - (i % 2) * 2.4, Math.sin(time * 3 + i) > 0 ? EMU.peck[0] : EMU.peck[1], i % 2 ? 1 : -1));
  }
  for (const e of emus) if (e.visible) faceCamera(e);

  // ---- sparks and dust ----
  sparks.forEach((s, i) => { const u = (time * 3 + i / 6) % 1; s.visible = armor && u < 0.25; s.position.set((i % 2 ? 80.8 : 79.75) + lerp(-0.5, 0.5, ak) + (i % 3 - 1) * 0.25, i % 2 ? 0.7 + (i % 3) * 0.1 : 1.0 + (i % 3) * 0.15, i % 2 ? -0.3 : 0.4); s.scale.setScalar(0.6 + u * 3); s.quaternion.copy(camera.quaternion); });
  puffs.forEach((m, i) => {
    const u = (time * 1.7 + i / 10) % 1; m.visible = (firing || shot === "truck") && u < 0.5;
    const base = shot === "truck" ? V(truckX - 2.2 - u * 2, 0.3 + u * 0.4, -0.6 + (i % 3 - 1) * 0.5) : V(0.5 + (i * 1.37) % 4, 0.15 + u * 0.4, -9 + (i * 0.71) % 5);
    m.position.copy(base); m.scale.setScalar(0.6 + u * 2); m.quaternion.copy(camera.quaternion);
  });

  for (const c of people) if (c.visible) faceCamera(c);
  if (look.bokeh) look.bokeh.uniforms.focus.value = shot === "split" ? 9 : camera.position.distanceTo(l);
  if (outdoor) aimSun(golden ? 140 : -40, golden ? 18 : 42, V(camera.position.x, 0, -2), 60);
});
