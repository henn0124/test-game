import * as THREE from 'three';
import { rivalsAudio } from './audio.js';
import { createFirstPersonWeapon } from './avatars.js';
import { buildArenaMap } from './map.js';
import { RivalBot } from './bots.js';

// DOM Elements
const canvas = document.getElementById('webgl-canvas');
const crosshair = document.getElementById('crosshair-container');
const hitmarker = document.getElementById('hitmarker');
const damageVignette = document.getElementById('damage-vignette');
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

// Mobile Buttons
const mBtnShoot = document.getElementById('m-btn-shoot');
const mBtnJump = document.getElementById('m-btn-jump');
const mBtnReload = document.getElementById('m-btn-reload');
const joystickZone = document.getElementById('joystick-zone');
const joystickKnob = document.getElementById('joystick-knob');

// Three.js Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1d);
scene.fog = new THREE.FogExp2(0x0a0f1d, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfffaed, 1.3);
dirLight.position.set(20, 35, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 30;
dirLight.shadow.camera.bottom = -30;
scene.add(dirLight);

// First-Person Weapon Model attached to Camera
const weapon = createFirstPersonWeapon();
camera.add(weapon.group);
scene.add(camera);

// Build Arena Map
const mapData = buildArenaMap(scene);

// Player State
const player = {
  position: mapData.playerSpawn.clone(),
  velocity: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  speed: 12.0,
  jumpSpeed: 9.5,
  isGrounded: false,
  health: 100,
  maxHealth: 100,
  shield: 50,
  maxShield: 50,
  kills: 0,
  streak: 0,
  score: 0,
  isDead: false,
  respawnTimer: 0
};

// Weapon Stats
const weaponStats = {
  ammo: 24,
  maxAmmo: 24,
  fireRate: 0.13, // seconds between shots
  lastShotTime: 0,
  reloading: false,
  reloadTimer: 0,
  damageBase: 28,
  damageHeadshot: 70
};

// Keys pressed
const keys = {};

// Bots
const bots = [];
for (let i = 0; i < 4; i++) {
  const spawn = mapData.botSpawns[i % mapData.botSpawns.length];
  const bot = new RivalBot(i + 1, spawn, scene, mapData.colliders, mapData.jumpPads, i);
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
  }
});

// Mouse Look Listener
window.addEventListener('mousemove', (e) => {
  if (!isPointerLocked) return;
  const sens = 0.0022;
  player.yaw -= e.movementX * sens;
  player.pitch -= e.movementY * sens;
  player.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.pitch));
});

// Keyboard Listeners
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyR') reloadWeapon();
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Mouse Click to Shoot
window.addEventListener('mousedown', (e) => {
  if (!isPointerLocked) {
    lockPointer();
    return;
  }
  if (e.button === 0) shootWeapon();
});

// Mobile Controls
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
    if (t.clientX > window.innerWidth / 2) {
      isTouchingLook = false;
    }
  }
}, { passive: true });

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

// Mobile Joystick Logic
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

// Shooting Mechanics
function shootWeapon() {
  if (player.isDead) return;
  if (weaponStats.reloading) return;

  const now = performance.now() / 1000;
  if (now - weaponStats.lastShotTime < weaponStats.fireRate) return;
  weaponStats.lastShotTime = now;

  if (weaponStats.ammo <= 0) {
    reloadWeapon();
    return;
  }

  weaponStats.ammo -= 1;
  updateHUD();

  // Weapon Recoil Animation & Muzzle Flash
  weapon.group.position.z = -0.45; // Kick back
  weapon.group.rotation.x = 0.2;
  weapon.flashLight.intensity = 2.5;
  weapon.flashMesh.material.opacity = 0.9;
  setTimeout(() => {
    weapon.flashLight.intensity = 0;
    weapon.flashMesh.material.opacity = 0;
  }, 40);

  rivalsAudio.playBlaster();
  crosshair.classList.add('bloom');
  setTimeout(() => crosshair.classList.remove('bloom'), 100);

  // Raycast from Camera Center
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  // Collect all bot hitboxes
  const allHitboxes = [];
  bots.forEach((b) => {
    if (!b.isDead) {
      allHitboxes.push(...b.hitboxes);
    }
  });

  const intersects = raycaster.intersectObjects(allHitboxes, false);

  let targetPoint = raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 50);

  if (intersects.length > 0) {
    const hit = intersects[0];
    targetPoint = hit.point.clone();
    const hitMesh = hit.object;
    const bot = hitMesh.userData.bot;
    const isHeadshot = hitMesh.userData.isHead === true;

    if (bot) {
      const dmg = isHeadshot ? weaponStats.damageHeadshot : weaponStats.damageBase;
      const killed = bot.takeDamage(dmg, isHeadshot);

      // Hitmarker
      hitmarker.className = isHeadshot ? 'headshot pop' : 'pop';
      setTimeout(() => hitmarker.className = '', 180);
      rivalsAudio.playHit(isHeadshot);

      // Floating 3D Damage Number
      createDamageNumber(targetPoint, dmg, isHeadshot);

      // Spark Particles
      createSparkExplosion(targetPoint, isHeadshot ? 0xfacc15 : 0x38bdf8);

      if (killed) {
        onBotEliminated(bot, isHeadshot);
      }
    }
  }

  // Laser Tracer Beam
  const muzzleWorld = new THREE.Vector3();
  weapon.flashLight.getWorldPosition(muzzleWorld);
  createTracer(muzzleWorld, targetPoint, 0x38bdf8);
}

