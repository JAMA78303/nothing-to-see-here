// "Where your text messages actually go": phone -> radio waves -> cell tower -> fibre (pulses of
// light) -> data center -> undersea cable -> tower -> friend's phone. One long cut-away world.
import {
  THREE, scene, camera, GROUND_BOTTOM, box, groundBox, solid, setWaterTable, canvasTex,
  house, tree, cloud, ease, lerp, V, moveCamera, start, pipeBand, flow,
} from "./kit.js";
import { folk, outline } from "./folk.js";

// cartoon mode (scenes/textsfolk.js sets this): folk characters and ink outlines on the set
const FOLK = !!window.FOLK;

const SEA = { x0: 46, x1: 92, floor: -8, surface: -0.4 };
groundBox(-30, SEA.x0, GROUND_BOTTOM, 0, -40, 0);
groundBox(SEA.x0, SEA.x1, GROUND_BOTTOM, SEA.floor, -40, 0);
groundBox(SEA.x1, 150, GROUND_BOTTOM, 0, -40, 0);
const water = box(SEA.x0, SEA.x1, SEA.floor, SEA.surface, -40, 0,
  () => new THREE.MeshPhongMaterial({ color: 0x1f6fb2, transparent: true, opacity: 0.78, shininess: 80, depthWrite: false }));
water.renderOrder = 2;

// ---------- phones with a little chat screen ----------
function chatTex(state, name) {
  return canvasTex(360, 720, (g, w, h) => {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#f2f2f7"; g.fillRect(0, 0, w, 110);
    g.fillStyle = "#c7c7cc"; g.beginPath(); g.arc(w / 2, 48, 26, 0, 7); g.fill();
    g.fillStyle = "#111"; g.font = "bold 24px Arial"; g.textAlign = "center"; g.fillText(name, w / 2, 98);
    const bubble = (text, right, color, tc) => {
      g.font = "bold 96px Arial";
      const bw = g.measureText(text).width + 70, bx = right ? w - bw - 16 : 16, by = 170;
      g.fillStyle = color; g.beginPath(); g.roundRect(bx, by, bw, 130, 56); g.fill();
      g.fillStyle = tc; g.textAlign = "left"; g.fillText(text, bx + 35, by + 100);
    };
    if (state === "sent") { bubble("67", true, "#0a84ff", "#fff"); g.fillStyle = "#8e8e93"; g.font = "20px Arial"; g.textAlign = "right"; g.fillText("Delivered", w - 26, 330); }
    if (state === "received") bubble("67", false, "#e5e5ea", "#111");
    // input bar
    g.fillStyle = "#f2f2f7"; g.fillRect(0, h - 100, w, 100);
    g.fillStyle = "#fff"; g.strokeStyle = "#d1d1d6"; g.lineWidth = 2; g.beginPath(); g.roundRect(18, h - 80, w - 100, 56, 28); g.fill(); g.stroke();
    g.fillStyle = state === "typing" ? "#111" : "#a0a0a6"; g.font = "bold 30px Arial"; g.textAlign = "left";
    g.fillText(state === "typing" ? "67" : "Message", 40, h - 42);
    g.fillStyle = "#0a84ff"; g.beginPath(); g.arc(w - 46, h - 52, 26, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(w - 46, h - 66); g.lineTo(w - 34, h - 50); g.lineTo(w - 58, h - 50); g.fill();
    g.fillRect(w - 49, h - 52, 6, 14);
  });
}
function phone(states, name) {
  const g = new THREE.Group();
  const bodyM = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.025), new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.3, metalness: 0.6 }));
  g.add(bodyM);
  const texs = Object.fromEntries(states.map(s => [s, chatTex(s, name)]));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.182, 0.37), new THREE.MeshBasicMaterial({ map: texs[states[0]] }));
  screen.position.z = 0.0131;
  g.add(screen);
  g.userData.show = s => (screen.material.map = texs[s]);
  return g;
}

