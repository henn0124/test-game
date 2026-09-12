import * as THREE from 'three';

// Color Palettes for Roblox Rivals
const BOT_PALETTES = [
  { body: 0xef4444, limbs: 0x1e293b, visor: 0x38bdf8, name: 'Red Rusher', role: 'rusher' },
  { body: 0x3b82f6, limbs: 0x0f172a, visor: 0xfacc15, name: 'Blue Sniper', role: 'sniper' },
  { body: 0xa855f7, limbs: 0x18181b, visor: 0x4ade80, name: 'Shadow Peeker', role: 'peeker' },
  { body: 0xf97316, limbs: 0x27272a, visor: 0x06b6d4, name: 'Blaze Jumper', role: 'jumper' },
  { body: 0x10b981, limbs: 0x022c22, visor: 0xf43f5e, name: 'Viper Flanker', role: 'flanker' },
  { body: 0xe11d48, limbs: 0x1e1b4b, visor: 0xfef08a, name: 'Crimson Ghost', role: 'sniper' }
];

/**
 * Creates an articulated Roblox-style Avatar
 */
export function createRivalAvatar(paletteIndex = 0, weaponType = 'rifle') {
  const palette = BOT_PALETTES[paletteIndex % BOT_PALETTES.length];
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: palette.body, roughness: 0.5, metalness: 0.3 });
  const limbMat = new THREE.MeshStandardMaterial({ color: palette.limbs, roughness: 0.6, metalness: 0.2 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.7 }); // Skin tone
  const visorMat = new THREE.MeshBasicMaterial({ color: palette.visor });
  const metalGunMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8 });
  const neonMat = new THREE.MeshBasicMaterial({ color: palette.visor });

  // 1. Torso
  const torsoGeo = new THREE.BoxGeometry(0.85, 0.95, 0.45);
  const torso = new THREE.Mesh(torsoGeo, bodyMat);
  torso.position.y = 1.25;
  torso.castShadow = true;
  torso.userData.isHead = false;
  group.add(torso);

  // 2. Head (Critical Hitbox)
  const headGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 1.95, 0);
  head.castShadow = true;
  head.userData.isHead = true; // Critical Headshot!
  group.add(head);

  // Visor / Mask
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

  // 4. Right Arm (Holding weapon)
  const rightArm = new THREE.Mesh(armGeo, limbMat);
  rightArm.position.set(0.65, 1.35, -0.25);
  rightArm.rotation.x = -Math.PI / 3;
  rightArm.castShadow = true;
  rightArm.userData.isHead = false;
  group.add(rightArm);

  // Weapon in hand
  const weaponHolder = new THREE.Group();
  if (weaponType === 'blade') {
    // Energy Blade
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), metalGunMat);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.12), neonMat);
    blade.position.y = 0.55;
    weaponHolder.add(hilt, blade);
    weaponHolder.rotation.x = Math.PI / 3;
  } else if (weaponType === 'shotgun') {
    // Shotgun
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.75), metalGunMat);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.5), metalGunMat);
    barrel.position.set(0, 0.05, -0.45);
    weaponHolder.add(body, barrel);
  } else {
    // Rifle
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.85), metalGunMat);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.14), metalGunMat);
    mag.position.set(0, -0.15, -0.1);
    const scope = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.25), neonMat);
    scope.position.set(0, 0.14, -0.1);
    weaponHolder.add(body, mag, scope);
  }
  weaponHolder.position.set(0.65, 1.25, -0.45);
  group.add(weaponHolder);

  // 5. Legs
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

  // 6. Floating 3D Billboard Health Bar
  const hbCanvas = document.createElement('canvas');
  hbCanvas.width = 160;
  hbCanvas.height = 32;
  const hbTexture = new THREE.CanvasTexture(hbCanvas);
  const hbMat = new THREE.SpriteMaterial({ map: hbTexture, depthTest: false });
  const healthSprite = new THREE.Sprite(hbMat);
  healthSprite.scale.set(1.4, 0.28, 1);
  healthSprite.position.set(0, 2.55, 0);
  group.add(healthSprite);

  function updateHealthBar(pct, name) {
    const ctx = hbCanvas.getContext('2d');
    ctx.clearRect(0, 0, 160, 32);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.roundRect(0, 0, 160, 32, 6);
    ctx.fill();

    const fillWidth = Math.max(0, Math.min(150, 150 * pct));
    ctx.fillStyle = pct > 0.5 ? '#10b981' : pct > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.roundRect(5, 5, fillWidth, 22, 4);
    ctx.fill();

    // Name text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 80, 20);

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
    weaponHolder,
    healthSprite,
    updateHealthBar,
    palette
  };
}

