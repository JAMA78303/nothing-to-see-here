// "Police found a secret cinema under Paris" (2004), in the 2D-characters-in-a-3D-world style.
// Sets along x: CAVE 0 (the cinema, later stripped bare), ENTRY 100 (the barking-dog tape), STREET 200 (back with
// the experts), TUNNEL 300 (the tunnels go on, with other lit doorways deep inside).
import { THREE, scene, camera, sun, hemi, V, ease, lerp, start } from "./kit.js";
import { setupStyle, setLight, aimSun, ctex, lam, lit, add, box, makeMax, makeCard, faceCamera, look, untone, CREAM, NOINK } from "./style2kit.js";
import { facadeHD, cobbleHD } from "./vendor/paint.js";

setupStyle({ ink: { widthNear: 4.2, widthFar: 2.8 }, blur: { aperture: 0.0026, maxblur: 0.007 } });
const SET = { cave: 0, entry: 100, street: 200, tunnel: 300 };
const SHOT_SET = { hook: "cave", seats: "cave", cafe: "cave", dogs: "entry", back: "street", gone: "cave", loop: "tunnel" };
const rnd = (() => { let s = 23; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
const lights = {};
const lamp = (set, x, y, z, i = 6, d = 8, col = 0xffc070) => { const l = new THREE.PointLight(col, i, d, 1.6); l.position.set(x, y, z); scene.add(l); (lights[set] ||= []).push(l); return l; };
const T = (o, opts = {}, sc = 1) => makeCard({ ...o, skin: o.skin ?? CREAM }, { mode: "stand", expr: "neutral", ...opts }, null, sc);
const rockTex = (base, rx = 1, ry = 1) => ctex(256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 170; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "60,55,50" : "255,250,240"},${0.05 + rnd() * 0.07})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 22, 4 + rnd() * 12, rnd() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(50,45,40,0.25)"; g.lineWidth = 2; for (let i = 0; i < 40; i++) { const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8 + rnd() * 10, y + 2 - rnd() * 4); g.stroke(); }
}, rx, ry);
const wood = (base, rx = 1, ry = 1) => ctex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = "rgba(40,22,10,0.45)"; g.fillRect(0, y, w, 3); for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(60,35,15,0.18)"; g.fillRect(rnd() * w, y + 6 + rnd() * 20, 30 + rnd() * 60, 2); } } }, rx, ry);
const label = (text, w, h, draw) => { const t = ctex(512, Math.round(512 * h / w), draw); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return new THREE.MeshBasicMaterial({ map: t, transparent: true }); };

// characters
const POLICE = { jacket: "#24346a", pants: "#1f2436", boots: "#1a1a1a", buttons: "#e8c45a" };
const max = makeMax({ prop: "lantern" }, POLICE);
const cop = T({ ...POLICE, hat: "cap", cap: "#1b2547" }, { seed: 31 });
const cop2 = T({ ...POLICE, hat: "cap", cap: "#1b2547", moustache: "#3a2a1a" }, { seed: 44 });
const expert = T({ jacket: "#eef0f2", pants: "#3b3f52", boots: "#3a2a1a", hat: "hair", hair: "#3a2a1a", buttons: "#9aa4b0" }, { seed: 52 });
const expert2 = T({ jacket: "#eef0f2", pants: "#4a4a58", boots: "#3a2a1a", hat: "hair", hair: "#b07a3a", buttons: "#9aa4b0" }, { seed: 57 });
const lanternLight = new THREE.PointLight(0xffb050, 7, 9, 1.6); scene.add(lanternLight);
const lanternLight2 = new THREE.PointLight(0xffb050, 5, 7, 1.6); scene.add(lanternLight2);

