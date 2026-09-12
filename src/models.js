import * as THREE from 'three';
import lebronImgUrl from './assets/lebron.jpg';

// Texture Loader for LeBron James
const textureLoader = new THREE.TextureLoader();
const lebronTexture = textureLoader.load(lebronImgUrl);
lebronTexture.colorSpace = THREE.SRGBColorSpace;

// Material Palette
const materials = {
  frogSkin: new THREE.MeshLambertMaterial({ color: 0x22c55e }), // Emerald Green
  frogBelly: new THREE.MeshLambertMaterial({ color: 0x86efac }), // Mint
  frogEyeWhite: new THREE.MeshLambertMaterial({ color: 0xffffff }),
  frogPupil: new THREE.MeshLambertMaterial({ color: 0x111827 }),
  wheel: new THREE.MeshLambertMaterial({ color: 0x1f2937 }),
  wheelHub: new THREE.MeshLambertMaterial({ color: 0xd1d5db }),
  windshield: new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    transmission: 0.7,
    thickness: 0.5,
    transparent: true,
    opacity: 0.8
  }),
  headlight: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
  taillight: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
  logBark: new THREE.MeshLambertMaterial({ color: 0x854d0e }),
  logEnd: new THREE.MeshLambertMaterial({ color: 0xa16207 }),
  turtleShell: new THREE.MeshLambertMaterial({ color: 0x15803d }),
  turtleSkin: new THREE.MeshLambertMaterial({ color: 0x4ade80 }),
  lilyPad: new THREE.MeshLambertMaterial({ color: 0x16a34a }),
  flowerPetal: new THREE.MeshLambertMaterial({ color: 0xf472b6 }),
  flowerCenter: new THREE.MeshLambertMaterial({ color: 0xfacc15 }),
  treeTrunk: new THREE.MeshLambertMaterial({ color: 0x78350f }),
  leaves: new THREE.MeshLambertMaterial({ color: 0x15803d }),
  leavesLight: new THREE.MeshLambertMaterial({ color: 0x16a34a }),
  playerShell: new THREE.MeshLambertMaterial({ color: 0x1b4332 }),
  playerShellPlate: new THREE.MeshLambertMaterial({ color: 0x2d6a4f }),
  playerPlastron: new THREE.MeshLambertMaterial({ color: 0xfef08a }),
  playerSkin: new THREE.MeshLambertMaterial({ color: 0x52b788 }),
  playerEyeWhite: new THREE.MeshLambertMaterial({ color: 0xffffff }),
  playerEyePupil: new THREE.MeshLambertMaterial({ color: 0x111827 }),
  playerTail: new THREE.MeshLambertMaterial({ color: 0x40916c }),
  lebronFace: new THREE.MeshBasicMaterial({ map: lebronTexture }),
  lakersGold: new THREE.MeshLambertMaterial({ color: 0xfdb927 }),
  lakersPurple: new THREE.MeshLambertMaterial({ color: 0x552583 })
};

/**
 * Procedural Player Turtle Model
 */
