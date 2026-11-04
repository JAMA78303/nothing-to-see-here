// "What happens to your poop after you flush": cartoon (folk) style, six small sets the camera cuts between:
// bathroom, bar screens, settling tank, egg-shaped digesters, inside a digester, farm field.
import { THREE, scene, camera, sun, hemi, setWaterTable, GROUND_BOTTOM, box, solid, canvasTex, cloud, tree, V, lerp, ease, start, fxOptions } from "./kit.js";
import { folk, outline, canvasPlane, HEAD } from "./folk.js";

fxOptions.ao = false;
setWaterTable(GROUND_BOTTOM - 1, 0);
const daySky = scene.background;
hemi.intensity = 1.55;
sun.intensity = 2.6;
const toon = c => new THREE.MeshToonMaterial({ color: c });
const ink = m => outline(m);
const add = (m, x, y, z) => { m.position.set(x, y, z); scene.add(m); return m; };
const SET = { bath: 0, screen: 100, settle: 200, eggs: 300, bugs: 400, farm: 500 };
const SHOT_SET = { hook: "farm", flush: "bath", screen: "screen", settle: "settle", eggs: "eggs", bugs: "bugs", farm: "farm", outro: "farm", cta: "farm", start: "farm" };
const max = extra => folk({ body: 0x2f8fd6, outfit: "polo", hairStyle: "tuft", hair: 0x9a5a22, shoes: 0x2c2c2c, ...extra });

// ---------- bathroom ----------
{
  const X = SET.bath;
  const tiles = canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#cfe8f2"; g.fillRect(0, 0, w, h); g.strokeStyle = "#9cc3d3"; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); }, 14, 8);
  add(new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshToonMaterial({ map: tiles })), X, 2.5, -1.5);
  const floorT = canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "#ffffff" : "#2b2b2b"; g.fillRect(i * 32, j * 32, 32, 32); } }, 8, 6);
  const fl = add(new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshToonMaterial({ map: floorT })), X, 0, 1.5); fl.rotation.x = -Math.PI / 2;
  const white = new THREE.MeshToonMaterial({ color: 0xf7f7f7, emissive: 0x6a6a6a });
  const toilet = new THREE.Group();
  toilet.add(ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.45, 24), white), 0, 0.22, 0)));
  const bowl = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.2, 28), white)); bowl.position.y = 0.5; bowl.scale.z = 1.25; toilet.add(bowl);
  const tank = ink(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.6, 0.24), white)); tank.position.set(0, 0.85, -0.36); toilet.add(tank);
  const lid = ink(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.6), white)); lid.position.set(0, 0.88, -0.2); lid.rotation.x = -1.45; toilet.add(lid);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#5fc3ef"; g.fillRect(0, 0, w, h); g.strokeStyle = "#ffffff"; g.lineWidth = 7; g.beginPath(); for (let i = 0; i < 80; i++) { const r = 60 - i * 0.7, a = i * 0.25; g.lineTo(64 + r * Math.cos(a), 64 + r * Math.sin(a)); } g.stroke(); }) }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.59; water.scale.y = 1.25; toilet.add(water);
  toilet.userData.water = water;
  toilet.position.set(X + 0.55, 0, -0.9);
  scene.add(toilet);
  SET.toilet = toilet;
}
const bathMax = max({ face: "grin" });
bathMax.position.set(SET.bath - 0.45, 0, -0.5); bathMax.rotation.y = 0.35;
scene.add(bathMax);