// a stylised person: face, hair, hoodie, jeans and sneakers, holding a phone in both hands
function seg(parent, a, b, r, m) {
  const d = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 6, 12), m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  parent.add(mesh);
  return mesh;
}
function person(x, z, o) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.7 });
  const top = new THREE.MeshStandardMaterial({ color: o.shirt, roughness: 0.85 });
  const topDark = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.shirt).multiplyScalar(0.75), roughness: 0.85 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.9 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.6 });
  const hairM = new THREE.MeshStandardMaterial({ color: o.hair, roughness: 0.8 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x1b1b1b });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  // legs and sneakers
  for (const sx of [-1, 1]) {
    seg(g, V(0.1 * sx, 0.88, 0), V(0.11 * sx, 0.12, 0.02), 0.085, jeans);
    const sneaker = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.12, 6, 10), shoe);
    sneaker.rotation.x = Math.PI / 2; sneaker.position.set(0.11 * sx, 0.07, 0.07);
    g.add(sneaker);
  }
  // hoodie: torso, hood around the neck, front pocket, drawstrings
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.4, 8, 16), top);
  torso.position.y = 1.12; torso.scale.z = 0.72;
  g.add(torso);
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.055, 8, 20), topDark);
  hood.rotation.x = Math.PI / 2 - 0.3; hood.position.set(0, 1.42, -0.04);
  g.add(hood);
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.11, 0.02), topDark);
  pocket.position.set(0, 0.97, 0.175);
  g.add(pocket);
  for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 5), white); st.position.set(0.045 * sx, 1.32, 0.17); g.add(st); }
  // arms bent up to hold the phone at chest height
  for (const sx of [-1, 1]) {
    const shoulder = V(0.26 * sx, 1.36, 0), elbow = V(0.24 * sx, 1.04, 0.12), hand = V(0.075 * sx, 1.18, 0.3);
    seg(g, shoulder, elbow, 0.07, top);
    seg(g, elbow, hand, 0.062, top);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), skin); h.position.copy(hand); g.add(h);
  }
  // neck and head (tilted down toward the phone)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 12), skin);
  neck.position.y = 1.46; g.add(neck);
  const head = new THREE.Group();
  head.position.set(0, 1.66, 0.02); head.rotation.x = 0.32;
  g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.19, 28, 20), skin); skull.scale.set(0.95, 1.07, 1); head.add(skull);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), skin); ear.position.set(0.18 * sx, 0, 0); ear.scale.z = 0.6; head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), white); eye.position.set(0.068 * sx, 0.025, 0.165); eye.scale.z = 0.5; head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 8), dark); pupil.position.set(0.068 * sx, 0.012, 0.18); head.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.014, 0.012), hairM); brow.position.set(0.07 * sx, 0.085, 0.17); brow.rotation.z = -0.15 * sx; head.add(brow);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), skin); nose.position.set(0, -0.02, 0.188); head.add(nose);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 6, 16, Math.PI), dark);
  smile.rotation.z = Math.PI; smile.position.set(0, -0.06, 0.172); head.add(smile);
  const laugh = new THREE.Mesh(new THREE.CircleGeometry(0.055, 18, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: 0x5a1a1a, side: THREE.DoubleSide }));
  laugh.position.set(0, -0.055, 0.177); laugh.visible = false; head.add(laugh);
  // hair
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.42), hairM);
  cap.position.y = 0.02; cap.rotation.x = -0.35; head.add(cap);
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.195, 24, 16, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.4), hairM);
  back.rotation.x = -0.9; back.position.set(0, 0.0, -0.02); head.add(back);
  if (o.style === "bun") { const bun = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), hairM); bun.position.set(0, 0.17, -0.12); head.add(bun); }
  else { const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.08), hairM); fringe.position.set(0.03, 0.155, 0.1); fringe.rotation.set(0.75, 0, -0.2); fringe.scale.set(0.9, 0.7, 0.8); head.add(fringe); }
  // phone in both hands, screen turned toward the face
  o.phone.position.set(0, 1.22, 0.33);
  o.phone.rotation.set(0, Math.PI, 0);
  o.phone.rotateX(0.55);
  g.add(o.phone);
  g.position.set(x, 0, z);
  g.userData.setLaugh = on => { laugh.visible = on; smile.visible = !on; };
  scene.add(g);
  return g;
}
const phone1 = phone(["typing", "sent"], "Sam");
const phone2 = phone(["empty", "received"], "Alex");
// cartoon version: a folk character holding the phone at chest height
function folkPerson(x, z, o, ph, face) {
  const f = folk(o).pose({ armL: [0.25, 1.15, 0.9], armR: [0.25, 1.15, 0.9], headTilt: 0.3 });
  ph.position.set(0, 1.02, 0.3);
  ph.rotation.set(0, Math.PI, 0);
  ph.rotateX(0.5);
  f.add(ph);
  f.position.set(x, 0, z);
  f.userData.setLaugh = on => f.setFace(on ? "crazy" : face);
  f.userData.setLaugh(false);
  scene.add(f);
  return f;
}
const alex = FOLK
  ? folkPerson(2, -2.6, { body: 0x3fa9a0, outfit: "polo", name: "Sam", hairStyle: "swoop", hair: 0x8a5a2b, shoes: 0x2c2c2c, face: "smug" }, phone1, "smug")
  : person(2, -2.6, { phone: phone1, shirt: 0x3fa9a0, hair: 0x3b2a20, skin: 0xe8b98f, style: "short" });
