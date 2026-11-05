// "What if you built your house underground": the house-series cutaway style. A cosy home buried under a lawn
// (skylight, ladder hatch, vent), seasons swinging above while the soil stays 55°F, a hundred tons of dirt on the
// roof, groundwater pushing in, then Coober Pedy's dugouts in the outback.
import {
  THREE, scene, camera, sun, hemi, M, GROUND_BOTTOM, box, solid, groundBox, groundWithHole, setWaterTable, canvasTex,
  house, tree, cloud, arrow, yellowArrowMat, arrowMat, ease, lerp, V, moveCamera, start, fxOptions,
} from "./kit.js";

fxOptions.ao = false;   // GTAO leaves a black slab over the buried roof

// ---------- the dug-out shell ----------
const H = { x0: -4, x1: 4, zBack: -7, floor: -4.6, t: 0.35, roofTop: -1.1 };
const IN = { x0: H.x0 + H.t, x1: H.x1 - H.t, zBack: H.zBack + H.t, floor: H.floor + H.t, ceil: H.roofTop - H.t };
const SH = { x0: 4, x1: 5.2 };                                   // ladder shaft beside the house
groundWithHole(H.x0, SH.x1, H.zBack, [[H.x0, H.x1, H.floor], [SH.x0, SH.x1, IN.floor]]);
// soil back on top of the roof, leaving a gap for the skylight well and the ladder shaft
const SK = { x0: -2.4, x1: -1.4 };
groundBox(H.x0, SK.x0, H.roofTop, 0, H.zBack, 0);
groundBox(SK.x1, H.x1, H.roofTop, 0, H.zBack, 0);
groundBox(SK.x0, SK.x1, H.roofTop, 0, H.zBack, -3.2);
groundBox(SK.x0, SK.x1, H.roofTop, 0, -1.4, 0);                 // the well is open only in the middle

const C = M.concrete;
box(H.x0, H.x1, H.floor, IN.floor, H.zBack, 0, C);             // floor slab
box(H.x0, IN.x0, H.floor, H.roofTop, H.zBack, 0, C);            // walls
box(IN.x1, H.x1, H.floor, IN.floor + 0.0, H.zBack, 0, C);
box(IN.x1, H.x1, IN.floor + 2.1, H.roofTop, H.zBack, 0, C);     // right wall, doorway into the shaft below
box(H.x0, H.x1, H.floor, H.roofTop, H.zBack, IN.zBack, C);       // back wall
const roofSlab = box(H.x0, H.x1, IN.ceil, H.roofTop, H.zBack, 0, C);
// black waterproof membrane wrapped round the outside of the shell
const membraneM = new THREE.MeshLambertMaterial({ color: 0x1b1b1b, emissive: 0x000000 });
const mem = () => membraneM;
box(H.x0 - 0.1, H.x0, H.floor - 0.1, H.roofTop + 0.1, H.zBack - 0.1, 0.01, mem);
box(H.x1, H.x1 + 0.1, H.floor - 0.1, IN.floor, H.zBack - 0.1, 0.01, mem);
box(H.x1, H.x1 + 0.1, IN.floor + 2.1, H.roofTop + 0.1, H.zBack - 0.1, 0.01, mem);
box(H.x0 - 0.1, H.x1 + 0.1, H.floor - 0.1, H.floor, H.zBack - 0.1, 0.01, mem);
box(H.x0 - 0.1, H.x1 + 0.1, H.roofTop, H.roofTop + 0.1, H.zBack - 0.1, 0.01, mem);
box(H.x0 - 0.1, H.x1 + 0.1, H.floor - 0.1, H.roofTop + 0.1, H.zBack - 0.1, H.zBack, mem);
// skylight light-well: concrete sides, glass dome at the top, a soft shaft of light down into the room
box(SK.x0 - 0.12, SK.x0, H.roofTop, 0.1, -3.2, -1.4, C); box(SK.x1, SK.x1 + 0.12, H.roofTop, 0.1, -3.2, -1.4, C);
const dome = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.55, shininess: 120 }));
dome.scale.set(1, 0.6, 1.3); dome.position.set((SK.x0 + SK.x1) / 2, 0.1, -2.3); scene.add(dome);
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.3, IN.ceil - IN.floor + 1.1, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2c4, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
beam.position.set((SK.x0 + SK.x1) / 2, (H.roofTop + IN.floor) / 2 + 0.3, -2.3); scene.add(beam);
// ladder shaft and a little hatch hut on the lawn
const rail = solid(0x8a8f96);
for (const x of [SH.x0 + 0.35, SH.x1 - 0.35]) box(x - 0.05, x + 0.05, IN.floor, 0.9, -3.6, -3.5, rail);
for (let y = IN.floor + 0.35; y < 0.8; y += 0.42) box(SH.x0 + 0.35, SH.x1 - 0.35, y - 0.03, y + 0.03, -3.58, -3.52, rail);
box(SH.x0 - 0.1, SH.x1 + 0.1, 0, 1.9, -4.5, -2.6, solid(0x7a5236));
box(SH.x0 - 0.2, SH.x1 + 0.2, 1.9, 2.05, -4.6, -2.5, solid(0x4a3a2a));
box(SH.x0 + 0.25, SH.x1 - 0.25, 0.05, 1.6, -2.6, -2.55, solid(0x3b2a1c));
// fresh-air vent pipe with a cap
const ventM = new THREE.MeshLambertMaterial({ color: 0xdcdcdc });
const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.6, 14), ventM); vent.position.set(2.2, 0.2, -5.2); scene.add(vent);
const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 14), ventM); cap.position.set(2.2, 1.6, -5.2); scene.add(cap);

