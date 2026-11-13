// "The man who won this Olympic marathon rode in a car" (St. Louis, 1904), in the 2D-characters-in-a-3D-world style.
// Sets along x: ROAD 0 (the dusty course, the car), more sets are added shot by shot.
import { THREE, scene, camera, sun, hemi, V, ease, lerp, start } from "./kit.js";
import { blobPts } from "./vendor/toon.js";
import { setupStyle, setLight, aimSun, ctex, lam, lit, add, box, makeCard, makeMax, faceCamera, look, untone, townsfolk, CREAM, NOINK } from "./style2kit.js";

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
  for (let x = -40; x < 240; x += 3) { box(0.12, 1.1, 0.12, rail, x, 0.55, -3.6); }
  for (const y of [0.45, 0.9]) box(280, 0.08, 0.06, rail, 100, y, -3.6);
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

start((time, tl) => {
  const shot = tl.shot, k = tl.k, st = tl.since(shot);
  setLight("day", { sunI: 3.4 }); sun.intensity = 3.4; hemi.intensity = 0.6;
  scene.background = new THREE.Color("#9cc8ea"); scene.fog = new THREE.Fog(untone("#e8dcc0"), 30, 120);

  // the car overtakes the runners
  const cx = 1.3 + st * 2.0, camX = 0.45 + st * 1.3;
  car.position.set(cx, 0.03 * Math.abs(Math.sin(time * 16)), -1.1); car.rotation.z = 0.012 * Math.sin(time * 11);
  car.userData.wheels.forEach(w => (w.rotation.z = -time * 9));
  driver.position.set(cx + 0.12, 0.58 + car.position.y, -1.1); driver.userData.draw({ expr: "stern", seed: 77, side: true, mode: "push", pose: 0.15 });
  lorz.position.set(cx - 0.75, 0.62 + car.position.y, -1.15); lorz.userData.draw({ expr: "m_happy", wave: Math.abs(Math.sin(time * 7)) });
  runners.forEach((r, i) => { r.position.set(i === 2 ? -9 : -1.05 + i * 0.75 + st * 0.9, 0, 1.4 - i * 0.5); r.userData.draw({ expr: ["nervous", "nervous", "nervous"][i], side: true, faceFront: true, mode: "run", stride: 1.25, phase: (time * 2.6 + i * 0.37) % 1, seed: [12, 18, 25][i] }); });
  dust.forEach((m, i) => { const u = (time * 1.4 + i / 12) % 1; m.position.set(cx - 1.6 - u * 3, 0.3 + u * 0.7, -1.1 + (i % 3 - 1) * 0.5); m.scale.setScalar(0.7 + u * 2.2); m.quaternion.copy(camera.quaternion); });

  camera.position.set(camX + 0.35, 1.4, 6.6); camera.lookAt(V(camX - 0.1, 1.25, -0.5));
  crowd.forEach((c, i) => { c.position.set(camX - 2.6 + i * 0.62 + (i % 2) * 0.15, 0, -3.0 - (i % 2) * 0.35); c.userData.draw({ expr: i % 3 ? "grin" : "smile", seed: 40 + i, wave: i % 2 ? Math.abs(Math.sin(time * 6 + i)) : 0 }); });
  front.forEach((c, i) => { c.position.set(camX - 1.15 + i * 0.6, -1.62 + 0.05 * Math.abs(Math.sin(time * 8 + i)), 3.0 + (i % 2) * 0.25); c.userData.draw({ expr: "grin", seed: 60 + i, wave: Math.abs(Math.sin(time * 7 + i * 1.3)) }); });
  for (const c of [driver, lorz, ...runners, ...crowd, ...front]) faceCamera(c);
  if (look.bokeh) look.bokeh.uniforms.focus.value = camera.position.distanceTo(V(cx - 0.6, 1.4, -1.1));
  aimSun(-45, 40, V(cx, 0, 0), 60);
});