const sam = FOLK
  ? folkPerson(104, -2.6, { body: 0xe0604a, hairStyle: "bun", hair: 0x6b3e26, shoes: 0x283a6b, face: "bored" }, phone2, "bored")
  : person(104, -2.6, { phone: phone2, shirt: 0xe0604a, hair: 0x6b3e26, skin: 0xc68e62, style: "bun" });

// the phone screen pops up on screen as a card, so the message is big and readable
const card = document.createElement("div");
Object.assign(card.style, { position: "absolute", left: "640px", top: "330px", width: "380px", height: "760px", borderRadius: "54px",
  background: "#111", padding: "18px", boxSizing: "border-box", boxShadow: "0 30px 80px rgba(0,0,0,0.55)", transformOrigin: "50% 100%", opacity: 0, rotate: "4deg" });
const cardImg = document.createElement("img");
Object.assign(cardImg.style, { width: "100%", height: "100%", borderRadius: "48px", display: "block" });
card.appendChild(cardImg);
document.body.insertBefore(card, document.getElementById("caption"));
const screens = Object.fromEntries([["typing", "Sam"], ["sent", "Sam"], ["empty", "Alex"], ["received", "Alex"]].map(([st, n]) => [st, chatTex(st, n).image.toDataURL()]));
function showCard(state, k) {        // k: 0 hidden .. 1 fully shown
  card.style.opacity = Math.min(1, k * 1.5);
  card.style.transform = `translateY(${(1 - k) * 260}px) scale(${0.85 + 0.15 * k})`;
  if (state && cardImg.dataset.state !== state) { cardImg.src = screens[state]; cardImg.dataset.state = state; }
}

// ---------- cell towers ----------
function tower(x) {
  const g = new THREE.Group();
  const steel = new THREE.MeshLambertMaterial({ color: 0xb8bcc2 });
  const H = 12;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, H, 6), steel);
    leg.position.set(dx * 0.55, H / 2, dz * 0.55); leg.rotation.set(dz * 0.035, 0, -dx * 0.035);
    g.add(leg);
  }
  for (let y = 1.5; y < H; y += 1.5) {
    const s = 1.1 - y / H * 0.6;
    for (const [a, b, c, d] of [[-s, -s, s, -s], [-s, s, s, s], [-s, -s, -s, s], [s, -s, s, s]]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, Math.hypot(c - a, d - b), 4), steel);
      bar.position.set((a + c) / 2 * 0.5, y, (b + d) / 2 * 0.5); bar.rotation.set(Math.PI / 2, 0, Math.atan2(d - b, c - a) + Math.PI / 2);
      bar.rotation.order = "YXZ"; bar.rotation.set(0, -Math.atan2(d - b, c - a), Math.PI / 2);
      g.add(bar);
    }
  }
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 0.12), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
    panel.position.set(Math.cos(a) * 0.55, H - 0.6, Math.sin(a) * 0.55); panel.rotation.y = -a + Math.PI / 2;
    g.add(panel);
  }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.3, 0.2) }));
  beacon.position.y = H + 0.2;
  g.add(beacon);
  g.position.set(x, 0, -2.5);
  scene.add(g);
  return { g, top: V(x, H - 0.6, -2.5), beacon };
}
const tower1 = tower(14), tower2 = tower(98);