// ---------- bar screens: a channel of murky water with a rack and a rake ----------
const caught = [];
{
  const X = SET.screen;
  const concrete = toon(0xbcbcbc);
  ink(add(new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 0.3), concrete), X, 0.4, 0.6));
  ink(add(new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 0.3), concrete), X, 0.4, -2.2));
  const murk = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#6b5530"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 6; for (let i = 0; i < 18; i++) { g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.lineTo(Math.random() * w, Math.random() * h); g.stroke(); } }, 3, 1);
  const water = add(new THREE.Mesh(new THREE.PlaneGeometry(6, 2.5), new THREE.MeshToonMaterial({ map: murk })), X, 0.5, -0.8); water.rotation.x = -Math.PI / 2;
  SET.murk = murk;
  for (let i = 0; i < 12; i++) { const bar = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 6), toon(0x3a3f45))); bar.position.set(X + 0.2, 1.1, 0.4 - i * 0.22); bar.rotation.z = -0.5; scene.add(bar); }
  const rake = new THREE.Group();
  rake.add(ink(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.6), toon(0xf2b632))));
  for (let i = 0; i < 12; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.04), toon(0x333333)); t.position.set(-0.08, -0.12, 1.2 - i * 0.22); rake.add(t); }
  rake.position.set(X - 0.1, 0.7, -0.8); scene.add(rake);
  SET.rake = rake;
  // things that shouldn't be flushed
  const duck = new THREE.Group();
  duck.add(ink(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), toon(0xffd23f))));
  const dh = ink(new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), toon(0xffd23f))); dh.position.set(0.1, 0.14, 0); duck.add(dh);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), toon(0xff8a1c)); beak.rotation.z = -Math.PI / 2; beak.position.set(0.22, 0.13, 0); duck.add(beak);
  const phone = new THREE.Group();
  phone.add(ink(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.3), toon(0x1c1c1e))));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.27), new THREE.MeshBasicMaterial({ color: 0x5fb4ff })); scr.rotation.x = -Math.PI / 2; scr.position.y = 0.017; phone.add(scr);
  const wipe = ink(new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.28, 4, 4), new THREE.MeshToonMaterial({ color: 0xf4f4f4, side: THREE.DoubleSide })));
  const wp = wipe.geometry.attributes.position; for (let i = 0; i < wp.count; i++) wp.setZ(i, (Math.random() - 0.5) * 0.08); wipe.geometry.computeVertexNormals();
  const wipe2 = wipe.clone();
  const car = new THREE.Group(); car.add(ink(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.16), toon(0xd62f2f)))); for (const [x, z] of [[-0.1, 0.08], [0.1, 0.08], [-0.1, -0.08], [0.1, -0.08]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10), toon(0x111111)); w.rotation.x = Math.PI / 2; w.position.set(x, -0.05, z); car.add(w); }
  for (const [m, z, h] of [[duck, -0.3, 0.62], [phone, -1.1, 0.54], [wipe, 0.0, 0.53], [wipe2, -1.7, 0.53], [car, -0.7, 0.56]]) { m.position.set(X - 0.6, h, z); m.userData = { z, h, ph: Math.random() * 6 }; scene.add(m); caught.push(m); }
}
const screenMax = max({ face: "surprised", hat: "hardhat" });
screenMax.position.set(SET.screen - 1.6, 0.8, -2.6); screenMax.rotation.y = 0.6;
scene.add(screenMax);
box(SET.screen - 3, SET.screen + 3, 0.75, 0.8, -3.2, -2.35, solid(0x8a9099));           // walkway
for (let i = 0; i < 7; i++) box(SET.screen - 3 + i, SET.screen - 2.96 + i, 0.8, 1.7, -2.4, -2.36, solid(0xf2b632));
box(SET.screen - 3, SET.screen + 3, 1.66, 1.72, -2.42, -2.34, solid(0xf2b632));

