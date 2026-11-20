// "America and Britain almost went to war over a pig" (San Juan Island, 1859), in the 2D-characters-in-a-3D-world style.
// One island: the FARM around x 0 (potatoes, a cabin, pines), the money row at x 10, the pig's grave at x 20, the BEACH
// standoff at x 40 with the warships in the bay, and the admiral's DECK at x 100. The pig is our own drawing.
import { THREE, scene, camera, sun, hemi, V, ease, lerp, start } from "./kit.js";
import { setupStyle, setLight, aimSun, ctex, lam, lit, add, box, makeCard, faceCamera, look, untone, CREAM, NOINK, MAX, maxHair, CARD_W, CARD_H } from "./style2kit.js";
import { Pen, OFFICER } from "./vendor/toon.js";
import { cardShade } from "./vendor/cardshade.js";

setupStyle({ ink: { widthNear: 4.2, widthFar: 2.8 }, blur: { aperture: 0.0024, maxblur: 0.007 } });
const rnd = (() => { let s = 59; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const T = (o, opts = {}, sc = 1) => makeCard({ ...o, skin: o.skin ?? CREAM }, { mode: "stand", expr: "neutral", ...opts }, null, sc);
const clampTex = t => { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
const overlay = (w, h, draw) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: clampTex(ctex(512, Math.round(512 * h / w), draw)), transparent: true, depthTest: false })); m.layers.set(NOINK); m.renderOrder = 20; scene.add(m); return m; };
const bubble = (text, w = 1.3, h = 0.7, col = "#ffffff") => overlay(w, h, (g, W, H) => {
  g.fillStyle = col; g.strokeStyle = "#1a1a1a"; g.lineWidth = 12; g.beginPath(); g.roundRect(8, 8, W - 16, H * 0.72, 40); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(W * 0.3, H * 0.72); g.lineTo(W * 0.24, H - 8); g.lineTo(W * 0.42, H * 0.72); g.closePath(); g.fill(); g.stroke(); g.fillStyle = col; g.fillRect(W * 0.3 + 6, H * 0.72 - 10, W * 0.11, 16);
  g.fillStyle = "#1a1a1a"; g.font = `900 ${Math.round(H * 0.36)}px Arial Black, Arial`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, W / 2, H * 0.38);
});

