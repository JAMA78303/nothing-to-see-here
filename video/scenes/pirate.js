// "What if you woke up as a pirate": cartoon (folk) style on a rocking pirate ship at sea.
// Shots: hook (wakes up in pirate gear), food (weevil biscuit), teeth (scurvy), toilet (the head at the bow),
// plank (MYTH stamp), end (glides back to the opening frame so the video loops).
import { THREE, scene, camera, sun, hemi, setWaterTable, GROUND_BOTTOM, canvasTex, V, ease, start, fxOptions } from "./kit.js";
import { folk, outline, canvasPlane, HEAD } from "./folk.js";

fxOptions.ao = false;
setWaterTable(GROUND_BOTTOM - 1, 0);
scene.fog = new THREE.Fog(0xbfe3f7, 60, 220);
sun.color.set(0xfff1d6); sun.intensity = 2.4; sun.position.set(10, 18, 14);
hemi.intensity = 1.35; hemi.color.set(0xeaf6ff); hemi.groundColor.set(0x3a6a8a);
HEAD.emissive.setHex(0x6a6a6a);
const toon = (c, e = 0) => new THREE.MeshToonMaterial({ color: c, emissive: e });
const inked = []; const ink = m => { inked.push(m); return m; };
const ship = new THREE.Group(); scene.add(ship);
const put = (m, x, y, z, parent = ship) => { m.position.set(x, y, z); parent.add(m); return m; };

// ---------- the sea ----------
const sea = new THREE.Mesh(new THREE.PlaneGeometry(320, 320, 140, 140), new THREE.MeshToonMaterial({ color: 0x2b86c4, emissive: 0x08304a }));
sea.rotation.x = -Math.PI / 2; scene.add(sea);
const seaPos = sea.geometry.attributes.position, seaXY = Float32Array.from(seaPos.array);
function waves(time) {
  for (let i = 0; i < seaPos.count; i++) {
    const x = seaXY[i * 3], y = seaXY[i * 3 + 1];
    seaPos.setZ(i, 0.22 * Math.sin(x * 0.35 + time * 1.6) + 0.16 * Math.sin(y * 0.42 - time * 1.2) + 0.06 * Math.sin((x + y) * 1.3 + time * 3));
  }
  seaPos.needsUpdate = true; sea.geometry.computeVertexNormals();
}

