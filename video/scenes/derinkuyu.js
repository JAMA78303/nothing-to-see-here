// "He knocked down a wall... and found a city" (Derinkuyu, 1963), in the 2D-characters-in-a-3D-world style.
// Sets (spread along x): HOUSE basement 0, VILLAGE 100, TUNNEL 200, STAIRS 300, ROOMS 400, CITY cutaway 500, DOOR 600, MAP 700.
import { THREE, scene, camera, sun, hemi, V, ease, lerp, start } from "./kit.js";
import { setupStyle, setLight, aimSun, ctex, lam, lit, add, box, makeMax, makeCard, faceCamera, look, untone, townsfolk, CREAM, NOINK } from "./style2kit.js";
import { stoneHD, cobbleHD, facadeHD, roofHD } from "./vendor/paint.js";
import { Pen } from "./vendor/toon.js";

setupStyle({ ink: { widthNear: 4.2, widthFar: 2.8 }, blur: { aperture: 0.0028, maxblur: 0.007 } });
const SET = { house: 0, village: 100, tunnel: 200, stairs: 300, rooms: 400, city: 500, door: 600, map: 700 };
const SHOT_SET = { hook: "house", setting: "village", tunnel: "tunnel", stairs: "stairs", rooms: "rooms", snap: "city", deadpan: "house", doors: "door", map: "map", loop: "house" };
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

// soft rock: warm tan with darker blotches and chisel marks
const rockTex = (base, rx = 1, ry = 1) => ctex(256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "90,60,40" : "255,240,210"},${0.05 + rnd() * 0.07})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 22, 4 + rnd() * 12, rnd() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(80,55,35,0.25)"; g.lineWidth = 2; for (let i = 0; i < 40; i++) { const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8 + rnd() * 10, y + 2 - rnd() * 4); g.stroke(); }
}, rx, ry);
const ROCK = "#c99a6b";
const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
const lights = {};   // per-set point lights, switched on with their set
const lamp = (set, x, y, z, i = 6, d = 8, col = 0xffb866) => { const l = new THREE.PointLight(col, i, d, 1.6); l.position.set(x, y, z); scene.add(l); (lights[set] ||= []).push(l); return l; };

