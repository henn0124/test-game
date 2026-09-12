import * as THREE from 'three';
import { createRivalAvatar } from './avatars.js';
import { rivalsAudio } from './audio.js';

export class RivalBot {
  constructor(id, spawnPos, scene, colliders, jumpPads, pickups, paletteIndex = 0) {
    this.id = id;
    this.scene = scene;
    this.colliders = colliders;
    this.jumpPads = jumpPads;
    this.pickups = pickups;

    this.maxHealth = 100;
    this.health = 100;
    this.shield = 50;
    this.maxShield = 50;
    this.isDead = false;
    this.respawnTimer = 0;

    // Movement & Archetype
    const roles = ['rusher', 'sniper', 'peeker', 'jumper', 'flanker'];
    this.role = roles[paletteIndex % roles.length];
    this.weaponType = this.role === 'rusher' ? 'shotgun' : this.role === 'flanker' ? 'blade' : 'rifle';

    this.position = spawnPos.clone();
    this.velocity = new THREE.Vector3();
    this.speed = this.role === 'rusher' || this.role === 'flanker' ? 7.2 : 5.0;

    // AI State Timers
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
    this.strafeTimer = 1.0;
    this.jumpTimer = 1.5 + Math.random() * 2.0;
    this.shootTimer = 0.8;
    this.peekState = 'peeking'; // 'peeking' or 'hiding'
    this.peekTimer = 1.0;

    // Avatar
    this.avatar = createRivalAvatar(paletteIndex, this.weaponType);
    this.avatar.group.position.copy(this.position);
    this.scene.add(this.avatar.group);

    // Hitboxes
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

    this.walkCycle = Math.random() * Math.PI * 2;
  }

  takeDamage(amount, isHeadshot) {
    if (this.isDead) return;

    if (this.shield > 0) {
      const sDmg = Math.min(this.shield, amount);
      this.shield -= sDmg;
      amount -= sDmg;
    }
    this.health -= amount;

    const totalPct = Math.max(0, (this.health + this.shield) / (this.maxHealth + this.maxShield));
    this.avatar.updateHealthBar(totalPct, `${this.avatar.palette.name} [${this.role.toUpperCase()}]`);

    // Flash hitboxes
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

    // Peeker archetype retreats when low on health
    if (this.health < 45 && this.role === 'peeker') {
      this.peekState = 'hiding';
      this.peekTimer = 3.0;
    }

    if (this.health <= 0) {
      this.die();
      return true; // eliminated
    }
    return false;
  }

  die() {
    this.isDead = true;
    this.respawnTimer = 3.2;
    this.avatar.group.visible = false;
    rivalsAudio.playElimination();

    this.spawnDeathFragments();
  }

  spawnDeathFragments() {
    const fragmentGroup = new THREE.Group();
    const fragMat = new THREE.MeshLambertMaterial({ color: this.avatar.palette.body });

    for (let i = 0; i < 10; i++) {
      const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const mesh = new THREE.Mesh(geo, fragMat);
      mesh.position.copy(this.position);
      mesh.position.y += 1.2;

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        Math.random() * 8 + 4,
        (Math.random() - 0.5) * 12
      );
      mesh.userData = { vel };
      fragmentGroup.add(mesh);
    }

    this.scene.add(fragmentGroup);