// ---------- inside: a warm, lived-in room ----------
const f = IN.floor;
box(-3.4, -0.6, f, f + 0.03, -3.6, -1.2, solid(0xb5523b));                       // rug
const sofa = solid(0x3d7ea6);
box(-3.4, -1.6, f, f + 0.5, -6.4, -5.4, sofa); box(-3.4, -1.6, f + 0.5, f + 1.25, -6.6, -6.2, sofa);
box(-3.62, -3.4, f, f + 0.85, -6.6, -5.3, sofa); box(-1.62, -1.4, f, f + 0.85, -6.6, -5.3, sofa);
box(-3.0, -2.0, f, f + 0.42, -4.4, -3.6, solid(0x8a5a36));                       // coffee table
box(-1.0, 0.5, f, f + 0.6, -6.6, -6.1, solid(0x5b3a22));                         // TV stand
box(-0.85, 0.35, f + 0.75, f + 1.5, -6.55, -6.5, solid(0x111111));                 // TV
const tvGlow = box(-0.8, 0.3, f + 0.8, f + 1.45, -6.49, -6.48, solid(0x2a6fb0, 0x1a4f90));
box(0.8, 1.8, f, f + 2.3, -6.6, -6.1, solid(0x7a4b2e));                           // bookshelf
for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) box(0.88 + i * 0.15, 0.88 + i * 0.15 + 0.11, f + 0.15 + r * 0.55, f + 0.55 + r * 0.55 - (i % 3) * 0.06, -6.25, -6.12, solid([0xd9534f, 0x5bc0de, 0xf0ad4e, 0x5cb85c, 0xe8e2d0, 0x8e44ad][(i + r) % 6]));
box(2.0, 3.0, f, f + 0.95, -6.6, -6.0, solid(0xe8e4dc));                          // kitchen counter
box(2.0, 3.0, f + 0.95, f + 1.0, -6.6, -5.95, solid(0x4a4a4a));
box(3.0, 3.62, f, f + 2.0, -6.6, -5.9, solid(0xf2f2f2, 0x202020));                  // fridge
const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.35, 12), new THREE.MeshLambertMaterial({ color: 0xc0623a })); pot.position.set(1.3, f + 0.18, -3.4); scene.add(pot);
const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.MeshLambertMaterial({ color: 0x3f8a3a, flatShading: true })); plant.position.set(1.3, f + 0.7, -3.4); scene.add(plant);
const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.4, 16, 1, true), new THREE.MeshLambertMaterial({ color: 0xf6e3b4, emissive: 0xa07a30, side: THREE.DoubleSide }));
lampShade.position.set(-1.2, f + 1.7, -6.0); scene.add(lampShade);
box(-1.23, -1.17, f, f + 1.5, -6.03, -5.97, solid(0x333333));
const warm = new THREE.PointLight(0xffd39a, 18, 12, 1.4); warm.position.set(-0.5, IN.ceil - 0.5, -3.2); scene.add(warm);

