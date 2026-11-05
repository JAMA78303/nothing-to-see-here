// "The monster living in the sewer under your city": house-series cutaway style. A street over a brick sewer;
// wipes and grease pour down the drains and glue into a fatberg (with eyes); it weighs as much as 11 double-decker
// buses; cartoon workers blast it with water jets for nine weeks; and another one starts growing (loops).
import {
  THREE, scene, camera, sun, hemi, GROUND_BOTTOM, box, solid, groundBox, setWaterTable, canvasTex, house, tree, cloud,
  pipeBand, flow, waterBlob, ease, lerp, V, start, fxOptions,
} from "./kit.js";
import { folk } from "./folk.js";

fxOptions.ao = false;
setWaterTable(GROUND_BOTTOM - 1, 0);

// ---------- ground with a brick sewer running left-right, cut open along its axis ----------
const R = 1.6, SC = -5.4, SY1 = SC + R, SY0 = SC - R;
const MH = { x: 3.4, r: 0.45 };                       // manhole shaft
groundBox(-24, MH.x - MH.r, SY1, 0, -40, 0);
groundBox(MH.x + MH.r, 24, SY1, 0, -40, 0);
groundBox(MH.x - MH.r, MH.x + MH.r, SY1, 0, -40, -MH.r);
groundBox(-24, 24, GROUND_BOTTOM, SY0, -40, 0);
groundBox(-24, 24, SY0, SY1, -40, -R);
const brick = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#5a3f33"; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 * 32; x < w + 64; x += 64) { g.fillStyle = ["#8a4f3a", "#7d4634", "#93573f"][(x + y) % 3]; g.fillRect(x - 30, y + 3, 58, 26); }
  g.fillStyle = "rgba(40,60,20,0.35)"; g.fillRect(0, h * 0.7, w, h * 0.3);              // slime line
}, 14, 3);
const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 48, 48, 1, true, Math.PI / 2, Math.PI), new THREE.MeshLambertMaterial({ map: brick, side: THREE.DoubleSide }));
tunnel.rotation.z = Math.PI / 2; tunnel.position.set(0, SC, 0); scene.add(tunnel);
const sewerLight = new THREE.PointLight(0xd8f0a0, 5, 14, 1.3); sewerLight.position.set(0.5, SC + 0.4, 1.6); scene.add(sewerLight);
const sewerLight2 = new THREE.PointLight(0xd8f0a0, 4, 10, 1.3); sewerLight2.position.set(-4.5, SC + 1.0, 0.2); scene.add(sewerLight2);
box(-24, 24, SY1, SY1 + 0.28, -0.3, 0.02, solid(0x6e4232));                             // cut rim of the arch
box(-24, 24, SY0 - 0.28, SY0, -0.3, 0.02, solid(0x6e4232));
// sewage running along the bottom (left = upstream); it backs up behind the fatberg
const muck = new THREE.MeshPhongMaterial({ color: 0x6f6a3a, transparent: true, opacity: 0.85, shininess: 60, emissive: 0x1a1a08 });
const waterL = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1.6), muck); scene.add(waterL);
const waterR = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1.6), muck); scene.add(waterR);
function setWater(levelL, levelR, fx0, fx1) {
  waterL.scale.set(fx0 + 24, levelL, 1); waterL.position.set((-24 + fx0) / 2, SY0 + levelL / 2, -0.8);
  waterR.scale.set(24 - fx1, levelR, 1); waterR.position.set((fx1 + 24) / 2, SY0 + levelR / 2, -0.8);
}
// manhole shaft with a ladder, cover on the road
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(MH.r, MH.r, -SY1, 24, 1, true, Math.PI / 2, Math.PI), new THREE.MeshLambertMaterial({ color: 0x8a8f96, side: THREE.DoubleSide }));
shaft.position.set(MH.x, SY1 / 2, 0); scene.add(shaft);
for (let y = SY1 + 0.3; y < -0.2; y += 0.4) box(MH.x - 0.25, MH.x + 0.25, y - 0.03, y + 0.03, -0.35, -0.3, solid(0xb0b4ba));
const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24), new THREE.MeshLambertMaterial({ color: 0x2a2a2a })); cover.position.set(MH.x + 0.9, 0.07, 0.6); cover.rotation.z = 0.3; scene.add(cover);