// ======================= HOUSE: a stone basement with the wall that gets knocked through =======================
const HOLE = { x0: -0.6, x1: 0.6, y0: 0.12, y1: 1.85 }, BACK = -2.6;
let patch, chunks = [], dust = [];
{
  const X = SET.house, plaster = lit({ map: rockTex("#d9c4a0", 2, 1) }), stone = lit({ map: stoneHD() });
  const fl = add(new THREE.PlaneGeometry(8, 8), lit({ map: rockTex("#b9a080", 4, 4) }), X, 0, 0); fl.rotation.x = -Math.PI / 2;
  // back wall built round the hole; a patch of stones fills it until the hammer lands
  box(2.4 - 0.6, 3, 0.25, plaster, X - 1.5, 1.5, BACK); box(2.4 - 0.6, 3, 0.25, plaster, X + 1.5, 1.5, BACK);
  box(1.2, 3 - HOLE.y1, 0.25, plaster, X, (3 + HOLE.y1) / 2, BACK); box(1.2, HOLE.y0, 0.25, plaster, X, HOLE.y0 / 2, BACK);
  patch = box(1.2, HOLE.y1 - HOLE.y0, 0.25, stone, X, (HOLE.y0 + HOLE.y1) / 2, BACK);
  // darkness behind the hole: a narrow passage with steps going down
  box(1.4, 2.4, 0.1, lit({ color: "#1a120c" }), X, 1.2, BACK - 2.2);
  for (let i = 0; i < 6; i++) box(1.2, 0.2, 0.35, lit({ color: "#3a2a1e" }), X, 0.1 - i * 0.2, BACK - 0.45 - i * 0.35);
  box(0.1, 2.4, 2.4, lit({ color: "#2a1d14" }), X - 0.7, 1.2, BACK - 1.2); box(0.1, 2.4, 2.4, lit({ color: "#2a1d14" }), X + 0.7, 1.2, BACK - 1.2);
  // side walls, ceiling beams, a shelf with jars, a bare bulb
  box(0.25, 3, 6, plaster, X - 2.6, 1.5, 0.3); box(0.25, 3, 6, plaster, X + 2.6, 1.5, 0.3);
  box(5.4, 0.1, 6, lit({ color: "#8a6a4a" }), X, 3.05, 0.3);
  for (let z = -2.2; z < 3; z += 1.1) box(5.2, 0.22, 0.2, lit({ color: "#6b4a2e" }), X, 2.85, z);
  box(0.4, 0.06, 1.6, lit({ color: "#7a5434" }), X - 2.35, 1.5, -1.0);
  for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.09, 0.08, 0.24, 12), lit({ color: ["#c86a3a", "#7aa0a8", "#d9b45a", "#9a5a8a"][i] }), X - 2.35, 1.65, -1.55 + i * 0.35);
  add(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 6), lit({ color: "#222" }), X + 0.4, 2.6, -0.6);
  add(new THREE.SphereGeometry(0.08, 12, 10), glow(1.8, 1.5, 1.0), X + 0.4, 2.32, -0.6);
  lamp("house", X + 0.4, 2.2, -0.6, 9, 10, 0xffd9a0);
  lamp("house", X + 1.5, 1.6, 2.0, 3, 8, 0xffe2c0);
  // flying stones and dust for the impact
  for (let i = 0; i < 26; i++) { const c = box(0.12 + rnd() * 0.16, 0.08 + rnd() * 0.1, 0.1 + rnd() * 0.1, stone, X, 1, BACK); c.userData = { o: V(X + (rnd() - 0.5) * 1.1, HOLE.y0 + rnd() * (HOLE.y1 - HOLE.y0), BACK + 0.1), v: V((rnd() - 0.5) * 2.2, 1 + rnd() * 2, 1.2 + rnd() * 2.2), r: rnd() * 10 }; c.visible = false; chunks.push(c); }
  const dustM = new THREE.MeshBasicMaterial({ color: 0xe9dcc6, transparent: true, opacity: 0.25, depthWrite: false });
  for (let i = 0; i < 24; i++) { const d = add(new THREE.SphereGeometry(0.02 + rnd() * 0.035, 8, 6), dustM, X, 1, BACK); d.layers.set(NOINK); d.castShadow = false; d.userData = { o: V(X + (rnd() - 0.5) * 2.4, 0.2 + rnd() * 2, BACK + 0.3 + rnd() * 1.5), ph: rnd() * 6 }; dust.push(d); }
}

// ======================= VILLAGE: golden-hour Cappadocia, stone houses and fairy chimneys =======================
{
  const X = SET.village;
  const ground = add(new THREE.PlaneGeometry(200, 200), lam({ map: rockTex("#d9b98a", 30, 30) }), X, 0, -60); ground.rotation.x = -Math.PI / 2;
  const STY = [{ wall: "#e6d2a8", shutter: "#6a4a32" }, { wall: "#d9bf92", shutter: "#3f5a6a" }, { wall: "#efdcb5", shutter: "#7a3f30" }, { wall: "#cfae7e", shutter: "#4a5a3a" }];
  const houses = [[-5.2, -2, 4.4, 4.2], [5.4, -3, 4.4, 4.6], [-6.2, -9, 5, 5], [6.8, -10, 5, 4.4], [-1.5, -17, 6, 4], [3.8, -21, 5, 3.6]];
  houses.forEach(([x, z, w, h], i) => {
    const st = STY[i % 4], front = lam({ map: facadeHD(`dk${i}`, w, h, { ...st, door: i === 1 }) }), plain = lam({ color: st.wall });
    box(w, h, 4, [plain, plain, lam({ color: "#cdb48a" }), plain, front, plain], X + x, h / 2, z);
    box(w + 0.3, 0.25, 4.3, lam({ color: "#e9d8b4" }), X + x, h + 0.12, z);
  });
  // fairy chimneys: tall cones of soft rock with dark caps, scattered on the hills behind
  for (let i = 0; i < 16; i++) {
    const x = (rnd() - 0.5) * 70, z = -22 - rnd() * 40, hgt = 6 + rnd() * 9, r = 1.6 + rnd() * 1.6;
    add(new THREE.ConeGeometry(r, hgt, 18), lam({ color: "#dcbd92" }), X + x, hgt / 2, z);
    const cap = add(new THREE.SphereGeometry(r * 0.55, 16, 10), lam({ color: "#8a6a50" }), X + x, hgt * 0.97, z); cap.scale.y = 0.55;
  }
  for (let i = 0; i < 6; i++) { const hill = add(new THREE.SphereGeometry(18 + rnd() * 10, 24, 12), lam({ color: "#d4b083" }), X + (i - 2.5) * 28, -10, -80 - rnd() * 20); hill.scale.y = 0.7; }
}

