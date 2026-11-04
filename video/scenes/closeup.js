// Style check: a close-up behind a shop counter, framed like the reference screenshots.
import { THREE, scene, camera, sun, hemi, setWaterTable, GROUND_BOTTOM, box, solid, canvasTex, V, start, fxOptions } from "./kit.js";
import { folk, outline } from "./folk.js";

fxOptions.ao = false;
fxOptions.dof = null;
setWaterTable(GROUND_BOTTOM - 1, 0);
scene.background = new THREE.Color(0x6aa84f);
scene.fog = null;
sun.position.set(2, 6, 8); sun.intensity = 1.6;
hemi.intensity = 1.2;
const toon = c => new THREE.MeshToonMaterial({ color: c });
// green wall, wood wainscot, posters
const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshBasicMaterial({ color: 0x8cbc66 })); wall.position.set(0, 3, -1.6); scene.add(wall);
const wood = canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#d9902f" : "#e39d3b"; g.fillRect(i * 32, 0, 32, h); g.fillStyle = "rgba(120,60,10,0.4)"; g.fillRect(i * 32, 0, 3, h); } }, 4, 1);
const wains = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.25), new THREE.MeshToonMaterial({ map: wood })); wains.position.set(0, 0.62, -1.59); scene.add(wains);
box(-5, 5, 1.22, 1.3, -1.6, -1.52, solid(0xb86e20));
for (const [x, y, c] of [[-1.35, 2.2, "#e94f9b"], [1.4, 2.25, "#f7d046"], [1.05, 1.75, "#4fa3e9"]]) {
  const t = canvasTex(128, 160, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; for (let r = 0; r < 5; r++) g.fillRect(12, 18 + r * 26, w - 24, 12); g.strokeStyle = "#7a4a1d"; g.lineWidth = 14; g.strokeRect(0, 0, w, h); });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7), new THREE.MeshBasicMaterial({ map: t })); p.position.set(x, y, -1.58); scene.add(p);
}
// counter with a card reader and a ticket
const counter = outline(box(-3, 3, 0, 0.95, -0.2, 1.4, solid(0xc9c9c9)));
const reader = new THREE.Group();
reader.add(outline(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.06), toon(0xd8cdb4))));
const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8), toon(0x666666)); stand.position.y = -0.25; reader.add(stand);
reader.position.set(-0.6, 1.35, 0.6); reader.rotation.set(-0.3, 0.5, 0); scene.add(reader);
const ticket = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.4), new THREE.MeshBasicMaterial({ map: canvasTex(128, 180, (g, w, h) => { g.fillStyle = "#3b7fd4"; g.fillRect(0, 0, w, h); g.fillStyle = "#ffd23f"; g.font = "bold 30px Arial"; g.fillText("WIN!", 20, 50); g.fillStyle = "#fff"; for (let r = 0; r < 4; r++) g.fillRect(14, 80 + r * 22, w - 28, 10); }) }));
ticket.rotation.set(-Math.PI / 2, 0, 0.4); ticket.position.set(0.35, 0.955, 0.75); scene.add(ticket);

const max = folk({ body: 0x2f8fd6, outfit: "polo", name: "Max", hairStyle: "tuft", hair: 0x9a5a22, shoes: 0x2c2c2c, face: "bored" }).pose({ armL: [0.35, 0.5, 0.6], armR: [0.35, 0.5, 0.6] });
max.position.set(0, -0.05, -0.55);
scene.add(max);

start(() => {
  camera.position.set(0.05, 1.6, 1.25);
  camera.lookAt(0.0, 1.5, -0.55);
});
