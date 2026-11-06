// Style calibration: a sunny kitchen corner in the "2D characters in a 3D world" look (wide lens looking down into the
// room, flat colour, ink lines, small props), with Max. Private look-match test against a reference frame; not for upload.
import { THREE, scene, camera, sun, hemi, setWaterTable, GROUND_BOTTOM, start, fxOptions } from "./kit.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { InkPass, NOINK } from "./vendor/ink.js";
import { twoTone, TONE, CHAR, untone } from "./vendor/shade.js";
import { cardShade } from "./vendor/cardshade.js";
import { LIGHTS, LOOK } from "./vendor/lights.js";
import { Pen, bodyFront, blobPts, headBlob } from "./vendor/toon.js";

const L = LIGHTS.day, LK = LOOK.day;
fxOptions.ao = false;
fxOptions.captionStyle = "story";
setWaterTable(GROUND_BOTTOM - 1, 0);
scene.traverse(o => { if (o.isMesh && o.material?.clippingPlanes?.length) o.visible = false; });
const white1 = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white1.needsUpdate = true;
let bokeh;
fxOptions.passes = [
  (s, c, W, H) => { const p = new InkPass(s, c, { widthNear: 3.6, widthFar: 2.6, color: "#1c2333" }); p.setSize(W, H); return p; },
  (s, c) => {
    bokeh = new BokehPass(s, c, { focus: 4, aperture: 0.0012, maxblur: 0.004 });
    const md = bokeh.materialDepth; md.map = white1; md.alphaTest = 0.5;
    md.onBeforeRender = (r, sc, cam, geo, obj) => { const m = obj.material; md.map = m && m.alphaTest > 0 && m.map ? m.map : white1; md.uniformsNeedUpdate = true; };
    return bokeh;
  },
];

// soft, bright interior: gentle shade, lots of lift, cool-ish shadows
const v3 = a => new THREE.Vector3(...a);
TONE.uLitCol.value.copy(v3([1.28, 1.24, 1.16])); TONE.uShadeCol.value.copy(v3([0.78, 0.78, 0.86])); TONE.uShadeLift.value.copy(v3([0.03, 0.04, 0.07]));
TONE.uLambert.value = 0.25; TONE.uSideK.value = 0.9; TONE.uTerm.value = 0.3; TONE.uSat.value = 1.05;
CHAR.uCharTint.value.copy(v3([1, 0.99, 0.98])); CHAR.uCharShade.value = 0.92; CHAR.uGrad.value = 0.05; CHAR.uBodyGrad.value = 0.18; CHAR.uSideTint.value.copy(v3(L.sideTint));
sun.color.set("#fff6e8"); sun.intensity = 2.4; hemi.intensity = 0.4;
scene.background = new THREE.Color("#f4f1ea");
scene.fog = null;

const ctex = (w, h, draw, rx = 1, ry = 1) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
};
const lam = o => twoTone(new THREE.MeshLambertMaterial(o));
const add = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
const box = (w, h, d, mat, x, y, z) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z);

// ---------- the room: back wall at z = -3, right wall at x = 2.6, floor, ceiling ----------
const RW = 2.6, BW = -3, CEIL = 3.0;
const wallTex = ctex(256, 256, (g, w, h) => { g.fillStyle = "#f5d84f"; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } });
const wall = lam({ map: wallTex });
box(9, CEIL, 0.1, wall, -1.9, CEIL / 2, BW - 0.05);
box(0.1, CEIL, 9, wall, RW + 0.05, CEIL / 2, 0.5);
box(9, 0.1, 9, lam({ color: "#f3f3f5" }), -1.9, CEIL + 0.05, 0.5);
// crown moulding and skirting
box(9, 0.12, 0.12, lam({ color: "#ffffff" }), -1.9, CEIL - 0.06, BW + 0.06); box(0.12, 0.12, 9, lam({ color: "#ffffff" }), RW - 0.06, CEIL - 0.06, 0.5);
box(9, 0.12, 0.05, lam({ color: "#ffffff" }), -1.9, 0.06, BW + 0.03); box(0.05, 0.12, 9, lam({ color: "#ffffff" }), RW - 0.03, 0.06, 0.5);
// teal and white checkered floor, laid diagonally
const floorTex = ctex(256, 256, (g, w, h) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? "#eef2ec" : "#1fa3a0"; g.fillRect(x * w / 2, y * h / 2, w / 2, h / 2); } }, 10, 10);
floorTex.rotation = Math.PI / 4; floorTex.center.set(0.5, 0.5);
const floor = add(new THREE.PlaneGeometry(9, 9), lam({ map: floorTex }), -1.9, 0, 0.5); floor.rotation.x = -Math.PI / 2;

