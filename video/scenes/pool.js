// "Never drain your pool": groundwater lifts an empty pool shell out of the ground.
import {
  THREE, scene, camera, M, GROUND_BOTTOM, WATER_TABLE, box, groundWithHole, setWaterTable, waterMaterial,
  house, tree, cloud, arrow, yellowArrowMat, ease, lerp, V, moveCamera, start,
} from "./kit.js";

// Pool footprint (outer, incl. shell): x -4.4..4.4, z -6.4..0 (cut open at the front face z=0)
const P = { x0: -4.4, x1: 4.4, zBack: -6.4, shallow: -1.6, deep: -2.9, t: 0.35 };
groundWithHole(P.x0, P.x1, P.zBack, [[P.x0, 0, P.shallow], [0, P.x1, P.deep]]);

// ---------- pool shell ----------
const pool = new THREE.Group();
const t = P.t;
box(P.x0, 0, P.shallow, P.shallow + t, P.zBack, 0, M.concrete, pool);        // shallow floor
box(0, P.x1, P.deep, P.deep + t, P.zBack, 0, M.concrete, pool);              // deep floor
box(-t / 2, t / 2, P.deep, P.shallow + t, P.zBack, 0, M.concrete, pool);     // step between ends
box(P.x0, P.x0 + t, P.shallow, 0.12, P.zBack, 0, M.concrete, pool);          // left wall
box(P.x1 - t, P.x1, P.deep, 0.12, P.zBack, 0, M.concrete, pool);             // right wall
box(P.x0, P.x1, P.deep, 0.12, P.zBack, P.zBack + t, M.concrete, pool);       // back wall
box(P.x0 - 0.3, P.x1 + 0.3, 0.12, 0.22, P.zBack - 0.3, P.zBack + t, M.concrete, pool); // coping
box(P.x0 - 0.3, P.x0 + t, 0.12, 0.22, P.zBack, 0, M.concrete, pool);
box(P.x1 - t, P.x1 + 0.3, 0.12, 0.22, P.zBack, 0, M.concrete, pool);

// pool water (two boxes to follow the step)
const wm = waterMaterial();
const waterShallow = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), wm);
const waterDeep = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), wm);
pool.add(waterShallow, waterDeep);
function setPoolWater(level) { // 0 = empty, 1 = full
  const top = -0.05;
  const placeWater = (m, x0, x1, floor) => {
    const h = Math.max(0.001, (top - floor) * level);
    m.visible = level > 0.01;
    m.scale.set(x1 - x0, h, -P.zBack - 2 * t);
    m.position.set((x0 + x1) / 2, floor + h / 2, P.zBack / 2 + t / 2);
  };
  placeWater(waterShallow, P.x0 + t, -t / 2, P.shallow + t);
  placeWater(waterDeep, t / 2, P.x1 - t, P.deep + t);
}

// pivot so the shell can lift and tilt
const PIVOT = V(0, -1.5, -3.2);
const poolRig = new THREE.Group();
poolRig.position.copy(PIVOT);
poolRig.add(pool);
pool.position.copy(PIVOT).negate();
scene.add(poolRig);

// ---------- backdrop ----------
house(0, -22, 15);
house(19, -30, 9, 0.8);
tree(-12, -15, 1.2);
tree(11, -14, 1);
tree(-20, -25, 1.4);
cloud(-12, 20, -45, 2);
cloud(14, 24, -55, 2.4);

// ---------- force arrows ----------
const upArrows = new THREE.Group();
scene.add(upArrows);
for (const x of [-3.2, -1.6, 1.2, 2.6, 3.9]) {
  const a = arrow();
  a.position.set(x, (x < 0 ? P.shallow : P.deep) - 2.6, 0.4);
  a.userData.baseY = a.position.y;
  upArrows.add(a);
}
const downArrows = new THREE.Group();
pool.add(downArrows);
for (const x of [-2.6, 0, 2.6]) {
  const a = arrow(yellowArrowMat);
  a.rotation.z = Math.PI;
  a.position.set(x, 2.3, -1.2);
  downArrows.add(a);
}