export function createPlayerTurtle() {
  const group = new THREE.Group();

  // 1. Carapace (Top Shell Dome)
  const shellGeo = new THREE.SphereGeometry(0.48, 14, 10);
  shellGeo.scale(1.0, 0.55, 1.25);
  const shell = new THREE.Mesh(shellGeo, materials.playerShell);
  shell.position.y = 0.28;
  shell.castShadow = true;
  group.add(shell);

  // Shell Rim / Ridge
  const rimGeo = new THREE.TorusGeometry(0.49, 0.05, 8, 20);
  rimGeo.rotateX(Math.PI / 2);
  rimGeo.scale(1.0, 1.25, 0.8);
  const rim = new THREE.Mesh(rimGeo, materials.playerShellPlate);
  rim.position.y = 0.16;
  rim.castShadow = true;
  group.add(rim);

  // Shell Scute Plates (hexagonal / decorative plates on back)
  const platePositions = [
    [0, 0.44, 0],
    [0, 0.41, -0.28],
    [0, 0.41, 0.28],
    [-0.22, 0.36, -0.12],
    [0.22, 0.36, -0.12],
    [-0.22, 0.36, 0.14],
    [0.22, 0.36, 0.14]
  ];

  platePositions.forEach(([x, y, z]) => {
    const plateGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.04, 6);
    const plate = new THREE.Mesh(plateGeo, materials.playerShellPlate);
    plate.position.set(x, y, z);
    plate.rotation.y = Math.PI / 6;
    group.add(plate);
  });

  // 2. Plastron (Under-belly shell)
  const bellyGeo = new THREE.BoxGeometry(0.68, 0.08, 0.95);
  const belly = new THREE.Mesh(bellyGeo, materials.playerPlastron);
  belly.position.set(0, 0.12, 0);
  group.add(belly);

  // 3. Head & Snout
  const headGroup = new THREE.Group();
  const headGeo = new THREE.SphereGeometry(0.18, 12, 10);
  headGeo.scale(1, 0.8, 1.2);
  const head = new THREE.Mesh(headGeo, materials.playerSkin);
  head.position.set(0, 0.25, -0.62);
  head.castShadow = true;
  headGroup.add(head);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.065, 8, 8);
  const pupilGeo = new THREE.SphereGeometry(0.038, 8, 8);

  const leftEye = new THREE.Mesh(eyeGeo, materials.playerEyeWhite);
  leftEye.position.set(-0.13, 0.31, -0.68);
  const leftPupil = new THREE.Mesh(pupilGeo, materials.playerEyePupil);
  leftPupil.position.set(-0.14, 0.32, -0.73);

  const rightEye = new THREE.Mesh(eyeGeo, materials.playerEyeWhite);
  rightEye.position.set(0.13, 0.31, -0.68);
  const rightPupil = new THREE.Mesh(pupilGeo, materials.playerEyePupil);
  rightPupil.position.set(0.14, 0.32, -0.73);

  headGroup.add(leftEye, leftPupil, rightEye, rightPupil);
  group.add(headGroup);

  // 4. Flippers / Legs
  const legGeo = new THREE.BoxGeometry(0.2, 0.09, 0.32);

  // Front Flippers (angled outwards)
  const flFrontLeft = new THREE.Mesh(legGeo, materials.playerSkin);
  flFrontLeft.position.set(-0.42, 0.13, -0.32);
  flFrontLeft.rotation.y = -Math.PI / 4;

  const flFrontRight = new THREE.Mesh(legGeo, materials.playerSkin);
  flFrontRight.position.set(0.42, 0.13, -0.32);
  flFrontRight.rotation.y = Math.PI / 4;

  // Back Flippers
  const flBackLeft = new THREE.Mesh(legGeo, materials.playerSkin);
  flBackLeft.position.set(-0.38, 0.12, 0.36);
  flBackLeft.rotation.y = Math.PI / 6;

  const flBackRight = new THREE.Mesh(legGeo, materials.playerSkin);
  flBackRight.position.set(0.38, 0.12, 0.36);
  flBackRight.rotation.y = -Math.PI / 6;

  group.add(flFrontLeft, flFrontRight, flBackLeft, flBackRight);

  // 5. Tail
  const tailGeo = new THREE.ConeGeometry(0.08, 0.22, 6);
  tailGeo.rotateX(-Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, materials.playerTail);
  tail.position.set(0, 0.14, 0.65);
  group.add(tail);

  group.castShadow = true;
  return group;
}

/**
 * Procedural Frog Model (kept for compatibility)
 */
export function createFrog() {
  return createPlayerTurtle();
}


/**
 * Creates 4 wheels for standard vehicles
 */
function addWheels(group, xSpan, zSpan, radius = 0.22, width = 0.14) {
  const wheelGeo = new THREE.CylinderGeometry(radius, radius, width, 14);
  wheelGeo.rotateZ(Math.PI / 2);

  const positions = [
    [-xSpan, radius, -zSpan],
    [xSpan, radius, -zSpan],
    [-xSpan, radius, zSpan],
    [xSpan, radius, zSpan]
  ];

  positions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, materials.wheel);
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    group.add(wheel);
  });
}