// ---------- the street above ----------
const asphalt = canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#3b3d42"; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, 12, 2);
const road = new THREE.Mesh(new THREE.PlaneGeometry(48, 6), new THREE.MeshLambertMaterial({ map: asphalt })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.03, -3); scene.add(road);
for (let x = -22; x < 22; x += 3) box(x, x + 1.6, 0.035, 0.045, -3.08, -2.92, solid(0xf2f2f2));
box(-24, 24, 0, 0.18, -8, -6, solid(0xcfcac0));
house(-6, -13, 9, 0.8); house(6.5, -14, 9, 0.8); tree(-1, -8.5, 0.9); tree(12, -9, 1.0);
cloud(-10, 20, -45, 2); cloud(12, 23, -55, 2.4);
// drains from the buildings down to the sewer (drawn on the cut face), carrying wipes and grease
const DR = [-3.6, 1.2];
for (const x of DR) pipeBand([V(x, 0, 0), V(x, SY1 + 0.15, 0)], 0.22);
const wipeM = waterBlob(0xf4f4f0, 0x5a5a5a), greaseM = waterBlob(0xf0c040, 0x6a4a00);
const drops = DR.flatMap(x => [flow([V(x, 0, 0.06), V(x, SY1 - 0.4, 0.06), V(-0.9, SY0 + 0.7, -0.4)], 10, wipeM, 0.12, 1.5), flow([V(x, 0, 0.07), V(x, SY1 - 0.4, 0.07), V(-0.6, SY0 + 0.9, -0.4)], 10, greaseM, 0.1, 1.3)]);

// ---------- the fatberg ----------
const fatTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = "#c9b98a"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = ["#b5a372", "#d8cb9c", "#9c8c5e", "#e8e0c4", "#8a7a4a"][i % 5]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 4 + Math.random() * 16, 3 + Math.random() * 8, Math.random() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 60; i++) { g.fillStyle = "rgba(250,250,245,0.85)"; g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(Math.random() * 3); g.fillRect(-18, -10, 36, 20); g.restore(); }   // wipes
});
const fatGeo = new THREE.IcosahedronGeometry(1, 5);
{ const p = fatGeo.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const n = 1 + 0.12 * Math.sin(v.x * 7 + v.y * 3) * Math.cos(v.z * 6) + 0.07 * Math.sin(v.y * 13 + v.z * 9); v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z); } fatGeo.computeVertexNormals(); }
const fatMat = new THREE.MeshStandardMaterial({ map: fatTex, roughness: 0.55, metalness: 0.0, emissive: 0x2a2410 });
function makeBerg() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(fatGeo, fatMat); body.castShadow = true; g.add(body);
  // eyes on the front (blink by squashing)
  const eyes = new THREE.Group(); g.add(eyes);
  for (const sx of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff8d0 }));
    white.position.set(0.28 * sx, 0.25, 0.93); eyes.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), new THREE.MeshBasicMaterial({ color: 0x120c06 }));
    pupil.position.set(0.28 * sx, 0.24, 1.07); eyes.add(pupil);
  }
  g.userData.eyes = eyes;
  return g;
}
const berg = makeBerg(); scene.add(berg);
const BERG = { x: 0.6, len: 2.4, rad: 1.42 };
// chunks blasted off
const chunks = [];
for (let i = 0; i < 30; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1 + Math.random() * 0.08, 0), fatMat); c.userData = { v: V(-1 - Math.random() * 2, 1 + Math.random() * 2.5, (Math.random() - 0.3) * 1.5), ph: Math.random() }; scene.add(c); chunks.push(c); }

// ---------- workers with water jets ----------
const workers = [0, 1].map(i => {
  const w = folk({ body: 0xf28c28, hairStyle: "none", hat: "hardhat", hatColor: 0xf5c518, shoes: 0x2a2a2a, face: "gross" });
  w.position.set(-3.0 - i * 1.25, SY0 + 0.12, -0.75 + i * 0.1); w.rotation.y = 1.25; scene.add(w);
  const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), new THREE.MeshLambertMaterial({ color: 0x333333 })); scene.add(lance); w.userData.lance = lance;
  return w;
});
const jetM = waterBlob(0xd8f0ff, 0x3a6a8a);
const jets = workers.map(() => Array.from({ length: 26 }, (_, j) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), jetM); d.userData.ph = j / 26; scene.add(d); return d; }));
const weekTex = Array.from({ length: 9 }, (_, i) => canvasTex(256, 96, (g, w, h) => { g.fillStyle = "#ffd400"; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 22); g.fill(); g.lineWidth = 7; g.strokeStyle = "#111"; g.stroke(); g.fillStyle = "#111"; g.font = "900 58px Arial Black, Arial"; g.textAlign = "center"; g.fillText(`WEEK ${i + 1}`, w / 2, h / 2 + 21); }));
const weekTag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.68), new THREE.MeshBasicMaterial({ map: weekTex[0], transparent: true })); scene.add(weekTag);