// ---------- kitchen counter against the back wall ----------
const CX = 0.95, CW = 2.4, CD = 0.62, CH = 0.92;
const cabTex = ctex(512, 256, (g, w, h) => {
  g.fillStyle = "#4ec3b3"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#1c5b5a"; g.lineWidth = 6;
  const doors = 3, dw = w / doors;
  for (let i = 0; i < doors; i++) { g.strokeRect(i * dw + 10, 64, dw - 20, h - 84); g.strokeRect(i * dw + 24, 80, dw - 48, h - 116); g.strokeRect(i * dw + 10, 10, dw - 20, 44); g.fillStyle = "#1c5b5a"; g.fillRect(i * dw + dw / 2 - 14, 28, 28, 6); g.fillStyle = "#4ec3b3"; }
});
const cab = box(CW, CH - 0.06, CD, [lam({ color: "#43b3a4" }), lam({ color: "#43b3a4" }), lam({ color: "#43b3a4" }), lam({ color: "#43b3a4" }), lam({ map: cabTex }), lam({ color: "#43b3a4" })], CX, (CH - 0.06) / 2 + 0.05, BW + CD / 2);
box(CW - 0.1, 0.06, CD - 0.08, lam({ color: "#2c4f53" }), CX, 0.03, BW + CD / 2 - 0.02);   // kick plate
box(CW + 0.06, 0.06, CD + 0.06, lam({ color: "#f6f6f2" }), CX, CH - 0.03, BW + CD / 2 + 0.01);   // worktop
// white tile backsplash
const tileTex = ctex(256, 256, (g, w, h) => { g.fillStyle = "#f2f4f4"; g.fillRect(0, 0, w, h); g.strokeStyle = "#b9c4c8"; g.lineWidth = 4; for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } for (let y = 0; y < h; y += 32) for (let x = ((y / 32) % 2) * 32; x <= w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }, 1.4, 1.2);
box(0.75, 0.62, 0.02, lam({ map: tileTex }), CX + 0.75, CH + 0.31, BW + 0.02);
// a mug and a juice carton on the worktop
add(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 14), lam({ color: "#f6f6f6" }), CX + 0.1, CH + 0.05, BW + 0.35);
box(0.09, 0.2, 0.09, lam({ color: "#f0a73a" }), CX + 0.35, CH + 0.1, BW + 0.3).rotation.z = 0.5;

// ---------- window with curtains, calendar, wall phone, door, ceiling lamp ----------
const WX = 0.5, WY = 1.95;
box(0.86, 1.06, 0.06, lam({ color: "#ffffff" }), WX, WY, BW + 0.04);
const sky = ctex(64, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#8fc4ea"); gr.addColorStop(1, "#cfe6f6"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
add(new THREE.PlaneGeometry(0.74, 0.94), new THREE.MeshBasicMaterial({ map: sky }), WX, WY, BW + 0.075);
box(0.04, 0.94, 0.03, lam({ color: "#ffffff" }), WX, WY, BW + 0.09); box(0.74, 0.04, 0.03, lam({ color: "#ffffff" }), WX, WY + 0.1, BW + 0.09);
box(1.0, 0.07, 0.14, lam({ color: "#ffffff" }), WX, WY - 0.55, BW + 0.08);   // sill
const check = ctex(128, 128, (g, w, h) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(214,48,58,0.75)"; for (let i = 0; i < 8; i++) { g.fillRect(i * 16, 0, 8, h); g.fillRect(0, i * 16, w, 8); } }, 2, 3);
box(0.22, 0.6, 0.03, lam({ map: check }), WX + 0.3, WY - 0.2, BW + 0.11);
// calendar
const cal = ctex(128, 192, (g, w, h) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); g.fillStyle = "#e9a24a"; g.fillRect(8, 8, w - 16, 70); g.fillStyle = "#6fb050"; g.fillRect(8, 56, w - 16, 22);
  g.fillStyle = "#d8402e"; g.font = "bold 16px Arial"; g.textAlign = "center"; g.fillText("OCTOBER", w / 2, 98);
  g.fillStyle = "#555"; for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) g.fillRect(14 + c * 15, 108 + r * 15, 9, 8);
  g.strokeStyle = "#d8402e"; g.lineWidth = 2; for (let c = 0; c < 7; c++) { g.beginPath(); g.moveTo(14 + c * 15, 168); g.lineTo(23 + c * 15, 176); g.moveTo(23 + c * 15, 168); g.lineTo(14 + c * 15, 176); g.stroke(); }
});
add(new THREE.PlaneGeometry(0.36, 0.54), lam({ map: cal }), RW - 0.02, 2.2, BW + 0.75).rotation.y = -Math.PI / 2;
// red wall phone on a teal bracket, with a coiled cord
const red = lam({ color: "#d8443e" });
box(0.04, 0.32, 0.5, lam({ color: "#3a8fd8" }), RW - 0.03, 1.55, BW + 0.75);
box(0.12, 0.26, 0.2, red, RW - 0.1, 1.55, BW + 0.77);
const dial = add(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 20), lam({ color: "#f2f2f2" }), RW - 0.17, 1.55, BW + 0.77); dial.rotation.z = Math.PI / 2;
const coil = []; for (let i = 0; i <= 200; i++) { const t = i / 200; coil.push(new THREE.Vector3(RW - 0.12 + 0.03 * Math.cos(t * 60), 1.4 - 0.5 * t, BW + 0.77 + 0.03 * Math.sin(t * 60))); }
add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 400, 0.008, 5), red, 0, 0, 0);
// white door with glass panes in the right wall
const DZ = BW + 1.75;
box(0.08, 2.1, 0.95, lam({ color: "#ffffff" }), RW - 0.04, 1.05, DZ);
box(0.06, 2.2, 0.08, lam({ color: "#ffffff" }), RW - 0.05, 1.1, DZ - 0.52); box(0.06, 2.2, 0.08, lam({ color: "#ffffff" }), RW - 0.05, 1.1, DZ + 0.52);
add(new THREE.PlaneGeometry(0.62, 0.7), new THREE.MeshBasicMaterial({ map: sky }), RW - 0.085, 1.55, DZ).rotation.y = -Math.PI / 2;
box(0.04, 0.03, 0.66, lam({ color: "#ffffff" }), RW - 0.09, 1.55, DZ);
const knob = add(new THREE.SphereGeometry(0.03, 10, 8), lam({ color: "#d9b45a" }), RW - 0.11, 1.0, DZ - 0.36);
void knob;
// teal ceiling lamp
const shade = add(new THREE.SphereGeometry(0.42, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), lam({ color: "#2aa39b", side: THREE.DoubleSide }), 0.35, CEIL - 0.42, -0.55);
shade.scale.set(1, 0.42, 1);
add(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 32, 1, true), lam({ color: "#1d7f79", side: THREE.DoubleSide }), 0.35, CEIL - 0.43, -0.55);
add(new THREE.CircleGeometry(0.39, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.45, 1.3), side: THREE.DoubleSide }), 0.35, CEIL - 0.415, -0.55).rotation.x = Math.PI / 2;
add(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), lam({ color: "#2aa39b" }), 0.35, CEIL - 0.2, -0.55);
void shade;

