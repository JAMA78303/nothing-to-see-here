// "Folk" characters: big round white heads with a blob of hair, egg-shaped coloured bodies,
// thin dark stick limbs and chunky rounded shoes. Posable through joint angles.
import { THREE, V } from "./kit.js";

// cel shading: three flat tones instead of a smooth gradient
const toonRamp = (() => {
  const t = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const toon = color => new THREE.MeshToonMaterial({ color, gradientMap: toonRamp });
const INK = new THREE.MeshBasicMaterial({ color: 0x161313 });
const headRamp = (() => {
  const t = new THREE.DataTexture(new Uint8Array([232, 255]), 2, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
export const HEAD = new THREE.MeshToonMaterial({ color: 0xeef1ff, gradientMap: headRamp, emissive: 0x7a7a7a });   // scenes can raise emissive at night   // nearly flat white, like a drawing
export const SKINS = [];   // tinted head materials (zombies): scenes update their emissive alongside HEAD
const R_HEAD = 0.36;
const BODY = 1.22;   // body size relative to the original egg; the head keeps its size

// ---------- 2D faces ----------
const FACE_INK = "#1b1717";
function drawFace(g, name, extras = {}) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, 512, 512);
  g.translate(256, 262); g.scale(1.5, 1.5); g.translate(-256, -262);   // big, bold features like the references
  g.lineCap = "round"; g.lineJoin = "round";
  const ex = 92, ey = 236, by = 176, my = 334;
  const line = (pts, w = 16, c = FACE_INK) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const brow = (side, tilt, lift = 0, len = 74) => { const x = 256 + side * ex, y = by - lift; line([[x - len / 2, y + tilt * side * -1], [x + len / 2, y - tilt * side * -1]], 17); };
  const oval = (x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
  const lidEye = side => { const x = 256 + side * ex; oval(x, ey + 6, 26, 22, "#6d6d6d"); g.fillStyle = "#fff"; g.fillRect(x - 30, ey - 26, 60, 26); line([[x - 32, ey], [x + 32, ey]], 9); };
  const dotEye = side => oval(256 + side * ex, ey, 15, 21, FACE_INK);
  const ringEye = (side, r = 46, pr = 13) => { const x = 256 + side * ex; g.fillStyle = "#fff"; g.beginPath(); g.arc(x, ey, r, 0, 7); g.fill(); g.strokeStyle = FACE_INK; g.lineWidth = 11; g.stroke(); oval(x, ey + 4, pr, pr, "#3a3a3a"); };
  const happyEye = side => { const x = 256 + side * ex; g.strokeStyle = FACE_INK; g.lineWidth = 13; g.beginPath(); g.arc(x, ey + 12, 26, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); };
  const teeth = (w, h, curve) => {
    g.fillStyle = "#fff"; g.strokeStyle = FACE_INK; g.lineWidth = 10;
    g.beginPath(); g.moveTo(256 - w, my - h / 2); g.quadraticCurveTo(256, my - h / 2 + curve * 0.4, 256 + w, my - h / 2);
    g.quadraticCurveTo(256 + w * 0.9, my + h / 2 + curve, 256, my + h / 2 + curve); g.quadraticCurveTo(256 - w * 0.9, my + h / 2 + curve, 256 - w, my - h / 2); g.closePath(); g.fill(); g.stroke();
    g.lineWidth = 6; for (let i = -2; i <= 2; i++) line([[256 + i * w / 3, my - h / 2 + 6], [256 + i * w / 3, my + h / 2 + curve * 0.7]], 6);
    line([[256 - w * 0.9, my + curve * 0.3], [256 + w * 0.9, my + curve * 0.3]], 6);
  };
  const faces = {
    neutral:   () => { brow(-1, 4); brow(1, 4); dotEye(-1); dotEye(1); g.strokeStyle = FACE_INK; g.lineWidth = 11; g.beginPath(); g.arc(256, my - 30, 30, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); },
    bored:     () => { brow(-1, 0, 4, 80); brow(1, 0, 4, 80); lidEye(-1); lidEye(1); oval(250, my, 22, 8, "#9a9a9a"); },
    grumpy:    () => { brow(-1, -14, -8); brow(1, -14, -8); lidEye(-1); lidEye(1); g.strokeStyle = FACE_INK; g.lineWidth = 11; g.beginPath(); g.arc(256, my + 22, 26, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); },
    smug:      () => { brow(-1, 10, 18); brow(1, -4, 0); lidEye(-1); lidEye(1); oval(272, my, 13, 8, FACE_INK); },
    surprised: () => { brow(-1, 8, 30); brow(1, 8, 30); ringEye(-1, 40, 11); ringEye(1, 40, 11); oval(256, my + 6, 20, 28, FACE_INK); },
    grin:      () => { brow(-1, 6, 12); brow(1, 6, 12); happyEye(-1); happyEye(1); teeth(64, 46, 18); },
    crazy:     () => { ringEye(-1, 50, 14); ringEye(1, 50, 14); teeth(118, 34, 30); },
    talk:      () => { brow(-1, 3, 6); brow(1, 3, 6); dotEye(-1); dotEye(1); oval(256, my + 4, 52, 30, "#3a1414"); g.fillStyle = "#fff"; g.fillRect(222, my - 22, 68, 14); oval(256, my + 22, 28, 10, "#d9534f"); },
    gross:     () => { brow(-1, -10, 26); brow(1, -10, 26); line([[ex * -1 + 256 - 26, ey - 14], [256 - ex + 22, ey], [256 - ex - 26, ey + 14]], 12); line([[256 + ex + 26, ey - 14], [256 + ex - 22, ey], [256 + ex + 26, ey + 14]], 12);
                     line([[204, my], [222, my - 10], [242, my + 4], [262, my - 10], [282, my + 4], [304, my - 8]], 10); oval(268, my + 22, 20, 16, "#e8708a"); },
    sneeze:    () => { brow(-1, 12, 30); brow(1, 12, 30); line([[256 - ex - 28, ey], [256 - ex + 28, ey + 4]], 12); line([[256 + ex - 28, ey + 4], [256 + ex + 28, ey]], 12); oval(256, my + 6, 46, 38, "#3a1414"); },
    zombie:    () => { ringEye(-1, 44, 9); oval(256 + ex, ey + 6, 30, 18, "#fff"); line([[256 + ex - 34, ey - 6], [256 + ex + 34, ey - 2]], 11); oval(256 + ex + 4, ey + 10, 7, 7, "#3a3a3a");
                     g.fillStyle = "#3a1414"; g.beginPath(); g.ellipse(266, my + 4, 48, 30, 0.15, 0, 7); g.fill(); g.strokeStyle = FACE_INK; g.lineWidth = 9; g.stroke();
                     g.fillStyle = "#fff"; g.fillRect(236, my - 22, 16, 18); g.fillRect(272, my - 24, 16, 16); g.fillRect(258, my + 18, 14, 14);
                     line([[150, 150], [190, 196]], 7, "#5a3a3a"); for (const k of [0.25, 0.5, 0.75]) { const x = 150 + 40 * k, y = 150 + 46 * k; line([[x - 10, y + 8], [x + 10, y - 8]], 5, "#5a3a3a"); } },
    scared:    () => { brow(-1, -12, 34); brow(1, -12, 34); ringEye(-1, 38, 8); ringEye(1, 38, 8); line([[200, my + 6], [218, my - 8], [238, my + 8], [256, my - 8], [274, my + 8], [294, my - 8], [312, my + 6]], 9); },
  };
  (faces[name] || faces.neutral)();
  if (extras.mustache) {                  // a thick old-fashioned moustache
    g.fillStyle = extras.mustache; g.strokeStyle = FACE_INK; g.lineWidth = 6;
    g.beginPath(); g.moveTo(256, my - 34);
    g.bezierCurveTo(226, my - 50, 176, my - 40, 168, my - 14); g.bezierCurveTo(200, my - 22, 230, my - 18, 256, my - 22);
    g.bezierCurveTo(282, my - 18, 312, my - 22, 344, my - 14); g.bezierCurveTo(336, my - 40, 286, my - 50, 256, my - 34);
    g.fill(); g.stroke();
  }
  if (extras.sweat) {                     // a cartoon sweat drop at the top of the head
    g.fillStyle = "#6fc3ff"; g.strokeStyle = "#2a6fb0"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(430, 60); g.quadraticCurveTo(470, 130, 430, 150); g.quadraticCurveTo(390, 130, 430, 60); g.fill(); g.stroke();
  }
}
// cartoon outline: the back faces of the mesh pushed out along the normals, drawn in ink
const OUTLINE = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: { w: { value: 0.026 } },
  vertexShader: "uniform float w; void main() { vec3 p = position + normal * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
  fragmentShader: "void main() { gl_FragColor = vec4(0.086, 0.075, 0.075, 1.0); }",
});
export function canvasPlane(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = Math.round(512 * w / Math.max(w, h)); c.height = Math.round(512 * h / Math.max(w, h));
  draw(c.getContext("2d"), c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
}
export function outline(mesh) {
  const o = new THREE.Mesh(mesh.geometry, OUTLINE);
  o.raycast = () => {};
  mesh.add(o);
  return mesh;
}

// a thin limb from the group's origin along -y, of the given length
function stick(len, r = 0.036) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), INK);
  m.position.y = -len / 2;
  return m;
}

