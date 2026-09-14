// LUCKY SHRINE - 福の神社 - a Lucky Cat venture
// First-person shrine approach at dusk. Light the lanterns, ring the bells, beckon the cat.
import * as THREE from './three.module.js';
import { MARK_BASE, MARK_PAW } from './mark.js';

const Q = new URLSearchParams(location.search);
const DEBUG = Q.has('debug');

// ---------- renderer ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1626); // dusk violet
scene.fog = new THREE.Fog(0x1a1626, 18, 90);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 300);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- light ----------
const hemi = new THREE.HemisphereLight(0x6a6a9a, 0x241a10, 1.0);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9ab0d8, 0.8);
moon.position.set(-18, 30, 12); moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = -30; moon.shadow.camera.right = 30;
moon.shadow.camera.top = 30; moon.shadow.camera.bottom = -30;
scene.add(moon);
// warm dusk remnant on the horizon behind the shrine
const dusk = new THREE.DirectionalLight(0xd88a4a, 0.5);
 dusk.position.set(6, 4, -40); scene.add(dusk);

// ---------- materials ----------
const M = {
  stone:  new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.9 }),
  stoneD: new THREE.MeshStandardMaterial({ color: 0x5c584e, roughness: 0.95 }),
  wood:   new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.85 }),
  woodR:  new THREE.MeshStandardMaterial({ color: 0x8e2f22, roughness: 0.7 }),  // vermilion lacquer
  gold:   new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.35, metalness: 0.7 }),
  paper:  new THREE.MeshStandardMaterial({ color: 0xf5f1e8, roughness: 0.9, emissive: 0xffd9a0, emissiveIntensity: 0 }),
  gravel: new THREE.MeshStandardMaterial({ color: 0x35322c, roughness: 1 }),
  grass:  new THREE.MeshStandardMaterial({ color: 0x2a3322, roughness: 1 }),
  porcelain: new THREE.MeshStandardMaterial({ color: 0xf5f1e8, roughness: 0.35 }),
  shu:    new THREE.MeshStandardMaterial({ color: 0xc73a24, roughness: 0.5 }),
  ink:    new THREE.MeshStandardMaterial({ color: 0x16130e, roughness: 0.6 }),
};

// ---------- seasons (auto by month, ?season= overrides) ----------
const SEASONS = {
  momiji:   { color: 0xb84a2a, size: 0.09, opacity: 0.85, fall: true,  vy: [0.25, 0.65], sway: 0.12, gravel: 0x35322c, grass: 0x2a3322, fog: 0x1a1626, bg: 0x1a1626 },
  snow:     { color: 0xf5f1e8, size: 0.055, opacity: 0.9, fall: true,  vy: [0.15, 0.35], sway: 0.22, gravel: 0x777a80, grass: 0x8b9096, fog: 0x232030, bg: 0x232030 },
  sakura:   { color: 0xf2c4ce, size: 0.075, opacity: 0.9, fall: true,  vy: [0.2, 0.45],  sway: 0.2,  gravel: 0x35322c, grass: 0x2a3322, fog: 0x1e1826, bg: 0x1e1826 },
  firefly:  { color: 0xcfe86a, size: 0.07, opacity: 0.9, fall: false, vy: [0, 0],       sway: 0.5,  gravel: 0x35322c, grass: 0x2a3322, fog: 0x141a18, bg: 0x141a18 },
  rain:     { color: 0x9ab2c8, size: 0.001, opacity: 0.0, fall: true,  vy: [3.0, 3.6], sway: 0.3,  gravel: 0x2c2e33, grass: 0x232a24, fog: 0x1c2028, bg: 0x1c2028 },
};
const _m = new Date().getMonth();
const SEASON = Q.get('season') || ([11, 0, 1].includes(_m) ? 'snow' : _m <= 4 ? 'sakura' : _m <= 7 ? 'firefly' : 'momiji');
const SC = SEASONS[SEASON] || SEASONS.momiji;
M.gravel.color.setHex(SC.gravel); M.grass.color.setHex(SC.grass);
scene.background.setHex(SC.bg); scene.fog.color.setHex(SC.fog);

// ---------- world ----------
const world = new THREE.Group(); scene.add(world);
const colliders = [];
function addBox(cx, cy, cz, w, h, d, mat, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(cx, cy, cz);
  mesh.castShadow = opts.cast !== false; mesh.receiveShadow = true;
  world.add(mesh);
  if (!opts.noCollide) colliders.push({
    min: new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2),
    max: new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2),
  });
  return mesh;
}
function addCyl(cx, cy, cz, rTop, rBot, h, mat, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 14), mat);
  mesh.position.set(cx, cy, cz);
  mesh.castShadow = opts.cast !== false; mesh.receiveShadow = true;
  world.add(mesh);
  return mesh;
}

// ground: gravel court + grass surround
addBox(0, -0.25, -10, 26, 0.5, 70, M.gravel, { cast: false });
addBox(0, -0.3, -10, 90, 0.4, 120, M.grass, { cast: false, noCollide: true });
// stone path: slabs with slight irregularity (ma - let the gaps breathe)
for (let i = 0; i < 14; i++) {
  const z = 12 - i * 3.1, x = (i % 2 ? 0.14 : -0.12);
  addBox(x, 0.04, z, 2.3 + (i % 3) * 0.15, 0.12, 2.2, i % 2 ? M.stone : M.stoneD, { cast: false, noCollide: true });
}
// side walls (invisible bounds as hedges)
addBox(-13.2, 2, -10, 0.6, 4, 70, M.grass);
addBox(13.2, 2, -10, 0.6, 4, 70, M.grass);
addBox(0, 2, 24.5, 26, 4, 0.6, M.grass);
addBox(0, 2, -44.5, 26, 4, 0.6, M.grass);

const TORII_SNOW = new THREE.MeshStandardMaterial({ color: 0xe6ecf1, roughness: 0.92, metalness: 0.02 });
let toriiSnow = 0; // v67
const toriiRime = []; // v128: the torii legs' foot-drifts take the same rime on their windward faces
const slotRime = []; // v132: frost rims the offering box's coin slots
const dripMotes = []; let dripCount = 0, nextDripT = 0; // v130: meltwater drips off the thaw-wet rack cords
let nextFurinDripT = 0, furinDrips = 0; // v133: the chime thaws with a tear
// torii gate (vermilion, at the approach)
function torii(z, scale = 1) {
  const g = new THREE.Group();
  const legH = 4.6 * scale, spread = 3.4 * scale;
  const legL = addCyl(-spread / 2, legH / 2, z, 0.16 * scale, 0.2 * scale, legH, M.woodR);
  const legR = addCyl(spread / 2, legH / 2, z, 0.16 * scale, 0.2 * scale, legH, M.woodR);
  g.add(legL, legR);
  const top = new THREE.Mesh(new THREE.BoxGeometry(spread + 1.6 * scale, 0.3 * scale, 0.4 * scale), M.woodR);
  top.position.set(0, legH + 0.15 * scale, z); top.castShadow = true; g.add(top);
  const topCap = new THREE.Mesh(new THREE.BoxGeometry(spread + 2.0 * scale, 0.16 * scale, 0.5 * scale), M.ink);
  topCap.position.set(0, legH + 0.38 * scale, z); topCap.castShadow = true; g.add(topCap);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(spread + 0.5 * scale, 0.22 * scale, 0.3 * scale), M.woodR);
  tie.position.set(0, legH - 0.8 * scale, z); tie.castShadow = true; g.add(tie);
  const tab = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.7 * scale, 0.1 * scale), M.gold);
  tab.position.set(0, legH - 0.35 * scale, z); g.add(tab);
  if (SEASON === 'snow') {
    // v67: snow gathers along the top lintel - a drift line on the cap's shelf, a crown ridge at the middle
    const drift = new THREE.Mesh(new THREE.BoxGeometry(spread + 2.24 * scale, 0.06 * scale, 0.6 * scale), TORII_SNOW);
    drift.position.set(0, legH + 0.49 * scale, z); g.add(drift);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(spread + 1.2 * scale, 0.05 * scale, 0.3 * scale), TORII_SNOW);
    crown.position.set(0, legH + 0.545 * scale, z); g.add(crown);
    toriiSnow += 2;
    // v128: snow piles at the legs' feet, and the approach face of each drift frosts
    for (const sx of [-1, 1]) {
      const fd = new THREE.Mesh(new THREE.SphereGeometry(0.3 * scale, 10, 7), TORII_SNOW);
      fd.scale.set(1, 0.38, 1);
      fd.position.set(sx * spread / 2 + sx * 0.06 * scale, 0.04, z + 0.05 * scale);
      g.add(fd); toriiSnow++;
      const fp = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * scale, 0.2 * scale),
        new THREE.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.95, transparent: true, opacity: 0, emissive: 0xc9dae8, emissiveIntensity: 0.9 }));
      fp.position.set(sx * spread / 2 + sx * 0.06 * scale, 0.12, z + 0.05 * scale + 0.29 * scale);
      g.add(fp); toriiRime.push(fp);
    }
  }
  world.add(g);
  colliders.push({ min: new THREE.Vector3(-spread / 2 - 0.2, 0, z - 0.2), max: new THREE.Vector3(-spread / 2 + 0.2, legH, z + 0.2) });
  colliders.push({ min: new THREE.Vector3(spread / 2 - 0.2, 0, z - 0.2), max: new THREE.Vector3(spread / 2 + 0.2, legH, z + 0.2) });
}
torii(6, 1.0);
torii(-10, 0.85);
// v82: the cat's trail - paw prints in the fresh snow along the approach, crisp
// near the steps and fading toward the entrance as the snow deepens over them
let paws = 0;
let snowHump = 0; // v83
let humpKoban = 0; // v84
let visitor = 0; // v85
let ret = 0; // v89: return-visit meshes
// v86: the snow keeps falling - refs for the slow self-burial of the hump scene
const humpGrowMeshes = []; // {m, sx, sy, sz, gy}
const visitorPrints = [];  // {m, op}
const pawPrints = [];       // v90: {m, op} the main trail fades as fresh snow falls
const spurPrints = [];      // v91: {m, op} the spur re-fills one step behind
const foxTracks = [];       // v107: {m, op, reveal} a single-file fox line, the first thing new snow covers
let traxArmed = false, traxLive = false, traxT0 = 0; // v107: armed by a watch gust while the gates smoke, live when the wind dies
let traxErode = 0; // v109: a windy spell combs the pads soft before the snow fills them
let printFillE = 0; // v115: the night's fall quietly fills the visitor's crossing back in
let rimeCold = 0, rimeE = 0; const kobanRime = []; // v116: the guardian's watch-breath frosts the kobans through the coldest hours
const kobanRimeGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.027, 16); // v116
const frostTint = new THREE.Color(0xeef5fa); // v117: the glass and the coin share one cold
let flapAmpNow = 1, flapSpdNow = 2.2; // v118: the tanzaku's live flutter envelope
let stripFreeze = 0; // v140: hard gusts in the cold freeze the tied strips stiff
const ladleFeathers = []; // v119: the rime creeping down the ladle's wood grain
const ladleBarbGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.06, 6); // v119
const emaCornerFrost = []; // v120: corner rime on each plaque - the newest wishes take the cold hardest
const emaWet = []; let wetE = 0; // v126: the dawn thaw wets the plaques and the ink darkens
const wetTint = new THREE.Color(0xc4b8a4); // v126: damp wood
const emaFrostGeo = new THREE.PlaneGeometry(0.09, 0.07); // v120
const basinIce = []; // v121: ice rimming the rain-chain basins, thickening inward through the cold
const basinIceGeos = [new THREE.RingGeometry(0.3, 0.36, 16), new THREE.RingGeometry(0.26, 0.32, 16), new THREE.RingGeometry(0.22, 0.28, 16)]; // v121
const lintelCrust = []; let crustSheds = 0, crustSheds2 = 0, prevCrustBreeze = null; // v122: the gates grow a crust through the cold, the gusts crack it off as plume
const lintelCrustGeo = new THREE.BoxGeometry(1, 0.025, 0.55); // v122
const guardianRime = []; // v124: rime on the windward faces of the guardians' plinth drifts
let humpKobanMesh = null, humpKobanLip = null;
let humpKobanMesh2 = null, humpGroupRef = null; // v89: the visitor returns
let humpEma = null; let ema2 = 0; // v93: the returning visitor's ema offering
let humpOmi = null; let omiS = 0; // v94: an omikuji strip slipped under the newest koban
let humpAcc = 0; try { humpAcc = Math.min(1, Math.max(0, +localStorage.getItem('ls_hump_acc') || 0)); } catch (e) {}
let humpBreathPhase = 0; // v88: the hump breathes - one slow cycle per long minute
let breathRate = 1; // v112
const earHollows = []; // v113: {dm, rm} two breath-warmed dips above the ear tips
const earHollowGeo = new THREE.CircleGeometry(0.055, 12); // v113
const earHollowRimGeo = new THREE.RingGeometry(0.055, 0.072, 14); // v113
const earHollowMat0 = new THREE.MeshStandardMaterial({ color: 0xb9c6d2, roughness: 0.9, transparent: true, opacity: 0 }); // v113: the shaded dip
const earHollowRimMat0 = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.9, transparent: true, opacity: 0 }); // v113: the snow lip

// v114: snow creaking underfoot - the cold answers each step with a squeak,
// but only where the drifts lie deep; the swept path stays silent
const DRIFTS = [
  { x: 4.9, z: -16, rx: 2.2, rz: 4.6, d: 1 }, // the sastrugi field east of the path (v104)
  { x: 4.3, z: -29, rx: 2.6, rz: 2.2, d: 1 }, // the hump drift itself
  { x: 5.8, z: -26.4, rx: 1.6, rz: 1.8, d: 0.8 }, // the open ground the first visitor crossed (v85)
];
function snowDepthAt(x, z) {
  if (SEASON !== 'snow') return 0;
  let d = 0;
  for (const r of DRIFTS) {
    const u = (x - r.x) / r.rx, v = (z - r.z) / r.rz, q = u * u + v * v;
    if (q < 1) d = Math.max(d, r.d * (1 - q));
  }
  return d;
}
let strideAcc = 0, creakSteps = 0, creaks = 0, creakD = 0;
function footstep() {
  creakSteps++;
  const d = snowDepthAt(player.pos.x, player.pos.z);
  if (d <= 0.45) return; // shallow snow packs without a sound
  creaks++; creakD = d;
  const f = 620 - 260 * d + Math.random() * 90; // deeper drift, lower groan
  tone(f * 1.6, f, 'sawtooth', 0.09 + 0.08 * d, 0.05 + 0.05 * d);
  if (d > 0.75 && Math.random() < 0.5) setTimeout(() => tone(f * 1.4, f * 0.9, 'sawtooth', 0.07, 0.03), 90 + Math.random() * 60); // the deepest snow settles with a second small groan
}
const hoarNeedles = []; let hoarE = 0; let hoarFilm = null, hoarMat = null; // v100: the fox's breath froze into hoar where it stood
let hoarStir = 0, stirCount = 0; // v101: the sleeper's breath rides a watch gust out to the feathers
let kobanRay = 0; // v102: dawn touches the second koban first
let sealRay = 0, omiSealMat = null; // v103: the seal answers a heartbeat after the koban
const sasRidges = []; let sasMig = 0; // v104: sastrugi - wind-combed ripples on the courtyard drifts
const plumeMotes = []; let plumeCount = 0, nextPlumeT = 0, plumeG2 = 0; // v105: snow smoking off the torii lintel drifts
const plumeGates = [{ w: 5.64, y: 5.12, z: 6 }, { w: 4.79, y: 4.35, z: -10 }]; // the v67 drift lines
const plumeGeo = new THREE.SphereGeometry(0.032, 6, 5);
const catBreathGeo = new THREE.SphereGeometry(0.045, 7, 5);
const catBreathMat = new THREE.MeshStandardMaterial({ color: 0xeef3f6, roughness: 1, transparent: true, opacity: 0.3, emissive: 0xbccfda, emissiveIntensity: 0.85, depthWrite: false });
const catBreathPuffs = []; let catBreaths = 0, prevHbr = null; // v135: the sleeper's breath fogs at the hollow
const plumeMat = new THREE.MeshStandardMaterial({ color: 0xf0f5f8, roughness: 0.9, transparent: true, opacity: 0.7, emissive: 0x9fb2c0, emissiveIntensity: 0.45 });
// v89: on a later snow visit the visitor returns - a fresher ring beside the first
// (kept out of the v86 softening, so the new prints stay crisp) and a second koban
// half-leaning on the first, sinking slower, being newer
function buildVisitorReturn() {
  if (ret > 0) return;
  const bootGeo2 = new THREE.CircleGeometry(0.05, 8);
  let rseed = 5511;
  const rrnd = () => (rseed = (rseed * 16807) % 2147483647) / 2147483647;
  const rprint = (x, z, dir, op) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0xd6e0e8, roughness: 0.5, transparent: true, opacity: op, emissive: 0x8fa5b5, emissiveIntensity: 0.25 });
    const fp = new THREE.Mesh(bootGeo2, mat);
    fp.rotation.x = -Math.PI / 2; fp.rotation.z = -dir;
    fp.scale.set(0.62, 1.45, 1);
    fp.position.set(x, 0.021, z);
    world.add(fp); ret++;
  };
  const rlat = i => (i % 2 === 0 ? 1 : -1) * 0.09;
  let rx = 5.9, rz = -26.8;
  const rdir = Math.atan2(5.3 - rx, -28.3 - rz);
  for (let i = 0; i < 4; i++) {
    rprint(rx + rlat(i) * Math.cos(rdir), rz - rlat(i) * Math.sin(rdir), rdir, 0.24 + rrnd() * 0.05);
    rx += Math.sin(rdir) * 0.45; rz += Math.cos(rdir) * 0.45;
  }
  const cx2 = 4.75, cz2 = -28.75, cr2 = 0.72, ring2 = 10, th1 = 1.15;
  for (let i = 0; i <= ring2; i++) {
    const th = th1 + (i / ring2) * Math.PI * 2;
    const th2 = th1 + ((i + 1) / ring2) * Math.PI * 2;
    const px = cx2 + Math.sin(th) * cr2, pz = cz2 + Math.cos(th) * cr2;
    const rd = Math.atan2(cx2 + Math.sin(th2) * cr2 - px, cz2 + Math.cos(th2) * cr2 - pz);
    rprint(px + rlat(i) * Math.cos(rd) * 0.8, pz - rlat(i) * Math.sin(rd) * 0.8, rd, 0.24 + rrnd() * 0.05);
  }
  const kb2 = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.024, 16),
    new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.35, metalness: 0.7, emissive: 0xffb46a, emissiveIntensity: 0.22 }));
  kb2.scale.set(0.82, 1, 1.35);
  kb2.rotation.x = Math.PI / 2 - 1.04; // a touch more upright than the first
  kb2.rotation.z = -0.24;              // leaning the other way, onto the first coin
  kb2.position.set(0.56, 0.095, 0.13);
  kb2.userData.y0 = 0.095;
  humpGroupRef.add(kb2); ret++;
  humpKobanMesh2 = kb2;
  // v93: and a small ema plaque leaning beside the kobans - an ink paw print for
  // the wish, its vermilion cord trailing loose in the snow; it sinks with the burial
  {
    const pc = document.createElement('canvas'); pc.width = 128; pc.height = 160;
    const q = pc.getContext('2d');
    q.fillStyle = '#d8b988'; q.beginPath();
    q.moveTo(14, 150); q.lineTo(14, 45); q.lineTo(64, 10); q.lineTo(114, 45); q.lineTo(114, 150); q.closePath(); q.fill();
    q.strokeStyle = 'rgba(90,60,30,.65)'; q.lineWidth = 3; q.stroke();
    q.fillStyle = '#2b2118';
    q.beginPath(); q.ellipse(64, 105, 14, 11, 0, 0, 7); q.fill();
    for (const [tx, ty] of [[44, 82], [64, 76], [84, 82]]) { q.beginPath(); q.ellipse(tx, ty, 5.5, 7, 0, 0, 7); q.fill(); }
    q.fillStyle = '#0d0b09'; q.beginPath(); q.arc(64, 26, 3.5, 0, 7); q.fill();
    const ptex = new THREE.CanvasTexture(pc);
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.2125),
      new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.8, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5, emissive: 0xffffff, emissiveMap: ptex, emissiveIntensity: 0.32 }));
    plaque.position.set(0.38, 0.115, -0.05);
    plaque.rotation.set(-0.3, Math.PI / 2 - 0.35, 0.05); // leaning back against the drift, facing the approach
    plaque.userData.y0 = 0.115;
    humpGroupRef.add(plaque); ema2++;
    const cordMat = new THREE.MeshStandardMaterial({ color: 0xc73a24, roughness: 0.8, transparent: true, opacity: 0.85 });
    const cordSegs = [];
    let cx0 = 0.37, cz0 = -0.2, cdir = 0.5;
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.004, 0.06), cordMat);
      cdir += (i - 1.5) * 0.16;
      seg.position.set(cx0, 0.012, cz0);
      seg.rotation.y = cdir;
      seg.userData.y0 = 0.012;
      humpGroupRef.add(seg); cordSegs.push(seg); ema2++;
      cx0 += Math.sin(cdir) * 0.055; cz0 += Math.cos(cdir) * 0.055;
    }
    humpEma = { plaque, cordSegs };
  }
  // v94: an omikuji paper strip slipped under the newest koban - only its white
  // edge shows beside the coin, and the snow takes it last of all
  {
    const oc = document.createElement('canvas'); oc.width = 32; oc.height = 128;
    const q2 = oc.getContext('2d');
    q2.fillStyle = '#f2ecdd'; q2.fillRect(0, 0, 32, 128);
    q2.strokeStyle = 'rgba(60,55,48,.5)'; q2.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const yy = 16 + i * 15; q2.beginPath(); q2.moveTo(10, yy); q2.lineTo(22, yy + 6); q2.stroke(); } // faint ink columns
    q2.fillStyle = '#c73a24'; q2.beginPath(); q2.arc(16, 114, 5, 0, 7); q2.fill(); // the red seal on the protruding tip
    const otex = new THREE.CanvasTexture(oc);
    const omi = new THREE.Mesh(new THREE.PlaneGeometry(0.032, 0.16),
      new THREE.MeshStandardMaterial({ map: otex, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.95, emissive: 0xffffff, emissiveMap: otex, emissiveIntensity: 0.3 }));
    omi.rotation.x = -Math.PI / 2;
    omi.rotation.z = 0.42; // slipped in at a slight angle
    omi.position.set(0.595, 0.012, 0.18); // mostly beneath the new koban, just the edge out
    omi.userData.y0 = 0.012;
    humpGroupRef.add(omi); ret++; omiS = 1;
    humpOmi = omi;
    // v103: the vermilion seal answers the same first ray a heartbeat after the koban
    omiSealMat = new THREE.MeshStandardMaterial({ color: 0xc73a24, roughness: 0.55, transparent: true, opacity: 0.95, emissive: 0xc73a24, emissiveIntensity: 0.28 });
    const seal = new THREE.Mesh(new THREE.CircleGeometry(0.0055, 10), omiSealMat);
    seal.position.set(0, -0.0625, 0.0015); // exactly over the painted seal on the tip
    omi.add(seal);
  }
}
if (SEASON === 'snow') {
  const pawGeo = new THREE.CircleGeometry(0.042, 8);
  let pseed = 9917;
  const prnd = () => (pseed = (pseed * 16807) % 2147483647) / 2147483647;
  let px = 0.3, pz = -25.2, pdir = 0;
  const steps = 128;
  for (let i = 0; i < steps; i++) {
    const lat = (i % 2 === 0 ? 1 : -1) * 0.055;
    pdir = pdir * 0.92 + (prnd() - 0.5) * 0.35;
    pz += Math.cos(pdir) * 0.19;
    px += Math.sin(pdir) * 0.19;
    px = Math.max(-1.6, Math.min(1.6, px));
    if (Math.abs(px) < 0.95) px = px < 0 ? -0.95 : 0.95; // the cat pads beside the stepping stones, not under them
    const bop = 0.14 + 0.5 * (1 - i / steps);
    const mat = new THREE.MeshStandardMaterial({ color: 0xd6e0e8, roughness: 0.5, transparent: true, opacity: bop, emissive: 0x8fa5b5, emissiveIntensity: 0.3 });
    const pr = new THREE.Mesh(pawGeo, mat);
    pr.rotation.x = -Math.PI / 2;
    pr.rotation.z = -pdir;
    pr.scale.set(0.75, 1.25, 1);
    pr.position.set(px + lat * Math.cos(pdir), 0.021, pz + lat * Math.sin(pdir));
    world.add(pr); paws++; pawPrints.push({ m: pr, op: bop });
  }
  // v83: a short spur of prints leaves the steps' right edge to the place beside the
  // honden where the cat curled up and the snow kept falling - a small cat-shaped hump
  {
    let hx = 2.1, hz = -26.3;
    const hdirx = 2.2 / 3.3, hdirz = -2.5 / 3.3;
    for (let i = 0; i < 17; i++) {
      const lat = (i % 2 === 0 ? 1 : -1) * 0.05;
      const sop = 0.3 + 0.2 * (i / 17);
      const mat = new THREE.MeshStandardMaterial({ color: 0xd6e0e8, roughness: 0.5, transparent: true, opacity: sop, emissive: 0x8fa5b5, emissiveIntensity: 0.3 });
      const pr = new THREE.Mesh(pawGeo, mat);
      pr.rotation.x = -Math.PI / 2; pr.scale.set(0.75, 1.25, 1);
      pr.position.set(hx + lat * hdirz, 0.021, hz - lat * hdirx);
      world.add(pr); paws++; spurPrints.push({ m: pr, op: sop });
      hx += hdirx * 0.19; hz += hdirz * 0.19;
    }
    const hg = new THREE.Group();
    const bed = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), TORII_SNOW);
    bed.scale.set(1, 0.25, 1); bed.position.y = 0.05; hg.add(bed); snowHump++;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), TORII_SNOW);
    body.scale.set(1, 0.55, 1.15); body.position.y = 0.17; hg.add(body); snowHump++;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), TORII_SNOW);
    head.scale.set(1, 0.7, 1); head.position.set(-0.26, 0.24, 0.18); hg.add(head); snowHump++;
    for (const e of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 5), TORII_SNOW);
      ear.position.set(-0.26 + e * 0.06, 0.35, 0.18); hg.add(ear); snowHump++;
    }
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 6, 10, Math.PI * 0.9), TORII_SNOW);
    tail.rotation.x = Math.PI / 2; tail.rotation.y = 0.6; tail.position.set(0.08, 0.07, 0.1); hg.add(tail); snowHump++;
    for (const [gm, gy] of [[bed, 0.3], [body, 0.22], [head, 0.16], [tail, 0.14]]) humpGrowMeshes.push({ m: gm, sx: gm.scale.x, sy: gm.scale.y, sz: gm.scale.z, gy, ribs: gm === body });
    hg.children.filter(c => c.geometry.type === 'ConeGeometry').forEach(ear => humpGrowMeshes.push({ m: ear, sx: ear.scale.x, sy: ear.scale.y, sz: ear.scale.z, gy: -0.85 })); // ear tips vanish last
    // v84: a visitor noticed the shape and left one gold koban half-buried
    // against the drift's base, leaning on the bed beside the tail
    {
      const kbMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.35, metalness: 0.7, emissive: 0xffb46a, emissiveIntensity: 0.22 });
      const kb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.024, 16), kbMat);
      kb.scale.set(0.82, 1, 1.35); // the oval of a koban
      kb.rotation.x = Math.PI / 2 - 1.12; // standing on edge, leaning back against the drift
      kb.rotation.z = 0.18;
      kb.position.set(0.47, 0.11, 0.06);
      kb.userData.y0 = 0.11;
      hg.add(kb); humpKoban++; humpKobanMesh = kb;
      // a small drift lip of snow over the coin's buried foot
      const lip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), TORII_SNOW);
      lip.scale.set(1.3, 0.35, 0.8); lip.position.set(0.47, 0.03, 0.1);
      lip.userData.base = [1.3, 0.35, 0.8];
      hg.add(lip); humpKoban++; humpKobanLip = lip;
    }
    hg.position.set(4.3, 0, -29.0);
    hg.rotation.y = -0.5;
    world.add(hg); humpGroupRef = hg;
    // v100: the fox stood at the spur's end, breathing over the sleeping shape - its
    // breath froze into a small patch of feathered hoar on the hump's snow
    {
      hoarMat = new THREE.MeshStandardMaterial({ color: 0xeef6fa, roughness: 0.3, transparent: true, opacity: 0.95, emissive: 0xbcdcec, emissiveIntensity: 0.85 });
      const filmMat = new THREE.MeshStandardMaterial({ color: 0xe4eef4, roughness: 0.35, transparent: true, opacity: 0.45, emissive: 0xaecfe0, emissiveIntensity: 0.75 });
      const film = new THREE.Mesh(new THREE.CircleGeometry(0.23, 22), filmMat);
      film.rotation.x = -Math.PI / 2; film.rotation.y = 0.4; film.scale.set(1.15, 1, 0.8);
      film.position.set(4.16, 0.028, -28.50);
      world.add(film); hoarFilm = film;
      const hoarGroup = new THREE.Group();
      hoarGroup.position.set(4.16, 0.034, -28.50);
      hoarGroup.rotation.y = 0.4; // feathers fan toward the hump
      let hseed = 4321;
      const hrnd = () => (hseed = (hseed * 16807) % 2147483647) / 2147483647;
      const nGeo = new THREE.ConeGeometry(0.005, 1, 4);
      for (let f = 0; f < 5; f++) {
        const fa = (f / 5) * Math.PI * 2 + hrnd() * 0.6;
        const fx = Math.cos(fa) * 0.1, fz = Math.sin(fa) * 0.1;
        for (let k = 0; k < 3; k++) {
          const n = new THREE.Mesh(nGeo, hoarMat);
          const len = 0.06 + hrnd() * 0.05;
          n.scale.set(1, len, 1);
          const tilt = 0.5 + hrnd() * 0.7; // feathers lie low, splayed
          n.rotation.z = tilt * Math.cos(fa + k * 0.5);
          n.rotation.x = tilt * Math.sin(fa + k * 0.5);
          n.position.set(fx, 0.014 + k * 0.007, fz);
          hoarGroup.add(n);
          hoarNeedles.push({ m: n, sy: len, rz0: n.rotation.z, rx0: n.rotation.x, ph: hrnd() * Math.PI * 2, dir: hrnd() < 0.5 ? -1 : 1 });
        }
      }
      world.add(hoarGroup);
    }
  }
  // v104: sastrugi - the wind combs ripple ridges into the courtyard drifts east of
  // the path; they creep downwind while the gusts run and lie still when the air calms
  {
    const sasGeo = new THREE.SphereGeometry(1, 10, 6);
    sasGeo.scale(1.1, 0.045, 0.16);
    const sasMat = new THREE.MeshStandardMaterial({ color: 0xdfe9f0, roughness: 0.9, transparent: true, opacity: 0.9, emissive: 0x8fa5b5, emissiveIntensity: 0.18 });
    let sseed = 8803;
    const srnd = () => (sseed = (sseed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 16; i++) {
      const r = new THREE.Mesh(sasGeo, sasMat);
      const sx = 3.3 + srnd() * 3.4, sz = -20 + srnd() * 8;
      r.position.set(sx, 0.02, sz);
      r.scale.set(0.7 + srnd() * 0.9, 1, 0.7 + srnd() * 0.5);
      r.rotation.y = (srnd() - 0.5) * 0.16; // combed nearly straight, a small wander
      world.add(r);
      sasRidges.push({ m: r, z0: sz, ph: srnd() * 2.8 });
    }
  }
  // v85: the first visitor - faint boot prints arrive from the south-east open
  // ground, circle the hump once, shuffle to a stop beside the koban, and walk
  // on behind the honden along its east side (the platform sits at x<=3.6)
  {
    const bootGeo = new THREE.CircleGeometry(0.05, 8);
    let vseed = 7319;
    const vrnd = () => (vseed = (vseed * 16807) % 2147483647) / 2147483647;
    const vprint = (x, z, dir, op) => {
      const mat = new THREE.MeshStandardMaterial({ color: 0xd6e0e8, roughness: 0.5, transparent: true, opacity: op, emissive: 0x8fa5b5, emissiveIntensity: 0.25 });
      const fp = new THREE.Mesh(bootGeo, mat);
      fp.rotation.x = -Math.PI / 2;
      fp.rotation.z = -dir;
      fp.scale.set(0.62, 1.45, 1);
      fp.position.set(x, 0.02, z);
      world.add(fp); visitor++; visitorPrints.push({ m: fp, op });
    };
    const vlat = i => (i % 2 === 0 ? 1 : -1) * 0.09;
    // approach
    let vx = 5.8, vz = -26.4;
    let vdir = Math.atan2(5.05 - vx, -28.6 - vz);
    for (let i = 0; i < 5; i++) {
      vprint(vx + vlat(i) * Math.cos(vdir), vz - vlat(i) * Math.sin(vdir), vdir, 0.15 + vrnd() * 0.05);
      vx += Math.sin(vdir) * 0.45; vz += Math.cos(vdir) * 0.45;
    }
    // one full circle around the hump
    const cx = 4.45, cz = -29.0, cr = 0.78, ring = 10, th0 = 0.9;
    for (let i = 0; i <= ring; i++) {
      const th = th0 + (i / ring) * Math.PI * 2;
      const th2 = th0 + ((i + 1) / ring) * Math.PI * 2;
      const rx = cx + Math.sin(th) * cr, rz = cz + Math.cos(th) * cr;
      const rd = Math.atan2(cx + Math.sin(th2) * cr - rx, cz + Math.cos(th2) * cr - rz);
      vprint(rx + vlat(i) * Math.cos(rd) * 0.8, rz - vlat(i) * Math.sin(rd) * 0.8, rd, 0.17 + vrnd() * 0.05);
    }
    // the shuffle where they stopped and looked, beside the koban
    for (const [dth, dop] of [[-0.09, 0.26], [0.03, 0.28], [0.13, 0.26]]) {
      const th = 0.69 + dth;
      vprint(cx + Math.sin(th) * cr, cz + Math.cos(th) * cr, th + Math.PI / 2 + dth * 6, dop);
    }
    // and walked on behind the honden
    vx = cx + Math.sin(th0 - 0.35) * cr; vz = cz + Math.cos(th0 - 0.35) * cr;
    vdir = Math.atan2(0.45, -0.6);
    for (let i = 0; i < 6; i++) {
      vprint(vx + vlat(i) * Math.cos(vdir), vz - vlat(i) * Math.sin(vdir), vdir, 0.16 - i * 0.014);
      vx += Math.sin(vdir) * 0.5; vz += Math.cos(vdir) * 0.5;
    }
  }
  // v89: returning visitors find the story has continued
  let humpReturn = false;
  try { humpReturn = localStorage.getItem('ls_hump_seen') === '1'; } catch (e) {}
  try { localStorage.setItem('ls_hump_seen', '1'); } catch (e) {}
  if (humpReturn) buildVisitorReturn();
}
// v86: the snow keeps falling on the hump - over a long session the drift grows,
// the koban sinks, the ear tips vanish, and the visitor's ring softens away
let humpAccSaveT = 0;
function applyAccum() {
  const a = humpAcc;
  breathRate = 1 - 0.5 * a; // v112: kept here too so the rate is current even before the first updateAccum tick
  const br = Math.sin(humpBreathPhase * Math.PI * 2 / 60); // one rise and settle per long minute
  for (const g of humpGrowMeshes) {
    const bY = g.ribs ? 1 + br * 0.045 * (1 - 0.55 * a) : 1; // v112: the swell calms as the drift deepens - warmth sleeping under snow
    const bXZ = g.ribs ? 1 + br * 0.016 * (1 - 0.55 * a) : 1; // v112
    if (g.gy >= 0) g.m.scale.set(g.sx * (1 + a * g.gy * 0.6) * bXZ, g.sy * (1 + a * g.gy) * bY, g.sz * (1 + a * g.gy * 0.6) * bXZ);
    else g.m.scale.set(g.sx, g.sy * Math.max(0.12, 1 + a * g.gy), g.sz); // ears sink into the drift
  // v113: two small hollows above the ear tips - the last points of warmth keep a breath-warmed dip
  if (SEASON === 'snow') {
    if (!earHollows.length) {
      [[3.985, -28.97], [4.038, -28.938]].forEach(([hx, hz]) => {
        const dm = new THREE.Mesh(earHollowGeo, earHollowMat0.clone());
        dm.rotation.x = -Math.PI / 2; dm.position.set(hx, 0.335, hz);
        world.add(dm);
        const rm = new THREE.Mesh(earHollowRimGeo, earHollowRimMat0.clone());
        rm.rotation.x = -Math.PI / 2; rm.position.set(hx, 0.337, hz);
        world.add(rm);
        earHollows.push({ dm, rm });
      });
    }
    const holE = Math.min(1, Math.max(0, (a - 0.25) / 0.65)); // the dips open as the ears sink, full by 0.9
    const brPulse = 1 + br * 0.05 * (1 - 0.55 * a); // and flex with the slowed breath
    for (const h of earHollows) {
      const hs = (0.6 + 0.45 * holE) * brPulse;
      h.dm.scale.set(hs, hs, 1); h.rm.scale.set(hs, hs, 1);
      h.dm.position.y = 0.335 + 0.037 * a; h.rm.position.y = 0.337 + 0.037 * a; // riding the rising drift
      h.dm.material.opacity = 0.55 * holE; h.rm.material.opacity = 0.6 * holE;
    }
  }
  }
  if (humpKobanMesh) humpKobanMesh.position.y = humpKobanMesh.userData.y0 - 0.048 * a;
  if (humpKobanMesh2) humpKobanMesh2.position.y = humpKobanMesh2.userData.y0 - 0.024 * a; // newer, sinks slower
  if (humpEma) {
    humpEma.plaque.position.y = humpEma.plaque.userData.y0 - 0.036 * a;
    for (const s of humpEma.cordSegs) { s.position.y = s.userData.y0 - 0.012 * a; s.material.opacity = 0.85 * (1 - 0.4 * a); }
  }
  if (humpOmi) { // v94: buried last of all - untouched until acc 0.55, then eased down
    const om = Math.max(0, (a - 0.55) / 0.45);
    humpOmi.material.opacity = 0.95 * (1 - 0.94 * om);
    humpOmi.position.y = humpOmi.userData.y0 - 0.008 * om;
  }
  if (humpKobanLip) {
    const b = humpKobanLip.userData.base;
    humpKobanLip.scale.set(b[0] * (1 + 0.9 * a), b[1] * (1 + 1.1 * a), b[2] * (1 + 0.9 * a));
    humpKobanLip.position.y = 0.03 + 0.02 * a;
  }
  for (const p of visitorPrints) p.m.material.opacity = p.op * (1 - 0.55 * a);
  for (const p of pawPrints) p.m.material.opacity = Math.max(0, p.op - 0.5 * a); // v90
  for (const p of spurPrints) p.m.material.opacity = p.op * (1 - 0.7 * Math.max(0, (a - 0.3) / 0.7)); // v91: last thing the snow takes
  for (const t of foxTracks) t.m.material.opacity = t.op * t.reveal * (1 - 0.35 * Math.min(1, traxErode * t.eg)) * Math.max(0, 1 - 1.1 * a); // v107+v109: combed by the wind, then the first thing new snow covers
}
function updateAccum(dt) {
  if (SEASON !== 'snow' || !started) return;
  humpBreathPhase += dt * breathRate; // the cat keeps breathing even as the drift buries it, slower and slower
  if (humpAcc < 1) {
    humpAcc = Math.min(1, humpAcc + dt / 1200); // full bury after about twenty minutes under the snow
    humpAccSaveT += dt;
    if (humpAccSaveT > 5) { humpAccSaveT = 0; try { localStorage.setItem('ls_hump_acc', humpAcc.toFixed(3)); } catch (e) {} }
  }
  applyAccum();
}
if (SEASON === 'snow') applyAccum();
// rain season wets the vermilion lacquer: deeper, darker, glossy - torii gates and the hall share the paint
if (SEASON === 'rain') { M.woodR.color.setHex(0x6e241c); M.woodR.roughness = 0.35; }

