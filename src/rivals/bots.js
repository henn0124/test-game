import * as THREE from 'three';
import { createRivalAvatar } from './avatars.js';
import { rivalsAudio } from './audio.js';

export class RivalBot {
  constructor(id, spawnPos, scene, colliders, jumpPads, paletteIndex = 0) {
    this.id = id;
    this.scene = scene;
    this.colliders = colliders;
    this.jumpPads = jumpPads;

    this.maxHealth = 100;
    this.health = 100;
    this.isDead = false;
    this.respawnTimer = 0;

    // Movement & AI
    this.position = spawnPos.clone();
    this.velocity = new THREE.Vector3();
    this.speed = 4.2 + Math.random() * 1.5;
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
    this.strafeTimer = 1.0 + Math.random();
    this.shootTimer = 0.8 + Math.random() * 1.2;

    // Avatar
    this.avatar = createRivalAvatar(paletteIndex);
    this.avatar.group.position.copy(this.position);
    this.scene.add(this.avatar.group);

    // Hitbox parts tagged for raycaster
    this.hitboxes = [
      this.avatar.head,
      this.avatar.torso,
      this.avatar.leftArm,
      this.avatar.rightArm,
      this.avatar.leftLeg,
      this.avatar.rightLeg
    ];

    this.hitboxes.forEach((mesh) => {
      mesh.userData.bot = this;
    });

    // Walk animation cycle
    this.walkCycle = Math.random() * Math.PI * 2;
  }

  takeDamage(amount, isHeadshot) {
    if (this.isDead) return;

    this.health -= amount;
    this.avatar.updateHealthBar(Math.max(0, this.health / this.maxHealth), this.avatar.palette.name);

    // Flash hitboxes white/red
    this.hitboxes.forEach((mesh) => {
      if (mesh.material && mesh.material.color) {
        const origColor = mesh.material.color.getHex();
        mesh.material.color.setHex(isHeadshot ? 0xfacc15 : 0xffffff);
        setTimeout(() => {
          if (mesh.material && mesh.material.color) {
            mesh.material.color.setHex(origColor);
          }
        }, 80);
      }
    });

    if (this.health <= 0) {
      this.die();
      return true; // was eliminated
    }
    return false;
  }

  die() {
    this.isDead = true;
    this.respawnTimer = 3.2;
    this.avatar.group.visible = false;
    rivalsAudio.playElimination();

    // Spawn death particles (block fragments)
    this.spawnDeathFragments();
  }

  spawnDeathFragments() {
    const fragmentGroup = new THREE.Group();
    const fragMat = new THREE.MeshLambertMaterial({ color: this.avatar.palette.body });

    for (let i = 0; i < 8; i++) {
      const geo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
      const mesh = new THREE.Mesh(geo, fragMat);
      mesh.position.copy(this.position);
      mesh.position.y += 1.0;

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 4,
        (Math.random() - 0.5) * 8
      );
      mesh.userData = { vel, life: 1.5 };
      fragmentGroup.add(mesh);
    }

    this.scene.add(fragmentGroup);

    const startTime = performance.now();
    const animateFragments = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > 1.5) {
        this.scene.remove(fragmentGroup);
        return;
      }

      fragmentGroup.children.forEach((child) => {
        child.userData.vel.y -= 9.8 * 0.016; // gravity
        child.position.addScaledVector(child.userData.vel, 0.016);
        child.rotation.x += 0.1;
        child.rotation.y += 0.1;
      });

      requestAnimationFrame(animateFragments);
    };
    animateFragments();
  }

  respawn(spawnPos) {
    this.health = this.maxHealth;
    this.isDead = false;
    this.position.copy(spawnPos);
    this.velocity.set(0, 0, 0);
    this.avatar.group.position.copy(this.position);
    this.avatar.group.visible = true;
    this.avatar.updateHealthBar(1.0, this.avatar.palette.name);
  }

  update(delta, playerPos, onBotShoot) {
    if (this.isDead) {
      this.respawnTimer -= delta;
      return;
    }

    // Distance & direction to player
    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
    const distToPlayer = toPlayer.length();

    // Rotate to face player (yaw only)
    const angleToPlayer = Math.atan2(toPlayer.x, toPlayer.z);
    this.avatar.group.rotation.y = angleToPlayer;

    // AI Decision: Strafe & approach/maintain distance
    this.strafeTimer -= delta;
    if (this.strafeTimer <= 0) {
      this.strafeDir *= -1;
      this.strafeTimer = 1.0 + Math.random() * 1.5;
    }

    // Movement vector
    const moveVec = new THREE.Vector3();
    const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), angleToPlayer);

    // Strafe side-to-side
    moveVec.addScaledVector(rightVec, this.strafeDir * this.speed * 0.8);

    // Keep moderate combat distance (between 8 and 20 units)
    if (distToPlayer > 18) {
      const forwardVec = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angleToPlayer);
      moveVec.addScaledVector(forwardVec, this.speed * 0.7);
    } else if (distToPlayer < 7) {
      const forwardVec = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angleToPlayer);
      moveVec.addScaledVector(forwardVec, -this.speed * 0.6);
    }

    // Gravity
    this.velocity.y -= 25.0 * delta;
    this.position.y += this.velocity.y * delta;

    // Ground level
    if (this.position.y < 0) {
      this.position.y = 0;
      this.velocity.y = 0;
    }

    // Move horizontal with collision boundary check
    const nextX = this.position.x + moveVec.x * delta;
    const nextZ = this.position.z + moveVec.z * delta;

    if (Math.abs(nextX) < 25 && Math.abs(nextZ) < 25) {
      this.position.x = nextX;
      this.position.z = nextZ;
    }

    // Jump pad interaction
    this.jumpPads.forEach((pad) => {
      const d = Math.hypot(this.position.x - pad.x, this.position.z - pad.z);
      if (d < pad.radius && this.position.y <= 0.5) {
        this.velocity.y = 16.0; // Launch bot up!
        rivalsAudio.playJumpPad();
      }
    });

    this.avatar.group.position.copy(this.position);

    // Walk animation (limbs swinging)
    this.walkCycle += delta * 12;
    const swing = Math.sin(this.walkCycle) * 0.5;
    this.avatar.leftLeg.rotation.x = swing;
    this.avatar.rightLeg.rotation.x = -swing;
    this.avatar.leftArm.rotation.x = -swing;

    // Shooting at Player
    if (distToPlayer < 35) {
      this.shootTimer -= delta;
      if (this.shootTimer <= 0) {
        this.shootTimer = 0.9 + Math.random() * 0.8;
        this.fireAtPlayer(playerPos, onBotShoot);
      }
    }
  }

  fireAtPlayer(playerPos, onBotShoot) {
    // Add slight inaccuracy spread
    const spread = 0.8;
    const target = playerPos.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread * 0.5,
      (Math.random() - 0.5) * spread
    ));

    const muzzlePos = this.position.clone();
    muzzlePos.y += 1.3;
    muzzlePos.add(new THREE.Vector3(0.5, 0, -0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.avatar.group.rotation.y));

    rivalsAudio.playBotShot();

    if (onBotShoot) {
      onBotShoot(muzzlePos, target, this);
    }
  }
}
