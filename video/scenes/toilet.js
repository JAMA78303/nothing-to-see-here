// "Where your toilet water actually goes": one long cut-away world the camera follows left to
// right: house -> street sewer -> main -> treatment plant -> river -> town downstream.
import {
  THREE, scene, camera, M, GROUND_BOTTOM, box, groundBox, solid, setWaterTable, canvasTex,
  house, tree, cloud, ease, lerp, V, moveCamera, start,
} from "./kit.js";

const RIVER = { x0: 92, x1: 104, bed: -1.8, surface: -0.5 };
groundBox(-30, RIVER.x0, GROUND_BOTTOM, 0, -40, 0);
groundBox(RIVER.x0, RIVER.x1, GROUND_BOTTOM, RIVER.bed, -40, 0);
groundBox(RIVER.x1, 140, GROUND_BOTTOM, 0, -40, 0);

// ---------- cut-away house: open at the front so the rooms show ----------
const H = { x0: -3, x1: 6.5, zBack: -6, up: 3.6, top: 7.2 };
const wall = solid(0xf1eadc, 0x1a1a1a), floorMat = solid(0xa8794c);
box(H.x0, H.x1, 0, H.top, H.zBack, H.zBack + 0.25, wall);          // back wall
box(H.x0, H.x0 + 0.25, 0, H.top, H.zBack, 0, wall);                // side walls
box(H.x1 - 0.25, H.x1, 0, H.top, H.zBack, 0, wall);
box(H.x0, H.x1, -0.2, 0.05, H.zBack, 0, floorMat);                 // ground floor
box(H.x0, H.x1, H.up - 0.2, H.up, H.zBack, 0, floorMat);           // upstairs floor
box(H.x0, H.x1, H.top, H.top + 0.2, H.zBack, 0, wall);             // ceiling
box(1.9, 2.1, H.up, H.top, H.zBack, 0, wall);                      // bathroom partition
const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([
  new THREE.Vector2(-3.6, 0), new THREE.Vector2(3.6, 0), new THREE.Vector2(0, 2.6),
]), { depth: H.x1 - H.x0 + 0.8, bevelEnabled: false }), solid(0xd9612f)());
roof.rotation.y = Math.PI / 2;
roof.position.set(H.x0 - 0.4, H.top + 0.2, H.zBack / 2);
roof.castShadow = true;
scene.add(roof);

// bathroom: tiles, toilet against the right wall, sink
const tiles = (sx, sy) => new THREE.MeshLambertMaterial({ map: canvasTex(64, 64, (g, w, h) => {
  g.fillStyle = "#dbeef5"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#b9d3dd"; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
}, sx / 0.6, sy / 0.6) });
box(2.1, H.x1 - 0.25, H.up, H.top, H.zBack + 0.25, H.zBack + 0.3, tiles);
box(H.x1 - 0.3, H.x1 - 0.25, H.up, H.top, H.zBack, 0, tiles);
const porcelain = solid(0xffffff, 0x333333);
box(5.9, 6.25, H.up + 0.9, H.up + 1.9, -2.3, -0.9, porcelain);     // tank
box(5.0, 5.9, H.up, H.up + 0.75, -1.95, -1.25, porcelain);          // base
const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.3, 24), porcelain());
bowl.position.set(5.25, H.up + 0.9, -1.6);
scene.add(bowl);
const swirlTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = "#7cc6e6"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#d7f1fb"; g.lineWidth = 6;
  for (let a = 0; a < 3; a++) {
    g.beginPath();
    for (let i = 0; i < 60; i++) {
      const r = 60 - i, th = a * 2.1 + i * 0.12;
      g.lineTo(64 + r * Math.cos(th), 64 + r * Math.sin(th));
    }
    g.stroke();
  }
});
const bowlWater = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), new THREE.MeshLambertMaterial({ map: swirlTex }));
bowlWater.rotation.x = -Math.PI / 2;
bowlWater.position.set(5.25, H.up + 1.0, -1.6);
scene.add(bowlWater);
box(2.6, 3.6, H.up + 1.6, H.up + 1.8, -5.75, -5.0, porcelain);       // sink
box(2.95, 3.25, H.up, H.up + 1.6, -5.7, -5.4, porcelain);
const mirror = solid(0xbfe3ef, 0x334455);
box(2.6, 3.6, H.up + 2.3, H.up + 3.3, -5.75, -5.7, mirror);
// downstairs living room
const couch = solid(0x3d7ea6);
box(-2.2, 0.8, 0.05, 0.6, -5.6, -4.5, couch);
box(-2.2, 0.8, 0.6, 1.4, -5.75, -5.3, couch);
box(-1.2, 0.4, 0.05, 0.1, -3.6, -2.2, solid(0xa8463c));
const lamp = new THREE.PointLight(0xffe7a8, 5, 10);
lamp.position.set(1.5, 3, -3);
scene.add(lamp);
const lamp2 = new THREE.PointLight(0xffffff, 4, 8);
lamp2.position.set(4.3, 6.6, -3);
scene.add(lamp2);

