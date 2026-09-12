import * as THREE from 'three';

/**
 * Builds the Competitive Arena Map
 */
export function buildArenaMap(scene) {
  const mapGroup = new THREE.Group();
  scene.add(mapGroup);

  const colliders = []; // Array of bounding boxes for physics
  const jumpPads = []; // Array of jump pad trigger positions
  const pickups = []; // Array of pickup items

  // Materials
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
  const platformMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
  const rampMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
  const crateMatA = new THREE.MeshLambertMaterial({ color: 0xef4444 }); // Red shipping container
  const crateMatB = new THREE.MeshLambertMaterial({ color: 0x3b82f6 }); // Blue shipping container
  const coverMat = new THREE.MeshLambertMaterial({ color: 0x475569 }); // Concrete barrier
  const padNeonMat = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // Bright neon green jump pad
  const gridLineMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.15 });

  // 1. Arena Main Floor (50 x 50)
  const floorGeo = new THREE.BoxGeometry(54, 1, 54);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, -0.5, 0);
  floor.receiveShadow = true;
  mapGroup.add(floor);

  // Floor Grid Overlay
  const gridHelper = new THREE.GridHelper(54, 27, 0x38bdf8, 0x334155);
  gridHelper.position.y = 0.02;
  mapGroup.add(gridHelper);

  // Helper to add a solid static box with collision
  function addSolidBox(width, height, depth, x, y, z, mat, shadow = true) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + height / 2, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mapGroup.add(mesh);

    colliders.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minY: y,
      maxY: y + height,
      minZ: z - depth / 2,
      maxZ: z + depth / 2
    });

    return mesh;
  }

  // 2. Perimeter Boundary Walls (Height = 6)
  const wallH = 6;
  addSolidBox(54, wallH, 1, 0, 0, -27, wallMat); // North
  addSolidBox(54, wallH, 1, 0, 0, 27, wallMat); // South
  addSolidBox(1, wallH, 54, -27, 0, 0, wallMat); // West
  addSolidBox(1, wallH, 54, 27, 0, 0, wallMat); // East

  // 3. Central Elevated Platform (12 x 12, Height = 2.4)
  addSolidBox(12, 2.4, 12, 0, 0, 0, platformMat);

  // Platform Railing/Borders
  addSolidBox(12, 0.8, 0.4, 0, 2.4, -5.8, coverMat);
  addSolidBox(12, 0.8, 0.4, 0, 2.4, 5.8, coverMat);

  // Center platform cover pillar
  addSolidBox(2.2, 2.5, 2.2, 0, 2.4, 0, crateMatA);

  // 4. Ramps to Center Platform
  function createRamp(x, z, rotY) {
    const rampGroup = new THREE.Group();
    const rampLength = 6.0;
    const rampWidth = 3.5;
    const rampHeight = 2.4;

    const rampGeo = new THREE.BoxGeometry(rampWidth, 0.3, rampLength);
    const rampMesh = new THREE.Mesh(rampGeo, rampMat);
    rampMesh.rotation.x = -Math.atan2(rampHeight, rampLength);
    rampMesh.position.set(0, rampHeight / 2, 0);
    rampMesh.receiveShadow = true;
    rampMesh.castShadow = true;
    rampGroup.add(rampMesh);

    rampGroup.position.set(x, 0, z);
    rampGroup.rotation.y = rotY;
    mapGroup.add(rampGroup);

    // Approximate ramp with steps in colliders
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const stepH = (rampHeight / steps) * (i + 1);
      const stepD = rampLength / steps;
      const stepZ = (i - steps / 2 + 0.5) * stepD;

      let worldX = x;
      let worldZ = z + stepZ;
      if (rotY !== 0) {
        worldX = x + stepZ * Math.sin(rotY);
        worldZ = z + stepZ * Math.cos(rotY);
      }

      colliders.push({
        minX: worldX - rampWidth / 2,
        maxX: worldX + rampWidth / 2,
        minY: 0,
        maxY: stepH,
        minZ: worldZ - stepD / 2,
        maxZ: worldZ + stepD / 2
      });
    }
  }

  createRamp(0, 8.8, 0); // South ramp
  createRamp(0, -8.8, Math.PI); // North ramp

  // 5. Tactical Cover & Shipping Containers
  // Northwest Corner
  addSolidBox(3.2, 2.6, 6.5, -14, 0, -14, crateMatA);
  addSolidBox(2.8, 1.4, 2.8, -10, 0, -18, coverMat);

  // Northeast Corner
  addSolidBox(6.5, 2.6, 3.2, 14, 0, -14, crateMatB);
  addSolidBox(2.8, 1.4, 2.8, 18, 0, -10, coverMat);

  // Southwest Corner
  addSolidBox(6.5, 2.6, 3.2, -14, 0, 14, crateMatB);
  addSolidBox(2.8, 1.4, 2.8, -18, 0, 10, coverMat);

  // Southeast Corner
  addSolidBox(3.2, 2.6, 6.5, 14, 0, 14, crateMatA);
  addSolidBox(2.8, 1.4, 2.8, 10, 0, 18, coverMat);

  // Pillars & barriers in mid lanes
  addSolidBox(1.8, 3.5, 1.8, -16, 0, 0, coverMat);
  addSolidBox(1.8, 3.5, 1.8, 16, 0, 0, coverMat);

  // 6. Jump Pads (Propels player & bots into the air!)
  function createJumpPad(x, z) {
    const padBase = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.2, 16), platformMat);
    padBase.position.set(x, 0.1, z);
    mapGroup.add(padBase);

    const padNeon = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.25, 16), padNeonMat);
    padNeon.position.set(x, 0.15, z);
    mapGroup.add(padNeon);

    const padLight = new THREE.PointLight(0x22c55e, 1.2, 6);
    padLight.position.set(x, 1.0, z);
    mapGroup.add(padLight);

    jumpPads.push({ x, z, radius: 1.5 });
  }

  createJumpPad(-12, 0); // West jump pad
  createJumpPad(12, 0); // East jump pad

  // 7. Health & Shield Pickups
  function createPickup(x, z, type) {
    const group = new THREE.Group();
    const isHealth = type === 'health';

    const geo = new THREE.OctahedronGeometry(0.4, 0);
    const mat = new THREE.MeshBasicMaterial({ color: isHealth ? 0x22c55e : 0x38bdf8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 1.0;
    group.add(mesh);

    const light = new THREE.PointLight(isHealth ? 0x22c55e : 0x38bdf8, 0.8, 4);
    light.position.y = 1.0;
    group.add(light);

    group.position.set(x, 0, z);
    mapGroup.add(group);

    pickups.push({
      group,
      mesh,
      type,
      x,
      z,
      radius: 1.2,
      active: true,
      respawnTimer: 0
    });
  }

  createPickup(0, 0, 'health'); // Center on top of platform
  createPickup(-20, -20, 'shield');
  createPickup(20, 20, 'shield');

  // Spawn positions
  const playerSpawn = new THREE.Vector3(0, 1.6, 22);
  const botSpawns = [
    new THREE.Vector3(-18, 1.6, -18),
    new THREE.Vector3(18, 1.6, -18),
    new THREE.Vector3(-18, 1.6, 18),
    new THREE.Vector3(18, 1.6, 18),
    new THREE.Vector3(0, 3.8, 0) // Center platform
  ];

  return {
    mapGroup,
    colliders,
    jumpPads,
    pickups,
    playerSpawn,
    botSpawns
  };
}