// ---------- dirt burst ----------
const dirt = [];
const dirtMats = ["#6e4524", "#8a5a33", "#4f8f34"].map(c => new THREE.MeshLambertMaterial({ color: c }));
for (let i = 0; i < 70; i++) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), dirtMats[i % 3]);
  const side = i % 2 ? 1 : -1;
  m.userData = {
    o: V(side * (4.4 + Math.random() * 0.6), 0.1, -Math.random() * 6.4),
    v: V(side * (1 + Math.random() * 4), 5 + Math.random() * 7, 1 + Math.random() * 4),
    spin: Math.random() * 10,
  };
  m.scale.setScalar(0.15 + Math.random() * 0.35);
  m.castShadow = true;
  scene.add(m);
  dirt.push(m);
}
function setDirt(tau) {
  for (const m of dirt) {
    const { o, v, spin } = m.userData;
    m.visible = tau > 0 && tau < 3;
    if (!m.visible) continue;
    const y = o.y + v.y * tau - 9.8 * tau * tau;
    m.position.set(o.x + v.x * tau, Math.max(0.1, y), o.z + v.z * tau);
    m.rotation.set(spin * tau, spin * tau * 0.7, 0);
  }
}

// ---------- timeline ----------
const cams = {
  start:       { pos: V(0, 14, 44), look: V(0, 0, -12) },
  intro:       { pos: V(0, 6, 26),  look: V(0, -3.6, -8) },
  underground: { pos: V(0, -3, 24), look: V(0, -7, -4) },
  boat:        { pos: V(0, 4.5, 16), look: V(0, -2.4, -3) },
  balance:     { pos: V(0, 5, 17), look: V(0, -2, -3) },
  drain:       { pos: V(0, 5, 17), look: V(0, -2, -3) },
  push:        { pos: V(0, 2.5, 19), look: V(0, -3, -3) },
  pop:         { pos: V(0, 4, 26),  look: V(0, 0, -6) },
  outro:       { pos: V(0, 9, 36),  look: V(0, 0.5, -10) },
};

start((time, tl) => {
  const look = moveCamera(cams, tl);

  // groundwater rises during "underground"; pool water drains during "drain"
  setWaterTable(lerp(GROUND_BOTTOM, WATER_TABLE, ease(tl.prog("underground") / 0.8)), time);
  setPoolWater(1 - ease(tl.prog("drain") / 0.85));

  // arrows
  const bal = tl.prog("balance"), push = tl.prog("push");
  const upAmt = bal < 0 ? 0 : push < 0 ? 0.55 * ease(bal / 0.3) : lerp(0.55, 1.25, ease(push / 0.5));
  upArrows.visible = upAmt > 0.01 && tl.prog("outro") < 0;
  upArrows.children.forEach((a, j) => {
    const pulse = push > 0 ? 1 + 0.12 * Math.sin(time * 14 + j) : 1;
    a.scale.setScalar(Math.max(0.01, upAmt * pulse));
    a.position.y = a.userData.baseY + (push > 0 ? 0.3 * Math.sin(time * 7 + j) : 0);
  });
  const downAmt = bal < 0 ? 0 : ease(bal / 0.3) * (1 - ease(tl.prog("drain") / 0.6));
  downArrows.visible = downAmt > 0.01;
  downArrows.children.forEach(a => a.scale.setScalar(Math.max(0.01, downAmt)));

  // the pool trembles while being pushed, then pops out and tilts
  const pop = tl.prog("pop");
  let lift = 0, tilt = 0, shake = 0;
  if (push > 0 && pop < 0) { lift = 0.25 * ease(push); shake = 0.05 + 0.1 * push; }
  if (pop >= 0) {
    const p = ease(Math.min(1, pop / 0.55));
    lift = lerp(0.25, 4.2, p) - 0.6 * ease((pop - 0.55) / 0.3);
    tilt = 0.16 * p;
    shake = 0.35 * (1 - Math.min(1, pop / 0.8));
  }
  const jitter = (a, f) => shake * a * Math.sin(time * f);
  poolRig.position.set(PIVOT.x + jitter(0.4, 41), PIVOT.y + lift + jitter(0.3, 53), PIVOT.z);
  poolRig.rotation.z = tilt + jitter(0.02, 37);
  setDirt(pop >= 0 ? tl.since("pop") * 1.1 : -1);

  camera.position.x += jitter(0.25, 47);
  camera.position.y += jitter(0.2, 59);
  camera.lookAt(look);
});
