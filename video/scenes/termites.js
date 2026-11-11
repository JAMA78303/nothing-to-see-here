// "This pile of dirt has air conditioning": a termite mound sliced open. Hot air leaves by the chimney, cool air
// is drawn in low down, fungus gardens fill the side rooms and the queen lays eggs in the middle.
import {
  THREE, scene, camera, GROUND_BOTTOM, groundBox, setWaterTable, tree, cloud, arrow, ease, lerp, V, start, fxOptions,
} from "./kit.js";
import { folk } from "./folk.js";

fxOptions.ao = false;
groundBox(-30, 30, GROUND_BOTTOM, 0, -40, 0);
tree(-9, -14, 1.3); tree(10, -18, 1.5); tree(-17, -26, 1.2); tree(6, -30, 1.1);
cloud(-10, 17, -45, 2); cloud(13, 21, -55, 2.4);

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });

// ---------- the mound: back half of a lumpy cone, with a flat cut face ----------
const PROFILE = [[2.0, 0], [1.85, 0.5], [1.55, 1.1], [1.38, 1.7], [1.02, 2.3], [0.78, 2.9], [0.52, 3.4], [0.36, 3.75], [0.3, 3.85]];
function halfMound(profile, x, colour, face) {
  const g = new THREE.Group(); g.position.x = x;
  const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 22, Math.PI / 2, Math.PI);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getZ(i) < -0.05) { const k = 1 + 0.07 * (rand() - 0.5); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  geo.computeVertexNormals();
  const shell = new THREE.Mesh(geo, lam(colour, { flatShading: true, side: THREE.DoubleSide })); shell.castShadow = shell.receiveShadow = true; g.add(shell);
  const s = new THREE.Shape(); s.moveTo(-profile[0][0], 0);
  for (const [r, y] of profile) s.lineTo(-r, y);
  for (const [r, y] of [...profile].reverse()) s.lineTo(r, y);
  s.closePath();
  const cut = new THREE.Mesh(new THREE.ShapeGeometry(s), lam(face)); cut.position.z = 0.005; g.add(cut);
  scene.add(g); return g;
}
halfMound(PROFILE, 0, 0xb5834e, 0xa87645);
halfMound([[0.62, 0], [0.5, 0.7], [0.3, 1.3], [0.12, 1.75]], -1.75, 0xb98850, 0xa87645);
halfMound([[0.55, 0], [0.42, 0.55], [0.22, 1.05], [0.1, 1.35]], 1.8, 0xb98850, 0xa87645);
// the hardened nest below ground
const nest = new THREE.Mesh(new THREE.CircleGeometry(2.75, 48), lam(0xa87645)); nest.position.set(0, -2.55, 0.006); nest.scale.set(1, 0.98, 1); scene.add(nest);

// ---------- tunnels and rooms, drawn flat and dark on the cut face ----------
const curves = {}, rooms = [];
const C = (name, pts, r = 0.14) => (curves[name] = { c: new THREE.CatmullRomCurve3(pts.map(([x, y]) => V(x, y, 0))), r });
const room = (x, y, sx, sy) => rooms.push({ x, y, sx, sy });
C("chimney", [[0, -1.9], [0.08, -0.6], [0.1, 1], [-0.06, 2.4], [0, 3.9]], 0.27);
C("flueL", [[0.05, 0.5], [-0.6, 1.1], [-0.85, 1.8], [-0.7, 2.3]], 0.12);
C("flueR", [[0.08, 0.2], [0.7, 0.8], [0.95, 1.4]], 0.12);
C("inL", [[-1.9, 0.32], [-2.25, -1.2], [-1.75, -3.7], [-0.4, -4.55]]);
C("inR", [[1.9, 0.3], [2.25, -1.3], [1.7, -3.8], [0.4, -4.55]]);
C("up", [[0, -4.5], [0.45, -3.6], [0.1, -2.95]]);
C("fL1", [[-0.9, -2.5], [-1.2, -1.9], [-1.45, -1.35]]);
C("fR1", [[0.9, -2.5], [1.2, -1.9], [1.5, -1.4]]);
C("fL2", [[-0.9, -2.6], [-1.3, -2.9], [-1.65, -3.05]]);
C("fR2", [[0.9, -2.6], [1.3, -2.95], [1.7, -3.1]]);
const FUNGUS = [[-1.5, -1.3], [1.55, -1.35], [-1.75, -3.05], [1.8, -3.1]];
for (const [x, y] of FUNGUS) room(x, y, 0.72, 0.5);
room(0, -2.55, 1.25, 0.52);      // the royal chamber
room(0, -4.55, 0.95, 0.36);      // the cool cellar
{
  const dark = new THREE.MeshBasicMaterial({ color: 0x2a180c });
  const g = new THREE.Group();
  for (const { c, r } of Object.values(curves)) g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, r, 10), dark));
  for (const { x, y, sx, sy } of rooms) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), dark); m.position.set(x, y, 0); m.scale.set(sx, sy, 0.6); g.add(m); }
  g.scale.z = 0.06; g.position.z = 0.03; scene.add(g);
}

