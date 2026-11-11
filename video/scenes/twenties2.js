// twenties2: the 1920s short restyled toward a warm, golden-hour storybook look (a long street in perspective,
// glowing shop fronts, haze, soft toy-like shading). The original is twenties.js.
// "What if you traveled back to the 1920s": cartoon (folk) style. Three sets: a 1920s street with a crowd
// and a Model T, a general store with a brass till, and a room lit by an oil lamp.
import { THREE, scene, camera, sun, hemi, setWaterTable, GROUND_BOTTOM, box, solid, canvasTex, cloud, V, ease, start, fxOptions } from "./kit.js";
import { folk, outline, canvasPlane, HEAD, walkPose, softShading } from "./folk.js";
softShading();

fxOptions.ao = false;
setWaterTable(GROUND_BOTTOM - 1, 0);
// golden hour: a peach-to-gold sky, low warm sun down the street, warm haze
const sky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#e9b48a"); gr.addColorStop(0.45, "#f6d3a2"); gr.addColorStop(0.8, "#fbe3b8"); gr.addColorStop(1, "#f7d5a6"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
scene.background = sky;
scene.fog = new THREE.Fog(0xf3cfa0, 24, 120);
sun.color.set(0xffb878); sun.intensity = 2.1; sun.position.set(-9, 11, -16);
hemi.intensity = 1.5; hemi.color.set(0xffe2c0); hemi.groundColor.set(0x8a6448);
const fill = new THREE.DirectionalLight(0xffd6a8, 0.9); fill.position.set(3, 4, 12); scene.add(fill);
const toon = (c, e = 0) => new THREE.MeshToonMaterial({ color: c, emissive: e });
const add = (m, x, y, z) => { m.position.set(x, y, z); scene.add(m); return m; };
const inked = []; const ink = m => { inked.push(m); return m; };
const SET = { street: 0, shop: 100, house: 200 };
const SHOT_SET = { start: "street", hook: "street", phone: "street", money: "shop", power: "house", sick: "street", fit: "street", cta: "street" };

