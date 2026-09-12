import * as THREE from 'three';
import { rivalsAudio } from './audio.js';
import { createWeaponArsenal } from './avatars.js';
import { buildArenaMap } from './map.js';
import { RivalBot } from './bots.js';

// DOM Elements
const canvas = document.getElementById('webgl-canvas');
const crosshair = document.getElementById('crosshair-container');
const hitmarker = document.getElementById('hitmarker');
const damageVignette = document.getElementById('damage-vignette');
const sniperScope = document.getElementById('sniper-scope');
const killsDisplay = document.getElementById('kills-display');
const streakDisplay = document.getElementById('streak-display');
const scoreDisplay = document.getElementById('score-display');
const killFeed = document.getElementById('kill-feed');
const streakBanner = document.getElementById('streak-banner');
const hpBarFill = document.getElementById('hp-bar-fill');
const hpValue = document.getElementById('hp-value');
const shBarFill = document.getElementById('sh-bar-fill');
const shValue = document.getElementById('sh-value');
const ammoCurrent = document.getElementById('ammo-current');
const ammoMax = document.getElementById('ammo-max');
const damageContainer = document.getElementById('damage-container');
const overlay = document.getElementById('overlay');
const playBtn = document.getElementById('play-btn');

// Hotbar Slots
const slotEls = [
  document.getElementById('slot-1'),
  document.getElementById('slot-2'),
  document.getElementById('slot-3')
];

// Mobile Controls
const mBtnShoot = document.getElementById('m-btn-shoot');
const mBtnJump = document.getElementById('m-btn-jump');
const mBtnReload = document.getElementById('m-btn-reload');
const joystickZone = document.getElementById('joystick-zone');
const joystickKnob = document.getElementById('joystick-knob');

// Three.js Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);
scene.fog = new THREE.FogExp2(0x0f172a, 0.008); // Atmospheric distance fog for 120m map

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Realistic Lighting Overhaul
const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.8);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
sunLight.position.set(40, 70, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 250;
sunLight.shadow.camera.left = -70;
sunLight.shadow.camera.right = 70;
sunLight.shadow.camera.top = 70;
sunLight.shadow.camera.bottom = -70;
sunLight.shadow.bias = -0.0003;
scene.add(sunLight);

// Sky / Ground bounce light
const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 0.45);
scene.add(hemiLight);

// Build Massive 120m Arena Map
const mapData = buildArenaMap(scene);

// Weapon Arsenal Viewmodels
const arsenal = createWeaponArsenal();
camera.add(arsenal.arsenalGroup);
scene.add(camera);

// Player State
const player = {
  position: mapData.playerSpawn.clone(),
  velocity: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  baseSpeed: 12.0,
  jumpSpeed: 10.0,
  isGrounded: false,
  health: 100,
  maxHealth: 100,
  shield: 50,
  maxShield: 50,
  kills: 0,
  streak: 0,
  score: 0,
  isDead: false,
  respawnTimer: 0,
  isADS: false
};

// 3-Weapon Loadout Definitions
const weapons = [
  {
    name: 'Cyber Rifle',
    type: 'rifle',
    viewmodel: arsenal.rifle,
    ammo: 30,
    maxAmmo: 30,
    fireRate: 0.11,
    lastShotTime: 0,
    reloading: false,
    reloadTime: 1.1,
    damageBase: 24,
    damageHeadshot: 60
  },
  {
    name: 'Plasma Shotgun',
    type: 'shotgun',
    viewmodel: arsenal.shotgun,
    ammo: 8,
    maxAmmo: 8,
    fireRate: 0.72,
    lastShotTime: 0,
    reloading: false,
    reloadTime: 1.4,
    pellets: 8,
    damagePerPellet: 14,
    spread: 0.08
  },
  {
    name: 'Cyber Katana',
    type: 'blade',
    viewmodel: arsenal.blade,
    ammo: Infinity,
    maxAmmo: Infinity,
    fireRate: 0.38,
    lastShotTime: 0,
    reloading: false,
    damage: 75,
    range: 4.2
  }
];

let activeWeaponIdx = 0;