/**
 * opts: body (colour), hair (colour), hairStyle ("slick" | "bowl" | "bun" | "none"), shoes (colour),
 *       buttons (bool), eyes (bool), height scale (default 1)
 * Returns a group with .pose(p) taking angles in radians:
 *   { headTilt, headTurn, lean, armL: [raise, forward, elbow], armR: [...], legL: [swing, knee], legR: [...] }
 */
export function folk(opts = {}) {
  const o = { body: 0x7b4ea3, hair: 0x1d1a1a, hairStyle: "slick", shoes: 0x2b3a67, buttons: false, face: "neutral", hat: null, hatColor: 0x1d1a1a, bowtie: null, vest: false, cane: false, prop: null, ...opts };
  const root = new THREE.Group();
  const bodyM = toon(o.body);
  // hair: base colour with lighter highlight streaks running from the crown
  const hairTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d");
    const base = new THREE.Color(o.hair);
    g.fillStyle = "#" + base.getHexString(); g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#" + base.clone().lerp(new THREE.Color(0xffffff), 0.35).getHexString(); g.lineWidth = 5; g.lineCap = "round";
    g.lineWidth = 6;
    for (let i = 0; i < 9; i++) { const y = 40 + i * 20, x0 = (i * 53) % 120; g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo(x0 + 70, y - 14, x0 + 150, y + 6); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
    return t;
  })();
  const hairM = new THREE.MeshToonMaterial({ color: 0xffffff, map: hairTex, gradientMap: toonRamp });
  const shoeM = toon(o.shoes);

  // hips sit at y = 0.62; the whole figure is ~1.75 tall
  const hips = new THREE.Group();
  hips.position.y = 0.62;
  root.add(hips);

  // egg-shaped body: wider at the bottom
  const torso = new THREE.Group();
  hips.add(torso);
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 20), bodyM);
  const ep = egg.geometry.attributes.position;
  for (let i = 0; i < ep.count; i++) {
    const y = ep.getY(i);
    const k = y < 0 ? 1.12 : 0.88 - 0.12 * (y / 0.2);
    ep.setX(i, ep.getX(i) * k); ep.setZ(i, ep.getZ(i) * k * 0.86);
  }
  egg.geometry.computeVertexNormals();
  egg.scale.y = 1.55;
  egg.position.y = 0.26;
  torso.add(outline(egg));
  if (o.buttons) {
    const gold = new THREE.MeshStandardMaterial({ color: 0xd9a63a, roughness: 0.3, metalness: 0.7 });
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), gold);
      b.position.set(0.07, 0.36 - i * 0.09, 0.165 - i * 0.004);
      torso.add(b);
    }
  }

  // head: a big soft white ball, slightly squashed, with a blob of hair
  torso.scale.setScalar(BODY);
  const neck = new THREE.Group();
  neck.position.y = 0.55;
  neck.scale.setScalar(1 / BODY);
  torso.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.3;
  neck.add(head);
  const skinM = o.skin ? Object.assign(HEAD.clone(), { color: new THREE.Color(o.skin) }) : HEAD;
  if (o.skin) SKINS.push(skinM);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(R_HEAD, 40, 30), skinM);
  skull.scale.set(1.0, 0.92, 0.95);
  head.add(outline(skull));
  // drawn-on 2D face: a canvas painted onto a patch over the front of the head
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = faceCanvas.height = 512;
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  const patch = new THREE.Mesh(
    new THREE.SphereGeometry(R_HEAD * 1.004, 48, 48, Math.PI / 2 - 0.85, 1.7, Math.PI / 2 - 0.85, 1.7),
    new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, alphaTest: 0.05 }),
  );
  skull.add(patch);
  let currentFace = null;
  const setFace = (name, extras = {}) => {
    const key = name + JSON.stringify(extras);
    if (key === currentFace) return;
    currentFace = key;
    drawFace(faceCanvas.getContext("2d"), name, extras);
    faceTex.needsUpdate = true;
  };
  setFace(o.face);
  if (o.hairStyle !== "none") {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R_HEAD * 1.05, 40, 24, 0, Math.PI * 2, 0, Math.PI * (o.hairStyle === "bowl" ? 0.5 : o.hairStyle === "swoop" || o.hairStyle === "tuft" ? 0.36 : 0.42)), hairM);
    cap.scale.set(1.0, 0.95, 0.98);
    cap.rotation.x = o.hairStyle === "slick" ? -0.55 : o.hairStyle === "swoop" || o.hairStyle === "tuft" ? -0.12 : -0.2;
    cap.position.y = 0.01;
    head.add(outline(cap));
    if (o.hairStyle === "slick") {           // swept-back hair with a curl at the front
      const curl = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.03, 10, 18, Math.PI * 1.4), hairM);
      curl.position.set(0.08, 0.25, 0.14); curl.rotation.set(0.4, 0.5, 0.2);
      head.add(curl);
    }
    if (o.hairStyle === "bowl") {            // a fringe that hangs over the forehead
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(R_HEAD * 1.06, 40, 16, Math.PI * 0.05, Math.PI * 0.9, Math.PI * 0.32, Math.PI * 0.16), hairM);
      head.add(fringe);
    }
    if (o.hairStyle === "swoop" || o.hairStyle === "tuft") {   // side-swept fringe with a parting
      const fringeGeo = new THREE.SphereGeometry(R_HEAD * 1.07, 48, 20, Math.PI * 0.5 - Math.PI * 0.6, Math.PI * 1.2, Math.PI * 0.12, Math.PI * 0.2);
      const fp = fringeGeo.attributes.position;
      for (let i = 0; i < fp.count; i++) {        // curve the bottom edge: longer on one side, swept up on the other
        const x = fp.getX(i), y = fp.getY(i);
        if (y < R_HEAD * 0.75) fp.setY(i, y - 0.06 * Math.max(0, x / R_HEAD + 0.3) + 0.05 * Math.max(0, -x / R_HEAD - 0.2));
      }
      fringeGeo.computeVertexNormals();
      const fringe = outline(new THREE.Mesh(fringeGeo, hairM));
      fringe.rotation.set(0.12, 0, 0.32);
      head.add(fringe);
      const part = new THREE.Mesh(new THREE.SphereGeometry(R_HEAD * 1.075, 20, 8, Math.PI * 0.5 - Math.PI * 0.12, Math.PI * 0.025, Math.PI * 0.08, Math.PI * 0.24), INK);
      part.rotation.set(0.05, 0.35, 0.3);
      void part;
    }
    if (o.hairStyle === "tuft" || o.tuft) {   // a curved horn-like tuft on top
      const pts = [V(-0.05, 0.9, -0.15), V(0.0, 1.25, -0.12), V(0.12, 1.52, -0.06), V(0.3, 1.66, -0.02), V(0.46, 1.62, 0.0)].map(p => p.multiplyScalar(R_HEAD));
      const curve = new THREE.CatmullRomCurve3(pts);
      for (let i = 0; i <= 16; i++) {
        const k = i / 16;
        const ball = outline(new THREE.Mesh(new THREE.SphereGeometry(R_HEAD * (0.16 - 0.135 * k), 14, 10), hairM));
        ball.position.copy(curve.getPoint(k)).multiplyScalar(0.82).add(V(0, R_HEAD * 0.16, 0));
        head.add(ball);
      }
    }
    if (o.hairStyle === "tuft_old") {
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(R_HEAD * 1.06, 40, 16, -Math.PI * 0.45, Math.PI * 0.9, Math.PI * 0.3, Math.PI * 0.14), hairM);
      head.add(fringe);
      const tuft = outline(new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 10, 20, Math.PI * 0.9), hairM));
      tuft.position.set(0.0, R_HEAD + 0.05, -0.02); tuft.rotation.set(0, Math.PI / 2, Math.PI * 0.55);
      head.add(tuft);
    }
    if (o.hairStyle === "bun") {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), hairM);
      bun.position.set(0, 0.26, -0.16);
      head.add(bun);
    }
  }

  // hats
  const hatM = toon(o.hatColor);
  if (o.hat === "bowler") {
    const crown = outline(new THREE.Mesh(new THREE.SphereGeometry(R_HEAD * 0.84, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), hatM));
    crown.scale.y = 0.95; crown.position.y = R_HEAD * 0.52; head.add(crown);
    const brim = outline(new THREE.Mesh(new THREE.CylinderGeometry(R_HEAD * 1.22, R_HEAD * 1.22, 0.03, 32), hatM)); brim.position.y = R_HEAD * 0.52; brim.scale.z = 0.92; head.add(brim);
    head.rotation.z = 0;
  }
  if (o.hat === "hardhat") {
    const hh = toon(o.hatColor === 0x1d1a1a ? 0xf5c518 : o.hatColor);
    const dome = outline(new THREE.Mesh(new THREE.SphereGeometry(R_HEAD * 0.98, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), hh));
    dome.position.y = R_HEAD * 0.32; dome.scale.y = 0.8; head.add(dome);
    const brim = outline(new THREE.Mesh(new THREE.CylinderGeometry(R_HEAD * 1.12, R_HEAD * 1.12, 0.03, 32), hh));
    brim.position.set(0, R_HEAD * 0.32, 0.05); brim.scale.z = 1.12; head.add(brim);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, R_HEAD * 1.9), hh); ridge.position.y = R_HEAD * 0.32 + R_HEAD * 0.74; head.add(ridge);
  }
  if (o.hat === "officer") {                // peaked military cap
    const crown = outline(new THREE.Mesh(new THREE.CylinderGeometry(R_HEAD * 1.05, R_HEAD * 0.86, R_HEAD * 0.42, 28), hatM)); crown.position.y = R_HEAD * 0.82; head.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R_HEAD * 0.88, R_HEAD * 0.88, R_HEAD * 0.12, 28), toon(0x1a1a1a)); band.position.y = R_HEAD * 0.64; head.add(band);
    const visor = outline(new THREE.Mesh(new THREE.CylinderGeometry(R_HEAD * 0.7, R_HEAD * 0.7, 0.025, 24, 1, false, -Math.PI / 2, Math.PI), toon(0x1a1a1a))); visor.position.set(0, R_HEAD * 0.58, R_HEAD * 0.45); visor.rotation.x = 0.25; head.add(visor);
    const badge = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), toon(0xe0b84a)); badge.position.set(0, R_HEAD * 0.86, R_HEAD * 0.98); badge.scale.z = 0.4; head.add(badge);
  }
  if (o.hat === "porkpie") {
    const crown = outline(new THREE.Mesh(new THREE.CylinderGeometry(R_HEAD * 0.78, R_HEAD * 0.82, R_HEAD * 0.75, 28), hatM)); crown.position.y = R_HEAD * 0.92; head.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R_HEAD * 0.84, R_HEAD * 0.84, R_HEAD * 0.16, 28), toon(0xf2e6c4)); band.position.y = R_HEAD * 0.68; head.add(band);
    const brim = outline(new THREE.Mesh(new THREE.CylinderGeometry(R_HEAD * 1.18, R_HEAD * 1.18, 0.03, 32), hatM)); brim.position.y = R_HEAD * 0.56; head.add(brim);
  }
  // bow tie at the collar
  if (o.bowtie) {
    const bt = new THREE.Group(); bt.position.set(0, 0.5, 0.13); torso.add(bt);
    const btM = toon(o.bowtie);
    for (const sx of [-1, 1]) { const w = outline(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), btM)); w.rotation.z = sx * Math.PI / 2; w.position.x = 0.065 * sx; w.scale.z = 0.5; bt.add(w); }
    bt.add(outline(new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), btM)));
  }
  // gold vest: shirt "V" at the neck, buttons and a watch chain
  if (o.vest) {
    const shirt = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 3), toon(0xffffff)); shirt.rotation.set(Math.PI, 0, 0); shirt.position.set(0, 0.47, 0.145); shirt.scale.z = 0.25; torso.add(shirt);
    const brass = toon(0xe0b84a);
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), brass); b.position.set(0, 0.36 - i * 0.075, 0.18 - i * 0.003); torso.add(b); }
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.006, 6, 20, Math.PI), brass); chain.position.set(0.05, 0.26, 0.178); chain.rotation.z = Math.PI; torso.add(chain);
    for (const sx of [-1, 1]) { const pk = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.01), INK); pk.position.set(0.1 * sx, 0.3, 0.17); torso.add(pk); }
  }

  // outfits drawn onto the front of the body
  const onBody = (m, x, y, z = 0.178) => { m.position.set(x, y, z); torso.add(m); return m; };
  if (o.outfit === "polo") {
    for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 3), toon(new THREE.Color(o.body).multiplyScalar(0.8))); c.rotation.set(0, 0, sx * 2.4); c.scale.z = 0.3; onBody(c, 0.05 * sx, 0.5, 0.15); }
    const placket = onBody(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.01), toon(new THREE.Color(o.body).multiplyScalar(0.85))), 0, 0.44, 0.165);
    onBody(new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), toon(0xffffff)), 0, 0.46, 0.172);
    void placket;
    if (o.name) {                             // name badge only when a name is given
    const badge = canvasPlane(0.21, 0.08, (g, w, h) => {
      g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.strokeStyle = "#111"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = "#d62f2f"; g.fillRect(10, 10, w - 20, 16);
      g.fillStyle = "#111"; g.font = "900 120px Arial Black, Arial"; g.textAlign = "center"; g.fillText(o.name.toUpperCase(), w / 2, h - 22);
    });
    onBody(badge, 0.08, 0.34, 0.172).rotation.y = 0.35;
    }
    const logo = canvasPlane(0.07, 0.07, (g, w, h) => {
      g.fillStyle = "#f2d48a"; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, 7); g.fill(); g.strokeStyle = "#111"; g.lineWidth = 8; g.stroke();
      g.fillStyle = "#2a7fd4"; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.28, h * 0.14, 0, 0, 7); g.fill();
    });
    onBody(logo, -0.09, 0.35, 0.168).rotation.y = -0.4;
  }
  if (o.torn) {                               // ripped shirt: jagged holes and a ragged hem
    const rip = (w, h) => canvasPlane(w, h, (g, W, H) => {
      g.fillStyle = "#" + new THREE.Color(o.body).multiplyScalar(0.45).getHexString(); g.strokeStyle = "#161313"; g.lineWidth = 10;
      g.beginPath(); const n = 9; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, r = (i % 2 ? 0.28 : 0.46) * W; g.lineTo(W / 2 + r * Math.cos(a), H / 2 + (i % 2 ? 0.28 : 0.46) * H * Math.sin(a)); } g.closePath(); g.fill(); g.stroke();
    });
    onBody(rip(0.09, 0.09), 0.06, 0.3, 0.172).rotation.y = 0.3;
    onBody(rip(0.07, 0.06), -0.1, 0.16, 0.185).rotation.y = -0.45;
  }
  if (o.outfit === "general") {               // army general: medal ribbons, gold buttons
    const ribbons = canvasPlane(0.12, 0.07, (g, W, H) => { const cs = ["#c0392b", "#f1c40f", "#2e86c1", "#27ae60", "#8e44ad", "#e67e22"]; for (let i = 0; i < 6; i++) { g.fillStyle = cs[i]; g.fillRect((i % 3) * W / 3 + 2, Math.floor(i / 3) * H / 2 + 2, W / 3 - 4, H / 2 - 4); } });
    onBody(ribbons, -0.08, 0.4, 0.16).rotation.y = -0.35;
    const gold = toon(0xe0b84a);
    for (let i = 0; i < 4; i++) onBody(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), gold), 0.03, 0.42 - i * 0.08, 0.18 - i * 0.003);
  }
  if (o.outfit === "suit") {
    const shirt = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 3), toon(0xffffff)); shirt.rotation.set(Math.PI, 0, 0); shirt.scale.z = 0.25; onBody(shirt, 0, 0.44, 0.16);
    const tie = outline(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.01), toon(o.tie || 0xf2b632))); onBody(tie, 0, 0.36, 0.175);
    for (const sx of [-1, 1]) { const lap = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 3), toon(new THREE.Color(o.body).multiplyScalar(0.75))); lap.rotation.set(Math.PI, 0, sx * 0.35); lap.scale.z = 0.25; onBody(lap, 0.07 * sx, 0.4, 0.168); }
  }

  // arms: shoulder -> elbow -> small round hand
  const arm = side => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.15 * side, 0.43, 0);
    torso.add(shoulder);
    shoulder.add(stick(0.26, 0.029));
    const elbow = new THREE.Group();
    elbow.position.y = -0.26;
    shoulder.add(elbow);
    elbow.add(stick(0.24, 0.029));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), INK);
    hand.position.y = -0.25;
    elbow.add(hand);
    return { shoulder, elbow };
  };
  // legs: hip -> knee -> chunky rounded shoe
  const leg = side => {
    const hip = new THREE.Group();
    hip.position.set(0.075 * side, 0.02, 0);
    hips.add(hip);
    hip.add(stick(0.3, 0.04));
    const knee = new THREE.Group();
    knee.position.y = -0.3;
    hip.add(knee);
    knee.add(stick(0.27, 0.04));
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), shoeM);
    shoe.scale.set(0.95, 0.55, 1.45);
    shoe.position.set(0, -0.3, 0.05);
    knee.add(outline(shoe));
    return { hip, knee };
  };
  const L = { armL: arm(1), armR: arm(-1), legL: leg(1), legR: leg(-1) };
  if (o.cane) {
    const cane = new THREE.Group(); cane.position.y = -0.25; L.armR.elbow.add(cane);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.95, 8), toon(0xc9a14a)); shaft.position.y = -0.45; cane.add(shaft);
    cane.add(outline(new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), toon(0xe0b84a))));
    root.userData.cane = cane;
  }
  if (o.prop === "gavel") {
    const gv = new THREE.Group(); gv.position.y = -0.25; L.armR.elbow.add(gv);
    const handle = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 8), toon(0xa0522d))); handle.position.y = -0.18; gv.add(handle);
    const headG = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 16), toon(0x8b4513))); headG.rotation.z = Math.PI / 2; headG.position.y = -0.42; gv.add(headG);
    gv.rotation.x = Math.PI;
  }

  root.userData.parts = { torso, neck, head, ...L };
  root.setFace = setFace;
  root.pose = (p = {}) => {
    torso.rotation.x = p.lean ?? 0;
    torso.rotation.z = p.sway ?? 0;
    neck.rotation.set(p.headTilt ?? 0, p.headTurn ?? 0, p.headRoll ?? 0);
    for (const [k, side] of [["armL", 1], ["armR", -1]]) {
      const [raise = 0.25, fwd = 0, bend = 0.2] = p[k] || [];
      L[k].shoulder.rotation.set(-fwd, 0, raise * side);
      L[k].elbow.rotation.set(-bend, 0, 0);
    }
    for (const k of ["legL", "legR"]) {
      const [swing = 0, knee = 0] = p[k] || [];
      L[k].hip.rotation.x = -swing;
      L[k].knee.rotation.x = knee;
    }
    return root;
  };
  // cast shadows onto the world, but don't self-shadow (that stripes the cel shading)
  root.traverse(m => { if (m.isMesh) { m.castShadow = m.material !== OUTLINE; m.receiveShadow = false; } });
  return root.pose();
}

// a simple walk cycle pose at phase t (seconds)
export function walkPose(t, speed = 1) {
  const s = Math.sin(t * 6 * speed);
  return { armL: [0.2, -0.5 * s, 0.3], armR: [0.2, 0.5 * s, 0.3], legL: [0.45 * s, Math.max(0, -s) * 0.6], legR: [-0.45 * s, Math.max(0, s) * 0.6], sway: 0.03 * s };
}