let car;
const wheels = [];
// ---------- 1920s street, running away from the camera (one-point perspective) ----------
const ROAD = 2.7, WALK = 4.1, FAR = -90;
{
  const cobble = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#8f7e70"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 22) for (let x = (y / 22) % 2 * 16; x < w; x += 32) { g.fillStyle = ["#b09a86", "#a38e7b", "#bba590", "#9c8775"][(x * 7 + y) % 4]; g.beginPath(); g.roundRect(x + 2, y + 2, 28, 18, 8); g.fill(); g.fillStyle = "rgba(255,240,220,0.25)"; g.fillRect(x + 6, y + 4, 16, 3); }
  }, 4, 50);
  const road = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * ROAD, 110), new THREE.MeshToonMaterial({ map: cobble })), 0, 0, -40); road.rotation.x = -Math.PI / 2;
  for (const side of [-1, 1]) {
    box(side < 0 ? -WALK : ROAD, side < 0 ? -ROAD : WALK, 0, 0.16, FAR, 14, solid(0xcdb9a0));          // sidewalk
    box(side < 0 ? -ROAD - 0.1 : ROAD - 0.02, side < 0 ? -ROAD + 0.02 : ROAD + 0.1, 0, 0.19, FAR, 14, solid(0x9c8a78));  // curb
  }
  const brick = (c1, c2) => canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#d8c4a8"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 * 16; x < w + 32; x += 32) { g.fillStyle = (x + y) % 3 ? c1 : c2; g.fillRect(x - 15, y + 1, 30, 13); }
  }, 2, 3);
  const SIGNS = [
    [["THE SODA FOUNTAIN", "#2f4a3a"], ["BAKERY", "#5a2a24"], ["HATS & COATS", "#2c3550"], ["BARBER", "#2f4a3a"], ["SHOES", "#5a2a24"], ["BOOKS", "#2c3550"], ["TOYS", "#5a2a24"], ["CAFE", "#2f4a3a"]],
    [["GROCER", "#2f4a3a"], ["GENERAL STORE", "#5a2a24"], ["TAILOR", "#2c3550"], ["PHARMACY", "#2f4a3a"], ["DINER", "#5a2a24"], ["HARDWARE", "#2c3550"], ["BANK", "#2f4a3a"], ["POST OFFICE", "#5a2a24"]],
  ];
  const BRICKS = [["#b5603f", "#a3543a"], ["#9a5a44", "#8a4e3a"], ["#c9a27e", "#b8916f"], ["#a86a4a", "#94593c"], ["#d6c2a2", "#c4ae8c"]];
  const AWN = ["#c44a3a", "#3a6a8a", "#3a7a4a", "#c9a24a", "#7a3a5a"];
  const glass = toon(0x5a3a22, 0xd88a3a), dark = toon(0x2a1f18), trim = toon(0xf1e6d2), gold = toon(0xd9b45a, 0x3a2a08);
  for (const side of [-1, 1]) {
    let z = 10;
    SIGNS[side < 0 ? 0 : 1].forEach(([name, board], i) => {
      const w = 5.0 + (i % 3) * 0.8, h = 9.5 + ((i * 5 + (side > 0 ? 2 : 0)) % 4) * 1.4, depth = 5;
      const zc = z - w / 2, xf = side * WALK, xc = side * (WALK + depth / 2);
      const [c1, c2] = BRICKS[(i + (side > 0 ? 2 : 0)) % BRICKS.length];
      ink(add(new THREE.Mesh(new THREE.BoxGeometry(depth, h, w - 0.08), new THREE.MeshToonMaterial({ map: brick(c1, c2) })), xc, h / 2, zc));
      const face = (dx, y, dz, sx, sy, sz, m) => ink(add(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m), xf - side * dx, y, zc + dz));
      // storefront: warm glowing window, door, sign board with gold letters, striped awning
      face(-0.04, 1.35, -0.6, 0.12, 1.9, w * 0.55, glass);
      face(-0.08, 1.35, -0.6, 0.06, 2.1, w * 0.55 + 0.2, trim).scale.set(1, 1, 1);
      face(-0.05, 1.15, w * 0.33, 0.12, 2.3, 0.9, dark);
      const sign = canvasPlane(w * 0.86, 0.62, (g, W, H) => { g.fillStyle = board; g.fillRect(0, 0, W, H); g.strokeStyle = "#d9b45a"; g.lineWidth = 8; g.strokeRect(6, 6, W - 12, H - 12); g.fillStyle = "#f0cf7a"; g.font = `bold ${Math.min(60, 900 / name.length)}px Georgia, serif`; g.textAlign = "center"; g.fillText(name, W / 2, H * 0.68); });
      sign.position.set(xf - side * 0.09, 2.95, zc); sign.rotation.y = -side * Math.PI / 2; scene.add(sign);
      const awn = add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, w * 0.8), new THREE.MeshToonMaterial({ map: canvasTex(32, 128, (g, W, H) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#f4ead8" : AWN[(i + (side > 0 ? 3 : 0)) % AWN.length]; g.fillRect(0, k * 16, W, 16); } }) })), xf - side * 0.6, 2.45, zc);
      awn.rotation.z = side * 0.35; ink(awn);
      // upper windows with white frames, some lit
      for (let fy = 4.2; fy < h - 1; fy += 1.9) for (let k = -1; k <= 1; k++) {
        face(-0.04, fy, k * w * 0.28, 0.1, 1.2, 0.8, trim);
        face(-0.07, fy, k * w * 0.28, 0.06, 1.0, 0.62, ((i + k + Math.round(fy)) % 3) ? toon(0x3a4a5a, 0x101820) : toon(0x8a6a3a, 0xc88a3a));
      }
      face(-0.15, h - 0.15, 0, 0.35, 0.3, w - 0.1, trim);                                      // cornice
      if (i % 2) ink(add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.6), toon(0x8a4e3a)), xc + side * 0.8, h + 0.5, zc + 0.8));
      z -= w;
    });
    // a hazy row of rooftops far down the street
    for (let k = 0; k < 6; k++) { const h = 9 + (k % 3) * 2; add(new THREE.Mesh(new THREE.BoxGeometry(5, h, 6), toon(0xc9a284)), side * 8, h / 2, z - 3 - k * 6); }
    // lamp posts and trees along the kerb
    for (let lz = 6; lz > FAR + 10; lz -= 9) {
      const x = side * (ROAD + 0.45);
      ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 3.4, 10), dark), x, 1.7, lz));
      ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.2, 10), dark), x, 0.25, lz));
      ink(add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.34), toon(0xffe2a0, 0xffb84a)), x, 3.6, lz));
      ink(add(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.28, 4), dark), x, 4.0, lz)).rotation.y = Math.PI / 4;
    }
    for (const tz of [-12, -30, -48]) {
      const x = side * (ROAD + 1.0);
      ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.6, 8), toon(0x6b4a2b)), x, 1.4, tz));
      ink(add(new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), toon(0x6f9a4a, 0x142008)), x, 3.4, tz)).scale.set(1, 1.15, 1);
    }
  }
  // a domed tower in the haze at the end of the street, and the low sun behind it
  add(new THREE.Mesh(new THREE.BoxGeometry(4, 14, 4), toon(0xd8b48e)), 0.5, 7, FAR - 8);
  add(new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xd8b48e)), 0.5, 14, FAR - 8);
  add(new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, 0.8), fog: false })), -6, 16, -140);
  // a Model T (bodywork, running boards, spoked wheels), driving away up the street
  car = new THREE.Group();
  const black = toon(0x23262a);
  car.add(ink(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 1.2), black)));
  const hood = ink(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), black)); hood.position.set(1.4, 0.0, 0); car.add(hood);
  const cab = ink(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 1.2), toon(0x2c3036))); cab.position.set(-0.4, 0.72, 0); car.add(cab);
  for (const pz of [0.61, -0.61]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5), toon(0x8aa0b0, 0x202830)); win.position.set(-0.35, 0.85, pz); win.rotation.y = pz > 0 ? 0 : Math.PI; car.add(win); }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.7), toon(0xb8a888, 0x2a2010)); grille.position.set(1.86, 0.02, 0); car.add(grille);
  for (const [px, pz] of [[1.2, 0.68], [1.2, -0.68], [-0.9, 0.68], [-0.9, -0.68]]) {
    const wheel = new THREE.Group();
    wheel.add(ink(new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 8, 24), toon(0x151515))));
    for (let k = 0; k < 8; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.72, 0.03), toon(0xd9c9a3)); sp.rotation.z = k * Math.PI / 8; wheel.add(sp); }
    wheel.position.set(px, -0.3, pz); car.add(wheel); wheels.push(wheel);
  }
  for (const pz of [0.42, -0.42]) { const lamp = ink(new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), toon(0xfff2c8, 0xd8b060))); lamp.position.set(1.95, 0.2, pz); car.add(lamp); }
  car.rotation.y = Math.PI / 2;
  scene.add(car);
}
// the crowd: suits, vests, hats and moustaches
const crowdSpec = [
  { x: -1.45, z: -2.0, o: { body: 0x5a4636, outfit: "suit", tie: 0x8b1e1e, hat: "bowler", hatColor: 0x222222, hairStyle: "none", shoes: 0x2c2c2c }, mus: "#3b2a20" },
  { x: -1.9, z: -5.2, o: { body: 0x7d6a4e, vest: true, hat: "porkpie", hatColor: 0x5b4632, hairStyle: "none", shoes: 0x3a2a20 }, mus: null },
  { x: 1.55, z: -2.6, o: { body: 0x3e4a5a, outfit: "suit", tie: 0xd9b45a, hat: "bowler", hatColor: 0x2a2a2a, hairStyle: "none", shoes: 0x1e1e1e }, mus: "#1e1612" },
  { x: 2.0, z: -6.0, o: { body: 0xb5677a, hairStyle: "bun", hair: 0x3b2a20, bowtie: 0xf2e6c4, shoes: 0x5a2a2a }, mus: null },
];
const crowd = crowdSpec.map(c => { const f = folk({ face: "surprised", ...c.o }); f.position.set(c.x, 0.16, c.z); f.rotation.y = Math.atan2(-c.x * 0.6, 3); f.userData.mus = c.mus; scene.add(f); return f; });
const walkers = [
  { o: { body: 0x4a5a3a, outfit: "suit", tie: 0x2a2a6a, hat: "porkpie", hatColor: 0x3a3226, hairStyle: "none", shoes: 0x2a2a2a }, z: -3.4, v: 1.0, x0: -9 },
  { o: { body: 0x8a3a4a, hairStyle: "bun", hair: 0x5a3a20, shoes: 0x3a1a1a }, z: 3.4, v: -0.85, x0: 6 },
  { o: { body: 0x5a5a6a, vest: true, hat: "bowler", hatColor: 0x222222, hairStyle: "none", shoes: 0x1e1e1e, cane: true }, z: -3.6, v: 0.7, x0: 2 },
].map(w => { const f = folk({ face: "neutral", ...w.o }); f.userData.w = w; f.rotation.y = w.v > 0 ? Math.PI : 0; scene.add(f); return f; });
const setCrowd = (face, lean = 0) => crowd.forEach(f => { f.setFace(face, f.userData.mus ? { mustache: f.userData.mus } : {}); f.pose({ lean, headTilt: 0.05 }); });