// ---------- the ship (bow toward +x) ----------
const DECK = 2.0;
{
  const prof = [[-7, DECK], [-7.15, 0.8], [-6, -0.4], [-2, -0.9], [3, -0.9], [6.2, -0.1], [7.8, DECK]];
  const shape = new THREE.Shape(); prof.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 4.4, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3, steps: 1, curveSegments: 6 });
  geo.translate(0, 0, -2.2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); const k = x > 3.5 ? 1 - 0.72 * Math.min(1, (x - 3.5) / 4.3) : x < -5.5 ? 1 - 0.15 * (-5.5 - x) / 1.6 : 1; p.setZ(i, p.getZ(i) * k); }
  geo.computeVertexNormals();
  const planks = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#6b4128"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = "rgba(30,15,5,0.55)"; g.fillRect(0, y, w, 4); } g.fillStyle = "#d9a63a"; g.fillRect(0, 96, w, 14); });
  planks.wrapS = planks.wrapT = THREE.RepeatWrapping; planks.repeat.set(0.25, 0.25);
  ink(put(new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: planks })), 0, 0, 0));
  // deck planks, following the taper
  const deckTex = canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = ["#b9875a", "#a87a50", "#c49364", "#b08055"][i % 4]; g.fillRect(0, i * 32, w, 32); g.fillStyle = "rgba(60,30,15,0.5)"; g.fillRect(0, i * 32, w, 3); } }, 3, 2);
  const deckShape = new THREE.Shape(); const half = x => 2.2 * (x > 3.5 ? 1 - 0.72 * Math.min(1, (x - 3.5) / 4.3) : x < -5.5 ? 1 - 0.15 * (-5.5 - x) / 1.6 : 1) + 0.05;
  const xs = []; for (let x = -7.1; x <= 7.7; x += 0.4) xs.push(x);
  xs.forEach((x, i) => i ? deckShape.lineTo(x, half(x)) : deckShape.moveTo(x, half(x))); [...xs].reverse().forEach(x => deckShape.lineTo(x, -half(x)));
  const deck = put(new THREE.Mesh(new THREE.ShapeGeometry(deckShape), new THREE.MeshToonMaterial({ map: deckTex })), 0, DECK + 0.13, 0); deck.rotation.x = -Math.PI / 2;
  // bulwarks: posts and a top rail round the deck edge
  const railM = toon(0x5a3420);
  for (const side of [-1, 1]) {
    for (let x = -6.8; x <= 7.2; x += 0.9) ink(put(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.1), railM), x, DECK + 0.44, side * (half(x) - 0.06)));
    const pts = xs.map(x => V(x, DECK + 0.78, side * (half(x) - 0.06)));
    ink(put(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.06, 6), railM), 0, 0, 0));
  }
  // raised stern deck (quarterdeck) with a lantern
  ink(put(new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 4.0), toon(0x6b4128)), -5.9, DECK + 0.6, 0));
  ink(put(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffd77a })), -6.9, DECK + 2.2, 0));
  // masts, yards, sails, the flag
  const mastM = toon(0x7a4b2e), sailM = new THREE.MeshToonMaterial({ color: 0xf3ead2, side: THREE.DoubleSide });
  for (const [mx, top, sails] of [[0.4, 12.5, [[6.6, 2.6], [9.6, 2.2]]], [4.6, 10.8, [[6.4, 2.2], [9.0, 1.6]]]]) {
    ink(put(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, top - DECK, 12), mastM), mx, (top + DECK) / 2, 0));
    for (const [y, hgt] of sails) {
      const yard = new THREE.Group(); yard.position.set(mx, y + hgt / 2, 0); yard.rotation.y = 0.55; ship.add(yard);
      ink(put(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.8, 8), mastM), 0, 0, 0, yard)).rotation.x = Math.PI / 2;
      const sg = new THREE.PlaneGeometry(4.4, hgt, 12, 6); const sp = sg.attributes.position;
      for (let i = 0; i < sp.count; i++) { const u = sp.getX(i) / 2.2, v = (sp.getY(i) + hgt / 2) / hgt; sp.setX(i, 0); sp.setZ(i, sp.getX(i)); }
      const sg2 = new THREE.PlaneGeometry(4.4, hgt, 12, 6); const s2 = sg2.attributes.position;
      for (let i = 0; i < s2.count; i++) { const z = s2.getX(i), y2 = s2.getY(i); s2.setXYZ(i, 0.55 * (1 - (z / 2.2) ** 2) * (0.6 + 0.4 * Math.sin((y2 / hgt + 0.5) * Math.PI)), y2, z); }
      sg2.computeVertexNormals();
      const sail = put(new THREE.Mesh(sg2, sailM), 0, -hgt / 2 - 0.05, 0, yard); void sail; void sg;
    }
  }
  const flagTex = canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = "#151515"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#fff"; g.beginPath(); g.arc(w / 2, h * 0.4, 30, 0, 7); g.fill(); g.fillRect(w / 2 - 16, h * 0.4 + 20, 32, 20);
    g.fillStyle = "#151515"; g.beginPath(); g.arc(w / 2 - 11, h * 0.38, 8, 0, 7); g.fill(); g.beginPath(); g.arc(w / 2 + 11, h * 0.38, 8, 0, 7); g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = 12; g.lineCap = "round"; g.beginPath(); g.moveTo(w / 2 - 50, h * 0.68); g.lineTo(w / 2 + 50, h * 0.9); g.moveTo(w / 2 + 50, h * 0.68); g.lineTo(w / 2 - 50, h * 0.9); g.stroke();
  });
  var flag = put(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1, 20, 1), new THREE.MeshToonMaterial({ map: flagTex, side: THREE.DoubleSide })), 0.4 - 0.9, 12.0, 0);
  flag.userData.x0 = Float32Array.from(flag.geometry.attributes.position.array);
  // bowsprit, barrels, crates, a cannon, a coil of rope
  const bs = ink(put(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4, 10), mastM), 8.6, DECK + 1.0, 0)); bs.rotation.z = -1.15;
  const barrelM = toon(0x8a5a36), hoopM = toon(0x333333);
  for (const [x, z] of [[-3.2, -1.4], [-2.6, -1.6], [2.6, -1.5]]) { ink(put(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.8, 16), barrelM), x, DECK + 0.53, z)); for (const dy of [-0.22, 0.22]) put(new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 6, 20), hoopM), x, DECK + 0.53 + dy, z).rotation.x = Math.PI / 2; }
  ink(put(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.7), toon(0xa8743f)), -1.2, DECK + 0.43, -1.6));
  const cannon = ink(put(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.4, 14), toon(0x2a2a2a)), 3.4, DECK + 0.5, -1.4)); cannon.rotation.set(Math.PI / 2, 0, 0);
  ink(put(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.8), toon(0x6b4128)), 3.4, DECK + 0.28, -1.3));
  put(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 20), toon(0xc9a36a)), -0.6, DECK + 0.2, 1.4).rotation.x = Math.PI / 2;
  // the "head": a plank seat with a hole, hanging out over the waves at the bow
  ink(put(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 1.5), toon(0x8a5a36)), 6.9, 1.62, 1.55));
  const seat = ink(put(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.6), toon(0xa87a50)), 6.9, 1.9, 1.85));
  const hole = put(new THREE.Mesh(new THREE.CircleGeometry(0.17, 18), new THREE.MeshBasicMaterial({ color: 0x1a1008 })), 6.9, 2.126, 1.85); hole.rotation.x = -Math.PI / 2; void seat;
  for (const dz of [1.0, 2.2]) ink(put(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), toon(0x5a3420)), 6.55, 2.1, dz));
  // the plank, poking out over the side
  ink(put(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.09, 3.6), toon(0xc49364)), -2.0, DECK + 0.84, 3.6));
  // a tally of days at sea, nailed to the mast
  const tally = put(canvasPlane(1.0, 0.7, (g, w, h) => {
    g.fillStyle = "#e9dcc0"; g.fillRect(0, 0, w, h); g.strokeStyle = "#5a3a20"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = "#3a2010"; g.font = "bold 70px Georgia, serif"; g.textAlign = "center"; g.fillText("DAY 93", w / 2, 92);
    g.strokeStyle = "#3a2010"; g.lineWidth = 6; for (let i = 0; i < 4; i++) { const x0 = 40 + i * 110; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x0 + k * 18, 140); g.lineTo(x0 + k * 18, 210); g.stroke(); } g.beginPath(); g.moveTo(x0 - 8, 200); g.lineTo(x0 + 66, 150); g.stroke(); }
  }), 0.4, DECK + 1.9, 0.22);
  void tally;
  var flagMesh = flag;
}