// ---------- player ----------
const player = {
  pos: new THREE.Vector3(0, 0.9, 16),
  vel: new THREE.Vector3(),
  yaw: 0, pitch: 0, ground: true,
};
const EYE = 1.62, RADIUS = 0.35;
const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; });
addEventListener('keyup', e => { keys[e.code] = false; });
let locked = false;
canvas.addEventListener('click', () => { if (!locked && !DEBUG) canvas.requestPointerLock(); });
document.addEventListener('pointerlockchange', () => { locked = !!document.pointerLockElement; });
addEventListener('mousemove', e => {
  if (!locked || DEBUG) return;
  player.yaw -= e.movementX * 0.0021;
  player.pitch = Math.max(-1.4, Math.min(1.4, player.pitch - e.movementY * 0.0021));
});

function step(dt) {
  const sp = keys.ShiftLeft ? 5.6 : 3.4;
  let fx = 0, fz = 0;
  if (keys.KeyW) fz -= 1; if (keys.KeyS) fz += 1;
  if (keys.KeyA) fx -= 1; if (keys.KeyD) fx += 1;
  if (stick.active) { fx += stick.x; fz += stick.y; }
  const l = Math.hypot(fx, fz) || 1;
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  const wx = (fx * cos - fz * sin) / l * sp, wz = (fx * sin + fz * cos) / l * sp;
  player.vel.x += (wx - player.vel.x) * Math.min(1, dt * 10);
  player.vel.z += (wz - player.vel.z) * Math.min(1, dt * 10);
  player.vel.y -= 18 * dt;
  player.pos.addScaledVector(player.vel, dt);
  player.ground = false;
  if (player.pos.y <= 0.9) { player.pos.y = 0.9; player.vel.y = 0; player.ground = true; }
  for (const c of colliders) {
    if (player.pos.x + RADIUS < c.min.x || player.pos.x - RADIUS > c.max.x) continue;
    if (player.pos.z + RADIUS < c.min.z || player.pos.z - RADIUS > c.max.z) continue;
    if (player.pos.y > c.max.y || player.pos.y + 1.7 < c.min.y) continue;
    const dxl = player.pos.x + RADIUS - c.min.x, dxr = c.max.x - (player.pos.x - RADIUS);
    const dzl = player.pos.z + RADIUS - c.min.z, dzr = c.max.z - (player.pos.z - RADIUS);
    const m = Math.min(dxl, dxr, dzl, dzr);
    if (m === dxl) player.pos.x = c.min.x - RADIUS;
    else if (m === dxr) player.pos.x = c.max.x + RADIUS;
    else if (m === dzl) player.pos.z = c.min.z - RADIUS;
    else player.pos.z = c.max.z + RADIUS;
  }
  // v114: count the stride; each full step asks the snow how deep it lies
  if (player.ground) {
    strideAcc += Math.hypot(player.vel.x, player.vel.z) * dt;
    if (strideAcc > 0.72) { strideAcc = 0; footstep(); }
  }
}

// ---------- touch controls ----------
const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const stick = { active: false, id: -1, x: 0, y: 0, ox: 0, oy: 0 };
const lookT = { id: -1, lx: 0, ly: 0 };
const stickEl = document.getElementById('stick'), nubEl = document.getElementById('nub'), ebtnEl = document.getElementById('ebtn');
if (IS_TOUCH) {
  stickEl.style.display = 'block'; ebtnEl.style.display = 'block';
  const cf = document.getElementById('controlsfoot');
  if (cf) cf.textContent = 'LEFT THUMB WALK · RIGHT THUMB LOOK · E OFFER  |  A LUCKY CAT VENTURE';
}
canvas.addEventListener('touchstart', e => {
  audio();
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth * 0.45 && stick.id === -1) {
      stick.id = t.identifier; stick.active = true;
      stick.ox = t.clientX; stick.oy = t.clientY; stick.x = 0; stick.y = 0;
      stickEl.style.left = (t.clientX - 55) + 'px'; stickEl.style.top = (t.clientY - 55) + 'px'; stickEl.style.bottom = 'auto';
    } else if (lookT.id === -1) {
      lookT.id = t.identifier; lookT.lx = t.clientX; lookT.ly = t.clientY;
    }
  }
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === stick.id) {
      const dx = (t.clientX - stick.ox) / 46, dy = (t.clientY - stick.oy) / 46;
      const l = Math.hypot(dx, dy), cl = Math.min(1, l);
      stick.x = l > 0 ? dx / l * cl : 0; stick.y = l > 0 ? dy / l * cl : 0;
      nubEl.style.transform = 'translate(' + (stick.x * 33) + 'px,' + (stick.y * 33) + 'px)';
    } else if (t.identifier === lookT.id) {
      player.yaw -= (t.clientX - lookT.lx) * 0.0042;
      player.pitch = Math.max(-1.4, Math.min(1.4, player.pitch - (t.clientY - lookT.ly) * 0.0042));
      lookT.lx = t.clientX; lookT.ly = t.clientY;
    }
  }
  e.preventDefault();
}, { passive: false });
function touchEnd(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === stick.id) { stick.id = -1; stick.active = false; stick.x = stick.y = 0; nubEl.style.transform = ''; stickEl.style.left = '30px'; stickEl.style.top = 'auto'; stickEl.style.bottom = '60px'; }
    if (t.identifier === lookT.id) lookT.id = -1;
  }
}
canvas.addEventListener('touchend', touchEnd); canvas.addEventListener('touchcancel', touchEnd);
ebtnEl.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); audio(); dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); }, { passive: false });

// ---------- audio ----------
let AC = null, masterGain = null;
function audio() {
  if (AC) return;
  AC = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = AC.createGain(); masterGain.gain.value = 0.5; masterGain.connect(AC.destination);
}
function tone(f0, f1, type, dur, vol) {
  if (!AC) return;
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(Math.max(20, f0), t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(masterGain); o.start(t); o.stop(t + dur + 0.05);
}

// ---------- overlay / boot ----------
const fadeblkEl = document.getElementById('fadeblk');
const startEl = document.getElementById('start');
let started = false;
startEl.addEventListener('click', () => {
  if (started) return; started = true;
  audio();
  startEl.style.opacity = '0';
  setTimeout(() => { startEl.style.display = 'none'; if (!DEBUG) canvas.requestPointerLock(); }, 620);
  fadeblkT = 1.0; // gentle fade-up from dusk black
});
let fadeblkT = 1.0;
if (DEBUG) { startEl.style.display = 'none'; started = true; }

// ================= LANTERNS =================
const subEl = document.getElementById('sub');
const subWho = subEl.querySelector('.who'), subLine = subEl.querySelector('.line');
let subTimer = 0;
function say(who, line, secs) {
  subWho.textContent = who; subLine.textContent = line;
  subEl.style.display = 'block'; subTimer = secs || 4;
}
const hintEl = document.getElementById('hint');

// v51: a lit lantern throws a warm pool onto the path stone; rain wets the stone into a
// mirror - the pool widens and a reflection smear stretches from the lantern toward the path
const poolWet = SEASON === 'rain' ? 1 : 0;
function glowTexture(streak) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  if (streak) {
    // bright at the lantern-side edge, falling away; sides feathered so it reads as reflection
    const g = x.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(255,216,152,0.85)'); g.addColorStop(0.45, 'rgba(255,192,122,0.3)'); g.addColorStop(1, 'rgba(255,192,122,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const side = x.createLinearGradient(0, 0, 0, 128);
    side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.3, 'rgba(0,0,0,0)'); side.addColorStop(0.7, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = side; x.fillRect(0, 0, 128, 128);
  } else {
    const g = x.createRadialGradient(64, 64, 6, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,216,152,0.9)'); g.addColorStop(0.45, 'rgba(255,198,128,0.32)'); g.addColorStop(1, 'rgba(255,198,128,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}
const poolTex = glowTexture(false), streakTex = glowTexture(true);
// v53: pools cool as the cat brings the morning - warm gold at night, dusty peach-rose at dawn
const POOL_WARM = new THREE.Color(0xffffff), POOL_DAWN = new THREE.Color(0xd8c2d4);
let lanternCaps = 0; // v64
const lanternThaw = []; // v96: { dollop, eave, slump, dir } - caps that slump in the thaw
const meltRingGeo = new THREE.RingGeometry(0.34, 0.62, 24);
const MELT_EARTH = new THREE.MeshStandardMaterial({ color: 0x3a3128, roughness: 0.5, transparent: true, opacity: 0 }); // v137: wet earth showing through
let slumpE = 0; // v96
const LANTERN_SNOW = new THREE.MeshStandardMaterial({ color: 0xe6ecf1, roughness: 0.92, metalness: 0.02 });
const lanterns = [];
function stoneLantern(x, z) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.62), M.stoneD); base.position.y = 0.11; g.add(base);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.85, 8), M.stone); post.position.y = 0.63; g.add(post);
  const house = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.5), M.stone); house.position.y = 1.27; g.add(house);
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.3, 0.52), M.paper.clone()); paper.position.y = 1.27; g.add(paper);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.34, 4), M.stoneD); roof.position.y = 1.66; roof.rotation.y = Math.PI / 4; g.add(roof);
  const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M.stone); jewel.position.y = 1.9; g.add(jewel);
  // v64: snow season caps the roof - a drifted cone with a slight lip, the jewel pokes through
  if (SEASON === 'snow') {
    // a pyramid cap reads as a slab from below; snow here is a dollop on the peak + a line on the eave
    const dollop = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), LANTERN_SNOW);
    dollop.scale.set(1, 0.55, 1); dollop.position.y = 1.84;
    dollop.castShadow = true; dollop.receiveShadow = true;
    g.add(dollop);
    const eave = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.032, 6, 4), LANTERN_SNOW);
    eave.rotation.x = Math.PI / 2; eave.rotation.z = Math.PI / 4; eave.position.y = 1.52;
    eave.castShadow = true; eave.receiveShadow = true;
    g.add(eave); lanternCaps++;
    // v96: a soft slump of snow waiting on one eave side for the thaw to loosen it
    const dir = (lanterns.length % 2 === 0) ? 1 : -1;
    const slump = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), LANTERN_SNOW);
    slump.scale.set(0.01, 0.01, 0.01);
    slump.position.set(dir * 0.26, 1.66, 0.06);
    g.add(slump);
    // v137: the ring of ground the flame will warm bare over a long burn
    const ring = new THREE.Mesh(meltRingGeo, MELT_EARTH.clone());
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.021, 0); ring.scale.setScalar(0.6);
    g.add(ring);
    lanternThaw.push({ dollop, eave, slump, dir, ring, mr: 0 });
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, 0, z); world.add(g);
  const light = new THREE.PointLight(0xffc27a, 0, 7); light.position.set(x, 1.35, z); scene.add(light);
  colliders.push({ min: new THREE.Vector3(x - 0.35, 0, z - 0.35), max: new THREE.Vector3(x + 0.35, 1.6, z + 0.35) });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.02, z);
  pool.scale.setScalar(1.5 + poolWet * 0.85);
  world.add(pool);
  let streak = null;
  if (poolWet) {
    streak = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.6), new THREE.MeshBasicMaterial({ map: streakTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    streak.rotation.x = -Math.PI / 2;
    const dir = x > 0 ? -1 : 1; // smear runs from the lantern toward the path center
    streak.scale.x = dir;
    streak.position.set(x + dir * 1.2, 0.025, z);
    world.add(streak);
  }
  lanterns.push({ x, z, lit: false, paper, light, flick: Math.random() * 10, pool, streak });
}
stoneLantern(-2.2, 8); stoneLantern(2.2, 4);
stoneLantern(-2.2, -2); stoneLantern(2.2, -6);
stoneLantern(-2.2, -14); stoneLantern(2.2, -18);
// shrine guardians: always-lit pair flanking the offering box
stoneLantern(-2.9, -26.2); stoneLantern(2.9, -26.2);
const shrineWash = new THREE.PointLight(0xffb46a, 30, 16); shrineWash.position.set(0, 3.2, -25.6); scene.add(shrineWash);
const shrineGlow = new THREE.PointLight(0xffd9a0, 12, 8); shrineGlow.position.set(0, 1.6, -27.2); scene.add(shrineGlow);
for (const gl of lanterns.slice(-2)) { gl.lit = true; gl.paper.material.emissiveIntensity = 1.6; gl.light.intensity = 30; gl.guardian = true; }

// firefly season: moths dance around lit lanterns
const MOTH_PER = 4, MOTH_N = lanterns.length * MOTH_PER;
const mothPos = new Float32Array(MOTH_N * 3).fill(-30);
const mothLan = [], mothPh = [], mothR = [], mothSp = [];
for (let i = 0; i < MOTH_N; i++) {
  mothLan.push(Math.floor(i / MOTH_PER));
  mothPh.push(Math.random() * 6.28);
  mothR.push(0.22 + Math.random() * 0.3);
  mothSp.push(1.6 + Math.random() * 1.8);
}
const mothGeo = new THREE.BufferGeometry();
mothGeo.setAttribute('position', new THREE.BufferAttribute(mothPos, 3));
const moths = new THREE.Points(mothGeo, new THREE.PointsMaterial({
  color: 0xffefc2, size: 0.055, transparent: true, opacity: 0.95,
  blending: THREE.AdditiveBlending, depthWrite: false }));
moths.visible = SEASON === 'firefly';
scene.add(moths);
function updateMoths(T) {
  if (!moths.visible) return;
  for (let i = 0; i < MOTH_N; i++) {
    const l = lanterns[mothLan[i]];
    if (!l.lit) { mothPos[i*3+1] = -30; continue; }
    const a = T * mothSp[i] + mothPh[i];
    mothPos[i*3]   = l.x + Math.cos(a) * mothR[i] + Math.sin(T * 5.1 + mothPh[i]) * 0.05;
    mothPos[i*3+1] = 1.3 + Math.sin(T * 2.7 + mothPh[i] * 2.1) * 0.2;
    mothPos[i*3+2] = l.z + Math.sin(a) * mothR[i] + Math.cos(T * 4.3 + mothPh[i]) * 0.05;
  }
  mothGeo.attributes.position.needsUpdate = true;
}

// snow season: white caps settle on the gates and lantern roofs
if (SEASON === 'snow') {
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf0f2f5, roughness: 0.95 });
  function snowCap(x, y, z, w, d) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.09, d), snowMat);
    c.position.set(x, y, z); c.castShadow = false; world.add(c);
  }
  snowCap(0, 5.06, 6, 5.3, 0.55); snowCap(0, 4.28, -10, 4.4, 0.5);
  for (const l of lanterns) snowCap(l.x, 1.86, l.z, 0.5, 0.5);
}