// ---------- pipes ----------
// above ground: a half pipe (back half only) so the water inside is visible
const pipeMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a6, side: THREE.DoubleSide });
function halfPipe(a, b, r) {
  const d = b.clone().sub(a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 16, 1, true, Math.PI / 2, Math.PI), pipeMat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.rotation.z = Math.atan2(d.y, d.x) - Math.PI / 2;
  scene.add(m);
}
// below ground: drawn on the cut face, like a cross-section diagram
const pipeInside = new THREE.MeshBasicMaterial({ color: 0x2f3236 });
const pipeWall = new THREE.MeshLambertMaterial({ color: 0xa3a9ae });
function pipeBand(points, r) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1], d = b.clone().sub(a), ang = Math.atan2(d.y, d.x);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(d.length(), 2 * r), pipeInside);
    inner.position.set(mid.x, mid.y, 0.02);
    inner.rotation.z = ang;
    scene.add(inner);
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(d.length() + 0.12, 0.12), pipeWall);
      edge.position.set(mid.x - Math.sin(ang) * side * r, mid.y + Math.cos(ang) * side * r, 0.03);
      edge.rotation.z = ang;
      scene.add(edge);
    }
    const joint = new THREE.Mesh(new THREE.CircleGeometry(r, 20), pipeInside);
    joint.position.set(b.x, b.y, 0.021);
    scene.add(joint);
  }
}

// the route from the toilet to the plant
const STACK_X = 5.7;
const house3d = [V(5.25, H.up + 0.95, -1.6), V(STACK_X, H.up + 0.2, -0.6), V(STACK_X, 0.05, -0.6)];
halfPipe(V(STACK_X, H.up + 0.3, -0.6), V(STACK_X, -0.05, -0.6), 0.22);
const lateral = [V(STACK_X, 0, 0.05), V(STACK_X, -1.4, 0.05), V(15, -3.0, 0.05)];
const MAIN_Y0 = -3.2, MAIN_Y1 = -5.0;
const main = [V(14, MAIN_Y0, 0.05), V(70, MAIN_Y1, 0.05), V(72.5, MAIN_Y1, 0.05), V(72.5, 0.2, 0.05)];
pipeBand(lateral.map(p => V(p.x, p.y, 0)), 0.25);
pipeBand(main.map(p => V(p.x, p.y, 0)), 0.6);
// neighbours' laterals join the main
const neighbours = [28, 40, 52];
for (const x of neighbours) pipeBand([V(x, 0, 0), V(x, -1.2, 0), V(x + 4, MAIN_Y0 + (MAIN_Y1 - MAIN_Y0) * ((x + 4 - 14) / 56) + 0.3, 0)], 0.25);

// ---------- street with a manhole ----------
box(15, 22, 0, 0.1, -40, 0, solid(0x3c3f44));
for (let z = -38; z < 0; z += 3) box(18.4, 18.6, 0.1, 0.11, z, z + 1.5, solid(0xffd400));
const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 24), new THREE.MeshLambertMaterial({ color: 0x55585c }));
manhole.position.set(20, 0.13, -2.5);
scene.add(manhole);

