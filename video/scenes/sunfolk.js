// Example frames for "What if the Sun disappeared" in the folk cartoon style:
// day (waving at a smiling cartoon Sun), sudden night (scared), freezing (thermometer, frost).
import { THREE, scene, camera, sun, hemi, setWaterTable, GROUND_BOTTOM, groundBox, house, tree, box, solid, V, start, fxOptions, ease } from "./kit.js";
import { folk, outline, canvasPlane } from "./folk.js";

const daySky = scene.background;

fxOptions.ao = false;
setWaterTable(GROUND_BOTTOM - 1, 0);
groundBox(-40, 40, GROUND_BOTTOM, 0, -60, 10);
const home = house(0, -9, 11);
const trees = [tree(-7, -6, 1.2), tree(7.5, -8, 1.3)];
// cartoon ink outlines on the set too
const toOutline = [];
for (const g of [home, ...trees]) g.traverse(m => { if (m.isMesh && m.geometry.type !== "ExtrudeGeometry") toOutline.push(m); });
toOutline.forEach(outline);

// a big smiling cartoon Sun
const sunFace = canvasPlane(6, 6, (g, w, h) => {
  const c = w / 2;
  g.fillStyle = "#ffcf33"; g.strokeStyle = "#1b1717"; g.lineWidth = 14;
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(c + Math.cos(a - 0.12) * 150, c + Math.sin(a - 0.12) * 150); g.lineTo(c + Math.cos(a) * 240, c + Math.sin(a) * 240); g.lineTo(c + Math.cos(a + 0.12) * 150, c + Math.sin(a + 0.12) * 150); g.closePath(); g.fill(); g.stroke(); }
  g.beginPath(); g.arc(c, c, 150, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#1b1717"; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(c + sx * 50, c - 20, 14, 22, 0, 0, 7); g.fill(); }
  g.lineWidth = 12; g.beginPath(); g.arc(c, c + 20, 55, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
  g.fillStyle = "rgba(255,120,80,0.6)"; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(c + sx * 90, c + 30, 22, 12, 0, 0, 7); g.fill(); }
});
sunFace.position.set(-1.6, 7.2, -6);
sunFace.scale.setScalar(0.55);
scene.add(sunFace);

const kyle = folk({ body: 0xe03a2e, outfit: "polo", name: "Kyle", hairStyle: "tuft", hair: 0x8a5a2b, shoes: 0x2c2c2c, face: "grin" });
kyle.position.set(0.3, 0, 0.6);
scene.add(kyle);
const frost = new THREE.Mesh(new THREE.PlaneGeometry(80, 70), new THREE.MeshToonMaterial({ color: 0xeef6ff, transparent: true, opacity: 0 }));
frost.rotation.x = -Math.PI / 2; frost.position.set(0, 0.02, -25); scene.add(frost);
const thermo = canvasPlane(1.2, 0.6, (g, w, h) => {
  g.fillStyle = "#1c2733"; g.fillRect(0, 0, w, h); g.strokeStyle = "#fff"; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
  g.fillStyle = "#7fd3ff"; g.font = "bold 96px Arial"; g.textAlign = "center"; g.fillText("-20°C", w / 2, h * 0.66);
});
thermo.position.set(-0.55, 1.95, 0.0); scene.add(thermo);
box(-0.59, -0.51, 0, 1.65, -0.05, 0.05, solid(0x5d4037));
const stars = new THREE.Points(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 600 }, () => V((Math.random() - 0.5) * 120, 6 + Math.random() * 40, -40 - Math.random() * 20))),
  new THREE.PointsMaterial({ color: 0xffffff, size: 2.5, sizeAttenuation: false }));
scene.add(stars);
const windows = [];
home.traverse(o => { if (o.isMesh && o.material.color?.getHex() === 0x3b6fa8) windows.push(o); });

start((time, tl) => {
  const night = tl.shot !== "day";
  scene.background = night ? new THREE.Color(0x060914) : daySky;
  stars.visible = night;
  sunFace.visible = !night;
  sun.intensity = night ? 0.15 : 2.2;
  hemi.intensity = night ? 0.55 : 1.1;
  hemi.color.set(night ? 0x7f95c8 : 0xdff1ff);
  for (const w of windows) w.material.emissive?.setRGB(night ? 1.1 : 0, night ? 0.8 : 0, night ? 0.35 : 0);
  frost.material.opacity = tl.shot === "cold" ? 0.75 : 0;
  thermo.visible = tl.shot === "cold";
  if (tl.shot === "day") { kyle.pose({ armL: [2.4, 0.2, 0.3 + 0.3 * Math.sin(time * 8)], armR: [0.3, 0.1, 0.2], headTilt: -0.35 }); kyle.setFace("grin"); kyle.rotation.y = 0.35; }
  if (tl.shot === "night") { kyle.pose({ armL: [0.9, 0.9, 1.6], armR: [0.9, 0.9, 1.6], headTilt: -0.15, lean: -0.08 }); kyle.setFace("scared", { sweat: true }); kyle.rotation.y = 0.15; }
  if (tl.shot === "cold") { kyle.pose({ armL: [0.5, 1.3, 2.3], armR: [0.5, 1.3, 2.3], sway: 0.05 * Math.sin(time * 40) }); kyle.setFace("grumpy"); kyle.rotation.y = -0.1; kyle.position.x = 0.45; } else kyle.position.x = 0.3;
  const cam = { day: [V(1.2, 1.2, 5.6), V(-0.3, 3.0, -3)], night: [V(0.6, 1.4, 4.2), V(0.2, 1.6, -2)], cold: [V(0.0, 1.5, 4.4), V(0.0, 1.45, 0)] }[tl.shot];
  camera.position.copy(cam[0]); camera.lookAt(cam[1]);
});
