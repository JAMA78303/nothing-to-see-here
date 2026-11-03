// Style test: "folk" characters outdoors in bright daylight (bowler + vest + cane, pork-pie + bow tie + gavel).
import { THREE, scene, camera, sun, hemi, setWaterTable, groundBox, GROUND_BOTTOM, cloud, tree, box, solid, V, start, fxOptions } from "./kit.js";
import { folk } from "./folk.js";

fxOptions.ao = false;   // ambient occlusion blacks out the near table with these materials

setWaterTable(GROUND_BOTTOM - 1, 0);
groundBox(-40, 40, GROUND_BOTTOM, 0, -60, 10);
sun.position.set(-8, 14, 10);
for (const [x, y, z, s] of [[-8, 9, -30, 2.2], [10, 11, -38, 2.6]]) cloud(x, y, z, s);
tree(-7, -12, 1.2); tree(8, -16, 1.4);
// a wooden table to stand next to, like a market stall
box(0.5, 2.6, 0.75, 0.85, -1.4, -0.2, solid(0xb5652e));
for (const [x, z] of [[0.6, -1.3], [2.5, -1.3], [0.6, -0.3], [2.5, -0.3]]) box(x - 0.05, x + 0.05, 0, 0.75, z - 0.05, z + 0.05, solid(0x8a4a22));
const pig = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16), new THREE.MeshToonMaterial({ color: 0xf28fb0 }));
pig.scale.set(1.3, 1, 1); pig.position.set(1.9, 1.1, -0.8); scene.add(pig);

const gent = folk({ body: 0xe0a92c, vest: true, hat: "bowler", hatColor: 0x222222, hairStyle: "none", shoes: 0x3a2a20, face: "grumpy", cane: true }).pose({
  armL: [0.9, -0.2, 2.2], armR: [0.25, 0.25, 0.25], legL: [0.05, 0], legR: [-0.05, 0], headTilt: 0.05,
});
gent.position.set(-0.55, 0, 0); gent.rotation.y = 0.15;
const judge = folk({ body: 0x6fd1a8, hat: "porkpie", hatColor: 0x6b4a2f, hairStyle: "none", bowtie: 0xd62f2f, shoes: 0x2c2c2c, face: "smug", prop: "gavel" }).pose({
  armL: [0.9, -0.3, 2.2], armR: [2.6, 0.3, 0.3], legL: [0.05, 0], legR: [-0.05, 0], headTurn: -0.2,
});
judge.position.set(0.75, 0, -0.9); judge.rotation.y = -0.35;
scene.add(gent, judge);

start(() => {
  camera.position.set(0.05, 1.2, 4.1);
  camera.lookAt(0.05, 1.15, -0.4);
});