// ======================= CAVE: a cinema carved into the rock =======================
const CV = { screen: [], full: [], bulbs: [], stubs: [], note: null, film: [], screenMat: null };
{
  const X = SET.cave, rock = lit({ map: rockTex("#b8ad99", 6, 3), side: THREE.BackSide });
  const vault = add(new THREE.CylinderGeometry(6, 6, 14, 40, 1, true), rock, X, 0, 0); vault.rotation.x = Math.PI / 2; vault.scale.set(1, 1, 0.75);
  const backWall = add(new THREE.CircleGeometry(6, 40), lit({ map: rockTex("#b0a590", 4, 3) }), X, 0, -7); backWall.scale.set(1, 0.75, 1);
  const fl = add(new THREE.PlaneGeometry(12, 14), lit({ map: rockTex("#a59a86", 5, 6) }), X, 0, 0); fl.rotation.x = -Math.PI / 2;
  // tiers of stone seats rising towards the back
  const seatRock = lit({ map: rockTex("#cdbfa6", 3, 1) });
  for (let i = 0; i < 5; i++) { const h = 0.45 + 0.22 * i; box(7.2, h, 1.0, seatRock, X, h / 2, -3.2 + i * 1.0); }
  // the screen: an old moon film, a few frames of grain swapped in turn
  for (let n = 0; n < 4; n++) CV.film.push(ctex(640, 360, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.62); gr.addColorStop(0, "#e2e2da"); gr.addColorStop(1, "#77776f"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#f4f4ee"; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(rnd() * w, rnd() * h * 0.6, 1.5, 0, 7); g.fill(); }
    g.fillStyle = "#f2f1ea"; g.strokeStyle = "#2a2a2a"; g.lineWidth = 6; g.beginPath(); g.arc(380, 175, 118, 0, 7); g.fill(); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.arc(345, 150, 16, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(345, 230, 34, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.beginPath(); g.moveTo(370, 175); g.lineTo(358, 200); g.lineTo(374, 200); g.stroke();
    g.save(); g.translate(422, 148); g.rotate(-0.5); g.fillStyle = "#5a5a5a"; g.beginPath(); g.moveTo(-70, -18); g.lineTo(10, -18); g.lineTo(42, 0); g.lineTo(10, 18); g.lineTo(-70, 18); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#cfcfc6"; g.fillRect(-55, -18, 10, 36); g.fillRect(-30, -18, 10, 36); g.restore();
    g.fillStyle = "rgba(0,0,0,0.09)"; for (let i = 0; i < 1600; i++) g.fillRect(rnd() * w, rnd() * h, 2, 2);
    g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 2; for (let i = 0; i < 3; i++) { const x = rnd() * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + rnd() * 8 - 4, h); g.stroke(); }
  }));
  CV.film.forEach(t => (t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping));
  CV.screenMat = new THREE.MeshBasicMaterial({ map: CV.film[0] });
  const scr = add(new THREE.PlaneGeometry(5.2, 2.6), CV.screenMat, X, 2.45, -6.85); CV.screen.push(scr);
  const frameM = lit({ map: wood("#3a2516") });
  for (const [w, h, x, y] of [[5.6, 0.18, 0, 3.84], [5.6, 0.18, 0, 1.06], [0.18, 2.95, -2.7, 2.45], [0.18, 2.95, 2.7, 2.45]]) box(w, h, 0.12, frameM, X + x, y, -6.8);
  CV.screenGlow = lamp("cave", X, 2.4, -5.6, 6, 11, 0xdfe6ff);
  // the projector on a ledge at the back, and its beam
  const proj = new THREE.Group(); proj.position.set(X + 0.6, 2.55, 4.3); scene.add(proj); CV.full.push(proj);
  box(0.9, 0.08, 0.7, lit({ color: "#4a4038" }), 0, -0.3, 0, proj);
  box(0.42, 0.42, 0.62, lit({ color: "#2f3236" }), 0, 0, 0, proj);
  for (const z of [-0.18, 0.2]) { const r = add(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20), lit({ color: "#2f3236" }), 0, 0.38, z, proj); r.rotation.z = Math.PI / 2; }
  const lens = add(new THREE.CylinderGeometry(0.08, 0.1, 0.18, 16), glow(1.6, 1.5, 1.2), 0, 0, -0.38, proj); lens.rotation.x = Math.PI / 2;
  const a = V(X + 0.6, 2.55, 3.9), b = V(X, 2.45, -6.8), len = a.distanceTo(b);
  const beamM = new THREE.MeshBasicMaterial({ color: 0xfff6dc, transparent: true, opacity: 0.035, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 0.07, len, 24, 1, true), beamM); beam.position.copy(a).lerp(b, 0.5); beam.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); beam.layers.set(NOINK); scene.add(beam); CV.full.push(beam);
  // strings of bulbs along both walls (electricity), with a cut stub of cable left behind later
  for (const s of [-1, 1]) {
    const cab = add(new THREE.CylinderGeometry(0.02, 0.02, 10.5, 6), lit({ color: "#111" }), X + s * 4.45, 3.0, -1.5); cab.rotation.x = Math.PI / 2; CV.bulbs.push(cab);
    for (let z = -6.3; z < 3.6; z += 1.25) { const bl = add(new THREE.SphereGeometry(0.07, 10, 8), glow(1.9, 1.5, 0.9), X + s * 4.45, 2.86, z); bl.castShadow = false; CV.bulbs.push(bl); }
    const stub = add(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), lit({ color: "#111" }), X + s * 4.45, 2.72, 3.4); CV.stubs.push(stub);
  }
  CV.bulbLamps = [[-4, -5], [-4, -0.5], [4, -5], [4, -0.5]].map(([x, z]) => lamp("cave", X + x, 2.7, z, 3.2, 8, 0xffc27a));
  // the café: a carved counter with a coffee machine, cups, two stools, a sign; a phone on the wall
  const counter = box(0.75, 1.05, 2.6, lit({ map: wood("#6b4128", 1, 2) }), X - 4.55, 0.525, 1.4);
  box(0.85, 0.06, 2.7, lit({ color: "#d8cfc0" }), X - 4.55, 1.08, 1.4);
  void counter;
  const mach = new THREE.Group(); mach.position.set(X - 4.65, 1.11, 0.6); scene.add(mach); CV.full.push(mach);
  box(0.4, 0.48, 0.36, lit({ color: "#b8bcc2" }), 0, 0.24, 0, mach); box(0.08, 0.06, 0.08, glow(1.8, 0.2, 0.2), 0.2, 0.38, 0.1, mach);
  for (let i = 0; i < 4; i++) { const c = add(new THREE.CylinderGeometry(0.055, 0.045, 0.1, 14), lit({ color: "#f4f2ea" }), X - 4.45 + (i % 2) * 0.12, 1.16, 1.25 + i * 0.28); CV.full.push(c); }
  for (const z of [1.0, 1.9]) { box(0.06, 0.7, 0.06, lit({ color: "#2a2a2a" }), X - 3.85, 0.35, z); add(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 18), lit({ color: "#8a2b3a" }), X - 3.85, 0.72, z); }
  const sign = add(new THREE.PlaneGeometry(1.2, 0.5), label("CAFÉ", 1.2, 0.5, (g, w, h) => { g.fillStyle = "#1f2a24"; g.fillRect(0, 0, w, h); g.strokeStyle = "#7a5434"; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = "#f4f1e6"; g.font = "bold 110px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("CAFÉ", w / 2, h / 2 + 6); }), X - 4.95, 2.15, 1.4);
  sign.rotation.y = Math.PI / 2; CV.full.push(sign);
  const phone = new THREE.Group(); phone.position.set(X - 5.25, 1.7, 3.0); phone.rotation.y = Math.PI / 2; scene.add(phone); CV.full.push(phone);
  box(0.32, 0.42, 0.12, lit({ color: "#8a1f24" }), 0, 0, 0, phone); box(0.08, 0.36, 0.08, lit({ color: "#1a1a1a" }), -0.12, 0, 0.1, phone);
  const pc = add(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 6), lit({ color: "#111" }), 0.05, -0.85, 0.02, phone); void pc;
  // the note left behind
  CV.note = add(new THREE.PlaneGeometry(0.46, 0.32), new THREE.MeshLambertMaterial({ map: (() => { const t = ctex(512, 356, (g, w, h) => {
    g.fillStyle = "#f2ead6"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(120,100,70,0.35)"; g.lineWidth = 2; for (let y = 70; y < h; y += 44) { g.beginPath(); g.moveTo(20, y); g.lineTo(w - 20, y); g.stroke(); }
    g.fillStyle = "#1c1c2a"; g.textAlign = "center"; g.font = "italic bold 70px Georgia, serif"; g.fillText("Ne cherchez", w / 2, 140); g.fillText("pas.", w / 2, 220);
    g.font = "italic 34px Georgia, serif"; g.fillStyle = "#3a3a4a"; g.fillText("(don't try to find us)", w / 2, 300);
  }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })() }), X + 0.3, 0.012, -4.7);
  CV.note.rotation.set(-Math.PI / 2, 0, 0.12);
  CV.noteLamp = lamp("cave", X + 0.3, 1.4, -4.2, 4, 4, 0xffc27a);
}

// ======================= ENTRY: the passage guarded by a tape of barking dogs =======================
const EN = { woofs: [], box: null };
{
  const X = SET.entry, rock = lit({ map: rockTex("#a8a094", 4, 2), side: THREE.BackSide });
  const tube = add(new THREE.CylinderGeometry(1.5, 1.5, 30, 32, 1, true), rock, X, 1.1, -10); tube.rotation.x = Math.PI / 2; tube.scale.set(0.9, 1, 1);
  const fl = add(new THREE.PlaneGeometry(2.8, 30), lit({ map: rockTex("#968e80", 2, 12) }), X, 0, -10); fl.rotation.x = -Math.PI / 2;
  box(0.75, 0.5, 0.55, lit({ map: wood("#8a6238") }), X + 0.55, 0.25, -2.4);
  EN.box = new THREE.Group(); EN.box.position.set(X + 0.55, 0.69, -2.4); scene.add(EN.box);
  box(0.72, 0.38, 0.26, lit({ color: "#3a3d44" }), 0, 0, 0, EN.box);
  const face = add(new THREE.PlaneGeometry(0.7, 0.36), new THREE.MeshLambertMaterial({ map: ctex(256, 132, (g, w, h) => {
    g.fillStyle = "#3a3d44"; g.fillRect(0, 0, w, h);
    for (const x of [48, 208]) { g.fillStyle = "#1a1b1f"; g.beginPath(); g.arc(x, 70, 40, 0, 7); g.fill(); g.strokeStyle = "#8a8f98"; g.lineWidth = 4; g.stroke(); g.fillStyle = "#55585f"; g.beginPath(); g.arc(x, 70, 14, 0, 7); g.fill(); }
    g.fillStyle = "#c9ccd2"; g.fillRect(96, 44, 64, 40); g.fillStyle = "#3a3d44"; for (const x of [112, 144]) { g.beginPath(); g.arc(x, 64, 9, 0, 7); g.fill(); }
    g.fillStyle = "#d33"; g.fillRect(118, 100, 20, 10);
  }) }), 0, 0, 0.135, EN.box); void face;
  const handle = add(new THREE.TorusGeometry(0.2, 0.025, 6, 16, Math.PI), lit({ color: "#222" }), 0, 0.19, 0, EN.box); void handle;
  for (let i = 0; i < 3; i++) {
    const w = add(new THREE.PlaneGeometry(1.0, 0.45), label("WOOF!", 1.0, 0.45, (g, ww, hh) => { g.font = "900 150px Arial Black, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.lineWidth = 26; g.strokeStyle = "#111"; g.strokeText("WOOF!", ww / 2, hh / 2 + 6); g.fillStyle = "#fff"; g.fillText("WOOF!", ww / 2, hh / 2 + 6); }), X + 0.55 + [-0.3, 0.25, -0.05][i], 1.35 + [0, 0.3, 0.7][i], -2.3);
    w.layers.set(NOINK); w.castShadow = false; w.material.depthTest = false; w.renderOrder = 10; EN.woofs.push(w);
  }
  lamp("entry", X + 0.5, 1.9, -1.0, 2.5, 6, 0xffc27a);
}

// ======================= STREET: back in daylight, a manhole open in a Paris street =======================
{
  const X = SET.street;
  const cob = cobbleHD(); cob.repeat.set(8, 30);
  const ground = add(new THREE.PlaneGeometry(9, 120), lam({ map: cob }), X, 0, -50); ground.rotation.x = -Math.PI / 2;
  const walk = lam({ color: "#c9c2b4" });
  for (const s of [-1, 1]) { box(2.2, 0.16, 120, walk, X + s * 5.6, 0.08, -50); }
  const STY = [{ wall: "#ece0c6", shutter: "#5a6a7a" }, { wall: "#e4d6b8", shutter: "#4a5a4a" }, { wall: "#efe6d2", shutter: "#6a5a7a" }, { wall: "#e8dcc0", shutter: "#5a6a7a" }];
  for (const s of [-1, 1]) for (let i = 0; i < 8; i++) {
    const w = 6, h = 7 + (i % 3) * 0.8, st = STY[(i + (s > 0 ? 2 : 0)) % 4], z = 2 - i * 6.2;
    const front = lam({ map: facadeHD(`par${s}_${i}`, w, h, { ...st, door: i % 2 === 0 }) }), plain = lam({ color: st.wall });
    box(4, h, w, s < 0 ? [front, plain, plain, plain, plain, plain] : [plain, front, plain, plain, plain, plain], X + s * 8.7, h / 2, z);
    box(3.4, 1.6, w - 0.1, lam({ color: "#6f7a86" }), X + s * 9.0, h + 0.8, z);                     // slate mansard roofs
  }
  // the tower at the end of the street
  const ironM = lam({ color: "#6b5a48" }), T0 = V(X, 0, -78);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {        // four splayed legs meeting at the first deck
    const a = V(T0.x + sx * 6.2, 0, T0.z + sz * 6.2), b = V(T0.x + sx * 2.6, 13, T0.z + sz * 2.6), leg = add(new THREE.BoxGeometry(1.4, a.distanceTo(b), 1.4), ironM, 0, 0, 0);
    leg.position.copy(a).lerp(b, 0.5); leg.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  }
  box(7.4, 0.9, 7.4, ironM, T0.x, 13.3, T0.z);
  const mid = add(new THREE.CylinderGeometry(1.0, 3.9, 15, 4), ironM, T0.x, 21.2, T0.z); mid.rotation.y = Math.PI / 4;
  box(3.4, 0.6, 3.4, ironM, T0.x, 28.9, T0.z);
  const top = add(new THREE.CylinderGeometry(0.1, 1.3, 17, 4), ironM, T0.x, 37.6, T0.z); top.rotation.y = Math.PI / 4;
  // the open manhole and its lid
  add(new THREE.CircleGeometry(0.55, 28), new THREE.MeshBasicMaterial({ color: 0x0a0806 }), X, 0.012, -0.6).rotation.x = -Math.PI / 2;
  const lid = add(new THREE.CylinderGeometry(0.56, 0.56, 0.05, 28), lam({ color: "#4a4a50" }), X + 1.1, 0.03, -0.3); void lid;
  // a street lamp
  box(0.12, 3.4, 0.12, lam({ color: "#1f2326" }), X - 3.6, 1.7, -2.8); box(0.36, 0.42, 0.36, lam({ color: "#2a2f33" }), X - 3.6, 3.55, -2.8);
}

// ======================= TUNNEL: the tunnels go on, with other lit doorways far inside =======================
{
  const X = SET.tunnel, rock = lit({ map: rockTex("#9e968a", 4, 2), side: THREE.BackSide });
  const tube = add(new THREE.CylinderGeometry(1.35, 1.35, 40, 32, 1, true), rock, X, 1.0, -15); tube.rotation.x = Math.PI / 2; tube.scale.set(0.85, 1, 1);
  const fl = add(new THREE.PlaneGeometry(2.4, 40), lit({ map: rockTex("#8c8478", 2, 16) }), X, 0, -15); fl.rotation.x = -Math.PI / 2;
  for (const [s, z] of [[1, -4.5], [-1, -9], [1, -14], [-1, -19]]) {
    const door = add(new THREE.PlaneGeometry(0.9, 1.5), glow(1.0, 0.62, 0.3), X + s * 1.08, 0.78, z); door.rotation.y = -s * Math.PI / 2; door.castShadow = false;
    lamp("tunnel", X + s * 0.6, 1.0, z, 2.2, 4, 0xffb060);
  }
}

// ======================= cameras and timeline =======================
const W = (x, y, z) => V(x, y, z);
const CAMS = {
  hook:  [W(-0.75, 1.6, 6.2), W(-0.6, 1.9, -5)],
  seats: [W(0.4, 3.5, 5.6), W(0, 1.6, -5.5)],
  cafe:  [W(-2.2, 1.75, 4.6), W(-4.4, 1.45, 1.2)],
  dogs:  [W(100.35, 1.4, 2.6), W(100.1, 1.15, -2.3)],
  back:  [W(200.8, 1.75, 6.4), W(200, 1.6, -4)],
  gone:  [W(1.2, 1.7, 5.2), W(-0.2, 1.4, -4)],
  note:  [W(0.32, 1.05, -3.85), W(0.3, 0.0, -4.72)],
  loop:  [W(300.25, 1.45, 3.0), W(300, 1.25, -6)],
};
const cardsBySet = { cave: [max, cop, cop2, expert], entry: [max], street: [max, cop, expert, expert2], tunnel: [max] };
const allCards = [max, cop, cop2, expert, expert2];

start((time, tl) => {
  const shot = tl.shot, k = tl.k, st = tl.since(shot), set = SHOT_SET[shot];
  const noteShot = shot === "gone" && k > 0.42;
  for (const [s, ls] of Object.entries(lights)) for (const l of ls) l.visible = s === set;
  for (const c of allCards) c.visible = false;
  for (const c of cardsBySet[set]) c.visible = true;
  const outdoor = set === "street";
  setLight("day", { sunI: 3.0 });
  sun.intensity = outdoor ? 3.0 : 0; hemi.intensity = outdoor ? 0.55 : set === "cave" && shot !== "hook" && shot !== "gone" ? 0.32 : shot === "gone" ? 0.24 : 0.16;
  scene.background = outdoor ? new THREE.Color("#a9cdf0") : new THREE.Color("#0b0907");
  scene.fog = outdoor ? new THREE.Fog(untone("#d6e2ee"), 30, 110) : null;

  // camera: own framing per shot with a small push; the note gets its own close-up inside "gone"
  const [p0, l0] = CAMS[noteShot ? "note" : shot];
  const kk = noteShot ? (k - 0.42) / 0.58 : shot === "gone" ? k / 0.42 : k;
  const p = p0.clone().lerp(l0, (noteShot ? 0.25 : 0.1) * ease(kk)), l = l0.clone();
  if (shot === "seats") p.x += -0.8 * ease(k);
  if (shot === "dogs") p.x += 0.05 * Math.sin(st * 40) * Math.max(0, 1 - st * 2);
  camera.position.copy(p); camera.lookAt(l);
  if (shot === "dogs") camera.rotateZ(0.03 * Math.sin(st * 35) * Math.max(0, 1 - st * 1.5));

  // ---- cave state: full cinema, or stripped bare when they come back ----
  const bare = shot === "gone";
  CV.screen.forEach(m => (m.visible = !bare)); CV.full.forEach(m => (m.visible = !bare));
  CV.bulbs.forEach(m => (m.visible = !bare && shot !== "hook")); CV.stubs.forEach(m => (m.visible = bare));
  CV.bulbLamps.forEach(l => (l.visible = set === "cave" && !bare && shot !== "hook"));
  CV.screenGlow.visible = set === "cave" && !bare; CV.screenGlow.intensity = 6 * (0.92 + 0.08 * Math.sin(time * 37));
  CV.screenMat.map = CV.film[Math.floor(time * 10) % CV.film.length]; CV.screenMat.color.setScalar(0.95 + 0.07 * Math.sin(time * 41));
  CV.note.visible = bare; CV.noteLamp.visible = bare && noteShot;

  // ---- characters ----
  const lantern = (c, L, i = 7) => { L.visible = c.visible; L.position.set(c.position.x + 0.45, 1.3, c.position.z + 0.3); L.intensity = i * (1 + 0.06 * Math.sin(time * 19 + c.position.x)); };
  lanternLight2.visible = false;
  if (set === "cave") {
    if (shot === "hook") { max.position.set(-1.05, 0, 2.7); max.userData.draw({ expr: st < 0.5 ? "neutral" : "shock", prop: "lantern" }); cop.position.set(0.55, 0, 1.4); cop.userData.draw({ expr: "shock", seed: 31 }); cop2.visible = expert.visible = false; }
    if (shot === "seats") { max.position.set(-1.6, 0, 2.2); max.userData.draw({ expr: "shock", prop: "lantern" }); cop.visible = cop2.visible = expert.visible = false; }
    if (shot === "cafe") { max.position.set(-3.3, 0, 2.6); max.userData.draw({ expr: "smile", prop: "mug" }); cop2.position.set(-4.2, 0, 3.4); cop2.userData.draw({ expr: "grin", seed: 44 }); cop.visible = expert.visible = false; }
    if (shot === "gone") {
      max.position.set(0.75, 0, 2.5); max.userData.draw({ expr: "shock", prop: "lantern" });
      expert.position.set(1.1, 0, 1.4); expert.userData.draw({ expr: "nervous", prop: "lantern", seed: 52 }); cop.visible = cop2.visible = false;
      lantern(expert, lanternLight2, 5);
      if (noteShot) allCards.forEach(c => (c.visible = false));
    }
    lantern(max, lanternLight, shot === "hook" ? 8 : 6);
    if (noteShot) lanternLight.visible = false;
  }
  if (set === "entry") {
    const jump = Math.max(0, Math.sin(Math.min(1, st / 0.45) * Math.PI)) * 0.35;
    max.position.set(SET.entry - 0.35, jump, -0.4); max.userData.draw({ expr: st < 0.25 ? "neutral" : "shock", prop: "lantern" });
    lantern(max, lanternLight, 7);
    EN.woofs.forEach((w, i) => { const u = st - 0.15 - i * 0.32; w.visible = u > 0; const pop = u < 0.15 ? u / 0.15 * 1.25 : 1 + 0.06 * Math.sin(time * 18 + i); w.scale.setScalar(Math.max(0.01, pop)); w.quaternion.copy(camera.quaternion); });
    EN.box.position.y = 0.69 + 0.015 * Math.abs(Math.sin(time * 22)); EN.box.scale.setScalar(1 + 0.03 * Math.abs(Math.sin(time * 22)));
  } else EN.woofs.forEach(w => (w.visible = false));
  if (set === "street") {
    lanternLight.visible = false;
    max.position.set(SET.street - 0.1, 0, 1.8); max.userData.draw({ expr: "neutral", prop: null });
    cop.position.set(SET.street + 1.45, 0, 0.8); cop.userData.draw({ expr: "neutral", seed: 31 });
    expert.position.set(SET.street + 0.75, 0, -1.6); expert.userData.draw({ expr: "neutral", prop: "lantern", seed: 52 });
    expert2.position.set(SET.street, -0.75 - 0.9 * ease(k), -0.6); expert2.userData.draw({ expr: "nervous", seed: 57 });
  }
  if (set === "tunnel") {
    max.position.set(SET.tunnel, 0, lerp(-2.6, -1.4, k)); max.userData.draw({ expr: "nervous", prop: "lantern", mode: "stroll", phase: (st * 0.9) % 1 });
    lantern(max, lanternLight, 7);
  }
  for (const c of allCards) if (c.visible) faceCamera(c);

  if (look.bokeh) look.bokeh.uniforms.focus.value = shot === "seats" ? 9 : noteShot ? camera.position.distanceTo(CV.note.position) : set === "street" ? 7 : camera.position.distanceTo(max.position.clone().setY(1.4));
  if (outdoor) aimSun(-35, 38, V(SET.street, 0, -4), 60);
});