// ---------- characters ----------
const maxP = folk({ body: 0x2f8fd6, hairStyle: "slick", hair: 0x9a5a22, shoes: 0x1e1e1e, hat: "tricorn", hatColor: 0x1d1a1a, belt: true, face: "surprised" });
put(maxP, 1.5, DECK + 0.13, 1.0);
const PATCH = { eyePatch: true };
const captain = folk({ body: 0xa3231f, hairStyle: "none", shoes: 0x1e1e1e, hat: "tricorn", hatColor: 0x2a1a12, belt: true, vest: true, face: "smug" });
put(captain, -2.4, DECK + 0.13, 0.6); captain.rotation.y = 0.9;
const crew = [
  folk({ body: 0xf2efe6, hairStyle: "none", hat: "bandana", hatColor: 0xc0392b, shoes: 0x3a2a1a, belt: true, face: "grin" }),
  folk({ body: 0x3e6b4a, hairStyle: "none", hat: "bandana", hatColor: 0x1f3a7a, shoes: 0x3a2a1a, belt: true, face: "grin" }),
];
put(crew[0], -4.3, DECK + 0.13, -0.6).rotation.y = 0.5;
put(crew[1], 3.6, DECK + 0.13, 0.4).rotation.y = -0.6;
crew[0].setFace("grin", { beard: "#3a2a20", toothGap: true });
crew[1].setFace("grin", { beard: "#a0522d" });
captain.setFace("smug", { beard: "#2a1a12", mustache: "#2a1a12" });