function switchWeapon(idx) {
  if (idx === activeWeaponIdx || idx < 0 || idx >= weapons.length) return;
  activeWeaponIdx = idx;

  // Update viewmodel visibility
  arsenal.rifle.group.visible = idx === 0;
  arsenal.shotgun.group.visible = idx === 1;
  arsenal.blade.group.visible = idx === 2;

  // Update hotbar UI
  slotEls.forEach((el, i) => {
    if (i === idx) el?.classList.add('active');
    else el?.classList.remove('active');
  });

  // Turn off ADS when switching
  if (player.isADS) toggleADS(false);

  rivalsAudio.playWeaponSwitch();
  updateHUD();
}

slotEls.forEach((el, i) => {
  el?.addEventListener('click', () => switchWeapon(i));
});

// Spawn 6 Diverse Bots across the massive arena
const bots = [];
for (let i = 0; i < 6; i++) {
  const spawn = mapData.botSpawns[i % mapData.botSpawns.length];
  const bot = new RivalBot(i + 1, spawn, scene, mapData.colliders, mapData.jumpPads, mapData.pickups, i);
  bots.push(bot);
}

// Particle & Tracer Container
const activeTracers = [];
const activeSparks = [];
const activeFloatingTexts = [];

// Pointer Lock Controls
let isPointerLocked = false;

function lockPointer() {
  canvas.requestPointerLock();
  rivalsAudio.init();
}

playBtn.addEventListener('click', () => {
  overlay.classList.remove('active');
  lockPointer();
});

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = document.pointerLockElement === canvas;
  if (!isPointerLocked) {
    overlay.classList.add('active');
    if (player.isADS) toggleADS(false);
  }
});

// Mouse Look & ADS Listeners
window.addEventListener('mousemove', (e) => {
  if (!isPointerLocked) return;
  const sens = player.isADS ? 0.0011 : 0.0022; // Slower sens when zoomed in
  player.yaw -= e.movementX * sens;
  player.pitch -= e.movementY * sens;
  player.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.pitch));
});

// Right Click ADS Zoom
window.addEventListener('mousedown', (e) => {
  if (!isPointerLocked) {
    lockPointer();
    return;
  }
  if (e.button === 0) {
    shootWeapon();
  } else if (e.button === 2) {
    toggleADS(true);
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 2) {
    toggleADS(false);
  }
});

// Prevent right-click context menu
window.addEventListener('contextmenu', (e) => e.preventDefault());

function toggleADS(active) {
  if (activeWeaponIdx === 2) return; // Katana has no ADS
  player.isADS = active;

  if (active) {
    camera.fov = 42;
    sniperScope.classList.add('active');
  } else {
    camera.fov = 75;
    sniperScope.classList.remove('active');
  }
  camera.updateProjectionMatrix();
}

// Keyboard Input
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Digit1') switchWeapon(0);
  if (e.code === 'Digit2') switchWeapon(1);
  if (e.code === 'Digit3') switchWeapon(2);
  if (e.code === 'KeyR') reloadWeapon();
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Mouse Wheel Weapon Switch
window.addEventListener('wheel', (e) => {
  if (!isPointerLocked) return;
  if (e.deltaY > 0) {
    switchWeapon((activeWeaponIdx + 1) % weapons.length);
  } else {
    switchWeapon((activeWeaponIdx - 1 + weapons.length) % weapons.length);
  }
});

// Mobile Action Buttons
mBtnShoot?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  shootWeapon();
});
mBtnJump?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (player.isGrounded) {
    player.velocity.y = player.jumpSpeed;
    player.isGrounded = false;
  }
});
mBtnReload?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  reloadWeapon();
});

// Mobile Touch Look & Joystick
let touchLookStartX = 0;
let touchLookStartY = 0;
let isTouchingLook = false;