// ---------- treatment plant ----------
const concrete = M.concrete;
// aeration tank (rectangular, brown water, bubbles + bacteria)
box(66, 76, 0, 0.6, -10, -1, concrete);                            // floor + four walls
box(66, 66.3, 0, 1.5, -10, -1, concrete);
box(75.7, 76, 0, 1.5, -10, -1, concrete);
box(66, 76, 0, 1.5, -10, -9.7, concrete);
box(66, 76, 0, 1.5, -1.3, -1, concrete);
const aerWater = box(66.3, 75.7, 0.6, 1.25, -9.7, -1.3, solid(0x7a6a3a, 0x1a1408));
const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.85 });
const bubbles = [];
for (let i = 0; i < 90; i++) {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), bubbleMat);
  b.userData = { x: 66.6 + Math.random() * 8.8, z: -9.4 + Math.random() * 7.8, phase: Math.random() };
  scene.add(b);
  bubbles.push(b);
}
const bactMat = new THREE.MeshBasicMaterial({ color: 0x6fdc5a });
const bacteria = [];
for (let i = 0; i < 50; i++) {
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 3, 6), bactMat);
  b.userData = { x: 66.8 + Math.random() * 8.4, z: -9.2 + Math.random() * 7.4, phase: Math.random() * 6 };
  scene.add(b);
  bacteria.push(b);
}
// round settling tank with a turning bridge
function roundTank(cx, cz, r, color) {
  const wallM = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.5, 40, 1, true), new THREE.MeshLambertMaterial({ color: 0xd9d6cf, side: THREE.DoubleSide }));
  wallM.position.set(cx, 0.75, cz);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 6, 40), new THREE.MeshLambertMaterial({ color: 0xcfcbc3 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(cx, 1.5, cz);
  const water = new THREE.Mesh(new THREE.CircleGeometry(r - 0.05, 40), new THREE.MeshPhongMaterial({ color, shininess: 60 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(cx, 1.25, cz);
  for (const m of [wallM, rim, water]) { m.castShadow = m.receiveShadow = true; scene.add(m); }
  return water;
}
roundTank(81, -5.5, 4, 0x4f8f86);
const bridge = new THREE.Group();
bridge.position.set(81, 1.65, -5.5);
const beam = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.25, 0.6), new THREE.MeshLambertMaterial({ color: 0x2f6fb0 }));
bridge.add(beam);
const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 16), new THREE.MeshLambertMaterial({ color: 0x2f6fb0 }));
bridge.add(hub);
scene.add(bridge);
// disinfection tank: clear water with a purple UV glow
roundTank(89, -4, 2.2, 0x5cc8f2);
const uv = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.08, 6, 40), new THREE.MeshBasicMaterial({ color: 0xb46bff }));
uv.rotation.x = Math.PI / 2;
uv.position.set(89, 1.3, -4);
scene.add(uv);
const uvLight = new THREE.PointLight(0xb46bff, 0, 6);
uvLight.position.set(89, 2.2, -4);
scene.add(uvLight);
box(74, 78, 0, 3, -16, -12, solid(0xe8e3d8, 0x151515));          // control building
box(74, 78, 3, 3.2, -16.2, -11.8, solid(0x6d7a86));

// outlet into the river
const outlet = [V(89, 0, 0), V(89, -0.6, 0), V(RIVER.x0 + 0.6, -0.6, 0)];
pipeBand(outlet, 0.22);

// ---------- river ----------
const riverMat = new THREE.MeshPhongMaterial({ color: 0x3f9fe0, transparent: true, opacity: 0.85, shininess: 90 });
box(RIVER.x0, RIVER.x1, RIVER.bed, RIVER.surface, -40, 0, () => riverMat);
// water intake for the town downstream
pipeBand([V(RIVER.x1 - 0.5, -1.2, 0), V(RIVER.x1 + 3, -1.2, 0), V(RIVER.x1 + 3, 0, 0)], 0.2);
box(RIVER.x1 + 2, RIVER.x1 + 6, 0, 2.2, -6, -2, solid(0xe8e3d8, 0x151515));   // pumping station
const tower = new THREE.Group();
const tank = new THREE.Mesh(new THREE.SphereGeometry(2, 20, 14), new THREE.MeshLambertMaterial({ color: 0x8fc7e8 }));
tank.position.y = 9;
tower.add(tank);
for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8), new THREE.MeshLambertMaterial({ color: 0x6d7a86 }));
  leg.position.set(dx * 1.1, 4, dz * 1.1);
  tower.add(leg);
}
tower.position.set(RIVER.x1 + 12, 0, -12);
scene.add(tower);

// ---------- backdrop ----------
for (const [x, z, w, s] of [[28, -20, 11, 1], [44, -24, 10, 0.9], [56, -21, 11, 1], [-16, -22, 10, 0.9],
  [112, -22, 9, 0.8], [124, -26, 10, 0.8], [118, -34, 9, 0.8]]) house(x, z, w, s);
for (const [x, z, s] of [[-9, -10, 1.2], [10, -12, 1], [24, -9, 1.1], [36, -12, 1.3], [48, -10, 1], [62, -12, 1.2],
  [86, -14, 1.1], [98, -9, 1.3], [101, -16, 1], [109, -10, 1.2]]) tree(x, z, s);
for (const [x, y, z, s] of [[-6, 20, -45, 2], [30, 24, -55, 2.4], [70, 21, -50, 2.2], [104, 23, -55, 2.4]]) cloud(x, y, z, s);

