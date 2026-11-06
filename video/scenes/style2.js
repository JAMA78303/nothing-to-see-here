// Style v2 test: "2D cartoon characters in a painted, ink-outlined 3D world". Look values, character drawing, painted
// textures, two-tone lighting and the ink pass come from mromidev/claude-animated-shorts (MIT, scenes/vendor/).
// Max is our own character: a flat card with a bean head, brown hair with his curl, teal coat with gold buttons.
import { THREE, scene, camera, sun, hemi, setWaterTable, GROUND_BOTTOM, V, start, fxOptions } from "./kit.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { InkPass, NOINK } from "./vendor/ink.js";
import { twoTone, TONE, CHAR, untone } from "./vendor/shade.js";
import { cardShade } from "./vendor/cardshade.js";
import { LIGHTS, LOOK } from "./vendor/lights.js";
import { facadeHD, roofHD, cobbleHD, stoneHD, rep } from "./vendor/paint.js";
import { Pen, bodyFront, townsfolk, INK, blobPts, headBlob } from "./vendor/toon.js";

const PRESET = new URLSearchParams(location.search).get("light") === "golden" ? "golden" : "day";
const L = LIGHTS[PRESET], LK = LOOK[PRESET];
fxOptions.ao = false;
fxOptions.captionStyle = "story";
const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.needsUpdate = true;
let bokeh;
const QS = new URLSearchParams(location.search);
fxOptions.passes = [
  (s, c, W, H) => { const p = new InkPass(s, c); p.setSize(W, H); if (QS.get("noink")) p.enabled = false; return p; },
  (s, c) => {
    // background blur focused on the character; its depth pass respects the cards' cut-out so no rectangle halo
    bokeh = new BokehPass(s, c, { focus: 4.0, aperture: 0.0035, maxblur: 0.009 });
    const md = bokeh.materialDepth; md.map = white; md.alphaTest = 0.5;
    md.onBeforeRender = (r, sc, cam, geo, obj) => { const m = obj.material; md.map = m && m.alphaTest > 0 && m.map ? m.map : white; md.uniformsNeedUpdate = true; };
    if (QS.get("noblur")) bokeh.enabled = false;
    return bokeh;
  },
];
setWaterTable(GROUND_BOTTOM - 1, 0);
// the kit's groundwater overlay (for cutaway scenes) is hidden by a clip plane, which the ink pass can't see: remove it
scene.traverse(o => { if (o.isMesh && o.material?.clippingPlanes?.length) o.visible = false; });

// ---------- light, sky, fog from the preset ----------
const v3 = a => new THREE.Vector3(...a);
TONE.uLitCol.value.copy(v3(L.lit)); TONE.uShadeCol.value.copy(v3(L.shade)); TONE.uShadeLift.value.copy(v3(L.lift));
TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uSat.value = LK.sat; TONE.uBounce.value.copy(v3(LK.bounce));
CHAR.uCharTint.value.copy(v3(L.charTint)); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.copy(v3(L.sideTint));
sun.color.set(L.sunCol); sun.intensity = L.sunI; sun.shadow.bias = L.bias; sun.shadow.normalBias = L.normalBias;
hemi.color.set(L.sky); hemi.groundColor.set(L.ground); hemi.intensity = L.hemiI;
const sky = document.createElement("canvas"); sky.width = 8; sky.height = 512;
{ const g = sky.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 512); const c = LK.sky.c;
  gr.addColorStop(0, PRESET === "day" ? "#6ea6e6" : c[4]); gr.addColorStop(0.35, PRESET === "day" ? "#8fbbec" : c[3]); gr.addColorStop(0.62, c[2]); gr.addColorStop(0.82, c[1]); gr.addColorStop(1, c[0]); g.fillStyle = gr; g.fillRect(0, 0, 8, 512); }
const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace;
scene.background = skyTex;
scene.fog = new THREE.Fog(untone(L.fog), L.fogNear, L.fogFar);

// ---------- the world: a painted street running away from the camera ----------
const lam = o => twoTone(new THREE.MeshLambertMaterial(o));
const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
const ROAD = 3.2, WALK = 5.4;
const road = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * ROAD, 140), lam({ map: rep(cobbleHD(), 3, 47) })), 0, 0, -60); road.rotation.x = -Math.PI / 2;
for (const s of [-1, 1]) {
  const walk = add(new THREE.Mesh(new THREE.BoxGeometry(WALK - ROAD, 0.16, 140), lam({ map: rep(stoneHD(), 1, 60) })), s * (ROAD + WALK) / 2, 0.08, -60);
  void walk;
}
const STYLES = [
  { wall: "#e6cfa6", shutter: "#3f6a5a" }, { wall: "#cf7f5a", shutter: "#2f4a6a", brick: true }, { wall: "#efe2c8", shutter: "#8a3b3b" },
  { wall: "#d9b26a", shutter: "#3b4f7a" }, { wall: "#b5543c", shutter: "#3b3f52", brick: true }, { wall: "#e9d7b8", shutter: "#5a7a3a", timber: true },
];
const ROOFS = ["#9a4a32", "#5a5f6e", "#8a5a3a", "#7a3f30"];
let id = 0;
for (const s of [-1, 1]) {
  let z = 8;
  for (let i = 0; i < 9; i++) {
    const w = 6 + ((i * 7 + (s > 0 ? 3 : 0)) % 3) * 0.9, h = [7, 8.4, 9.8][(i + (s > 0 ? 1 : 0)) % 3], d = 7, st = STYLES[(i + (s > 0 ? 3 : 0)) % STYLES.length];
    const front = lam({ map: facadeHD(`s2_${id}`, w, h, { ...st, door: true }) }), side = lam({ map: facadeHD(`s2s_${id}`, d, h, st) }), plain = lam({ color: st.wall });
    // BoxGeometry faces: +x, -x, +y, -y, +z, -z. The facade goes on the side that faces the street.
    const mats = s < 0 ? [front, plain, plain, plain, side, side] : [plain, front, plain, plain, side, side];
    const x = s * (WALK + d / 2), zc = z - w / 2;
    add(new THREE.Mesh(new THREE.BoxGeometry(d, h, w - 0.1), mats), x, h / 2, zc);
    // gable roof running along the street, painted tiles, a chimney
    const roofGeo = new THREE.CylinderGeometry(0.01, d * 0.62, 2.4, 4, 1);
    const roof = add(new THREE.Mesh(roofGeo, lam({ map: rep(roofHD(ROOFS[i % 4]), 2, 1) })), x, h + 1.2, zc);
    roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, (w - 0.1) / (d * 0.88));
    if (i % 2) add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.7), lam({ color: "#9a5a44" })), x - s * 1.2, h + 1.6, zc + 1);
    // cornice and plinth strips along the street face
    add(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, w - 0.1), lam({ color: "#efe6d4" })), s * (WALK + 0.1), h - 0.15, zc);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, w - 0.1), lam({ color: "#a89a86" })), s * (WALK + 0.05), 0.25, zc);
    z -= w; id++;
  }
  // street lamps along the kerb
  for (let lz = 4; lz > -60; lz -= 11) {
    const x = s * (ROAD + 0.5);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.4, 10), lam({ color: "#2a2c33" })), x, 1.7, lz);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.34), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, 0.8) })), x, 3.6, lz);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.28, 4), lam({ color: "#2a2c33" })), x, 3.98, lz).rotation.y = Math.PI / 4;
  }
}