// ======================= TUNNEL: a narrow carved passage, lit only by Max's lantern =======================
let lanternLight;
{
  const X = SET.tunnel, rock = lit({ map: rockTex(ROCK, 4, 2), side: THREE.BackSide });
  const tube = add(new THREE.CylinderGeometry(1.35, 1.35, 30, 32, 1, true), rock, X, 1.0, -10); tube.rotation.x = Math.PI / 2; tube.scale.set(0.8, 1, 1);
  const fl = add(new THREE.PlaneGeometry(2.2, 30), lit({ map: rockTex("#b88c60", 2, 12) }), X, 0, -10); fl.rotation.x = -Math.PI / 2;
  lanternLight = lamp("tunnel", X, 1.2, 0.4, 7, 9, 0xffb050);
}

// ======================= STAIRS: a cutaway of carved stairs going down level after level =======================
const STAIR = { levels: 5, h: 3.2 };
{
  const X = SET.stairs, rock = lit({ map: rockTex(ROCK, 3, 3) }), dark = lit({ map: rockTex("#a87c54", 3, 3) });
  box(12, STAIR.levels * STAIR.h + 4, 0.4, dark, X, -STAIR.levels * STAIR.h / 2 + 2, -3);                 // back of the shaft
  for (let L = 0; L < STAIR.levels; L++) {
    const y = -L * STAIR.h, dir = L % 2 ? -1 : 1;
    box(12, 0.5, 3, rock, X + (dir > 0 ? 3.5 : -3.5), y - 0.25, -1.5);                                       // landing
    for (let i = 0; i < 9; i++) box(0.45, 0.36, 2.2, rock, X + dir * (-1.4 + i * 0.42) - dir * 0.4, y - 0.36 * (i + 1) + 0.18, -1.6);   // steps down
    box(1.2, STAIR.h - 0.6, 3, rock, X - dir * 5.6, y - STAIR.h / 2, -1.5);
    lamp("stairs", X + dir * 3.2, y + 1.6, -0.8, 7, 9);
    add(new THREE.SphereGeometry(0.09, 10, 8), glow(1.8, 1.4, 0.8), X + dir * 3.2, y + 1.6, -2.75);
  }
  // the cut faces: a thick rock frame round the section
  box(0.8, STAIR.levels * STAIR.h + 4, 3.2, rock, X - 6.3, -STAIR.levels * STAIR.h / 2 + 2, -1.5); box(0.8, STAIR.levels * STAIR.h + 4, 3.2, rock, X + 6.3, -STAIR.levels * STAIR.h / 2 + 2, -1.5);
}