// ---------- settling tank: sludge sinks and builds up at the bottom ----------
const sinkers = [];
{
  const X = SET.settle;
  const concrete = toon(0xbdbdbd);
  ink(add(new THREE.Mesh(new THREE.BoxGeometry(5, 3, 0.25), concrete), X, 1.5, -2.6));
  ink(add(new THREE.Mesh(new THREE.BoxGeometry(0.25, 3, 2.6), concrete), X - 2.5, 1.5, -1.3));
  ink(add(new THREE.Mesh(new THREE.BoxGeometry(0.25, 3, 2.6), concrete), X + 2.5, 1.5, -1.3));
  ink(add(new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.25, 2.8), concrete), X, -0.12, -1.3));
  const water = add(new THREE.Mesh(new THREE.BoxGeometry(4.75, 2.4, 2.4), new THREE.MeshToonMaterial({ color: 0x8a7a42, transparent: true, opacity: 0.55, depthWrite: false })), X, 1.3, -1.3);
  water.renderOrder = 2;
  const sludgeGeo = new THREE.BoxGeometry(4.75, 1, 2.4, 24, 1, 8);
  const sp = sludgeGeo.attributes.position; for (let i = 0; i < sp.count; i++) if (sp.getY(i) > 0) sp.setY(i, 0.5 + 0.12 * Math.sin(sp.getX(i) * 4) * Math.cos(sp.getZ(i) * 3)); sludgeGeo.computeVertexNormals();
  const sludge = ink(new THREE.Mesh(sludgeGeo, toon(0x5a3a1c))); sludge.position.set(X, 0.5, -1.3); scene.add(sludge);
  SET.sludge = sludge;
  for (let i = 0; i < 26; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.05, 8, 6), toon(0x6b4423)); b.userData = { x: X - 2.1 + Math.random() * 4.2, z: -0.4 - Math.random() * 1.8, ph: Math.random() }; scene.add(b); sinkers.push(b); }
  box(X - 2.6, X + 2.6, 3.0, 3.1, -0.15, 0.6, solid(0x8a9099));
  for (let i = 0; i < 6; i++) box(X - 2.6 + i, X - 2.56 + i, 3.1, 3.9, 0.55, 0.6, solid(0xf2b632));
  box(X - 2.6, X + 2.6, 3.86, 3.92, 0.54, 0.62, solid(0xf2b632));
}
const settleMax = max({ face: "gross", hat: "hardhat" }).pose({ armL: [0.4, 1.4, 2.2], armR: [0.3, 0.3, 0.3], headTilt: 0.35 });
settleMax.position.set(SET.settle + 0.6, 3.1, 0.25); settleMax.rotation.y = -0.2;
scene.add(settleMax);

// ---------- egg-shaped digesters ----------
{
  const X = SET.eggs;
  const lawn = add(new THREE.Mesh(new THREE.PlaneGeometry(60, 40), toon(0x6fbf4a)), X, 0, -10); lawn.rotation.x = -Math.PI / 2;
  const steel = new THREE.MeshToonMaterial({ color: 0xb9ccd8, emissive: 0x2c3a44 });
  for (const [dx, dz, s] of [[-3.6, -6, 1], [0, -8, 1.1], [3.6, -6, 1]]) {
    const egg = ink(new THREE.Mesh(new THREE.SphereGeometry(1.8 * s, 36, 28), steel)); egg.scale.y = 1.5; egg.position.set(X + dx, 2.7 * s, dz); scene.add(egg);
    for (const h of [-0.5, 0, 0.5]) { const band = new THREE.Mesh(new THREE.TorusGeometry(1.8 * s * Math.sqrt(1 - h * h) * 1.005, 0.04, 6, 48), toon(0x6f8796)); band.rotation.x = Math.PI / 2; band.position.set(X + dx, 2.7 * s + h * 2.7 * s, dz); scene.add(band); }
    ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.7 * s, 0.4, 20), toon(0x8a9099)), X + dx, 0.2, dz));
  }
  for (let i = 0; i < 10; i++) box(X - 2.0, X - 1.4, i * 0.5, i * 0.5 + 0.08, -4.3 - i * 0.25, -4.0 - i * 0.25, solid(0xf2b632));
  cloud(X - 8, 14, -30, 2.4); cloud(X + 8, 16, -36, 2.8);
}
const eggMax = max({ face: "surprised", hat: "hardhat" }).pose({ headTilt: -0.45 });
eggMax.position.set(SET.eggs + 0.4, 0, -1.4); eggMax.rotation.y = -0.2;
scene.add(eggMax);