// ---------- above ground ----------
tree(-9, -6, 1.2); tree(11, -9, 1.1); tree(-15, -12, 1.3);
house(-17, -22, 9, 0.8); house(16, -26, 9, 0.7);
cloud(-10, 18, -45, 2); cloud(12, 21, -55, 2.4);
const snow = box(-24, 24, 0, 0.14, -40, 0.02, solid(0xf4f8ff, 0x8a96aa));
snow.visible = false;
const snowRoofs = [];

// ---------- thermometers ----------
function labelTex(text, bg = "#ffffff", fg = "#111111") {
  return canvasTex(256, 112, (g, w, h) => {
    g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 26); g.fill(); g.lineWidth = 8; g.strokeStyle = "#111"; g.stroke();
    g.fillStyle = fg; g.font = "bold 74px Arial"; g.textAlign = "center"; g.fillText(text, w / 2, h / 2 + 26);
  });
}
function thermo(x, y, z, s = 1) {
  const g = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x777777 });
  const red = new THREE.MeshLambertMaterial({ color: 0xe0322a, emissive: 0x801010 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 16), white); tube.position.y = 1.3; g.add(tube);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), red); bulb.position.y = 0.1; g.add(bulb);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 12), red); g.add(col);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.66), new THREE.MeshBasicMaterial({ map: labelTex("55°F") }));
  label.position.set(-1.15, 1.4, 0.1); g.add(label);
  g.userData = { col, label, set(level) { col.scale.y = 0.15 + level * 1.9; col.position.y = 0.25 + col.scale.y / 2; } };
  g.position.set(x, y, z); g.scale.setScalar(s); scene.add(g);
  return g;
}
const LABELS = { hot: labelTex("95°F", "#ffd9c2"), cold: labelTex("10°F", "#d6e8ff"), mid: labelTex("55°F", "#e6ffe0"), out: labelTex("113°F", "#ffd9c2"), in: labelTex("75°F", "#e6ffe0") };
const tTop = thermo(-5.0, 0.15, 1.2, 1.15);
const tSoil = thermo(-5.0, -3.9, 0.15, 1.15);
tSoil.userData.label.material.map = LABELS.mid; tSoil.userData.set(0.5);

// ---------- roof load: a hundred tons of dirt ----------
const roofArrows = new THREE.Group(); scene.add(roofArrows);
for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) { const a = arrow(yellowArrowMat); a.userData.x = x; a.rotation.z = Math.PI; roofArrows.add(a); }
const tons = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.1), new THREE.MeshBasicMaterial({ map: canvasTex(512, 134, (g, w, h) => {
  g.fillStyle = "#ffd400"; g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 30); g.fill(); g.lineWidth = 10; g.strokeStyle = "#111"; g.stroke();
  g.fillStyle = "#111"; g.font = "900 88px Arial Black, Arial"; g.textAlign = "center"; g.fillText("≈100 TONS", w / 2, h / 2 + 32);
}), transparent: true }));
scene.add(tons);

// ---------- groundwater pushing in ----------
const waterArrows = new THREE.Group(); scene.add(waterArrows);
for (const [x, y, rot] of [[-5.6, -3.6, -Math.PI / 2], [-5.6, -2.2, -Math.PI / 2], [6.8, -3.0, Math.PI / 2], [-2.2, -6.6, 0], [0, -6.6, 0], [2.2, -6.6, 0]]) {
  const a = arrow(arrowMat); a.userData = { x, y, rot }; a.rotation.z = rot; waterArrows.add(a);
}