// ---------- data center: open-front building full of server racks ----------
const DC = { x0: 26, x1: 38, zBack: -9, h: 5 };
const wallM = solid(0xdfe3e8, 0x151515);
box(DC.x0, DC.x1, 0, 0.15, DC.zBack, 0, solid(0x8a9099));
box(DC.x0, DC.x1, DC.h, DC.h + 0.3, DC.zBack, 0, wallM);
box(DC.x0, DC.x1, 0, DC.h, DC.zBack, DC.zBack + 0.3, wallM);
box(DC.x0, DC.x0 + 0.3, 0, DC.h, DC.zBack, 0, wallM);
box(DC.x1 - 0.3, DC.x1, 0, DC.h, DC.zBack, 0, wallM);
for (const x of [28, 31, 34]) box(x, x + 1.6, DC.h + 0.3, DC.h + 1.1, -6, -3, solid(0x9aa3ad));   // roof AC units
const leds = [];
const ledColors = [new THREE.Color(0.2, 2.2, 0.6), new THREE.Color(0.3, 1.2, 3.0), new THREE.Color(2.4, 1.6, 0.2)];
for (const z of [-7.2, -4.8, -2.4]) {
  for (let x = 27; x < 37; x += 1.15) {
    box(x, x + 0.9, 0.15, 3.6, z - 0.7, z, solid(0x16181c));
    for (let r = 0; r < 9; r++) {
      const led = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshBasicMaterial({ color: ledColors[(r + Math.floor(x)) % 3].clone() }));
      led.position.set(x + 0.15 + (r % 3) * 0.3, 0.6 + Math.floor(r / 3) * 1.0 + (r % 2) * 0.2, z + 0.005);
      led.userData.phase = Math.random() * 10;
      scene.add(led);
      leds.push(led);
    }
  }
}
const coolLight = new THREE.PointLight(0x7fb2ff, 6, 14);
coolLight.position.set(32, 4.2, -3);
scene.add(coolLight);

// ---------- fibre route, drawn on the cut face, with pulses of light ----------
const ROUTE = [
  V(14, 0, 0), V(14, -2.5, 0), V(32, -2.5, 0), V(32, 0, 0),               // tower -> data center
  V(32, -3.2, 0), V(SEA.x0, -3.2, 0), V(SEA.x0 + 1.5, SEA.floor + 0.25, 0), // out to the coast, down the cliff
  V(SEA.x1 - 1.5, SEA.floor + 0.25, 0), V(SEA.x1, -3.2, 0), V(98, -3.2, 0), V(98, 0, 0),
];
pipeBand(ROUTE.slice(0, 4), 0.18);
pipeBand(ROUTE.slice(3), 0.18);
const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.6, 3.2) });
const P = pts => pts.map(p => V(p.x, p.y, 0.06));
const fFiber = flow(P(ROUTE.slice(0, 4)), 40, glow, 0.11, 1.4);
const fCoast = flow(P(ROUTE.slice(3, 7)), 40, glow, 0.11, 1.4);
const fSea = flow(P(ROUTE.slice(6, 8)), 70, glow, 0.13, 1.6);
const fLand = flow(P(ROUTE.slice(7)), 34, glow, 0.11, 1.2);

// radio waves: rings that travel from a phone to a tower top (and from a tower to a phone)
function waves(from, to) {
  const rings = [];
  const ringM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 2.4, 3.4), transparent: true, depthWrite: false });
  for (let i = 0; i < 9; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 40), ringM.clone());
    r.userData.phase = i / 9;
    scene.add(r);
    rings.push(r);
  }
  const dir = to.clone().sub(from).normalize();
  return on => rings.forEach(r => {
    const u = (performanceTime * 0.9 + r.userData.phase) % 1;
    r.visible = on;
    r.position.copy(from).lerp(to, u);
    r.lookAt(r.position.clone().add(dir));
    r.scale.setScalar(0.4 + u * 2.4);
    r.material.opacity = 0.9 * (1 - u);
  });
}
let performanceTime = 0;
const wavesUp = waves(V(2, 1.3, -2.25), tower1.top);
const wavesDown = waves(tower2.top, V(104, 1.3, -2.25));