window.addEventListener('touchstart', (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.clientX > window.innerWidth / 2) {
      touchLookStartX = t.clientX;
      touchLookStartY = t.clientY;
      isTouchingLook = true;
    }
  }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!isTouchingLook) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.clientX > window.innerWidth / 2) {
      const dx = t.clientX - touchLookStartX;
      const dy = t.clientY - touchLookStartY;
      const sens = 0.005;
      player.yaw -= dx * sens;
      player.pitch -= dy * sens;
      player.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.pitch));
      touchLookStartX = t.clientX;
      touchLookStartY = t.clientY;
    }
  }
}, { passive: true });

window.addEventListener('touchend', (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.clientX > window.innerWidth / 2) isTouchingLook = false;
  }
}, { passive: true });

// Mobile Joystick
let joystickTouchId = null;
let joystickMoveVec = { x: 0, y: 0 };

joystickZone?.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  joystickTouchId = touch.identifier;
  updateJoystick(touch.clientX, touch.clientY);
});

joystickZone?.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === joystickTouchId) {
      updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
    }
  }
});

function resetJoystick() {
  joystickTouchId = null;
  joystickMoveVec = { x: 0, y: 0 };
  if (joystickKnob) joystickKnob.style.transform = 'translate(-50%, -50%)';
}
joystickZone?.addEventListener('touchend', resetJoystick);
joystickZone?.addEventListener('touchcancel', resetJoystick);