    const startTime = performance.now();
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > 1.6) {
        this.scene.remove(fragmentGroup);
        return;
      }
      fragmentGroup.children.forEach((c) => {
        c.userData.vel.y -= 18.0 * 0.016;
        c.position.addScaledVector(c.userData.vel, 0.016);
        c.rotation.x += 0.12;
        c.rotation.y += 0.12;
      });
      requestAnimationFrame(animate);
    };
    animate();
  }

  respawn(spawnPos) {
    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.isDead = false;
    this.position.copy(spawnPos);
    this.velocity.set(0, 0, 0);
    this.avatar.group.position.copy(this.position);
    this.avatar.group.visible = true;
    this.avatar.updateHealthBar(1.0, `${this.avatar.palette.name} [${this.role.toUpperCase()}]`);
  }

  update(delta, playerPos, onBotShoot) {
    if (this.isDead) {
      this.respawnTimer -= delta;
      return;
    }

    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
    const dist = toPlayer.length();
    const angleToPlayer = Math.atan2(toPlayer.x, toPlayer.z);
    this.avatar.group.rotation.y = angleToPlayer;

    const moveVec = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angleToPlayer);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), angleToPlayer);

    // AI ARCHETYPE BEHAVIORS
    if (this.role === 'rusher' || this.role === 'flanker') {
      // Sprints aggressively towards player, weaving rapidly
      this.strafeTimer -= delta;
      if (this.strafeTimer <= 0) {
        this.strafeDir *= -1;
        this.strafeTimer = 0.6 + Math.random() * 0.6;
      }
      moveVec.addScaledVector(forward, this.speed);
      moveVec.addScaledVector(right, this.strafeDir * this.speed * 0.7);

      // Slash or shotgun if close
      if (dist < 4.0 && this.weaponType === 'blade') {
        this.avatar.weaponHolder.rotation.x = Math.sin(Date.now() * 0.015) * 1.2;
      }
    } else if (this.role === 'sniper') {
      // Stays back on towers/perches, strafes slowly to line up shots
      this.strafeTimer -= delta;
      if (this.strafeTimer <= 0) {
        this.strafeDir *= -1;
        this.strafeTimer = 2.0;
      }
      moveVec.addScaledVector(right, this.strafeDir * this.speed * 0.4);
      if (dist < 20) {
        moveVec.addScaledVector(forward, -this.speed * 0.6); // back away
      }
    } else if (this.role === 'peeker') {
      // Jiggle peeking in and out of cover
      this.peekTimer -= delta;
      if (this.peekTimer <= 0) {
        this.peekState = this.peekState === 'peeking' ? 'hiding' : 'peeking';
        this.peekTimer = this.peekState === 'peeking' ? 1.2 : 1.6;
      }
      const dir = this.peekState === 'peeking' ? 1 : -1;
      moveVec.addScaledVector(right, dir * this.speed * 0.8);
    } else if (this.role === 'jumper') {
      // Bunny-hops and navigates toward jump pads
      this.strafeTimer -= delta;
      if (this.strafeTimer <= 0) {
        this.strafeDir *= -1;
        this.strafeTimer = 1.0;
      }
      moveVec.addScaledVector(forward, this.speed * 0.6);
      moveVec.addScaledVector(right, this.strafeDir * this.speed * 0.6);

      this.jumpTimer -= delta;
      if (this.jumpTimer <= 0 && this.position.y <= 0.2) {
        this.velocity.y = 8.5;
        this.jumpTimer = 1.8 + Math.random() * 1.5;
      }
    }

    // Jump pad interaction
    this.jumpPads.forEach((pad) => {
      const d = Math.hypot(this.position.x - pad.x, this.position.z - pad.z);
      if (d < pad.radius && this.position.y <= 1.2) {
        this.velocity.y = pad.launchPower || 18.0;
        rivalsAudio.playJumpPad();
      }
    });

    // Gravity & Vertical Physics
    this.velocity.y -= 22.0 * delta;
    this.position.y += this.velocity.y * delta;
    if (this.position.y < 0) {
      this.position.y = 0;
      this.velocity.y = 0;
    }

    // Horizontal Movement & Boundary Clamping
    const nextX = this.position.x + moveVec.x * delta;
    const nextZ = this.position.z + moveVec.z * delta;

    if (Math.abs(nextX) < 58 && Math.abs(nextZ) < 58) {
      this.position.x = nextX;
      this.position.z = nextZ;
    }

    this.avatar.group.position.copy(this.position);

    // Limb walk animation
    this.walkCycle += delta * (this.speed * 2.5);
    const swing = Math.sin(this.walkCycle) * 0.45;
    this.avatar.leftLeg.rotation.x = swing;
    this.avatar.rightLeg.rotation.x = -swing;
    this.avatar.leftArm.rotation.x = -swing;

    // Firing at Player
    const maxRange = this.role === 'sniper' ? 65 : this.weaponType === 'shotgun' ? 22 : 45;
    if (dist < maxRange) {
      this.shootTimer -= delta;
      if (this.shootTimer <= 0) {
        this.shootTimer = this.role === 'sniper' ? 1.6 : this.weaponType === 'shotgun' ? 1.2 : 0.65;
        this.fireAtPlayer(playerPos, onBotShoot);
      }
    }
  }

  fireAtPlayer(playerPos, onBotShoot) {
    const muzzlePos = this.position.clone();
    muzzlePos.y += 1.35;
    muzzlePos.add(new THREE.Vector3(0.5, 0, -0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.avatar.group.rotation.y));

    // Accuracy spread depending on role
    const spreadVal = this.role === 'sniper' ? 0.3 : this.weaponType === 'shotgun' ? 1.4 : 0.8;
    const target = playerPos.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * spreadVal,
      (Math.random() - 0.5) * spreadVal * 0.5,
      (Math.random() - 0.5) * spreadVal
    ));

    if (this.weaponType === 'shotgun') {
      rivalsAudio.playShotgun();
    } else if (this.weaponType === 'blade') {
      rivalsAudio.playMeleeSlash();
    } else {
      rivalsAudio.playRifle();
    }

    if (onBotShoot) {
      onBotShoot(muzzlePos, target, this, this.weaponType);
    }
  }
}