// the biscuit (hardtack) with weevils crawling over it
const biscuit = new THREE.Group();
biscuit.add(ink(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.07), toon(0xe0c48a))));
const crumbFace = canvasPlane(0.42, 0.42, (g, w, h) => { g.fillStyle = "#e6cc94"; g.fillRect(0, 0, w, h); g.fillStyle = "#b8945a"; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.beginPath(); g.arc(64 + c * 128, 64 + r * 128, 12, 0, 7); g.fill(); } });
crumbFace.position.z = 0.036; biscuit.add(crumbFace);
const bugs = [];
for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a1210 })); b.scale.set(1.6, 1, 0.7); b.userData = { ph: i * 0.9, r: 0.06 + (i % 3) * 0.05, sp: 1.2 + (i % 4) * 0.4 }; biscuit.add(b); bugs.push(b); }
scene.add(biscuit);
// a falling tooth
const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.05), new THREE.MeshToonMaterial({ color: 0xfffdf0, emissive: 0x666655 }));
scene.add(tooth);
// spray from below the head
const spray = [];
for (let i = 0; i < 46; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.04, 8, 6), new THREE.MeshToonMaterial({ color: 0xbfe6ff, emissive: 0x2a5a7a })); d.userData = { v: V((Math.random() - 0.5) * 1.6, 4 + Math.random() * 3, (Math.random() - 0.3) * 1.6), ph: Math.random() * 0.25 }; scene.add(d); spray.push(d); }
// MYTH stamp
const myth = canvasPlane(2.4, 1.2, (g, w, h) => {
  g.strokeStyle = "#d62f2f"; g.lineWidth = 22; g.beginPath(); g.roundRect(16, 16, w - 32, h - 32, 30); g.stroke();
  g.fillStyle = "#d62f2f"; g.font = "900 150px Arial Black, Arial"; g.textAlign = "center"; g.fillText("MYTH!", w / 2, h / 2 + 54);
});
scene.add(myth);

inked.forEach(outline);