// ================= KAIRO WALKWAYS =================
// Covered corridors frame the approach; their gold ridges catch first light at dawn.
const kairoRidges = [];
let kairoSnow = 0; // v72
const kairoSlides = []; let slideE = 0; // v99: the first slab to let go
let kice = 0; // v73
let kfrost = 0; // v76
let ferns = 0; // v77
let breathCount = 0, nextBreathT = 2; const breathPuffs = []; const foxMuzzles = []; // v78
let watchCount = 0; // v87: gusts that carry the hump-side guardian's breath to the sleeping cat
let meltCount = 0, nextMeltT = 0; const meltDrops = []; // v79
const meltGeo = new THREE.SphereGeometry(0.016, 6, 5);
const meltMat = new THREE.MeshStandardMaterial({ color: 0xdfeaf2, roughness: 0.15, emissive: 0x8fa5b5, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 });
let rillLen = 0, rillMesh = null; // v80
let poolR = 0, rillPool = null; // v81
let refreezeE = 0, refreezeOn = false, skimGroup = null, skimRing = null, skimFilm = null, lastRingE = -1; const skimPatches = []; // v108: the cold coming back after a melt day
// v92: at night the rill lies frozen; the dawn melt takes the skin from the source downstream
let iceLen = 0, iceMesh = null, icePoolMesh = null;
let iceGlints = [], iceGlintE = 0; // v106: first light catches the frozen rill edges, gone once the light is general
const iceMat = new THREE.MeshStandardMaterial({ color: 0xdfe9f0, roughness: 0.35, metalness: 0.1, emissive: 0x9fb6c4, emissiveIntensity: 0.22, transparent: true, opacity: 0.5 });
const icePoolMat = new THREE.MeshStandardMaterial({ color: 0xd6e2ea, roughness: 0.3, emissive: 0x93aabb, emissiveIntensity: 0.2, transparent: true, opacity: 0.55 });
const iceGlintGeo = new THREE.SphereGeometry(0.02, 6, 5); // v106
const foxTrackGeo = new THREE.CircleGeometry(0.042, 8); // v107: same pad as the cat's trail, scaled narrower and longer
const skimPatchGeo = new THREE.SphereGeometry(0.09, 8, 5); // v108
const skimFilmGeo = new THREE.CircleGeometry(0.55, 24); // v108
const skimRingMat = new THREE.MeshStandardMaterial({ color: 0xc8d2d8, roughness: 0.6, metalness: 0.05, emissive: 0x8794a0, emissiveIntensity: 0.12, transparent: true, opacity: 0, side: THREE.DoubleSide }); // v108: duller than the v92 skin
const skimFilmMat = new THREE.MeshStandardMaterial({ color: 0xc8d2d8, roughness: 0.65, metalness: 0.05, emissive: 0x8794a0, emissiveIntensity: 0.1, transparent: true, opacity: 0, side: THREE.DoubleSide }); // v108
const omiKnotGeo = new THREE.SphereGeometry(0.022, 6, 5); // v110: the tie point on each rack strip
const omiKnotMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c2, roughness: 0.8 }); // v110
const rillPoolMat = new THREE.MeshStandardMaterial({ color: 0xbfd4de, roughness: 0.08, metalness: 0.35, emissive: 0x8fa8b8, emissiveIntensity: 0.3, transparent: true, opacity: 0.65 });
const rillMat = new THREE.MeshStandardMaterial({ color: 0xcfe2ec, roughness: 0.2, emissive: 0x7d96a8, emissiveIntensity: 0.45, transparent: true, opacity: 0.55 });
const icicles = []; // v75
const glints = []; let glintCount = 0; // v75
function kairo(side) {
  const g = new THREE.Group();
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.9 });
  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.4, metalness: 0.6, emissive: 0xffc9a0, emissiveIntensity: 0 });
  for (let z = 10; z >= -30; z -= 5) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.5, 8), M.wood);
    post.position.set(0, 1.25, z); g.add(post);
  }
  for (const s of [-1, 1]) {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 42), roofMat);
    slope.position.set(s * 0.62, 3.02, -10); slope.rotation.z = -s * 0.42; g.add(slope);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 42), ridgeMat);
  ridge.position.set(0, 3.5, -10); g.add(ridge);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(side * 12, 0, 0); world.add(g);
  kairoRidges.push(ridgeMat);
}
kairo(-1); kairo(1);
if (SEASON === 'snow') {
  const kSnow = new THREE.MeshStandardMaterial({ color: 0xf0f2f5, roughness: 0.95 });
  for (const side of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 42), kSnow);
    cap.position.set(side * 12, 3.6, -10); world.add(cap);
  }
  // v72: the inner eave line winters like the ema racks - a white sleeve along the eave
  // edge, and a snow-laden cord bowing between the posts
  for (const side of [-1, 1]) {
    const ex = side * 12 - side * 1.35;
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 40, 7), TORII_SNOW);
    sleeve.rotation.x = Math.PI / 2; sleeve.position.set(ex, 2.72, -10);
    world.add(sleeve); kairoSnow++;
    for (let z = 10; z > -30; z -= 5) {
      for (let i = 0; i < 5; i++) {
        const t0 = i / 5, t1 = (i + 1) / 5;
        const z0 = z - 4.9 * t0, z1 = z - 4.9 * t1;
        const y0 = 2.68 - 0.13 * (1 - Math.pow(2 * t0 - 1, 2));
        const y1 = 2.68 - 0.13 * (1 - Math.pow(2 * t1 - 1, 2));
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, Math.hypot(z1 - z0, y1 - y0), 7), TORII_SNOW);
        seg.position.set(ex, (y0 + y1) / 2, (z0 + z1) / 2);
        seg.rotation.x = Math.PI / 2 - Math.atan2(y1 - y0, z1 - z0);
        world.add(seg); kairoSnow++;
      }
    }
    // v73: icicles under the eave, hanging at the posts between the sags
    const iceMat = new THREE.MeshStandardMaterial({ color: 0xd9e6ee, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.9, emissive: 0x6a7d8c, emissiveIntensity: 0.5 });
    let iseed = (side + 2) * 977;
    const irnd = () => (iseed = (iseed * 16807) % 2147483647) / 2147483647;
    for (let z = 10; z >= -30; z -= 5) {
      const n = 1 + Math.floor(irnd() * 2);
      for (let i = 0; i < n; i++) {
        const len = 0.16 + irnd() * 0.28;
        const ic = new THREE.Mesh(new THREE.ConeGeometry(0.02 + irnd() * 0.02, len, 6), iceMat);
        ic.rotation.x = Math.PI;
        ic.position.set(ex + (irnd() - 0.5) * 0.06, 2.66 - len / 2, z + (irnd() - 0.5) * 0.7);
        ic.userData.len = len; icicles.push(ic); world.add(ic); kice++;
      }
    }
    // v76: frost bloom creeping up the posts - an icy sleeve hugging the lower post,
    // taller toward the sheltered back, with small crystal tufts at its upper edge
    const frostMat = new THREE.MeshStandardMaterial({ color: 0xe6eef5, roughness: 0.35, transparent: true, opacity: 0.55, emissive: 0x8fa5b5, emissiveIntensity: 0.35 });
    let fseed = (side + 2) * 613;
    const frnd = () => (fseed = (fseed * 16807) % 2147483647) / 2147483647;
    for (let z = 10; z >= -30; z -= 5) {
      const h = 0.3 + frnd() * 0.35 + (10 - z) / 40 * 0.25;
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.14, h, 8, 1, true), frostMat);
      sleeve.position.set(side * 12, h / 2, z); world.add(sleeve); kfrost++;
      const tufts = 3 + Math.floor(frnd() * 3);
      for (let i = 0; i < tufts; i++) {
        const a = frnd() * Math.PI * 2;
        const ty = h * (0.55 + frnd() * 0.5);
        const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 5), frostMat);
        tuft.position.set(side * 12 + Math.cos(a) * 0.13, ty, z + Math.sin(a) * 0.13);
        tuft.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
        world.add(tuft);
      }
    }
  }
  // v99: snow sheets on the inner roof slopes - and at dawn the first slab lets go,
  // sliding down off the eave edge as the thaw loosens it
  for (const side of [-1, 1]) {
    const sx = side * 11.38, sr = side * 0.42;
    const sA = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.045, 7.8), kSnow);
    sA.position.set(sx, 3.088, 7.1); sA.rotation.z = sr; world.add(sA);
    const sB = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.045, 27.6), kSnow);
    sB.position.set(sx, 3.088, -17.2); sB.rotation.z = sr; world.add(sB);
    const slabMat = kSnow.clone(); slabMat.transparent = true;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 6.6), slabMat);
    slab.position.set(sx, 3.095, -0.1); slab.rotation.z = sr;
    world.add(slab);
    kairoSlides.push({ m: slab, x0: sx, y0: 3.095, r0: sr, dx: -side * 0.91, dy: -0.41, side });
  }
}


let litCount = 0;
const PUZZLE_LANTERNS = 6;
// v141: one moth awake past its season - drawn to a newly lit flame in the cold,
// it spirals in, singes, and falls to the snow
let moth2State = 0, moth2T = 0, moth2Lan = -1, mothSinges = 0, moth2Mesh = null;
function lightLantern(l) {
  l.lit = true; litCount++;
  if (SEASON === 'snow' && moth2State === 0) { // v141: the cold-season moth wakes for a new flame
    moth2State = 1; moth2T = 0; moth2Lan = lanterns.indexOf(l);
    if (!moth2Mesh) {
      moth2Mesh = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0x8a7f6a, roughness: 0.8, emissive: 0x6a5f4a, emissiveIntensity: 0.5, transparent: true, opacity: 0.95 }));
      world.add(moth2Mesh);
    }
    moth2Mesh.visible = true;
  }
  l.paper.material.emissiveIntensity = 1.6;
  l.light.intensity = 26;
  tone(660, 660, 'sine', 0.7, 0.12); tone(990, 990, 'sine', 0.9, 0.05);
  if (litCount === PUZZLE_LANTERNS) {
    say('THE SHRINE', 'Every lantern burns. Somewhere ahead, a small bell answers.', 5);
    tone(392, 392, 'triangle', 1.6, 0.14);
    setTimeout(() => tone(523.25, 523.25, 'triangle', 1.8, 0.14), 700);
    awakenCat();
  } else if (litCount === 1) {
    say('THE SHRINE', 'One flame. The path remembers the way.', 4);
  } else if (litCount === 3) {
    say('THE SHRINE', 'Half the path is warm now.', 3.5);
  }
}

// ================= SHRINE (honden) =================
{
  addBox(0, 0.45, -30, 7.2, 0.9, 5.4, M.wood);                    // platform
  // stone stair: three worn treads up to the offering box
  addBox(0, 0.15, -25.9, 4.4, 0.3, 0.65, M.stoneD);
  addBox(0, 0.3, -26.55, 3.9, 0.6, 0.65, M.stoneD);
  addBox(0, 0.45, -27.2, 3.4, 0.9, 0.65, M.stone);
  if (SEASON === 'snow') {
    const sMat = new THREE.MeshStandardMaterial({ color: 0xf0f2f5, roughness: 0.95 });
    for (const [sy, sz, sw] of [[0.34, -25.9, 4.4], [0.64, -26.55, 3.9], [0.94, -27.2, 3.4]]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.07, 0.65), sMat);
      c.position.set(0, sy, sz); world.add(c);
    }
    // v77: frost ferns feathering the tread front edges - seeded fronds, each a
    // short stem tipping over the edge with alternating barbs
    const fernMat = new THREE.MeshStandardMaterial({ color: 0xe6eef5, roughness: 0.4, transparent: true, opacity: 0.7, emissive: 0x93a8b8, emissiveIntensity: 0.4 });
    let fseed = 4243;
    const frnd = () => (fseed = (fseed * 16807) % 2147483647) / 2147483647;
    for (const [topY, frontZ, halfW] of [[0.3, -25.575, 2.2], [0.6, -26.225, 1.95], [0.9, -26.875, 1.7]]) {
      const n = Math.floor(halfW * 2 / 0.28);
      for (let i = 0; i < n; i++) {
        if (frnd() < 0.25) continue; // gaps - ferns grow in colonies, not a trim
        const fx = -halfW + 0.15 + i * 0.28 + (frnd() - 0.5) * 0.12;
        const fg = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.16), fernMat);
        stem.rotation.x = -1.15; stem.position.set(0, 0.05, 0.05); fg.add(stem);
        for (let b = 0; b < 3; b++) {
          for (const sd of [-1, 1]) {
            const barb = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.07), fernMat);
            barb.position.set(sd * 0.028, 0.03 + b * 0.028, 0.02 + b * 0.035);
            barb.rotation.set(-1.0, 0, sd * 0.75); fg.add(barb);
          }
        }
        fg.position.set(fx, topY, frontZ - 0.02);
        fg.rotation.y = (frnd() - 0.5) * 0.5;
        world.add(fg); ferns++;
      }
    }
  }
  addBox(0, 2.4, -30.5, 5.6, 3.2, 3.6, M.woodR, { cast: true });  // hall body
  addBox(0, 2.1, -28.55, 1.7, 2.2, 0.18, M.ink, { noCollide: true }); // doors
  addBox(-0.45, 2.1, -28.5, 0.06, 2.0, 0.06, M.gold, { noCollide: true });
  addBox(0.45, 2.1, -28.5, 0.06, 2.0, 0.06, M.gold, { noCollide: true });
  const roof1 = addBox(0, 4.35, -30.5, 7.4, 0.3, 5.4, M.ink, { noCollide: true });
  roof1.rotation.x = 0.0;
  addBox(0, 4.62, -30.5, 6.2, 0.3, 4.2, M.ink, { noCollide: true });
  addBox(0, 4.9, -30.5, 1.2, 0.5, 4.4, M.ink, { noCollide: true });  // ridge
  addBox(-3.4, 4.15, -30.5, 0.35, 0.35, 5.6, M.gold, { noCollide: true });
  addBox(3.4, 4.15, -30.5, 0.35, 0.35, 5.6, M.gold, { noCollide: true });
  // offering box
  addBox(0, 1.15, -27.6, 1.9, 0.6, 0.9, M.wood);
  for (let i = -3; i <= 3; i++) addBox(i * 0.26, 1.5, -27.6, 0.09, 0.14, 0.94, M.ink, { noCollide: true });
  if (SEASON === 'snow') {
    // v132: the offering box takes the same cold as the kobans it holds - a frost
    // sheet rims the coin slots, clearing with the dawn
    const slotFrost = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 0.86),
      new THREE.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.95, transparent: true, opacity: 0, emissive: 0xc9dae8, emissiveIntensity: 0.9 }));
    slotFrost.rotation.x = -Math.PI / 2;
    slotFrost.position.set(0, 1.585, -27.6);
    world.add(slotFrost); slotRime.push(slotFrost);
  }
  // shimenawa rope + shide over the doors
  const rope = addCyl(0, 3.35, -28.6, 0.07, 0.07, 3.4, M.gold, {}); rope.rotation.z = Math.PI / 2;
  for (let i = -1; i <= 1; i++) addBox(i * 0.9, 3.05, -28.6, 0.3, 0.35, 0.03, M.paper, { noCollide: true });
}

// ================= BELLS =================
const bells = [];
const BELL_NOTES = [523.25, 587.33, 783.99]; // C5 D5 G5 - pentatonic family
function offeringBell(x, note, name) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.7, 0.08), M.wood); frame.position.y = 0.85; g.add(frame);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), M.wood); arm.position.set(0, 1.7, 0.2); g.add(arm);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.19, 0.3, 12), M.gold);
  bell.position.set(0, 1.5, 0.42); g.add(bell);
  const clap = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.ink); clap.position.set(0, 1.36, 0.42); g.add(clap);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.position.set(x, 0.9, -27.4); world.add(g);
  bells.push({ x, z: -27.4, note, name, rung: false, g, bell, swingT: 0 });
}
offeringBell(-1.4, BELL_NOTES[0], 'PAST');
offeringBell(0, BELL_NOTES[1], 'PRESENT');
offeringBell(1.4, BELL_NOTES[2], 'FUTURE');

let rungCount = 0;
function ringBell(b) {
  b.rung = true; rungCount++; b.swingT = 1;
  tone(b.note, b.note * 0.995, 'triangle', 2.8, 0.22);
  tone(b.note * 2.01, b.note * 2.0, 'sine', 1.4, 0.05);
  say('THE ' + b.name + ' BELL', ['The note rolls down the path and does not come back.',
    'Somewhere, small paws on stone.', 'The shrine holds its breath.'][rungCount - 1] || '', 4);
  advanceCat(rungCount);
  if (rungCount === 3) setTimeout(completeShrine, 2600);
}

// ================= THE CAT =================
const cat = { g: new THREE.Group(), paw: null, state: 'hidden', step: 0, waveT: 0, hearts: [] };
function buildCat() {
  const g = cat.g;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), M.porcelain);
  body.scale.set(1, 1.15, 0.9); body.position.y = 0.55; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16), M.porcelain);
  head.position.set(0, 1.18, 0.05); g.add(head);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 4), M.porcelain);
    ear.position.set(s * 0.19, 1.44, 0.03); ear.rotation.y = Math.PI / 4; g.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.11, 4), M.shu);
    inner.position.set(s * 0.19, 1.42, 0.06); inner.rotation.y = Math.PI / 4; g.add(inner);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.ink);
    eye.position.set(s * 0.12, 1.2, 0.33); g.add(eye);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 8), M.porcelain);
    leg.position.set(s * 0.17, 0.15, 0.22); g.add(leg);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), M.shu); nose.position.set(0, 1.13, 0.36); g.add(nose);
  // collar + bell
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 8, 20), M.shu);
  collar.position.set(0, 0.95, 0.05); collar.rotation.x = Math.PI / 2 - 0.25; g.add(collar);
  const cbell = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), M.gold); cbell.position.set(0, 0.86, 0.33); g.add(cbell);
  // koban medallion
  const koban = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 14), M.gold);
  koban.position.set(0, 0.62, 0.4); koban.rotation.x = Math.PI / 2; g.add(koban);
  // raised paw (pivot at shoulder)
  const pawPivot = new THREE.Group(); pawPivot.position.set(0.3, 1.05, 0.15);
  const paw = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.42, 8), M.porcelain);
  paw.position.y = 0.18; pawPivot.add(paw);
  const pad = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), M.porcelain); pad.position.y = 0.42; pawPivot.add(pad);
  pawPivot.rotation.z = -0.5; g.add(pawPivot);
  cat.paw = pawPivot;
  // tail
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.5, 8), M.porcelain);
  tail.position.set(-0.3, 0.75, -0.3); tail.rotation.z = 0.7; tail.rotation.x = -0.4; g.add(tail);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  g.visible = false; world.add(g);
}
buildCat();
let kobanLife = 0; try { kobanLife = +localStorage.getItem('ls_koban_life') || 0; } catch (e) {}
if (kobanLife >= 10) {
  cat.g.traverse(o => {
    if (o.isMesh && o.material === M.porcelain) {
      o.material = o.material.clone(); o.material.color.set(0xd9b84a); o.material.emissive = new THREE.Color(0x3a2c08);
    }
  });
}
// v58: in rain she keeps to the covered kairo, then makes one dash for the hall
const CAT_STEPS = SEASON === 'rain'
  ? [[8.4, 0, 7.5], [9.6, 0, -1], [9.6, 0, -9.5], [0.9, 0.3, -25.9]]
  : [[3.6, 0, 6], [2.8, 0, -1], [1.9, 0, -8], [0.9, 0.3, -25.9]];
function mew() { tone(700, 950, 'sine', 0.16, 0.1); setTimeout(() => tone(950, 620, 'sine', 0.22, 0.1), 130); }
function awakenCat() {
  cat.state = 'approach'; cat.step = 0;
  const p = CAT_STEPS[0]; cat.g.position.set(p[0], p[1], p[2]);
  cat.g.visible = true; cat.waveT = 2.2;
  setTimeout(mew, 1200);
  say('???', SEASON === 'rain' ? 'mew. From the dry side.' : 'mew.', 2.5);
}
function advanceCat(n) {
  if (cat.state !== 'approach' || n >= CAT_STEPS.length) return;
  cat.step = n;
  const p = CAT_STEPS[n];
  cat.from = cat.g.position.clone(); cat.to = new THREE.Vector3(p[0], p[1], p[2]); cat.moveT = 0;
  cat.waveT = 2.4; setTimeout(mew, 500);
  if (SEASON === 'rain' && n === 3) say('THE CAT', 'One dash through the rain.', 3);
}
function spawnHeart() {
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M.shu);
  h.scale.set(1, 0.9, 0.6);
  h.position.copy(cat.g.position).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 1.5 + Math.random() * 0.3, (Math.random() - 0.5) * 0.3));
  world.add(h);
  cat.hearts.push({ m: h, t: 1.6, vy: 0.6 + Math.random() * 0.4 });
}

// ================= KOBAN OFFERINGS =================
const kobanEl = document.getElementById('koban');
let kobanHeld = 3, kobanGiven = 0;
const boxCoins = [], coinArcs = [];
function kobanHUD() {
  kobanEl.innerHTML = kobanHeld > 0 ? '<span>小判</span>' + '●'.repeat(kobanHeld) : '';
}
kobanHUD();
function clink() { tone(2400, 2350, 'sine', 0.12, 0.08); setTimeout(() => tone(3600, 3500, 'sine', 0.1, 0.05), 60); }
function tossKoban() {
  if (kobanHeld <= 0) { say('THE OFFERING BOX', 'Your purse is empty. Your presence was the fourth offering.', 3.5); return; }
  kobanHeld--; kobanGiven++; kobanHUD();
  try { localStorage.setItem('ls_koban_life', String((+localStorage.getItem('ls_koban_life') || 0) + 1)); } catch (e) {}
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.025, 14), M.gold);
  coin.rotation.x = Math.PI / 2;
  const from = new THREE.Vector3(player.pos.x, player.pos.y + 1.1, player.pos.z);
  const to = new THREE.Vector3((Math.random() - 0.5) * 1.2, 1.62 + boxCoins.length * 0.028, -27.6 + (Math.random() - 0.5) * 0.5);
  coin.position.copy(from); world.add(coin);
  coinArcs.push({ m: coin, from, to, t: 0 });
  tone(1400, 900, 'sine', 0.25, 0.05); // the flip
  setTimeout(() => {
    clink();
    boxCoins.push(coin);
    coin.rotation.set(Math.PI / 2 + (Math.random() - 0.5) * 0.5, 0, Math.random() * 3);
    if (cat.state !== 'hidden') { cat.waveT = Math.max(cat.waveT, 1.5); if (Math.random() < 0.5) spawnHeart(); }
    if (kobanGiven === 1) say('THE OFFERING BOX', 'A coin for the road behind you.', 3);
    if (kobanGiven === 2) say('THE OFFERING BOX', 'A coin for the road ahead.', 3);
    if (kobanGiven === 3) say('THE OFFERING BOX', 'The box is heavy. The heart is light.', 3.5);
  }, 700);
}

// ================= KOBAN SCATTER (great blessing) =================
const kobanDrops = [];
let kobanScattered = false;
const kobanScatterMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.35, metalness: 0.7, emissive: 0xffc9a0, emissiveIntensity: 0 });
const kobanTrailMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.35, metalness: 0.7, emissive: 0xffb46a, emissiveIntensity: 0.28 });
function kobanScatter() {
  if (kobanScattered) return; kobanScattered = true;
  const treads = [[0.3, -25.9, 2.0], [0.6, -26.55, 1.7], [0.9, -27.2, 1.5]];
  for (let i = 0; i < 10; i++) {
    const [ty, tz, hw] = treads[Math.floor(Math.random() * 3)];
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.022, 14), kobanScatterMat);
    m.rotation.y = Math.random() * 6.28;
    m.position.set((Math.random() * 2 - 1) * hw, ty + 1.4, tz + (Math.random() - 0.5) * 0.4);
    m.castShadow = true; world.add(m);
    kobanDrops.push({ m, y1: ty + 0.012, t: 0, delay: i * 0.12 });
  }
  // a trail of coins leads down the kairo path
  for (let i = 0; i < 16; i++) {
    const z = -24 + i * 2.0;
    const x = Math.sin(z * 0.45) * 0.55;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 14), kobanTrailMat);
    m.rotation.y = Math.random() * 6.28;
    m.position.set(x, 1.4, z);
    m.castShadow = true; world.add(m);
    kobanDrops.push({ m, y1: 0.012, t: 0, delay: 1.4 + i * 0.22 });
    setTimeout(() => tone(1046.5, 1046.5, 'sine', 0.22, 0.028), 1400 + i * 220);
  }
  [0, 2, 4, 7].forEach((n, i) => setTimeout(() => tone(523.25 * Math.pow(1.122, n), 523.25 * Math.pow(1.122, n), 'triangle', 0.5, 0.06), 250 + i * 130));
  setTimeout(() => say('THE SHRINE', 'A great blessing pays for the stones too.', 4), 1800);
}
function updateKobanDrops(dt) {
  for (const d of kobanDrops) {
    if (d.done) continue;
    if (d.delay > 0) { d.delay -= dt; continue; }
    d.t = Math.min(1, d.t + dt * 2.2);
    const fall = 1 - Math.pow(1 - d.t, 2);
    const bounce = d.t >= 1 ? 0 : Math.abs(Math.sin(d.t * 9)) * 0.06 * (1 - d.t);
    d.m.position.y = d.m.position.y + (d.y1 - d.m.position.y) * fall * 0.35 + bounce;
    if (d.t >= 1) { d.m.position.y = d.y1; d.done = true; }
  }
}

// ================= OMIKUJI =================
const OMIKUJI = [
  ['大吉', 'Great blessing. The thing you want wants you back.'],
  ['大吉', 'Great blessing. Say the scary yes.'],
  ['中吉', 'Middle blessing. Slow is smooth here.'],
  ['中吉', 'Middle blessing. The second idea is the good one.'],
  ['小吉', 'Small blessing. A warm meal fixes Tuesday.'],
  ['小吉', 'Small blessing. Water the plant, then the work.'],
  ['吉',   'Blessing. Ordinary luck, honestly earned.'],
  ['吉',   'Blessing. Call your mother. Luck lives there.'],
  ['末吉', 'Late blessing. It comes after the last try, not before.'],
  ['末吉', 'Late blessing. Keep the coin; keep the promise.'],
  ['凶',   'Curse. The cat knocked it off the shelf anyway. You are free.'],
  ['大凶', 'Great curse. The cat ate it. Nothing left to fear.'],
];
let omiStuck = SEASON === 'snow', omiStucks = 0; // v138: the cold swells the drawer shut - the first pull only rattles it
let omiDrawn = [];
try { omiDrawn = JSON.parse(localStorage.getItem('ls_omikuji') || '[]'); } catch (e) {}
const omiEl = document.getElementById('omikuji');
// the rack: wooden frame with hanging paper strips near the shrine
const OMI_POS = [4.1, 0, -25.0];
{
  addCyl(OMI_POS[0] - 0.8, 1.0, OMI_POS[2], 0.05, 0.06, 2.0, M.wood);
  addCyl(OMI_POS[0] + 0.8, 1.0, OMI_POS[2], 0.05, 0.06, 2.0, M.wood);
  const bar = addCyl(OMI_POS[0], 1.85, OMI_POS[2], 0.04, 0.04, 1.7, M.wood); bar.rotation.z = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const s = addBox(OMI_POS[0] - 0.65 + i * 0.26, 1.55, OMI_POS[2], 0.09, 0.5, 0.01, M.paper, { noCollide: true });
    s.rotation.z = (Math.random() - 0.5) * 0.15;
  }
  colliders.push({ min: new THREE.Vector3(OMI_POS[0] - 0.9, 0, OMI_POS[2] - 0.15), max: new THREE.Vector3(OMI_POS[0] + 0.9, 2, OMI_POS[2] + 0.15) });
}
let omiOpen = false, lastDrawnTier = null, tiedCount = 0;
const tiedStrips = [];
function tieToRack() {
  tiedCount++;
  const s = addBox(OMI_POS[0] - 0.65 + ((tiedCount * 0.23) % 1.4), 1.5 - (tiedCount % 3) * 0.12, OMI_POS[2] + 0.03, 0.09, 0.46, 0.01, M.paper, { noCollide: true });
  s.rotation.z = (Math.random() - 0.5) * 0.3;
  s.userData.baseZ = s.rotation.z;
  const kn = new THREE.Mesh(omiKnotGeo, omiKnotMat); // v110: the knot the wind pulls tight
  kn.position.set(0, 0.21, 0);
  s.add(kn); s.userData.knot = kn;
  tiedStrips.push(s);
  say('THE RACK', tiedCount === 1 ? 'Tied and left behind. The wind reads it so you do not have to.' : 'Another one the wind can keep.', 4);
  tone(520, 520, 'sine', 0.6, 0.07);
}
function drawOmikuji() {
  // v138: in the cold the drawer sticks - the first pull only rattles it; the second yields
  if (omiStuck) {
    omiStuck = false; omiStucks++;
    say('THE SHRINE', 'The drawer sticks, swollen by the cold. Once more.', 3.5);
    tone(150, 95, 'sine', 0.45, 0.1);
    return;
  }
  const remaining = OMIKUJI.map((f, i) => i).filter(i => !omiDrawn.includes(i));
  let pick;
  if (remaining.length === 0) { pick = Math.floor(Math.random() * OMIKUJI.length); }
  else { pick = remaining[Math.floor(Math.random() * remaining.length)]; omiDrawn.push(pick); try { localStorage.setItem('ls_omikuji', JSON.stringify(omiDrawn)); } catch (e) {} }
  const f = OMIKUJI[pick];
  lastDrawnTier = f[0];
  if (f[0] === '\u5927\u5409') kobanScatter();
  omiEl.querySelector('.tier').textContent = f[0];
  omiEl.querySelector('.line').textContent = f[1];
  const curse = (f[0] === '凶' || f[0] === '大凶');
  omiEl.querySelector('.meta2').textContent = 'おみくじ · ' + omiDrawn.length + ' OF ' + OMIKUJI.length + ' COLLECTED' + (curse ? ' · T TO TIE IT TO THE RACK' : ' · E TO FOLD');
  omiEl.style.display = 'block'; omiOpen = true;
  tone(880, 880, 'sine', 0.5, 0.08); tone(1320, 1320, 'sine', 0.7, 0.04);
}