// ---------- characters as lit flat cards ----------
const CREAM = "#f6f1e6";
const MAX = { jacket: "#1f8a9a", pants: "#2b2b38", boots: "#2a2422", hat: null, hair: "#8a5a2b", buttons: "#e8c45a", skin: CREAM };
// Max's curl of hair on top of his head, in the 600 x 1000 design space (head centre ~ (300, 309), crown ~ y 198)
// Max's hair: a small brown patch on the crown, swept to one side, clipped to the head (head centre ~ (300, 309))
function maxHair(p, col, seed) {
  // a side-swept cap of hair over the top of the head with a little flick, clipped to the head outline
  const head = blobPts(300, 309, headBlob(seed, 118, 0));
  const hair = [[150, 300], [150, 120], [450, 120], [450, 262], [418, 246], [372, 236], [326, 246], [282, 258], [236, 268], [190, 282]];
  p.clip(head, () => p.poly(hair, col, 0));
  p.clip(head, () => p.stroke([[450, 262], [418, 246], [372, 236], [326, 246], [282, 258], [236, 268], [190, 282], [150, 300]], 9));
}
const CARD_W = 1.35, CARD_H = 2.25;   // 600 x 1000 design units -> metres (an adult is ~1.75 m tall)
function card(outfit, opts, extra) {
  const cv = document.createElement("canvas"); cv.width = 600; cv.height = 1000;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = cardShade(new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), mat);
  m.layers.set(NOINK); m.castShadow = true;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  const draw = o => { const g = cv.getContext("2d"); g.clearRect(0, 0, 600, 1000); const p = new Pen(g); bodyFront(p, outfit, { ...opts, ...o }); if (extra) extra(p); tex.needsUpdate = true; };
  draw({});
  const g = new THREE.Group(); g.add(m); m.position.y = CARD_H / 2 - CARD_H * 0.025;
  // soft contact shadow under the feet
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; blob.scale.set(1, 0.45, 1); blob.layers.set(NOINK); g.add(blob);
  g.userData = { draw, card: m };
  scene.add(g);
  return g;
}
const max = card(MAX, { mode: "stand", expr: "neutral", seed: 4 }, p => maxHair(p, MAX.hair, 4));
max.position.set(0, 0.0, 2.2);
const folk = [
  card({ ...townsfolk(0), skin: CREAM }, { mode: "stand", expr: "stern", seed: 11, facing: 1 }), card({ ...townsfolk(1), skin: "#f1ebdf" }, { mode: "stand", expr: "smile", seed: 12, facing: -1 }),
  card({ ...townsfolk(2), skin: CREAM }, { mode: "stroll", expr: "neutral", seed: 13, facing: 1 }), card({ ...townsfolk(3), skin: "#f1ebdf" }, { mode: "stroll", expr: "smile", seed: 14, facing: -1 }),
];
folk[0].position.set(-1.7, 0.0, -0.6); folk[1].position.set(1.9, 0.0, -2.2); folk[2].position.set(-4.2, 0.16, -9); folk[3].position.set(3.8, 0.16, -14);

// ---------- camera and the camera-relative sun ----------
start((time) => {
  camera.position.set(0.35, 1.55, 5.0);
  camera.lookAt(0.05, 1.45, 0.0);
  if (bokeh) bokeh.uniforms.focus.value = camera.position.distanceTo(max.position.clone().setY(1.4));
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const dir = fwd.clone().multiplyScalar(Math.cos(az)).addScaledVector(right, Math.sin(az)).normalize();
  sun.position.copy(dir.multiplyScalar(Math.cos(el) * 40)).add(new THREE.Vector3(0, Math.sin(el) * 40, 0)).add(new THREE.Vector3(0, 0, -6));
  sun.target.position.set(0, 0, -6); sun.target.updateMatrixWorld();
  // cards face the camera (yaw only)
  for (const c of [max, ...folk]) c.rotation.y = Math.atan2(camera.position.x - c.position.x, camera.position.z - c.position.z);
  max.userData.draw({ blink: Math.sin(time * 2.1) > 0.97 });
});