// ---------- inside a digester: bacteria munching, bubbles of gas rising to a flame ----------
const bugs = [], bubbles = [];
{
  const X = SET.bugs;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(4, 40, 30, Math.PI, Math.PI), new THREE.MeshToonMaterial({ color: 0x6f8796, side: THREE.DoubleSide }));
  shell.scale.y = 1.4; shell.position.set(X, 3, -1); scene.add(shell);
  const sludgeT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#6b4423"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(40,20,5,0.5)"; g.lineWidth = 10; for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 40, 0, 4); g.stroke(); } }, 2, 2);
  const fill = add(new THREE.Mesh(new THREE.CircleGeometry(3.95, 40, Math.PI, Math.PI), new THREE.MeshToonMaterial({ map: sludgeT })), X, 3, -0.99);
  fill.scale.y = 1.4; fill.rotation.z = 0;
  const fillTop = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), new THREE.MeshBasicMaterial({ color: daySky?.isColor ? daySky : 0x7fbfe8 })); void fillTop;
  SET.sludgeTex = sludgeT;
  const bugFace = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#fff"; for (const x of [44, 84]) { g.beginPath(); g.arc(x, 52, 16, 0, 7); g.fill(); g.strokeStyle = "#111"; g.lineWidth = 5; g.stroke(); g.fillStyle = "#111"; g.beginPath(); g.arc(x + 3, 56, 7, 0, 7); g.fill(); g.fillStyle = "#fff"; }
    g.fillStyle = "#3a0d0d"; g.beginPath(); g.ellipse(64, 92, 26, 16, 0, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.fillRect(46, 80, 36, 8);
  });
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Group();
    const body = ink(new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.35, 8, 16), toon([0x7ed957, 0x5ccf9c, 0xb6e35a][i % 3])));
    body.rotation.z = Math.PI / 2; b.add(body);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: bugFace, transparent: true }));
    face.position.z = 0.29; b.add(face);
    b.userData = { x: X - 2.4 + (i % 3) * 2.4 + Math.random() * 0.6, y: 1.2 + Math.floor(i / 3) * 1.6, ph: Math.random() * 6 };
    scene.add(b); bugs.push(b);
  }
  for (let i = 0; i < 30; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 10, 8), new THREE.MeshToonMaterial({ color: 0xe9f0b0, transparent: true, opacity: 0.85 })); s.userData = { x: X - 2.5 + Math.random() * 5, ph: Math.random() }; scene.add(s); bubbles.push(s); }
  ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 10), toon(0x8a9099)), X, 9.0, -0.6));
  const flame = add(new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.0, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.3, 0.3) })), X, 10.3, -0.6);
  SET.flame = flame;
}

