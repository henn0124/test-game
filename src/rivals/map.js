import * as THREE from 'three';

/**
 * Procedural PBR Texture Generators for Realistic Graphics
 */
function createConcreteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base industrial grey
  ctx.fillStyle = '#262f3d';
  ctx.fillRect(0, 0, 512, 512);

  // Noise speckles
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const lum = Math.floor(Math.random() * 25) - 12;
    ctx.fillStyle = `rgba(${38 + lum}, ${47 + lum}, ${61 + lum}, 0.8)`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Tile grid seams
  ctx.strokeStyle = 'rgba(10, 15, 24, 0.7)';
  ctx.lineWidth = 4;
  for (let x = 0; x <= 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  return texture;
}

function createMetalPlatesTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#161d27';
  ctx.fillRect(0, 0, 256, 256);

  // Brushed lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 200; i++) {
    const y = Math.random() * 256;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // Panel borders
  ctx.strokeStyle = '#0b0f16';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 248, 248);

  // Rivets in corners
  ctx.fillStyle = '#475569';
  [[16, 16], [240, 16], [16, 240], [240, 240]].forEach(([rx, ry]) => {
    ctx.beginPath();
    ctx.arc(rx, ry, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function createHazardStripeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#facc15'; // Bright yellow
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = '#0f172a'; // Dark slate
  for (let i = -128; i < 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 32, 0);
    ctx.lineTo(i + 32 + 128, 128);
    ctx.lineTo(i + 128, 128);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

/**
 * Builds the Massive 120m x 120m Multi-Tiered Arena Map
 */
export function buildArenaMap(scene) {
  const mapGroup = new THREE.Group();
  scene.add(mapGroup);

  const colliders = [];
  const jumpPads = [];
  const pickups = [];

  // PBR Materials
  const concreteTex = createConcreteTexture();
  const metalTex = createMetalPlatesTexture();
  const hazardTex = createHazardStripeTexture();

  const floorMat = new THREE.MeshStandardMaterial({
    map: concreteTex,
    roughness: 0.75,
    metalness: 0.15
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.2
  });

  const steelMat = new THREE.MeshStandardMaterial({
    map: metalTex,
    roughness: 0.4,
    metalness: 0.8
  });

  const hazardMat = new THREE.MeshStandardMaterial({
    map: hazardTex,
    roughness: 0.6,
    metalness: 0.1
  });

  const crateRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.45,
    metalness: 0.6
  });

  const crateBlueMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.45,
    metalness: 0.6
  });

  const crateOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.45,
    metalness: 0.6
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transmission: 0.8,
    opacity: 0.6,
    transparent: true,
    roughness: 0.1,
    metalness: 0.1
  });

  const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const neonGreenMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });

  // Solid Box Helper
  function addSolidBox(w, h, d, x, y, z, mat, shadow = true) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mapGroup.add(mesh);

    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y,
      maxY: y + h,
      minZ: z - d / 2,
      maxZ: z + d / 2
    });

    return mesh;
  }

  // 1. Massive Main Arena Floor (120 x 120)
  const floorGeo = new THREE.BoxGeometry(124, 1, 124);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.set(0, -0.5, 0);
  floorMesh.receiveShadow = true;
  mapGroup.add(floorMesh);

  // 2. Fortress Perimeter Walls (Height = 10m)
  const wallH = 10;
  addSolidBox(124, wallH, 2, 0, 0, -62, wallMat); // North
  addSolidBox(124, wallH, 2, 0, 0, 62, wallMat); // South
  addSolidBox(2, wallH, 124, -62, 0, 0, wallMat); // West
  addSolidBox(2, wallH, 124, 62, 0, 0, wallMat); // East

  // 3. Central Cyber Plaza Complex
  // Main deck (26m x 26m, Height = 3.6m)
  addSolidBox(26, 3.6, 26, 0, 0, 0, steelMat);
  // Center raised glass pavilion
  addSolidBox(10, 1.2, 10, 0, 3.6, 0, glassMat);

  // Platform Railings with Hazard Edges
  addSolidBox(26, 0.9, 0.4, 0, 3.6, -12.8, hazardMat);
  addSolidBox(26, 0.9, 0.4, 0, 3.6, 12.8, hazardMat);
  addSolidBox(0.4, 0.9, 26, -12.8, 3.6, 0, hazardMat);
  addSolidBox(0.4, 0.9, 26, 12.8, 3.6, 0, hazardMat);

  // 4 Grand Staircase Ramps to Center Plaza
  function createGrandRamp(x, z, length, width, height, rotY) {
    const rampGroup = new THREE.Group();
    const rampGeo = new THREE.BoxGeometry(width, 0.4, length);
    const ramp = new THREE.Mesh(rampGeo, steelMat);
    ramp.rotation.x = -Math.atan2(height, length);
    ramp.position.set(0, height / 2, 0);
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    rampGroup.add(ramp);

    rampGroup.position.set(x, 0, z);
    rampGroup.rotation.y = rotY;
    mapGroup.add(rampGroup);

    // Approximate stepped collision
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const stepH = (height / steps) * (i + 1);
      const stepD = length / steps;
      const stepZ = (i - steps / 2 + 0.5) * stepD;
      let worldX = x;
      let worldZ = z + stepZ;
      if (rotY !== 0) {
        worldX = x + stepZ * Math.sin(rotY);
        worldZ = z + stepZ * Math.cos(rotY);
      }
      colliders.push({
        minX: worldX - width / 2,
        maxX: worldX + width / 2,
        minY: 0,
        maxY: stepH,
        minZ: worldZ - stepD / 2,
        maxZ: worldZ + stepD / 2
      });
    }
  }

  createGrandRamp(0, 19, 12, 6, 3.6, 0); // South ramp
  createGrandRamp(0, -19, 12, 6, 3.6, Math.PI); // North ramp
  createGrandRamp(-19, 0, 12, 6, 3.6, Math.PI / 2); // West ramp
  createGrandRamp(19, 0, 12, 6, 3.6, -Math.PI / 2); // East ramp

  // 4. Twin Sniper Fortress Towers (North & South)
  function createSniperTower(x, z, rotY) {
    // 4 Corner support pillars
    addSolidBox(1.6, 8.5, 1.6, x - 5.5, 0, z - 5.5, steelMat);
    addSolidBox(1.6, 8.5, 1.6, x + 5.5, 0, z - 5.5, steelMat);
    addSolidBox(1.6, 8.5, 1.6, x - 5.5, 0, z + 5.5, steelMat);
    addSolidBox(1.6, 8.5, 1.6, x + 5.5, 0, z + 5.5, steelMat);

    // High sniper floor (14m x 14m, Height = 8.5m)
    addSolidBox(14, 0.8, 14, x, 8.5, z, steelMat);

    // Sniper Parapet Walls with peek windows
    addSolidBox(14, 1.4, 0.6, x, 9.3, z - 6.7, wallMat);
    addSolidBox(14, 1.4, 0.6, x, 9.3, z + 6.7, wallMat);
    addSolidBox(0.6, 1.4, 14, x - 6.7, 9.3, z, wallMat);
    addSolidBox(0.6, 1.4, 14, x + 6.7, 9.3, z, wallMat);

    // Mid-level staging platform (Height = 4.5m)
    addSolidBox(10, 0.6, 10, x, 4.5, z, steelMat);
  }

  createSniperTower(0, -42, 0); // North Sniper Tower
  createSniperTower(0, 42, Math.PI); // South Sniper Tower

  // 5. High-Altitude Suspension Sky Bridges
  // North Bridge from Center Plaza to North Tower
  addSolidBox(3.8, 0.5, 16, 0, 6.0, -28, steelMat);
  addSolidBox(0.3, 0.9, 16, -1.9, 6.5, -28, hazardMat);
  addSolidBox(0.3, 0.9, 16, 1.9, 6.5, -28, hazardMat);

  // South Bridge from Center Plaza to South Tower
  addSolidBox(3.8, 0.5, 16, 0, 6.0, 28, steelMat);
  addSolidBox(0.3, 0.9, 16, -1.9, 6.5, 28, hazardMat);
  addSolidBox(0.3, 0.9, 16, 1.9, 6.5, 28, hazardMat);

  // 6. Industrial Shipping Container Labyrinths (East & West)
  const containerCoords = [
    // West Industrial Yard
    { w: 4, h: 3.2, d: 8, x: -36, z: -24, mat: crateRedMat },
    { w: 8, h: 3.2, d: 4, x: -44, z: -16, mat: crateBlueMat },
    { w: 4, h: 3.2, d: 8, x: -34, z: 0, mat: crateOrangeMat },
    { w: 8, h: 6.4, d: 4, x: -46, z: 12, mat: crateRedMat }, // Double-stacked container
    { w: 4, h: 3.2, d: 8, x: -38, z: 28, mat: crateBlueMat },
    { w: 8, h: 3.2, d: 4, x: -28, z: 38, mat: crateOrangeMat },

    // East Industrial Yard
    { w: 4, h: 3.2, d: 8, x: 36, z: -24, mat: crateBlueMat },
    { w: 8, h: 3.2, d: 4, x: 44, z: -16, mat: crateOrangeMat },
    { w: 4, h: 3.2, d: 8, x: 34, z: 0, mat: crateRedMat },
    { w: 8, h: 6.4, d: 4, x: 46, z: 12, mat: crateBlueMat }, // Double-stacked container
    { w: 4, h: 3.2, d: 8, x: 38, z: 28, mat: crateOrangeMat },
    { w: 8, h: 3.2, d: 4, x: 28, z: 38, mat: crateRedMat },

    // Midfield concrete bunkers
    { w: 3, h: 2.2, d: 8, x: -22, z: -38, mat: wallMat },
    { w: 3, h: 2.2, d: 8, x: 22, z: -38, mat: wallMat },
    { w: 3, h: 2.2, d: 8, x: -22, z: 38, mat: wallMat },
    { w: 3, h: 2.2, d: 8, x: 22, z: 38, mat: wallMat }
  ];

  containerCoords.forEach((c) => {
    addSolidBox(c.w, c.h, c.d, c.x, 0, c.z, c.mat);
  });

  // 7. 4 Super Jump Pads
  function createJumpPad(x, z, targetH = 20.0) {
    const padBase = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.3, 20), steelMat);
    padBase.position.set(x, 0.15, z);
    mapGroup.add(padBase);

    const padNeon = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.35, 20), neonGreenMat);
    padNeon.position.set(x, 0.2, z);
    mapGroup.add(padNeon);

    const padLight = new THREE.PointLight(0x10b981, 1.6, 10);
    padLight.position.set(x, 1.2, z);
    mapGroup.add(padLight);

    jumpPads.push({ x, z, radius: 2.0, launchPower: targetH });
  }

  // 2 Courtyard Jump Pads
  createJumpPad(-24, 0, 18.0);
  createJumpPad(24, 0, 18.0);

  // 2 Tower Assault Jump Pads (launch straight up to sniper perches!)
  createJumpPad(0, -32, 24.0);
  createJumpPad(0, 32, 24.0);

  // 8. Health & Shield Pickups
  function createPickup(x, y, z, type) {
    const group = new THREE.Group();
    const isHealth = type === 'health';
    const color = isHealth ? 0x10b981 : 0x38bdf8;

    const geo = new THREE.OctahedronGeometry(0.5, 0);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = y + 0.8;
    group.add(mesh);

    const light = new THREE.PointLight(color, 1.0, 6);
    light.position.y = y + 0.8;
    group.add(light);

    group.position.set(x, 0, z);
    mapGroup.add(group);

    pickups.push({
      group,
      mesh,
      type,
      x,
      y,
      z,
      radius: 1.8,
      active: true,
      respawnTimer: 0
    });
  }

  // Center Mega Health Pack
  createPickup(0, 4.8, 0, 'health');

  // Tower Shields
  createPickup(0, 9.3, -42, 'shield');
  createPickup(0, 9.3, 42, 'shield');

  // Yard Medkits
  createPickup(-40, 0, -20, 'health');
  createPickup(40, 0, -20, 'health');
  createPickup(-40, 0, 20, 'shield');
  createPickup(40, 0, 20, 'shield');

  // 9. Realistic Skybox Dome
  const skyGeo = new THREE.SphereGeometry(250, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x0f172a) },
      bottomColor: { value: new THREE.Color(0x1e3a8a) },
      offset: { value: 20 },
      exponent: { value: 0.6 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  mapGroup.add(skyDome);

  // Player & Bot Spawn Nodes
  const playerSpawn = new THREE.Vector3(0, 1.6, 54);

  const botSpawns = [
    new THREE.Vector3(-45, 1.6, -45),
    new THREE.Vector3(45, 1.6, -45),
    new THREE.Vector3(-45, 1.6, 45),
    new THREE.Vector3(45, 1.6, 45),
    new THREE.Vector3(0, 9.5, -42), // North Sniper Tower
    new THREE.Vector3(0, 9.5, 42),  // South Sniper Tower
    new THREE.Vector3(-36, 1.6, 0),  // West Yard
    new THREE.Vector3(36, 1.6, 0),   // East Yard
    new THREE.Vector3(0, 4.8, 0)     // Center Plaza
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