// ======================= ROOMS: stable, kitchen and chapel carved into the rock =======================
{
  const X = SET.rooms, rock = lit({ map: rockTex(ROCK, 6, 2) });
  box(20, 3.2, 0.4, rock, X, 1.6, -2.6); const fl = add(new THREE.PlaneGeometry(20, 6), lit({ map: rockTex("#b88c60", 6, 2) }), X, 0, 0); fl.rotation.x = -Math.PI / 2;
  box(20, 0.4, 3.2, rock, X, 3.3, -1.0);
  box(34, 6, 16, lit({ map: rockTex("#9a7048", 6, 3) }), X, 6.5, 5);                                         // rock ceiling over the hall
  { const f2 = add(new THREE.PlaneGeometry(34, 16), lit({ map: rockTex("#b88c60", 8, 4) }), X, -0.01, 6); f2.rotation.x = -Math.PI / 2; }
  for (const x of [-8, 0, 8]) lamp("rooms", X + x, 2.6, 4, 4, 10);
  for (const dx of [-3.3, 3.3]) box(0.6, 3.2, 3, rock, X + dx, 1.6, -1.2);                                   // pillars between rooms
  // stable: trough, hay, a tethering ring
  box(1.6, 0.5, 0.5, lit({ color: "#8a6a48" }), X - 5.5, 0.25, -1.9);
  const hay = add(new THREE.SphereGeometry(0.7, 14, 10), lit({ color: "#e0b85a" }), X - 6.6, 0.3, -1.6); hay.scale.y = 0.6;
  // kitchen: clay pots, an oven with a fire
  for (let i = 0; i < 5; i++) { const pot = add(new THREE.SphereGeometry(0.22 + (i % 2) * 0.08, 14, 10), lit({ color: ["#b8643a", "#a0522d", "#c98a4a"][i % 3] }), X - 1.4 + i * 0.5, 0.25, -2.1); pot.scale.y = 1.25; }
  const oven = add(new THREE.SphereGeometry(0.8, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), lit({ color: "#9a6a44" }), X + 1.6, 0, -1.9); void oven;
  add(new THREE.CircleGeometry(0.32, 16), glow(2.2, 1.0, 0.3), X + 1.6, 0.3, -1.08);
  lamp("rooms", X + 1.6, 0.6, -0.8, 5, 6, 0xff8a3a);
  // chapel: arches cut into the back wall and a painted fresco
  for (let i = 0; i < 3; i++) { const a = add(new THREE.TorusGeometry(0.55, 0.12, 8, 24, Math.PI), rock, X + 4.6 + i * 1.3, 2.2, -2.35); void a; box(0.24, 2.2, 0.24, rock, X + 4.05 + i * 1.3, 1.1, -2.35); }
  const fresco = ctex(256, 160, (g, w, h) => { g.fillStyle = "#e8d2a8"; g.fillRect(0, 0, w, h); g.fillStyle = "#c8553d"; g.fillRect(20, 20, 60, 120); g.fillStyle = "#3f6a8a"; g.fillRect(100, 20, 60, 120); g.fillStyle = "#d9a441"; g.beginPath(); g.arc(50, 50, 18, 0, 7); g.arc(130, 50, 18, 0, 7); g.fill(); g.fillStyle = "#6a8a4a"; g.fillRect(180, 20, 56, 120); });
  add(new THREE.PlaneGeometry(2.4, 1.4), lit({ map: fresco }), X + 5.9, 1.5, -2.38);
  for (const x of [-6, -2, 2, 6]) { lamp("rooms", X + x, 2.2, -1.2, 4, 7); add(new THREE.SphereGeometry(0.08, 10, 8), glow(1.8, 1.4, 0.8), X + x, 2.4, -2.38); }
}

// ======================= CITY: the whole underground city in cross-section =======================
const tiny = [];
{
  const X = SET.city, rock = lit({ map: rockTex(ROCK, 2, 2) }), back = lit({ color: "#3a2618" });
  const LV = 8, LH = 2.3, W = 16;
  box(W + 6, LV * LH + 2, 0.5, back, X, -LV * LH / 2, -3.2);
  const roomMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.72, 0.38) });
  for (let L = 0; L < LV; L++) {
    const y = -L * LH - 1.2;
    box(W + 6, 0.5, 3.2, rock, X, y - LH / 2 + 0.25, -1.6);                                                  // floor slab
    let x = -W / 2;
    const cells = [];
    while (x < W / 2) { const cw = 1.6 + rnd() * 2.2; cells.push([x, Math.min(W / 2, x + cw)]); x += cw + 0.6 + rnd() * 0.8; }
    let last = -W / 2 - 3;
    for (const [a, b] of cells) {
      if (a - last > 0.05) box(a - last, LH - 0.5, 3.2, rock, X + (a + last) / 2, y + 0.25, -1.6);           // solid rock between rooms
      add(new THREE.PlaneGeometry(b - a, LH - 0.5), roomMat, X + (a + b) / 2, y + 0.25, -2.9);             // glowing room
      if (rnd() < 0.55) tiny.push([X + a + (b - a) * (0.3 + rnd() * 0.4), y - LH / 2 + 0.5]);
      last = b;
    }
    if (W / 2 + 3 - last > 0.05) box(W / 2 + 3 - last, LH - 0.5, 3.2, rock, X + (W / 2 + 3 + last) / 2, y + 0.25, -1.6);
  }
  // the surface: a strip of ground with little houses on top
  box(W + 6, 1.0, 3.2, lam({ color: "#d9b98a" }), X, 0, -1.6);
  for (let i = 0; i < 6; i++) box(1.6, 1.2 + (i % 3) * 0.4, 1.4, lam({ color: ["#e6d2a8", "#d9bf92", "#efdcb5"][i % 3] }), X - 7 + i * 2.8, 1.1 + (i % 3) * 0.2, -1.8);
}
const tinyCards = tiny.slice(0, 14).map(([x, y], i) => { const c = makeCard({ ...townsfolk(i), skin: CREAM }, { mode: "stand", expr: "neutral", seed: 30 + i }, null, 0.45); c.position.set(x, y, -1.4); return c; });