// Max (modern clothes) and Max fitting in (bowler, vest, cane)
const maxNow = folk({ body: 0x1f8a9a, outfit: "polo", buttons: true, gloves: true, logo: false, hairStyle: "swoop", hair: 0x9a5a22, shoes: 0x2a2422, face: "surprised" });
maxNow.position.set(0, 0.0, 0.4); scene.add(maxNow);
const maxFit = folk({ body: 0xe0a92c, vest: true, gloves: true, hat: "bowler", hatColor: 0x222222, hairStyle: "none", shoes: 0x3a2a20, face: "crazy", cane: true });
maxFit.position.set(0, 0.0, 0.4); scene.add(maxFit);
// his phone: "No Service"
const phone = new THREE.Group();
phone.add(ink(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.03), toon(0x1c1c1e))));
const screen = canvasPlane(0.18, 0.37, (g, w, h) => {
  g.fillStyle = "#e9edf2"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#d62f2f"; g.font = "bold 64px Arial"; g.textAlign = "center"; g.fillText("No", w / 2, h * 0.42); g.fillText("Service", w / 2, h * 0.52);
  g.strokeStyle = "#999"; g.lineWidth = 10; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(w / 2 - 60 + i * 40, h * 0.3); g.lineTo(w / 2 - 60 + i * 40, h * 0.3 - 20 - i * 20); g.stroke(); }
  g.strokeStyle = "#d62f2f"; g.lineWidth = 12; g.beginPath(); g.moveTo(w / 2 - 80, h * 0.12); g.lineTo(w / 2 + 80, h * 0.32); g.stroke();
});
screen.position.z = 0.017; phone.add(screen);
phone.scale.setScalar(1.3); phone.position.set(0.32, 1.42, 1.0); phone.rotation.set(-0.1, -0.25, 0.08); scene.add(phone);
// a time-travel swirl
const swirl = canvasPlane(4, 4, (g, w, h) => {
  const c = w / 2;
  for (let i = 0; i < 360; i++) { const a = i * 0.12, r = i * 0.7; g.fillStyle = `hsla(${200 + i % 120}, 90%, ${55 + (i % 3) * 10}%, ${1 - i / 400})`; g.beginPath(); g.arc(c + r * Math.cos(a), c + r * Math.sin(a), 10 - i / 50, 0, 7); g.fill(); }
});
swirl.position.set(0, 1.3, -0.6); scene.add(swirl);
// sneeze spray
const spray = [];
for (let i = 0; i < 40; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), toon(0xbfe8a0, 0x334422)); d.userData = { v: V((Math.random() - 0.5) * 1.6, Math.random() * 0.8, 1 + Math.random() * 1.5), ph: Math.random() }; scene.add(d); spray.push(d); }

