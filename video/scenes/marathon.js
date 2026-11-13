// "The man who won this Olympic marathon rode in a car" (St. Louis, 1904), in the 2D-characters-in-a-3D-world style.
// Sets along x: ROAD 0 (the dusty course, the car), more sets are added shot by shot.
import { THREE, scene, camera, sun, hemi, V, ease, lerp, start } from "./kit.js";
import { blobPts, Pen } from "./vendor/toon.js";
import { cardShade } from "./vendor/cardshade.js";
import { setupStyle, setLight, aimSun, ctex, lam, lit, add, box, makeCard, makeMax, faceCamera, look, untone, townsfolk, CREAM, NOINK, CARD_W, CARD_H } from "./style2kit.js";

setupStyle({ ink: { widthNear: 4.2, widthFar: 2.8 }, blur: { aperture: 0.0024, maxblur: 0.007 } });
const rnd = (() => { let s = 31; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// short cropped hair that only covers the top of the head, so the whole face shows
const crop = col => (p) => {
  const h = p.head; if (!h) return; const rot = p.rot; p.rot = h.rot; const head = blobPts(h.x, h.y, h.blob);
  const line = [[h.x - 200, h.y - 300], [h.x + 200, h.y - 300], [h.x + 200, h.y - 78], [h.x + 60, h.y - 70], [h.x - 60, h.y - 82], [h.x - 200, h.y - 60]];
  p.clip(head, () => p.poly(line, col, 0)); p.clip(head, () => p.stroke(line.slice(2), 8)); p.rot = rot;
};
const both = (...fs) => (p, o) => fs.forEach(f => f(p, o));
const bib = n => (p) => { const h = p.head ?? { x: 300, y: 309 }; const x = h.x, y = h.y + 250; p.poly([[x - 52, y - 40], [x + 52, y - 40], [x + 52, y + 40], [x - 52, y + 40]], "#ffffff", 6); p.g.fillStyle = "#1a1a1a"; p.g.font = "bold 56px Arial"; p.g.textAlign = "center"; p.g.textBaseline = "middle"; p.g.fillText(String(n), x, y + 3); };
const T = (o, opts = {}, sc = 1, extra = null) => makeCard({ ...o, skin: o.skin ?? CREAM }, { mode: "stand", expr: "neutral", ...opts }, extra, sc);

// ---------------- the road: dust, dry grass, a rail fence, trees ----------------
{
  const dirt = ctex(256, 256, (g, w, h) => { g.fillStyle = "#c9a878"; g.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "140,110,70" : "230,210,170"},0.35)`; g.fillRect(rnd() * w, rnd() * h, 3, 2); } }, 40, 2);
  const road = add(new THREE.PlaneGeometry(400, 6), lam({ map: dirt }), 100, 0, 0); road.rotation.x = -Math.PI / 2;
  const grass = ctex(256, 256, (g, w, h) => { g.fillStyle = "#b9b264"; g.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { g.strokeStyle = `rgba(${rnd() < 0.5 ? "120,120,50" : "220,210,140"},0.4)`; g.lineWidth = 2; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 7); g.stroke(); } }, 60, 30);
  for (const z of [-60, 60]) { const gr = add(new THREE.PlaneGeometry(400, 114), lam({ map: grass }), 100, -0.01, z); gr.rotation.x = -Math.PI / 2; }
  const rail = lam({ color: "#8a6a48" });
  for (let x = -40; x < 240; x += 3) { if (x > 112 && x < 128) continue; box(0.12, 1.1, 0.12, rail, x, 0.55, -3.6); }
  for (const [x0, x1] of [[-40, 113], [127, 240]]) for (const y of [0.45, 0.9]) box(x1 - x0, 0.08, 0.06, rail, (x0 + x1) / 2, y, -3.6);
  const sign = ctex(1024, 256, (g, w, h) => { g.fillStyle = "#f2e6c8"; g.fillRect(0, 0, w, h); g.strokeStyle = "#7a3a1a"; g.lineWidth = 18; g.strokeRect(9, 9, w - 18, h - 18); g.fillStyle = "#7a1f1f"; g.font = "bold 92px Georgia, serif"; g.textAlign = "center"; g.fillText("OLYMPIC MARATHON", w / 2, 112); g.fillStyle = "#3a2a1a"; g.font = "bold 62px Georgia, serif"; g.fillText("ST. LOUIS  1904", w / 2, 200); });
  sign.wrapS = sign.wrapT = THREE.ClampToEdgeWrapping;
  for (const sx of [-2.1, 2.1]) box(0.14, 3.3, 0.14, rail, 0.5 + sx, 1.65, -3.7);
  add(new THREE.PlaneGeometry(4.4, 1.1), lam({ map: sign }), 0.5, 2.75, -3.62);
  for (let i = 0; i < 40; i++) {
    const x = -40 + i * 7 + rnd() * 4, z = -8 - rnd() * 20, s = 0.8 + rnd() * 0.8;
    box(0.3 * s, 2.4 * s, 0.3 * s, lam({ color: "#6b4a2b" }), x, 1.2 * s, z);
    const c = add(new THREE.SphereGeometry(1.5 * s, 12, 10), lam({ color: rnd() < 0.5 ? "#5f8a3a" : "#6f9a44" }), x, 2.9 * s, z); c.scale.y = 0.85;
  }
}

// ---------------- the 1904 car ----------------
const car = new THREE.Group(); scene.add(car);
{
  const red = lit({ color: "#c23a2e" }), dark = lit({ color: "#2a2422" }), brass = lit({ color: "#e0b84a" }), leather = lit({ color: "#4a3428" });
  box(2.7, 0.18, 1.15, dark, 0, 0.66, 0, car);
  box(1.25, 0.62, 1.2, red, -0.6, 1.06, 0, car); box(1.3, 0.06, 1.25, brass, -0.6, 1.38, 0, car);
  box(0.16, 0.6, 1.1, leather, -1.15, 1.62, 0, car);                                   // back seat
  box(0.75, 0.5, 0.95, red, 0.95, 0.98, 0, car); box(0.06, 0.5, 0.9, brass, 1.33, 0.98, 0, car);   // bonnet, radiator
  box(0.5, 0.3, 1.1, red, 0.25, 0.9, 0, car); box(0.12, 0.45, 1.0, leather, 0.05, 1.27, 0, car);   // front seat
  const col = add(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), dark, 0.62, 1.38, 0.0, car); col.rotation.z = 0.55;
  const wheel = add(new THREE.TorusGeometry(0.2, 0.03, 6, 20), dark, 0.42, 1.74, 0.0, car); wheel.rotation.set(0, Math.PI / 2, 0.55);
  for (const z of [0.35, -0.35]) { const l = add(new THREE.CylinderGeometry(0.09, 0.07, 0.18, 12), brass, 1.4, 1.2, z, car); l.rotation.z = Math.PI / 2; }
  const spokes = ctex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = "#1a1614"; g.lineWidth = 26; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke();
    g.strokeStyle = "#c8a46a"; g.lineWidth = 9; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); g.stroke(); }
    g.fillStyle = "#c9a040"; g.beginPath(); g.arc(128, 128, 22, 0, 7); g.fill();
  });
  spokes.wrapS = spokes.wrapT = THREE.ClampToEdgeWrapping;
  car.userData.wheels = [];
  for (const x of [1.0, -0.95]) for (const z of [0.64, -0.64]) {
    const w = add(new THREE.CircleGeometry(0.47, 28), lit({ map: spokes, alphaTest: 0.5, side: THREE.DoubleSide }), x, 0.47, z, car); car.userData.wheels.push(w);
  }
}
const driver = T({ jacket: "#5a4a3a", pants: "#3b3f52", boots: "#2a1a10", hat: "cap", cap: "#4a3a2a", moustache: "#4a3020" }, { expr: "neutral", seed: 77 });
const MAXRUN = { jacket: "#f2efe6", pants: "#2a2a40", boots: "#d8d4c8", buttons: null };
const lorz = makeMax({ expr: "m_happy", wave: 0.8 }, MAXRUN);
{ const d0 = lorz.userData.draw; }
const runners = [
  T({ jacket: "#e8e4da", pants: "#3a3a52", boots: "#2a2a2a", hat: null }, { expr: "nervous", seed: 12 }, 1, both(bib(7), crop("#3a2a1a"))),
  T({ jacket: "#c94a3a", pants: "#2a2a40", boots: "#2a2a2a", hat: null }, { expr: "shock", seed: 18 }, 1, both(bib(20), crop("#a86a3a"))),
  T({ jacket: "#3a6aa8", pants: "#2a2a40", boots: "#2a2a2a", hat: null }, { expr: "nervous", seed: 25 }, 1, both(bib(14), crop("#1a1a1a"))),
];
const crowd = [...Array(10)].map((_, i) => T(townsfolk(i), { expr: i % 3 ? "grin" : "smile", seed: 40 + i }));
const front = [...Array(5)].map((_, i) => T(townsfolk(i + 3), { expr: "grin", seed: 60 + i }, 1.05));
for (const c of front) { const m = c.children[0]; m.material.depthTest = false; m.renderOrder = 10; m.castShadow = false; c.children[1].visible = false; }   // drawn over the ground: we're looking over their heads
const dustM = new THREE.MeshBasicMaterial({ map: ctex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 30); gr.addColorStop(0, "rgba(215,190,150,0.85)"); gr.addColorStop(1, "rgba(215,190,150,0)"); g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill(); }), transparent: true, depthWrite: false });
const dust = [...Array(12)].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.8), dustM); m.layers.set(NOINK); scene.add(m); return m; });


// ---------------- the heat: a blazing sun and an empty water barrel ----------------
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(6, 40), new THREE.MeshBasicMaterial({ map: ctex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, "#fffbe0"); gr.addColorStop(0.45, "#ffe27a"); gr.addColorStop(1, "rgba(255,200,80,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }), transparent: true, depthWrite: false, fog: false }));
sunDisc.layers.set(NOINK); scene.add(sunDisc);
{
  box(0.7, 0.9, 0.7, lam({ color: "#7a5434" }), 43.2, 0.45, -2.6);
  for (const y of [0.2, 0.7]) { const hoop = add(new THREE.TorusGeometry(0.37, 0.025, 6, 20), lam({ color: "#3a3a3a" }), 43.2, y, -2.6); hoop.rotation.x = Math.PI / 2; }
  const wsign = ctex(256, 128, (g, w, h) => { g.fillStyle = "#f2e6c8"; g.fillRect(0, 0, w, h); g.strokeStyle = "#5a3a1a"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = "#2a4a8a"; g.font = "bold 58px Georgia, serif"; g.textAlign = "center"; g.fillText("WATER", w / 2, 60); g.fillStyle = "#8a1f1f"; g.font = "bold 34px Georgia, serif"; g.fillText("(empty)", w / 2, 104); });
  wsign.wrapS = wsign.wrapT = THREE.ClampToEdgeWrapping;
  box(0.08, 1.6, 0.08, lam({ color: "#7a5434" }), 43.9, 0.8, -2.7); add(new THREE.PlaneGeometry(0.9, 0.45), lam({ map: wsign }), 43.9, 1.55, -2.65);
}

// ---------------- the orchard ----------------
const apples = [];
{
  for (let i = 0; i < 9; i++) {
    const x = 114 + (i % 3) * 4 + rnd() * 1.5, z = -6 - Math.floor(i / 3) * 3.5;
    box(0.35, 2.0, 0.35, lam({ color: "#6b4a2b" }), x, 1.0, z);
    const c = add(new THREE.SphereGeometry(1.7, 14, 10), lam({ color: "#4f8a3a" }), x, 2.8, z); c.scale.y = 0.8;
    for (let j = 0; j < 9; j++) { const a = add(new THREE.SphereGeometry(0.11, 10, 8), lam({ color: "#c0392b" }), x + (rnd() - 0.5) * 2.6, 2.3 + rnd() * 1.2, z + 1.3 + rnd() * 0.3); a.castShadow = false; }
  }
  for (let i = 0; i < 10; i++) { const a = add(new THREE.SphereGeometry(0.09, 10, 8), lam({ color: i % 3 ? "#8a5a2a" : "#a83a2a" }), 118.5 + rnd() * 2.5, 0.09, -4.2 - rnd() * 1.4); apples.push(a); }
}
const apple = add(new THREE.SphereGeometry(0.1, 12, 10), lam({ color: "#a83a2a" }), 0, 0, 0);
const zzzTex = ctex(256, 256, (g, w, h) => { g.font = "900 90px Arial Black, Arial"; g.lineJoin = "round"; g.lineWidth = 14; g.strokeStyle = "#111"; g.fillStyle = "#fff"; [["Z", 40, 230, 90], ["Z", 120, 150, 70], ["z", 180, 80, 54]].forEach(([c, x, y, sz]) => { g.font = `900 ${sz}px Arial Black, Arial`; g.strokeText(c, x, y); g.fillText(c, x, y); }); });
zzzTex.wrapS = zzzTex.wrapT = THREE.ClampToEdgeWrapping;
const zzz = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: zzzTex, transparent: true, depthWrite: false })); zzz.layers.set(NOINK); scene.add(zzz);

// ---------------- the dogs ----------------
function drawDog(g, phase) {
  const p = new Pen(g); g.clearRect(0, 0, 600, 1000); const ph = phase * Math.PI * 2, bob = 10 * Math.abs(Math.sin(ph));
  const bx = 280, by = 760 - bob, col = "#8a5a32";
  for (const [hx, off, c2] of [[bx - 95, 0, "#6a4424"], [bx + 95, Math.PI, "#6a4424"], [bx - 80, Math.PI, col], [bx + 110, 0, col]]) {
    const a = 0.7 * Math.sin(ph + off); p.line([[hx, by + 30], [hx + Math.sin(a) * 90, by + 30 + Math.cos(a) * 90], [hx + Math.sin(a) * 90 + 26, by + 30 + Math.cos(a) * 90 + 60]], c2, 20);
  }
  p.line([[bx - 140, by - 10], [bx - 210, by - 80 + 20 * Math.sin(ph * 2)]], col, 18);
  p.ell(bx, by, 150, 70, col);
  const hx = bx + 160, hy = by - 85;
  p.poly([[hx - 30, hy - 40], [hx - 60, hy - 100], [hx - 5, hy - 55]], "#4a2c14");
  p.ell(hx, hy, 62, 54, col);
  p.poly([[hx + 30, hy - 10], [hx + 115, hy + 4], [hx + 112, hy + 30], [hx + 34, hy + 34]], col);
  p.poly([[hx + 40, hy + 28], [hx + 108, hy + 30], [hx + 96, hy + 62], [hx + 44, hy + 52]], "#5a1a1a");
  for (let i = 0; i < 4; i++) p.poly([[hx + 50 + i * 15, hy + 30], [hx + 58 + i * 15, hy + 30], [hx + 54 + i * 15, hy + 42]], "#ffffff", 0);
  p.dot(hx + 108, hy + 6, 9, "#1a1a1a"); p.dot(hx + 14, hy - 12, 11, "#ffffff"); p.dot(hx + 18, hy - 11, 6, "#1a1a1a"); p.stroke([[hx - 4, hy - 30], [hx + 30, hy - 18]], 7);
}
const DOG = [...Array(8)].map((_, i) => { const t = ctex(600, 1000, (g) => drawDog(g, i / 8)); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; });
const dogs = [0, 1].map(() => {
  const mat = cardShade(new THREE.MeshLambertMaterial({ map: DOG[0], alphaTest: 0.5, side: THREE.DoubleSide })), sc = 0.85;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * sc, CARD_H * sc), mat); m.layers.set(NOINK); m.castShadow = true;
  const g = new THREE.Group(); g.add(m); m.position.y = (CARD_H / 2 - CARD_H * 0.025) * sc; scene.add(g); g.userData.mat = mat; return g;
});
const barks = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.4), new THREE.MeshBasicMaterial({ map: (() => { const t = ctex(256, 112, (g, w, h) => { g.font = "900 70px Arial Black, Arial"; g.textAlign = "center"; g.lineJoin = "round"; g.lineWidth = 14; g.strokeStyle = "#111"; g.strokeText("WOOF!", w / 2, 80); g.fillStyle = "#fff"; g.fillText("WOOF!", w / 2, 80); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })(), transparent: true, depthWrite: false })); m.layers.set(NOINK); scene.add(m); return m; });

// ---------------- the finish line: stands, a crowd, a tape, a scoreboard ----------------
const FIN = 300;
const tape = [];
{
  const track = add(new THREE.PlaneGeometry(40, 6), lam({ color: "#b0603a" }), FIN, 0.012, 0); track.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 4; i++) box(30, 0.5, 1.0, lam({ color: i % 2 ? "#8a6a4a" : "#9a7a58" }), FIN, 0.25 + i * 0.5, -4.2 - i * 1.0);
  for (const sx of [-1, 1]) { box(0.12, 2.6, 0.12, lam({ color: "#f2f2f2" }), FIN + 2.5, 1.3, sx * 2.6); }
  const ban = ctex(1024, 200, (g, w, h) => { g.fillStyle = "#1f3a6a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#f2d27a"; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = "#ffffff"; g.font = "bold 130px Georgia, serif"; g.textAlign = "center"; g.fillText("FINISH", w / 2, 150); });
  ban.wrapS = ban.wrapT = THREE.ClampToEdgeWrapping;
  box(0.12, 3.4, 0.12, lam({ color: "#f2f2f2" }), FIN + 1.3, 1.7, -2.65); box(0.12, 3.4, 0.12, lam({ color: "#f2f2f2" }), FIN + 3.7, 1.7, -2.65);
  add(new THREE.PlaneGeometry(2.6, 0.55), lam({ map: ban }), FIN + 2.5, 3.1, -2.6);
  for (const z of [-1, 1]) { const t = box(0.04, 0.05, 2.6, lam({ color: "#d22" }), FIN + 2.5, 1.15, z * 1.3); tape.push(t); }
}
const stands = [...Array(16)].map((_, i) => T(townsfolk(i + 2), { expr: i % 3 ? "grin" : "smile", seed: 80 + i }, 0.95));
const board = add(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ map: (() => { const t = ctex(512, 372, (g, w, h) => { g.fillStyle = "#24302a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#8a6a4a"; g.lineWidth = 22; g.strokeRect(0, 0, w, h); g.fillStyle = "#f2f2ea"; g.font = "bold 66px Georgia, serif"; g.textAlign = "center"; g.fillText("STARTED:  32", w / 2, 140); g.fillStyle = "#ffd24a"; g.fillText("FINISHED:  14", w / 2, 270); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })() }), FIN - 1.9, 2.0, -1.4);
const bl1 = box(0.08, 2.0, 0.08, lam({ color: "#5a3a2a" }), FIN - 2.6, 1.0, -1.45), bl2 = box(0.08, 2.0, 0.08, lam({ color: "#5a3a2a" }), FIN - 1.2, 1.0, -1.45);

// ---------------- the other runners ----------------
const carvajal = T({ jacket: "#e0dcd2", pants: "#5a4a3a", boots: "#3a2a1a", hat: null }, { expr: "grin", seed: 33 }, 1, both(bib(3), crop("#2a1a10")));
const tau = T({ jacket: "#e8e4da", pants: "#3a3a52", boots: "#2a2a2a", hat: null }, { expr: "shock", seed: 44 }, 1, both(bib(35), crop("#1a1410")));
const trainers = [0, 1].map(i => T({ jacket: "#3a3a46", pants: "#2a2a34", boots: "#1a1a1a", hat: "tophat", moustache: i ? "#4a3020" : undefined }, { expr: "nervous", seed: 90 + i }));
const hicks = runners[1];
const people = [driver, lorz, ...runners, ...crowd, ...front, ...stands, carvajal, tau, ...trainers];

const SHOT_X = { hook: 0, heat: 40, apples: 120, dogs: 200, lorz: FIN, hicks: FIN, loop: FIN };

start((time, tl) => {
  const shot = tl.shot, k = tl.k, st = tl.since(shot), X0 = SHOT_X[shot];
  const hot = shot === "heat";
  setLight("day", { sunI: hot ? 4.2 : 3.4 }); sun.intensity = hot ? 4.2 : 3.4; hemi.intensity = 0.6;
  scene.background = new THREE.Color(hot ? "#f2d79a" : "#9cc8ea"); scene.fog = new THREE.Fog(untone(hot ? "#f0d8a0" : "#e8dcc0"), hot ? 20 : 30, 120);
  for (const c of people) c.visible = false;
  car.visible = false; dogs.forEach(d => (d.visible = false)); barks.forEach(b => (b.visible = false)); zzz.visible = false; apple.visible = false; sunDisc.visible = false;
  dust.forEach(m => (m.visible = false)); board.visible = bl1.visible = bl2.visible = shot === "loop";
  const runPose = (r, i, sp, seed, expr = "nervous") => r.userData.draw({ expr, side: true, faceFront: true, mode: "run", stride: 1.25, phase: (time * sp + i * 0.37) % 1, seed });
  const kickDust = (x0, z, rate = 1.4) => dust.forEach((m, i) => { const u = (time * rate + i / 12) % 1; m.visible = true; m.position.set(x0 - u * 3, 0.3 + u * 0.7, z + (i % 3 - 1) * 0.5); m.scale.setScalar(0.7 + u * 2.2); m.quaternion.copy(camera.quaternion); });
  let camP, camL, focus;

  if (shot === "hook") {
    // the car overtakes the runners
    const cx = 1.3 + st * 2.0, camX = 0.45 + st * 1.3;
    car.visible = true; car.position.set(cx, 0.03 * Math.abs(Math.sin(time * 16)), -1.1); car.rotation.z = 0.012 * Math.sin(time * 11);
    driver.visible = lorz.visible = true;
    driver.position.set(cx + 0.12, 0.58 + car.position.y, -1.1); driver.userData.draw({ expr: "stern", seed: 77, side: true, mode: "push", pose: 0.15 });
    lorz.position.set(cx - 0.75, 0.62 + car.position.y, -1.15); lorz.userData.draw({ expr: "m_happy", wave: Math.abs(Math.sin(time * 7)) });
    runners.forEach((r, i) => { if (i === 2) return; r.visible = true; r.position.set(-1.05 + i * 0.75 + st * 0.9, 0, 1.4 - i * 0.5); runPose(r, i, 2.6, [12, 18, 25][i]); });
    kickDust(cx - 1.6, -1.1);
    crowd.forEach((c, i) => { c.visible = true; c.position.set(camX - 2.6 + i * 0.62 + (i % 2) * 0.15, 0, -3.0 - (i % 2) * 0.35); c.userData.draw({ expr: i % 3 ? "grin" : "smile", seed: 40 + i, wave: i % 2 ? Math.abs(Math.sin(time * 6 + i)) : 0 }); });
    front.forEach((c, i) => { c.visible = true; c.position.set(camX - 1.15 + i * 0.6, -1.62 + 0.05 * Math.abs(Math.sin(time * 8 + i)), 3.0 + (i % 2) * 0.25); c.userData.draw({ expr: "grin", seed: 60 + i, wave: Math.abs(Math.sin(time * 7 + i * 1.3)) }); });
    camP = V(camX + 0.35, 1.4, 6.6); camL = V(camX - 0.1, 1.25, -0.5); focus = V(cx - 0.6, 1.4, -1.1);
  }
  if (shot === "heat") {
    // a blazing sun, an official car choking them with dust, an empty water barrel
    sunDisc.visible = true; sunDisc.position.set(X0 + 6, 18, -40); sunDisc.scale.setScalar(1 + 0.04 * Math.sin(time * 3));
    const cx = X0 - 2 + st * 3.0; car.visible = true; car.position.set(cx, 0.03 * Math.abs(Math.sin(time * 16)), -1.4); driver.visible = true; driver.position.set(cx + 0.12, 0.58, -1.4); driver.userData.draw({ expr: "stern", seed: 77, side: true, mode: "push", pose: 0.15 });
    kickDust(cx - 1.4, -0.6, 1.8);
    [0, 1, 2].forEach(i => { const r = runners[i]; r.visible = true; r.position.set(X0 - 1.5 + i * 0.9 + st * 0.5, 0, 0.9 - i * 0.4); runPose(r, i, 1.4, [12, 18, 25][i], i === 1 ? "shock" : "nervous"); });
    camP = V(X0 + 0.4 + st * 0.3, 1.9, 7.8); camL = V(X0 + 0.6 + st * 0.3, 2.4, -2); focus = V(X0, 1.2, 0.5);
  }
  if (shot === "apples") {
    // he stops for apples... and falls asleep under the tree
    carvajal.visible = true; carvajal.position.set(X0, 0, -4.6);
    const eating = k < 0.48;
    carvajal.userData.draw({ expr: eating ? "grin" : "neutral", mode: "sit", blink: eating ? 0 : 1, seed: 33 });
    apple.visible = eating; apple.position.set(X0 + 0.32, 1.0 + 0.06 * Math.sin(time * 9), -4.45);
    zzz.visible = !eating; zzz.position.set(X0 + 0.45, 1.65 + 0.08 * Math.sin(time * 2), -4.4); zzz.quaternion.copy(camera.quaternion);
    camP = V(X0 + 0.2, 1.3, 0.2 - 0.6 * ease(k)); camL = V(X0, 0.9, -4.6); focus = V(X0, 0.8, -4.6);
  }
  if (shot === "dogs") {
    // chased a mile off course by wild dogs
    const rx = X0 + st * 3.4; tau.visible = true; tau.position.set(rx, 0, 1.6); runPose(tau, 0, 3.4, 44, "shock");
    dogs.forEach((d, i) => { d.visible = true; d.position.set(rx - 1.05 - i * 0.8, 0, 1.75 + i * 0.35); d.userData.mat.map = DOG[Math.floor(((time * 3.2 + i * 0.4) % 1) * 8)]; });
    barks.forEach((b, i) => { b.visible = Math.sin(time * 9 + i * 2) > 0; b.position.set(rx - 0.75 - i * 0.8, 1.15 + i * 0.25, 1.8 + i * 0.35); b.quaternion.copy(camera.quaternion); });
    camP = V(rx - 0.55, 1.3, 6.0); camL = V(rx - 0.65, 0.95, 0); focus = V(rx - 0.8, 1.0, 1.5);
  }
  if (shot === "lorz" || shot === "hicks" || shot === "loop") {
    stands.forEach((c, i) => { c.visible = true; c.position.set(FIN - 3.5 + (i % 8) * 1.0 + (i >= 8 ? 0.5 : 0), i >= 8 ? 1.0 : 0.5, i >= 8 ? -5.2 : -4.2); c.userData.draw({ expr: shot === "hicks" ? "nervous" : "grin", seed: 80 + i, wave: shot === "lorz" && i % 2 ? Math.abs(Math.sin(time * 6 + i)) : 0 }); });
  }
  if (shot === "lorz") {
    // the car drops him off; he jogs over the line, arms up
    const drop = 0.32, cx = FIN - 9 + 6 * ease(Math.min(1, k / drop));
    car.visible = true; car.position.set(cx, 0, -1.2); driver.visible = true; driver.position.set(cx + 0.12, 0.58, -1.2); driver.userData.draw({ expr: "stern", seed: 77, side: true, mode: "push", pose: 0.15 });
    lorz.visible = true;
    if (k < drop) { lorz.position.set(cx - 0.75, 0.62, -1.25); lorz.userData.draw({ expr: "m_happy", wave: 0.7 }); }
    else { const u = (k - drop) / (1 - drop), x = lerp(cx - 0.2, FIN + 3.4, Math.min(1, u * 1.15)); lorz.position.set(x, 0, 0.3); lorz.userData.draw(x < FIN + 2.6 ? { expr: "m_happy", side: true, mode: "run", stride: 1.0, phase: (time * 2.2) % 1 } : { expr: "m_happy", wave: 1 }); }
    const broke = lorz.position.x > FIN + 2.5;
    tape.forEach((t, i) => { t.rotation.x = broke ? (i ? 1 : -1) * 0.9 : 0; t.position.y = broke ? 0.75 : 1.15; });
    const fx = Math.min(FIN + 2.8, lorz.position.x + 0.3); camP = V(fx + 0.2, 1.55, 6.2); camL = V(fx, 1.35, -1); focus = V(lorz.position.x, 1.2, 0.3);
  }
  if (shot === "hicks") {
    // the real winner, held up by his team
    tape.forEach(t => { t.rotation.x = 0; t.position.y = 1.15; });
    const x = FIN - 1.2 + 2.6 * k; hicks.visible = true; hicks.position.set(x, 0, 0.6);
    hicks.userData.draw({ expr: "nervous", mode: "stroll", phase: (time * 0.8) % 1, blink: Math.sin(time * 3) > 0.4, seed: 18 });
    trainers.forEach((tr, i) => { tr.visible = true; tr.position.set(x + (i ? 0.62 : -0.62), 0, 0.5); tr.userData.draw({ expr: "nervous", side: true, mode: "push", pose: 0.35, seed: 90 + i }); tr.children[0].scale.x = i ? -1 : 1; });
    camP = V(x + 0.2, 1.35, 4.6); camL = V(x, 1.15, 0); focus = V(x, 1.2, 0.6);
  }
  if (shot === "loop") {
    // fourteen of thirty-two; Lorz rolls off in the car again, waving
    tape.forEach((t, i) => { t.rotation.x = (i ? 1 : -1) * 0.9; t.position.y = 0.75; });
    const cx = FIN - 0.6 + st * 1.2; car.visible = true; car.position.set(cx, 0.03 * Math.abs(Math.sin(time * 16)), -3.0); driver.visible = lorz.visible = true;
    driver.position.set(cx + 0.12, 0.58, -3.0); driver.userData.draw({ expr: "stern", seed: 77, side: true, mode: "push", pose: 0.15 });
    lorz.position.set(cx - 0.75, 0.62, -3.05); lorz.userData.draw({ expr: "m_happy", wave: Math.abs(Math.sin(time * 7)) });
    camP = V(FIN - 1.0, 1.7, 6.0); camL = V(FIN - 1.0, 1.7, -2); focus = V(FIN - 1.9, 2.0, -1.4);
  }
  car.userData.wheels.forEach(w => (w.rotation.z = -time * 9));
  camera.position.copy(camP); camera.lookAt(camL);
  for (const c of people) if (c.visible) faceCamera(c);
  for (const d of dogs) if (d.visible) faceCamera(d);
  if (look.bokeh) look.bokeh.uniforms.focus.value = camera.position.distanceTo(focus);
  aimSun(-45, 40, V(camera.position.x, 0, 0), 60);
});