// ---------- Coober Pedy, South Australia (a separate set far off to the side) ----------
const CP = 140;
const sand = (base, spots) => () => new THREE.MeshLambertMaterial({ map: canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = spots[i % spots.length]; g.fillRect(Math.random() * w, Math.random() * h, 5, 5); }
}, 8, 8) });
box(CP - 50, CP + 50, -4, 0, -70, 12, sand("#d77a3f", ["#c46a32", "#e08a4c", "#b85f2b"]));
// a low rocky ridge with homes dug into its face
const ridgeM = sand("#c86a34", ["#b55c2a", "#d97b41", "#a8522a"]);
box(CP - 14, CP + 14, 0, 4.2, -26, -8, ridgeM);
box(CP - 10, CP + 9, 4.2, 5.4, -24, -11, ridgeM);
const doorM = solid(0x6b4128), frameM = solid(0xe8dcc6), winM = solid(0xffd77a, 0xb08a30);
for (const [dx, door] of [[-9, true], [-5.5, false], [-2, true], [2.2, true], [5.6, false], [9.2, true]]) {
  const x = CP + dx;
  if (door) { box(x - 0.75, x + 0.75, 0, 2.3, -8.1, -7.9, frameM); box(x - 0.6, x + 0.6, 0, 2.15, -7.9, -7.85, doorM); }
  else { box(x - 0.8, x + 0.8, 1.2, 2.3, -8.1, -7.9, frameM); box(x - 0.65, x + 0.65, 1.32, 2.18, -7.9, -7.85, winM); }
}
for (const [dx, dz, hgt] of [[-8, -14, 1.6], [-3, -18, 1.3], [1.5, -13, 1.8], [6.5, -16, 1.4], [-11, -20, 1.2], [9.5, -21, 1.5]]) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, hgt, 12), ventM); p.position.set(CP + dx, 4.2 + hgt / 2, dz); scene.add(p);
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.28, 12), ventM); c.position.set(CP + dx, 4.2 + hgt + 0.12, dz); scene.add(c);
}
// spoil heaps from opal mining and a few scrubby bushes
for (const [dx, dz, r] of [[-20, -30, 3], [18, -34, 3.6], [24, -18, 2.4], [-26, -16, 2.8]]) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, r * 0.9, 20), new THREE.MeshLambertMaterial({ color: 0xe8d6b8 })); m.position.set(CP + dx, r * 0.45, dz); scene.add(m);
}
for (const [dx, dz] of [[-6, -3], [7, -4], [-16, -6], [15, -2]]) {
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), new THREE.MeshLambertMaterial({ color: 0x7a8a4a, flatShading: true })); b.position.set(CP + dx, 0.4, dz); scene.add(b);
}
const cpSign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(512, 134, (g, w, h) => {
  g.fillStyle = "#3a6b3a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#fff"; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = "#fff"; g.font = "bold 66px Arial"; g.textAlign = "center"; g.fillText("COOBER PEDY", w / 2, 70); g.font = "bold 30px Arial"; g.fillText("SOUTH AUSTRALIA", w / 2, 112);
}) }));
cpSign.position.set(CP + 0.4, 2.3, 1.0); cpSign.scale.setScalar(0.8); scene.add(cpSign);
box(CP - 1.35, CP - 1.2, 0, 1.9, 0.9, 0.95, solid(0x777777)); box(CP + 2.0, CP + 2.15, 0, 1.9, 0.9, 0.95, solid(0x777777));
const tag = (text, bg, x, y, z, w = 3.2) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.3), new THREE.MeshBasicMaterial({ map: canvasTex(512, 154, (g, W, Hh) => {
  g.fillStyle = bg; g.beginPath(); g.roundRect(6, 6, W - 12, Hh - 12, 34); g.fill(); g.lineWidth = 10; g.strokeStyle = "#111"; g.stroke();
  g.fillStyle = "#111"; g.font = "900 56px Arial Black, Arial"; g.textAlign = "center"; g.fillText(text, W / 2, Hh / 2 + 20); }) })); m.position.set(x, y, z); scene.add(m); return m; };