// ---------- fungus gardens: pale lumpy combs dotted with white nodules ----------
for (const [x, y] of FUNGUS) {
  for (let i = 0; i < 6; i++) {
    const r = 0.13 + rand() * 0.09, b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), lam(i % 2 ? 0xd8c79a : 0xc9b684));
    b.position.set(x + (i - 2.5) * 0.19, y - 0.18 + 0.1 * Math.sin(i * 2.1), 0.1 + 0.02 * i); b.scale.z = 0.5; scene.add(b);
    for (let j = 0; j < 3; j++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), lam(0xffffff, { emissive: 0x555555 })); d.position.set(b.position.x + (rand() - 0.5) * r * 1.4, b.position.y + rand() * r * 0.8, 0.24); scene.add(d); }
  }
}

// ---------- termites ----------
function termite(s = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), lam(0xf0c88a, { emissive: 0x3a2a10 })); body.scale.set(1.9, 1, 1); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), lam(0x8a4a1c)); head.position.x = 0.13; g.add(head);
  g.scale.setScalar(s); scene.add(g); return g;
}
const walkers = [];
for (const [i, name] of ["inL", "inR", "up", "fL1", "fR1", "fL2", "fR2", "chimney", "flueL", "fL1", "fR2", "inL", "fR1", "fL2"].entries())
  walkers.push({ t: termite(1), c: curves[name].c, phase: rand(), speed: (0.1 + rand() * 0.1) * (i % 2 ? 1 : -1) });
// builders climbing the outside of the mound with balls of wet mud
const climb = new THREE.CatmullRomCurve3([[-1.9, 0.15], [-1.75, 0.55], [-1.47, 1.1], [-1.3, 1.7], [-0.95, 2.3], [-0.71, 2.9], [-0.47, 3.4]].map(([x, y]) => V(x, y, 0.12)));
const builders = [];
for (let i = 0; i < 5; i++) {
  const t = termite(1.5), mud = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), lam(0x5e3a1c)); mud.position.x = 0.21; t.add(mud);
  builders.push({ t, phase: i / 5 });
}
const freshMud = [];
for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), lam(0x5a3518)); m.position.set(-0.4 + 0.08 * i, 3.55 + 0.1 * i, 0.08); m.scale.z = 0.5; scene.add(m); freshMud.push(m); }

// ---------- the queen and her eggs ----------
const queen = new THREE.Group(); queen.position.set(-0.1, -2.6, 0.32); scene.add(queen);
{
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.95, 8, 20), lam(0xf4e6c6, { emissive: 0x30281a })); belly.rotation.z = Math.PI / 2; queen.add(belly);
  for (let i = 0; i < 6; i++) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.018, 6, 24), lam(0xc9a877)); band.rotation.y = Math.PI / 2; band.position.x = -0.42 + i * 0.17; queen.add(band); }
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), lam(0x9a5a22)); chest.position.x = -0.78; queen.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), lam(0x6e3a14)); head.position.x = -0.95; queen.add(head);
}
const eggs = [];
for (let i = 0; i < 22; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), lam(0xffffff, { emissive: 0x666666 })); e.scale.set(1.5, 1, 1); scene.add(e); eggs.push(e); }
const nurses = [0, 1, 2].map(() => termite(1.2));