/**
 * Creates Detailed First-Person Viewmodels for All 3 Weapon Classes
 */
export function createWeaponArsenal() {
  const arsenalGroup = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.7 });
  const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const orangeNeonMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
  const bladeNeonMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

  // 1. PRIMARY: Cyber Assault Rifle
  const rifleGroup = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.8), steelMat);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 12), darkMetalMat);
  barrel.rotateX(Math.PI / 2);
  barrel.position.set(0, 0.05, -0.65);
  const muzzleComp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.12), steelMat);
  muzzleComp.position.set(0, 0.05, -0.96);
  const holoFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.2), darkMetalMat);
  holoFrame.position.set(0, 0.16, -0.15);
  const holoDot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), cyanNeonMat);
  holoDot.position.set(0, 0.16, -0.15);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.18), darkMetalMat);
  mag.position.set(0, -0.22, 0.05);
  mag.rotation.x = -Math.PI / 8;
  rifleGroup.add(receiver, barrel, muzzleComp, holoFrame, holoDot, mag);

  const rifleFlashLight = new THREE.PointLight(0x38bdf8, 0, 8);
  rifleFlashLight.position.set(0, 0.05, -1.05);
  const rifleFlashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0 }));
  rifleFlashMesh.position.set(0, 0.05, -1.05);
  rifleGroup.add(rifleFlashLight, rifleFlashMesh);
  rifleGroup.position.set(0.3, -0.26, -0.65);
  arsenalGroup.add(rifleGroup);

  // 2. SECONDARY: Plasma Shotgun
  const shotgunGroup = new THREE.Group();
  const sgBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.75), darkMetalMat);
  const sgBarrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.55, 12), steelMat);
  sgBarrelL.rotateX(Math.PI / 2);
  sgBarrelL.position.set(-0.05, 0.04, -0.6);
  const sgBarrelR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.55, 12), steelMat);
  sgBarrelR.rotateX(Math.PI / 2);
  sgBarrelR.position.set(0.05, 0.04, -0.6);
  const sgHeatRail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.45), orangeNeonMat);
  sgHeatRail.position.set(0, 0.13, -0.2);
  shotgunGroup.add(sgBody, sgBarrelL, sgBarrelR, sgHeatRail);

  const sgFlashLight = new THREE.PointLight(0xf97316, 0, 8);
  sgFlashLight.position.set(0, 0.04, -0.9);
  const sgFlashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfdba74, transparent: true, opacity: 0 }));
  sgFlashMesh.position.set(0, 0.04, -0.9);
  shotgunGroup.add(sgFlashLight, sgFlashMesh);
  shotgunGroup.position.set(0.3, -0.26, -0.6);
  shotgunGroup.visible = false;
  arsenalGroup.add(shotgunGroup);

  // 3. MELEE: Cyber Katana / Energy Blade
  const bladeGroup = new THREE.Group();
  const bladeHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 8), darkMetalMat);
  bladeHilt.position.set(0, -0.25, 0);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.09), steelMat);
  guard.position.set(0, -0.11, 0);
  const bladeCore = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.95, 0.08), steelMat);
  bladeCore.position.set(0, 0.4, 0);
  const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.98, 0.12), bladeNeonMat);
  bladeEdge.position.set(0, 0.41, -0.02);
  bladeGroup.add(bladeHilt, guard, bladeCore, bladeEdge);
  bladeGroup.rotation.set(-Math.PI / 4, Math.PI / 6, -Math.PI / 8);
  bladeGroup.position.set(0.32, -0.3, -0.55);
  bladeGroup.visible = false;
  arsenalGroup.add(bladeGroup);

  return {
    arsenalGroup,
    rifle: {
      group: rifleGroup,
      flashLight: rifleFlashLight,
      flashMesh: rifleFlashMesh,
      defaultPos: new THREE.Vector3(0.3, -0.26, -0.65)
    },
    shotgun: {
      group: shotgunGroup,
      flashLight: sgFlashLight,
      flashMesh: sgFlashMesh,
      defaultPos: new THREE.Vector3(0.3, -0.26, -0.6)
    },
    blade: {
      group: bladeGroup,
      defaultPos: new THREE.Vector3(0.32, -0.3, -0.55),
      isSwinging: false,
      swingTime: 0
    }
  };
}