function reloadWeapon() {
  if (weaponStats.reloading || weaponStats.ammo === weaponStats.maxAmmo) return;
  weaponStats.reloading = true;
  rivalsAudio.playReload();

  // Animate gun lowered
  weapon.group.position.y = -0.5;
  weapon.group.rotation.x = -0.4;

  setTimeout(() => {
    weaponStats.ammo = weaponStats.maxAmmo;
    weaponStats.reloading = false;
    weapon.group.position.set(0.32, -0.28, -0.65);
    weapon.group.rotation.set(0, 0, 0);
    updateHUD();
  }, 1100);
}

// Particle Effects
function createTracer(start, end, color = 0x38bdf8) {
  const points = [start, end];
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, linewidth: 2, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  activeTracers.push({ line, life: 0.08 });
}

function createSparkExplosion(pos, color = 0x38bdf8) {
  const count = 6;
  const sparkGroup = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color });

  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), mat);
    p.position.copy(pos);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 6,
      Math.random() * 5 + 1,
      (Math.random() - 0.5) * 6
    );
    p.userData = { vel };
    sparkGroup.add(p);
  }
  scene.add(sparkGroup);
  activeSparks.push({ group: sparkGroup, life: 0.25 });
}

function createDamageNumber(worldPos, dmg, isCrit) {
  const el = document.createElement('div');
  el.className = isCrit ? 'damage-number crit' : 'damage-number';
  el.textContent = isCrit ? `CRIT -${dmg}!` : `-${dmg}`;
  damageContainer.appendChild(el);

  activeFloatingTexts.push({
    el,
    worldPos: worldPos.clone(),
    life: 0.75,
    maxLife: 0.75
  });
}

// Scoring & Kill Feed
function onBotEliminated(bot, isHeadshot) {
  player.kills += 1;
  player.streak += 1;
  const points = isHeadshot ? 250 : 150;
  player.score += points;

  updateHUD();

  // Add to Kill Feed
  const feedItem = document.createElement('div');
  feedItem.className = isHeadshot ? 'kill-feed-item headshot' : 'kill-feed-item';
  feedItem.innerHTML = `You 💥 ${bot.avatar.palette.name} ${isHeadshot ? '<span class="crit-icon">🎯 HEADSHOT!</span>' : ''}`;
  killFeed.appendChild(feedItem);
  setTimeout(() => feedItem.remove(), 4000);

  // Killstreak announcements
  const streakNames = {
    2: 'DOUBLE KILL!',
    3: 'TRIPLE KILL!',
    4: 'RAMPAGE!',
    5: 'UNSTOPPABLE!',
    7: 'GODLIKE!'
  };

  if (streakNames[player.streak]) {
    streakBanner.textContent = streakNames[player.streak];
    streakBanner.classList.add('show');
    setTimeout(() => streakBanner.classList.remove('show'), 1600);
  }
}

// Bot firing at Player
function handleBotShoot(muzzlePos, targetPos, bot) {
  createTracer(muzzlePos, targetPos, 0xef4444);

  // Check if ray hits player
  const dist = targetPos.distanceTo(player.position);
  if (dist < 1.8 && !player.isDead) {
    // Player Hit
    const dmg = 15;
    takePlayerDamage(dmg);
  }
}