// ================= SHARE CARD (1200x630) =================
const shareBtn = document.getElementById('sharebtn');
const markBaseImg = new Image(); markBaseImg.src = MARK_BASE;
const markPawImg = new Image(); markPawImg.src = MARK_PAW;
function loadImg(im) { return im.complete && im.naturalWidth ? Promise.resolve() : new Promise(r => { im.onload = r; im.onerror = r; }); }
async function renderShare() {
  await Promise.all([loadImg(markBaseImg), loadImg(markPawImg)]);
  const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 630;
  const g = cv.getContext('2d');
  // lacquer night ground
  const bg = g.createRadialGradient(760, 300, 60, 700, 330, 780);
  bg.addColorStop(0, '#2a2118'); bg.addColorStop(0.55, '#16130e'); bg.addColorStop(1, '#0d0b09');
  g.fillStyle = bg; g.fillRect(0, 0, 1200, 630);
  // moon
  g.fillStyle = '#f5f1e8'; g.beginPath(); g.arc(950, 128, 52, 0, 7); g.fill();
  g.fillStyle = 'rgba(245,241,232,0.08)'; g.beginPath(); g.arc(950, 128, 88, 0, 7); g.fill();
  // torii silhouette
  g.fillStyle = '#8e2f22';
  g.fillRect(88, 300, 30, 250); g.fillRect(318, 300, 30, 250);
  g.fillRect(60, 268, 316, 26); g.fillStyle = '#16130e'; g.fillRect(52, 258, 332, 12);
  g.fillStyle = '#8e2f22'; g.fillRect(96, 330, 244, 16);
  g.fillStyle = '#c9a227'; g.fillRect(203, 296, 30, 40);
  // path glow
  const pg = g.createLinearGradient(0, 630, 0, 480);
  pg.addColorStop(0, 'rgba(255,194,122,0.16)'); pg.addColorStop(1, 'rgba(255,194,122,0)');
  g.fillStyle = pg; g.fillRect(120, 480, 200, 150);
  // the mark, waving (base + paw layers), ink sprite recolored to cream via source-in
  const mw = 300, mh = 300;
  function creamSprite(im) {
    if (!im.naturalWidth) return null;
    const t = document.createElement('canvas'); t.width = im.naturalWidth; t.height = im.naturalHeight;
    const tg = t.getContext('2d');
    tg.drawImage(im, 0, 0);
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = '#f5f1e8'; tg.fillRect(0, 0, t.width, t.height);
    return t;
  }
  const cb = creamSprite(markBaseImg), cp = creamSprite(markPawImg);
  // warm halo so the cream mark lifts off the lacquer
  const halo = g.createRadialGradient(850, 400, 40, 850, 400, 210);
  halo.addColorStop(0, 'rgba(255,214,150,0.20)'); halo.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = halo; g.fillRect(640, 190, 420, 420);
  if (cb) g.drawImage(cb, 700, 250, mw, mh);
  if (cp) g.drawImage(cp, 700, 250, mw, mh);
  // text block
  g.textAlign = 'left';
  g.fillStyle = '#c9a227'; g.font = '26px "Hiragino Mincho ProN","Yu Mincho",serif';
  g.fillText('福 の 神 社', 70, 92);
  g.fillStyle = '#f5f1e8'; g.font = '600 64px "Hiragino Mincho ProN","Yu Mincho",serif';
  g.fillText('LUCKY SHRINE', 66, 158);
  const streak = (localStorage.getItem('ls_streak') || '1');
  let omiN = 0; try { omiN = JSON.parse(localStorage.getItem('ls_omikuji') || '[]').length; } catch (e) {}
  g.fillStyle = '#d8cfb8'; g.font = '21px ui-monospace,Menlo,monospace';
  g.fillText(streak + (streak === '1' ? ' DAY' : ' DAYS') + ' AT THE SHRINE  ·  ' + omiN + ' / 12 OMIKUJI', 70, 210);
  let emaList = []; try { emaList = JSON.parse(localStorage.getItem('ls_ema') || '[]'); } catch (e) {}
  if (emaList.length) {
    const wish = String(emaList[emaList.length - 1]);
    g.save(); g.translate(84, 244);
    g.fillStyle = '#d8b988'; g.beginPath();
    g.moveTo(-14, 16); g.lineTo(-14, -6); g.lineTo(0, -16); g.lineTo(14, -6); g.lineTo(14, 16); g.closePath(); g.fill();
    g.fillStyle = '#c73a24'; g.fillRect(-1.5, -14, 3, 6);
    g.restore();
    g.fillStyle = '#d8cfb8'; g.font = 'italic 20px Georgia,serif';
    g.fillText('\u201C' + (wish.length > 44 ? wish.slice(0, 41) + '...' : wish) + '\u201D', 112, 254);
    g.fillStyle = '#8a7f68'; g.font = '12px ui-monospace,Menlo,monospace';
    g.fillText('YOUR WISH HANGS AT THE SHRINE', 130, 358);
  }
  g.fillStyle = '#8a7f68'; g.font = '19px "Hiragino Mincho ProN","Yu Mincho",serif';
  g.fillText('Light the lanterns. Ring the bells. Beckon fortune.', 70, 560);
  g.fillStyle = '#c9a86a'; g.font = '16px ui-monospace,Menlo,monospace';
  g.fillText('jacobegarcia.github.io/lucky-shrine/', 70, 592);
  // the bells answer back: sibling mention, bottom right
  const bellsUrl = 'jacobegarcia.github.io/lucky-bells';
  g.textAlign = 'right';
  g.fillStyle = '#8a7f68'; g.font = '15px ui-monospace,Menlo,monospace';
  g.fillText(bellsUrl, 1130, 592);
  const bw = g.measureText(bellsUrl).width;
  g.fillStyle = '#c9a227'; g.font = '17px "Hiragino Mincho ProN","Yu Mincho",serif';
  g.fillText('the bells answer \u00B7 \u9234\u304C\u5FDC\u3048\u308B', 1130 - bw - 34, 592);
  g.save(); g.translate(1130 - bw - 16, 586);
  g.strokeStyle = '#c9a227'; g.lineWidth = 1.6;
  g.beginPath(); g.arc(0, 1, 6, Math.PI, 0); g.stroke();
  g.beginPath(); g.moveTo(-7.5, 1); g.lineTo(7.5, 1); g.stroke();
  g.beginPath(); g.moveTo(0, 1); g.lineTo(0, 6); g.stroke();
  g.fillStyle = '#c9a227'; g.beginPath(); g.arc(0, 7.2, 1.3, 0, 7); g.fill();
  g.restore();
  g.textAlign = 'left';
  return cv;
}
shareBtn.addEventListener('click', async () => {
  audio();
  const cv = await renderShare();
  const a = document.createElement('a');
  a.download = 'lucky-shrine.png';
  a.href = cv.toDataURL('image/png');
  a.click();
  say('THE SHRINE', 'A card for the road. Send it to someone who needs a shrine.', 4);
  tone(880, 880, 'sine', 0.4, 0.08);
});

// ================= COMPLETION =================
const winEl = document.getElementById('win');
const winH2 = winEl.querySelector('h2'), winP = winEl.querySelector('p');
const FORTUNES = [
  'A door you stopped checking is unlocked today.',
  'The small kindness comes back with interest.',
  'Ship the thing. The cat does not wait for perfect.',
  'Someone is about to say yes.',
  'What you feed grows. Feed the good habit.',
  'Fortune favors the one who shows up daily.',
];
// dawn hours (5-8am) draw from their own set - the early visit is its own fortune
const DAWN_FORTUNES = [
  'You came before the sun. Fortune noticed.',
  'The first visitor of the day gets the freshest luck.',
  'What you begin at dawn finishes itself.',
  'The shrine keeps the early hour for the sincere.',
  'Morning is a door that only opens from inside.',
  'The cat was already awake. So were you. Good sign.',
];
function pickFortune(hourOverride) {
  const hr = hourOverride == null ? new Date().getHours() : hourOverride;
  const dawnVisit = hr >= 5 && hr < 8;
  const set = dawnVisit ? DAWN_FORTUNES : FORTUNES;
  return { fortune: set[Math.floor(Math.random() * set.length)], dawnVisit };
}
window.__fortune = pickFortune;
function dripNearness() {
  const d = Math.hypot(player.pos.x - OMI_POS[0], player.pos.z - OMI_POS[2]);
  return Math.max(0, 1 - Math.max(0, d - 2) / 7);
}
window.__dripNear = dripNearness;
let done = false;
function hideWinCard() {
  winEl.style.opacity = '0';
  setTimeout(() => { if (winEl.style.opacity === '0') winEl.style.display = 'none'; }, 850);
}
winEl.addEventListener('click', () => { if (done) hideWinCard(); });
function completeShrine() {
  if (done) return; done = true;
  cat.state = 'arrived'; cat.waveT = 6;
  startDawn();
  for (let i = 0; i < 10; i++) setTimeout(spawnHeart, i * 180);
  tone(523.25, 523.25, 'triangle', 1.2, 0.15);
  setTimeout(() => tone(659.25, 659.25, 'triangle', 1.2, 0.15), 220);
  setTimeout(() => tone(783.99, 783.99, 'triangle', 2.2, 0.18), 440);
  let streak = 1;
  try {
    const today = new Date().toDateString();
    const last = localStorage.getItem('ls_last');
    const prev = +localStorage.getItem('ls_streak') || 0;
    const yest = new Date(Date.now() - 864e5).toDateString();
    streak = last === today ? prev : (last === yest ? prev + 1 : 1);
    localStorage.setItem('ls_streak', String(streak));
    localStorage.setItem('ls_last', today);
  } catch (e) {}
  const pf = pickFortune(); const fortune = pf.fortune;
  setTimeout(() => {
    winH2.textContent = pf.dawnVisit ? '福 DAWN FORTUNE RECEIVED' : '福 FORTUNE RECEIVED';
    winP.innerHTML = fortune + '<br><br><span class="meta" style="color:#c9a86a">' +
      streak + (streak === 1 ? ' DAY' : ' DAYS') + ' AT THE SHRINE' + (kobanGiven ? ' · ' + kobanGiven + ' KOBAN GIVEN (' + (+localStorage.getItem('ls_koban_life') || 0) + ' LIFETIME)' : '') + ' · RETURN TOMORROW<br><span style="opacity:.55;font-size:10px">CLICK TO LINGER AT THE SHRINE · DRAW AN OMIKUJI BY THE RACK</span></span>';
    winEl.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => winEl.style.opacity = '1'));
    if (document.pointerLockElement) document.exitPointerLock();
    shareBtn.style.display = 'block';
    galleryBtn.style.display = 'block';
  }, 1800);
}

// ================= SEASONAL PARTICLES =================
const LEAF_N = 120;
const leafGeo = new THREE.BufferGeometry();
const leafPos = new Float32Array(LEAF_N * 3), leafVel = new Float32Array(LEAF_N * 3);
function leafReset(i, top) {
  leafPos[i*3] = (Math.random() - 0.5) * 24;
  leafPos[i*3+1] = top ? 8 + Math.random() * 2 : Math.random() * 9;
  leafPos[i*3+2] = 14 - Math.random() * 55;
  leafVel[i*3] = (Math.random() - 0.5) * 0.3;
  leafVel[i*3+1] = SC.fall ? -(SC.vy[0] + Math.random() * (SC.vy[1] - SC.vy[0])) : 0;
  leafVel[i*3+2] = (Math.random() - 0.5) * 0.2;
}
for (let i = 0; i < LEAF_N; i++) leafReset(i, false);
leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3));
const leaves = new THREE.Points(leafGeo, new THREE.PointsMaterial({
  color: SC.color, size: SC.size, transparent: true, opacity: SC.opacity, depthWrite: false,
  blending: SEASON === 'firefly' ? THREE.AdditiveBlending : THREE.NormalBlending }));
world.add(leaves);

// ================= EMA (WISH PLAQUES) =================
// the racks get their own wood so rain can wet their sheen without touching sheltered timber
const emaWood = M.wood.clone();
if (SEASON === 'rain') { emaWood.color.setHex(0x332318); emaWood.roughness = 0.38; }
const EMA_POS = [-4.1, 0, -25.0];
let emaWishes = [];
try { emaWishes = JSON.parse(localStorage.getItem('ls_ema') || '[]'); } catch (e) {}
const emaEl = document.getElementById('ema');
const emaInput = document.getElementById('emainput');
let emaOpen = false;
const emaPlaques = [];
let emaRopeSnow = 0; // v70
const ropeSegs = [], ropeSleeves = []; // v95: live refs for the thaw lift
let ropeSag = 0.075; // v95: current sag depth
{
  addCyl(EMA_POS[0] - 0.8, 1.0, EMA_POS[2], 0.05, 0.06, 2.0, emaWood);
  addCyl(EMA_POS[0] + 0.8, 1.0, EMA_POS[2], 0.05, 0.06, 2.0, emaWood);
  const bar = addCyl(EMA_POS[0], 1.85, EMA_POS[2], 0.04, 0.04, 1.7, emaWood); bar.rotation.z = Math.PI / 2;
  if (SEASON === 'snow') {
    // v70: snow sag on the rack - a white sleeve along the bar top, and the snow-laden cord
    // bowing under the rail, lowest at the middle, tied off at the posts
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.62, 7), TORII_SNOW);
    sleeve.rotation.z = Math.PI / 2; sleeve.position.set(EMA_POS[0], 1.885, EMA_POS[2]);
    world.add(sleeve); emaRopeSnow++; ropeSleeves.push(sleeve);
    const SEG = 9;
    for (let i = 0; i < SEG; i++) {
      const t0 = i / SEG, t1 = (i + 1) / SEG;
      const x0 = EMA_POS[0] - 0.78 + 1.56 * t0, x1 = EMA_POS[0] - 0.78 + 1.56 * t1;
      const y0 = 1.84 - 0.075 * (1 - Math.pow(2 * t0 - 1, 2));
      const y1 = 1.84 - 0.075 * (1 - Math.pow(2 * t1 - 1, 2));
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, Math.hypot(x1 - x0, y1 - y0), 7), TORII_SNOW);
      seg.position.set((x0 + x1) / 2, (y0 + y1) / 2, EMA_POS[2] + 0.055);
      seg.rotation.z = Math.PI / 2 + Math.atan2(y1 - y0, x1 - x0);
      world.add(seg); emaRopeSnow++; ropeSegs.push({ m: seg, t0, t1, x0, x1 });
    }
  }
  colliders.push({ min: new THREE.Vector3(EMA_POS[0] - 0.9, 0, EMA_POS[2] - 0.15), max: new THREE.Vector3(EMA_POS[0] + 0.9, 2, EMA_POS[2] + 0.15) });
}
function emaTexture(text, weather) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 320;
  const x = c.getContext('2d');
  weather = weather || 0; // 0 fresh .. 1 seasons-old; only bites in rain season
  const wet = SEASON === 'rain' ? weather : 0;
  // ema silhouette: peaked roof over a rectangle, warm wood
  x.fillStyle = '#d8b988'; x.beginPath();
  x.moveTo(28, 300); x.lineTo(28, 90); x.lineTo(128, 20); x.lineTo(228, 90); x.lineTo(228, 300); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(90,60,30,.65)'; x.lineWidth = 5; x.stroke();
  // hole + cord
  x.fillStyle = '#0d0b09'; x.beginPath(); x.arc(128, 52, 7, 0, 7); x.fill();
  x.strokeStyle = '#c73a24'; x.lineWidth = 4; x.beginPath(); x.moveTo(128, 59); x.lineTo(128, 78); x.stroke();
  // wish text, ink, wrapped - rain season fades and bleeds the old wishes
  x.textAlign = 'center'; x.font = '600 26px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif';
  const words = String(text).split(/\s+/), lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > 13) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  const inkA = 1 - wet * 0.62; // old ink washes thin
  lines.slice(0, 5).forEach((l, i) => {
    const ly = 125 + i * 36;
    if (wet > 0) { // the bleed: ink weeps a few pixels straight down
      x.fillStyle = 'rgba(42,33,24,' + (inkA * 0.28 * wet).toFixed(3) + ')';
      x.fillText(l, 128, ly + 3);
    }
    x.fillStyle = 'rgba(42,33,24,' + inkA.toFixed(3) + ')';
    x.fillText(l, 128, ly);
    if (wet > 0) { // drips run from under the strokes
      let dseed = (i + 1) * 131 + String(text).length * 17;
      const drnd = () => (dseed = (dseed * 16807) % 2147483647) / 2147483647;
      const drips = 1 + Math.floor(drnd() * 3);
      for (let d = 0; d < drips; d++) {
        const dx = 52 + drnd() * 152, dlen = (10 + drnd() * 26) * wet;
        x.strokeStyle = 'rgba(42,33,24,' + (0.32 * wet).toFixed(3) + ')'; x.lineWidth = 1.6;
        x.beginPath(); x.moveTo(dx, ly + 4); x.lineTo(dx + (drnd() - 0.5) * 2, ly + 4 + dlen); x.stroke();
      }
    }
  });
  if (wet > 0.4) { // rain stain pooling at the bottom edge
    const gr = x.createLinearGradient(0, 230, 0, 300);
    gr.addColorStop(0, 'rgba(70,80,88,0)'); gr.addColorStop(1, 'rgba(70,80,88,' + (0.28 * wet).toFixed(3) + ')');
    x.fillStyle = gr; x.fillRect(28, 230, 200, 70);
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
const EMA2_POS = [-4.1, 0, -23.2];
const EMA3_POS = [-6.3, 0, -24.3];
let ema2Built = false, ema2Spoke = false, ema3Built = false, ema3Spoke = false;
function emaRackSnow(p) { // v70/v71: white sleeve + snow-laden cord bowing under the rail
  if (SEASON !== 'snow') return;
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.62, 7), TORII_SNOW);
  sleeve.rotation.z = Math.PI / 2; sleeve.position.set(p[0], 1.885, p[2]);
  world.add(sleeve); emaRopeSnow++; ropeSleeves.push(sleeve);
  const SEG = 9;
  for (let i = 0; i < SEG; i++) {
    const t0 = i / SEG, t1 = (i + 1) / SEG;
    const x0 = p[0] - 0.78 + 1.56 * t0, x1 = p[0] - 0.78 + 1.56 * t1;
    const y0 = 1.84 - 0.075 * (1 - Math.pow(2 * t0 - 1, 2));
    const y1 = 1.84 - 0.075 * (1 - Math.pow(2 * t1 - 1, 2));
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, Math.hypot(x1 - x0, y1 - y0), 7), TORII_SNOW);
    seg.position.set((x0 + x1) / 2, (y0 + y1) / 2, p[2] + 0.055);
    seg.rotation.z = Math.PI / 2 + Math.atan2(y1 - y0, x1 - x0);
    world.add(seg); emaRopeSnow++; ropeSegs.push({ m: seg, t0, t1, x0, x1 });
  }
}
function buildEmaRack3() {
  if (ema3Built) return; ema3Built = true;
  addCyl(EMA3_POS[0] - 0.8, 1.0, EMA3_POS[2], 0.05, 0.06, 2.0, emaWood);
  addCyl(EMA3_POS[0] + 0.8, 1.0, EMA3_POS[2], 0.05, 0.06, 2.0, emaWood);
  const bar = addCyl(EMA3_POS[0], 1.85, EMA3_POS[2], 0.04, 0.04, 1.7, emaWood); bar.rotation.z = Math.PI / 2;
  emaRackSnow(EMA3_POS);
  colliders.push({ min: new THREE.Vector3(EMA3_POS[0] - 0.9, 0, EMA3_POS[2] - 0.15), max: new THREE.Vector3(EMA3_POS[0] + 0.9, 2, EMA3_POS[2] + 0.15) });
}
function buildEmaRack2() {
  if (ema2Built) return; ema2Built = true;
  addCyl(EMA2_POS[0] - 0.8, 1.0, EMA2_POS[2], 0.05, 0.06, 2.0, emaWood);
  addCyl(EMA2_POS[0] + 0.8, 1.0, EMA2_POS[2], 0.05, 0.06, 2.0, emaWood);
  const bar = addCyl(EMA2_POS[0], 1.85, EMA2_POS[2], 0.04, 0.04, 1.7, emaWood); bar.rotation.z = Math.PI / 2;
  emaRackSnow(EMA2_POS);
  colliders.push({ min: new THREE.Vector3(EMA2_POS[0] - 0.9, 0, EMA2_POS[2] - 0.15), max: new THREE.Vector3(EMA2_POS[0] + 0.9, 2, EMA2_POS[2] + 0.15) });
}
let snowCaps = 0; // v63
const emaCapGeo = new THREE.BoxGeometry(0.3, 0.034, 0.034);
const emaCapMat = new THREE.MeshStandardMaterial({ color: 0xe6ecf1, roughness: 0.92, metalness: 0.02 });
function renderEmaRack(list, base, key) {
  list.forEach((w, i) => {
    const weather = list.length > 1 ? 0.25 + 0.75 * (1 - i / (list.length - 1)) : 0.5; // oldest plaques weathered most
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.02),
      (() => { const t = emaTexture(w, weather); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.22 }); })());
    m.position.set(base[0] - 0.72 + (i % 6) * 0.29, 1.52 - Math.floor(i / 6) * 0.5, base[2] + 0.04);
    m.rotation.z = (Math.sin(i * 7.3 + key) * 0.05); m.rotation.y = (Math.sin(i * 3.1 + key) * 0.12);
    m.userData.baseZ = m.rotation.z; m.userData.baseY = m.rotation.y; m.userData.phase = i * 1.37 + key; m.userData.emaWeather = weather;
    // v63: snow season caps each plaque - a pale drifted line along the top edge, swung with the wood
    if (SEASON === 'snow') {
      const cap = new THREE.Mesh(emaCapGeo, emaCapMat);
      cap.position.set(0, 0.212, 0.004);
      cap.rotation.z = Math.sin(i * 5.7 + key) * 0.04;
      cap.scale.x = 0.5 + 0.12 * Math.abs(Math.sin(i * 2.9 + key)); // hug the gable peak, no floating ends
      m.add(cap); snowCaps++;
      // v120: rime gathers at the top corners - the fresh plaques frost, the old are already white
      const frostMat = new THREE.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.95, transparent: true, opacity: 0, emissive: 0xafc4d4, emissiveIntensity: 0.25 });
      const fl = new THREE.Mesh(emaFrostGeo, frostMat);
      fl.position.set(-0.125, 0.175, 0.012); fl.rotation.z = 0.4; m.add(fl);
      const fr = new THREE.Mesh(emaFrostGeo, frostMat.clone());
      fr.position.set(0.125, 0.175, 0.012); fr.rotation.z = -0.4; m.add(fr);
      emaCornerFrost.push({ l: fl, r: fr, w: weather });
    }
    world.add(m); emaPlaques.push(m);
    if (SEASON === 'snow') emaWet.push(m.material); // v126
  });
}
function renderEma() {
  for (const p of emaPlaques) world.remove(p);
  emaPlaques.length = 0;
  emaCornerFrost.length = 0; // v120: the patches go with their plaques
  emaWet.length = 0; // v126
  if (emaWishes.length > 24) {
    buildEmaRack2(); buildEmaRack3();
    const all = emaWishes.slice(-36);
    renderEmaRack(all.slice(0, 12), EMA_POS, 0);
    renderEmaRack(all.slice(12, 24), EMA2_POS, 4.7);
    renderEmaRack(all.slice(24), EMA3_POS, 9.1);
  } else if (emaWishes.length > 12) {
    buildEmaRack2();
    const all = emaWishes.slice(-24);
    renderEmaRack(all.slice(0, 12), EMA_POS, 0);
    renderEmaRack(all.slice(12), EMA2_POS, 4.7);
  } else renderEmaRack(emaWishes.slice(-12), EMA_POS, 0);
}
renderEma();
function emaOpenSet(on) {
  emaOpen = on;
  emaEl.style.display = on ? 'block' : 'none';
  if (on) { if (document.pointerLockElement) document.exitPointerLock(); emaInput.value = ''; setTimeout(() => emaInput.focus(), 60); }
}
emaInput.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter') {
    const w = emaInput.value.trim();
    if (w) {
      emaWishes.push(w); try { localStorage.setItem('ls_ema', JSON.stringify(emaWishes.slice(-60))); } catch (err) {}
      renderEma(); tone(880, 879, 'sine', 1.2, 0.1);
      if (ema3Built && !ema3Spoke) { ema3Spoke = true; say('THE EMA RACK', 'Three racks now. The wind has much to read.', 4); }
      else if (ema2Built && !ema2Spoke) { ema2Spoke = true; say('THE EMA RACK', 'One rack was not enough. It never is.', 4); }
      else say('THE EMA RACK', 'The wood holds it now. The wind will read it first.', 4);
    }
    emaOpenSet(false);
  } else if (e.key === 'Escape') emaOpenSet(false);
});
window.__ema = () => emaWishes.slice();
window.__emaFree = () => emaPlaques.map(m => ({ w: +(m.userData.emaWeather || 0).toFixed(2), free: +(1 - (m.userData.emaWeather || 0.5) * 0.6).toFixed(2), dz: +(m.rotation.z - m.userData.baseZ).toFixed(3) }));
window.__emaOpen = emaOpenSet;

// ================= SHOOTING STARS =================
let starWait = 25 + Math.random() * 40, star = null;
function updateStars(dt) {
  if (SEASON === 'rain') return;
  if (!star) {
    starWait -= dt;
    if (starWait <= 0) {
      star = { x: -15 + Math.random() * 30, y: 11 + Math.random() * 4, z: -40, t: 0, dur: 0.9, pos: new Float32Array(6) };
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(star.pos, 3));
      star.m = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xf5f1e8, transparent: true, opacity: 0.85 }));
      world.add(star.m);
    }
    return;
  }
  star.t += dt; const p = star.t / star.dur;
  if (p >= 1) { world.remove(star.m); star = null; starWait = 40 + Math.random() * 55; return; }
  const dx = p * 6.5, dy = -p * 2.4;
  star.pos[0] = star.x + dx;       star.pos[1] = star.y + dy;        star.pos[2] = star.z;
  star.pos[3] = star.x + dx - 1.5; star.pos[4] = star.y + dy + 0.55; star.pos[5] = star.z;
  star.m.material.opacity = 0.85 * (1 - p);
  star.m.geometry.attributes.position.needsUpdate = true;
}
window.__star = () => { starWait = 0; };

// ================= THE MOON =================
{
  const moonTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    const halo = x.createRadialGradient(128, 128, 30, 128, 128, 128);
    halo.addColorStop(0, 'rgba(245,241,232,0.9)'); halo.addColorStop(0.35, 'rgba(245,241,232,0.35)'); halo.addColorStop(1, 'rgba(245,241,232,0)');
    x.fillStyle = halo; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#f5f1e8'; x.beginPath(); x.arc(128, 128, 30, 0, 7); x.fill();
    // maria: quiet shading so it reads as the moon, not a lamp
    x.fillStyle = 'rgba(200,195,180,0.5)';
    x.beginPath(); x.arc(118, 120, 7, 0, 7); x.fill();
    x.beginPath(); x.arc(136, 136, 5, 0, 7); x.fill();
    x.beginPath(); x.arc(130, 114, 4, 0, 7); x.fill();
    return new THREE.CanvasTexture(c);
  })();
  const moonSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false }));
  moonSpr.scale.set(14, 14, 1);
  moonSpr.position.set(9, 13.5, -42);
  if (SEASON !== 'rain') world.add(moonSpr); // clouds take it in the rain
}

let snowBasins = 0;
// v62: the rain-chain basins stay out all winter - in snow season they stand dry and cold,
// holding a drifted dusting instead of water. No chain, no pour, no rings: the silence is the point.
if (SEASON === 'snow') {
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xe6ecf1, roughness: 0.92, metalness: 0.02 });
  for (const side of [-1, 1]) {
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.16, 12), M.stoneD);
    basin.position.set(side * 10.62, 0.08, -30); basin.receiveShadow = true; world.add(basin);
    const drift = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), snowMat);
    drift.scale.set(1, 0.22, 1); drift.position.set(side * 10.62, 0.155, -30); drift.receiveShadow = true;
    world.add(drift); snowBasins++;
  }
}