function updateJoystick(clientX, clientY) {
  const rect = joystickZone.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  let dx = clientX - centerX;
  let dy = clientY - centerY;
  const dist = Math.hypot(dx, dy);
  const maxRadius = rect.width / 2;

  if (dist > maxRadius) {
    dx = (dx / dist) * maxRadius;
    dy = (dy / dist) * maxRadius;
  }
  if (joystickKnob) {
    joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
  joystickMoveVec.x = dx / maxRadius;
  joystickMoveVec.y = dy / maxRadius;
}

// Shooting & Combat Engine
function shootWeapon() {
  if (player.isDead) return;
  const curWeapon = weapons[activeWeaponIdx];
  if (curWeapon.reloading) return;

  const now = performance.now() / 1000;
  if (now - curWeapon.lastShotTime < curWeapon.fireRate) return;
  curWeapon.lastShotTime = now;

  // MELEE KATANA SWING
  if (curWeapon.type === 'blade') {
    rivalsAudio.playMeleeSlash();
    curWeapon.viewmodel.isSwinging = true;
    curWeapon.viewmodel.swingTime = 0;

    // Check hit radius in front of player
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    let hitAny = false;

    bots.forEach((b) => {
      if (b.isDead) return;
      const toBot = new THREE.Vector3().subVectors(b.position, player.position);
      const dist = toBot.length();
      if (dist < curWeapon.range) {
        const dot = forward.dot(toBot.normalize());
        if (dot > 0.4) {
          // In front of blade slash
          const killed = b.takeDamage(curWeapon.damage, false);
          hitAny = true;
          rivalsAudio.playMeleeHit();
          createDamageNumber(b.position.clone().add(new THREE.Vector3(0, 1.2, 0)), curWeapon.damage, false);
          createSparkExplosion(b.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0x06b6d4);

          // Hitmarker
          hitmarker.className = 'pop';
          setTimeout(() => hitmarker.className = '', 160);

          if (killed) onBotEliminated(b, false, '🗡️ Cyber Katana');
        }
      }
    });

    crosshair.classList.add('bloom');
    setTimeout(() => crosshair.classList.remove('bloom'), 120);
    return;
  }

  // GUN AMMO CHECK
  if (curWeapon.ammo <= 0) {
    reloadWeapon();
    return;
  }

  curWeapon.ammo -= 1;
  updateHUD();

  // Weapon Recoil Animation & Muzzle Flash
  const vm = curWeapon.viewmodel;
  vm.group.position.z = vm.defaultPos.z + 0.18; // Kick back
  vm.group.rotation.x = 0.16;
  if (vm.flashLight) vm.flashLight.intensity = 2.4;
  if (vm.flashMesh) vm.flashMesh.material.opacity = 0.9;
  setTimeout(() => {
    if (vm.flashLight) vm.flashLight.intensity = 0;
    if (vm.flashMesh) vm.flashMesh.material.opacity = 0;
  }, 40);

  crosshair.classList.add('bloom');
  setTimeout(() => crosshair.classList.remove('bloom'), 100);

  // All active bot hitboxes
  const allHitboxes = [];
  bots.forEach((b) => {
    if (!b.isDead) allHitboxes.push(...b.hitboxes);
  });

  const muzzleWorld = new THREE.Vector3();
  if (vm.flashLight) vm.flashLight.getWorldPosition(muzzleWorld);
  else muzzleWorld.copy(player.position).add(new THREE.Vector3(0.3, -0.1, -0.5));

  // SHOTGUN: 8-Pellet Multi-Raycast Spread
  if (curWeapon.type === 'shotgun') {
    rivalsAudio.playShotgun();
    const pelletCount = curWeapon.pellets;

    for (let p = 0; p < pelletCount; p++) {
      const spreadX = (Math.random() - 0.5) * curWeapon.spread;
      const spreadY = (Math.random() - 0.5) * curWeapon.spread;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);

      const intersects = raycaster.intersectObjects(allHitboxes, false);
      let targetPoint = raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 40);

      if (intersects.length > 0) {
        const hit = intersects[0];
        targetPoint = hit.point.clone();
        const hitMesh = hit.object;
        const bot = hitMesh.userData.bot;
        const isHeadshot = hitMesh.userData.isHead === true;

        if (bot) {
          const dmg = isHeadshot ? curWeapon.damagePerPellet * 2 : curWeapon.damagePerPellet;
          const killed = bot.takeDamage(dmg, isHeadshot);

          hitmarker.className = isHeadshot ? 'headshot pop' : 'pop';
          setTimeout(() => hitmarker.className = '', 160);
          rivalsAudio.playHit(isHeadshot);

          createDamageNumber(targetPoint, dmg, isHeadshot);
          createSparkExplosion(targetPoint, 0xf97316);

          if (killed) onBotEliminated(bot, isHeadshot, '💥 Plasma Shotgun');
        }
      }
      createTracer(muzzleWorld, targetPoint, 0xf97316);
    }
  } else {
    // RIFLE: Single High Precision Raycast
    rivalsAudio.playRifle();

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const intersects = raycaster.intersectObjects(allHitboxes, false);
    let targetPoint = raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 80);

    if (intersects.length > 0) {
      const hit = intersects[0];
      targetPoint = hit.point.clone();
      const hitMesh = hit.object;
      const bot = hitMesh.userData.bot;
      const isHeadshot = hitMesh.userData.isHead === true;

      if (bot) {
        const dmg = isHeadshot ? curWeapon.damageHeadshot : curWeapon.damageBase;
        const killed = bot.takeDamage(dmg, isHeadshot);

        hitmarker.className = isHeadshot ? 'headshot pop' : 'pop';
        setTimeout(() => hitmarker.className = '', 160);
        rivalsAudio.playHit(isHeadshot);

        createDamageNumber(targetPoint, dmg, isHeadshot);
        createSparkExplosion(targetPoint, isHeadshot ? 0xfacc15 : 0x38bdf8);

        if (killed) onBotEliminated(bot, isHeadshot, '⚡ Cyber Rifle');
      }
    }
    createTracer(muzzleWorld, targetPoint, 0x38bdf8);
  }
}

function reloadWeapon() {
  const curWeapon = weapons[activeWeaponIdx];
  if (curWeapon.type === 'blade') return;
  if (curWeapon.reloading || curWeapon.ammo === curWeapon.maxAmmo) return;

  curWeapon.reloading = true;
  rivalsAudio.playReload();

  const vm = curWeapon.viewmodel;
  vm.group.position.y = -0.55;
  vm.group.rotation.x = -0.4;

  setTimeout(() => {
    curWeapon.ammo = curWeapon.maxAmmo;
    curWeapon.reloading = false;
    vm.group.position.copy(vm.defaultPos);
    vm.group.rotation.set(0, 0, 0);
    updateHUD();
  }, curWeapon.reloadTime * 1000);
}

// Particle & Visual Helpers
function createTracer(start, end, color = 0x38bdf8) {
  const points = [start, end];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, linewidth: 2, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  activeTracers.push({ line, life: 0.07 });
}