// ---------- farm field ----------
{
  const X = SET.farm;
  for (let i = 0; i < 14; i++) { const row = box(X - 12, X + 12, 0, 0.12, -2 - i * 1.2, -1.4 - i * 1.2, solid(i % 2 ? 0x7a4e2a : 0x8f5d33)); void row; }
  add(new THREE.Mesh(new THREE.PlaneGeometry(80, 30), toon(0x6fbf4a)), X, -0.01, -30).rotation.x = -Math.PI / 2;
  const cornM = toon(0x4c9a3a), cobM = new THREE.MeshToonMaterial({ color: 0xf5c518, emissive: 0x4a3a00 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) {
    const st = new THREE.Group();
    st.add(ink(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 6), cornM)));
    for (const sx of [-1, 1]) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.7, 4), cornM); leaf.position.set(0.18 * sx, 0.1 + sx * 0.15, 0); leaf.rotation.z = -sx * 1.0; st.add(leaf); }
    const cob = ink(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.18, 6, 10), cobM)); cob.position.set(0.08, 0.2, 0.04); cob.rotation.z = -0.3; st.add(cob);
    st.position.set(X - 6 + c * 1.4 + (r % 2) * 0.7, 0.8, -5 - r * 2.4); scene.add(st);
  }
  const tractor = new THREE.Group();
  tractor.add(ink(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.9), toon(0xd62f2f))));
  const cab = ink(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.8), toon(0xd62f2f))); cab.position.set(-0.3, 0.7, 0); tractor.add(cab);
  for (const [x, r] of [[-0.5, 0.5], [0.55, 0.32]]) for (const z of [-0.5, 0.5]) { const w = ink(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.25, 18), toon(0x222222))); w.rotation.x = Math.PI / 2; w.position.set(x, r - 0.6, z); tractor.add(w); }
  tractor.position.set(X - 3, 0.6, -3.6); scene.add(tractor);
  SET.tractor = tractor;
  SET.flakes = [];
  for (let i = 0; i < 40; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), toon(0x4a2f17)); f.userData = { ph: Math.random(), dz: (Math.random() - 0.5) * 0.8 }; scene.add(f); SET.flakes.push(f); }
  cloud(X - 6, 12, -30, 2.4); cloud(X + 7, 14, -36, 2.6); tree(X + 9, -12, 1.4); tree(X - 10, -14, 1.2);
}
const farmMax = max({ face: "surprised" });
// an unmistakable ear of corn: rows of bright kernels and green husk leaves peeling back
const kernels = canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = "#c98f00"; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) {
    g.fillStyle = (r + c) % 5 === 0 ? "#ffe066" : "#ffd21f";
    g.beginPath(); g.ellipse(c * 16 + 8 + (r % 2) * 4, r * 16 + 8, 6.5, 7, 0, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.arc(c * 16 + 6 + (r % 2) * 4, r * 16 + 5, 2, 0, 7); g.fill();
  }
});
kernels.wrapS = kernels.wrapT = THREE.RepeatWrapping; kernels.repeat.set(2, 1);
const corn = new THREE.Group();
const cob = ink(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.3, 8, 16), new THREE.MeshToonMaterial({ map: kernels, emissive: 0x3a2a00 })));
cob.position.y = 0.12;
corn.add(cob);
for (let i = 0; i < 3; i++) {
  const husk = ink(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 4), new THREE.MeshToonMaterial({ color: 0x5fbf3a, emissive: 0x153a08 })));
  const a = i * Math.PI * 2 / 3;
  husk.position.set(Math.cos(a) * 0.06, -0.08, Math.sin(a) * 0.06);
  husk.rotation.set(Math.sin(a) * 0.9 + Math.PI, 0, -Math.cos(a) * 0.9);
  corn.add(husk);
}
corn.position.y = -0.3; corn.rotation.set(Math.PI, 0, 0.25);
farmMax.userData.parts.armR.elbow.add(corn);
farmMax.position.set(SET.farm + 0.6, 0.12, -0.4); farmMax.rotation.y = -0.25;
scene.add(farmMax);

