// Style test: a line-up of folk characters with drawn faces and outfits.
import { THREE, scene, camera, sun, hemi, setWaterTable, GROUND_BOTTOM, box, solid, V, start, fxOptions } from "./kit.js";
import { folk } from "./folk.js";

fxOptions.ao = false;
setWaterTable(GROUND_BOTTOM - 1, 0);
scene.background = new THREE.Color(0xffd84a);
scene.fog = null;
sun.position.set(-4, 8, 10);
hemi.intensity = 1.3;
box(-6, 6, -0.05, 0, -4, 3, solid(0xeae3d6));               // floor
box(-6, 6, 0, 0.35, -2.2, -2.1, solid(0x2aa3a0));           // teal skirting on the yellow wall
const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
wall.position.set(0, 3, -2.2); scene.add(wall);

const cast = [
  folk({ body: 0xe03a2e, outfit: "polo", name: "Kyle", hairStyle: "swoop", hair: 0x8a5a2b, shoes: 0x2c2c2c, face: "bored" }),
  folk({ body: 0x8a5a2b, outfit: "suit", tie: 0xf2b632, hairStyle: "swoop", hair: 0x8a5a2b, shoes: 0x2c2c2c, face: "grin" }).pose({ armL: [2.5, 0, 0.3], armR: [2.5, 0, 0.3] }),
  folk({ body: 0x3a8fd6, outfit: "polo", name: "Ray", hairStyle: "slick", hair: 0x1d1a1a, shoes: 0x283a6b, face: "surprised" }),
  folk({ body: 0x6fd1a8, hat: "porkpie", hatColor: 0x6b4a2f, hairStyle: "none", bowtie: 0xd62f2f, shoes: 0x2c2c2c, face: "smug" }),
];
cast.forEach((c, i) => { c.position.set(-1.5 + i * 1.0, 0, i % 2 ? -0.5 : 0.1); c.rotation.y = (1.5 - i) * 0.15; scene.add(c); });
cast[0].setFace("bored", { sweat: true });

start(() => {
  camera.position.set(0, 1.9, 6.6);
  camera.lookAt(0, 1.35, -0.5);
});