// ================= CHOZUYA (water basin) =================
const BASIN_POS = [2.3, 0, 8.5];
let basinRipples = [];
let chozuWater = null, chozuFrost = null, basinWashes = 0, basinHushed = 0, ladleFrost = 0; // v61: the stilling
let chozuIce = null; // v98: the basin ice sheet that sags and darkens in the thaw
const pourMats = []; // v55: gutter spout streams, shimmered in updateBasin
const spillMats = [], spillThreads = []; let spillRings = 0, spillT = 0; // v56: basin overflow after long rain
{
  const stone = new THREE.MeshStandardMaterial({ color: 0x77726a, roughness: 0.9 });
  const water = new THREE.MeshStandardMaterial({ color: 0x2e3a42, roughness: 0.05, metalness: 0.4 });
  addBox(BASIN_POS[0], 0.4, BASIN_POS[2], 0.9, 0.55, 0.6, stone);
  // v61 audit catch: the rim was a solid slab and the water plane sat INSIDE it, invisible.
  // Rebuilt as a frame of four rails so the water surface actually shows.
  addBox(BASIN_POS[0] - 0.44, 0.68, BASIN_POS[2], 0.10, 0.08, 0.68, stone, { noCollide: true });
  addBox(BASIN_POS[0] + 0.44, 0.68, BASIN_POS[2], 0.10, 0.08, 0.68, stone, { noCollide: true });
  addBox(BASIN_POS[0], 0.68, BASIN_POS[2] - 0.295, 0.78, 0.08, 0.09, stone, { noCollide: true });
  addBox(BASIN_POS[0], 0.68, BASIN_POS[2] + 0.295, 0.78, 0.08, 0.09, stone, { noCollide: true });
  const w = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.5), water);
  w.rotation.x = -Math.PI / 2; w.position.set(BASIN_POS[0], 0.7, BASIN_POS[2]); world.add(w);
  chozuWater = water;
  // v61: snow season stills the water skin - the mirror dies to a matte, and frost only
  // whispers at the rim. First silence instead of first ice.
  if (SEASON === 'snow') {
    water.roughness = 0.58; water.metalness = 0.08; water.color.setHex(0x364249);
    const frost = new THREE.Mesh(new THREE.RingGeometry(0.30, 0.40, 24),
      new THREE.MeshBasicMaterial({ color: 0xdfe8ec, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
    frost.rotation.x = -Math.PI / 2; frost.position.set(BASIN_POS[0], 0.703, BASIN_POS[2]); frost.scale.y = 0.64; // match the 0.78x0.5 water plane
    world.add(frost); chozuFrost = frost;
    // v98: an ice sheet over the stilled water - pale and level at night; the dawn
    // thaw undermines it: it sags below the rim and darkens as the water shows through
    const ice = new THREE.Mesh(new THREE.CircleGeometry(0.365, 24),
      new THREE.MeshBasicMaterial({ color: 0xdfe8ec, transparent: true, opacity: 0.85 }));
    ice.rotation.x = -Math.PI / 2; ice.position.set(BASIN_POS[0], 0.704, BASIN_POS[2]); ice.scale.y = 0.64;
    ice.userData.y0 = 0.704;
    world.add(ice); chozuIce = ice;
  }
  // bamboo ladle resting across the rim
  const bamboo = new THREE.MeshStandardMaterial({ color: 0xa8a86a, roughness: 0.8 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 8), bamboo);
  handle.rotation.z = Math.PI / 2; handle.rotation.y = 0.3;
  handle.position.set(BASIN_POS[0] - 0.05, 0.74, BASIN_POS[2]); world.add(handle);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.05, 10), bamboo);
  cup.position.set(BASIN_POS[0] + 0.22, 0.73, BASIN_POS[2] + 0.06); world.add(cup);
  if (SEASON === 'snow') {
    // v68: frost skin on the ladle - a bloom along the handle's top, a white rime on the cup's lip
    bamboo.color.setHex(0xc9cbb4); bamboo.roughness = 0.95;
    const frostSkin = new THREE.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.95 });
    const hLine = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.46, 6), frostSkin);
    hLine.rotation.z = Math.PI / 2; hLine.rotation.y = 0.3;
    hLine.position.set(BASIN_POS[0] - 0.05, 0.752, BASIN_POS[2]); world.add(hLine);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.006, 6, 16), frostSkin);
    lip.rotation.x = Math.PI / 2; lip.position.set(BASIN_POS[0] + 0.22, 0.756, BASIN_POS[2] + 0.06); world.add(lip);
    ladleFrost += 2;
  }
}
function washBasin() {
  basinWashes++;
  const hushed = SEASON === 'snow'; // v61: the stilled skin answers quietly
  if (hushed) basinHushed++;
  if (hushed) tone(660, 240, 'sine', 0.45, 0.028); // water moving slowly, thinking about ice
  else tone(1200, 300, 'sine', 0.7, 0.05); // poured water
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.08, 20),
    new THREE.MeshBasicMaterial({ color: 0x9ab2c8, transparent: true, opacity: hushed ? 0.4 : 0.7, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(BASIN_POS[0], 0.71, BASIN_POS[2]);
  world.add(ring); basinRipples.push({ m: ring, t: hushed ? 0.55 : 1 });
  say('THE BASIN', hushed
    ? ['The water moves slowly. It is thinking about ice.', 'The ladle dips and barely answers.', 'Cold on cold. The night approves.'][Math.floor(Math.random() * 3)]
    : ['Wash the day off. The night listens better.', 'Cold water, warm road.', 'The ladle remembers every hand.'][Math.floor(Math.random() * 3)], 4);
}
function updateBasin(dt) {
  // rain season: drops dimple the kairo basins' water, rings blooming and fading
  if (SEASON === 'rain') {
    for (let i = 0; i < pourMats.length; i++) pourMats[i].opacity = (i % 2 ? 0.2 : 0.4) + Math.sin(performance.now() * 0.013 + i * 2.1) * 0.08;
    // the basins fill over a long rain; past the brim they weep downhill and pool
    const brimming = kairoDimples >= 400;
    for (const sm of spillMats) sm.opacity += ((brimming ? 0.55 : 0) - sm.opacity) * Math.min(1, dt * 1.2);
    for (const tm of spillThreads) tm.opacity += ((brimming ? 0.5 : 0) - tm.opacity) * Math.min(1, dt * 1.2);
    if (brimming) {
      spillT -= dt;
      if (spillT <= 0) {
        spillT = 1.2 + Math.random() * 0.8;
        const side = Math.random() < 0.5 ? -1 : 1;
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.036, 12),
          new THREE.MeshBasicMaterial({ color: 0xc8dce8, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(side * 10.62 + (Math.random() - 0.5) * 0.1, 0.117, -30.5 - Math.random() * 0.6);
        world.add(ring); basinRipples.push({ m: ring, t: 0.7 }); spillRings++;
      }
    }
    kairoDimpleT -= dt;
    if (kairoDimpleT <= 0) {
      kairoDimpleT = 0.1 + Math.random() * 0.12;
      const side = Math.random() < 0.5 ? -1 : 1;
      // most rings bloom where the spout lands; the rest are rain scatter
      const impact = Math.random() < 0.65;
      const a = Math.random() * Math.PI * 2, rr = impact ? Math.random() * 0.06 : 0.08 + Math.random() * 0.14;
      // v60: gusts push the dimple field upwind - the same wind that leans the rain touches the water
      lastDimpleBias = rainSlant * (0.08 + Math.random() * 0.12);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.032, 12),
        new THREE.MeshBasicMaterial({ color: 0xaec6d8, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(side * 10.62 + Math.cos(a) * rr + lastDimpleBias, 0.175, -30 + Math.sin(a) * rr);
      world.add(ring); basinRipples.push({ m: ring, t: 0.9 }); kairoDimples++;
    }
  }
  for (let i = basinRipples.length - 1; i >= 0; i--) {
    const r = basinRipples[i];
    r.t -= dt * 0.8; r.m.scale.multiplyScalar(1 + dt * 1.6); r.m.material.opacity = r.t * 0.7;
    if (r.t <= 0) { world.remove(r.m); basinRipples.splice(i, 1); }
  }
}

// ================= RAIN (season=rain) =================
let rainGeo = null, rainPos = null, rainVel = null;
let flowGeo = null, flowPos = null, flowVel = null, chainGeo = null, chainPos = null, chainVel = null;
let rackDripT = 0.8, kairoDimpleT = 0, kairoDimples = 0;
let lastDimpleBias = 0; // v60: upwind offset of the latest basin ring, for QA
let rainSlant = 0; // v59: how hard the gust wind is leaning the rain right now
let slantHold = null; // v61: QA override - a number pins the wind lean, null returns it to the live breeze
let dripGeo = null, dripPos = null, dripVel = null, dripWait = null, dripX = null, dripZ = null, dripTop = null;
if (SEASON === 'rain') {
  const RN = 340;
  rainPos = new Float32Array(RN * 6); rainVel = new Float32Array(RN);
  for (let i = 0; i < RN; i++) {
    const x = (Math.random() - 0.5) * 40, y = Math.random() * 12, z = 14 - Math.random() * 55;
    rainPos[i * 6] = x; rainPos[i * 6 + 1] = y; rainPos[i * 6 + 2] = z;
    rainPos[i * 6 + 3] = x + 0.06; rainPos[i * 6 + 4] = y + 0.38; rainPos[i * 6 + 5] = z;
    rainVel[i] = 9 + Math.random() * 4;
  }
  rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  world.add(new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x8fa8c0, transparent: true, opacity: 0.32 })));
  // puddles on the path
  const pudMat = new THREE.MeshStandardMaterial({ color: 0x556270, roughness: 0.08, metalness: 0.55, transparent: true, opacity: 0.55 });
  [[0.3, 6.2, 0.5], [-0.5, -0.9, 0.38], [0.2, -7.4, 0.44]].forEach(([px, pz, pr]) => {
    const p = new THREE.Mesh(new THREE.CircleGeometry(pr, 16), pudMat);
    p.rotation.x = -Math.PI / 2; p.position.set(px, 0.115, pz); world.add(p);
  });
  // rain gutters along the inner kairo eaves; water runs toward the shrine end
  const gutMat = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.6, metalness: 0.3 });
  for (const side of [-1, 1]) {
    const gut = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 42), gutMat);
    gut.position.set(side * 10.62, 2.68, -10); gut.castShadow = true; world.add(gut);
  }
  const FN = 40;
  flowPos = new Float32Array(FN * 6); flowVel = new Float32Array(FN);
  for (let i = 0; i < FN; i++) {
    const side = i % 2 ? 1 : -1;
    const z = 9.6 - Math.random() * 39;
    flowPos[i * 6] = side * 10.52; flowPos[i * 6 + 1] = 2.62; flowPos[i * 6 + 2] = z;
    flowPos[i * 6 + 3] = side * 10.52; flowPos[i * 6 + 4] = 2.62; flowPos[i * 6 + 5] = z + 0.55;
    flowVel[i] = 2.2 + Math.random() * 1.2;
  }
  flowGeo = new THREE.BufferGeometry();
  flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3));
  world.add(new THREE.LineSegments(flowGeo, new THREE.LineBasicMaterial({ color: 0xaec6d8, transparent: true, opacity: 0.55 })));
  // rain chains at the downhill end, into stone basins
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.016, 6, 10), gutMat);
      link.position.set(side * 10.62, 2.55 - i * 0.28, -30); link.rotation.y = (i % 2) * Math.PI / 2;
      world.add(link);
    }
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.16, 12), M.stoneD);
    basin.position.set(side * 10.62, 0.08, -30); basin.receiveShadow = true; world.add(basin);
    const bw = new THREE.Mesh(new THREE.CircleGeometry(0.3, 12), pudMat);
    bw.rotation.x = -Math.PI / 2; bw.position.set(side * 10.62, 0.17, -30); world.add(bw);
    // v55: the gutter mouths a bamboo spout over the chain; the pour ties the dimples to a source
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xa8a86a, roughness: 0.8 }));
    spout.rotation.x = Math.PI / 2 - 0.35; spout.position.set(side * 10.62, 2.6, -30.08); spout.castShadow = true; world.add(spout);
    const pourMat = new THREE.MeshBasicMaterial({ color: 0xd4e6f2, transparent: true, opacity: 0.42 });
    const pour = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.028, 2.3, 8), pourMat);
    pour.position.set(side * 10.62, 1.32, -30); world.add(pour);
    pourMats.push(pourMat);
    // pale churn where the pour lands
    const churn = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), new THREE.MeshBasicMaterial({ color: 0xd4e6f2, transparent: true, opacity: 0.22 }));
    churn.rotation.x = -Math.PI / 2; churn.position.set(side * 10.62, 0.176, -30); world.add(churn);
    pourMats.push(churn.material);
    // v56: after long rain the basin overfills - a wet rivulet runs downhill, pale thread on top
    const spillMat = new THREE.MeshStandardMaterial({ color: 0x556270, roughness: 0.08, metalness: 0.55, transparent: true, opacity: 0 });
    const spill = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 1.7), spillMat);
    spill.rotation.x = -Math.PI / 2; spill.position.set(side * 10.62, 0.116, -30.85); world.add(spill);
    spillMats.push(spillMat);
    const threadMat = new THREE.MeshBasicMaterial({ color: 0xd4e6f2, transparent: true, opacity: 0 });
    const thread = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 1.7), threadMat);
    thread.rotation.x = -Math.PI / 2; thread.position.set(side * 10.62, 0.118, -30.85); world.add(thread);
    spillThreads.push(threadMat);
  }
  const CN = 12;
  chainPos = new Float32Array(CN * 6); chainVel = new Float32Array(CN);
  for (let i = 0; i < CN; i++) {
    const side = i % 2 ? 1 : -1;
    const y = 0.2 + Math.random() * 2.4;
    chainPos[i * 6] = side * 10.62; chainPos[i * 6 + 1] = y; chainPos[i * 6 + 2] = -30;
    chainPos[i * 6 + 3] = side * 10.62; chainPos[i * 6 + 4] = y + 0.12; chainPos[i * 6 + 5] = -30;
    chainVel[i] = 2.6 + Math.random() * 1.2;
  }
  chainGeo = new THREE.BufferGeometry();
  chainGeo.setAttribute('position', new THREE.BufferAttribute(chainPos, 3));
  world.add(new THREE.LineSegments(chainGeo, new THREE.LineBasicMaterial({ color: 0xaec6d8, transparent: true, opacity: 0.5 })));
}
// drips: rain off the eaves and gates; slow meltwater in snow
let dripMaxWait = 2.6, dripBaseWait = 0.4;
let toriiWeep = 0; // v97: torii lintel drips currently falling
if (SEASON === 'rain' || SEASON === 'snow') {
  const SNOWMELT = SEASON === 'snow';
  if (SNOWMELT) { dripMaxWait = 5.2; dripBaseWait = 1.2; }
  const DN = 80; // v97: extra torii slots for the dawn weep
  dripPos = new Float32Array(DN * 6); dripVel = new Float32Array(DN); dripWait = new Float32Array(DN); dripX = new Float32Array(DN); dripZ = new Float32Array(DN); dripTop = new Float32Array(DN);
  for (let i = 0; i < DN; i++) {
    if (i < 44) {
      dripX[i] = (i % 2 ? 1 : -1) * 11.27 + (Math.random() - 0.5) * 0.1;
      dripZ[i] = 10 - Math.random() * 41; dripTop[i] = 2.69;
    } else if (i < 62) { // v97: first torii lintel
      dripX[i] = (Math.random() - 0.5) * 4.9; dripZ[i] = 6 + (Math.random() - 0.5) * 0.5; dripTop[i] = 4.95;
    } else {
      dripX[i] = (Math.random() - 0.5) * 4.0; dripZ[i] = -10 + (Math.random() - 0.5) * 0.45; dripTop[i] = 4.18;
    }
    dripWait[i] = Math.random() * (SNOWMELT ? 5 : 2.4);
    dripVel[i] = SNOWMELT ? 3.2 + Math.random() * 1.2 : 5.2 + Math.random() * 1.6;
    dripPos[i * 6] = dripX[i]; dripPos[i * 6 + 1] = -1; dripPos[i * 6 + 2] = dripZ[i];
    dripPos[i * 6 + 3] = dripX[i]; dripPos[i * 6 + 4] = -1; dripPos[i * 6 + 5] = dripZ[i];
  }
  dripGeo = new THREE.BufferGeometry();
  dripGeo.setAttribute('position', new THREE.BufferAttribute(dripPos, 3));
  world.add(new THREE.LineSegments(dripGeo, new THREE.LineBasicMaterial({ color: 0xaec6d8, transparent: true, opacity: 0.5 })));
}
function updateRain(dt) {
  if (!rainGeo && !dripGeo) return;
  // omikuji rack drips: soft ticks off the paper strips, louder the closer you stand
  if (SEASON === 'rain' && AC) {
    rackDripT -= dt;
    if (rackDripT <= 0) {
      rackDripT = 0.25 + Math.random() * 0.85;
      const near = dripNearness();
      if (near > 0.02) {
        const f = 1500 + Math.random() * 1200;
        tone(f, f * 0.7, 'sine', 0.07, 0.045 * near);
      }
    }
  }
  if (rainGeo) for (let i = 0; i < rainVel.length; i++) {
    rainPos[i * 6 + 1] -= rainVel[i] * dt; rainPos[i * 6] -= rainVel[i] * dt * (0.16 + rainSlant);
    if (rainPos[i * 6 + 1] < 0) {
      const x = (Math.random() - 0.5) * 40, z = 14 - Math.random() * 55;
      rainPos[i * 6] = x; rainPos[i * 6 + 1] = 11 + Math.random() * 2; rainPos[i * 6 + 2] = z;
    }
    rainPos[i * 6 + 3] = rainPos[i * 6] + (0.16 + rainSlant) * 0.38; rainPos[i * 6 + 4] = rainPos[i * 6 + 1] + 0.38; rainPos[i * 6 + 5] = rainPos[i * 6 + 2];
  }
  if (rainGeo) rainGeo.attributes.position.needsUpdate = true;
  // drips: wait at the lip, then fall
  toriiWeep = 0;
  if (dripGeo) for (let i = 0; i < dripVel.length; i++) {
    // v97: the torii lintels hold their melt until the dawn thaw, then weep harder as they warm
    let trail = 0.14;
    if (i >= 44 && SEASON === 'snow') {
      const tw = dawnOn ? Math.min(1, Math.max(0, (dawnT - 0.55) / 0.35)) : 0;
      if (tw <= 0) { dripPos[i * 6 + 1] = -1; dripPos[i * 6 + 4] = -1; continue; }
      dripWait[i] -= dt * 1.4 * tw;
      trail += 0.22 * tw; // the weep stretches as the gate warms
      if (dripPos[i * 6 + 1] >= 0) toriiWeep++;
    }
    if (dripWait[i] > 0) { dripWait[i] -= dt; continue; }
    let y = dripPos[i * 6 + 1];
    if (y < 0) { y = dripTop[i]; }
    y -= dripVel[i] * dt;
    if (y < 0.05) { dripWait[i] = dripBaseWait + Math.random() * dripMaxWait; y = -1; }
    dripPos[i * 6] = dripX[i]; dripPos[i * 6 + 1] = y; dripPos[i * 6 + 2] = dripZ[i];
    dripPos[i * 6 + 3] = dripX[i]; dripPos[i * 6 + 4] = y + trail; dripPos[i * 6 + 5] = dripZ[i];
  }
  if (dripGeo) dripGeo.attributes.position.needsUpdate = true;
  // gutters: dashes run toward the shrine end and loop
  if (flowGeo) for (let i = 0; i < flowVel.length; i++) {
    let z = flowPos[i * 6 + 2] - flowVel[i] * dt;
    if (z < -29.4) z = 9.6 + Math.random() * 0.4;
    flowPos[i * 6 + 2] = z; flowPos[i * 6 + 5] = z + 0.55;
  }
  if (flowGeo) flowGeo.attributes.position.needsUpdate = true;
  // rain chains: droplets stream down the links
  if (chainGeo) for (let i = 0; i < chainVel.length; i++) {
    let y = chainPos[i * 6 + 1] - chainVel[i] * dt;
    if (y < 0.18) y = 2.6 + Math.random() * 0.2;
    chainPos[i * 6 + 1] = y; chainPos[i * 6 + 4] = y + 0.12;
  }
  if (chainGeo) chainGeo.attributes.position.needsUpdate = true;
}

// ================= KITSUNE GUARDIANS =================
const kitsuneEyeMats = [];
let kitsuneBeads = 0;
let foxSnows = 0; // v69
{
  const stoneF = new THREE.MeshStandardMaterial({ color: 0x8f8a81, roughness: 0.95 });
  // rain season wets the stone: darker, tighter roughness, and beads gathering on upward faces
  const kitsuneWet = SEASON === 'rain';
  if (kitsuneWet) { stoneF.color.setHex(0x75716a); stoneF.roughness = 0.5; }
  const beadMat = kitsuneWet ? new THREE.MeshStandardMaterial({ color: 0xcfe0e8, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.9, emissive: 0x22323c, emissiveIntensity: 0.7 }) : null;
  function fox(mirror) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 0.5), stoneF); base.position.y = 0.12; g.add(base);
    const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), stoneF);
    haunch.scale.set(0.9, 1.1, 1); haunch.position.y = 0.42; g.add(haunch);
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.3, 10), stoneF);
    chest.position.set(0, 0.6, 0.1); g.add(chest);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), stoneF);
    head.scale.set(0.9, 1, 1.15); head.position.set(0, 0.82, 0.12); g.add(head);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 8), stoneF);
    snout.rotation.x = Math.PI / 2 - 0.25; snout.position.set(0, 0.79, 0.26); g.add(snout);
    for (const m of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), stoneF);
      ear.position.set(m * 0.075, 0.95, 0.1); g.add(ear);
    }
    // eyes that catch the lantern light
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.4, emissive: 0xffb85c, emissiveIntensity: 0.12 });
    for (const em2 of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), eyeMat);
      eye.position.set(em2 * 0.055, 0.855, 0.262); g.add(eye);
    }
    kitsuneEyeMats.push(eyeMat);
    // curled tail rising behind
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.075, 0.42, 8), stoneF);
    tail.position.set(mirror * 0.16, 0.55, -0.14); tail.rotation.z = mirror * 0.5; tail.rotation.x = -0.35; g.add(tail);
    // one holds a jewel, the other a key (inari convention)
    if (mirror > 0) {
      const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), M.gold);
      jewel.position.set(0, 0.68, 0.24); g.add(jewel);
    } else {
      const key = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.02), M.gold);
      key.position.set(0, 0.68, 0.24); key.rotation.z = 0.4; g.add(key);
    }
    if (beadMat) {
      let bseed = (mirror + 2) * 431;
      const brnd = () => (bseed = (bseed * 16807) % 2147483647) / 2147483647;
      // beads gather on the upward faces: crown of the head, dome of the haunches
      for (const spot of [[0, 0.82, 0.12, 0.125, 1], [0, 0.42, 0, 0.2, 1.1]]) {
        const n = 5 + Math.floor(brnd() * 4);
        for (let i = 0; i < n; i++) {
          const th = brnd() * Math.PI * 2, ph = brnd() * Math.PI * 0.42; // top hemisphere only
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.007 + brnd() * 0.008, 6, 5), beadMat);
          b.position.set(spot[0] + Math.sin(ph) * Math.cos(th) * spot[3], spot[1] + Math.cos(ph) * spot[3] * spot[4], spot[2] + Math.sin(ph) * Math.sin(th) * spot[3]);
          g.add(b); kitsuneBeads++;
        }
      }
      // and along the plinth's top edge, where rain sits
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.007 + brnd() * 0.007, 6, 5), beadMat);
        b.position.set((brnd() - 0.5) * 0.42, 0.245, (brnd() - 0.5) * 0.42);
        g.add(b); kitsuneBeads++;
      }
    }
    if (SEASON === 'snow') {
      // v69: snow piles at the guardian's feet - low drifts leaning on the plinth, a ledge on its rim
      let sseed = (mirror + 2) * 733;
      const srnd = () => (sseed = (sseed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 + srnd() * 0.7;
        const rr = 0.30 + srnd() * 0.10;
        const m2 = new THREE.Mesh(new THREE.SphereGeometry(0.09 + srnd() * 0.06, 10, 7), TORII_SNOW);
        m2.scale.y = 0.32 + srnd() * 0.12;
        m2.position.set(Math.cos(ang) * rr, 0.035, Math.sin(ang) * rr);
        g.add(m2); foxSnows++;
      }
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 0.52), TORII_SNOW);
      ledge.position.y = 0.245; g.add(ledge);
      foxSnows++;
      // v124: the wind blows down the approach, so the approach face takes the rime
      const rimePatch = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.95, transparent: true, opacity: 0, emissive: 0xc9dae8, emissiveIntensity: 0.9 }));
      rimePatch.position.set(0, 0.13, 0.255);
      g.add(rimePatch); guardianRime.push(rimePatch);
    }
    return g;
  }
  for (const m of [-1, 1]) {
    const f = fox(m);
    f.position.set(m * 2.35, 0.05, -26.6);
    f.rotation.y = m * -0.28; // face the approaching visitor
    world.add(f);
    colliders.push({ min: new THREE.Vector3(m * 2.35 - 0.3, 0, -26.9), max: new THREE.Vector3(m * 2.35 + 0.3, 1.1, -26.3) });
    f.updateMatrixWorld(true);
    if (SEASON === 'snow') foxMuzzles.push(f.localToWorld(new THREE.Vector3(0, 0.78, 0.36))); // v78 muzzle
  }
}

// ================= CAMELLIA (tsubaki) =================
{
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e3d26, roughness: 0.85 });
  const bloomR = new THREE.MeshStandardMaterial({ color: 0xc73a24, roughness: 0.55, emissive: 0x3a0c06 });
  const bloomW = new THREE.MeshStandardMaterial({ color: 0xf5f1e8, roughness: 0.6, emissive: 0x2e2a22 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf5f1e8, roughness: 0.95 });
  const bloom = SEASON === 'firefly' ? null : SEASON === 'momiji' ? bloomW : bloomR; // winter+sakura red, autumn white, summer green only
  const spots = [[-2.7, 4.2], [2.8, 0.5], [-2.6, -9.5]];
  let ci = 0;
  for (const [bx, bz] of spots) {
    const bush = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const r = 0.32 + (i % 3) * 0.12;
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leafMat);
      b.position.set(Math.sin(i * 2.4 + ci) * 0.3, 0.22 + i * 0.09, Math.cos(i * 2.4 + ci) * 0.28);
      b.castShadow = true; bush.add(b);
    }
    if (bloom) {
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Group();
        const petals = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), bloom);
        petals.scale.set(1, 0.55, 1); f.add(petals);
        const heart = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), M.gold);
        heart.position.y = 0.028; f.add(heart);
        const a = i * 1.9 + ci, rr = 0.34 + (i % 2) * 0.14;
        f.position.set(Math.sin(a) * rr, 0.42 + Math.sin(i * 3.7) * 0.16, Math.cos(a) * rr);
        bush.add(f);
      }
    }
    if (SEASON === 'snow') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.42), snowMat);
      cap.scale.set(1.05, 0.5, 1.05); cap.position.y = 0.52; bush.add(cap);
    }
    bush.position.set(bx, 0, bz);
    world.add(bush);
    colliders.push({ min: new THREE.Vector3(bx - 0.5, 0, bz - 0.5), max: new THREE.Vector3(bx + 0.5, 0.9, bz + 0.5) });
    ci += 1.7;
  }
  // fallen camellia heads on the gravel - tsubaki drop whole
  if (bloom) {
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), bloom);
      f.scale.set(1, 0.6, 1);
      f.position.set(spots[i][0] + 0.5 + i * 0.2, 0.06, spots[i][1] + 0.45);
      world.add(f);
    }
  }
}