// ---------- the ocean: fish, a curious shark, a satellite overhead ----------
const fish = [];
for (let i = 0; i < 16; i++) {
  const f = new THREE.Group();
  const c = [0xff9f1c, 0xffd23f, 0x3ec1d3, 0xf25f5c][i % 4];
  const bodyF = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), new THREE.MeshLambertMaterial({ color: c }));
  bodyF.scale.set(1.6, 0.8, 0.5);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 3), new THREE.MeshLambertMaterial({ color: c }));
  tail.rotation.z = Math.PI / 2; tail.position.x = -0.5;
  f.add(bodyF, tail);
  f.userData = { x: SEA.x0 + 4 + Math.random() * 38, y: -1.5 - Math.random() * 5.5, z: -0.8 - Math.random() * 5, sp: 0.6 + Math.random() * 0.8, ph: Math.random() * 6 };
  scene.add(f);
  fish.push(f);
}
const shark = new THREE.Group();
const sharkM = new THREE.MeshLambertMaterial({ color: 0x6f7d8c });
const sb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 10), sharkM); sb.scale.set(3, 0.8, 0.8); shark.add(sb);
const fin = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 3), sharkM); fin.position.set(0.1, 0.7, 0); fin.rotation.z = -0.3; shark.add(fin);
const st = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 3), sharkM); st.position.set(-1.9, 0.15, 0); st.rotation.z = Math.PI / 2 + 0.4; shark.add(st);
scene.add(shark);
const sat = new THREE.Group();
sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 })));
for (const s of [-1, 1]) {
  const p = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 0.9), new THREE.MeshStandardMaterial({ color: 0x1a3d7c, metalness: 0.3, roughness: 0.4 }));
  p.position.x = s * 1.6; sat.add(p);
}
sat.position.set(68, 10, -4);
sat.scale.setScalar(1.8);
scene.add(sat);
const cross = new THREE.Group();
for (const a of [Math.PI / 4, -Math.PI / 4]) {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.45, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.15, 0.1) }));
  bar.rotation.z = a; cross.add(bar);
}
cross.position.set(68, 10, -2.6);
cross.scale.setScalar(1.7);
scene.add(cross);

// sea floor: sand, rocks and swaying seaweed
box(SEA.x0, SEA.x1, SEA.floor, SEA.floor + 0.15, -40, 0, solid(0xd8c38f));
const weeds = [];
for (let i = 0; i < 40; i++) {
  const x = SEA.x0 + 2 + Math.random() * (SEA.x1 - SEA.x0 - 4), z = -0.6 - Math.random() * 6;
  if (i % 3 === 0) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.4), new THREE.MeshLambertMaterial({ color: 0x6b6f75, flatShading: true }));
    rock.position.set(x, SEA.floor + 0.2, z); rock.scale.y = 0.6;
    scene.add(rock);
  } else {
    const w = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.2 + Math.random() * 1.4, 5), new THREE.MeshLambertMaterial({ color: i % 2 ? 0x2e8b57 : 0x4caf50 }));
    w.position.set(x, SEA.floor + 0.8, z);
    w.userData.ph = Math.random() * 6;
    scene.add(w);
    weeds.push(w);
  }
}

// ---------- backdrop ----------
const sets = [house(-6, -14, 11), house(108, -14, 10), tower1.g, tower2.g];
for (const [x, z, s] of [[-14, -9, 1.2], [8, -12, 1.1], [22, -10, 1], [41, -9, 1.2], [96, -10, 1.1], [116, -9, 1.3]]) sets.push(tree(x, z, s));
if (FOLK) {
  const meshes = [];
  for (const g of sets) g.traverse(m => { if (m.isMesh && m.geometry.type !== "ExtrudeGeometry") meshes.push(m); });
  meshes.forEach(outline);
}
for (const [x, y, z, s] of [[0, 20, -45, 2], [30, 23, -55, 2.4], [70, 21, -50, 2.2], [104, 22, -50, 2.4]]) cloud(x, y, z, s);

