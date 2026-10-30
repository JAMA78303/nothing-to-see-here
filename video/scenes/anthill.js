// "What if you poured concrete into an ant hill?": concrete fills the tunnels, the soil is dug
// away, and the cast of the whole colony is revealed.
import {
  THREE, scene, camera, sun, hemi, M, GROUND_BOTTOM, box, groundBox, setWaterTable,
  house, tree, cloud, ease, lerp, V, moveCamera, start,
} from "./kit.js";

// ---------- ground: the dig zone (x -6..6, z -4..0) is its own group so it can vanish ----------
const DIG = { x0: -6, x1: 6, zBack: -4, floor: -10.5 };
groundBox(-24, DIG.x0, GROUND_BOTTOM, 0, -40, 0);
groundBox(DIG.x1, 24, GROUND_BOTTOM, 0, -40, 0);
groundBox(DIG.x0, DIG.x1, GROUND_BOTTOM, 0, -40, DIG.zBack);
groundBox(DIG.x0, DIG.x1, GROUND_BOTTOM, DIG.floor, DIG.zBack, 0);
const digGroup = new THREE.Group();
scene.add(digGroup);
groundBox(DIG.x0, DIG.x1, DIG.floor, 0, DIG.zBack, 0, digGroup);

// the ant hill itself
const moundMat = new THREE.MeshLambertMaterial({ color: 0xb98a55, flatShading: true });
const mound = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.7, 14, 3), moundMat);
mound.position.set(0, 0.35, -1.2);
mound.castShadow = mound.receiveShadow = true;
digGroup.add(mound);

house(0, -22, 15);
tree(-12, -12, 1.2);
tree(11, -11, 1);
tree(-19, -24, 1.4);
cloud(-12, 20, -45, 2);
cloud(14, 24, -55, 2.4);

// ---------- the colony: tunnels (curves) and rooms (flattened spheres) ----------
let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const tunnels = [], rooms = [];
function tunnel(points) {
  const c = new THREE.CatmullRomCurve3(points);
  tunnels.push(c);
  return c;
}
function room(p, s) { rooms.push({ p, s }); }

// main shaft, wiggling down from the mound
const shaft = [];
for (let i = 0; i <= 12; i++) shaft.push(V(0.6 * Math.sin(i * 0.9), 0.3 - i * 0.75, 0));
tunnel(shaft);
room(shaft.at(-1), 1.3);
// side branches, alternating left and right, each ending in a room (some with a sub-branch)
for (let i = 2; i <= 11; i++) {
  const from = shaft[i], side = i % 2 ? 1 : -1;
  const reach = 2.4 + rand() * 2.4;
  const mid = V(from.x + side * reach * 0.5, from.y - 0.3 - rand() * 0.6, 0);
  const end = V(Math.max(-5.3, Math.min(5.3, from.x + side * reach)), mid.y - 0.2 - rand() * 0.8, 0);
  tunnel([from, mid, end]);
  room(end, 0.8 + rand() * 0.5);
  if (rand() < 0.6) {
    const sub = V(mid.x + side * 0.4, Math.max(DIG.floor + 1, mid.y - 1.2 - rand()), 0);
    tunnel([mid, V((mid.x + sub.x) / 2 - side * 0.3, (mid.y + sub.y) / 2, 0), sub]);
    room(sub, 0.6 + rand() * 0.4);
  }
}

function colony(material) {
  const g = new THREE.Group();
  for (const c of tunnels) g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 48, 0.17, 10), material));
  for (const { p, s } of rooms) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), material);
    m.position.copy(p);
    m.scale.set(0.95 * s, 0.42 * s, 0.7 * s);
    g.add(m);
  }
  g.traverse(o => (o.castShadow = o.receiveShadow = true));
  return g;
}

// empty tunnels: a dark, flat "ant farm" view on the cut face
const empty = colony(new THREE.MeshBasicMaterial({ color: 0x24160b }));
empty.scale.z = 0.08;
empty.position.z = 0.03;
digGroup.add(empty);

// the concrete cast: fills top-down (clipped), then becomes fully 3D once dug out
const fillClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const concreteMat = new THREE.MeshStandardMaterial({ color: 0xc9c5bd, roughness: 0.85, clippingPlanes: [fillClip] });
const CAST_PIVOT = V(0, -4.6, 0);
const castRig = new THREE.Group();
castRig.position.copy(CAST_PIVOT);
const cast = colony(concreteMat);
cast.position.copy(CAST_PIVOT).negate();
castRig.add(cast);
scene.add(castRig);