// ---------------- the island: grass, a beach, the sea, mountains ----------------
{
  const grassT = ctex(256, 256, (g, w, h) => { g.fillStyle = "#6a9a4a"; g.fillRect(0, 0, w, h); for (let i = 0; i < 600; i++) { g.strokeStyle = `rgba(${rnd() < 0.5 ? "60,100,40" : "150,190,100"},0.45)`; g.lineWidth = 2; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 7); g.stroke(); } }, 60, 12);
  const grass = add(new THREE.PlaneGeometry(260, 30), lam({ map: grassT }), 40, 0, 5); grass.rotation.x = -Math.PI / 2;
  const sand = add(new THREE.PlaneGeometry(260, 4), lam({ color: "#d9c79a" }), 40, -0.02, -12); sand.rotation.x = -Math.PI / 2;
  const sea = add(new THREE.PlaneGeometry(400, 300), lam({ color: "#3d7fb5" }), 40, -0.1, -160); sea.rotation.x = -Math.PI / 2; sea.receiveShadow = false;
  for (let i = 0; i < 9; i++) { const m = add(new THREE.ConeGeometry(18 + rnd() * 10, 22 + rnd() * 14, 6), lam({ color: "#7a8a9a" }), -60 + i * 26, 8, -220); add(new THREE.ConeGeometry(7, 8, 6), lam({ color: "#f2f4f6" }), m.position.x, m.position.y + 9 + (m.geometry.parameters.height - 22) / 2, -220); }
  // pines along the back of the farm
  for (let i = 0; i < 26; i++) { const x = -16 + i * 1.6 + rnd(), z = -8 - rnd() * 2.5, s = 0.8 + rnd() * 0.6; box(0.25, 1.2 * s, 0.25, lam({ color: "#5a3a22" }), x, 0.6 * s, z); add(new THREE.ConeGeometry(0.9 * s, 3.4 * s, 8), lam({ color: "#2f5a36" }), x, 2.5 * s, z); }
  // the farm: a log cabin, a rail fence, rows of potato plants
  const log = lam({ color: "#7a5434" });
  box(4, 2.4, 3, log, -4.5, 1.2, -5); for (let y = 0.2; y < 2.4; y += 0.3) box(4.1, 0.06, 3.05, lam({ color: "#5a3a22" }), -4.5, y, -5);
  const roof = add(new THREE.CylinderGeometry(0.1, 2.9, 1.6, 4), lam({ color: "#4a3a2a" }), -4.5, 3.2, -5); roof.rotation.y = Math.PI / 4; roof.scale.set(1.1, 1, 0.8);
  box(0.9, 1.6, 0.05, lam({ color: "#3a2a1a" }), -4.5, 0.8, -3.48);
  for (let x = -8; x < 26; x += 2.5) box(0.1, 1.0, 0.1, log, x, 0.5, -2.6); box(34, 0.07, 0.05, log, 9, 0.75, -2.6); box(34, 0.07, 0.05, log, 9, 0.4, -2.6);
  for (let r = 0; r < 5; r++) for (let i = 0; i < 18; i++) { const x = -2.5 + i * 0.42 + (r % 2) * 0.2, z = 1.6 - r * 0.75; const b = add(new THREE.SphereGeometry(0.17, 8, 6), lam({ color: "#4f8a3a" }), x, 0.12, z); b.scale.y = 0.7; b.castShadow = false; }
  for (let i = 0; i < 6; i++) { const p = add(new THREE.SphereGeometry(0.09, 8, 6), lam({ color: "#b08a5a" }), 0.6 + (rnd() - 0.5) * 1.2, 0.07, 0.8 + (rnd() - 0.5) * 0.8); p.scale.set(1.3, 0.8, 1); }
}

// ---------------- the pig ----------------
function drawPig(g, o) {
  const p = new Pen(g); g.clearRect(0, 0, 600, 1000); const ph = (o.phase || 0) * Math.PI * 2, bob = o.run ? 10 * Math.abs(Math.sin(ph)) : 0;
  const bx = 270, by = 800 - bob, pink = "#f2a8b4", dark = "#d47a8a";
  for (const [hx, off, c] of [[bx - 95, Math.PI, dark], [bx + 75, 0, dark], [bx - 70, 0, pink], [bx + 100, Math.PI, pink]]) {
    const a = o.run ? 0.5 * Math.sin(ph + off) : 0; p.line([[hx, by + 40], [hx + Math.sin(a) * 80, by + 40 + Math.cos(a) * 80]], c, 30);
  }
  p.ell(bx, by, 165, 100, pink);
  const tx = bx - 160, ty = by - 30; p.stroke([[tx, ty], [tx - 30, ty - 20], [tx - 40, ty + 10], [tx - 20, ty + 20], [tx - 30, ty - 5]], 9, "#c46a7a");
  const down = o.eat ? 1 : 0, hx = bx + 160, hy = by - 50 + down * 70;
  p.poly([[hx - 40, hy - 50], [hx - 10, hy - 110], [hx + 10, hy - 45]], dark);
  p.ell(hx, hy, 78, 70, pink);
  p.ell(hx + 72, hy + 14, 30, 26, "#e48a9a"); p.dot(hx + 64, hy + 12, 6, "#7a3a4a"); p.dot(hx + 80, hy + 14, 6, "#7a3a4a");
  if (o.happy) p.stroke([[hx + 6, hy - 22], [hx + 22, hy - 30], [hx + 38, hy - 22]], 7); else { p.dot(hx + 24, hy - 20, 11, "#ffffff"); p.dot(hx + 28, hy - 20, 6.5, "#1a1a1a"); }
  p.stroke([[hx + 20, hy + 40], [hx + 46, hy + 46]], 6);
}
const pigTex = o => clampTex(ctex(600, 1000, g => drawPig(g, o)));
const PIG = { eat: [pigTex({ eat: true, happy: true }), pigTex({ happy: true })], stand: pigTex({}) };
const pig = (() => {
  const mat = cardShade(new THREE.MeshLambertMaterial({ map: PIG.stand, alphaTest: 0.5, side: THREE.DoubleSide })), sc = 0.72;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * sc, CARD_H * sc), mat); m.layers.set(NOINK); m.castShadow = true;
  const g = new THREE.Group(); g.add(m); m.position.y = (CARD_H / 2 - CARD_H * 0.025) * sc; scene.add(g);
  g.userData.set = (tex, dir) => { mat.map = tex; m.scale.x = dir; }; return g;
})();