// ---------- timeline ----------
const cams = {
  start:  { pos: V(2.3, 1.9, 1.2), look: V(2, 1.5, -2.6) },
  intro:  { pos: V(2.3, 1.62, -0.6), look: V(2.38, 1.5, -2.6) },
  tower:  { pos: V(9.5, 6.5, 20),  look: V(11, 6.2, -2.5) },
  fiber:  { pos: V(20, -0.5, 15),  look: V(21, -1.8, -1) },
  data:   { pos: V(32, 3, 13),     look: V(32, 1.8, -4) },
  ocean:  { pos: V(62, -5.2, 9),   look: V(62, -6.9, -2) },
  fact:   { pos: V(68, 1.5, 27),   look: V(68, 1.5, -4) },
  arrive: { pos: V(104.2, 1.62, -0.6), look: V(104.24, 1.5, -2.6) },
  outro:  { pos: V(104.05, 1.68, -1.0), look: V(104, 1.58, -2.6) },
  cta:    { pos: V(56, 18, 100),   look: V(56, -1, -5) },
};

// the cartoon heads are bigger: frame the close-ups a little wider
if (FOLK) Object.assign(cams, {
  intro:  { pos: V(2.3, 1.8, 0.5),     look: V(2.4, 1.5, -2.6) },
  arrive: { pos: V(104.25, 1.8, 0.5),  look: V(104.32, 1.5, -2.6) },
  outro:  { pos: V(104.05, 1.75, -0.1), look: V(104, 1.62, -2.6) },
});

start((time, tl) => {
  performanceTime = time;
  const look = moveCamera(cams, tl);
  setWaterTable(GROUND_BOTTOM - 1, time);
  const at = n => tl.since(n);
  const intro = tl.prog("intro"), arrive = tl.prog("arrive"), fact = tl.prog("fact");

  // sender's phone: typed, then sent; receiver's phone lights up when it arrives
  phone1.userData.show(intro > 0.3 || intro < 0 && tl.prog("tower") > 0 ? "sent" : "typing");
  phone2.userData.show(arrive > 0.55 || tl.prog("outro") > 0 ? "received" : "empty");
  sam.userData.setLaugh(arrive > 0.75 || tl.prog("outro") > 0);

  const pop = (p, a, b) => ease(Math.min((p - a) / 0.12, (b - p) / 0.12, 1));
  if (intro > 0.12 && intro < 0.95) showCard(intro > 0.55 ? "sent" : "typing", pop(intro, 0.12, 0.95));
  else if (arrive > 0.25 && arrive < 1.0) showCard(arrive > 0.55 ? "received" : "empty", pop(arrive, 0.25, 1.0));
  else showCard(null, 0);
  wavesUp(intro > 0.4 && tl.prog("fiber") < 0.3);
  wavesDown(arrive > 0.05 && arrive < 0.6);
  fFiber(at("fiber") - 0.2);
  fCoast(at("data") + 1.2);
  fSea(at("ocean") - 0.1);
  fLand(arrive > -0.2 ? at("arrive") + 0.6 : -1);

  for (const l of leds) {
    const on = Math.sin(time * 9 + l.userData.phase * 7) > -0.3;
    l.visible = on;
  }
  tower1.beacon.visible = tower2.beacon.visible = Math.sin(time * 4) > 0;

  for (const f of fish) {
    const { x, y, z, sp, ph } = f.userData;
    const fx = SEA.x0 + 3 + ((x - SEA.x0 - 3 + time * sp) % 40);
    f.position.set(fx, y + 0.2 * Math.sin(time * 2 + ph), z);
    f.rotation.z = 0.1 * Math.sin(time * 3 + ph);
  }
  shark.position.set(64 + 4 * Math.sin(time * 0.35), SEA.floor + 1.6 + 0.2 * Math.sin(time), -1.8);
  shark.rotation.y = Math.cos(time * 0.35) > 0 ? 0 : Math.PI;

  for (const w of weeds) w.rotation.z = 0.15 * Math.sin(time * 1.5 + w.userData.ph);
  cross.visible = fact > 0.45 && fact < 1.05;
  sat.rotation.y = time * 0.3;

  camera.lookAt(look);
});