// ---------- scale comparison set: the fatberg = 11 double-decker buses ----------
const SX = 120;
{
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), new THREE.MeshLambertMaterial({ color: 0x9a9a9a })); pad.rotation.x = -Math.PI / 2; pad.position.set(SX, 0, -10); scene.add(pad);
  for (let i = -6; i <= 6; i++) box(SX + i * 3 - 0.05, SX + i * 3 + 0.05, 0.001, 0.01, -40, 10, solid(0xd8d8d8));
}
const bigBerg = makeBerg(); bigBerg.scale.set(2.3, 1.75, 1.6); bigBerg.position.set(SX - 2.3, 1.7, -1.2); scene.add(bigBerg);
const busFront = canvasTex(128, 192, (g, w, h) => {
  g.fillStyle = "#d42a20"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#1c2a36"; g.fillRect(10, 18, w - 20, 50); g.fillRect(10, 96, w - 20, 50);         // two decks of windows
  g.fillStyle = "#111"; g.fillRect(16, 2, w - 32, 13); g.fillStyle = "#ffcc33"; g.font = "bold 12px Arial"; g.textAlign = "center"; g.fillText("88 CITY", w / 2, 12);
  g.fillStyle = "#fff6c0"; g.beginPath(); g.arc(22, 172, 8, 0, 7); g.fill(); g.beginPath(); g.arc(w - 22, 172, 8, 0, 7); g.fill();
  g.fillStyle = "#222"; g.fillRect(40, 160, w - 80, 22);
});
const busSide = new THREE.MeshLambertMaterial({ color: 0xc8261d });
const busMats = [busSide, busSide, busSide, busSide, new THREE.MeshLambertMaterial({ map: busFront }), busSide];
let busI = 0;
for (const [row, n] of [[0, 4], [1, 4], [2, 3]]) for (let i = 0; i < n; i++) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.95, 2.2), busMats);
  b.position.set(SX + 1.2 + (i - (n - 1) / 2) * 0.68, 0.48 + row * 0.98, -1.4 - (busI % 2) * 0.06); scene.add(b); busI++;
}
const tag = (text, bg, w) => new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.3), new THREE.MeshBasicMaterial({ transparent: true, map: canvasTex(512, 154, (g, W, Hh) => {
  g.fillStyle = bg; g.beginPath(); g.roundRect(6, 6, W - 12, Hh - 12, 34); g.fill(); g.lineWidth = 10; g.strokeStyle = "#111"; g.stroke();
  g.fillStyle = "#111"; g.font = "900 68px Arial Black, Arial"; g.textAlign = "center"; g.fillText(text, W / 2, Hh / 2 + 24); }) }));
const tonsTag = tag("130 TONNES", "#ffd400", 2.4); tonsTag.position.set(SX - 2.3, 4.0, -1); scene.add(tonsTag);
const busTag = tag("11 BUSES", "#ffffff", 2.0); busTag.position.set(SX + 1.2, 3.75, -1); scene.add(busTag);
const eq = tag("=", "#ffffff", 0.9); eq.position.set(SX - 0.25, 1.6, -0.6); scene.add(eq);