function createSparkExplosion(pos, color = 0x38bdf8) {
  const sparkGroup = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), mat);
    p.position.copy(pos);
    const vel = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6 + 1, (Math.random() - 0.5) * 8);
    p.userData = { vel };
    sparkGroup.add(p);
  }
  scene.add(sparkGroup);
  activeSparks.push({ group: sparkGroup, life: 0.28 });
}

function createDamageNumber(worldPos, dmg, isCrit) {
  const el = document.createElement('div');
  el.className = isCrit ? 'damage-number crit' : 'damage-number';
  el.textContent = isCrit ? `CRIT -${dmg}!` : `-${dmg}`;
  damageContainer.appendChild(el);

  activeFloatingTexts.push({ el, worldPos: worldPos.clone(), life: 0.75, maxLife: 0.75 });
}

function onBotEliminated(bot, isHeadshot, weaponName) {
  player.kills += 1;
  player.streak += 1;
  const points = isHeadshot ? 250 : 150;
  player.score += points;
  updateHUD();

  // Kill Feed
  const feedItem = document.createElement('div');
  feedItem.className = isHeadshot ? 'kill-feed-item headshot' : 'kill-feed-item';
  feedItem.innerHTML = `You [${weaponName}] ${bot.avatar.palette.name} ${isHeadshot ? '<span class="crit-icon">🎯 HEADSHOT!</span>' : ''}`;
  killFeed.appendChild(feedItem);
  setTimeout(() => feedItem.remove(), 4500);

  // Killstreak Announcements
  const streakNames = { 2: 'DOUBLE KILL!', 3: 'TRIPLE KILL!', 4: 'RAMPAGE!', 5: 'UNSTOPPABLE!', 7: 'GODLIKE!' };
  if (streakNames[player.streak]) {
    streakBanner.textContent = streakNames[player.streak];
    streakBanner.classList.add('show');
    setTimeout(() => streakBanner.classList.remove('show'), 1600);
  }
}

// Bot firing at Player
function handleBotShoot(muzzlePos, targetPos, bot, weaponType) {
  const color = weaponType === 'shotgun' ? 0xf97316 : 0xef4444;
  createTracer(muzzlePos, targetPos, color);

  const dist = targetPos.distanceTo(player.position);
  if (dist < 2.0 && !player.isDead) {
    const dmg = weaponType === 'shotgun' ? 24 : 14;
    takePlayerDamage(dmg);
  }
}

function takePlayerDamage(amount) {
  rivalsAudio.playPlayerHurt();
  damageVignette.classList.add('active');
  setTimeout(() => damageVignette.classList.remove('active'), 200);

  if (player.shield > 0) {
    const sDmg = Math.min(player.shield, amount);
    player.shield -= sDmg;
    amount -= sDmg;
  }
  player.health -= amount;
  if (player.health <= 0) {
    player.health = 0;
    onPlayerDied();
  }
  updateHUD();
}

function onPlayerDied() {
  player.isDead = true;
  player.streak = 0;
  player.respawnTimer = 2.8;
  overlay.classList.add('active');
  playBtn.textContent = 'RESPAWNING...';
  if (player.isADS) toggleADS(false);
  updateHUD();
}

function respawnPlayer() {
  player.isDead = false;
  player.health = player.maxHealth;
  player.shield = player.maxShield;
  player.position.copy(mapData.playerSpawn);
  player.velocity.set(0, 0, 0);
  overlay.classList.remove('active');
  lockPointer();
  updateHUD();
}