const cpOut = tag("OUTSIDE 113°F", "#ffb38a", CP + 1.6, 7.8, -6, 4.0);
const cpIn = tag("INSIDE 75°F", "#b8f0b0", CP - 1.0, 3.4, -7.7, 3.4);
const hotSun = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.2) }));
hotSun.position.set(CP + 22, 34, -90); scene.add(hotSun);
const shimmer = new THREE.Mesh(new THREE.PlaneGeometry(60, 1.4), new THREE.MeshBasicMaterial({ color: 0xffe0b0, transparent: true, opacity: 0.18, depthWrite: false }));
shimmer.position.set(CP, 0.7, -9); scene.add(shimmer);

// ---------- a nosy mole looking for the way in ----------
const mole = new THREE.Group();
const fur = new THREE.MeshLambertMaterial({ color: 0x4a3b33 }), pink = new THREE.MeshLambertMaterial({ color: 0xf2a0b0, emissive: 0x3a1a20 });
const moleBody = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), fur); moleBody.scale.set(1, 0.85, 1.15); moleBody.position.y = 0.36; mole.add(moleBody);
const moleHead = new THREE.Group(); moleHead.position.set(0, 0.5, 0.36); mole.add(moleHead);
moleHead.add(new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 12), fur));
const snout = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 14), pink); snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.02, 0.32); moleHead.add(snout);
const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), pink); noseTip.position.set(0, -0.02, 0.47); moleHead.add(noseTip);
for (const sx of [-1, 1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0x111111 })); eye.position.set(0.11 * sx, 0.08, 0.22); moleHead.add(eye);
  const paw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), pink); paw.scale.set(1.2, 0.4, 1); paw.position.set(0.32 * sx, 0.1, 0.3); mole.add(paw);
}
mole.traverse(o => (o.castShadow = true));
scene.add(mole);
const mound = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.5, 18), new THREE.MeshLambertMaterial({ color: 0x6e4524 })); mound.position.set(2.9, 0.18, -1.6); scene.add(mound);