// ---------- general store ----------
{
  const X = SET.shop;
  const panel = canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#8a5a36" : "#7d5131"; g.fillRect(i * 32, 0, 32, h); g.fillStyle = "rgba(40,20,10,0.4)"; g.fillRect(i * 32, 0, 3, h); } }, 4, 1);
  add(new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshToonMaterial({ map: panel })), X, 3, -2.4);
  const fl = add(new THREE.Mesh(new THREE.PlaneGeometry(10, 8), toon(0x6b4a2f)), X, 0, 1); fl.rotation.x = -Math.PI / 2;
  for (const y of [1.6, 2.4, 3.2]) { box(X - 3.5, X + 3.5, y, y + 0.06, -2.4, -2.0, solid(0x5b3a22)); for (let k = 0; k < 12; k++) ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.38, 12), toon([0xd9534f, 0xf0ad4e, 0x5bc0de, 0x5cb85c, 0xe8e2d0][(k + y * 10) % 5 | 0])), X - 3.2 + k * 0.58, y + 0.25, -2.2)); }
  ink(box(X - 3, X + 3, 0, 1.0, -0.8, 0.2, solid(0x8a5a36)));
  const till = new THREE.Group();
  till.add(ink(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), toon(0xd9a63a, 0x3a2a00))));
  const disp = ink(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.1), toon(0xd9a63a, 0x3a2a00))); disp.position.set(0, 0.36, -0.1); till.add(disp);
  for (let k = 0; k < 8; k++) { const key = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), toon(0xf2f2f2)); key.position.set(-0.27 + (k % 4) * 0.18, 0.27, 0.05 + Math.floor(k / 4) * 0.12); till.add(key); }
  till.position.set(X - 1.5, 1.25, -0.4); scene.add(till);
}
const keeper = folk({ body: 0x6b5a46, vest: true, hairStyle: "bowl", hair: 0x777777, shoes: 0x2c2c2c, face: "grumpy" }).pose({ armR: [0.5, 1.4, 0.7], armL: [0.3, 0.2, 0.3], lean: 0.08 });
keeper.position.set(SET.shop + 0.8, 0.05, -1.4); keeper.rotation.y = -0.35; scene.add(keeper);
keeper.setFace("grumpy", { mustache: "#5a5a5a" });
const note = canvasPlane(0.42, 0.2, (g, w, h) => {      // a made-up colourful modern banknote
  const grad = g.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, "#c9e3b0"); grad.addColorStop(0.5, "#f2d9b8"); grad.addColorStop(1, "#b9d9c9");
  g.fillStyle = grad; g.fillRect(0, 0, w, h); g.strokeStyle = "#2f5a3a"; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = "#2f5a3a"; g.font = "bold 120px Arial"; g.fillText("20", 26, h * 0.72); g.textAlign = "right"; g.fillText("20", w - 26, h * 0.72);
  g.strokeStyle = "rgba(47,90,58,0.5)"; g.lineWidth = 6; for (let r = 30; r < 110; r += 18) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, 7); g.stroke(); }
});
const maxShop = folk({ body: 0x1f8a9a, outfit: "polo", buttons: true, gloves: true, logo: false, hairStyle: "swoop", hair: 0x9a5a22, shoes: 0x2a2422, face: "scared" }).pose({ armL: [0.35, 1.15, 0.5], armR: [0.3, 0.2, 0.3] });
note.scale.setScalar(1.6); note.position.set(99.55, 1.45, 1.05); note.rotation.set(0, -0.2, 0.12); scene.add(note);
maxShop.position.set(SET.shop - 0.9, 0.0, 1.0); maxShop.rotation.y = 0.5; scene.add(maxShop);
maxShop.setFace("scared", { sweat: true });

