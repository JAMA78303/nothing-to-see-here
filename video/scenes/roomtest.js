// Style test for "folk" characters: two figures in a cozy room at night, one whispering to the other.
import { THREE, scene, camera, sun, hemi, setWaterTable, canvasTex, box, solid, V, start, fxOptions } from "./kit.js";
import { folk } from "./folk.js";

fxOptions.ao = true;
scene.background = new THREE.Color(0x1a1210);
scene.fog = null;
setWaterTable(-1000, 0);
sun.intensity = 0;
hemi.intensity = 0.35;
hemi.color.set(0xffe2c0);
hemi.groundColor.set(0x3a2418);

// ---------- the room ----------
const plank = canvasTex(512, 512, (g, w, h) => {
  for (let i = 0; i < 8; i++) {
    g.fillStyle = ["#8a5a36", "#7d5131", "#93633d", "#80542f"][i % 4];
    g.fillRect(0, i * h / 8, w, h / 8);
    g.fillStyle = "rgba(40,20,10,0.45)"; g.fillRect(0, i * h / 8, w, 3);
    for (let k = 0; k < 30; k++) { g.fillStyle = "rgba(60,30,15,0.18)"; g.fillRect(Math.random() * w, i * h / 8 + Math.random() * h / 8, 40 + Math.random() * 120, 2); }
  }
}, 3, 3);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ map: plank, roughness: 0.55 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
scene.add(floor);
const paper = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#e9dcc2"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#d8c49e";
  for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 * 16; x < w; x += 32) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
}, 6, 4);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshStandardMaterial({ map: paper, roughness: 0.9 }));
wall.position.set(0, 3, -3); wall.receiveShadow = true;
scene.add(wall);
const side = wall.clone(); side.rotation.y = Math.PI / 2; side.position.set(-4.5, 3, 0); scene.add(side);
box(-7, 7, 0, 0.18, -3, -2.95, solid(0x5b3a22));                          // skirting board

// window with a snowy night outside
const night = canvasTex(256, 384, (g, w, h) => {
  const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, "#1b2a55"); grad.addColorStop(1, "#4d6aa8");
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  g.fillStyle = "#dfe8ff"; for (let i = 0; i < 160; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * 2.2, 0, 7); g.fill(); }
  g.fillStyle = "#eef3ff"; g.fillRect(0, h * 0.86, w, h * 0.14);
});
const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.3), new THREE.MeshBasicMaterial({ map: night }));
pane.position.set(1.4, 2.3, -2.98);
scene.add(pane);
const frameM = solid(0xf3efe6);
for (const [x0, x1, y0, y1] of [[0.55, 2.25, 1.1, 1.18], [0.55, 2.25, 3.42, 3.5], [0.55, 0.63, 1.1, 3.5], [2.17, 2.25, 1.1, 3.5], [1.36, 1.44, 1.1, 3.5], [0.55, 2.25, 2.26, 2.33]])
  box(x0, x1, y0, y1, -2.98, -2.9, frameM);
box(0.45, 2.35, 1.02, 1.12, -2.98, -2.75, frameM);                          // sill

// heavy red curtains: wavy cloth on a gold rod
function curtain(x, w) {
  const g = new THREE.PlaneGeometry(w, 3.3, 40, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, 0.09 * Math.sin(p.getX(i) * 16));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xa3231f, roughness: 0.75, side: THREE.DoubleSide }));
  m.position.set(x, 2.15, -2.75);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
}
curtain(-0.15, 1.1); curtain(2.95, 1.1);
const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 4.4, 12), new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.8, roughness: 0.3 }));
rod.rotation.z = Math.PI / 2; rod.position.set(1.4, 3.85, -2.72);
scene.add(rod);

// coat stand and a little side table with a lamp
const brass = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.7, roughness: 0.35 });
const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.0, 12), brass); pole.position.set(-2.6, 1.0, -1.6); scene.add(pole);
for (let i = 0; i < 4; i++) { const hk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), brass); hk.position.set(-2.6 + Math.cos(i * 1.57) * 0.1, 1.9, -1.6 + Math.sin(i * 1.57) * 0.1); hk.rotation.set(Math.sin(i * 1.57) * 0.8, 0, -Math.cos(i * 1.57) * 0.8); scene.add(hk); }
const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.05, 20), brass); base.position.set(-2.6, 0.03, -1.6); scene.add(base);
const coat = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 6, 12), new THREE.MeshStandardMaterial({ color: 0xd2a03a, roughness: 0.8 })); coat.position.set(-2.55, 1.45, -1.48); scene.add(coat);
box(3.0, 3.7, 0, 0.75, -2.4, -1.7, solid(0x6b4128));
const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.3, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xf2d7a0, emissive: 0xffb04a, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
shade.position.set(3.35, 1.25, -2.05); scene.add(shade);
const lamp = new THREE.PointLight(0xffb866, 14, 9, 1.6); lamp.position.set(3.35, 1.2, -2.0); lamp.castShadow = true; scene.add(lamp);
const key = new THREE.SpotLight(0xffd9a8, 20, 14, 0.7, 0.6, 1.4); key.position.set(-1.5, 4.5, 3.5); key.target.position.set(0.6, 1, -0.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
scene.add(key, key.target);
const rimL = new THREE.PointLight(0x7fa2ff, 4, 6); rimL.position.set(1.4, 2.4, -2.3); scene.add(rimL);

// ---------- the characters ----------
const ann = folk({ body: 0x6b3fa0, hair: 0x1a1717, hairStyle: "slick", shoes: 0x283a6b, buttons: true, face: "smug" }).pose({
  headTilt: 0.15, headTurn: -0.5, headRoll: -0.15, lean: 0.12, armL: [0.25, 0.2, 0.3], armR: [0.35, 1.2, 1.9], legL: [0.12, 0.1], legR: [-0.1, 0.05],
});
ann.position.set(0.1, 0, -0.6); ann.rotation.y = 0.55;
const ben = folk({ body: 0xf0c330, hair: 0x7a4a26, hairStyle: "bowl", shoes: 0x5a3a24, face: "surprised" }).pose({
  headTilt: -0.05, headTurn: 0.25, armL: [0.15, 0.6, 1.0], armR: [0.3, 0.1, 0.2], legL: [0.05, 0], legR: [-0.15, 0.1],
});
ben.position.set(0.95, 0, -0.3); ben.rotation.y = -0.6;
scene.add(ann, ben);

start((time) => {
  ann.userData.parts.neck.rotation.z = -0.15 + 0.04 * Math.sin(time * 3);
  camera.position.set(0.55, 1.45, 3.6);
  camera.lookAt(0.5, 1.15, -0.5);
});