function takePlayerDamage(amount) {
  rivalsAudio.playPlayerHurt();
  damageVignette.classList.add('active');
  setTimeout(() => damageVignette.classList.remove('active'), 200);

  if (player.shield > 0) {
    const shieldDmg = Math.min(player.shield, amount);
    player.shield -= shieldDmg;
    amount -= shieldDmg;
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
  player.respawnTimer = 2.5;
  overlay.classList.add('active');
  playBtn.textContent = 'RESPAWNING...';
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

// HUD Updates
function updateHUD() {
  killsDisplay.textContent = player.kills.toString();
  streakDisplay.textContent = player.streak.toString();
  scoreDisplay.textContent = player.score.toString().padStart(4, '0');

  hpBarFill.style.width = `${Math.max(0, (player.health / player.maxHealth) * 100)}%`;
  hpValue.textContent = Math.max(0, player.health).toString();

  shBarFill.style.width = `${Math.max(0, (player.shield / player.maxShield) * 100)}%`;
  shValue.textContent = Math.max(0, player.shield).toString();

  ammoCurrent.textContent = weaponStats.ammo.toString();
  ammoMax.textContent = weaponStats.maxAmmo.toString();
}

// Window Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Game Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);

  // Player Respawn Countdown
  if (player.isDead) {
    player.respawnTimer -= delta;
    if (player.respawnTimer <= 0) {
      respawnPlayer();
    }
  }

  // Update Player Physics
  if (!player.isDead) {
    // Movement inputs (WASD or Mobile Joystick)
    let moveX = 0;
    let moveZ = 0;

    if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

    // Merge mobile joystick
    if (joystickMoveVec.x !== 0 || joystickMoveVec.y !== 0) {
      moveX += joystickMoveVec.x;
      moveZ += joystickMoveVec.y;
    }

    // Forward & Right directions relative to Yaw
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(forward, -moveZ);
    moveDir.addScaledVector(right, moveX);
    if (moveDir.lengthSq() > 1) moveDir.normalize();

    // Horizontal acceleration & damping
    const accel = 60.0;
    player.velocity.x += moveDir.x * accel * delta;
    player.velocity.z += moveDir.z * accel * delta;
    player.velocity.x *= Math.pow(0.001, delta); // Friction
    player.velocity.z *= Math.pow(0.001, delta);

    // Jump
    if (keys['Space'] && player.isGrounded) {
      player.velocity.y = player.jumpSpeed;
      player.isGrounded = false;
    }

    // Gravity
    player.velocity.y -= 24.0 * delta;

    // Apply Position with AABB Collisions
    const nextPos = player.position.clone();
    nextPos.x += player.velocity.x * delta;
    nextPos.y += player.velocity.y * delta;
    nextPos.z += player.velocity.z * delta;

    // Ground floor check
    if (nextPos.y < 1.6) {
      nextPos.y = 1.6;
      player.velocity.y = 0;
      player.isGrounded = true;
    }

    // Arena boundary walls check
    nextPos.x = Math.max(-25.5, Math.min(25.5, nextPos.x));
    nextPos.z = Math.max(-25.5, Math.min(25.5, nextPos.z));

    // Obstacle Box Collisions
    const playerRadius = 0.6;
    mapData.colliders.forEach((box) => {
      // Check collision
      if (
        nextPos.x + playerRadius > box.minX &&
        nextPos.x - playerRadius < box.maxX &&
        nextPos.z + playerRadius > box.minZ &&
        nextPos.z - playerRadius < box.maxZ
      ) {
        // Check if landing on top
        if (player.position.y >= box.maxY && nextPos.y <= box.maxY + 0.3) {
          nextPos.y = box.maxY + 1.6;
          player.velocity.y = 0;
          player.isGrounded = true;
        } else if (nextPos.y < box.maxY + 1.2) {
          // Push back out horizontally
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

    // Jump Pads Trigger
    mapData.jumpPads.forEach((pad) => {
      const d = Math.hypot(player.position.x - pad.x, player.position.z - pad.z);
      if (d < pad.radius && player.position.y <= 1.8) {
        player.velocity.y = 18.0; // Launch high!
        player.isGrounded = false;
        rivalsAudio.playJumpPad();
      }
    });

    // Health & Shield Pickups Trigger
    mapData.pickups.forEach((pickup) => {
      if (pickup.active) {
        pickup.mesh.rotation.y += delta * 2;
        const d = Math.hypot(player.position.x - pickup.x, player.position.z - pickup.z);
        if (d < pickup.radius) {
          pickup.active = false;
          pickup.mesh.visible = false;
          pickup.respawnTimer = 15.0;

          if (pickup.type === 'health') {
            player.health = Math.min(player.maxHealth, player.health + 35);
          } else {
            player.shield = Math.min(player.maxShield, player.shield + 25);
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

    // Weapon Sway & Return from Recoil
    if (!weaponStats.reloading) {
      const defaultWeaponPos = new THREE.Vector3(0.32, -0.28, -0.65);
      weapon.group.position.lerp(defaultWeaponPos, delta * 12);
      weapon.group.rotation.x = THREE.MathUtils.lerp(weapon.group.rotation.x, 0, delta * 12);
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

  // Update Laser Tracers
  for (let i = activeTracers.length - 1; i >= 0; i--) {
    const t = activeTracers[i];
    t.life -= delta;
    if (t.life <= 0) {
      scene.remove(t.line);
      activeTracers.splice(i, 1);
    }
  }

  // Update Spark Explosions
  for (let i = activeSparks.length - 1; i >= 0; i--) {
    const s = activeSparks[i];
    s.life -= delta;
    if (s.life <= 0) {
      scene.remove(s.group);
      activeSparks.splice(i, 1);
    } else {
      s.group.children.forEach((p) => {
        p.position.addScaledVector(p.userData.vel, delta);
        p.userData.vel.y -= 9.8 * delta;
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
      // Project 3D coordinates to 2D Screen
      const screenPos = dt.worldPos.clone().project(camera);
      const isBehind = screenPos.z > 1;
      if (isBehind) {
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
