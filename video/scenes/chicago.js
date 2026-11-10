// "They lifted a hotel... with the guests still inside" (the raising of Chicago, 1850s-60s), fast-cut story style.
// Sets along x: STREET 0 (mud street + the hotel), ROOM 100 (hotel room), HALL 200 (city hall), UNDER 300 (under the
// hotel: men at jackscrews), JACK 400 (a car jack), TRAIN 500 (a sleeping car).
import { THREE, scene, camera, sun, hemi, V, ease, lerp, start } from "./kit.js";
import { setupStyle, setLight, aimSun, ctex, lam, lit, add, box, makeMax, makeCard, faceCamera, look, untone, townsfolk, CREAM, NOINK } from "./style2kit.js";
import { facadeHD } from "./vendor/paint.js";
import { cardShade } from "./vendor/cardshade.js";

setupStyle({ ink: { widthNear: 4.2, widthFar: 2.8 }, blur: { aperture: 0.0024, maxblur: 0.006 } });
const SET = { street: 0, room: 100, hall: 200, under: 300, jack: 400, train: 500 };
const SHOT_SET = { rise: "street", guest: "room", problem: "street", swamp: "street", mud: "street", sign: "street", sick: "street",
  decision: "hall", pipes: "street", raise: "street", stuck: "street", lift: "under", under: "under", signal: "under", rises: "street",
  tea: "room", jack: "jack", roll: "street", wave: "street", pullman: "train", sleep: "room" };
const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
const lights = {};
const lamp = (set, x, y, z, i = 6, d = 8, col = 0xffc070) => { const l = new THREE.PointLight(col, i, d, 1.6); l.position.set(x, y, z); scene.add(l); (lights[set] ||= []).push(l); return l; };
const wood = (base, rx = 1, ry = 1) => ctex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = "rgba(40,22,10,0.45)"; g.fillRect(0, y, w, 3); for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(60,35,15,0.18)"; g.fillRect(rnd() * w, y + 6 + rnd() * 20, 30 + rnd() * 80, 2); } } }, rx, ry);
const T = (o, opts = {}, sc = 1) => makeCard({ ...o, skin: o.skin ?? CREAM }, { mode: "stand", expr: "neutral", ...opts }, null, sc);