// ================= SHRINE AGING (visits) =================
let visitCount = 0;
try { visitCount = (+localStorage.getItem('ls_visits') || 0) + 1; localStorage.setItem('ls_visits', String(visitCount)); } catch (e) {}
window.__visits = visitCount;
let mossPostPatches = 0, sootBands = 0, verdPatches = 0;
{
  // moss creeps onto the path from the third visit
  if (visitCount >= 3) {
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x41522f, roughness: 1 });
    let seed = visitCount * 137;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const n = Math.min(4 + visitCount, 16);
    for (let i = 0; i < n; i++) {
      const r = 0.12 + rnd() * 0.3;
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 12), mossMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set((rnd() < 0.5 ? -1 : 1) * (1.0 + rnd() * 1.1), 0.115, 10 - rnd() * 34);
      m.receiveShadow = true; world.add(m);
    }
  }
  // moss climbs the kairo posts as the visits add up
  if (visitCount >= 2) {
    const mossMat2 = new THREE.MeshStandardMaterial({ color: 0x55663c, roughness: 1, emissive: 0x24301a, emissiveIntensity: 1.0 });
    let seed2 = visitCount * 977;
    const rnd2 = () => (seed2 = (seed2 * 16807) % 2147483647) / 2147483647;
    const climb = Math.min(0.1 + visitCount * 0.09, 0.85);
    for (const side of [-1, 1]) {
      for (let z = 10; z >= -30; z -= 5) {
        const blobs = Math.min(1 + Math.floor((visitCount + rnd2() * 4) / 4), 4);
        for (let b = 0; b < blobs; b++) {
          const r = 0.08 + rnd2() * 0.09;
          const m = new THREE.Mesh(new THREE.CircleGeometry(r, 8), mossMat2);
          const ang = rnd2() * Math.PI * 2;
          m.position.set(side * 12 + Math.cos(ang) * 0.118, 0.08 + rnd2() * climb, z + Math.sin(ang) * 0.118);
          m.rotation.y = Math.PI / 2 - ang; // face outward from the post surface
          m.scale.y = 1.3 + rnd2() * 0.9; // creeping patches stretch upward
          world.add(m); mossPostPatches++;
        }
      }
    }
  }
  // soot darkens the lantern house rims as the years of visits add up
  if (visitCount >= 2) {
    const sootMat = new THREE.MeshStandardMaterial({ color: 0x171310, roughness: 1, transparent: true, opacity: Math.min(0.2 + visitCount * 0.055, 0.8) });
    let seed3 = visitCount * 311;
    const rnd3 = () => (seed3 = (seed3 * 16807) % 2147483647) / 2147483647;
    for (const l of lanterns) {
      // one band hugging the fire-box rim: over the paper's top edge, under the roof
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.535, 0.13, 0.535), sootMat);
      band.position.set(l.x + (rnd3() - 0.5) * 0.02, 1.405, l.z + (rnd3() - 0.5) * 0.02);
      world.add(band); sootBands++;
    }
  }
  // verdigris greens the offering bells' bronze at the edges over visits
  if (visitCount >= 3) {
    const verdMat = new THREE.MeshStandardMaterial({ color: 0x4e7f6d, roughness: 0.95, transparent: true, opacity: Math.min(0.15 + visitCount * 0.06, 0.85) });
    let seed4 = visitCount * 613;
    const rnd4 = () => (seed4 = (seed4 * 16807) % 2147483647) / 2147483647;
    for (const b of bells) {
      // the flared lip greens first - a thin patina ring hugging the bronze
      const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.154, 0.194, 0.07, 12, 1, true), verdMat);
      lip.position.y = -0.115; b.bell.add(lip); verdPatches++;
      // streaks creep up from the lip as the years add up
      const streaks = Math.min(1 + Math.floor(visitCount / 3), 4);
      for (let s = 0; s < streaks; s++) {
        const sy = -0.08 + rnd4() * 0.1;
        const rr = 0.02 + (0.15 - sy) * 0.5667 + 0.003; // bell surface at this height
        const st = new THREE.Mesh(new THREE.PlaneGeometry(0.025 + rnd4() * 0.03, 0.06 + rnd4() * 0.09), verdMat);
        const ang = rnd4() * Math.PI * 2;
        st.position.set(Math.sin(ang) * rr, sy, Math.cos(ang) * rr);
        st.rotation.y = ang;
        b.bell.add(st); verdPatches++;
      }
    }
  }
  // a small jizo with a vermilion bib appears from the sixth visit, watching the path
  if (visitCount >= 6) {
    const j = new THREE.Group();
    const stoneJ = new THREE.MeshStandardMaterial({ color: 0x9a958c, roughness: 0.95 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), stoneJ); body.scale.set(1, 1.25, 0.85); body.position.y = 0.2; j.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), stoneJ); head.position.y = 0.46; j.add(head);
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.03), M.shu); bib.position.set(0, 0.3, 0.13); j.add(bib);
    j.position.set(1.7, 0.06, -6.5); j.rotation.y = -0.5;
    world.add(j);
  }
  const line = visitCount === 1 ? 'You found it. Most people walk past.'
    : visitCount === 2 ? 'You came back. It noticed.'
    : visitCount >= 6 ? 'The path remembers your steps. The jizo keeps them.'
    : visitCount >= 3 ? 'Moss on the stones. The shrine is keeping you.' : null;
  if (line) setTimeout(() => say('THE SHRINE', line, 4.5), 4200);
}

// ================= DAWN (the cat brings the morning) =================
let dawnOn = false, dawnT = 0, dawnSpoke = false;
let poolDawnE = 0;
let dawnFrom = null;
const DAWN_TO = { bg: new THREE.Color(0x57404e), hemi: new THREE.Color(0xb89ab0), moon: new THREE.Color(0xffc9a0) };
window.__dawn = j => { startDawn(); if (j) dawnT = j; };
window.__flood = () => { kairoDimples = 400; return kairoDimples; };
window.__slant = () => +rainSlant.toFixed(3);
window.__slantHold = v => { slantHold = v; return slantHold; };
window.__furinPin = v => { furinPin = v; };
window.__wash = () => { washBasin(); return __ls().washes; };
function startDawn() {
  dawnFrom = {
    bg: scene.background.clone(), fog: scene.fog.color.clone(),
    hemi: hemi.color.clone(), moon: moon.color.clone(),
    hemiI: hemi.intensity, moonI: moon.intensity, duskI: dusk.intensity,
  };
  dawnOn = true;
  // the dawn chorus: sparse birdsong greeting the light
  for (let i = 0; i < 7; i++) birdCall(2500 + i * (2200 + Math.random() * 1500));
}
let chorusBirds = 0;
function birdCall(delay) {
  setTimeout(() => {
    chorusBirds++;
    if (!AC) return;
    const base = 2200 + Math.random() * 1400, n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const f = base * (0.92 + Math.random() * 0.2);
      setTimeout(() => tone(f, f * (0.9 + Math.random() * 0.25), 'sine', 0.09 + Math.random() * 0.07, 0.028), i * (90 + Math.random() * 70));
    }
  }, delay);
}
function updateDawn(T, dt) {
  if (!dawnOn) return;
  dawnT = Math.min(1, dawnT + dt / 26);
  const e = dawnT * dawnT * (3 - 2 * dawnT);
  scene.background.lerpColors(dawnFrom.bg, DAWN_TO.bg, e);
  scene.fog.color.copy(scene.background);
  hemi.color.lerpColors(dawnFrom.hemi, DAWN_TO.hemi, e); hemi.intensity = dawnFrom.hemiI + e * 0.55;
  moon.color.lerpColors(dawnFrom.moon, DAWN_TO.moon, e); moon.intensity = dawnFrom.moonI + e * 0.45;
  dusk.intensity = dawnFrom.duskI + e * 0.4;
  poolDawnE = e;
  for (const l of lanterns) {
    l.pool.material.color.lerpColors(POOL_WARM, POOL_DAWN, e);
    if (l.streak) l.streak.material.color.lerpColors(POOL_WARM, POOL_DAWN, e);
  }
  for (const rm of kairoRidges) rm.emissiveIntensity = e * 1.0;
  kobanScatterMat.emissiveIntensity = e * 0.7;
  kobanTrailMat.emissiveIntensity = 0.28 + e * 0.5;
  if (dawnT > 0.6 && Math.random() < dt * 0.22) {
    // first birds: two-note chirps, sparse
    const b = 3100 + Math.random() * 1100;
    tone(b, b * 1.18, 'sine', 0.14, 0.016);
    setTimeout(() => tone(b * 0.92, b * 1.05, 'sine', 0.12, 0.013), 140 + Math.random() * 120);
  }
  if (dawnT >= 1 && !dawnSpoke) {
    dawnSpoke = true; say('THE CAT', 'It brought the morning. It does that.', 5);
    if (winEl.style.display === 'flex') {
      winEl.classList.add('dawn');
      winP.innerHTML = winP.innerHTML.replace('RETURN TOMORROW', 'THE MORNING IS YOURS');
    }
  }
}

// ================= FURIN (WIND CHIMES) =================
const furins = [];
{
  const paper = new THREE.MeshStandardMaterial({ color: 0xf5f1e8, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const x = [-1.55, 0.62, 1.75][i], z = -28.5;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6), M.shu);
    cord.position.y = -0.11; g.add(cord);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.72),
      new THREE.MeshStandardMaterial({ color: 0xcfe8ef, transparent: true, opacity: 0.4, roughness: 0.1 }));
    glass.position.y = -0.26; g.add(glass);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.008, 6, 20), M.gold);
    rim.position.y = -0.295; rim.rotation.x = Math.PI / 2; g.add(rim);
    // tanzaku paper strip
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.3), paper);
    strip.position.y = -0.5; g.add(strip);
    g.position.set(x, 2.62, z);
    world.add(g);
    furins.push({ g, strip, glass, phase: i * 2.1, lastTinkle: 0 });
  }
}
let furinBreeze = 0, furinRattles = 0, furinHushed = 0, furinTinkles = 0, furinPin = null, furinOver = 0, furinOvw = 0, stripFlapMax = 0, stripVelMax = 0, lastIceDrip = 0, iceDrips = 0; // v111: furinOver/ furinOvw - the hardest gusts pin the tongue
function updateFurin(T, dt) {
  // slow layered breeze, 0..1
  furinBreeze = 0.5 + 0.5 * Math.sin(T * 0.13 + Math.sin(T * 0.043) * 2.2) * Math.sin(T * 0.031 + 1.7);
  if (SEASON === 'rain') {
    // storm wind: higher floor, sharp gusts
    const gust = Math.max(0, Math.sin(T * 0.9 + Math.sin(T * 0.37) * 3.0));
    furinBreeze = Math.min(1, 0.25 + furinBreeze * 0.65 + gust * 0.45);
  }
  // v59: the same envelope leans the rain itself - gusts tilt the streak field, then it settles upright
  if (furinPin !== null) furinBreeze = furinPin; // QA pin: force the breeze envelope
  rainSlant += ((slantHold !== null ? slantHold : (SEASON === 'rain' ? furinBreeze * 0.55 : 0)) - rainSlant) * Math.min(1, dt * 2.0);
  const rainyF = SEASON === 'rain';
  furinOvw = Math.min(1, Math.max(0, (furinBreeze - 0.95) / 0.1)); // v111: overwhelmed above 0.95 - the bell's voice lost in the wind it measures
  for (const f of furins) {
    const sway = furinBreeze * furinBreeze;
    // v57: rain gusts rattle the chimes - shared envelope with the ema plaques and omikuji strips
    const fg = rainyF ? Math.max(0, Math.sin(T * 0.23 + 1.1)) * furinBreeze * Math.max(0, Math.sin(T * 0.9 + f.phase * 0.6)) : 0;
    f.g.rotation.x = Math.sin(T * 1.4 + f.phase) * 0.14 * sway + Math.sin(T * 9.7 + f.phase * 2.3) * 0.12 * fg;
    f.g.rotation.z = Math.cos(T * 1.1 + f.phase) * 0.11 * sway + Math.cos(T * 8.3 + f.phase * 1.9) * 0.1 * fg;
    // v66: snow frost-stiffens the tanzaku - slower, narrower flap to match the hush
    // v118: the deepening frost stiffens them further - flutter fades as the rime
    // gathers, gone quiet at full frost, back with the thaw
    const frostStiff = SEASON === 'snow';
    const rimF = frostStiff ? rimeE : 0;
    const flapSpd = (frostStiff ? 0.8 : 2.2) * (1 - 0.75 * rimF), flapAmp = (frostStiff ? 0.35 : 1.0) * (1 - 0.9 * rimF);
    flapAmpNow = flapAmp; flapSpdNow = flapSpd;
    const prevFlap = f.prevFlap || 0;
    f.strip.rotation.y = (Math.sin(T * flapSpd + f.phase) * (0.2 + sway * 0.8) * flapAmp + Math.sin(T * 11 + f.phase) * 0.5 * fg) * (1 - 0.85 * furinOvw) + (0.2 + sway * 0.8) * flapAmp * 1.2 * furinOvw + Math.sin(T * 29 + f.phase) * 0.05 * furinOvw; // v111: pinned edgewise, trembling
    f.strip.rotation.z = Math.sin(T * 7.7 + f.phase * 1.4) * 0.4 * fg;
    f.prevFlap = f.strip.rotation.y;
    const fa = Math.abs(f.strip.rotation.y); if (fa > stripFlapMax) stripFlapMax = fa;
    if (dt > 0) { const fv = Math.abs(f.strip.rotation.y - prevFlap) / dt; if (fv > stripVelMax) stripVelMax = fv; }
    if (rainyF && fg > 0.55 && T - f.lastTinkle > 1.3 && Math.random() < dt * 6) {
      // the rattle: fast clustered strikes while the gust is on the chime
      f.lastTinkle = T; furinRattles++;
      const base = 2600 + Math.random() * 1000;
      tone(base, base * 0.995, 'sine', 0.5, 0.035);
      setTimeout(() => tone(base * (1.2 + Math.random() * 0.4), base, 'sine', 0.35, 0.022), 60 + Math.random() * 90);
    } else if (furinBreeze > 0.86 && T - f.lastTinkle > 7 && Math.random() < dt * 2) {
      f.lastTinkle = T;
      if (furinBreeze > 0.95) { furinOver++; } // v111: the loudest moment has no ring
      else if (SEASON === 'snow') { furinHushed++; } // v65: the cold takes the chime's voice - sway stays, sound goes
      else {
        furinTinkles++;
        const base = 2400 + Math.random() * 900;
        tone(base, base * 0.995, 'sine', 1.6, 0.05);
        tone(base * 1.51, base * 1.51, 'sine', 0.9, 0.02);
      }
    }
  }
  // v74: when the thaw wind peaks in snow, a rare icicle lets one high tick fall
  if (SEASON === 'snow' && furinBreeze > 0.9 && T - lastIceDrip > 9 && Math.random() < dt * 0.8) {
    lastIceDrip = T; fireIceDrip();
  }
  // v75: glints fade and die
  for (let i = glints.length - 1; i >= 0; i--) {
    const gl = glints[i]; gl.userData.t += dt;
    gl.material.opacity = Math.max(0, 1 - gl.userData.t / 0.8);
    gl.scale.setScalar(1 + gl.userData.t * 1.5);
    if (gl.userData.t > 0.8) { world.remove(gl); gl.material.dispose(); gl.geometry.dispose(); glints.splice(i, 1); }
  }
}
function fireIceDrip(nearCam) {
  iceDrips++;
  const base = 3400 + Math.random() * 800;
  tone(base, base * 0.97, 'sine', 0.9, 0.03);
  if (icicles.length) {
    let ic;
    if (nearCam) {
      let best = 1e9; ic = icicles[0];
      for (const c of icicles) { const d = c.position.distanceToSquared(player.pos); if (d < best) { best = d; ic = c; } }
    } else ic = icicles[(Math.random() * icicles.length) | 0];
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xdfefff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    gl.position.copy(ic.position); gl.position.y -= ic.userData.len / 2;
    gl.userData.t = 0; world.add(gl); glints.push(gl); glintCount++;
  }
}

let lastEmaClack = 0, emaClacks = 0, kitsuneGlow = 0.12, lastRustle = 0, rustles = 0;
let emaSwayMax = 0, emaSwayFresh = 0, emaSwayOld = 0;
let stripSwayMax = 0;
let stripTight = 0; // v110: hard gusts cinch the knots and stream the strips
let stripGateDbg = 0;
function updateEmaBreeze(T, dt) {
  if (!emaPlaques.length) return;
  const sw = furinBreeze * furinBreeze;
  // v52: rain gusts swing the plaques - soaked old wood hangs heavy, fresh plaques dance free
  const rainy = SEASON === 'rain';
  // sway counters peak-hold for QA: over a long gust window every plaque reaches its amplitude ceiling
  for (const m of emaPlaques) {
    const free = 1 - (m.userData.emaWeather || 0.5) * 0.6;
    const gust = rainy ? Math.max(0, Math.sin(T * 0.9 + m.userData.phase * 0.6)) * Math.max(0, Math.sin(T * 0.23 + 1.1)) * furinBreeze : 0;
    const dz = Math.sin(T * 3.1 + m.userData.phase) * 0.035 * sw + Math.sin(T * 4.7 + m.userData.phase * 2.1) * 0.16 * gust * free;
    m.rotation.z = m.userData.baseZ + dz;
    m.rotation.y = m.userData.baseY + Math.sin(T * 2.3 + m.userData.phase * 1.7) * 0.06 * sw + Math.sin(T * 3.9 + m.userData.phase) * 0.1 * gust * free;
    m.rotation.x = Math.sin(T * 5.3 + m.userData.phase * 1.3) * 0.07 * gust * free;
    const ad = Math.abs(dz);
    if (ad > emaSwayMax) emaSwayMax = ad;
    if (m.userData.emaWeather <= 0.35 && ad > emaSwayFresh) emaSwayFresh = ad;
    if (m.userData.emaWeather >= 0.9 && ad > emaSwayOld) emaSwayOld = ad;
  }
  // wooden clacks when the wind picks up; rain-soaked wood clacks lower and more often
  if (furinBreeze > (rainy ? 0.72 : 0.8) && T - lastEmaClack > (rainy ? 0.65 : 1.1) && Math.random() < dt * (rainy ? 2.4 : 1.6)) {
    lastEmaClack = T; emaClacks++;
    const f = rainy ? 130 + Math.random() * 60 : 170 + Math.random() * 90;
    tone(f, f * 0.72, 'triangle', rainy ? 0.04 : 0.05, rainy ? 0.055 : 0.07);
    if (Math.random() < 0.4) setTimeout(() => tone((rainy ? 120 : 150) + Math.random() * 70, 110, 'triangle', 0.045, 0.05), 90 + Math.random() * 140);
  }
}

// ================= INTERACTION =================
function nearestInteract() {
  let best = null, bd = 2.6;
  for (const l of lanterns) {
    if (l.lit || l.guardian) continue;
    const d = Math.hypot(player.pos.x - l.x, player.pos.z - l.z);
    if (d < bd) { bd = d; best = { kind: 'lantern', o: l, label: 'E - LIGHT THE LANTERN · 灯' }; }
  }
  if (litCount === PUZZLE_LANTERNS) {
    for (const b of bells) {
      if (b.rung) continue;
      const d = Math.hypot(player.pos.x - b.x, player.pos.z - b.z);
      if (d < bd) { bd = d; best = { kind: 'bell', o: b, label: 'E - RING THE ' + b.name + ' BELL · 鈴' }; }
    }
  }
  if (!best || bd > 1.9) {
    const dk = Math.hypot(player.pos.x - 0, player.pos.z - (-27.2));
    if (dk < 2.1 && litCount === PUZZLE_LANTERNS) best = { kind: 'koban', label: kobanHeld > 0 ? 'E - OFFER A KOBAN · 小判' : 'E - OFFER A KOBAN · 小判 (EMPTY)' };
  }
  if (done) {
    const dm = Math.hypot(player.pos.x - OMI_POS[0], player.pos.z - OMI_POS[2]);
    if (dm < 2.0) best = { kind: 'omikuji', label: 'E - DRAW AN OMIKUJI · おみくじ' };
    const de = Math.hypot(player.pos.x - EMA_POS[0], player.pos.z - EMA_POS[2]);
    if (de < 2.0) best = { kind: 'ema', label: 'E - WRITE AN EMA · 絵馬' };
    const db = Math.hypot(player.pos.x - BASIN_POS[0], player.pos.z - BASIN_POS[2]);
    if (db < 2.0) best = { kind: 'basin', label: 'E - WASH YOUR HANDS · 手水' };
  }
  return best;
}
addEventListener('keydown', e => {
  if (emaOpen) return;
  if (e.code === 'KeyT' && omiOpen && (lastDrawnTier === '凶' || lastDrawnTier === '大凶')) {
    tieToRack(); omiEl.style.display = 'none'; omiOpen = false; return;
  }
  if (e.code !== 'KeyE' || (!locked && !DEBUG)) return;
  if (galOn) { galleryOpen(false); return; }
  if (winEl.style.display === 'flex' && winEl.style.opacity === '1') { hideWinCard(); return; }
  if (omiOpen) { omiEl.style.display = 'none'; omiOpen = false; tone(660, 660, 'sine', 0.2, 0.05); return; }
  const n = nearestInteract();
  if (!n) {
    if (litCount < PUZZLE_LANTERNS) say('THE SHRINE', 'The shrine sleeps. Light the lanterns first.', 3);
    return;
  }
  if (n.kind === 'lantern') lightLantern(n.o);
  else if (n.kind === 'bell') ringBell(n.o);
  else if (n.kind === 'koban') tossKoban();
  else if (n.kind === 'omikuji') drawOmikuji();
  else if (n.kind === 'ema') emaOpenSet(true);
  else if (n.kind === 'basin') washBasin();
});

// ================= OMIKUJI GALLERY =================
const galleryBtn = document.getElementById('gallerybtn');
const galleryEl = document.getElementById('gallery');
let galOn = false;
function galleryOpen(on) {
  galOn = on;
  if (on && omiOpen) { omiEl.style.display = 'none'; omiOpen = false; }
  if (on) {
    const grid = galleryEl.querySelector('.grid'); grid.innerHTML = '';
    for (let i = 0; i < OMIKUJI.length; i++) {
      const f = OMIKUJI[i], have = omiDrawn.includes(i);
      const c = document.createElement('div'); c.className = 'card' + (have ? '' : ' miss');
      c.innerHTML = have ? '<div class="t">' + f[0] + '</div><div class="l">' + f[1] + '</div>'
                         : '<div class="t">\uff1f\uff1f</div><div class="l">UNDISCOVERED</div>';
      grid.appendChild(c);
    }
    if (document.pointerLockElement) document.exitPointerLock();
  }
  galleryEl.style.display = on ? 'block' : 'none';
}
galleryBtn.addEventListener('click', () => galleryOpen(!galOn));
window.__gallery = galleryOpen;
window.__lsGold = kobanLife >= 10;

// ================= AMBIENT AUDIO =================
let ambStarted = false;
function startAmbience() {
  if (ambStarted || !AC) return; ambStarted = true;
  // distant wind: filtered noise, very low
  const len = 2 * AC.sampleRate, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240;
  const g = AC.createGain(); g.gain.value = 0.035;
  src.connect(f); f.connect(g); g.connect(masterGain); src.start();
  if (SEASON === 'rain') {
    const rs = AC.createBufferSource(); rs.buffer = buf; rs.loop = true;
    const rf = AC.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 1500; rf.Q.value = 0.45;
    const rg = AC.createGain(); rg.gain.value = 0.05;
    rs.connect(rf); rf.connect(rg); rg.connect(masterGain); rs.start();
  }
  // crickets: tiny clustered chirps
  (function chirp() {
    if (!AC) return;
    const t = AC.currentTime;
    if (Math.random() < 0.8) {
      for (let i = 0; i < 3; i++) {
        const o = AC.createOscillator(), og = AC.createGain();
        o.type = 'sine'; o.frequency.value = 4200 + Math.random() * 600;
        og.gain.setValueAtTime(0, t + i * 0.07);
        og.gain.linearRampToValueAtTime(0.012, t + i * 0.07 + 0.015);
        og.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.06);
        o.connect(og); og.connect(masterGain); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.08);
      }
    }
    setTimeout(chirp, 900 + Math.random() * 2600);
  })();
}
const _origAudio = audio;
audio = function () { _origAudio(); startAmbience(); };

