// Max on a plain green background, for cutting out (channel art, thumbnails). ?pose=wave|point|shock
import { THREE, scene, camera, V, start } from "./kit.js";
import { setupStyle, setLight, makeMax, faceCamera } from "./style2kit.js";
setupStyle({ ink: { widthNear: 4.2, widthFar: 2.8 }, blur: { aperture: 0, maxblur: 0 } });
const pose = new URLSearchParams(location.search).get("pose") || "wave";
const max = makeMax({});
scene.background = new THREE.Color("#00ff00");
start(() => {
  setLight("day"); scene.background = new THREE.Color("#00ff00");
  camera.position.set(0, 1.25, 3.4); camera.lookAt(V(0, 1.15, 0));
  max.position.set(0, 0, 0);
  max.userData.draw(pose === "wave" ? { expr: "smile", wave: 0.8 } : pose === "point" ? { expr: "grin", prop: null, point: 1 } : { expr: "shock" });
  faceCamera(max);
});