// ======================= DOOR: a round stone door rolls across the tunnel =======================
let stoneDoor;
const insiders = [];
{
  const X = SET.door, rock = lit({ map: rockTex(ROCK, 3, 2) });
  // the wall with an arched opening and a slot for the door on the left
  box(3, 4, 0.8, rock, X - 2.6, 2, 0); box(3, 4, 0.8, rock, X + 2.6, 2, 0); box(2.2, 1.6, 0.8, rock, X, 3.2, 0);
  const fl = add(new THREE.PlaneGeometry(14, 14), lit({ map: rockTex("#b88c60", 4, 4) }), X, 0, 0); fl.rotation.x = -Math.PI / 2;
  const tube = add(new THREE.BoxGeometry(2.2, 2.4, 6), lit({ map: rockTex("#a87c54", 2, 2), side: THREE.BackSide }), X, 1.2, -3.4); void tube;
  stoneDoor = add(new THREE.CylinderGeometry(1.25, 1.25, 0.35, 32), lit({ map: rockTex("#bfa07a", 1, 1) }), X - 2.4, 1.25, 0.55);
  stoneDoor.rotation.x = Math.PI / 2;
  const hub = add(new THREE.CylinderGeometry(0.2, 0.2, 0.37, 16), lit({ color: "#8a6a4a" }), 0, 0, 0, stoneDoor); void hub;
  lamp("door", X + 1.5, 2.2, 2.2, 6, 9); lamp("door", X, 1.4, -2.5, 4, 6);
  for (let i = 0; i < 3; i++) { const c = makeCard({ ...townsfolk(i + 2), skin: CREAM }, { mode: "stand", expr: "nervous", seed: 60 + i, facing: 0 }); c.position.set(X - 0.6 + i * 0.6, 0, -1.6 - i * 0.5); insiders.push(c); }
}

// ======================= MAP: a parchment map of the region, towns popping up =======================
let mapCtx, mapTex;
{
  const X = SET.map;
  box(6, 0.2, 4, lit({ color: "#6b4a2e" }), X, 0.9, 0);
  const cv = document.createElement("canvas"); cv.width = 900; cv.height = 600; mapCtx = cv.getContext("2d");
  mapTex = new THREE.CanvasTexture(cv); mapTex.colorSpace = THREE.SRGBColorSpace;
  const sheet = add(new THREE.PlaneGeometry(4.2, 2.8), lit({ map: mapTex }), X, 1.01, 0); sheet.rotation.x = -Math.PI / 2; sheet.rotation.z = 0.04;
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12), lit({ color: "#f2e6c4" }), X + 2.4, 1.15, -1.2);
  add(new THREE.SphereGeometry(0.05, 8, 6), glow(2.5, 1.6, 0.6), X + 2.4, 1.36, -1.2);
  lamp("map", X + 2.4, 1.6, -1.0, 6, 8, 0xffa040); lamp("map", X - 1, 3, 2, 4, 9, 0xffe0b8);
}
const DOTS = Array.from({ length: 70 }, () => { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()); return [450 + Math.cos(a) * r * 300, 310 + Math.sin(a) * r * 190]; });
function drawMap(k) {
  const g = mapCtx;
  g.fillStyle = "#ead9b0"; g.fillRect(0, 0, 900, 600);
  g.strokeStyle = "#8a6a44"; g.lineWidth = 10; g.strokeRect(14, 14, 872, 572);
  g.fillStyle = "#d9c08e"; g.beginPath(); g.ellipse(450, 310, 340, 220, 0.1, 0, 7); g.fill(); g.strokeStyle = "#7a5a34"; g.lineWidth = 5; g.stroke();
  g.fillStyle = "#5a3e22"; g.font = "bold 54px Georgia, serif"; g.textAlign = "center"; g.fillText("CAPPADOCIA", 450, 80);
  const n = Math.floor(DOTS.length * Math.min(1, k * 1.25));
  DOTS.slice(0, n).forEach(([x, y], i) => { g.fillStyle = i === 0 ? "#c8302a" : "#3a2a1a"; g.beginPath(); g.arc(x, y, i === 0 ? 14 : 8, 0, 7); g.fill(); });
  g.fillStyle = "#c8302a"; g.font = "bold 30px Arial"; g.fillText("DERINKUYU", DOTS[0][0], DOTS[0][1] - 24);
  if (k > 0.75) { g.fillStyle = "#c8302a"; g.font = "900 72px Arial Black, Arial"; g.fillText("200+", 760, 560); }
  mapTex.needsUpdate = true;
}