// ---------- timeline ----------
const HOOK = { pos: V(0.4, -1.2, 12.5), look: V(0.4, -3.6, -2) };
const cams = {
  how:   { pos: V(-1.0, -0.6, 13.5), look: V(-1.0, -3.2, -2) },
  grow:  { pos: V(0.2, -4.4, 8.0),  look: V(0.2, -5.2, -1.5) },
  scale: { pos: V(SX - 0.55, 2.7, 14.0), look: V(SX - 0.55, 2.2, -1.2) },
  blast: { pos: V(-2.9, -4.6, 7.4), look: V(-1.9, -5.4, -1.2) },
};
start((time, tl) => {
  const shot = tl.shot, k = tl.k, st0 = tl.since(shot);
  const W = 2 * Math.PI / window.duration;     // loop-locked wobble
  // camera
  let pos, look;
  if (shot === "hook") { pos = HOOK.pos.clone(); look = HOOK.look.clone(); }
  else if (shot === "end") { const e = ease(Math.min(1, k / 0.8)); pos = V(0.2, -3.0, 9.0).lerp(HOOK.pos, e); look = V(0.4, -5.0, -1.5).lerp(HOOK.look, e); }
  else { pos = cams[shot].pos.clone(); look = cams[shot].look.clone(); pos.lerp(look, 0.07 * ease(k)); }
  camera.position.copy(pos); camera.lookAt(look);

  // how big the fatberg is in each shot (end grows back to exactly the hook's starting size)
  const g0 = 0.82;
  const size = shot === "hook" ? lerp(g0, 1.0, ease(k))
    : shot === "how" ? lerp(0.55, 0.7, k)
    : shot === "grow" ? lerp(0.7, 1.0, ease(k))
    : shot === "blast" ? lerp(1.0, 0.5, ease(k))
    : shot === "end" ? lerp(0.5, g0, ease(k)) : 1;
  const breathe = 1 + 0.025 * Math.sin(W * 9 * time);
  berg.scale.set(BERG.len * size * breathe, BERG.rad * Math.min(1, 0.55 + 0.45 * size) / breathe, BERG.rad * Math.min(1, 0.55 + 0.45 * size));
  berg.position.set(BERG.x, SY0 + berg.scale.y * 0.98, -0.45);
  // eyes: open in the hook and the end (blinking), hidden while it's just "a blob"
  const showEyes = shot === "hook" || shot === "end" || shot === "scale";
  for (const B of [berg, bigBerg]) {
    B.userData.eyes.visible = showEyes;
    const blink = (Math.sin(W * 5 * time) > 0.97) ? 0.1 : 1;
    B.userData.eyes.scale.set(1, blink, 1);
    B.userData.eyes.rotation.y = 0.15 * Math.sin(W * 3 * time);
  }
  // sewage backs up behind it as it grows
  const block = Math.min(1, size);
  setWater(0.35 + 1.0 * Math.max(0, block - 0.6), 0.32 - 0.18 * Math.max(0, block - 0.6), BERG.x - BERG.len * size * 0.85, BERG.x + BERG.len * size * 0.85);

  // wipes and grease pour down the drains
  const pour = shot === "how" ? st0 + 0.3 : shot === "grow" ? 3 + st0 : -1;
  drops.forEach(f => f(pour, shot === "grow" ? st0 - 2.2 : -1));

  // workers blast it
  const blasting = shot === "blast";
  workers.forEach((w, i) => {
    w.visible = blasting;
    w.pose({ armL: [0.5, 1.3, 0.3], armR: [0.5, 1.3, 0.3], lean: 0.12 + 0.05 * Math.sin(W * 20 * time + i), headTilt: 0.1 });
    w.setFace("gross");
    w.updateMatrixWorld(true);
    const hand = w.userData.parts.armL.elbow.localToWorld(V(0, -0.25, 0)), hand2 = w.userData.parts.armR.elbow.localToWorld(V(0, -0.25, 0));
    const mid = hand.clone().add(hand2).multiplyScalar(0.5);
    const dir = V(berg.position.x - 0.8, berg.position.y + 0.1 * i, berg.position.z + 0.3).sub(mid).normalize();
    w.userData.lance.visible = blasting; w.userData.lance.position.copy(mid).addScaledVector(dir, 0.3);
    w.userData.lance.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    const tip = mid.clone().addScaledVector(dir, 0.65), target = V(berg.position.x - berg.scale.x * 0.8, berg.position.y + 0.15 * (i - 0.5), -0.1);
    jets[i].forEach(d => { d.visible = blasting; const u = (time * 3 + d.userData.ph) % 1; d.position.lerpVectors(tip, target, u); d.position.y += 0.15 * Math.sin(u * Math.PI); });
  });
  chunks.forEach(c => { const u = ((st0 * 0.9 + c.userData.ph) % 1); c.visible = blasting; if (!blasting) return; const v = c.userData.v; c.position.set(berg.position.x - berg.scale.x * 0.8 + v.x * u, berg.position.y + v.y * u - 4.9 * u * u, -0.2 + v.z * u); c.rotation.set(u * 9, u * 7, 0); });
  weekTag.visible = blasting;
  if (blasting) { const wk = Math.min(8, Math.floor(k * 9.5)); weekTag.material.map = weekTex[wk]; weekTag.position.set(camera.position.x + 0.25, -4.25, 0.4); weekTag.lookAt(camera.position); }

  // scale set
  tonsTag.position.y = 4.0 + 0.06 * Math.sin(W * 6 * time); busTag.position.y = 3.75 + 0.06 * Math.sin(W * 6 * time + 1);
  bigBerg.scale.set(2.3 * (1 + 0.03 * Math.sin(W * 9 * time)), 1.75, 1.6);
});