/**
 * Sedan Model
 */
export function createSedan(color = 0xef4444) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });

  // Lower chassis
  const chassisGeo = new THREE.BoxGeometry(1.2, 0.45, 2.2);
  const chassis = new THREE.Mesh(chassisGeo, bodyMat);
  chassis.position.y = 0.38;
  chassis.castShadow = true;
  group.add(chassis);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.05, 0.42, 1.2);
  const cabin = new THREE.Mesh(cabinGeo, bodyMat);
  cabin.position.set(0, 0.76, -0.1);
  cabin.castShadow = true;
  group.add(cabin);

  // Windshield & windows
  const glassGeo = new THREE.BoxGeometry(1.08, 0.35, 1.05);
  const glass = new THREE.Mesh(glassGeo, materials.windshield);
  glass.position.set(0, 0.76, -0.1);
  group.add(glass);

  // Headlights & Taillights
  const lightGeo = new THREE.BoxGeometry(0.2, 0.1, 0.05);
  const hlLeft = new THREE.Mesh(lightGeo, materials.headlight);
  hlLeft.position.set(-0.4, 0.42, -1.1);
  const hlRight = new THREE.Mesh(lightGeo, materials.headlight);
  hlRight.position.set(0.4, 0.42, -1.1);

  const tlLeft = new THREE.Mesh(lightGeo, materials.taillight);
  tlLeft.position.set(-0.4, 0.42, 1.1);
  const tlRight = new THREE.Mesh(lightGeo, materials.taillight);
  tlRight.position.set(0.4, 0.42, 1.1);
  group.add(hlLeft, hlRight, tlLeft, tlRight);

  addWheels(group, 0.62, 0.65);
  return group;
}

/**
 * Semi Truck Model
 */
export function createTruck(color = 0x3b82f6) {
  const group = new THREE.Group();
  const cabMat = new THREE.MeshLambertMaterial({ color });
  const trailerMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });

  // Cab
  const cabGeo = new THREE.BoxGeometry(1.3, 0.95, 1.2);
  const cab = new THREE.Mesh(cabGeo, cabMat);
  cab.position.set(0, 0.68, -1.2);
  cab.castShadow = true;
  group.add(cab);

  // Trailer
  const trailerGeo = new THREE.BoxGeometry(1.4, 1.2, 2.6);
  const trailer = new THREE.Mesh(trailerGeo, trailerMat);
  trailer.position.set(0, 0.85, 0.6);
  trailer.castShadow = true;
  group.add(trailer);

  // Wheels (6 wheels)
  addWheels(group, 0.7, 1.2, 0.26, 0.16);
  addWheels(group, 0.7, -0.2, 0.26, 0.16);
  addWheels(group, 0.7, -1.4, 0.26, 0.16);

  return group;
}

/**
 * Sports Car / Race Car
 */
export function createRaceCar(color = 0xf59e0b) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });

  // Body
  const bodyGeo = new THREE.BoxGeometry(1.2, 0.35, 2.3);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.3;
  body.castShadow = true;
  group.add(body);

  // Cockpit
  const cockpitGeo = new THREE.BoxGeometry(0.8, 0.28, 0.9);
  const cockpit = new THREE.Mesh(cockpitGeo, materials.windshield);
  cockpit.position.set(0, 0.52, 0.1);
  group.add(cockpit);

  // Rear Wing / Spoiler
  const spoilerGeo = new THREE.BoxGeometry(1.3, 0.08, 0.3);
  const spoiler = new THREE.Mesh(spoilerGeo, bodyMat);
  spoiler.position.set(0, 0.65, 1.0);
  group.add(spoiler);

  addWheels(group, 0.62, 0.7, 0.2, 0.18);
  return group;
}

/**
 * Floating River Log
 */