// ---------------- the people ----------------
const FARMER = { ...MAX, jacket: "#8a6a3a", pants: "#4a4a5a" };
const max = makeCard(FARMER, { mode: "stand", expr: "m_neutral", seed: 4, facing: 0, faceFront: true }, (p) => maxHair(p, MAX.hair, 4, 0));
const maxGun = makeCard({ ...FARMER, rifle: true }, { mode: "stand", expr: "m_stern", seed: 4, facing: 0, faceFront: true, side: true }, (p) => maxHair(p, MAX.hair, 4, 0));
const YANK = { jacket: "#2f4a8a", pants: "#7a96c0", boots: "#1a1a1a", hat: "cap", cap: "#24346a", belt: "#f1efe6", buttons: "#e8c45a", rifle: true };
const RED = { jacket: "#c0261f", pants: "#2a2a40", boots: "#1a1a1a", hat: "shako", belt: "#f1efe6", buttons: "#e8c45a", rifle: true };
const yanks = [...Array(6)].map((_, i) => T({ ...YANK, moustache: i % 3 === 1 ? "#4a3020" : undefined }, { expr: "stern", seed: 140 + i }));
const reds = [...Array(6)].map((_, i) => T({ ...RED, moustache: i % 3 === 2 ? "#5a3a20" : undefined }, { expr: "stern", seed: 160 + i }));
const hbc = T({ jacket: "#2a2a34", pants: "#4a4a5a", boots: "#1a1a1a", hat: "tophat", moustache: "#5a3a20", buttons: "#c9a040" }, { expr: "stern", seed: 181 });
const admiral = T({ ...OFFICER, jacket: "#1b2547", pants: "#f2f2ea", sash: "#c9a040", buttons: "#e8c45a", moustache: "#d8d4c8" }, { expr: "stern", seed: 190 });
const people = [max, maxGun, ...yanks, ...reds, hbc, admiral];