// ---------- timeline ----------
const cams = {
  start:  { pos: V(1.5, 1.2, 9),   look: V(2.0, 0.2, -3) },
  hook:   { pos: V(0.4, 1.6, 15),  look: V(0.4, -1.4, -4) },
  temp:   { pos: V(-3.4, 0.4, 17), look: V(-3.4, -1.2, -4) },
  roof:   { pos: V(0, 1.6, 15),    look: V(0, -0.6, -4) },
  water:  { pos: V(0.4, -1.8, 19), look: V(0.4, -3.6, -4) },
  coober: { pos: V(CP + 1, 8.5, 13), look: V(CP, 2.4, -12) },
  cta:    { pos: V(0.6, 2.4, 17),  look: V(0.6, -1.0, -4) },
};
const summerSky = scene.background;
const winterSky = new THREE.Color(0xb9c6d6), outbackSky = new THREE.Color(0x8fc6f0);
start((time, tl) => {
  const shot = tl.shot, k = tl.k;
  // the Coober Pedy set is a hard cut, so don't glide the camera from (or to) it
  let look;
  if (shot === "end") {
    // loop: glide back into the exact opening framing, so the cut to frame 1 is seamless
    const e = ease(Math.min(1, k / 0.85));
    camera.position.lerpVectors(V(0.4, 2.4, 13), cams.start.pos, e);
    look = V(0.4, -1.2, -4).lerp(cams.start.look, e);
  } else look = shot === "coober" || tl.prev === "coober" ? (camera.position.copy(cams[shot].pos), cams[shot].look.clone()) : moveCamera(cams, tl);
  if (shot === "coober") { camera.position.x += 0.6 * k; }
  camera.lookAt(look);

  // seasons: during "temp" flip between a snowy winter and a blazing summer, twice
  const season = shot === "temp" ? Math.sin(Math.max(0, k - 0.08) * Math.PI * 2.2) : 0;   // -1 winter .. +1 summer
  const winter = season < -0.15;
  snow.visible = winter;
  scene.background = shot === "coober" ? outbackSky : winter ? winterSky : summerSky;
  sun.intensity = shot === "coober" ? 3.0 : winter ? 1.3 : 2.2 + 0.6 * Math.max(0, season);
  hemi.intensity = winter ? 1.3 : 1.1;
  tTop.userData.set(0.5 + 0.45 * season);
  tTop.userData.label.material.map = season > 0.15 ? LABELS.hot : season < -0.15 ? LABELS.cold : LABELS.mid;
  tTop.visible = tSoil.visible = shot === "temp";

  // the TV flickers, the lamp glows
  tvGlow.material.emissive.setHSL(0.58, 0.6, 0.18 + 0.08 * Math.sin(time * 9) * Math.sin(time * 3.7));

  // roof load
  const roofP = shot === "roof" ? ease(Math.min(1, k / 0.25)) : 0;
  roofArrows.visible = tons.visible = roofP > 0.01;
  roofArrows.children.forEach((a, j) => {
    const push = 0.25 * Math.max(0, Math.sin(time * 7 + j * 0.6));
    a.scale.setScalar(roofP * (1 + 0.1 * Math.sin(time * 10 + j)));
    a.position.set(a.userData.x, 2.4 - push, 0.6);
  });
  tons.position.set(0, 3.5 + 0.08 * Math.sin(time * 4), 0.7); tons.scale.setScalar(Math.max(0.01, ease(Math.min(1, (k - 0.15) / 0.2))));
  roofSlab.material.emissive.setRGB(0.25 * roofP * Math.max(0, Math.sin(time * 7)), 0, 0);
  roofSlab.position.y = (IN.ceil + H.roofTop) / 2 - 0.02 * roofP * Math.max(0, Math.sin(time * 7));

  // groundwater rises and pushes in from every side; the membrane flashes to show the waterproof shell
  const wP = shot === "water" ? ease(Math.min(1, k / 0.5)) : shot === "cta" ? 0 : 0;
  setWaterTable(lerp(-12, -2.0, wP), time);
  waterArrows.visible = wP > 0.05;
  waterArrows.children.forEach((a, j) => {
    const nudge = 0.3 * Math.sin(time * 7 + j) * wP;
    a.scale.setScalar(Math.max(0.01, wP * (0.75 + 0.08 * Math.sin(time * 11 + j))));
    a.position.set(a.userData.x - Math.sin(a.userData.rot) * nudge, a.userData.y + Math.cos(a.userData.rot) * nudge, 0.5);
  });
  membraneM.emissive.setRGB(0, 0.25 * wP * (0.5 + 0.5 * Math.sin(time * 8)), 0.45 * wP * (0.5 + 0.5 * Math.sin(time * 8)));

  // the mole: pops out of its mound and sniffs about in the hook; knocks on the hatch door at the end
  const street = shot !== "coober";
  mole.visible = mound.visible = street && (shot === "hook" || shot === "cta" || shot === "temp" || shot === "end");
  if (shot === "cta") {
    mole.position.set(SH.x0 + 0.6, 0, -1.9); mole.rotation.y = Math.PI;
    moleHead.rotation.set(0.25 * Math.max(0, Math.sin(time * 14)), 0, 0);
    mole.position.z += 0.05 * Math.max(0, Math.sin(time * 14));
  } else {
    const pop = shot === "hook" ? ease(Math.min(1, tl.since("hook") / 0.5)) : shot === "end" ? 1 - ease(Math.max(0, (k - 0.55) / 0.4)) : 1;
    const wander = shot === "hook" || shot === "end" ? 0 : Math.min(1, k * 1.5);
    mole.position.set(2.9 + 0.8 * wander, -0.75 + 0.75 * pop + 0.03 * Math.abs(Math.sin(time * 9)), -1.6 - 0.3 * wander);
    mole.rotation.y = -0.4 + 0.7 * Math.sin(time * 1.6);
    moleHead.rotation.set(0.15 * Math.sin(time * 11), 0.3 * Math.sin(time * 2.3), 0);
  }
  noseTip.scale.setScalar(1 + 0.18 * Math.max(0, Math.sin(time * 16)));

  // Coober Pedy heat shimmer
  shimmer.position.y = 0.7 + 0.15 * Math.sin(time * 5);
  shimmer.material.opacity = 0.12 + 0.08 * Math.sin(time * 7);
  void snowRoofs; void GROUND_BOTTOM;
});
