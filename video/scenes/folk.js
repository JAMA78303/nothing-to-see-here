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
const HEAD = toon(0xfbf9f5);
// cartoon outline: the back faces of the mesh pushed out along the normals, drawn in ink
const OUTLINE = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: { w: { value: 0.012 } },
  vertexShader: "uniform float w; void main() { vec3 p = position + normal * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
  fragmentShader: "void main() { gl_FragColor = vec4(0.086, 0.075, 0.075, 1.0); }",
});
function outline(mesh) {
  const o = new THREE.Mesh(mesh.geometry, OUTLINE);
  o.raycast = () => {};
  mesh.add(o);
  return mesh;
}

// a thin limb from the group's origin along -y, of the given length
function stick(len, r = 0.022) {
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
  const hairM = toon(o.hair);
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
  const neck = new THREE.Group();
  neck.position.y = 0.55;
  torso.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.27;
  neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 30), HEAD);
  skull.scale.set(1.0, 0.92, 0.95);
  head.add(outline(skull));
  // drawn-on face: bold brows, eyes and a small mouth, sitting on the front of the head
  const R = 0.3;
  const onFace = (m, x, y, lift = 0.004) => { m.position.set(x, y, Math.sqrt(Math.max(0, R * R - x * x - y * y)) * 0.95 + lift); head.add(m); return m; };
  const faces = {};
  const face = (name, build) => { const g = new THREE.Group(); const prev = head; build((m, x, y, l) => { onFace(m, x, y, l); prev.remove(m); g.add(m); }); head.add(g); g.visible = false; faces[name] = g; };
  const brow = (ang, len = 0.12) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, len, 4, 8), INK); m.rotation.z = Math.PI / 2 + ang; m.scale.z = 0.4; return m; };
  const eye = (w, h) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), INK); m.scale.set(w, h, 0.35); return m; };
  const mouthArc = (r, up) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.011, 6, 16, Math.PI * 0.8), INK); m.rotation.z = up ? Math.PI * 1.1 : Math.PI * 0.1; m.scale.z = 0.4; return m; };
  const dot = (w, h) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), INK); m.scale.set(w, h, 0.35); return m; };
  face("neutral", put => { put(brow(0.05), -0.1, 0.12); put(brow(-0.05), 0.1, 0.12); put(eye(0.9, 1.3), -0.09, 0.03); put(eye(0.9, 1.3), 0.09, 0.03); put(mouthArc(0.035, true), 0, -0.1); });
  face("grumpy", put => { put(brow(-0.38), -0.095, 0.1); put(brow(0.38), 0.095, 0.1); put(eye(1.25, 0.65), -0.09, 0.03); put(eye(1.25, 0.65), 0.09, 0.03); put(mouthArc(0.04, false), 0, -0.12); });
  face("smug", put => { put(brow(0.25), -0.1, 0.13); put(brow(-0.05), 0.1, 0.11); put(eye(1.3, 0.55), -0.09, 0.03); put(eye(1.3, 0.55), 0.09, 0.03); put(dot(1.2, 0.7), 0.04, -0.1); });
  face("surprised", put => { put(brow(0.12), -0.1, 0.16); put(brow(-0.12), 0.1, 0.16); put(eye(0.9, 1.5), -0.09, 0.04); put(eye(0.9, 1.5), 0.09, 0.04); put(dot(1.3, 1.7), 0, -0.11); });
  face("happy", put => { put(brow(0.12), -0.1, 0.13); put(brow(-0.12), 0.1, 0.13); put(mouthArc(0.035, false), -0.09, 0.04); put(mouthArc(0.035, false), 0.09, 0.04); put(mouthArc(0.06, true), 0, -0.08); });
  const setFace = name => Object.entries(faces).forEach(([k, g]) => (g.visible = k === name));
  setFace(o.face);
  if (o.hairStyle !== "none") {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.315, 40, 24, 0, Math.PI * 2, 0, Math.PI * (o.hairStyle === "bowl" ? 0.5 : 0.42)), hairM);
    cap.scale.set(1.0, 0.95, 0.98);
    cap.rotation.x = o.hairStyle === "slick" ? -0.55 : -0.2;
    cap.position.y = 0.01;
    head.add(outline(cap));
    if (o.hairStyle === "slick") {           // swept-back hair with a curl at the front
      const curl = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.03, 10, 18, Math.PI * 1.4), hairM);
      curl.position.set(0.08, 0.25, 0.14); curl.rotation.set(0.4, 0.5, 0.2);
      head.add(curl);
    }
    if (o.hairStyle === "bowl") {            // a fringe that hangs over the forehead
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 40, 16, -Math.PI * 0.45, Math.PI * 0.9, Math.PI * 0.32, Math.PI * 0.16), hairM);
      head.add(fringe);
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
    const crown = outline(new THREE.Mesh(new THREE.SphereGeometry(0.22, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), hatM));
    crown.scale.y = 0.8; crown.position.y = 0.2; head.add(crown);
    const brim = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.025, 32), hatM)); brim.position.y = 0.2; brim.scale.z = 0.92; head.add(brim);
    head.rotation.z = 0;
  }
  if (o.hat === "porkpie") {
    const crown = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.15, 28), hatM)); crown.position.y = 0.3; head.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.04, 28), toon(0xf2e6c4)); band.position.y = 0.26; head.add(band);
    const brim = outline(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.022, 32), hatM)); brim.position.y = 0.23; head.add(brim);
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

  // arms: shoulder -> elbow -> small round hand
  const arm = side => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.15 * side, 0.43, 0);
    torso.add(shoulder);
    shoulder.add(stick(0.26));
    const elbow = new THREE.Group();
    elbow.position.y = -0.26;
    shoulder.add(elbow);
    elbow.add(stick(0.24));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), INK);
    hand.position.y = -0.25;
    elbow.add(hand);
    return { shoulder, elbow };
  };
  // legs: hip -> knee -> chunky rounded shoe
  const leg = side => {
    const hip = new THREE.Group();
    hip.position.set(0.075 * side, 0.02, 0);
    hips.add(hip);
    hip.add(stick(0.3, 0.024));
    const knee = new THREE.Group();
    knee.position.y = -0.3;
    hip.add(knee);
    knee.add(stick(0.27, 0.024));
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