// ---------------- cannons, earthworks, warships ----------------
function cannon(x, z, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  const b = add(new THREE.CylinderGeometry(0.12, 0.17, 1.5, 14), lit({ color: "#2a2a2c" }), 0.3, 0.6, 0, g); b.rotation.z = Math.PI / 2 - 0.12;
  box(1.0, 0.25, 0.5, lam({ color: "#6b4a2b" }), 0, 0.35, 0, g);
  for (const s of [-1, 1]) { const w = add(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 14), lam({ color: "#5a3a22" }), -0.1, 0.32, s * 0.3, g); w.rotation.x = Math.PI / 2; }
  return g;
}
const cannons = [cannon(37.6, -0.6), cannon(36.2, -1.0), cannon(34.8, -0.7), cannon(33.4, -1.1)];
const earth = add(new THREE.BoxGeometry(6, 0.6, 1.0), lam({ color: "#7a5a3a" }), 35.6, 0.3, 0.2); earth.rotation.z = 0.02;
function warship(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
  box(7, 1.4, 2.0, lit({ color: "#1e1e22" }), 0, 0.5, 0, g); box(7.05, 0.35, 2.05, lit({ color: "#e8e2d0" }), 0, 0.75, 0, g);
  for (let i = 0; i < 8; i++) box(0.22, 0.2, 0.02, lit({ color: "#1a1a1a" }), -2.8 + i * 0.8, 0.75, 1.04, g);
  const bow = add(new THREE.ConeGeometry(1.0, 1.8, 4), lit({ color: "#1e1e22" }), 4.2, 0.5, 0, g); bow.rotation.z = -Math.PI / 2; bow.scale.set(1, 1, 0.7);
  for (const [mx, h] of [[-2, 5.5], [0.3, 6.5], [2.4, 5.0]]) {
    add(new THREE.CylinderGeometry(0.08, 0.1, h, 8), lam({ color: "#5a3a22" }), mx, 1.2 + h / 2, 0, g);
    for (const [y, w] of [[h * 0.45, 2.4], [h * 0.8, 1.8]]) { const sail = add(new THREE.PlaneGeometry(w, h * 0.3), new THREE.MeshBasicMaterial({ color: "#efe6d2", side: THREE.DoubleSide }), mx, 1.2 + y, 0.12, g); sail.castShadow = false; }
  }
  const fl = add(new THREE.PlaneGeometry(0.9, 0.55), lam({ map: ctex(90, 55, (c, w, h) => { c.fillStyle = "#c8102e"; c.fillRect(0, 0, w, h); c.fillStyle = "#1d3a8a"; c.fillRect(0, 0, w / 2, h / 2); c.strokeStyle = "#ffffff"; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(w / 2, h / 2); c.moveTo(w / 2, 0); c.lineTo(0, h / 2); c.stroke(); c.fillStyle = "#ffffff"; c.fillRect(w / 4 - 3, 0, 6, h / 2); c.fillRect(0, h / 4 - 3, w / 2, 6); }), side: THREE.DoubleSide }), -3.6, 2.4, 0, g);
  void fl; return g;
}
const ships = [warship(42, -17), warship(50, -24, 0.9), warship(33, -27, 0.85), warship(58, -32, 0.8), warship(24, -36, 0.8)];
ships.forEach(s => (s.userData.x0 = s.position.x));

// ---------------- the admiral's deck ----------------
{
  const X = 100;
  const deck = add(new THREE.PlaneGeometry(8, 6), lit({ map: ctex(256, 256, (g, w, h) => { g.fillStyle = "#a07a4a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#6b4a2b"; g.lineWidth = 3; for (let y = 0; y < h; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }, 2, 2) }), X, 2, 0); deck.rotation.x = -Math.PI / 2;
  box(8, 0.9, 0.15, lit({ color: "#3a2a1a" }), X, 2.45, -2.6); box(8, 0.12, 0.3, lit({ color: "#6b4a2b" }), X, 2.95, -2.6);
  add(new THREE.CylinderGeometry(0.16, 0.2, 9, 10), lam({ color: "#5a3a22" }), X + 1.6, 6.5, -2.2);
  box(10, 2, 7, lit({ color: "#1e1e22" }), X, 0.95, 0);
}

// ---------------- the pig's grave ----------------
{
  const X = 20;
  const stone = lam({ map: clampTex(ctex(200, 240, (g, w, h) => { g.fillStyle = "#a8a8ac"; g.fillRect(0, 0, w, h); g.fillStyle = "#3a3a3e"; g.font = "bold 30px Georgia, serif"; g.textAlign = "center"; g.fillText("HERE LIES", w / 2, 70); g.fillText("THE PIG", w / 2, 112); g.font = "bold 40px Georgia, serif"; g.fillText("1859", w / 2, 172); })) });
  box(0.75, 0.9, 0.16, [lam({ color: "#9a9a9e" }), lam({ color: "#9a9a9e" }), lam({ color: "#9a9a9e" }), lam({ color: "#9a9a9e" }), stone, lam({ color: "#9a9a9e" })], X, 0.45, -0.6);
  const mound = add(new THREE.SphereGeometry(1, 16, 8), lam({ color: "#7a5a3a" }), X, 0, 0.3); mound.scale.set(0.6, 0.15, 0.9);
  for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(0.06, 8, 6), lam({ color: ["#e84a5a", "#f2d24a", "#ffffff"][i % 3] }), X - 0.3 + i * 0.12, 0.15, -0.35);
}