// ---------- a room lit by an oil lamp ----------
let lampLight, flame;
{
  const X = SET.house;
  const paper = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#7d6a4e"; g.fillRect(0, 0, w, h); g.fillStyle = "#8f7a5a"; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 12, h); }, 5, 3);
  add(new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshToonMaterial({ map: paper })), X, 3, -2.4);
  const fl = add(new THREE.Mesh(new THREE.PlaneGeometry(10, 8), toon(0x4e3420)), X, 0, 1); fl.rotation.x = -Math.PI / 2;
  ink(box(X + 0.6, X + 2.2, 0.85, 0.95, -1.6, -0.6, solid(0x6b4128)));
  for (const [dx, dz] of [[0.7, -1.5], [2.1, -1.5], [0.7, -0.7], [2.1, -0.7]]) box(X + dx - 0.05, X + dx + 0.05, 0, 0.85, dz - 0.05, dz + 0.05, solid(0x5b3a22));
  ink(add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 16), toon(0xc9a14a, 0x2a2000)), X + 1.4, 1.04, -1.1));
  add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })), X + 1.4, 1.32, -1.1).scale.y = 1.6;
  flame = add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.6, 0.5) })), X + 1.4, 1.3, -1.1);
  lampLight = new THREE.PointLight(0xffb866, 9, 7, 1.5); lampLight.position.set(X + 1.4, 1.5, -0.9); scene.add(lampLight);
  // a wall with a blank spot where the socket should be
  const noPlug = canvasPlane(0.5, 0.5, (g, w, h) => { g.strokeStyle = "#d62f2f"; g.lineWidth = 26; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 20, 0, 7); g.stroke(); g.beginPath(); g.moveTo(w * 0.2, h * 0.2); g.lineTo(w * 0.8, h * 0.8); g.stroke(); g.fillStyle = "#f2f2f2"; g.fillRect(w * 0.38, h * 0.36, w * 0.24, h * 0.28); });
  add(noPlug, X - 1.6, 0.7, -2.38);
}
const maxHome = folk({ body: 0x1f8a9a, outfit: "polo", buttons: true, gloves: true, logo: false, hairStyle: "swoop", hair: 0x9a5a22, shoes: 0x2a2422, face: "scared" }).pose({ armL: [0.3, 0.95, 1.4], armR: [0.3, 0.2, 0.3], headTurn: 0.3, headTilt: 0.1 });
const charger = new THREE.Group();
charger.add(ink(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.08), toon(0xf2f2f2))));
for (const dx of [-0.03, 0.03]) { const pin = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.015), toon(0xc9c9c9)); pin.position.set(dx, 0.09, 0); charger.add(pin); }
const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, -0.07, 0), V(0.05, -0.3, 0.05), V(-0.1, -0.5, 0.1), V(0.0, -0.75, 0.0)]), 20, 0.012, 6), toon(0xf2f2f2));
charger.add(cable);
charger.scale.setScalar(1.6); charger.position.set(200.45, 1.35, 0.85); charger.rotation.set(0, -0.3, 0.15); scene.add(charger);
maxHome.position.set(SET.house + 0.0, 0, 0.3); maxHome.rotation.y = 0.25; scene.add(maxHome);