// ---------- main loop ----------
const clock = new THREE.Clock();
let stairSpoke = false;
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, clock.getDelta());
  if (started) for (let i = 0; i < 2; i++) step(dt / 2);
  camera.position.set(player.pos.x, player.pos.y + EYE - 0.9, player.pos.z);
  camera.rotation.set(0, 0, 0);
  camera.rotateY(player.yaw); camera.rotateX(player.pitch);
  if (fadeblkT > 0) { fadeblkT = Math.max(0, fadeblkT - dt * 0.7); fadeblkEl.style.opacity = fadeblkT.toFixed(3); }
  // subtitle timer
  if (subTimer > 0) { subTimer -= dt; if (subTimer <= 0) subEl.style.display = 'none'; }
  // first tread of the stair: the stones remember
  if (started && !stairSpoke && player.pos.z < -25.4 && player.pos.z > -27 && Math.abs(player.pos.x) < 2.4) {
    stairSpoke = true;
    say('THE SHRINE', 'The stones dip where everyone before you stepped.', 4);
  }
  // interaction hint
  if (started && !done) {
    const n = nearestInteract();
    hintEl.style.display = n ? 'block' : 'none';
    if (n) hintEl.textContent = n.label;
  } else hintEl.style.display = 'none';
  // lantern flames breathe
  const T = clock.elapsedTime;
  for (const l of lanterns) if (l.lit) {
    // v136: a hard gust makes the flame duck - light and paper dip together, then recover
    const gut = Math.max(0, Math.min(1, (furinBreeze - 0.7) / 0.3));
    const duck = 1 - 0.42 * gut * (0.65 + 0.35 * Math.sin(T * 31 + l.flick * 5));
    l.duck = duck;
    l.light.intensity = (26 + Math.sin(T * 7 + l.flick) * 3.5 + Math.sin(T * 23 + l.flick * 3) * 1.5) * duck;
    l.paper.material.emissiveIntensity = (1.6 + Math.sin(T * 9 + l.flick) * 0.25) * (1 - 0.3 * gut * (0.65 + 0.35 * Math.sin(T * 27 + l.flick * 7)));
    const poolFlick = 0.92 + Math.sin(T * 7 + l.flick) * 0.08 + Math.sin(T * 23 + l.flick * 3) * 0.04;
    l.pool.material.opacity = (0.2 + poolWet * 0.34) * poolFlick * (1 - poolDawnE * 0.55);
    if (l.streak) l.streak.material.opacity = 0.27 * poolFlick * (1 - poolDawnE * 0.55);
  }
  updateRain(dt);
  updateKobanDrops(dt);
  updateAccum(dt);
  updateBasin(dt);
  updateStars(dt);
  updateFurin(T, dt);
  updateEmaBreeze(T, dt);
  // kitsune eyes brighten as the path lights up
  kitsuneGlow = 0.12 + (lanterns.length ? litCount / lanterns.length : 0) * 1.0;
  for (const em of kitsuneEyeMats) em.emissiveIntensity = kitsuneGlow;
  // v78: the stone guardians breathe in the cold - a faint fog puff at the muzzle
  if (SEASON === 'snow' && foxMuzzles.length && T > nextBreathT) { nextBreathT = T + 5 + Math.random() * 3; fireBreath(); }
  for (let i = breathPuffs.length - 1; i >= 0; i--) {
    const p = breathPuffs[i]; p.userData.t += dt;
    const u = p.userData.t / p.userData.life;
    p.position.addScaledVector(p.userData.dir, dt);
    p.scale.setScalar(1 + u * 2.2);
    p.material.opacity = 0.24 * Math.max(0, 1 - u);
    if (u >= 1) { world.remove(p); p.material.dispose(); p.geometry.dispose(); breathPuffs.splice(i, 1); }
  }
  // v135: the sleeping cat's breath fogs at the ear hollows - one small puff as each
  // exhale begins, weaker and slower as the drift deepens over the sleeper
  if (SEASON === 'snow') {
    const hbr2 = Math.sin(humpBreathPhase * Math.PI * 2 / 60);
    if (prevHbr !== null && prevHbr > 0 && hbr2 <= 0 && humpAcc < 0.97) {
      catBreaths++;
      const cp = new THREE.Mesh(catBreathGeo, catBreathMat.clone());
      cp.position.set(3.86, 0.3 + 0.05 * humpAcc, -29.03);
      cp.userData = { t: 0, dir: new THREE.Vector3(0.012, 0.035, -0.055), life: 3.2, op: 0.42 * (1 - 0.55 * humpAcc) };
      world.add(cp); catBreathPuffs.push(cp);
    }
    prevHbr = hbr2;
    for (let i = catBreathPuffs.length - 1; i >= 0; i--) {
      const cp = catBreathPuffs[i]; cp.userData.t += dt;
      const cu = cp.userData.t / cp.userData.life;
      cp.position.addScaledVector(cp.userData.dir, dt);
      cp.scale.setScalar(1 + cu * 1.9);
      cp.material.opacity = cp.userData.op * Math.max(0, 1 - cu);
      if (cu >= 1) { world.remove(cp); cp.material.dispose(); catBreathPuffs.splice(i, 1); }
    }
  }
  // v101: when a watch gust reaches the hump, the sleeper's breath rides it out over
  // the snow and faintly stirs the hoar feathers the fox left behind
  if (SEASON === 'snow' && hoarNeedles.length) {
    for (const p of breathPuffs) {
      if (p.userData.watch && !p.userData.stirred) {
        const sdx = p.position.x - 4.3, sdz = p.position.z + 29.0;
        if (sdx * sdx + sdz * sdz < 0.81) { p.userData.stirred = true; hoarStir = 1; stirCount++; }
      }
    }
    hoarStir = Math.max(0, hoarStir - dt * 0.8);
    if (hoarMat) hoarMat.emissiveIntensity = 0.85 + 0.45 * hoarStir * Math.max(0, Math.sin(humpBreathPhase * Math.PI * 2 / 60)); // the feathers glint as the breath passes
    const hbr = Math.sin(humpBreathPhase * Math.PI * 2 / 60);
    const hamp = (0.02 * Math.max(0, hbr) + 0.14 * hoarStir * (0.4 + 0.6 * Math.max(0, hbr))) * (1 - hoarE);
    if (hamp > 0.0005) for (const n of hoarNeedles) {
      n.m.rotation.z = n.rz0 + Math.sin(T * 9 + n.ph) * hamp * n.dir;
      n.m.rotation.x = n.rx0 + Math.cos(T * 7.3 + n.ph * 1.7) * hamp * 0.7;
    }
  }
  // v79: snowmelt drips from the honden roof edge once the sun breaks through
  if (SEASON === 'snow' && dawnOn && dawnT > 0.55 && T > nextMeltT) {
    nextMeltT = T + 0.6 + Math.random() * 0.5;
    meltCount++;
    const d = new THREE.Mesh(meltGeo, meltMat);
    d.position.set(-3.5 + Math.random() * 7, 4.18, -27.75);
    d.userData.vy = 0;
    world.add(d); meltDrops.push(d);
  }
  for (let i = meltDrops.length - 1; i >= 0; i--) {
    const d = meltDrops[i];
    d.userData.vy -= dt * 4.5;
    d.position.y += d.userData.vy * dt;
    d.scale.y = 1 + Math.min(2, -d.userData.vy * 0.4); // stretch as it falls
    if (d.position.y < 0.95) { world.remove(d); meltDrops.splice(i, 1); }
  }
  // v80: the melt finds its way out - a thin bright thread from the honden steps along the approach edge
  const rillTarget = (SEASON === 'snow' && dawnOn && dawnT > 0.55) ? 32.2 : 0; // v81: the full run to the first torii footing, gated on the melt
  if (rillTarget > 0 && !rillMesh) {
    rillMesh = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.008, 1), rillMat);
    world.add(rillMesh);
  }
  if (rillMesh) {
    rillLen = Math.min(rillTarget, rillLen + dt * 6);
    if (rillLen <= 0) { world.remove(rillMesh); rillMesh = null; }
    else {
      rillMesh.scale.z = rillLen;
      rillMesh.position.set(2.6, 0.03, -25.9 + rillLen / 2);
      rillMat.emissiveIntensity = 0.45 + Math.sin(T * 2.2) * 0.1;
    }
  }
  // v92: the frozen skin - present at night, thawing from the source as the melt begins
  if (SEASON === 'snow') {
    const thawE = dawnOn ? Math.min(1, Math.max(0, (dawnT - 0.55) / 0.35)) : 0;
    const iceTarget = 32.2 * (1 - thawE);
    if (iceTarget > 0.05 && !iceMesh) {
      iceMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 1), iceMat);
      world.add(iceMesh);
      icePoolMesh = new THREE.Mesh(new THREE.CircleGeometry(0.58, 20), icePoolMat);
      icePoolMesh.rotation.x = -Math.PI / 2;
      icePoolMesh.position.set(2.15, 0.027, 6.25);
      world.add(icePoolMesh);
    }
    if (iceMesh) {
      iceLen = iceTarget;
      if (iceLen <= 0.05) { world.remove(iceMesh); world.remove(icePoolMesh); iceMesh = null; icePoolMesh = null; }
      else {
        iceMesh.scale.z = iceLen;
        iceMesh.position.set(2.6, 0.032, -25.9 + (32.2 - iceLen) + iceLen / 2);
        iceMat.opacity = 0.5 * (1 - thawE * 0.6);
        icePoolMat.opacity = 0.55 * (1 - thawE);
      }
    }
  }
  // v106: the dawn band runs down the frozen rill - a few glints ride the ice edges
  // from the source to the pool, each answering in turn, then gone once the light is general
  if (SEASON === 'snow') {
    if (iceMesh && !iceGlints.length) {
      const gzs = [-24.5, -21, -17.5, -14, -10.5, -7, -3.5, -1.75, 0, 1.5, 3, 4.5, 5.5];
      gzs.forEach((z, i) => {
        const gm = new THREE.Mesh(iceGlintGeo, new THREE.MeshStandardMaterial({ color: 0xcfd9e2, roughness: 0.25, metalness: 0.15, emissive: 0xffe9c4, emissiveIntensity: 0 }));
        gm.scale.set(1.1, 0.32, 3);
        gm.position.set(2.6 + (i % 2 ? 0.02 : -0.02), 0.042, z);
        gm.visible = false;
        world.add(gm);
        iceGlints.push({ m: gm, pk: 0.2 + ((z + 25.9) / 32.2) * 0.28, ph: i * 1.7, d: z + 25.9 });
      });
      for (let k = 0; k < 3; k++) {
        const ga = 0.6 + k * 1.6;
        const gm = new THREE.Mesh(iceGlintGeo, new THREE.MeshStandardMaterial({ color: 0xcfd9e2, roughness: 0.25, metalness: 0.15, emissive: 0xffe9c4, emissiveIntensity: 0 }));
        gm.scale.set(1.1, 0.32, 3);
        gm.position.set(2.15 + Math.cos(ga) * 0.53, 0.034, 6.25 + Math.sin(ga) * 0.53);
        gm.visible = false;
        world.add(gm);
        iceGlints.push({ m: gm, pk: 0.44 + k * 0.03, ph: 4 + k * 2.3, d: -1 });
      }
    }
    if (iceGlints.length) {
      let gMax = 0;
      const meltD = 32.2 - iceLen;
      for (const g of iceGlints) {
        const gUp = Math.min(1, Math.max(0, (dawnT - (g.pk - 0.12)) / 0.12));
        const gDn = Math.min(1, Math.max(0, (dawnT - g.pk) / 0.15));
        let ge = dawnOn ? (gUp * gUp * (3 - 2 * gUp)) * (1 - gDn * gDn * (3 - 2 * gDn)) : 0;
        ge *= 1.3 * (0.75 + 0.25 * Math.sin(T * 9 + g.ph * 7));
        const thawed = g.d >= 0 && g.d < meltD - 0.05; // the melt takes the glints with the ice
        g.m.material.emissiveIntensity = Math.max(0, ge);
        g.m.visible = ge > 0.03 && !thawed && !!iceMesh;
        if (ge > gMax) gMax = ge;
      }
      iceGlintE = gMax;
    }
  }
  // v107: after a watch gust tears through and the gates smoke, a single line of fox
  // prints appears beside the spur trail - something passed while the wind had the gates.
  // Fresh snow takes them first of all the tracks.
  if (SEASON === 'snow') {
    if (!traxArmed && !traxLive && watchCount > 0 && furinBreeze > 0.85) traxArmed = true;
    if (traxArmed && !traxLive && furinBreeze < 0.35) { traxLive = true; traxT0 = T; }
    if (traxLive) {
      if (!foxTracks.length) {
        const fdir = Math.atan2(-0.646, 0.763); // from the hump's shoulder back along the spur line
        let fx = 4.79, fz = -28.84; // parallel to the spur, a paw-width to the east - a second line, not the same one
        for (let i = 0; i < 13; i++) {
          const fop = 0.36 + 0.05 * Math.sin(i * 2.1);
          const fm = new THREE.Mesh(foxTrackGeo, new THREE.MeshStandardMaterial({ color: 0xd6e0e8, roughness: 0.5, transparent: true, opacity: 0, emissive: 0x8fa5b5, emissiveIntensity: 0.3 }));
          fm.rotation.x = -Math.PI / 2; fm.rotation.z = -fdir;
          fm.scale.set(0.75, 1.6, 1); // narrower and longer than the cat's, and single file: a fox direct-registers
          fm.position.set(fx + Math.sin(i * 12.9) * 0.015, 0.021, fz + Math.cos(i * 7.7) * 0.015);
          world.add(fm);
          foxTracks.push({ m: fm, op: fop, reveal: 0, eg: 0.85 + 0.3 * Math.sin(i * 2.7) });
          fx += -0.646 * 0.24; fz += 0.763 * 0.24;
        }
      }
      const te = T - traxT0;
      traxErode = Math.min(1, traxErode + dt * Math.max(0, furinBreeze - 0.5) * 0.04); // v109: wind over 0.5 combs the line
      for (let i = 0; i < foxTracks.length; i++) {
        const t = foxTracks[i];
        t.reveal = Math.min(1, Math.max(0, (te - i * 0.45) / 1.4)); // the line surfaces pad by pad, hump outward
        const ei = Math.min(1, traxErode * t.eg); // v109: each pad weathers on its own exposure
        const fi = Math.max(0, 1 - Math.max(0, te - (i * 0.45 + 1.4)) / 60); // v134: crisp for a minute after the fox passes, then the snow forgets the edges
        t.fi = fi;
        t.m.material.emissiveIntensity = 0.3 * (1 + 0.6 * fi); // v134: a fresh pad still holds the fox's shadow
        t.m.material.opacity = t.op * t.reveal * (1 - 0.35 * ei) * Math.max(0, 1 - 1.1 * humpAcc) * (1 - 0.45 * (1 - fi));
        t.m.scale.set(0.75 * (1 - 0.17 * ei) * (1 + 0.1 * (1 - fi)), 1.6 * (1 + 0.31 * ei) * (1 + 0.08 * (1 - fi)), 1); // smeared downwind, crisp rim gone
        t.m.position.y = 0.021 - 0.003 * ei;
      }
    }
  }
  // v116: through the coldest hours the guardian's watch-breath leaves rime on the
  // kobans - a pale frost shell on each coin that the dawn thaw wipes clean
  if (SEASON === 'snow') {
    const rimeMat0 = kobanRime.mat0 || (kobanRime.mat0 = new THREE.MeshStandardMaterial({ color: 0xe8f0f6, roughness: 0.85, transparent: true, opacity: 0, emissive: 0xafc4d4, emissiveIntensity: 0.3 }));
    for (const kb of [humpKobanMesh, humpKobanMesh2]) { // each coin gets its shell whenever it arrives (v89's comes later)
      if (!kb || kobanRime.some(r => r.kb === kb)) continue;
      const rshell = new THREE.Mesh(kobanRimeGeo, rimeMat0.clone());
      rshell.scale.copy(kb.scale).multiplyScalar(1.06);
      rshell.rotation.copy(kb.rotation);
      rshell.position.copy(kb.position);
      kb.parent.add(rshell);
      kobanRime.push({ rm: rshell, kb });
    }
    rimeCold = Math.min(1, rimeCold + dt / 480); // the frost gathers through the long cold hours
    const twR = dawnOn ? Math.min(1, Math.max(0, (dawnT - 0.55) / 0.35)) : 0;
    rimeE = rimeCold * (1 - twR); // the dawn thaw wipes everything clean at once
    for (const r of kobanRime) {
      r.rm.material.opacity = 0.55 * rimeE;
      r.rm.position.y = r.kb.position.y + 0.002; // riding the sinking coin
    }
    for (const f of furins) { // v117: the furin's glass frosts over in the same coldest hours
      f.glass.material.opacity = 0.4 + 0.45 * rimeE;
      f.glass.material.roughness = 0.1 + 0.75 * rimeE;
      f.glass.material.color.setHex(0xcfe8ef).lerp(frostTint, rimeE);
      if (f === furins[0]) f.strip.material.color.setHex(0xf5f1e8).lerp(frostTint, rimeE * 0.5); // v118: the paper pales with the glass (shared material)
    }
    // v119: the ladle's v68 frost skin feathers further along the handle as the cold
    // deepens - small barbs of rime creeping down the wood grain, gone with the thaw
    if (!ladleFeathers.length) {
      const fg = new THREE.Group();
      fg.position.set(BASIN_POS[0] - 0.05, 0.745, BASIN_POS[2]);
      fg.rotation.set(0, 0.3, Math.PI / 2); // the handle's own orientation
      const featherMat0 = new THREE.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.95, transparent: true, opacity: 0 });
      for (let i = 0; i < 7; i++) {
        const bm = new THREE.Mesh(ladleBarbGeo, featherMat0.clone());
        bm.position.set(0, -0.21 + i * 0.07, 0.014);
        bm.rotation.x = Math.PI / 2 + (i % 2 ? 0.25 : -0.25); // a feathered stagger
        fg.add(bm);
        ladleFeathers.push({ m: bm, ti: i / 6 });
      }
      world.add(fg);
    }
    for (const b of ladleFeathers) {
      const creep = Math.min(1, Math.max(0, 2 * rimeE - b.ti)); // cup end first, creeping to the far end
      b.m.scale.set(1, creep, 1);
      b.m.position.z = 0.014 + 0.03 * creep;
      b.m.material.opacity = 0.85 * creep;
    }
    for (const c of emaCornerFrost) { // v120: the fresh wood frosts, the weathered plaques show no change
      const suscept = Math.min(1, Math.max(0, (1 - c.w) / 0.75)); // weather 0.25 (newest) -> 1, weather 1.0 (oldest) -> 0
      c.l.material.opacity = 0.85 * rimeE * suscept;
      c.r.material.opacity = 0.85 * rimeE * suscept;
    }
    // v121: the cold touches the water itself - ice rims each rain-chain basin and
    // thickens ring by ring toward the middle, melting back with the thaw
    if (!basinIce.length && snowBasins) {
      const iceMat0 = new THREE.MeshStandardMaterial({ color: 0xd8e6ee, roughness: 0.35, transparent: true, opacity: 0, emissive: 0xaec6d8, emissiveIntensity: 0.9 }); // the rim catches what little light the coldest hours have
      for (const side of [-1, 1]) {
        basinIceGeos.forEach((ig, i) => {
          const im = new THREE.Mesh(ig, iceMat0.clone());
          im.rotation.x = -Math.PI / 2;
          im.position.set(side * 10.62, 0.165 + i * 0.018, -30); // rim stone first, then climbing the drift's slope as it thickens
          world.add(im);
          basinIce.push({ m: im, th: 0.15 + i * 0.3 });
        });
      }
    }
    for (const b of basinIce) b.m.material.opacity = 0.55 * Math.min(1, Math.max(0, (rimeE - b.th) / 0.2));
    // v122: the torii lintel drift lines grow a crust through the same cold; a gust
    // rising past 0.86 cracks it off - the plume is the crust leaving - and it
    // re-forms as the cold holds
    if (!lintelCrust.length) {
      const crustMat0 = new THREE.MeshStandardMaterial({ color: 0xdde9f0, roughness: 0.5, transparent: true, opacity: 0, emissive: 0xaec6d8, emissiveIntensity: 0.5 });
      for (const pg of plumeGates) {
        const cm = new THREE.Mesh(lintelCrustGeo, crustMat0.clone());
        cm.scale.x = pg.w;
        cm.position.set(0, pg.y + 0.045, pg.z);
        world.add(cm);
        lintelCrust.push({ m: cm, shed: 0 });
      }
    }
    if (prevCrustBreeze === null) prevCrustBreeze = furinBreeze; // first tick: no edge, just learn the air
    else if (prevCrustBreeze < 0.86 && furinBreeze >= 0.86 && rimeE > 0.1) { // the gust's leading edge cracks what crust exists
      const gate2CrustOpen = lanterns[3].lit || lanterns[4].lit; // v129: the second gate sheds only once its own lanterns burn, matching its plume
      lintelCrust.forEach((c, i) => {
        if (i === 1 && !gate2CrustOpen) return;
        c.shed = 1;
        if (i === 1) crustSheds2++;
      });
      crustSheds++;
    }
    prevCrustBreeze = furinBreeze;
    for (const c of lintelCrust) {
      c.shed = Math.max(0, c.shed - dt / 12); // the cold lays it back down
      c.m.material.opacity = 0.55 * rimeE * (1 - 0.85 * c.shed);
    }
    for (const rm of kairoRidges) { // v123: the roof's one ornament takes the cold with everything else
      rm.color.setHex(0xc9a227).lerp(frostTint, rimeE * 0.75);
      rm.roughness = 0.4 + 0.55 * rimeE;
      rm.metalness = 0.6 - 0.45 * rimeE;
    }
    for (const gp of guardianRime) gp.material.opacity = 0.85 * rimeE; // v124: the komainu weather with their shrine
    for (const tp of toriiRime) tp.material.opacity = 0.8 * rimeE; // v128: the gates' own feet take the cold
    for (const sp of slotRime) sp.material.opacity = 0.75 * rimeE; // v132: the box that holds the coins takes their cold
    for (const ic of icicles) { // v131: the same cold feeds the eave icicles - they lengthen through the night, dawn trims them back
      const s = 1 + 0.9 * rimeE;
      ic.scale.y = s;
      ic.position.y = 2.66 - ic.userData.len * s / 2;
    }
    // v126: as the thaw loosens the snow, meltwater wets the rack - wood and ink
    // darken together, then dry back slowly once the night returns
    const twW = dawnOn ? Math.min(1, Math.max(0, (dawnT - 0.55) / 0.35)) : 0;
    wetE = Math.max(wetE - dt / 600, twW);
    for (const wm of emaWet) {
      wm.color.setHex(0xffffff).lerp(wetTint, wetE * 0.85);
      wm.emissiveIntensity = 0.22 - 0.1 * wetE;
    }
    // v130: while the rack is wet, the cords shed meltwater - a slow drip off the
    // low point of the bowed lines, gone again as the wood dries
    if (ropeSegs.length && wetE > 0.35 && T > nextDripT) {
      nextDripT = T + 0.45;
      const s = ropeSegs[Math.floor(Math.random() * ropeSegs.length)];
      const dr = new THREE.Mesh(meltGeo, meltMat.clone());
      dr.position.set(s.m.position.x + (Math.random() - 0.5) * 0.1, s.m.position.y - 0.03, s.m.position.z);
      dr.userData = { vy: 0 };
      world.add(dr); dripMotes.push(dr); dripCount++;
    }
    // v133: each furin's glass sweats one drip of its own as the v117 frost clears
    const twF = dawnOn ? Math.min(1, Math.max(0, (dawnT - 0.6) / 0.3)) : 0;
    if (twF > 0 && furins.length && T > nextFurinDripT) {
      nextFurinDripT = T + 1.4;
      const f = furins[(Math.random() * furins.length) | 0];
      const dr2 = new THREE.Mesh(meltGeo, meltMat.clone());
      dr2.position.set(f.g.position.x + (Math.random() - 0.5) * 0.05, 2.28, f.g.position.z + 0.02);
      dr2.userData = { vy: 0 };
      world.add(dr2); dripMotes.push(dr2); dripCount++; furinDrips++;
    }
  }
  if (SEASON === 'snow' && dripMotes.length) {
    for (let i = dripMotes.length - 1; i >= 0; i--) {
      const dr = dripMotes[i];
      dr.userData.vy += dt * 3.2; // meltwater falls, not floats
      dr.position.y -= dr.userData.vy * dt;
      dr.material.opacity = 0.65 * Math.min(1, Math.max(0, dr.position.y / 0.3)); // fading into the snow it feeds
      if (dr.position.y < 0.03) { world.remove(dr); dr.material.dispose(); dripMotes.splice(i, 1); }
    }
  }
  // v115: over a long snow night the fall fills the visitor's boot prints back in -
  // each print fades and spreads as the drift quietly takes the crossing
  if (SEASON === 'snow' && visitorPrints.length) {
    printFillE = Math.min(1, printFillE + dt / 2400); // a slow erasure, full only over a long night
    if (printFillE > 0.001) {
      const fs = 1 + 0.3 * printFillE;
      for (const p of visitorPrints) {
        p.m.material.opacity = p.op * (1 - 0.55 * humpAcc) * Math.max(0, 1 - 0.94 * printFillE);
        p.m.scale.set(0.62 * fs, 1.45 * fs, 1); // the sharp print softens as the snow fills it
      }
    }
  }
  // v139: the same fall fills the cat's single-file tracks behind it - the path line
  // and the spur to the hump soften and spread as the snow quietly takes the story
  if (SEASON === 'snow' && printFillE > 0.001 && (pawPrints.length || spurPrints.length)) {
    const cf = Math.max(0, 1 - 0.94 * printFillE);
    const cfs = 1 + 0.3 * printFillE;
    for (const p of pawPrints) {
      p.m.material.opacity = Math.max(0, p.op - 0.5 * humpAcc) * cf;
      p.m.scale.set(0.75 * cfs, 1.25 * cfs, 1);
    }
    for (const p of spurPrints) {
      p.m.material.opacity = p.op * (1 - 0.7 * Math.max(0, (humpAcc - 0.3) / 0.7)) * cf;
      p.m.scale.set(0.75 * cfs, 1.25 * cfs, 1);
    }
  }
  // v95: the snow-laden rack cords sag deeper under the overnight load, lifting and
  // slimming as the dawn thaw takes the weight off
  if (SEASON === 'snow' && ropeSegs.length) {
    const thawE2 = dawnOn ? Math.min(1, Math.max(0, (dawnT - 0.55) / 0.35)) : 0;
    ropeSag = 0.115 - 0.075 * thawE2;
    const slim = 1 - 0.55 * thawE2;
    for (const s of ropeSegs) {
      const y0 = 1.84 - ropeSag * (1 - Math.pow(2 * s.t0 - 1, 2));
      const y1 = 1.84 - ropeSag * (1 - Math.pow(2 * s.t1 - 1, 2));
      s.m.position.y = (y0 + y1) / 2;
      s.m.rotation.z = Math.PI / 2 + Math.atan2(y1 - y0, s.x1 - s.x0);
      s.m.scale.set(slim, 1, slim);
    }
    for (const sl of ropeSleeves) sl.scale.set(slim, 1, slim);
  }
  // v96: the lantern caps shed a soft slump down one side as the thaw warms them
  if (SEASON === 'snow' && lanternThaw.length) {
    const tw = dawnOn ? Math.min(1, Math.max(0, (dawnT - 0.55) / 0.35)) : 0;
    slumpE = tw;
    lanternThaw.forEach((lt, i) => {
      // v127: a lit lantern's own flame melts its own shoulder, long before the dawn
      if (lanterns[i] && lanterns[i].lit) lt.fm = Math.min(1, (lt.fm || 0) + dt / 150);
      // v137: and the same flame warms a melt ring into the snow at the base, slower still
      if (lanterns[i] && lanterns[i].lit) lt.mr = Math.min(1, (lt.mr || 0) + dt / 240);
      if (lt.ring) { const mr = Math.min(1, (lt.mr || 0) + (lt.fm >= 1 ? 0.15 : 0)); lt.ring.material.opacity = 0.55 * mr; lt.ring.scale.setScalar(0.6 + 0.5 * mr); }
      const mel = Math.max(tw, lt.fm || 0);
      lt.dollop.scale.set(1 - 0.3 * mel, 0.55 * (1 - 0.45 * mel), 1 - 0.3 * mel);
      lt.dollop.position.x = lt.dir * 0.05 * mel;
      const s = 0.01 + 0.99 * mel;
      lt.slump.scale.set(s, s * 0.55, s);
      lt.slump.position.set(lt.dir * (0.26 + 0.1 * mel), 1.66 - 0.14 * mel, 0.06);
      lt.slump.rotation.z = -lt.dir * 0.5 * mel;
    });
  }
  // v98: the thaw undermines the basin ice - it sags below the rim, darkens, thins
  if (SEASON === 'snow' && chozuIce) {
    const tw = dawnOn ? Math.min(1, Math.max(0, (dawnT - 0.55) / 0.35)) : 0;
    chozuIce.position.y = chozuIce.userData.y0 - 0.011 * tw;
    chozuIce.material.opacity = 0.85 * (1 - 0.62 * tw);
    chozuIce.material.color.setHex(0xdfe8ec).lerp(new THREE.Color(0x364249), tw);
    if (chozuFrost) chozuFrost.material.opacity = 0.22 * (1 - 0.8 * tw);
  }
  // v99: the roof slab slides off the eave as the thaw loosens it, then drops and breaks apart
  if (SEASON === 'snow' && kairoSlides.length) {
    const tw = dawnOn ? Math.min(1, Math.max(0, (dawnT - 0.55) / 0.35)) : 0;
    slideE = tw;
    for (const sl of kairoSlides) {
      const d = Math.min(1, tw / 0.7);
      const drop = Math.max(0, (tw - 0.7) / 0.3);
      sl.m.position.x = sl.x0 + sl.dx * d;
      sl.m.position.y = sl.y0 + sl.dy * d - 1.7 * drop * drop;
      sl.m.rotation.z = sl.r0 + sl.side * 0.3 * drop;
      sl.m.material.opacity = 1 - drop;
    }
  }
  // v105: a hard gust tears the snow off the torii lintel drift lines - a brief white
  // plume streams downwind off the beam, arcing and settling as it disperses
  if (SEASON === 'snow' && furinBreeze > 0.85 && T > nextPlumeT) {
    nextPlumeT = T + 0.035;
    const gate2Open = lanterns[3].lit || lanterns[4].lit; // v125: the second gate smokes only once its own lantern burns - the gate earns its weather
    const pg = (!gate2Open || Math.random() < 0.55) ? plumeGates[0] : plumeGates[1];
    if (pg === plumeGates[1]) plumeG2++;
    const m = new THREE.Mesh(plumeGeo, plumeMat.clone());
    m.position.set((Math.random() - 0.5) * pg.w, pg.y, pg.z + (Math.random() - 0.5) * 0.3);
    m.userData = { vx: (Math.random() - 0.5) * 0.35, vy: 0.35 + Math.random() * 0.3, vz: -(1.1 + 1.6 * furinBreeze), t: 0, life: 1.1 + Math.random() * 0.5 };
    world.add(m); plumeMotes.push(m); plumeCount++;
  }
  for (let i = plumeMotes.length - 1; i >= 0; i--) {
    const m = plumeMotes[i]; m.userData.t += dt;
    const u = m.userData.t / m.userData.life;
    m.userData.vy -= dt * 0.85; // the plume arcs and settles
    m.position.x += m.userData.vx * dt; m.position.y += m.userData.vy * dt; m.position.z += m.userData.vz * dt;
    m.scale.set(1 + u * 1.2, 1 + u * 0.5, 2.2 + u * 1.5); // torn streaks, not dots
    m.material.opacity = 0.7 * Math.max(0, 1 - u);
    if (u >= 1 || m.position.y < 0.05) { world.remove(m); m.material.dispose(); plumeMotes.splice(i, 1); }
  }
  // v104: the gusts comb the sastrugi field - ridges sharpen and creep downwind,
  // settling back when the air calms
  if (SEASON === 'snow' && sasRidges.length) {
    const gustE = furinBreeze * furinBreeze;
    sasMig += dt * 0.06 * gustE;
    for (const r of sasRidges) {
      r.m.position.z = r.z0 - ((sasMig + r.ph) % 2.8);
      r.m.scale.y = 0.75 + 0.5 * furinBreeze;
    }
  }
  // v102: dawn touches the second koban first - its gold catches the first ray while
  // the rest of the hump still sleeps in the blue; the flare settles as the scene warms
  if (SEASON === 'snow' && humpKobanMesh2) {
    const rUp = Math.min(1, Math.max(0, (dawnT - 0.14) / 0.18));
    const rDn = Math.min(1, Math.max(0, (dawnT - 0.32) / 0.28));
    kobanRay = dawnOn ? (rUp * rUp * (3 - 2 * rUp)) * (1 - rDn * rDn * (3 - 2 * rDn)) : 0;
    humpKobanMesh2.material.emissiveIntensity = 0.22 + 1.0 * kobanRay;
    humpKobanMesh2.material.emissive.setHex(0xffb46a).lerp(new THREE.Color(0xffd88f), kobanRay * 0.7);
  }
  // v103: the omikuji's vermilion seal answers a heartbeat later - gold first, then red
  if (SEASON === 'snow' && omiSealMat && humpOmi) {
    const sUp = Math.min(1, Math.max(0, (dawnT - 0.26) / 0.18));
    const sDn = Math.min(1, Math.max(0, (dawnT - 0.44) / 0.26));
    sealRay = dawnOn ? (sUp * sUp * (3 - 2 * sUp)) * (1 - sDn * sDn * (3 - 2 * sDn)) : 0;
    omiSealMat.emissiveIntensity = 0.28 + 1.5 * sealRay;
    omiSealMat.opacity = humpOmi.material.opacity; // buried with the strip
  }
  // v100: the hoar where the fox breathed feathers away as the thaw warms the hump
  if (SEASON === 'snow' && hoarNeedles.length) {
    const tw = dawnOn ? Math.min(1, Math.max(0, (dawnT - 0.55) / 0.35)) : 0;
    hoarE = tw;
    for (const n of hoarNeedles) n.m.scale.y = n.sy * (1 - 0.92 * tw);
    if (hoarMat) hoarMat.opacity = 0.9 * (1 - tw);
    if (hoarFilm) hoarFilm.material.opacity = 0.32 * (1 - tw);
  }
  // v81: when the rill completes its run, it pools at the first torii footing - a still mirror catching the dawn
  if (rillMesh && rillLen >= 31.8) {
    if (!rillPool) {
      rillPool = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), rillPoolMat);
      rillPool.rotation.x = -Math.PI / 2;
      rillPool.position.set(2.15, 0.028, 6.25);
      world.add(rillPool);
    }
    poolR = Math.min(0.55, poolR + dt * 0.5);
    rillPool.scale.setScalar(poolR / 0.55);
    rillPoolMat.emissiveIntensity = (0.15 + dawnT * 0.45) * (1 - 0.65 * refreezeE); // v108: the returning cold dulls the mirror
  } else if (rillPool) { world.remove(rillPool); rillPool = null; poolR = 0; }
  // v108: after a melt day the night turns cold again - a thin new skin creeps in from
  // the pool's edges, duller and patchier than the v92 deep-winter skin
  if (SEASON === 'snow') {
    if (!refreezeOn && rillPool && poolR > 0.4 && dawnT >= 0.95) refreezeOn = true;
    if (refreezeOn && rillPool) refreezeE = Math.min(1, refreezeE + dt / 75);
    if (rillPool && refreezeE > 0.01) {
      if (!skimGroup) {
        skimGroup = new THREE.Group();
        skimGroup.position.set(2.15, 0.0305, 6.25);
        world.add(skimGroup);
        for (let k = 0; k < 5; k++) {
          const pa = 0.4 + k * 1.35, pr2 = 0.4 + 0.05 * Math.sin(k * 3.1);
          const pm = new THREE.Mesh(skimPatchGeo, new THREE.MeshStandardMaterial({ color: 0xc8d2d8, roughness: 0.6, metalness: 0.05, emissive: 0x8794a0, emissiveIntensity: 0.12, transparent: true, opacity: 0 }));
          pm.scale.set(0.8 + 0.3 * Math.sin(k * 2.3), 0.08, 0.7 + 0.3 * Math.cos(k * 1.9));
          pm.position.set(Math.cos(pa) * pr2, 0, Math.sin(pa) * pr2);
          skimGroup.add(pm);
          skimPatches.push({ m: pm, th: 0.12 + k * 0.13, o: 0.34 + 0.14 * ((k * 37 % 10) / 10) });
        }
      }
      skimGroup.scale.setScalar(poolR / 0.55);
      if (Math.abs(refreezeE - lastRingE) > 0.02) { // the creeping edge: an annulus whose open eye shrinks as the cold bites
        lastRingE = refreezeE;
        const inner = Math.max(0.09, 0.58 * (1 - 0.9 * refreezeE));
        if (skimRing) { skimGroup.remove(skimRing); skimRing.geometry.dispose(); }
        skimRing = new THREE.Mesh(new THREE.RingGeometry(inner, 0.58, 26), skimRingMat);
        skimRing.rotation.x = -Math.PI / 2;
        skimGroup.add(skimRing);
      }
      if (skimRing) skimRing.material.opacity = 0.42 * Math.min(1, refreezeE * 2.5);
      for (const p of skimPatches) p.m.material.opacity = p.o * Math.min(1, Math.max(0, (refreezeE - p.th) / 0.1));
      if (!skimFilm && refreezeE > 0.8) {
        skimFilm = new THREE.Mesh(skimFilmGeo, skimFilmMat);
        skimFilm.rotation.x = -Math.PI / 2;
        skimFilm.position.y = 0.001;
        skimGroup.add(skimFilm);
      }
      if (skimFilm) skimFilm.material.opacity = 0.2 * Math.min(1, Math.max(0, (refreezeE - 0.8) / 0.2));
    }
  }

  updateMoths(T);
  // v141: the out-of-season moth spirals in to the new flame, singes, and falls
  if (moth2State > 0 && moth2State < 3 && moth2Mesh && lanterns[moth2Lan]) {
    moth2T += dt;
    const l2 = lanterns[moth2Lan];
    if (moth2State === 1) {
      const u = Math.min(1, moth2T / 6);
      const r2 = 0.5 * (1 - u) + 0.06;
      const a2 = moth2T * (3 + u * 6);
      moth2Mesh.position.set(l2.x + Math.cos(a2) * r2, 1.3 + Math.sin(moth2T * 7) * 0.12 * (1 - u) + u * 0.05, l2.z + Math.sin(a2) * r2);
      moth2Mesh.scale.setScalar(1 + Math.sin(moth2T * 22) * 0.3); // the wingbeat flicker
      if (u >= 1) {
        moth2State = 2; moth2T = 0; mothSinges++;
        moth2Mesh.material.emissive.setHex(0xc73a24); moth2Mesh.material.emissiveIntensity = 1.4; // the singe flash
        tone(1900, 300, 'sine', 0.25, 0.05);
      }
    } else if (moth2State === 2) {
      const u2 = Math.min(1, moth2T / 2.5);
      const a3 = moth2T * 5;
      moth2Mesh.position.set(l2.x + Math.cos(a3) * 0.06 * (1 - u2) + 0.1 * u2, 1.35 - 1.32 * u2 * u2, l2.z + Math.sin(a3) * 0.06 * (1 - u2) + 0.06 * u2);
      moth2Mesh.material.emissiveIntensity = 1.4 * (1 - u2);
      if (u2 >= 1) { moth2State = 3; moth2Mesh.position.y = 0.025; moth2Mesh.material.emissiveIntensity = 0; moth2Mesh.scale.set(1.2, 0.4, 1); } // a small speck on the snow
    }
  }
  // hanging things answer the breeze
  const sw = furinBreeze * furinBreeze;
  const tightTarget = Math.min(1, Math.max(0, (furinBreeze - 0.85) / 0.3)); // v110: the same gusts that smoke the gates
  stripTight += (tightTarget - stripTight) * Math.min(1, dt * 3);
  const paperLoad = Math.min(tiedStrips.length, 10);
  // v54: rain gusts snap the tied strips - paper flutters faster than the wooden plaques swing
  const stripGustGate = SEASON === 'rain' ? Math.max(0, Math.sin(T * 0.23 + 1.1)) * furinBreeze : 0;
  stripGateDbg = stripGustGate;
  // v140: a hard gust in the cold freezes the tied strips stiff - the dance dies and
  // even the stream locks, while the loose tanzaku keeps dancing
  const freezeTarget = SEASON === 'snow' ? Math.min(1, Math.max(0, (furinBreeze - 0.8) / 0.2)) : 0;
  stripFreeze += (freezeTarget - stripFreeze) * Math.min(1, dt * 2);
  const frz = 1 - 0.92 * stripFreeze;
  for (let i = 0; i < tiedStrips.length; i++) {
    const st = tiedStrips[i];
    const sg = stripGustGate * Math.max(0, Math.sin(T * 0.9 + i * 0.8));
    st.rotation.x = ((Math.sin(T * 1.8 + i * 0.9) * 0.16 * sw * (1 + paperLoad * 0.1) + Math.sin(T * 6.5 + i * 1.1) * 1.0 * sg * (1 + paperLoad * 0.1)) * (1 - 0.55 * stripTight) + 1.15 * stripTight) * frz; // v110+v140: flutter gives way to streaming downwind; the freeze locks even that
    st.rotation.z = st.userData.baseZ + ((tiedStrips.length >= 8 ? Math.sin(T * 7 + i * 1.7) * 0.05 * sw : 0) + Math.sin(T * 5.1 + i * 0.7) * 0.5 * sg) * (1 - 0.55 * stripTight) * frz;
    if (st.userData.knot) { const kt = 1 - 0.22 * stripTight; st.userData.knot.scale.set(kt, kt, kt); st.userData.knot.position.y = 0.21 - 0.012 * stripTight; } // v110: the cinch
    const sd = Math.abs(st.rotation.x) * 0.6 + Math.abs(st.rotation.z - st.userData.baseZ) * 0.4;
    if (sd > stripSwayMax) stripSwayMax = sd;
  }
  // a heavily laden rack rustles when the wind peaks
  if (tiedStrips.length >= 8 && furinBreeze > 0.82 && T - lastRustle > 2.5 && Math.random() < dt * 3) {
    lastRustle = T; rustles++;
    const rf = 900 + Math.random() * 500;
    tone(rf, rf * 0.8, 'triangle', 0.05, 0.018);
  }
  updateDawn(T, dt);
  // bell swing after ring
  for (const b of bells) if (b.swingT > 0) {
    b.swingT = Math.max(0, b.swingT - dt * 0.5);
    b.bell.rotation.x = Math.sin(T * 9) * 0.28 * b.swingT;
  }
  // cat: approach movement, paw wave, idle bob; after completion it pads along behind you
  if (cat.state === 'arrived' && done && !omiOpen) {
    const dx = player.pos.x - cat.g.position.x, dz = player.pos.z - cat.g.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 1.6) {
      const sp2 = Math.min(2.2, (d - 1.4) * 1.6) * dt;
      cat.g.position.x += dx / d * sp2; cat.g.position.z += dz / d * sp2;
      cat.g.position.y = Math.abs(Math.sin(T * 7)) * 0.045;
      if (Math.random() < dt * 0.12) mew();
    } else cat.g.position.y *= 0.9;
    // idle: the cat settles, sits, tilts its head now and then
    const moving = Math.hypot(player.vel.x, player.vel.z) > 0.12;
    if (moving) cat.lastMoveT = T;
    if (cat.lastMoveT === undefined) cat.lastMoveT = T;
    const idleFor = T - cat.lastMoveT;
    const wantSit = !moving && idleFor > 7 && d < 2.6 ? 1 : 0;
    cat.sitK = (cat.sitK || 0) + (wantSit - (cat.sitK || 0)) * Math.min(1, dt * 2.2);
    cat.g.scale.set(1, 1 - 0.13 * cat.sitK, 1.02 * cat.sitK + (1 - cat.sitK));
    cat.g.rotation.z = Math.sin(T * 0.6) * 0.06 * cat.sitK; // slow head-tilt sway while sitting
    if (cat.sitK > 0.9 && !cat.satSpoke) { cat.satSpoke = true; say('THE CAT', 'It sits. You were worth waiting for.', 4); }
    if (wantSit === 0) cat.satSpoke = false;
  }
  if (cat.state !== 'hidden') {
    if (cat.to && cat.moveT != null && cat.moveT < 1) {
      cat.moveT = Math.min(1, cat.moveT + dt * 0.55);
      const e = cat.moveT * cat.moveT * (3 - 2 * cat.moveT);
      cat.g.position.lerpVectors(cat.from, cat.to, e);
      cat.g.position.y = Math.abs(Math.sin(cat.moveT * Math.PI * 3)) * 0.06; // little hop-walk
    }
    cat.g.rotation.y = Math.atan2(player.pos.x - cat.g.position.x, player.pos.z - cat.g.position.z);
    if (cat.paw) cat.paw.rotation.z = -0.5 + (cat.waveT > 0 ? Math.sin(T * 5.5) * 0.45 : Math.sin(T * 1.2) * 0.05);
    if (cat.waveT > 0) cat.waveT -= dt;
  }
  // koban arcs
  for (let i = coinArcs.length - 1; i >= 0; i--) {
    const a = coinArcs[i];
    a.t = Math.min(1, a.t + dt / 0.65);
    a.m.position.lerpVectors(a.from, a.to, a.t);
    a.m.position.y += Math.sin(a.t * Math.PI) * 0.55;
    a.m.rotation.z += dt * 9;
    if (a.t >= 1) coinArcs.splice(i, 1);
  }
  // hearts
  for (let i = cat.hearts.length - 1; i >= 0; i--) {
    const h = cat.hearts[i];
    h.t -= dt; h.m.position.y += h.vy * dt; h.m.scale.multiplyScalar(1 + dt * 0.3);
    if (h.t <= 0) { world.remove(h.m); cat.hearts.splice(i, 1); }
  }
  // seasonal particles
  for (let i = 0; i < LEAF_N; i++) {
    if (SC.fall) {
      leafPos[i*3] += (leafVel[i*3] + Math.sin(T * 0.8 + i) * SC.sway) * dt;
      leafPos[i*3+1] += leafVel[i*3+1] * dt;
      leafPos[i*3+2] += leafVel[i*3+2] * dt;
      if (leafPos[i*3+1] < 0) leafReset(i, true);
    } else { // fireflies wander and pulse
      leafPos[i*3] += Math.sin(T * 0.6 + i * 1.7) * SC.sway * dt;
      leafPos[i*3+1] += Math.cos(T * 0.45 + i * 2.3) * 0.3 * dt;
      leafPos[i*3+2] += Math.cos(T * 0.5 + i) * 0.25 * dt;
      if (leafPos[i*3+1] < 0.3) leafPos[i*3+1] = 0.3; if (leafPos[i*3+1] > 5) leafPos[i*3+1] = 5;
    }
  }
  if (SEASON === 'firefly') leaves.material.opacity = 0.55 + Math.sin(T * 2.2) * 0.35;
  leafGeo.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
}
tick();