// ---------- flowing water: blobs that run along a path once it has been reached ----------
const dirty = new THREE.MeshLambertMaterial({ color: 0x8a7a42, emissive: 0x2a2410 });
const clean = new THREE.MeshLambertMaterial({ color: 0x6fcdf5, emissive: 0x1a4f70 });
function flow(points, count, material, r, lapTime) {
  const path = new THREE.CurvePath();
  for (let i = 0; i < points.length - 1; i++) path.add(new THREE.LineCurve3(points[i], points[i + 1]));
  const blobs = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r * (0.7 + Math.random() * 0.5), 10, 8), material);
    m.userData.phase = i / count;
    scene.add(m);
    blobs.push(m);
  }
  // since: seconds since the flow started (< 0 = not yet); stop: seconds since it should drain out
  return (since, stop = -1) => {
    for (const m of blobs) {
      const u = ((since / lapTime + m.userData.phase) % 1 + 1) % 1;
      const reached = since / lapTime >= u;               // first lap: only up to the front
      const drained = stop > 0 && stop / lapTime >= u;    // after stopping: empty from the top
      m.visible = since > 0 && reached && !drained;
      if (m.visible) m.position.copy(path.getPointAt(u));
    }
  };
}
const fHouse = flow([...house3d, V(STACK_X, -0.05, 0.05)], 14, dirty, 0.13, 1.4);
const fLateral = flow(lateral, 26, dirty, 0.14, 1.6);
const fMain = flow(main, 160, dirty, 0.26, 6);
const fNeighbours = neighbours.map(x => flow([V(x, 0, 0.05), V(x, -1.2, 0.05), V(x + 4, MAIN_Y0 + (MAIN_Y1 - MAIN_Y0) * ((x + 4 - 14) / 56) + 0.3, 0.05)], 20, dirty, 0.14, 1.5));
const fOut = flow([V(89, 0.4, 0.05), V(89, -0.6, 0.05), V(RIVER.x0 + 0.5, -0.6, 0.05), V(RIVER.x0 + 3, -1.2, 0.05)], 30, clean, 0.15, 1.6);
const fIntake = flow([V(RIVER.x1 - 0.5, -1.2, 0.05), V(RIVER.x1 + 3, -1.2, 0.05), V(RIVER.x1 + 3, 0.2, 0.05)], 16, clean, 0.12, 1.5);

// ---------- timeline ----------
const cams = {
  start: { pos: V(2, 6, 24),     look: V(2, 3, -3) },
  intro: { pos: V(4.6, 5.6, 7.5), look: V(4.6, 4.3, -2) },
  pipe:  { pos: V(5, 1.6, 13),   look: V(5, 0.8, -2) },
  sewer: { pos: V(11, -0.5, 17), look: V(11, -2, -2) },
  flow:  { pos: V(48, 0, 19),    look: V(48, -3, -3) },
  plant: { pos: V(78, 10, 24),   look: V(78, 0, -6) },
  clean: { pos: V(83, 8, 13),    look: V(83, 0.5, -5) },
  river: { pos: V(93.5, 3, 10.5), look: V(93.5, -0.6, -2.5) },
  outro: { pos: V(109, 9, 30),   look: V(110, 3.5, -10) },
};

start((time, tl) => {
  const look = moveCamera(cams, tl);
  setWaterTable(GROUND_BOTTOM - 1, time);

  // flush: the bowl water swirls and drains, then refills
  const intro = tl.prog("intro");
  const flushing = intro > 0.3 && intro < 1.6;
  bowlWater.rotation.z = flushing ? -tl.since("intro") * 9 : 0;
  bowlWater.position.y = H.up + 1.0 - (flushing ? 0.12 * Math.sin(Math.PI * Math.min(1, (intro - 0.3) / 1.3)) : 0);
  bowlWater.scale.setScalar(flushing ? 1 - 0.35 * Math.sin(Math.PI * Math.min(1, (intro - 0.3) / 1.3)) : 1);

  // the water's journey: each leg starts as the story gets there
  const at = n => tl.since(n);
  fHouse(at("intro") - 1.0, at("sewer") - 0.8);
  fLateral(at("pipe") + 0.3, at("plant"));
  fMain(at("sewer") + 0.6);
  fNeighbours.forEach((f, i) => f(at("flow") - 0.2 - i * 0.3));
  fOut(at("river") - 0.2);
  fIntake(at("outro") + 0.2);

  // treatment plant: bubbles rise, bacteria wiggle, the bridge turns, the UV glows
  for (const b of bubbles) {
    const { x, z, phase } = b.userData;
    const u = (time * 0.8 + phase) % 1;
    b.position.set(x, 1.0 + u * 0.4, z);
    b.scale.setScalar(0.5 + u);
  }
  const cleanP = tl.prog("clean");
  for (const b of bacteria) {
    const { x, z, phase } = b.userData;
    b.visible = cleanP > 0 && cleanP < 1.2;
    b.position.set(x + 0.2 * Math.sin(time * 2 + phase), 1.35, z + 0.2 * Math.cos(time * 1.7 + phase));
    b.rotation.set(Math.PI / 2, 0, time * 3 + phase);
  }
  aerWater.material.color.set(cleanP > 0.3 ? 0x6f6a40 : 0x7a6a3a);
  bridge.rotation.y = time * 0.25;
  const glow = cleanP > 0.6 ? 0.5 + 0.5 * Math.sin(time * 6) : 0.2;
  uvLight.intensity = 8 * glow;
  uv.material.color.setHSL(0.76, 1, 0.55 + 0.2 * glow);

  camera.lookAt(look);
});