inked.forEach(outline);
// [prop, holder, offset from the hand to the prop's centre]
const held = [
  [phone, maxNow, V(0.0, 0.2, -0.03)],
  [note, maxShop, V(0.3, 0.02, -0.03)],
  [charger, maxHome, V(0.0, 0.09, -0.02)],
];

// ---------- timeline ----------
const cams = {
  hook:  [V(0, 1.6, 5.0),    V(0, 2.3, -14)],
  phone: [V(0.15, 1.65, 3.4), V(0.25, 1.6, -8)],
  money: [V(99.7, 1.9, 5.0),  V(99.8, 1.3, -0.4)],
  power: [V(200.5, 1.6, 4.2),  V(200.5, 1.15, -0.8)],
  sick:  [V(0.6, 1.7, 5.2),   V(0, 1.6, -12)],
  fit:   [V(0, 1.65, 4.2),    V(0, 2.2, -12)],
  cta:   [V(0, 2.2, 8.5),     V(0, 1.9, -14)],
};
start((time, tl) => {
  const set = SHOT_SET[tl.shot] || "street";
  const [p, l] = cams[tl.shot] || cams.hook;
  camera.position.copy(p).lerp(l, 0.05 * ease(tl.k));
  camera.lookAt(l);
  const indoor = set === "house";
  scene.background = indoor ? new THREE.Color(0x1e140c) : sky;
  sun.intensity = indoor ? 0.2 : 2.1; hemi.intensity = indoor ? 0.35 : 1.5; fill.intensity = indoor ? 0 : 0.9;
  HEAD.emissive.setHex(indoor ? 0x3a3a3a : 0x4a4038);
  flame.scale.set(1 + 0.1 * Math.sin(time * 19), 1 + 0.2 * Math.sin(time * 13), 1);
  lampLight.intensity = 9 * (1 + 0.08 * Math.sin(time * 17));

  // which Max is in the street, and what everyone is doing
  const shot = tl.shot, k = tl.k, st0 = tl.since(tl.shot);
  const fitting = shot === "fit" || shot === "cta";
  maxNow.visible = !fitting; maxFit.visible = fitting;
  phone.visible = shot === "phone";
  const hook = shot === "hook";
  swirl.visible = hook && k < 0.45;
  swirl.rotation.z = -time * 4; swirl.scale.setScalar((1 + 0.15 * Math.sin(time * 8)) * (k < 0.3 ? 1 : Math.max(0, 1 - (k - 0.3) / 0.15)));
  const bob = (ph = 0, a = 0.015) => a * Math.abs(Math.sin(time * 4 + ph));      // little idle bounce

  // street traffic: a Model T and people strolling past in the background
  car.position.set(1.4, 0.7 + 0.02 * Math.sin(time * 30), -9 - ((time * 2.2) % 55));
  for (const w of wheels) w.rotation.z = -time * 7;
  for (const f of walkers) {
    const w = f.userData.w; const zz = -((((w.x0 + time * w.v) % 40) + 40) % 40) + 4;
    f.position.set(w.z, 0.16 + bob(w.z, 0.03), zz); f.pose(walkPose(time + w.z, 0.9));
  }
  // the crowd: always a little alive (bobbing, glancing), then reacting
  crowd.forEach((f, i) => {
    const base = f.userData.base || (f.userData.base = f.position.clone());
    const ph = i * 1.7, look = 0.25 * Math.sin(time * 0.9 + ph);
    let pose = { headTurn: look, headTilt: 0.05 + 0.04 * Math.sin(time * 1.3 + ph), sway: 0.03 * Math.sin(time * 1.1 + ph), armL: [0.25, 0, 0.2 + 0.1 * Math.sin(time + ph)], armR: [0.25, 0, 0.2] };
    let pos = base.clone();
    if (hook) pose = { ...pose, lean: 0.1, headTurn: 0, armR: i % 2 ? [0.3, 1.4 + 0.1 * Math.sin(time * 6), 0.1] : pose.armR };          // pointing at the stranger
    if (shot === "phone") pose = { ...pose, headTurn: 0, headTilt: 0.15 + 0.08 * Math.sin(time * 5 + ph) };                          // curious about the glowing slab
    if (shot === "sick") {                                                                                                           // everyone backs off
      const back = Math.max(0, k - 0.3) * 2.2;
      pos.z -= back; pos.x += Math.sign(base.x) * back * 0.5;
      pose = { ...pose, ...(back > 0 && back < 1.5 ? walkPose(time + ph, 1.4) : {}), lean: -0.2, headTurn: 0, armL: [1.2, 0.8, 1.2], armR: [1.2, 0.8, 1.2] };
    }
    if (fitting) { const c = Math.sin(time * 14 + ph); pose = { ...pose, headTurn: 0, armL: [0.2, 1.2, 0.6 + 0.3 * c], armR: [0.2, 1.2, 0.6 + 0.3 * c] }; }   // clapping
    if (shot === "cta") pose = { ...pose, armR: [2.5, 0, 0.5 + 0.4 * Math.sin(time * 9 + ph)] };                                       // waving
    f.position.copy(pos); f.position.y += bob(ph);
    f.pose(pose);
  });
  if (hook) setCrowd("surprised"); else if (shot === "sick") setCrowd("scared"); else if (fitting) setCrowd("grin"); else if (shot === "phone") setCrowd("surprised");

  // Max
  maxNow.position.set(0, bob(0, 0.02), 0.4); maxNow.rotation.set(0, 0, 0); maxNow.scale.setScalar(1);
  if (hook) {
    // spins out of the portal, lands, then looks around at where (when) he is
    const a = Math.min(1, k / 0.3);
    maxNow.scale.setScalar(ease(a)); maxNow.rotation.y = (1 - ease(a)) * 9;
    maxNow.position.y = 0.6 * (1 - a) * (1 - a);
    maxNow.setFace(a < 1 ? "crazy" : "surprised");
    const lookAround = a < 1 ? 0 : 0.6 * Math.sin((k - 0.3) * 14);
    maxNow.pose({ armL: [0.9 + 0.2 * Math.sin(time * 6), 0.3, 0.4], armR: [0.9 + 0.2 * Math.sin(time * 6 + 1), 0.3, 0.4], headTurn: lookAround, headTilt: 0.1 });
  }
  if (shot === "phone") {
    // checks the phone, then waves it about over his head hunting for signal
    maxNow.setFace(k < 0.45 ? "grumpy" : "surprised");
    const up = ease(Math.min(1, Math.max(0, (k - 0.4) / 0.15)));
    const shake = 0.12 * Math.sin(time * 16) * (1 - up) + 0.25 * Math.sin(time * 7) * up;
    maxNow.pose({ armL: [0.25 + 0.5 * up + shake, 0.9 + 1.4 * up, 1.5 - 1.2 * up], armR: [0.3 + 0.15 * up, 0.2, 0.3],
      headTilt: 0.1 - 0.45 * up, headTurn: 0.25 * (1 - up) + 0.15 * Math.sin(time * 3) * up, sway: 0.06 * Math.sin(time * 7) * up });
    phone.rotation.set(-0.1, -0.25, 0.08 + 0.3 * Math.sin(time * 7) * up);
  }
  if (shot === "money") {
    // Max keeps offering the note, the shopkeeper shakes his head and wags a finger
    const push = 0.15 * Math.max(0, Math.sin(time * 5));
    maxShop.pose({ armL: [0.35, 1.0 + push, 0.5 - push], armR: [0.3, 0.2, 0.3], lean: 0.05 + push * 0.4, headTilt: 0.05 });
    maxShop.position.y = bob(1, 0.02);
    keeper.pose({ armR: [0.5, 1.4, 0.7 + 0.35 * Math.sin(time * 12)], armL: [0.3, 0.2, 0.3], lean: -0.05, headTurn: 0.35 * Math.sin(time * 7), headTilt: 0.05 });
  }
  if (shot === "power") {
    // hunts round the room for a socket, waving the charger
    const look = Math.sin(st0 * 2.2);
    maxHome.pose({ armL: [0.3 + 0.1 * Math.sin(time * 5), 0.95, 1.4], armR: [0.3 + 0.25 * Math.max(0, -look), 0.6 * Math.max(0, -look), 0.6], headTurn: 0.6 * look, headTilt: 0.15, sway: 0.04 * look });
    maxHome.rotation.y = 0.25 + 0.25 * look; maxHome.position.y = bob(2, 0.015);
  }
  const sick = shot === "sick";
  if (sick) {
    // "ah... ah... ACHOO!"
    const pre = k < 0.25, wind = pre ? Math.min(1, k / 0.25) : 0;
    maxNow.setFace(pre ? "neutral" : "sneeze");
    const kick = pre ? 0 : Math.exp(-(k - 0.25) * 10);
    maxNow.pose({ lean: pre ? -0.25 * wind - 0.04 * Math.sin(time * 18) * wind : 0.2 + 0.25 * kick, headTilt: pre ? -0.3 * wind : 0.25 * kick, armL: [0.3, 0.6, 1.4], armR: [0.3, 0.6, 1.4] });
    maxNow.position.z = 0.4 + 0.1 * kick;
  }
  const st = sick ? (k - 0.25) * 3 : -1;
  for (const d of spray) { const u = Math.max(0, st - d.userData.ph * 0.3); d.visible = sick && u > 0 && u < 1.2; d.position.set(maxNow.position.x + d.userData.v.x * u, 1.45 + d.userData.v.y * u - 1.5 * u * u, maxNow.position.z + 0.3 + d.userData.v.z * u); }
  if (fitting) {
    // struts in, tips his hat, bounces with the cane
    const walkIn = shot === "fit" ? Math.min(1, k / 0.25) : 1;
    const walking = walkIn < 1;
    maxFit.position.set(-0.8 * (1 - ease(walkIn)), walking ? bob(0, 0.04) : Math.abs(Math.sin(time * 5)) * 0.05, 0.4);
    maxFit.rotation.y = walking ? 0.6 : 0.1 * Math.sin(time * 2.5);
    const tip = !walking && Math.sin(st0 * 2.5) > 0.3;
    maxFit.pose({ ...(walking ? walkPose(time, 1.2) : {}), armL: tip ? [0.9, 0.2, 2.5] : [0.9, -0.2, 2.2], armR: [0.25 + 0.1 * Math.sin(time * 5), 0.25, 0.25],
      headTilt: tip ? -0.1 : 0.05, headRoll: tip ? 0.15 : 0.08 * Math.sin(time * 5), sway: 0.05 * Math.sin(time * 5) });
    if (shot === "cta") maxFit.pose({ armL: [2.5, 0, 0.5 + 0.4 * Math.sin(time * 9)], armR: [0.25, 0.25, 0.25], headRoll: 0.08 * Math.sin(time * 5) });
  }
  // props live in world space (so they always face the camera) but follow the hand
  for (const [prop, who, off] of held) {
    who.updateMatrixWorld(true);
    const hand = who.userData.parts.armL.elbow.localToWorld(V(0, -0.25, 0));
    prop.position.copy(hand).add(off);
  }
});