// ---------- Max ----------
const CREAM = "#f6f1e6";
const MAX = { jacket: "#2a9d7a", pants: "#2b2b38", boots: "#20202a", hat: null, hair: "#8a5a2b", buttons: "#2a9d7a", skin: CREAM };
function maxHair(p, col, seed, facing) {
  const head = blobPts(300, 309, headBlob(seed, 118, facing));
  const hair = [[150, 300], [150, 120], [450, 120], [450, 262], [418, 246], [372, 236], [326, 246], [282, 258], [236, 268], [190, 282]];
  p.clip(head, () => p.poly(hair, col, 0));
  p.clip(head, () => p.stroke([[450, 262], [418, 246], [372, 236], [326, 246], [282, 258], [236, 268], [190, 282], [150, 300]], 9));
}
const CARD_W = 1.35, CARD_H = 2.25;
const cv = document.createElement("canvas"); cv.width = 600; cv.height = 1000;
const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
const maxCard = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), cardShade(new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide })));
maxCard.layers.set(NOINK); maxCard.castShadow = true;
maxCard.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
const max = new THREE.Group(); max.add(maxCard); maxCard.position.y = CARD_H / 2 - CARD_H * 0.025; scene.add(max);
max.position.set(0.35, 0, -1.75);
function drawMax(blink) {
  const g = cv.getContext("2d"); g.clearRect(0, 0, 600, 1000); const p = new Pen(g);
  bodyFront(p, MAX, { mode: "stand", expr: "neutral", seed: 4, facing: 1, blink, light: -2.1, prop: "mug" });
  maxHair(p, MAX.hair, 4, 1);
  tex.needsUpdate = true;
}
drawMax(false);

// ---------- camera: wide lens, looking down into the corner; sun through the window ----------
camera.fov = 62; camera.updateProjectionMatrix();
start((time) => {
  camera.position.set(-0.55, 2.2, 1.15);
  camera.lookAt(1.3, 1.15, -2.4);
  sun.position.set(-3.5, 6, 6); sun.target.position.set(0, 0, -1.5); sun.target.updateMatrixWorld();
  max.rotation.y = Math.atan2(camera.position.x - max.position.x, camera.position.z - max.position.z);
  if (bokeh) bokeh.uniforms.focus.value = camera.position.distanceTo(new THREE.Vector3(0.35, 1.4, -1.75));
  drawMax(Math.sin(time * 2.3) > 0.985);
});