// ======================= STREET: a muddy 1850s Chicago street, the hotel at the end =======================
const ST = { street: null, fill: null, hotel: null, screws: [], wagon: null, sign: null, pipes: [], house: null };
{
  const X = SET.street;
  const mudTex = ctex(256, 256, (g, w, h) => { g.fillStyle = "#6b4a2c"; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.fillStyle = rnd() < 0.3 ? "rgba(120,140,150,0.55)" : `rgba(${rnd() < 0.5 ? "40,25,12" : "140,100,60"},0.35)`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 8 + rnd() * 30, 4 + rnd() * 12, 0, 0, 7); g.fill(); } }, 4, 10);
  const mud = add(new THREE.PlaneGeometry(10, 60), lam({ map: mudTex }), X, 0, -18); mud.rotation.x = -Math.PI / 2;
  ST.fill = box(10, 1, 32, lam({ map: ctex(128, 128, (g, w, h) => { g.fillStyle = "#9a7a52"; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "70,50,30" : "190,160,120"},0.4)`; g.fillRect(rnd() * w, rnd() * h, 3, 3); } }, 4, 11) }), X, -0.5, -4);
  // plank sidewalks and wooden / brick shopfronts down both sides
  for (const s of [-1, 1]) {
    box(2.4, 0.3, 60, lam({ map: wood("#8a6238", 1, 20) }), X + s * 6.2, 0.15, -18);
    let z = 4;
    for (let i = 0; i < 6; i++) {
      const w = 5 + (i % 2), h = 6 + ((i + (s > 0 ? 1 : 0)) % 3) * 1.6, st = [{ wall: "#b88a5a", shutter: "#4a5a3a", timber: true }, { wall: "#b5543c", shutter: "#3b3f52", brick: true }, { wall: "#d9c09a", shutter: "#6a3a2a" }][(i + (s > 0 ? 1 : 0)) % 3];
      const front = lam({ map: facadeHD(`chi${s}_${i}`, w, h, { ...st, door: true }) }), plain = lam({ color: st.wall });
      box(5, h, w - 0.1, s < 0 ? [front, plain, plain, plain, plain, plain] : [plain, front, plain, plain, plain, plain], X + s * (7.4 + 2.5), h / 2, z - w / 2);
      z -= w;
    }
  }
  // the hotel: a big brick block at the end of the street, on rows of jackscrews
  const hotel = new THREE.Group(); hotel.position.set(X, 0, -26); scene.add(hotel); ST.hotel = hotel;
  const hf = lam({ map: facadeHD("chiHotel", 14, 15, { wall: "#b5543c", shutter: "#2f4a3a", brick: true, door: true }) }), hp = lam({ color: "#a84c36" });
  box(14, 15, 9, [hp, hp, lam({ color: "#5a3a2a" }), hp, hf, hp], 0, 7.5, 0, hotel);
  box(14.6, 0.6, 9.6, lam({ color: "#e8dcc4" }), 0, 15.2, 0, hotel);
  const sign = ctex(512, 96, (g, w, h) => { g.fillStyle = "#1f3a2a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#e0c070"; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = "#f0d58a"; g.font = "bold 62px Georgia, serif"; g.textAlign = "center"; g.fillText("GRAND HOTEL", w / 2, 68); });
  add(new THREE.PlaneGeometry(7, 1.3), lam({ map: sign }), 0, 12.6, 4.52, hotel);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 12; i++) {
    const sc = add(new THREE.CylinderGeometry(0.12, 0.16, 1, 10), lam({ color: "#5a5f66" }), -6 + i * 1.1, 0, 4.2 - r * 3, scene);
    sc.position.x += X; sc.position.z += -26; ST.screws.push(sc);
  }
  // a wagon that sinks into the mud
  const wagon = new THREE.Group(); wagon.position.set(X - 1.6, 0, -3); scene.add(wagon); ST.wagon = wagon;
  box(2.4, 0.6, 1.3, lam({ map: wood("#9a6a3a", 2, 1) }), 0, 0.8, 0, wagon);
  for (const [x, z] of [[-0.8, 0.7], [0.8, 0.7], [-0.8, -0.7], [0.8, -0.7]]) { const wh = add(new THREE.TorusGeometry(0.42, 0.06, 8, 20), lam({ color: "#3a2a1a" }), x, 0.45, z, wagon); for (let k = 0; k < 4; k++) { const sp = add(new THREE.BoxGeometry(0.03, 0.8, 0.03), lam({ color: "#8a6238" }), x, 0.45, z, wagon); sp.rotation.z = k * Math.PI / 4; } void wh; }
  // the joke sign stuck in the mud
  const st2 = new THREE.Group(); st2.position.set(X + 1.4, 0, -1.2); scene.add(st2); ST.sign = st2;
  box(0.1, 1.6, 0.1, lam({ color: "#6b4a2e" }), 0, 0.8, -0.09, st2);
  const signTex = ctex(320, 160, (g, w, h) => { g.fillStyle = "#c9a46a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#5a3a1a"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = "#2a1a0a"; g.font = "bold 46px Georgia, serif"; g.textAlign = "center"; g.fillText("NO BOTTOM", w / 2, 70); g.fillText("HERE", w / 2, 122); });
  const sb = box(1.2, 0.6, 0.06, lam({ color: "#c9a46a" }), 0, 1.45, 0, st2); add(new THREE.PlaneGeometry(1.16, 0.58), lam({ map: signTex }), 0, 1.45, 0.035, st2); sb.rotation.z = -0.08;
  // sewer pipes laid on top of the ground
  for (let i = 0; i < 5; i++) { const pp = add(new THREE.CylinderGeometry(0.55, 0.55, 3.8, 20), lam({ color: "#8a8f96" }), X - 2 + (i % 2) * 0.3, 0.55, -2 - i * 4, scene); pp.rotation.x = Math.PI / 2; ST.pipes.push(pp); }
  // a house on log rollers
  const house = new THREE.Group(); scene.add(house); ST.house = house;
  const hfront = lam({ map: facadeHD("chiRoll", 4, 4.2, { wall: "#e2d2a8", shutter: "#3a5a7a", door: true }) }), hpl = lam({ color: "#e2d2a8" });
  box(4, 4.2, 3.6, [hpl, hpl, hpl, hpl, hfront, hpl], 0, 2.7, 0, house);
  const roof = add(new THREE.ConeGeometry(3.2, 1.6, 4), lam({ color: "#7a3f30" }), 0, 5.6, 0, house); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.8;
  add(new THREE.PlaneGeometry(1.1, 1.5), lam({ color: "#3a2a22" }), 0.9, 3.55, 1.805, house);   // an open balcony door
  box(1.5, 0.9, 0.5, lam({ color: "#8a6238" }), 0.9, 2.75, 2.05, house);   // the balcony she waves from
  for (let i = 0; i < 4; i++) { const lg = add(new THREE.CylinderGeometry(0.22, 0.22, 3.8, 12), lam({ color: "#8a6238" }), -1.6 + i * 1.07, 0.32, 0, house); lg.rotation.x = Math.PI / 2; }
}
const streetFolk = {
  mudMan: T(townsfolk(0), { expr: "stern", facing: 1, seed: 21 }),
  sick: T(townsfolk(3), { expr: "pained", seed: 22 }),
  sick2: T(townsfolk(4), { expr: "nervous", seed: 23, facing: -1 }),
  worker1: T({ jacket: "#5a6a7a", pants: "#3b3f52", boots: "#3a2a1a", hat: "cap", cap: "#8a5a3a" }, { expr: "neutral", mode: "push", seed: 24 }),
  worker2: T({ jacket: "#7a5a3a", pants: "#3b3f52", boots: "#3a2a1a", hat: "cap", cap: "#3a4a6a" }, { expr: "stern", seed: 25 }),
  waver: T(townsfolk(1), { expr: "smile", seed: 26, wave: 0 }, 0.7),
};
const maxStreet = makeMax({ expr: "neutral" });

// ======================= ROOM: the hotel room (tea, then bed) =======================
let roomSky, bedBlanket, bedSheet, bedPillow;
const maxTea = makeMax({ expr: "neutral", prop: "sip" }, { jacket: "#8a2b3a", buttons: "#e8c45a" });
const waiter = T({ jacket: "#f2efe6", pants: "#2b2b38", boots: "#1e1e1e", hat: "hair", hair: "#3a2a1a", moustache: "#3a2a1a", buttons: "#2b2b38" }, { expr: "smile", seed: 41, facing: -1 });
const maxBedSrc = makeMax({ expr: "m_neutral", blink: 1 }, { jacket: "#8a2b3a" }); maxBedSrc.visible = false;
// Max asleep, seen from the side of the bed: his usual drawing laid on its side, head on a pillow, a blanket up to his chin
const maxBed = (() => {
  const W2 = 1000, H2 = 600, cv = document.createElement("canvas"); cv.width = W2; cv.height = H2;
  const c = cv.getContext("2d"), INK = "#241726", src = maxBedSrc.children[0].material.map.image;
  c.lineJoin = c.lineCap = "round"; c.lineWidth = 9; c.strokeStyle = INK;
  // pillow
  c.fillStyle = "#f4f2ea"; c.beginPath(); c.ellipse(230, 405, 175, 62, -0.04, 0, Math.PI * 2); c.fill(); c.stroke();
  // Max, head to the left (his drawing rotated a quarter turn)
  c.save(); c.translate(-30, 600); c.rotate(-Math.PI / 2); c.drawImage(src, 0, 0); c.restore();
  c.clearRect(430, 0, W2 - 430, H2);   // his body is under the blanket: nothing pokes out above it
  // blanket from his neck to past his feet, with a fold at the top
  c.fillStyle = "#3f6a8a"; c.beginPath(); c.moveTo(370, 470); c.bezierCurveTo(372, 230, 440, 175, 580, 180); c.bezierCurveTo(760, 188, 900, 230, 995, 270); c.lineTo(995, 470); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#e9e4d6"; c.beginPath(); c.moveTo(370, 470); c.bezierCurveTo(372, 260, 400, 205, 450, 186); c.bezierCurveTo(440, 260, 445, 380, 455, 470); c.closePath(); c.fill(); c.stroke();
  c.lineWidth = 6; c.beginPath(); c.moveTo(600, 250); c.quadraticCurveTo(650, 340, 630, 440); c.moveTo(800, 270); c.quadraticCurveTo(840, 360, 820, 450); c.stroke();
  c.clearRect(0, 468, W2, H2 - 468);   // the 3D mattress carries on below
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 1.35), cardShade(new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide })));
  m.layers.set(NOINK); const g = new THREE.Group(); g.add(m); scene.add(g); g.userData.draw = () => {}; return g;
})();
{
  const X = SET.room;
  const paper = ctex(256, 256, (g, w, h) => { g.fillStyle = "#e9d7a8"; g.fillRect(0, 0, w, h); g.fillStyle = "#c9a86a"; for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 * 16; x < w; x += 32) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } g.fillStyle = "rgba(120,60,40,0.25)"; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 6, h); }, 4, 2);
  box(10, 4, 0.2, lit({ map: paper }), X, 2, -3); box(0.2, 4, 8, lit({ map: paper }), X - 4, 2, 0.5); box(0.2, 4, 8, lit({ map: paper }), X + 4, 2, 0.5);
  const fl = add(new THREE.PlaneGeometry(10, 9), lit({ map: wood("#8a5a34", 4, 4) }), X, 0, 0.5); fl.rotation.x = -Math.PI / 2;
  box(10, 0.15, 9, lit({ color: "#f0e6d0" }), X, 4.05, 0.5);
  // the window: sky outside slides down as the hotel rises
  const skyT = ctex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#5e93d9"); gr.addColorStop(0.6, "#b8d0ec"); gr.addColorStop(0.62, "#7a5a3a"); gr.addColorStop(1, "#6b4a2c"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); skyT.repeat.set(1, 0.35);
  roomSky = skyT;
  add(new THREE.PlaneGeometry(1.6, 1.9), new THREE.MeshBasicMaterial({ map: skyT }), X + 1.6, 2.1, -2.88);
  for (const [w, h, x, y] of [[1.9, 0.12, 1.6, 3.1], [1.9, 0.12, 1.6, 1.1], [0.12, 2.1, 0.66, 2.1], [0.12, 2.1, 2.54, 2.1], [0.08, 1.9, 1.6, 2.1], [1.7, 0.08, 1.6, 2.1]]) box(w, h, 0.12, lit({ color: "#f4efe4" }), X + x, y, -2.8);
  for (const s of [-1, 1]) box(0.5, 2.4, 0.06, lit({ color: "#8a2b3a" }), X + 1.6 + s * 1.15, 2.2, -2.7);
  // table with a teapot, a lamp, a bed against the left wall
  box(1.2, 0.08, 0.8, lit({ map: wood("#6b4128") }), X - 0.4, 0.78, -1.2); box(0.08, 0.76, 0.08, lit({ color: "#4a2e1a" }), X - 0.4, 0.38, -1.2);
  add(new THREE.SphereGeometry(0.16, 16, 12), lit({ color: "#f4f4f2" }), X - 0.6, 0.98, -1.2);
  bedBlanket = box(2.4, 0.5, 2.0, lit({ color: "#3f6a8a" }), X - 2.6, 0.65, -1.6);
  bedSheet = box(1.2, 0.06, 1.7, lit({ color: "#4f7a9a" }), X - 1.95, 1.1, -1.75);   // the sheet over his legs
  box(2.6, 0.3, 2.2, lit({ map: wood("#6b4128") }), X - 2.6, 0.3, -1.8); box(0.12, 1.4, 2.2, lit({ map: wood("#6b4128") }), X - 3.85, 0.9, -1.8);
  bedPillow = box(0.7, 0.18, 1.2, lit({ color: "#f4f4f0" }), X - 3.3, 0.95, -1.8);
  lamp("room", X, 3.4, 1.5, 8, 12, 0xffe0b0); lamp("room", X + 1.6, 2.2, -1.8, 3, 6, 0xdfeaff);
}

// ======================= HALL: the city council decides =======================
const council = T({ jacket: "#2e2a36", pants: "#2b2b38", boots: "#1e1e1e", hat: "tophat", moustache: "#5a3a2a" }, { expr: "stern", seed: 51, prop: ["hammer", 0] });
const councillors = [0, 1, 2].map(i => T(townsfolk(i * 2), { expr: "nervous", seed: 52 + i }, 0.9));
{
  const X = SET.hall;
  box(12, 5, 0.3, lit({ map: wood("#6b4128", 3, 2) }), X, 2.5, -3);
  const fl = add(new THREE.PlaneGeometry(12, 9), lit({ map: wood("#5a3a22", 4, 4) }), X, 0, 0.5); fl.rotation.x = -Math.PI / 2;
  box(4, 1.1, 1.0, lit({ map: wood("#7a4b2e") }), X, 0.55, -1.2); box(5, 0.55, 2, lit({ map: wood("#5a3a22") }), X, 0.27, -2.3);   // dais
  const seal = ctex(256, 256, (g, w, h) => { g.fillStyle = "#e0c070"; g.beginPath(); g.arc(w / 2, h / 2, 120, 0, 7); g.fill(); g.strokeStyle = "#7a5a20"; g.lineWidth = 10; g.stroke(); g.fillStyle = "#5a3a10"; g.font = "bold 40px Georgia, serif"; g.textAlign = "center"; g.fillText("CITY OF", 128, 115); g.fillText("CHICAGO", 128, 165); });
  add(new THREE.PlaneGeometry(1.6, 1.6), lit({ map: seal, transparent: true }), X, 3.4, -2.84);
  lamp("hall", X, 3.8, 1.5, 9, 12, 0xffe0b0);
}

// ======================= UNDER: men at the jackscrews under the hotel =======================
const UN = { screws: [], beam: null };
const crew = [];
const foreman = T({ jacket: "#7a3a2a", pants: "#3b3f52", boots: "#3a2a1a", hat: "cap", cap: "#2a2a2a", moustache: "#3a2a1a" }, { expr: "whistle", seed: 61 });
{
  const X = SET.under;
  const fl = add(new THREE.PlaneGeometry(20, 12), lit({ map: ctex(128, 128, (g, w, h) => { g.fillStyle = "#6b4a2c"; g.fillRect(0, 0, w, h); for (let i = 0; i < 200; i++) { g.fillStyle = "rgba(40,25,12,0.35)"; g.fillRect(rnd() * w, rnd() * h, 4, 3); } }, 6, 4) }), X, 0, -2); fl.rotation.x = -Math.PI / 2;
  UN.beam = new THREE.Group(); UN.beam.position.set(X, 2.3, -2); scene.add(UN.beam);
  box(20, 0.5, 12, lit({ map: wood("#7a5434", 6, 4) }), 0, 0.25, 0, UN.beam);
  for (let i = -4; i <= 4; i++) box(0.4, 0.4, 12, lit({ color: "#5a3a22" }), i * 2.2, -0.15, 0, UN.beam);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) {
    const g = new THREE.Group(); g.position.set(X - 6.6 + i * 2.2, 0, -0.8 - r * 2.6); scene.add(g);
    const post = add(new THREE.CylinderGeometry(0.11, 0.11, 2.3, 10), lit({ map: ctex(32, 128, (c, w, h) => { c.fillStyle = "#7a8088"; c.fillRect(0, 0, w, h); c.fillStyle = "#3a3f46"; for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 3); }, 1, 4) }), 0, 1.15, 0, g);
    const bar = add(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), lit({ color: "#2a2a2a" }), 0, 0.9, 0, g); bar.rotation.z = Math.PI / 2;
    void post; UN.screws.push(g);
    if (r < 2 && i % 2 === 0) { const w = T({ jacket: ["#5a6a7a", "#7a5a3a", "#4a6a4a", "#6a4a6a"][(i + r) % 4], pants: "#3b3f52", boots: "#3a2a1a", hat: "cap", cap: ["#8a5a3a", "#3a4a6a", "#5a5a5a"][(i + r) % 3] }, { expr: "stern", seed: 70 + i + r * 7 }, 0.82); w.position.set(g.position.x + 0.55, 0, g.position.z + 0.35); crew.push(w); }
  }
  for (const x of [-6, 0, 6]) lamp("under", X + x, 1.9, 1, 6, 9);
}

// ======================= JACK: a car on a jack, "times a thousand" =======================
let jackLift, carBody;
{
  const X = SET.jack;
  const fl = add(new THREE.PlaneGeometry(12, 10), lam({ color: "#8a8f96" }), X, 0, 0); fl.rotation.x = -Math.PI / 2;
  carBody = new THREE.Group(); carBody.position.set(X, 0, -1); scene.add(carBody);
  box(3.6, 0.7, 1.7, lam({ color: "#3a7ac9" }), 0, 0.75, 0, carBody); box(2.0, 0.6, 1.5, lam({ color: "#9fc3e0" }), -0.2, 1.4, 0, carBody);
  for (const [x, z] of [[1.2, 0.85], [-1.2, 0.85]]) { const w = add(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 18), lam({ color: "#2a2a2a" }), x, 0.36, z, carBody); w.rotation.x = Math.PI / 2; }
  jackLift = new THREE.Group(); jackLift.position.set(X + 1.2, 0, 0.1); scene.add(jackLift);
  box(0.6, 0.08, 0.3, lam({ color: "#d63a2a" }), 0, 0.04, 0, jackLift);
  const times = ctex(512, 220, (g, w, h) => { g.fillStyle = "#ffd400"; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 40); g.fill(); g.lineWidth = 12; g.strokeStyle = "#111"; g.stroke(); g.fillStyle = "#111"; g.font = "900 130px Arial Black, Arial"; g.textAlign = "center"; g.fillText("×1000", w / 2, 160); });
  const tm = add(new THREE.PlaneGeometry(2.4, 1.03), new THREE.MeshBasicMaterial({ map: times, transparent: true }), X, 2.9, 0.5); tm.layers.set(NOINK); tm.position.x = X + 0.4; tm.userData.times = true; ST.times = tm;
}

// ======================= TRAIN: a sleeping car =======================
const sleepers = [];
const pullman = T({ jacket: "#2e2a36", pants: "#2b2b38", boots: "#1e1e1e", hat: "tophat", moustache: "#6a4a2a", buttons: "#e8c45a" }, { expr: "smile", seed: 81 });
{
  const X = SET.train;
  box(3.4, 3, 0.2, lit({ map: wood("#7a2a2a", 1, 2) }), X, 1.5, -1.4); const fl = add(new THREE.PlaneGeometry(4, 16), lit({ color: "#5a2a2a" }), X, 0, -4); fl.rotation.x = -Math.PI / 2;
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) for (const y of [0.55, 1.75]) {
    const z = -2 - i * 2.2;
    box(1.2, 0.12, 1.9, lit({ map: wood("#8a5a34") }), X + s * 1.2, y, z);
    box(1.0, 0.18, 1.7, lit({ color: "#f4efe4" }), X + s * 1.2, y + 0.15, z);
    if (i < 2 && y < 1) { const c = T(townsfolk(i + (s > 0 ? 2 : 0)), { expr: "neutral", blink: 1, seed: 90 + i + (s > 0 ? 5 : 0) }, 0.55); c.position.set(X + s * 1.2, y + 0.15, z + 0.2); sleepers.push(c); }
  }
  for (const s of [-1, 1]) box(0.12, 3, 12, lit({ map: wood("#6a2a2a", 3, 1) }), X + s * 1.9, 1.5, -6);
  lamp("train", X, 2.6, 0, 6, 10); lamp("train", X, 2.6, -5, 5, 9);
}
// floating "z z z"
const zzz = ctex(256, 256, (g, w, h) => { g.fillStyle = "#ffffff"; g.strokeStyle = "#1a1a2a"; g.lineWidth = 10; g.font = "900 90px Arial Black, Arial"; g.strokeText("z", 30, 220); g.fillText("z", 30, 220); g.font = "900 70px Arial Black, Arial"; g.strokeText("z", 120, 140); g.fillText("z", 120, 140); g.font = "900 54px Arial Black, Arial"; g.strokeText("z", 190, 70); g.fillText("z", 190, 70); });
const zz = add(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: zzz, transparent: true, depthWrite: false }), 0, 0, 0); zz.layers.set(NOINK); zz.castShadow = false;

// ======================= timeline =======================
const W = (x, y, z) => V(x, y, z);
const CAMS = {
  rise: [W(6.5, 1.2, -9.5), W(-0.5, 4.2, -22)], guest: [W(101.1, 1.75, 0.9), W(100.35, 1.55, -1.6)], problem: [W(-2.5, 3.2, 6), W(0, 1, -12)],
  swamp: [W(-0.2, 1.6, 2.6), W(-1.6, 0.6, -3)], mud: [W(2.8, 1.5, 2.5), W(1.4, 1.0, -1.2)], sign: [W(1.6, 1.4, 1.5), W(1.4, 1.35, -1.2)],
  sick: [W(-0.8, 1.6, 4.5), W(-0.4, 1.2, -1)], decision: [W(200.2, 2.3, 6.2), W(200, 1.8, -1.5)], pipes: [W(-5, 3.0, 4), W(-1.6, 0.4, -8)],
  raise: [W(2.5, 2.5, 6), W(-0.5, 0.5, -8)], stuck: [W(2.6, 3.6, -14.5), W(0.2, 1.0, -21.4)], lift: [W(300.6, 1.3, 3.6), W(300, 1.1, -1.5)],
  under: [W(296.4, 1.6, 2.4), W(300.6, 0.9, -1.8)], signal: [W(300.4, 1.3, 2.4), W(300, 1.2, -1)], rises: [W(3.2, 3.5, -12.5), W(0, 3.0, -21.5)],
  tea: [W(100.6, 1.65, 2.6), W(100.2, 1.35, -1.6)], jack: [W(400.9, 1.7, 6.2), W(400.4, 1.2, -1)], roll: [W(0.5, 3.6, 9), W(-1, 3.0, -6)],
  wave: [W(1.2, 4.0, 4.0), W(2.6, 3.8, -4.2)], pullman: [W(500, 1.6, 3.0), W(500, 1.2, -6)], sleep: [W(97.2, 1.75, 3.9), W(97.35, 1.05, -1.75)],
};
const cardsBySet = { street: [maxStreet, ...Object.values(streetFolk)], room: [maxTea, waiter, maxBed], hall: [council, ...councillors], under: [foreman, ...crew], train: [pullman, ...sleepers], jack: [] };
start((time, tl) => {
  const shot = tl.shot, k = tl.k, st = tl.since(shot), set = SHOT_SET[shot];
  for (const [s, ls] of Object.entries(lights)) for (const l of ls) l.visible = s === set;
  for (const [s, cs] of Object.entries(cardsBySet)) for (const c of cs) c.visible = s === set;
  const outdoor = set === "street" || set === "jack";
  setLight("day", { sunI: 3.0 });
  sun.intensity = outdoor ? 3.0 : 0; hemi.intensity = outdoor ? 0.55 : 0.3;
  scene.background = outdoor ? new THREE.Color("#a9cdf0") : new THREE.Color("#140e0a");
  scene.fog = set === "street" ? new THREE.Fog(untone("#cfdcea"), 30, 140) : null;

  // camera: every shot gets its own framing and a quick push (fast cuts)
  const [p0, l0] = CAMS[shot] || CAMS.rise;
  const p = p0.clone().lerp(l0, 0.1 * ease(k)), l = l0.clone();
  if (shot === "rise") { p.set(lerp(1.5, 0.8, ease(k)), lerp(2.2, 3.0, ease(k)), lerp(10, 6, ease(k))); }
  if (shot === "problem") p.x += -1.5 * (1 - ease(Math.min(1, st / 0.35)));          // whip in
  camera.position.copy(p); camera.lookAt(l);
  camera.rotateZ(shot === "signal" ? 0.04 * Math.sin(st * 30) * Math.max(0, 1 - st) : 0);

  // ---- street state ----
  const raised = ["stuck", "rises", "roll", "wave"].includes(shot) ? 1 : shot === "raise" ? ease(Math.min(1, k * 1.2)) : 0;
  ST.fill.position.y = -0.5 + 1.9 * raised;
  ST.pipes.forEach(pp => (pp.visible = shot === "pipes" || shot === "raise"));
  const lift = shot === "rise" ? lerp(0.1, 3.0, ease(Math.min(1, k * 1.15))) : shot === "rises" ? lerp(0, 1.9, ease(k)) : ["roll", "wave"].includes(shot) ? 1.9 : 0;
  ST.hotel.position.y = lift;
  ST.screws.forEach(sc => { sc.visible = lift > 0.05; sc.scale.y = Math.max(0.05, lift); sc.position.y = lift / 2; sc.rotation.y = time * 3; });
  ST.wagon.visible = shot === "swamp" || shot === "problem";
  ST.wagon.position.y = shot === "swamp" ? -0.55 * ease(k) : 0;
  ST.sign.visible = shot === "mud" || shot === "sign" || shot === "sick";
  ST.house.visible = shot === "roll" || shot === "wave";
  ST.house.position.set(shot === "wave" ? lerp(1.2, 3.6, ease(k)) : lerp(-5, 1.2, ease(k)), raised * 1.9, -6);
  ST.house.children.forEach(c => { if (c.geometry?.type === "CylinderGeometry") c.rotation.y = -time * 2; });

  // ---- people in the street ----
  const sf = streetFolk;
  sf.mudMan.visible = shot === "mud"; sf.mudMan.position.set(0.95, -0.6, -0.6); sf.mudMan.userData.draw({ expr: "stern", facing: 1, prop: ["hammer", Math.min(1, st * 1.5)] });
  sf.sick.visible = sf.sick2.visible = shot === "sick"; sf.sick.position.set(-1.2, 0, -1.5); sf.sick2.position.set(0.6, 0, -2.6);
  sf.sick.userData.draw({ expr: "pained", blink: Math.sin(st * 8) > 0.6 });
  sf.worker1.visible = sf.worker2.visible = shot === "pipes"; sf.worker1.position.set(-0.6, 0, -4); sf.worker2.position.set(-3.2, 0.3, -6);
  sf.worker1.userData.draw({ mode: "push", pose: 0.5 + 0.5 * Math.sin(st * 5), expr: "stern", side: true });
  sf.waver.visible = shot === "wave"; sf.waver.position.set(ST.house.position.x + 0.9, ST.house.position.y + 2.75, -4.0); sf.waver.userData.draw({ expr: "smile", wave: Math.abs(Math.sin(st * 8)) });
  maxStreet.visible = shot === "stuck"; maxStreet.position.set(0.6, 1.9, -19.4); maxStreet.userData.draw({ expr: st > 0.7 ? "m_worried" : "m_neutral" });

  // ---- room ----
  roomSky.offset.y = shot === "tea" ? 0.05 + 0.25 * ease(k) : shot === "sleep" ? 0.3 * ease(k) : 0.1;
  maxTea.visible = shot === "tea" || shot === "guest"; maxTea.position.set(SET.room + 0.35, 0, -1.6);
  maxTea.userData.draw({ prop: shot === "guest" ? "mug" : st % 2 < 1.1 ? "sip" : "mug", expr: "m_neutral", blink: Math.sin(st * 3) > 0.97 });
  waiter.visible = shot === "tea"; waiter.position.set(SET.room - 0.9, 0, -1.2);
  maxBed.visible = shot === "sleep"; maxBed.position.set(SET.room - 2.55, 0.9 + 1.35 * (468 - 300) / 600, -1.2); maxBed.rotation.set(0, 0, 0);
  bedSheet.visible = bedPillow.visible = shot !== "sleep";
  zz.visible = shot === "sleep" || shot === "pullman";
  if (shot === "sleep") zz.position.set(SET.room - 2.95, 1.95 + 0.1 * Math.sin(time * 2), -1.6);
  if (shot === "pullman") zz.position.set(SET.train - 0.7, 1.6 + 0.1 * Math.sin(time * 2), -1.4);
  zz.quaternion.copy(camera.quaternion);

  // ---- hall: the gavel comes down ----
  council.position.set(SET.hall, 0.55, -1.95); council.userData.draw({ expr: "stern", prop: ["hammer", st > 1.0 ? 1 : 0.1 * Math.sin(st * 6)] });
  councillors.forEach((c, i) => { c.position.set(SET.hall + [-0.95, 1.0, 0.1][i], 0, [0.9, 0.7, 1.6][i]); c.userData.draw({ expr: st > 1.0 ? "shock" : "nervous" }); });

  // ---- under: the screws turn in step, the floor creeps up ----
  const rising = shot === "signal" ? Math.max(0, st - 1.0) * 0.12 : shot === "under" ? 0 : 0;
  UN.beam.position.y = 2.3 + rising;
  UN.screws.forEach(g => (g.rotation.y = shot === "signal" && st > 1 ? (st - 1) * 3 : 0));
  foreman.position.set(SET.under + 0.35, 0, -0.4); foreman.userData.draw({ expr: shot === "signal" && st < 1.2 ? "whistle" : "stern" });
  crew.forEach((c, i) => c.userData.draw({ expr: shot === "lift" ? "neutral" : "stern", mode: "push", pose: shot === "signal" && st > 1 ? 0.5 + 0.5 * Math.sin((st - 1) * 6 + i * 0.1) : 0.3, side: true }));

  // ---- jack ----
  const jl = shot === "jack" ? ease(Math.min(1, st / 1.0)) : 0;
  carBody.rotation.z = 0.06 * jl; carBody.position.y = 0.18 * jl;
  ST.times.visible = shot === "jack" && st > 1.0; ST.times.scale.setScalar(ST.times.visible ? Math.min(1, (st - 1) / 0.15) * 1 + 0.15 * Math.max(0, 1 - (st - 1) / 0.3) : 1);
  ST.times.quaternion.copy(camera.quaternion);

  // ---- train ----
  pullman.position.set(SET.train, 0, -0.8);
  sleepers.forEach((c, i) => c.userData.draw({ blink: 1, expr: "neutral", seed: 90 + i }));

  for (const cs of Object.values(cardsBySet)) cs.forEach(c => c !== maxBed && faceCamera(c));
  faceCamera(sf.waver);
  if (look.bokeh) look.bokeh.uniforms.focus.value = ["rise", "rises", "problem", "raise", "roll", "pipes"].includes(shot) ? 30 : camera.position.distanceTo(l);
  if (outdoor) aimSun(-40, 42, set === "street" ? V(0, 0, -12) : V(SET.jack, 0, 0), 60);
});