// Update HUD
function updateHUD() {
  killsDisplay.textContent = player.kills.toString();
  streakDisplay.textContent = player.streak.toString();
  scoreDisplay.textContent = player.score.toString().padStart(4, '0');

  hpBarFill.style.width = `${Math.max(0, (player.health / player.maxHealth) * 100)}%`;
  hpValue.textContent = Math.max(0, player.health).toString();

  shBarFill.style.width = `${Math.max(0, (player.shield / player.maxShield) * 100)}%`;
  shValue.textContent = Math.max(0, player.shield).toString();

  const curWeapon = weapons[activeWeaponIdx];
  ammoCurrent.textContent = curWeapon.ammo === Infinity ? '∞' : curWeapon.ammo.toString();
  ammoMax.textContent = curWeapon.maxAmmo === Infinity ? '∞' : curWeapon.maxAmmo.toString();
}

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Game Loop
const clock = new THREE.Clock();
let walkAnimTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);

  if (player.isDead) {
    player.respawnTimer -= delta;
    if (player.respawnTimer <= 0) respawnPlayer();
  }

  // Katana swinging animation
  const blade = arsenal.blade;
  if (blade.isSwinging) {
    blade.swingTime += delta * 14;
    const swingAngle = Math.sin(blade.swingTime) * 1.6;
    blade.group.rotation.set(-Math.PI / 4 + swingAngle, Math.PI / 6, -Math.PI / 8 - swingAngle);
    if (blade.swingTime > Math.PI) {
      blade.isSwinging = false;
      blade.group.rotation.set(-Math.PI / 4, Math.PI / 6, -Math.PI / 8);
    }
  }

  // Update Player Movement & Physics
  if (!player.isDead) {
    let moveX = 0;
    let moveZ = 0;

    if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

    if (joystickMoveVec.x !== 0 || joystickMoveVec.y !== 0) {
      moveX += joystickMoveVec.x;
      moveZ += joystickMoveVec.y;
    }

    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(forward, -moveZ);
    moveDir.addScaledVector(right, moveX);
    if (moveDir.lengthSq() > 1) moveDir.normalize();

    // Speed bonus when holding melee katana!
    const curSpeed = activeWeaponIdx === 2 ? player.baseSpeed * 1.25 : player.baseSpeed;
    const accel = 65.0;
    player.velocity.x += moveDir.x * accel * delta;
    player.velocity.z += moveDir.z * accel * delta;
    player.velocity.x *= Math.pow(0.001, delta);
    player.velocity.z *= Math.pow(0.001, delta);

    // Jump
    if (keys['Space'] && player.isGrounded) {
      player.velocity.y = player.jumpSpeed;
      player.isGrounded = false;
    }

    // Gravity
    player.velocity.y -= 24.0 * delta;

    // Apply Position with AABB Collision
    const nextPos = player.position.clone();
    nextPos.x += player.velocity.x * delta;
    nextPos.y += player.velocity.y * delta;
    nextPos.z += player.velocity.z * delta;

    if (nextPos.y < 1.6) {
      nextPos.y = 1.6;
      player.velocity.y = 0;
      player.isGrounded = true;
    }

    // Arena boundary clamp for 120m map
    nextPos.x = Math.max(-59.5, Math.min(59.5, nextPos.x));
    nextPos.z = Math.max(-59.5, Math.min(59.5, nextPos.z));

    // Obstacle Collisions
    const playerRadius = 0.65;
    mapData.colliders.forEach((box) => {
      if (
        nextPos.x + playerRadius > box.minX &&
        nextPos.x - playerRadius < box.maxX &&
        nextPos.z + playerRadius > box.minZ &&
        nextPos.z - playerRadius < box.maxZ
      ) {
        if (player.position.y >= box.maxY && nextPos.y <= box.maxY + 0.3) {
          nextPos.y = box.maxY + 1.6;
          player.velocity.y = 0;
          player.isGrounded = true;
        } else if (nextPos.y < box.maxY + 1.2) {
          const pushLeft = Math.abs(nextPos.x - box.minX);
          const pushRight = Math.abs(nextPos.x - box.maxX);
          const pushFront = Math.abs(nextPos.z - box.minZ);
          const pushBack = Math.abs(nextPos.z - box.maxZ);
          const minPush = Math.min(pushLeft, pushRight, pushFront, pushBack);

          if (minPush === pushLeft) nextPos.x = box.minX - playerRadius;
          else if (minPush === pushRight) nextPos.x = box.maxX + playerRadius;
          else if (minPush === pushFront) nextPos.z = box.minZ - playerRadius;
          else nextPos.z = box.maxZ + playerRadius;
        }
      }
    });

    player.position.copy(nextPos);

    // Super Jump Pads
    mapData.jumpPads.forEach((pad) => {
      const d = Math.hypot(player.position.x - pad.x, player.position.z - pad.z);
      if (d < pad.radius && player.position.y <= 1.8) {
        player.velocity.y = pad.launchPower || 20.0;
        player.isGrounded = false;
        rivalsAudio.playJumpPad();
      }
    });

    // Health & Shield Pickups
    mapData.pickups.forEach((pickup) => {
      if (pickup.active) {
        pickup.mesh.rotation.y += delta * 2.2;
        const d = Math.hypot(player.position.x - pickup.x, player.position.z - pickup.z);
        const dy = Math.abs(player.position.y - pickup.y);
        if (d < pickup.radius && dy < 2.5) {
          pickup.active = false;
          pickup.mesh.visible = false;
          pickup.respawnTimer = 15.0;

          if (pickup.type === 'health') {
            player.health = Math.min(player.maxHealth, player.health + 45);
          } else {
            player.shield = Math.min(player.maxShield, player.shield + 35);
          }
          updateHUD();
        }
      } else {
        pickup.respawnTimer -= delta;
        if (pickup.respawnTimer <= 0) {
          pickup.active = true;
          pickup.mesh.visible = true;
        }
      }
    });

    // Camera Orientation
    camera.position.copy(player.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;

    // Realistic Weapon Bobbing
    const isMoving = (Math.abs(player.velocity.x) > 0.5 || Math.abs(player.velocity.z) > 0.5) && player.isGrounded;
    if (isMoving) {
      walkAnimTime += delta * 12;
    }
    const bobX = Math.cos(walkAnimTime * 0.5) * 0.015;
    const bobY = Math.sin(walkAnimTime) * 0.015;

    // Viewmodel Return from Recoil + Bobbing
    const curVM = weapons[activeWeaponIdx].viewmodel;
    if (!weapons[activeWeaponIdx].reloading && activeWeaponIdx !== 2) {
      const targetPos = curVM.defaultPos.clone().add(new THREE.Vector3(bobX, bobY, 0));
      curVM.group.position.lerp(targetPos, delta * 10);
      curVM.group.rotation.x = THREE.MathUtils.lerp(curVM.group.rotation.x, 0, delta * 10);
    }
  }

  // Update Bots
  bots.forEach((bot) => {
    if (bot.isDead && bot.respawnTimer <= 0) {
      const randomSpawn = mapData.botSpawns[Math.floor(Math.random() * mapData.botSpawns.length)];
      bot.respawn(randomSpawn);
    }
    bot.update(delta, player.position, handleBotShoot);
  });

  // Update Tracers
  for (let i = activeTracers.length - 1; i >= 0; i--) {
    const t = activeTracers[i];
    t.life -= delta;
    if (t.life <= 0) {
      scene.remove(t.line);
      activeTracers.splice(i, 1);
    }
  }

  // Update Sparks
  for (let i = activeSparks.length - 1; i >= 0; i--) {
    const s = activeSparks[i];
    s.life -= delta;
    if (s.life <= 0) {
      scene.remove(s.group);
      activeSparks.splice(i, 1);
    } else {
      s.group.children.forEach((p) => {
        p.position.addScaledVector(p.userData.vel, delta);
        p.userData.vel.y -= 12.0 * delta;
      });
    }
  }

  // Update Floating Damage Texts
  for (let i = activeFloatingTexts.length - 1; i >= 0; i--) {
    const dt = activeFloatingTexts[i];
    dt.life -= delta;
    if (dt.life <= 0) {
      dt.el.remove();
      activeFloatingTexts.splice(i, 1);
    } else {
      const screenPos = dt.worldPos.clone().project(camera);
      if (screenPos.z > 1) {
        dt.el.style.display = 'none';
      } else {
        dt.el.style.display = 'block';
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
        dt.el.style.left = `${x}px`;
        dt.el.style.top = `${y}px`;
      }
    }
  }

  renderer.render(scene, camera);
}

updateHUD();
animate();