// ---------- QA hooks ----------
window.__p3state = () => ({ pos: player.pos.toArray(), vel: player.vel.toArray(), ground: player.ground, yaw: player.yaw });
window.__teleport = (x, y, z) => { player.pos.set(x, y, z); player.vel.set(0, 0, 0); };
window.__light = i => { const l = lanterns[i]; if (l && !l.lit) lightLantern(l); }; // v125: QA - light one lantern by index
window.__moth2t = v => { moth2T = +v; return moth2State; }; // v141: QA - jump the moth's arc
window.__flameMelt = v => { lanternThaw.forEach((lt, i) => { if (lanterns[i] && lanterns[i].lit) lt.fm = v; }); }; // v127: QA - force the flame-melt factor, lit lanterns only
window.__meltRing = v => { lanternThaw.forEach((lt, i) => { if (lanterns[i] && lanterns[i].lit) lt.mr = Math.min(1, Math.max(0, +v)); }); }; // v137: QA - force the melt ring, lit lanterns only
window.__footstep = footstep; // v114
window.__snowDepth = (x, z) => +snowDepthAt(+x, +z).toFixed(2); // v114
window.__catstep = n => advanceCat(n);
window.__awaken = () => awakenCat();
window.__setcam = (x, y, z, yaw, pitch) => { player.pos.set(x, y, z); player.yaw = yaw; player.pitch = pitch || 0; player.vel.set(0, 0, 0); };
window.__renderShare = renderShare;
window.__omiDraw = drawOmikuji;
window.__omiState = () => ({ tier: lastDrawnTier, tied: tiedStrips.length, drawn: omiDrawn.length });
window.__tie = () => { tieToRack(); return tiedStrips.length; };
function fireBreath(forceWatch) {
  breathCount++;
  let mz = foxMuzzles[breathCount % foxMuzzles.length];
  // v87: on a gust the hump-side guardian's breath drifts over to keep watch on the cat
  const humpAt = new THREE.Vector3(4.3, 0.25, -29.0);
  const nearest = foxMuzzles.reduce((a, b) => a.distanceTo(humpAt) <= b.distanceTo(humpAt) ? a : b);
  const gust = !!forceWatch || (mz === nearest && Math.random() < 0.45);
  if (gust) mz = nearest;
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xeef3f6, transparent: true, opacity: 0.24, roughness: 1, emissive: 0x9fb2c0, emissiveIntensity: 0.15, depthWrite: false }));
  p.position.copy(mz);
  if (gust) {
    watchCount++;
    const d = humpAt.clone().sub(mz).normalize().multiplyScalar(0.55);
    d.y += 0.045; // the breath rides a little above the snow
    p.userData = { t: 0, dir: d, life: 6.5, watch: true };
  } else {
    p.userData = { t: 0, dir: new THREE.Vector3((Math.random() - 0.5) * 0.02, 0.02, 0.1), life: 2.4 };
  }
  world.add(p); breathPuffs.push(p);
}
window.__drip = (mode) => { fireIceDrip(mode === 'near'); return glintCount; };
window.__breath = () => { fireBreath(); return breathCount; };
window.__watch = () => { fireBreath(true); return watchCount; };
window.__stir = () => { hoarStir = 1; return hoarStir; };
window.__sasMig = v => { sasMig = +v; return sasMig; };
window.__watchPos = () => { const p = breathPuffs.find(q => q.userData.watch); return p ? [p.position.x, p.position.y, p.position.z, p.position.distanceTo(new THREE.Vector3(4.3, 0.25, -29.0))].map(v => +v.toFixed(2)) : null; };
window.__rillFill = () => { rillLen = 32; return rillLen; };
window.__accFill = v => { humpAcc = Math.min(1, Math.max(0, +v)); applyAccum(); };
window.__foxTracks = mode => { if (SEASON !== 'snow') return -1; traxLive = true; traxT0 = clock.elapsedTime - (mode === 'now' ? 99 : 0); return traxLive; };
window.__refreeze = v => { if (SEASON !== 'snow') return -1; refreezeOn = true; refreezeE = Math.min(1, Math.max(0, +v)); return refreezeE; };
window.__traxErode = v => { if (SEASON !== 'snow') return -1; traxErode = Math.min(1, Math.max(0, +v)); return traxErode; };
window.__fillIn = v => { if (SEASON !== 'snow') return -1; printFillE = Math.min(1, Math.max(0, +v)); return printFillE; }; // v115
window.__rime = v => { if (SEASON !== 'snow') return -1; rimeCold = Math.min(1, Math.max(0, +v)); return rimeCold; }; // v116
window.__seedEma = n => { emaWishes = []; for (let i = 0; i < n; i++) emaWishes.push('wish ' + (i + 1)); renderEma(); return emaPlaques.length; }; // v120 QA
window.__visit2 = () => { if (SEASON === 'snow') buildVisitorReturn(); return ret; };
window.__breathPhase = v => { humpBreathPhase = +v; applyAccum(); return humpGrowMeshes.length > 1 ? +humpGrowMeshes[1].m.scale.y.toFixed(4) : -1; };
window.__ls = () => ({ lit: litCount, rung: rungCount, cat: cat.state, catpos: cat.g.position.toArray(), done, streak: (localStorage.getItem('ls_streak') || '0'), koban: kobanHeld, given: kobanGiven, omi: omiDrawn.length, stk: omiStucks, season: SEASON, clacks: emaClacks, eyes: +kitsuneGlow.toFixed(2), chorus: chorusBirds, rustles, tied: tiedStrips.length, ms2: moth2State, msg: mothSinges, msY: moth2Mesh && moth2State > 0 ? +moth2Mesh.position.y.toFixed(3) : -1, moss: mossPostPatches, soot: sootBands, verd: verdPatches, beads: kitsuneBeads, dimples: kairoDimples, sway: +emaSwayMax.toFixed(3), swayF: +emaSwayFresh.toFixed(3), swayO: +emaSwayOld.toFixed(3), pools: lanterns.filter(l => l.pool && l.pool.material.opacity > 0.02).length, poolC: lanterns[0].pool.material.color.getHexString(), dawnE: +poolDawnE.toFixed(2), stripSway: +stripSwayMax.toFixed(3), knot: tiedStrips.filter(s => s.userData.knot).length, knotT: +stripTight.toFixed(2), knotS: tiedStrips.length && tiedStrips[0].userData.knot ? +tiedStrips[0].userData.knot.scale.x.toFixed(2) : -1, strm: tiedStrips.length ? +tiedStrips[0].rotation.x.toFixed(2) : -1, sfr: +stripFreeze.toFixed(2), sgate: +stripGateDbg.toFixed(3), rattle: furinRattles, fhus: furinHushed, ftink: furinTinkles, fover: furinOver, fovw: +furinOvw.toFixed(2), fbz: +furinBreeze.toFixed(2), flap: +stripFlapMax.toFixed(3), flapV: +stripVelMax.toFixed(2), spill: spillRings, brim: kairoDimples >= 400, spillOp: spillMats.length ? +spillThreads[0].opacity.toFixed(2) : -1, bias: +lastDimpleBias.toFixed(3), slant: +rainSlant.toFixed(3), waterR: chozuWater ? +chozuWater.roughness.toFixed(2) : -1, frost: chozuFrost ? +chozuFrost.material.opacity.toFixed(2) : 0, washes: basinWashes, hushed: basinHushed, snowBas: snowBasins, caps: snowCaps, lcaps: lanternCaps, tsnow: toriiSnow, lfrost: ladleFrost, fsnow: foxSnows, rsnow: emaRopeSnow, sag: +ropeSag.toFixed(3), slump: +slumpE.toFixed(2), slumpN: lanternThaw.length, weep: toriiWeep, cIceY: chozuIce ? +chozuIce.position.y.toFixed(3) : -1, cIceO: chozuIce ? +chozuIce.material.opacity.toFixed(2) : -1, slide: +slideE.toFixed(2), slideY: kairoSlides.length ? +kairoSlides[0].m.position.y.toFixed(2) : -1, ksnow: kairoSnow, kice, kfrost, ferns, ice: iceDrips, glint: glintCount, breath: breathCount, watch: watchCount, watchP: breathPuffs.filter(p => p.userData.watch).length, melt: meltCount, rill: +rillLen.toFixed(1), rillPool: +poolR.toFixed(2), iceRill: +iceLen.toFixed(1), paws, hump: snowHump, humpKoban, visitor, ret, pawV: pawPrints.filter(p => p.m.material.opacity > 0.01).length, spurOp: spurPrints.length ? +spurPrints[0].m.material.opacity.toFixed(3) : -1, ema2, emaY: humpEma ? +humpEma.plaque.position.y.toFixed(3) : -1, omiS, omiOp: humpOmi ? +humpOmi.material.opacity.toFixed(3) : -1, hol: earHollows.length, holO: earHollows.length ? +earHollows[0].dm.material.opacity.toFixed(2) : -1, holS: earHollows.length ? +earHollows[0].dm.scale.x.toFixed(3) : -1, hoar: hoarNeedles.length, hoarE: +hoarE.toFixed(2), stir: +hoarStir.toFixed(2), stirs: stirCount, ray: +kobanRay.toFixed(2), kob2: humpKobanMesh2 ? +humpKobanMesh2.material.emissiveIntensity.toFixed(2) : -1, seal: +sealRay.toFixed(2), sealE: omiSealMat ? +omiSealMat.emissiveIntensity.toFixed(2) : -1, sas: sasRidges.length, sasM: +sasMig.toFixed(2), sasY: sasRidges.length ? +sasRidges[0].m.scale.y.toFixed(2) : -1, ig: iceGlints.length, igV: iceGlints.filter(g => g.m.visible).length, igE: +iceGlintE.toFixed(2), trax: foxTracks.length, traxR: foxTracks.filter(t => t.reveal > 0.99).length, traxO: foxTracks.length ? +foxTracks[0].m.material.opacity.toFixed(3) : -1, traxS: traxLive ? 2 : (traxArmed ? 1 : 0), traxE: +traxErode.toFixed(2), traxW: foxTracks.length ? +foxTracks[0].m.scale.y.toFixed(2) : -1, frsh: foxTracks.length && foxTracks[0].fi !== undefined ? +foxTracks[0].fi.toFixed(2) : -1, ph: +humpBreathPhase.toFixed(2), cb: catBreaths, cbN: catBreathPuffs.length, cbO: catBreathPuffs.length ? +catBreathPuffs[catBreathPuffs.length - 1].material.opacity.toFixed(3) : -1, cbY: catBreathPuffs.length ? +catBreathPuffs[catBreathPuffs.length - 1].position.y.toFixed(3) : -1, skim: skimPatches.length + (skimRing ? 1 : 0) + (skimFilm ? 1 : 0), skimE: +refreezeE.toFixed(2), skimP: rillPool ? +rillPoolMat.emissiveIntensity.toFixed(2) : -1, plume: plumeMotes.length, plumes: plumeCount, pl2: plumeG2, acc: +humpAcc.toFixed(2), ribsY: humpGrowMeshes.length > 1 ? +humpGrowMeshes[1].m.scale.y.toFixed(4) : -1, brR: +breathRate.toFixed(2), accOp: visitorPrints.length ? +visitorPrints[0].m.material.opacity.toFixed(3) : -1, stp: creakSteps, crk: creaks, crkD: +creakD.toFixed(2), fill: +printFillE.toFixed(2), fillS: visitorPrints.length ? +visitorPrints[0].m.scale.x.toFixed(2) : -1, rime: kobanRime.length, rimeE: +rimeE.toFixed(2), rimeO: kobanRime.length ? +kobanRime[0].rm.material.opacity.toFixed(2) : -1, rfO: furins.length ? +furins[0].glass.material.opacity.toFixed(2) : -1, rfR: furins.length ? +furins[0].glass.material.roughness.toFixed(2) : -1, amp: +flapAmpNow.toFixed(3), spd: +flapSpdNow.toFixed(2), lf2: ladleFeathers.length, lfF: ladleFeathers.length ? +ladleFeathers[0].m.scale.y.toFixed(2) : -1, lfL: ladleFeathers.length ? +ladleFeathers[ladleFeathers.length - 1].m.scale.y.toFixed(2) : -1, ef2: emaCornerFrost.length, efF: emaCornerFrost.length ? +emaCornerFrost[emaCornerFrost.length - 1].l.material.opacity.toFixed(2) : -1, efO: emaCornerFrost.length ? +emaCornerFrost[0].l.material.opacity.toFixed(2) : -1, ibr: basinIce.length, ibrO: basinIce.length ? +basinIce[0].m.material.opacity.toFixed(2) : -1, ibrI: basinIce.length ? +basinIce[basinIce.length - 1].m.material.opacity.toFixed(2) : -1, crst: lintelCrust.length, crstO: lintelCrust.length ? +lintelCrust[0].m.material.opacity.toFixed(2) : -1, shed: crustSheds, sh2: crustSheds2, shedE: lintelCrust.length ? +lintelCrust[0].shed.toFixed(2) : -1, rgC: kairoRidges.length ? kairoRidges[0].color.getHexString() : '-', rgR: kairoRidges.length ? +kairoRidges[0].roughness.toFixed(2) : -1, rgM: kairoRidges.length ? +kairoRidges[0].metalness.toFixed(2) : -1, gr2: guardianRime.length, grO: guardianRime.length ? +guardianRime[0].material.opacity.toFixed(2) : -1, wetN: emaWet.length, wet: +wetE.toFixed(2), sr2: slotRime.length, srO: slotRime.length ? +slotRime[0].material.opacity.toFixed(2) : -1, drip: dripCount, drp: dripMotes.length, fdrp: furinDrips, ic2: icicles.length, icS: icicles.length ? +icicles[0].scale.y.toFixed(2) : -1, tr2: toriiRime.length, trO: toriiRime.length ? +toriiRime[0].material.opacity.toFixed(2) : -1, gut: +Math.max(0, Math.min(1, (furinBreeze - 0.7) / 0.3)).toFixed(2), dk0: lanterns[0] && lanterns[0].duck !== undefined ? +lanterns[0].duck.toFixed(2) : -1, mrg: lanternThaw.filter(lt => (lt.mr || 0) > 0.5).length, mrO: lanternThaw.length > 1 && lanternThaw[1].ring ? +lanternThaw[1].ring.material.opacity.toFixed(2) : -1, fm2: lanternThaw.filter(lt => (lt.fm || 0) > 0.5).length, s0: lanternThaw.length ? +lanternThaw[0].slump.scale.x.toFixed(2) : -1, s2: lanternThaw.length > 2 ? +lanternThaw[2].slump.scale.x.toFixed(2) : -1 });