// flags behind each army, so it reads as America against Britain at a glance
function flagpole(x, z, draw) {
  box(0.08, 4.2, 0.08, lam({ color: "#d8d4c8" }), x, 2.1, z);
  const f = add(new THREE.PlaneGeometry(1.5, 0.95, 10, 1), new THREE.MeshBasicMaterial({ map: clampTex(ctex(300, 190, draw)), side: THREE.DoubleSide }), x + 0.78, 3.7, z);
  return f;
}
const usFlag = flagpole(37.9, -2.0, (c, w, h) => { for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? "#ffffff" : "#b22234"; c.fillRect(0, i * h / 13, w, h / 13 + 1); } c.fillStyle = "#3c3b6e"; c.fillRect(0, 0, w * 0.42, h * 7 / 13); c.fillStyle = "#ffffff"; for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(12 + i * 24, 12 + j * 22, 4, 0, 7); c.fill(); } });
const ukFlag = flagpole(40.65, -2.0, (c, w, h) => { c.fillStyle = "#1d3a8a"; c.fillRect(0, 0, w, h); c.strokeStyle = "#ffffff"; c.lineWidth = 34; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, h); c.moveTo(w, 0); c.lineTo(0, h); c.stroke(); c.strokeStyle = "#c8102e"; c.lineWidth = 12; c.stroke(); c.fillStyle = "#ffffff"; c.fillRect(w / 2 - 28, 0, 56, h); c.fillRect(0, h / 2 - 28, w, 56); c.fillStyle = "#c8102e"; c.fillRect(w / 2 - 17, 0, 34, h); c.fillRect(0, h / 2 - 17, w, 34); });
const tag = (text, bg) => overlay(2.1, 0.55, (g, W, H) => { g.fillStyle = bg; g.strokeStyle = "#1a1a1a"; g.lineWidth = 10; g.beginPath(); g.roundRect(6, 6, W - 12, H - 12, 30); g.fill(); g.stroke(); g.fillStyle = "#1a1a1a"; g.font = `900 ${Math.round(H * 0.5)}px Arial Black, Arial`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, W / 2, H / 2 + 3); });
const tagSoldiers = tag("400 SOLDIERS", "#7ab0ff"), tagShips = tag("5 WARSHIPS", "#ff8a8a");
const note = add(new THREE.PlaneGeometry(0.34, 0.16), new THREE.MeshBasicMaterial({ map: clampTex(ctex(170, 80, (c, w, h) => { c.fillStyle = "#8ab07a"; c.fillRect(0, 0, w, h); c.strokeStyle = "#3a5a2a"; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); c.fillStyle = "#2a3a1a"; c.font = "bold 46px Georgia"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("$10", w / 2, h / 2 + 2); })), side: THREE.DoubleSide }), 0, 0, 0);
note.layers.set(NOINK);
const smokeM = new THREE.MeshBasicMaterial({ map: ctex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 30); gr.addColorStop(0, "rgba(235,235,235,0.9)"); gr.addColorStop(1, "rgba(235,235,235,0)"); g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill(); }), transparent: true, depthWrite: false });
const smoke = [...Array(6)].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), smokeM); m.layers.set(NOINK); scene.add(m); return m; });
const birdM = new THREE.MeshBasicMaterial({ map: clampTex(ctex(64, 32, (c) => { c.strokeStyle = "#1a1a1a"; c.lineWidth = 5; c.beginPath(); c.moveTo(4, 8); c.quadraticCurveTo(18, 24, 32, 14); c.quadraticCurveTo(46, 24, 60, 8); c.stroke(); })), transparent: true, depthWrite: false });
const birds = [...Array(7)].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), birdM); m.layers.set(NOINK); scene.add(m); return m; });
// the pig's ghost: wings and a halo, floating up out of the grave
const ghost = overlay(1.4, 1.5, (g, W, H) => {
  g.globalAlpha = 0.85;
  for (const s of [-1, 1]) { g.fillStyle = "#ffffff"; g.strokeStyle = "#1a1a1a"; g.lineWidth = 8; g.beginPath(); g.ellipse(W / 2 + s * 190, H * 0.52, 110, 70, s * -0.5, 0, 7); g.fill(); g.stroke(); }
  g.fillStyle = "#f7c9d0"; g.beginPath(); g.ellipse(W / 2, H * 0.6, 170, 110, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.arc(W / 2 + 120, H * 0.5, 80, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#e8a0ae"; g.beginPath(); g.ellipse(W / 2 + 190, H * 0.53, 32, 26, 0, 0, 7); g.fill(); g.stroke();
  g.lineWidth = 7; g.beginPath(); g.moveTo(W / 2 + 104, H * 0.46); g.quadraticCurveTo(W / 2 + 120, H * 0.43, W / 2 + 136, H * 0.46); g.stroke();
  g.strokeStyle = "#f2c94a"; g.lineWidth = 14; g.beginPath(); g.ellipse(W / 2 + 120, H * 0.3, 70, 18, 0, 0, 7); g.stroke();
});
const bang = overlay(1.8, 1.1, (g, W, H) => { g.fillStyle = "#ffd400"; g.strokeStyle = "#1a1a1a"; g.lineWidth = 12; g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 0.32 : 0.5; g.lineTo(W / 2 + Math.cos(a) * W * r, H / 2 + Math.sin(a) * H * r); } g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#c8102e"; g.font = "900 110px Arial Black, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("BANG!", W / 2, H / 2 + 6); });
const b10 = bubble("$10", 1.0, 0.55), b100 = bubble("$100", 1.1, 0.55), bNot = bubble("Not over a PIG.", 2.0, 0.7);

// ---------------- cameras ----------------
const W = (x, y, z) => V(x, y, z);
const CAMS = {
  hook:    [W(40, 1.35, 7.4), W(40, 1.55, -5)],
  farm:    [W(-0.05, 1.35, 5.6), W(-0.05, 1.0, -3)],
  bang:    [W(-0.1, 1.4, 4.4), W(-0.05, 1.3, 0)],
  money:   [W(10, 1.5, 4.4), W(10, 1.4, -1)],
  admiral: [W(100.0, 3.5, 4.8), W(100.0, 3.4, -2)],
  grave:   [W(20.25, 1.6, 5.6), W(20.25, 1.2, -1)],
};

start((time, tl) => {
  const shot = tl.shot, k = tl.k, st = tl.since(shot);
  const golden = shot === "grave";
  setLight(golden ? "golden" : "day", { sunI: 3.2 }); sun.intensity = golden ? 4.2 : 3.2; hemi.intensity = 0.6;
  scene.background = new THREE.Color(golden ? "#f2b37a" : "#a9cdf0"); scene.fog = new THREE.Fog(untone(golden ? "#f0c090" : "#d6e4ee"), 40, 260);
  for (const c of people) c.visible = false; pig.visible = false;
  for (const o of [bang, b10, b100, bNot]) o.visible = false;
  ships.forEach((s, i) => { s.position.y = 0.06 * Math.sin(time * 1.5 + i); s.rotation.z = 0.01 * Math.sin(time * 1.2 + i); });

  let p, l;
  if (shot === "armies") {
    const u = ease(Math.min(1, k / 0.9)); p = W(lerp(35.5, 41, u), lerp(1.7, 2.6, u), lerp(6.0, 9.0, u)); l = W(lerp(35.5, 42, u), lerp(1.0, 2.2, u), lerp(-1, -18, u));
  } else { const [p0, l0] = CAMS[shot]; p = p0.clone().lerp(l0, 0.1 * ease(k)); l = l0.clone(); }
  camera.position.copy(p); camera.lookAt(l);

  const army = (yankX, redX, z0, march = 0) => {
    yanks.forEach((c, i) => { c.visible = true; c.position.set(yankX - (i % 3) * 0.75 - (i >= 3 ? 0.35 : 0), 0, z0 - (i >= 3 ? 1.0 : 0)); c.userData.draw({ expr: "stern", side: true, faceFront: true, mode: march ? "march" : "stand", phase: (time * 1.4 + i * 0.3) % 1, stride: 0.5, blink: Math.sin(time * 2 + i) > 0.97, seed: 140 + i }); });
    reds.forEach((c, i) => { c.visible = true; c.position.set(redX + (i % 3) * 0.75 + (i >= 3 ? 0.35 : 0), 0, z0 - (i >= 3 ? 1.0 : 0)); c.userData.draw({ expr: "stern", side: true, faceFront: true, mode: march ? "march" : "stand", phase: (time * 1.4 + i * 0.3 + 0.5) % 1, stride: 0.5, blink: Math.sin(time * 2.3 + i) > 0.97, seed: 160 + i }); c.children[0].scale.x = -1; });
  };
  usFlag.visible = ukFlag.visible = shot === "hook" || shot === "armies";
  usFlag.rotation.y = 0.25 * Math.sin(time * 3); ukFlag.rotation.y = 0.25 * Math.sin(time * 3 + 1);
  for (const o of [tagSoldiers, tagShips, note, ghost]) o.visible = false; smoke.forEach(m => (m.visible = false)); birds.forEach(m => (m.visible = false));
  if (shot === "hook") {
    // a pig munching potatoes between two armies
    army(39.0, 41.0, 0.2, 1);
    pig.visible = true; pig.position.set(40, 0, 2.2); pig.userData.set(PIG.eat[Math.floor(time * 3) % 2], 1);
  }
  if (shot === "farm") {
    max.visible = true; const walk = Math.min(1, k / 0.45); max.position.set(lerp(-1.6, -0.6, ease(walk)), 0, 1.4);
    max.userData.draw(walk < 1 ? { expr: "m_neutral", mode: "stroll", phase: (st * 1.1) % 1, facing: 0, faceFront: true } : { expr: k < 0.7 ? "m_stern" : "m_shock", facing: 0, faceFront: true, blink: Math.sin(time * 2) > 0.97 });
    pig.visible = true; pig.position.set(0.65, 0, 0.8); pig.userData.set(PIG.eat[Math.floor(time * 3) % 2], -1);
  }
  if (shot === "bang") {
    maxGun.visible = true; maxGun.position.set(-0.55, 0, 0.9); maxGun.userData.draw({ expr: "m_stern", side: true, mode: "stand", facing: 0, faceFront: true });
    smoke.forEach((m, i) => { const u = Math.min(1, st * 1.4 + i * 0.06); m.visible = true; m.position.set(0.05 + u * 0.6 + i * 0.05, 1.25 + u * 0.4 + (i % 2) * 0.1, 1.0); m.scale.setScalar(0.4 + u * 1.6); m.quaternion.copy(camera.quaternion); });
    birds.forEach((m, i) => { m.visible = true; m.position.set(-2 + i * 0.7 + st * (i % 2 ? 1.2 : -0.8), 3.0 + st * (2 + i * 0.3) + 0.1 * Math.sin(time * 20 + i), -7.5); m.scale.y = 0.6 + 0.4 * Math.abs(Math.sin(time * 18 + i)); m.quaternion.copy(camera.quaternion); });
    bang.visible = st < 0.7; bang.position.set(0.15, 1.75, 1.2); bang.scale.setScalar(Math.min(0.85, 0.5 + st * 3)); bang.quaternion.copy(camera.quaternion);
  }
  if (shot === "money") {
    max.visible = hbc.visible = true; max.position.set(9.35, 0, 0.4); hbc.position.set(10.7, 0, 0.2);
    max.userData.draw({ expr: k < 0.5 ? "m_smile" : "m_worried", facing: 0, faceFront: true }); hbc.userData.draw({ expr: k < 0.5 ? "stern" : "grin", seed: 181 });
    b10.visible = k > 0.08; b10.position.set(9.5, 2.25, 0.5); b100.visible = k > 0.5; b100.position.set(10.6, 2.35, 0.3);
    b10.scale.setScalar(Math.min(1, (k - 0.08) * 8) * (1 + 0.15 * Math.max(0, 1 - (k - 0.08) * 6)));
    b100.scale.setScalar(Math.min(1, (k - 0.5) * 8) * (1 + 0.15 * Math.max(0, 1 - (k - 0.5) * 6)));
    for (const b of [b10, b100]) { b.quaternion.copy(camera.quaternion); }
    note.visible = k > 0.08; note.position.set(9.78, 1.0 + 0.02 * Math.sin(time * 6), 0.55); note.quaternion.copy(camera.quaternion);
  }
  if (shot === "armies") {
    army(36.6, 41.2, 0.3, 1);
    ships.forEach((sh, i) => { sh.position.x = sh.userData.x0 - 3 + 3 * ease(k); });
    tagSoldiers.visible = k < 0.55; tagSoldiers.position.set(p.x - 0.2, 2.6, 0.6); tagSoldiers.quaternion.copy(camera.quaternion); tagSoldiers.scale.setScalar(Math.min(1, k * 10));
    tagShips.visible = k > 0.55; tagShips.position.set(44, 6.6, -14); tagShips.scale.setScalar(3.2 * Math.min(1, (k - 0.55) * 10)); tagShips.quaternion.copy(camera.quaternion);
  } else ships.forEach(sh => (sh.position.x = sh.userData.x0));
  if (shot === "admiral") {
    admiral.visible = true; admiral.position.set(99.4, 2.0, 0.2); admiral.userData.draw({ expr: k < 0.5 ? "stern" : "smile", seed: 190, wave: k > 0.35 ? Math.abs(Math.sin(time * 6)) : 0 });
    bNot.visible = k > 0.35; bNot.position.set(99.95, 4.55, 0.3); bNot.scale.setScalar(Math.min(1, (k - 0.35) * 8)); bNot.quaternion.copy(camera.quaternion);
  }
  if (shot === "grave") {
    max.visible = true; max.position.set(19.4, 0, 0.6); max.userData.draw({ expr: "m_worried", facing: 0, faceFront: true });
    const y = yanks[0], r = reds[0]; y.visible = r.visible = true; y.position.set(20.95, 0, 0.1); r.position.set(21.45, 0, -0.5);
    y.userData.draw({ expr: "nervous", seed: 140 }); r.userData.draw({ expr: "nervous", seed: 160 }); r.children[0].scale.x = 1;
    ghost.visible = k > 0.55; const gu = Math.max(0, (k - 0.55) / 0.45); ghost.position.set(20.0 + 0.15 * Math.sin(time * 3), 1.2 + gu * 1.8, -0.3); ghost.quaternion.copy(camera.quaternion);
  }
  people.forEach((c, i) => { if (c.visible && !c.userData.noBob) c.children[0].position.y = (CARD_H / 2 - CARD_H * 0.025) + 0.012 * Math.sin(time * 3 + i * 1.7); });
  for (const c of people) if (c.visible) faceCamera(c);
  if (pig.visible) faceCamera(pig);
  if (look.bokeh) look.bokeh.uniforms.focus.value = shot === "armies" ? 14 : camera.position.distanceTo(l);
  aimSun(golden ? 140 : -40, golden ? 18 : 42, V(camera.position.x, 0, -2), 60);
});