export function createLog(length = 3) {
  const group = new THREE.Group();
  const radius = 0.42;

  const logGeo = new THREE.CylinderGeometry(radius, radius, length, 12);
  logGeo.rotateX(Math.PI / 2); // align along Z axis
  const logMesh = new THREE.Mesh(logGeo, materials.logBark);
  logMesh.position.y = 0.05;
  logMesh.castShadow = true;
  group.add(logMesh);

  // End cap details
  const capGeo = new THREE.CircleGeometry(radius * 0.95, 12);
  const capFront = new THREE.Mesh(capGeo, materials.logEnd);
  capFront.position.set(0, 0.05, -length / 2 - 0.01);
  capFront.rotateY(Math.PI);
  const capBack = new THREE.Mesh(capGeo, materials.logEnd);
  capBack.position.set(0, 0.05, length / 2 + 0.01);
  group.add(capFront, capBack);

  return group;
}

/**
 * Floating LeBron James Platform (replacing single turtle)
 */
export function createSingleTurtle() {
  const group = new THREE.Group();

  // Floating raft base (Lakers gold cylinder disc)
  const baseGeo = new THREE.CylinderGeometry(0.55, 0.52, 0.14, 24);
  const base = new THREE.Mesh(baseGeo, materials.lakersGold);
  base.position.y = 0.04;
  base.castShadow = true;
  group.add(base);

  // Lakers purple accent ring border
  const ringGeo = new THREE.TorusGeometry(0.54, 0.045, 8, 24);
  ringGeo.rotateX(Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, materials.lakersPurple);
  ring.position.y = 0.11;
  group.add(ring);

  // LeBron James Photo Disc (flat facing directly up towards the camera)
  const photoGeo = new THREE.CircleGeometry(0.51, 24);
  photoGeo.rotateX(-Math.PI / 2);
  const photo = new THREE.Mesh(photoGeo, materials.lebronFace);
  photo.position.y = 0.115;
  group.add(photo);

  return group;
}

/**
 * Group of floating LeBron James pictures (2 or 3 in line)
 */
export function createTurtleGroup(count = 3) {
  const group = new THREE.Group();
  group.userData.noGroupRotate = true;
  const spacing = 1.15;
  const startX = -((count - 1) * spacing) / 2;

  for (let i = 0; i < count; i++) {
    const lebron = createSingleTurtle();
    lebron.position.x = startX + i * spacing;
    group.add(lebron);
  }

  return group;
}


/**
 * Lily pad with optional goal frog or water lily flower
 */
export function createLilyPad() {
  const group = new THREE.Group();

  // Pad
  const padGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.06, 16);
  const pad = new THREE.Mesh(padGeo, materials.lilyPad);
  pad.position.y = 0.03;
  group.add(pad);

  // Flower
  const flower = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const petalGeo = new THREE.ConeGeometry(0.08, 0.18, 6);
    petalGeo.rotateZ(Math.PI / 4);
    const petal = new THREE.Mesh(petalGeo, materials.flowerPetal);
    petal.rotation.y = (i * Math.PI) / 3;
    flower.add(petal);
  }
  const centerGeo = new THREE.SphereGeometry(0.07, 8, 8);
  const center = new THREE.Mesh(centerGeo, materials.flowerCenter);
  flower.add(center);
  flower.position.set(0.25, 0.08, -0.2);
  flower.scale.set(0.8, 0.8, 0.8);
  group.add(flower);

  return group;
}

/**
 * Decorative Tree
 */
export function createTree() {
  const group = new THREE.Group();

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 1.2, 8);
  const trunk = new THREE.Mesh(trunkGeo, materials.treeTrunk);
  trunk.position.y = 0.6;
  trunk.castShadow = true;
  group.add(trunk);

  // Foliage layers (pine-style cones)
  const layer1Geo = new THREE.ConeGeometry(0.8, 1.1, 8);
  const layer1 = new THREE.Mesh(layer1Geo, materials.leaves);
  layer1.position.y = 1.4;
  layer1.castShadow = true;

  const layer2Geo = new THREE.ConeGeometry(0.6, 0.9, 8);
  const layer2 = new THREE.Mesh(layer2Geo, materials.leavesLight);
  layer2.position.y = 1.9;
  layer2.castShadow = true;

  group.add(layer1, layer2);
  return group;
}