// the egg counter
const cv = document.createElement("canvas"); cv.width = 640; cv.height = 200;
const ctex = new THREE.CanvasTexture(cv); ctex.colorSpace = THREE.SRGBColorSpace;
const counter = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshBasicMaterial({ map: ctex, transparent: true })); counter.position.set(0.25, -1.35, 0.6); scene.add(counter);
let shown = -1;
function setCounter(n) {
  if (n === shown) return; shown = n;
  const g = cv.getContext("2d"); g.clearRect(0, 0, 640, 200);
  g.fillStyle = "#ffd400"; g.strokeStyle = "#111"; g.lineWidth = 12; g.beginPath(); g.roundRect(8, 8, 624, 184, 36); g.fill(); g.stroke();
  g.fillStyle = "#111"; g.font = "900 96px Arial Black, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(n.toLocaleString("en-US") + " eggs", 320, 104);
  ctex.needsUpdate = true;
}

// ---------- air: red rises out of the chimney, blue is drawn in low down ----------
const hotMat = lam(0xff4a2a, { emissive: 0x8a1a08 }), coolMat = lam(0x3aa8ff, { emissive: 0x0c4a86 });
const hotPath = new THREE.CatmullRomCurve3([[0.05, -2.1], [0.08, -0.6], [0.1, 1], [-0.06, 2.4], [0, 3.9], [0.25, 4.7], [0.7, 5.4]].map(([x, y]) => V(x, y, 0.3)));
const coolPaths = [-1, 1].map(s => new THREE.CatmullRomCurve3([[s * 3.5, 1.1], [s * 2.6, 0.75], [s * 1.95, 0.32], [s * 2.25, -1.2], [s * 1.75, -3.7], [s * 0.4, -4.55]].map(([x, y]) => V(x, y, 0.3))));
const winds = [];
const wind = (path, mat, n, speed, s) => { for (let i = 0; i < n; i++) { const a = arrow(mat); a.scale.setScalar(s); scene.add(a); winds.push({ a, path, phase: i / n, speed, s }); } };
wind(hotPath, hotMat, 6, 0.42, 0.46);
for (const p of coolPaths) wind(p, coolMat, 5, 0.36, 0.4);
const label = (text, colour, x, y) => {
  const c = document.createElement("canvas"); c.width = 384; c.height = 128; const g = c.getContext("2d");
  g.font = "900 92px Arial Black, Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.lineWidth = 18; g.strokeStyle = "#111"; g.strokeText(text, 192, 68); g.fillStyle = colour; g.fillText(text, 192, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.6), new THREE.MeshBasicMaterial({ map: t, transparent: true })); m.position.set(x, y, 0.7); scene.add(m); return m;
};
const hotLabel = label("HOT", "#ff5a36", 1.45, 3.6), coolLabel = label("COOL", "#4ab4ff", -1.9, 2.0);

// ---------- Max, for scale ----------
const max = folk({ body: 0x2f8fd6, outfit: "polo", hairStyle: "tuft", hair: 0x9a5a22, shoes: 0xffffff, face: "surprised" });
max.position.set(3.0, 0, -0.9); max.rotation.y = -0.45; scene.add(max);

// ---------- cameras: hard cuts with a small push in ----------
const HOOK = [V(0.45, 0.65, 14.6), V(0.45, 0.65, 0)];
const CAMS = {
  hook: HOOK, built: [V(-1.3, 2.55, 6.6), V(-0.75, 2.45, 0)], air: [V(0, 0.3, 13.2), V(0, 0.2, 0)],
  fungus: [V(-1.65, -2.15, 5.6), V(-1.65, -2.15, 0)], queen: [V(0.15, -2.55, 5.2), V(0.15, -2.55, 0)],
  count: [V(0.25, -2.3, 5.6), V(0.25, -2.3, 0)], years: [V(0.45, 0.65, 16.2), V(0.45, 0.65, 0)],
};