// ---------- timeline: hard cuts between sets, a slow push-in on each shot ----------
const cams = {
  flush:  [V(-0.1, 1.35, 3.2),   V(0.05, 1.0, -0.8)],
  screen: [V(98.6, 2.2, 5.2),    V(99.3, 1.1, -1.4)],
  settle: [V(200.3, 2.9, 9.2),   V(200.3, 2.3, -1.0)],
  eggs:   [V(300.6, 1.4, 6.5),   V(300.2, 3.6, -5)],
  bugs:   [V(400, 3.4, 9.8),     V(400, 3.6, -1)],
  farm:   [V(500.9, 1.45, 3.0),  V(500.2, 1.2, -1.5)],
  outro:  [V(500.4, 1.55, 1.9), V(500.35, 1.45, -0.4)],
  cta:    [V(500.4, 2.2, 6.0),   V(500.4, 1.4, -2)],
};
start((time, tl) => {
  const shot = tl.shot === "hook" ? "farm" : tl.shot;
  const set = SHOT_SET[shot];
  const [p, l] = cams[shot] || cams.farm;
  camera.position.copy(p).lerp(l, 0.06 * ease(tl.k));
  camera.lookAt(l);
  scene.background = daySky;
  HEAD.emissive.setHex(set === "bugs" ? 0x606060 : 0x7a7a7a);

  // bathroom: the bowl swirls, Max waves bye-bye
  SET.toilet.userData.water.rotation.z = -time * 6;
  bathMax.pose({ armL: [2.3, 0.2, 0.3 + 0.35 * Math.sin(time * 9)], armR: [0.3, 0.2, 0.3], headTilt: 0.1 });
  // screens: water flows, the rake sweeps up the bars, junk bobs
  SET.murk.offset.x = -time * 0.4;
  const rk = (time * 0.35) % 1;
  SET.rake.position.set(SET.screen - 0.4 + rk * 1.1, 0.6 + rk * 0.65, -0.8);
  for (const m of caught) { const { z, h, ph } = m.userData; m.position.set(SET.screen - 0.55 + 0.05 * Math.sin(time * 2 + ph), h + 0.03 * Math.sin(time * 3 + ph), z); m.rotation.y = 0.3 * Math.sin(time + ph); }
  // settling: poop sinks and the sludge layer grows
  const settle = tl.prog("settle");
  SET.sludge.scale.y = 0.7 + 0.5 * ease(Math.min(1, Math.max(0, settle)));
  SET.sludge.position.y = SET.sludge.scale.y * 0.5;
  for (const b of sinkers) { const u = (time * 0.3 + b.userData.ph) % 1; b.position.set(b.userData.x, lerp(2.4, SET.sludge.scale.y, u), b.userData.z); }
  // digester: bacteria bob and chomp, gas bubbles rise to the flame
  SET.sludgeTex.offset.set(Math.sin(time * 0.3) * 0.1, time * 0.05);
  for (const b of bugs) { const { x, y, ph } = b.userData; b.position.set(x + 0.2 * Math.sin(time * 1.5 + ph), y + 0.15 * Math.sin(time * 2.3 + ph), -0.3); b.rotation.z = 0.2 * Math.sin(time * 3 + ph); b.scale.setScalar(1 + 0.06 * Math.sin(time * 12 + ph)); }
  for (const s of bubbles) { const u = (time * 0.35 + s.userData.ph) % 1; s.position.set(s.userData.x * (1 - u) + SET.bugs * u, 0.8 + u * 8.2, -0.2); }
  SET.flame.scale.set(1 + 0.15 * Math.sin(time * 20), 1 + 0.25 * Math.sin(time * 15), 1);
  // farm: the tractor spreads, Max holds corn; in the outro he realises
  const tx = ((time * 0.8) % 10) - 5;
  SET.tractor.position.x = SET.farm + tx;
  for (const f of SET.flakes) { const u = (time * 1.5 + f.userData.ph) % 1; f.position.set(SET.tractor.position.x - 1.0 - u * 1.2, 0.9 + u * 0.6 - u * u * 1.6, -3.6 + f.userData.dz); }
  const outro = tl.shot === "outro" || tl.shot === "cta";
  farmMax.pose(outro ? { armR: [0.6, 1.4, 1.3], armL: [0.3, 0.2, 0.3], headTilt: 0.15, headTurn: -0.25, lean: -0.08 } : { armR: [0.5, 1.2, 1.5], armL: [0.3, 0.2, 0.3], headTilt: 0.05 });
  farmMax.setFace(outro ? "gross" : tl.shot === "hook" ? "crazy" : "surprised");
});
