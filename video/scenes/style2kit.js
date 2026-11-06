// Shared toolkit for the "2D characters in a painted, ink-outlined 3D world" style (see style2.js / kitchen2.js tests).
// Look code from scenes/vendor (MIT, mromidev/claude-animated-shorts). Max and the stories are our own.
import { THREE, scene, camera, sun, hemi, setWaterTable, GROUND_BOTTOM, fxOptions } from "./kit.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { InkPass, NOINK } from "./vendor/ink.js";
import { twoTone, TONE, CHAR, untone } from "./vendor/shade.js";
import { cardShade } from "./vendor/cardshade.js";
import { LIGHTS, LOOK } from "./vendor/lights.js";
import { Pen, bodyFront, blobPts, headBlob, townsfolk } from "./vendor/toon.js";
export { NOINK, untone, LIGHTS, LOOK, townsfolk };

const v3 = a => new THREE.Vector3(...a);
const WHITE1 = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); WHITE1.needsUpdate = true;
export const look = { bokeh: null, ink: null };

/** set up ink + background blur + story captions, and drop the cutaway-scene groundwater overlay */
export function setupStyle({ ink = {}, blur = { aperture: 0.003, maxblur: 0.008 } } = {}) {
  fxOptions.ao = false;
  fxOptions.captionStyle = "story";
  setWaterTable(GROUND_BOTTOM - 1, 0);
  scene.traverse(o => { if (o.isMesh && o.material?.clippingPlanes?.length) o.visible = false; });
  fxOptions.passes = [
    (s, c, W, H) => { look.ink = new InkPass(s, c, ink); look.ink.setSize(W, H); return look.ink; },
    (s, c) => {
      look.bokeh = new BokehPass(s, c, { focus: 4, ...blur });
      const md = look.bokeh.materialDepth; md.map = WHITE1; md.alphaTest = 0.5;
      md.onBeforeRender = (r, sc, cam, geo, obj) => { const m = obj.material; md.map = m && m.alphaTest > 0 && m.map ? m.map : WHITE1; md.uniformsNeedUpdate = true; };
      return look.bokeh;
    },
  ];
}

/** apply a light preset ("day" | "golden" | an object overriding fields) to the world and the cards */
export function setLight(name, over = {}) {
  const L = { ...LIGHTS[name] ?? LIGHTS.day, ...over }, LK = LOOK[name] ?? LOOK.day;
  TONE.uLitCol.value.copy(v3(L.lit)); TONE.uShadeCol.value.copy(v3(L.shade)); TONE.uShadeLift.value.copy(v3(L.lift));
  TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uSat.value = over.sat ?? LK.sat; TONE.uBounce.value.copy(v3(LK.bounce));
  CHAR.uCharTint.value.copy(v3(L.charTint)); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.copy(v3(L.sideTint));
  sun.color.set(L.sunCol); sun.intensity = L.sunI; sun.shadow.bias = L.bias; sun.shadow.normalBias = L.normalBias;
  hemi.color.set(L.sky); hemi.groundColor.set(L.ground); hemi.intensity = L.hemiI;
  return L;
}

/** put the sun at (azimuth, elevation) in degrees relative to the camera's view direction, aimed at `target` */
export function aimSun(azDeg, elDeg, target, dist = 40) {
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x), az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
  const dir = fwd.multiplyScalar(Math.cos(az)).addScaledVector(right, Math.sin(az)).normalize();
  sun.position.copy(target).addScaledVector(dir, Math.cos(el) * dist).add(new THREE.Vector3(0, Math.sin(el) * dist, 0));
  sun.target.position.copy(target); sun.target.updateMatrixWorld();
}

export function ctex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
  return t;
}
/** two-tone (sunlit) material for outdoor sets */
export const lam = o => twoTone(new THREE.MeshLambertMaterial(o));
/** plain lit material for interiors lit by lamps and lanterns (point lights) */
export const lit = o => new THREE.MeshLambertMaterial(o);
export function add(geo, mat, x, y, z, parent = scene) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
export const box = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);

// ---------- characters as lit flat cards ----------
export const CREAM = "#f6f1e6";
export const MAX = { jacket: "#1f8a9a", pants: "#2b2b38", boots: "#2a2422", hat: null, hair: "#8a5a2b", buttons: "#e8c45a", skin: CREAM };
/** Max's hair: a small side-swept cap with a flick, clipped to the head */
export function maxHair(p, col = MAX.hair, seed = 4, facing = 0) {
  const head = blobPts(300, 309, headBlob(seed, 118, facing));
  const hair = [[150, 300], [150, 120], [450, 120], [450, 262], [418, 246], [372, 236], [326, 246], [282, 258], [236, 268], [190, 282]];
  p.clip(head, () => p.poly(hair, col, 0));
  p.clip(head, () => p.stroke([[450, 262], [418, 246], [372, 236], [326, 246], [282, 258], [236, 268], [190, 282], [150, 300]], 9));
}
export const CARD_W = 1.35, CARD_H = 2.25;   // 600 x 1000 design units -> metres (an adult ~1.75 m tall)
/** a character card: group at the feet. draw(opts) redraws the drawing (expression, pose, prop, blink...) */
export function makeCard(outfit, base = {}, extra = null, scale = 1) {
  const cv = document.createElement("canvas"); cv.width = 600; cv.height = 1000;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * scale, CARD_H * scale), cardShade(new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide })));
  m.layers.set(NOINK); m.castShadow = true;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  const g = new THREE.Group(); g.add(m); m.position.y = (CARD_H / 2 - CARD_H * 0.025) * scale;
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42 * scale, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; blob.scale.set(1, 0.45, 1); blob.layers.set(NOINK); g.add(blob);
  let lastKey = "";
  g.userData.draw = (o = {}) => {
    const opts = { ...base, ...o }, key = JSON.stringify(opts);
    if (key === lastKey) return;
    lastKey = key;
    const c = cv.getContext("2d"); c.clearRect(0, 0, 600, 1000);
    const p = new Pen(c); bodyFront(p, outfit, opts); if (extra) extra(p, opts);
    tex.needsUpdate = true;
  };
  g.userData.draw({});
  scene.add(g);
  return g;
}
/** turn a card to face the camera (yaw only) */
export function faceCamera(card) { card.rotation.y = Math.atan2(camera.position.x - card.position.x, camera.position.z - card.position.z); }
export const makeMax = (base = {}) => makeCard(MAX, { mode: "stand", expr: "neutral", seed: 4, ...base }, (p, o) => maxHair(p, MAX.hair, o.seed ?? 4, o.facing ?? 0));