// ======================= characters =======================
const max = makeMax({ facing: 1 });

// ======================= timeline =======================
const CAMS = {
  hook:    [V(1.7, 1.55, 2.4),   V(-0.2, 1.15, -2.2)],
  setting: [V(100.2, 1.6, 5.2),  V(100.2, 2.6, -30)],
  tunnel:  [V(200.1, 1.45, 3.2), V(200, 1.25, -3)],
  rooms:   [V(394.8, 1.9, 9.0),  V(394.8, 1.25, -2.4)],
  snap:    [V(500, -3.5, 7),     V(500, -4.5, -2)],
  deadpan: [V(0.25, 1.5, 1.9),   V(-0.15, 1.35, -2)],
  doors:   [V(601.2, 1.6, 6.2),  V(600, 1.4, -1)],
  map:     [V(700.2, 4.2, 2.2),  V(700, 1, -0.1)],
  loop:    [V(-1.2, 1.55, 1.8),  V(1.6, 1.3, -0.6)],
};
start((time, tl) => {
  const shot = tl.shot, k = tl.k, st = tl.since(shot), set = SHOT_SET[shot];
  for (const [s, ls] of Object.entries(lights)) for (const l of ls) l.visible = s === set;
  const outdoor = set === "village" || set === "city";
  setLight(set === "village" ? "golden" : "day");
  sun.intensity = outdoor ? (set === "village" ? 5.5 : 1.2) : 0; hemi.intensity = outdoor ? 0.5 : set === "stairs" ? 0.5 : 0.3;
  scene.background = new THREE.Color(set === "village" ? "#f2b37a" : set === "city" ? "#e8c89a" : "#120c08");
  scene.fog = set === "village" ? new THREE.Fog(untone("#efb489"), 30, 140) : null;

  // camera: per-shot framing with a slow push-in; stairs and snap move
  let [p, l] = CAMS[shot] || CAMS.hook;
  p = p.clone(); l = l.clone();
  if (shot === "stairs") { const d = ease(k) * (STAIR.levels - 1) * STAIR.h; p = V(SET.stairs + 1.0, 1.4 - d, 9.5); l = V(SET.stairs, 0.4 - d, -2); }
  else if (shot === "snap") { const e = ease(Math.min(1, k / 0.8)); p = V(SET.city, lerp(-6, -8, e), lerp(5, 30, e)); l = V(SET.city, lerp(-6.5, -8.5, e), -2); }
  else if (shot === "rooms") { p.x += 11 * ease(k); l.x += 11 * ease(k); }
  else if (shot === "hook" && st > 1.6) p.lerp(V(-0.1, 1.2, -1.2), 0.5 * ease((st - 1.6) / 4));
  else p.lerp(l, 0.06 * ease(k));
  camera.position.copy(p); camera.lookAt(l);

  // Max: where he is and what he's doing in each shot
  max.visible = ["house", "village", "tunnel", "stairs"].includes(set);
  const hit = shot === "hook" ? Math.min(1, Math.max(0, (st - 0.45) / 0.15)) : 1;    // hammer strike at ~0.55 s
  if (set === "house") {
    if (shot === "loop") { max.position.set(SET.house + 1.9, 0, -0.4); max.userData.draw({ expr: "neutral", prop: null, wave: Math.abs(Math.sin(st * 9)) * 0.6, facing: 1, blink: false }); }
    else if (shot === "deadpan") { max.position.set(SET.house - 0.05, 0, -1.0); max.userData.draw({ expr: k < 0.55 ? "neutral" : "nervous", prop: ["hammer", 1], facing: 0, blink: Math.sin(st * 3) > 0.96 }); }
    else { max.position.set(SET.house + 0.75, 0, -1.4); max.userData.draw({ expr: hit < 1 ? "stern" : st < 2.2 ? "shock" : "neutral", prop: ["hammer", st < 0.45 ? 0.15 * Math.sin(st * 6) : hit], facing: -1 }); }
  }
  if (set === "village") { max.position.set(SET.village + 0.2, 0, 0.2); max.userData.draw({ expr: "neutral", prop: ["hammer", 1], facing: 0, blink: Math.sin(st * 2.5) > 0.97 }); }
  if (set === "tunnel") { max.position.set(SET.tunnel, 0, -0.6 + 0.5 * k); max.userData.draw({ expr: "nervous", prop: "lantern", mode: "stroll", phase: (st * 0.9) % 1, facing: 0 }); lanternLight.position.set(SET.tunnel + 0.45, 1.3, max.position.z + 0.3); lanternLight.intensity = 7 * (1 + 0.06 * Math.sin(time * 19)); }
  if (set === "stairs") {
    const d = ease(k) * (STAIR.levels - 1), L = Math.min(STAIR.levels - 1, Math.floor(d)), f = d - L, dir = L % 2 ? -1 : 1;
    max.position.set(SET.stairs + dir * (-1.6 + 3.6 * f), -L * STAIR.h - 0.36 * 9 * f * 0.9, -1.2);
    max.userData.draw({ expr: "neutral", prop: "lantern", mode: "stroll", phase: (st * 1.1) % 1, facing: dir });
  }
  faceCamera(max);
  for (const c of [...tinyCards, ...insiders]) faceCamera(c);

  // hook: the wall breaks open
  const broken = shot !== "hook" || st > 0.6;
  patch.visible = !broken;
  chunks.forEach(c => { const u = shot === "hook" ? st - 0.6 : -1; c.visible = u > 0 && u < 1.6; if (!c.visible) return; const { o, v, r } = c.userData; c.position.set(o.x + v.x * u, Math.max(0.06, o.y + v.y * u - 4.9 * u * u), o.z + v.z * u); c.rotation.set(r + u * 6, r * 2 + u * 4, 0); });
  dust.forEach(d => { const u = shot === "hook" ? st - 0.6 : shot === "deadpan" ? 3 + st : -1; d.visible = u > 0 && set === "house"; if (!d.visible) return; const { o, ph } = d.userData; d.position.set(o.x + 0.2 * Math.sin(time * 0.7 + ph), o.y + 0.1 * Math.sin(time * 0.9 + ph), o.z + Math.min(1.2, u * 0.8)); d.material.opacity = 0.25 * Math.max(0, 1 - u / 8); });

  // doors: the stone rolls across at ~2.4 s and seals the tunnel by ~4.6 s; the people inside relax
  if (set === "door") {
    const r = ease(Math.min(1, Math.max(0, (st - 2.4) / 2.2)));
    stoneDoor.position.x = SET.door - 2.4 + 2.4 * r; stoneDoor.rotation.y = -r * 2.4 / 1.25;
    insiders.forEach((c, i) => c.userData.draw({ expr: r < 1 ? "nervous" : "relief", seed: 60 + i }));
  }
  if (set === "map") drawMap(k);
  if (look.bokeh) look.bokeh.uniforms.aperture.value = set === "rooms" || set === "stairs" ? 0.0008 : 0.0028;
  if (look.bokeh) look.bokeh.uniforms.focus.value = set === "city" || set === "map" ? 60 : set === "rooms" ? 10.5 : set === "door" ? 6 : camera.position.distanceTo(max.position.clone().setY(max.position.y + 1.4));
  if (outdoor) aimSun(set === "village" ? 145 : 60, set === "village" ? 16 : 40, set === "village" ? V(SET.village, 0, -4) : V(SET.city, -8, -2), 60);
});
