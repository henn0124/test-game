import * as THREE from 'three';

// Color Palettes for Roblox Rivals
const BOT_PALETTES = [
  { body: 0xef4444, limbs: 0x1e293b, visor: 0x38bdf8, name: 'Red Rival' },
  { body: 0x3b82f6, limbs: 0x0f172a, visor: 0xfacc15, name: 'Blue Rival' },
  { body: 0xa855f7, limbs: 0x18181b, visor: 0x4ade80, name: 'Shadow Rival' },
  { body: 0xf97316, limbs: 0x27272a, visor: 0x06b6d4, name: 'Blaze Rival' },
  { body: 0x10b981, limbs: 0x022c22, visor: 0xf43f5e, name: 'Viper Rival' }
];

/**
 * Creates a Roblox-style Blocky Avatar for bots or players
 */
export function createRivalAvatar(paletteIndex = 0) {
  const palette = BOT_PALETTES[paletteIndex % BOT_PALETTES.length];
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: palette.body });
  const limbMat = new THREE.MeshLambertMaterial({ color: palette.limbs });
  const headMat = new THREE.MeshLambertMaterial({ color: 0xffdbac }); // Skin tone
  const visorMat = new THREE.MeshBasicMaterial({ color: palette.visor });
  const blasterMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  const blasterNeonMat = new THREE.MeshBasicMaterial({ color: palette.visor });

  // 1. Torso (Center pivot)
  const torsoGeo = new THREE.BoxGeometry(0.85, 0.95, 0.45);
  const torso = new THREE.Mesh(torsoGeo, bodyMat);
  torso.position.y = 1.25;
  torso.castShadow = true;
  torso.userData.isHead = false;
  group.add(torso);

  // 2. Head (Critical Hit Zone)
  const headGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 1.95, 0);
  head.castShadow = true;
  head.userData.isHead = true; // Critical headshot flag!
  group.add(head);

  // Visor / Face Screen
  const visorGeo = new THREE.BoxGeometry(0.48, 0.18, 0.05);
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 1.98, -0.28);
  group.add(visor);

  // 3. Left Arm
  const armGeo = new THREE.BoxGeometry(0.35, 0.85, 0.35);
  const leftArm = new THREE.Mesh(armGeo, limbMat);
  leftArm.position.set(-0.65, 1.25, 0);
  leftArm.castShadow = true;
  leftArm.userData.isHead = false;
  group.add(leftArm);

  // 4. Right Arm (Holding blaster forward)
  const rightArm = new THREE.Mesh(armGeo, limbMat);
  rightArm.position.set(0.65, 1.35, -0.25);
  rightArm.rotation.x = -Math.PI / 3;
  rightArm.castShadow = true;
  rightArm.userData.isHead = false;
  group.add(rightArm);

  // Handheld Blaster Weapon
  const blasterGroup = new THREE.Group();
  const barrelGeo = new THREE.BoxGeometry(0.12, 0.16, 0.65);
  const barrel = new THREE.Mesh(barrelGeo, blasterMat);
  barrel.position.set(0, 0, -0.3);
  const neonStripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.4), blasterNeonMat);
  neonStripe.position.set(0, 0.06, -0.3);
  blasterGroup.add(barrel, neonStripe);
  blasterGroup.position.set(0.65, 1.3, -0.5);
  group.add(blasterGroup);

  // 5. Left Leg & Right Leg
  const legGeo = new THREE.BoxGeometry(0.38, 0.85, 0.38);
  const leftLeg = new THREE.Mesh(legGeo, limbMat);
  leftLeg.position.set(-0.25, 0.43, 0);
  leftLeg.castShadow = true;
  leftLeg.userData.isHead = false;

  const rightLeg = new THREE.Mesh(legGeo, limbMat);
  rightLeg.position.set(0.25, 0.43, 0);
  rightLeg.castShadow = true;
  rightLeg.userData.isHead = false;

  group.add(leftLeg, rightLeg);

  // 6. Floating 3D Health Bar Canvas Billboard
  const hbCanvas = document.createElement('canvas');
  hbCanvas.width = 128;
  hbCanvas.height = 24;
  const hbTexture = new THREE.CanvasTexture(hbCanvas);
  const hbMat = new THREE.SpriteMaterial({ map: hbTexture, depthTest: false });
  const healthSprite = new THREE.Sprite(hbMat);
  healthSprite.scale.set(1.2, 0.22, 1);
  healthSprite.position.set(0, 2.5, 0);
  group.add(healthSprite);

  function updateHealthBar(pct, name) {
    const ctx = hbCanvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 24);

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.roundRect(0, 0, 128, 24, 6);
    ctx.fill();

    // Health Fill
    const fillWidth = Math.max(0, Math.min(120, 120 * pct));
    ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.roundRect(4, 4, fillWidth, 16, 4);
    ctx.fill();

    hbTexture.needsUpdate = true;
  }

  updateHealthBar(1.0, palette.name);

  return {
    group,
    head,
    torso,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    healthSprite,
    updateHealthBar,
    palette
  };
}

/**
 * Creates the First-Person Blaster Viewmodel
 */
export function createFirstPersonWeapon() {
  const group = new THREE.Group();

  // Cyber Blaster Body
  const gunMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const accentMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 }); // Cyan neon
  const barrelMat = new THREE.MeshLambertMaterial({ color: 0x475569 });

  // Main Receiver
  const receiverGeo = new THREE.BoxGeometry(0.18, 0.24, 0.7);
  const receiver = new THREE.Mesh(receiverGeo, gunMat);
  receiver.position.set(0, 0, 0);
  group.add(receiver);

  // Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12);
  barrelGeo.rotateX(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.position.set(0, 0.04, -0.55);
  group.add(barrel);

  // Neon Energy Rails
  const railGeo = new THREE.BoxGeometry(0.2, 0.03, 0.55);
  const railTop = new THREE.Mesh(railGeo, accentMat);
  railTop.position.set(0, 0.12, -0.15);
  group.add(railTop);

  // Grip / Handle
  const gripGeo = new THREE.BoxGeometry(0.14, 0.35, 0.18);
  const grip = new THREE.Mesh(gripGeo, gunMat);
  grip.position.set(0, -0.22, 0.18);
  grip.rotation.x = Math.PI / 8;
  group.add(grip);

  // Player Hand / Glove
  const handGeo = new THREE.BoxGeometry(0.18, 0.22, 0.22);
  const hand = new THREE.Mesh(handGeo, new THREE.MeshLambertMaterial({ color: 0x0f172a }));
  hand.position.set(0, -0.2, 0.18);
  group.add(hand);

  // Muzzle Flash Light & Mesh
  const flashLight = new THREE.PointLight(0x38bdf8, 0, 6);
  flashLight.position.set(0, 0.04, -0.85);
  group.add(flashLight);

  const flashGeo = new THREE.SphereGeometry(0.12, 8, 8);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0 });
  const flashMesh = new THREE.Mesh(flashGeo, flashMat);
  flashMesh.position.set(0, 0.04, -0.85);
  group.add(flashMesh);

  // Default Position in Camera view (lower-right corner)
  group.position.set(0.32, -0.28, -0.65);

  return {
    group,
    flashLight,
    flashMesh
  };
}