start((time, tl) => {
  setWaterTable(GROUND_BOTTOM - 1, time);
  const shot = tl.shot, k = tl.k, st = tl.since(shot);
  const [p0, l0] = CAMS[shot];
  if (shot === "years") camera.position.lerpVectors(p0, HOOK[0], ease(k));   // ends where the hook begins, so it loops
  else camera.position.copy(p0).lerp(l0, 0.07 * ease(k));
  camera.lookAt(l0);

  // air arrows flow the whole time; the labels come with the "air" shot
  for (const w of winds) {
    const u = ((time * w.speed + w.phase) % 1 + 1) % 1, p = w.path.getPointAt(u), tg = w.path.getTangentAt(u);
    w.a.position.copy(p); w.a.rotation.z = Math.atan2(tg.y, tg.x) - Math.PI / 2;
    w.a.scale.setScalar(w.s * Math.min(1, u / 0.08, (1 - u) / 0.08));
    w.a.visible = ["hook", "air", "years"].includes(shot);
  }
  hotLabel.visible = shot === "air" && k < 0.55; coolLabel.visible = shot === "air" && k > 0.45;
  for (const m of [hotLabel, coolLabel]) m.scale.setScalar(1 + 0.06 * Math.sin(time * 9));

  // termites in the tunnels
  for (const w of walkers) {
    const u = ((time * w.speed + w.phase) % 1 + 1) % 1, p = w.c.getPointAt(u), tg = w.c.getTangentAt(u);
    w.t.position.set(p.x, p.y, 0.1); w.t.rotation.z = Math.atan2(tg.y, tg.x) + (w.speed < 0 ? Math.PI : 0);
  }
  // builders carry mud up the outside; the fresh patch at the top grows
  for (const b of builders) {
    const u = (time * 0.16 + b.phase) % 1, p = climb.getPointAt(u), tg = climb.getTangentAt(u);
    b.t.position.copy(p); b.t.rotation.z = Math.atan2(tg.y, tg.x);
    b.t.visible = shot === "built" || shot === "hook" || shot === "years";
  }
  const built = shot === "built" ? ease(k) : 1;
  freshMud.forEach((m, i) => m.scale.setScalar(Math.max(0.01, ease(built * 5 - i))).multiply(V(1, 1, 0.5)));

  // the queen pulses; an egg slides out every beat and joins the pile
  const qt = shot === "queen" ? st : shot === "count" ? tl.since("queen") : 99;
  queen.scale.set(1, 1 + 0.05 * Math.sin(time * 9), 1 + 0.05 * Math.sin(time * 9));
  eggs.forEach((e, i) => {
    const age = qt - i * 0.42;
    e.visible = qt < 90 ? age > 0 : true;
    const a = qt < 90 ? ease(age / 0.5) : 1;
    const hx = 1.0 - (i % 6) * 0.1 + (Math.floor(i / 6) % 2) * 0.05, hy = -2.92 + Math.floor(i / 6) * 0.075;
    e.position.set(lerp(0.72, hx, a), lerp(-2.6, hy, a), 0.36);
  });
  nurses.forEach((n, i) => { const u = (time * 0.5 + i / 3) % 1, x = lerp(0.7, 1.05, Math.abs(1 - 2 * u)); n.position.set(x, -2.42 - 0.12 * i, 0.38); n.rotation.z = u < 0.5 ? 0 : Math.PI; });

  counter.visible = shot === "count";
  if (shot === "count") { setCounter(Math.round(30000 * ease(Math.min(1, k / 0.6)) / 100) * 100); counter.scale.setScalar(1 + 0.05 * Math.sin(time * 10) * (k > 0.6 ? 1 : 0)); }

  max.pose?.({ headTilt: -0.18, armR: [0.5 + 0.08 * Math.sin(time * 3), 0.6, 0.3] });
});