// ---------- timeline ----------
const HOOK = { pos: V(2.0, 4.25, 5.6), look: V(1.5, 3.85, 1.0) };
const cams = {
  hook:   HOOK,
  food:   { pos: V(2.0, 3.75, 4.3),  look: V(1.6, 3.35, 1.0) },
  teeth:  { pos: V(1.6, 3.9, 4.0),  look: V(1.45, 3.65, 0.8) },
  toilet: { pos: V(8.6, 3.0, 6.8),   look: V(6.9, 2.4, 1.6) },
  plank:  { pos: V(0.6, 4.1, 10.8),  look: V(-2.0, 3.2, 3.8) },
  end:    HOOK,
};
const handL = who => { who.updateMatrixWorld(true); return who.userData.parts.armL.elbow.localToWorld(V(0, -0.25, 0)); };
const headW = who => { who.updateMatrixWorld(true); return who.userData.parts.head.localToWorld(V(0, -0.12, 0.33)); };
let toothDrop = null;
start((time, tl) => {
  const shot = tl.shot, k = tl.k, st0 = tl.since(shot);
  // the ship rocks; the sea rolls
  const W = 2 * Math.PI / window.duration;   // loop-locked frequencies: everything is back where it started at the end
  ship.rotation.z = 0.03 * Math.sin(W * 3 * time); ship.rotation.x = 0.025 * Math.sin(W * 2 * time + 1); ship.position.y = 0.4 + 0.08 * Math.sin(W * 4 * time);
  waves(W * 4 * time / 1.6);
  const fp = flagMesh.geometry.attributes.position, x0 = flagMesh.userData.x0;
  for (let i = 0; i < fp.count; i++) { const x = x0[i * 3]; fp.setZ(i, 0.12 * Math.sin(x * 4 - W * 18 * time) * (x + 0.9)); } fp.needsUpdate = true;

  // camera: a hard cut into each shot, a slow drift within it; the end glides back to the opening frame
  let pos, look;
  if (shot === "end") { const e = ease(Math.min(1, k / 0.8)); pos = V(4.6, 5.6, 9.8).lerp(HOOK.pos, e); look = V(0.8, 3.4, 0.4).lerp(HOOK.look, e); }
  else { const c = cams[shot] || HOOK; pos = c.pos.clone(); look = c.look.clone(); if (shot !== "hook") pos.lerp(look, 0.06 * ease(k)); }
  camera.position.copy(pos); camera.lookAt(look);
  camera.rotateZ(0.012 * Math.sin(W * 3 * time));

  // crew idle: bob, sway, a laugh now and then
  crew.forEach((c, i) => { c.pose({ sway: 0.05 * Math.sin(W * 4 * time + i), headRoll: 0.1 * Math.sin(W * 5 * time + i), armL: [0.3, 0.2, 0.3], armR: [0.3 + 0.4 * Math.max(0, Math.sin(W * 3 * time + i * 2)), 0.4, 1.2] }); c.position.y = DECK + 0.13 + 0.03 * Math.abs(Math.sin(W * 8 * time + i)); });

  // Max
  maxP.position.set(1.5, DECK + 0.13 + 0.02 * Math.abs(Math.sin(W * 8 * time)), 1.0); maxP.rotation.set(0, 0, 0);
  biscuit.visible = shot === "food"; tooth.visible = false; myth.visible = false;
  spray.forEach(d => (d.visible = false));
  if (shot === "hook" || shot === "end") {
    // just woke up in pirate gear: hands up, looking around, then down at himself
    const lookDown = shot === "hook" && k > 0.55;
    maxP.setFace("surprised", PATCH);
    maxP.pose({ armL: [1.0 + 0.15 * Math.sin(W * 20 * time), 0.3, 0.5], armR: [1.0 + 0.15 * Math.sin(W * 20 * time + 1), 0.3, 0.5], headTurn: lookDown ? 0 : 0.35 * Math.sin(W * 6 * time), headTilt: lookDown ? 0.4 : 0, lean: -0.05 });
  }
  if (shot === "food") {
    // holds up breakfast; it's crawling. Then he taps it to knock the bugs out
    const tap = k > 0.6 ? Math.max(0, Math.sin(time * 16)) : 0;
    maxP.setFace("gross", PATCH);
    maxP.pose({ armL: [0.45, 0.95 + 0.15 * tap, 0.9 - 0.4 * tap], armR: [0.3, 0.2, 0.3], headTilt: 0.15, lean: -0.08 });
    biscuit.position.copy(handL(maxP)).add(V(0.12, 0.02, 0.1)); biscuit.rotation.set(-0.1, -0.15, 0.05);
    bugs.forEach((b, i) => { const { ph, r, sp } = b.userData; const a = time * sp + ph; b.position.set(r * Math.cos(a) * 1.2, r * Math.sin(a * 1.3), 0.05); b.rotation.z = a + Math.PI / 2; });
  }
  if (shot === "teeth") {
    // big grin... and one drops out
    const gone = k > 0.42;
    maxP.setFace(gone ? "grin" : "grin", gone ? { ...PATCH, toothGap: true } : PATCH);
    if (k > 0.7) maxP.setFace("surprised", PATCH);
    maxP.pose({ armL: [0.3, 0.2, 0.3], armR: [0.3, 0.2, 0.3], headTilt: -0.05 + (k > 0.7 ? 0.25 : 0), lean: 0 });
    if (gone) {
      if (!toothDrop || toothDrop.shot !== tl.idx) toothDrop = { shot: tl.idx, from: headW(maxP), t0: st0 };
      const u = st0 - toothDrop.t0;
      const y = Math.max(DECK + 0.45, toothDrop.from.y - 4.9 * u * u);
      tooth.visible = true; tooth.position.set(toothDrop.from.x + 0.15 * u, y, toothDrop.from.z + 0.25 * u); tooth.rotation.set(u * 9, u * 5, 0);
    }
  }
  if (shot === "toilet") {
    // sitting on the head over the waves... and a wave sprays up through the hole
    maxP.position.set(6.9, 2.15, 1.85); maxP.rotation.y = 0;
    const wet = k > 0.4;
    maxP.setFace(wet ? "scared" : "bored", wet ? { ...PATCH, sweat: true } : PATCH);
    maxP.pose({ legL: [1.45, -1.5], legR: [1.45, -1.5], armL: [0.6, 0.6, 0.8], armR: [0.6, 0.6, 0.8], lean: wet ? -0.25 : 0.05, headTilt: wet ? -0.2 : 0.1 });
    if (wet) maxP.position.y += 0.12 * Math.exp(-(k - 0.4) * 12);
    ship.updateMatrixWorld(true); const src = ship.localToWorld(V(6.9, 0.6, 1.85));
    spray.forEach(d => { const u = (k - 0.4) * 2.2 - d.userData.ph; if (u <= 0 || u > 1.1) return; d.visible = true; const v = d.userData.v; d.position.set(src.x + v.x * u, src.y + v.y * u - 4.9 * u * u, src.z + v.z * u); });
  }
  if (shot === "plank") {
    // out on the plank, the captain pointing... then MYTH!
    const stamped = k > 0.5;
    maxP.position.set(-2.0, DECK + 0.9 + 0.02 * Math.abs(Math.sin(time * 9)), 4.6); maxP.rotation.y = 0.5;
    maxP.setFace(stamped ? "grin" : "scared", stamped ? PATCH : { ...PATCH, sweat: true });
    maxP.pose(stamped ? { armL: [2.4, 0.2, 0.4 + 0.3 * Math.sin(time * 9)], armR: [0.4, 0.2, 0.3], headRoll: 0.1 * Math.sin(time * 5) }
      : { armL: [1.2, 0.1, 0.3], armR: [1.2, 0.1, 0.3], sway: 0.12 * Math.sin(time * 6), lean: -0.1 });
    captain.pose(stamped ? { armL: [2.2, 0.3, 0.8], armR: [2.2, 0.3, 0.8], headTilt: -0.1 } : { armL: [0.3, 0.2, 0.3], armR: [0.6, 1.4, 0.1], headTurn: 0.3 });
    if (stamped) {
      const pop = Math.min(1, (k - 0.5) / 0.08);
      myth.visible = true; myth.position.copy(camera.position).add(camera.getWorldDirection(V(0, 0, 0)).multiplyScalar(4.2)).add(V(0, -0.25, 0));
      myth.quaternion.copy(camera.quaternion); myth.rotateZ(0.18); myth.scale.setScalar((pop < 1 ? 1.6 - 0.6 * pop : 1) * 0.45);
    }
  } else captain.pose({ armL: [0.3, 0.2, 0.3], armR: [0.3, 0.2, 0.3], headRoll: 0.08 * Math.sin(W * 4 * time), sway: 0.04 * Math.sin(W * 3 * time) });
});