// ---------- ants scurrying through the tunnels ----------
const antMat = new THREE.MeshBasicMaterial({ color: 0x0b0b0b });
const ants = [];
for (let i = 0; i < 28; i++) {
  const a = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), antMat);
  a.scale.set(1.8, 1, 1);
  a.userData = { c: tunnels[i % tunnels.length], phase: rand(), speed: (0.12 + rand() * 0.12) * (rand() < 0.5 ? 1 : -1) };
  scene.add(a);
  ants.push(a);
}

// ---------- the concrete pour ----------
const pourMat = new THREE.MeshStandardMaterial({ color: 0xbab6ae, roughness: 0.7 });
const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1, 12), pourMat);
scene.add(stream);

// ---------- timeline ----------
const cams = {
  start:  { pos: V(0, 10, 30),   look: V(0, -1, -6) },
  intro:  { pos: V(0, 2.4, 9.5), look: V(0, -0.6, -1.5) },
  pour:   { pos: V(0, -1, 20),   look: V(0, -4.6, -1) },
  wait:   { pos: V(0, -2, 17.5), look: V(0, -4.8, -1) },
  dig:    { pos: V(0, 0, 23),    look: V(0, -4.8, -1) },
  reveal: { pos: V(7, -2.5, 15), look: V(0, -4.8, 0) },
  fact:   { pos: V(-6, -1.5, 16), look: V(0, -5, 0) },
  outro:  { pos: V(0, 1.5, 21),  look: V(0, -4.6, 0) },
};

start((time, tl) => {
  const look = moveCamera(cams, tl);
  setWaterTable(GROUND_BOTTOM - 1, time); // no groundwater in this story

  const pour = tl.prog("pour"), wait = tl.prog("wait"), dig = tl.prog("dig"), reveal = tl.prog("reveal");

  // concrete level falls from the surface to the deepest room over the pour (and into the wait)
  const fillT = Math.max(0, pour) / 1.4;
  const level = pour < 0 ? 1 : lerp(0.4, DIG.floor, ease(fillT));
  fillClip.constant = -level;
  cast.visible = pour > 0;

  // pour stream into the mound
  const pouring = pour > 0 && pour < 1;
  stream.visible = pouring;
  if (pouring) {
    stream.scale.y = 8;
    stream.position.set(0, 0.7 + 4 * (1 - ease(Math.min(1, pour / 0.1))) + 4, -1.2);
  }

  // ants run until the concrete reaches them
  for (const a of ants) {
    const { c, phase, speed } = a.userData;
    const p = c.getPointAt(((time * speed + phase) % 1 + 1) % 1);
    a.position.set(p.x, p.y, 0.09);
    a.visible = dig < 0 && p.y < level - 0.1;
  }

  // a day/night time-lapse while it sets
  const lapse = wait > 0 && wait < 1 ? Math.sin(Math.PI * wait) : 0;
  const daylight = 1 - lapse * (0.5 - 0.5 * Math.cos(wait * Math.PI * 8));
  sun.intensity = 2.2 * lerp(1, 0.25, 1 - daylight);
  hemi.intensity = 1.1 * lerp(1, 0.45, 1 - daylight);
  concreteMat.color.set(wait > 0.5 ? 0xd8d5ce : 0xc9c5bd);

  // dig: the soil in the dig zone fades away and the cast fattens into full 3D
  const gone = ease(dig / 0.8);
  digGroup.visible = gone < 0.999;
  digGroup.traverse(o => {
    if (!o.material) return;
    o.material.transparent = gone > 0;
    o.material.opacity = 1 - gone;
    o.material.depthWrite = gone < 0.5;
  });
  cast.scale.z = lerp(0.3, 1, ease(dig / 0.8));

  // the cast slowly turns once it's revealed
  castRig.rotation.y = reveal > 0 ? tl.since("reveal") * 0.45 : 0;
  castRig.position.y = CAST_PIVOT.y + (reveal > 0 ? 0.6 * ease(reveal / 0.5) : 0);

  camera.lookAt(look);
});
