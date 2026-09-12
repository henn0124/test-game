import * as THREE from 'three';
import { sound } from './audio.js';
import {
  createPlayerTurtle,
  createSedan,
  createTruck,
  createRaceCar,
  createLog,
  createTurtleGroup,
  createLilyPad,
  createTree
} from './models.js';

export const STEP_Z = 1.4;
export const STEP_X = 1.2;
export const NUM_ROWS = 13;
export const HALF_WIDTH = 8.5;

// Row indices
export const ROW_START = 0;
export const ROW_ROAD_START = 1;
export const ROW_ROAD_END = 5;
export const ROW_MEDIAN = 6;
export const ROW_RIVER_START = 7;
export const ROW_RIVER_END = 11;
export const ROW_GOAL = 12;

export class FroggerGame {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // Game states
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('frogger_high_score') || '0', 10);
    this.level = 1;
    this.lives = 3;
    this.timeRemaining = 30; // seconds per frog
    this.maxTime = 30;
    this.state = 'MENU'; // 'MENU', 'PLAYING', 'DYING', 'LEVEL_UP', 'GAME_OVER'

    // Frog position & movement
    this.frogGrid = { x: 0, row: 0 };
    this.frogMesh = null;
    this.highestRowThisLife = 0;

    // Hop animation
    this.isHopping = false;
    this.hopProgress = 0;
    this.hopDuration = 0.15; // seconds
    this.hopStart = new THREE.Vector3();
    this.hopTarget = new THREE.Vector3();
    this.targetRotationY = 0;

    // Camera mode: 0 = follow/tilted, 1 = overhead bird's-eye
    this.cameraMode = 0;

    // Lanes & entities
    this.lanes = [];
    this.goals = [
      { x: -4.8, filled: false, pad: null, marker: null },
      { x: -2.4, filled: false, pad: null, marker: null },
      { x: 0.0, filled: false, pad: null, marker: null },
      { x: 2.4, filled: false, pad: null, marker: null },
      { x: 4.8, filled: false, pad: null, marker: null }
    ];

    // Environment & Decor
    this.environmentGroup = new THREE.Group();
    this.entityGroup = new THREE.Group();
    this.scene.add(this.environmentGroup);
    this.scene.add(this.entityGroup);

    // Death / respawn animation
    this.deathTimer = 0;

    this.initBoard();
  }

  initBoard() {
    this.buildTerrain();
    this.initLanes();
    this.initFrog();
    this.initGoals();
  }

  buildTerrain() {
    const groundWidth = HALF_WIDTH * 2 + 6;

    // 1. Starting Grass (Row 0)
    const startGrassGeo = new THREE.BoxGeometry(groundWidth, 0.4, STEP_Z * 1.5);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    const startGrass = new THREE.Mesh(startGrassGeo, grassMat);
    startGrass.position.set(0, -0.2, 0.2);
    startGrass.receiveShadow = true;
    this.environmentGroup.add(startGrass);

    // 2. Road (Rows 1 - 5)
    const roadLength = STEP_Z * 5;
    const roadGeo = new THREE.BoxGeometry(groundWidth, 0.38, roadLength);
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, -0.21, -STEP_Z * 3);
    road.receiveShadow = true;
    this.environmentGroup.add(road);

    // Road lane markings (dashed lines)
    for (let r = 1; r < 5; r++) {
      const zPos = -STEP_Z * (r + 0.5);
      for (let x = -groundWidth / 2 + 1; x < groundWidth / 2; x += 2.0) {
        const lineGeo = new THREE.BoxGeometry(1.0, 0.02, 0.1);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.set(x, -0.01, zPos);
        this.environmentGroup.add(line);
      }
    }

    // 3. Middle Median Grass (Row 6)
    const medianGrass = new THREE.Mesh(new THREE.BoxGeometry(groundWidth, 0.4, STEP_Z), grassMat);
    medianGrass.position.set(0, -0.2, -STEP_Z * 6);
    medianGrass.receiveShadow = true;
    this.environmentGroup.add(medianGrass);

    // 4. River (Rows 7 - 11)
    const riverLength = STEP_Z * 5;
    const riverGeo = new THREE.BoxGeometry(groundWidth, 0.35, riverLength);
    const riverMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    });
    this.riverMesh = new THREE.Mesh(riverGeo, riverMat);
    this.riverMesh.position.set(0, -0.23, -STEP_Z * 9);
    this.riverMesh.receiveShadow = true;
    this.environmentGroup.add(this.riverMesh);

    // River bed underneath
    const riverBed = new THREE.Mesh(
      new THREE.BoxGeometry(groundWidth, 0.1, riverLength),
      new THREE.MeshLambertMaterial({ color: 0x0f172a })
    );
    riverBed.position.set(0, -0.4, -STEP_Z * 9);
    this.environmentGroup.add(riverBed);

    // 5. Goal Bank (Row 12)
    const goalBank = new THREE.Mesh(new THREE.BoxGeometry(groundWidth, 0.4, STEP_Z * 1.5), grassMat);
    goalBank.position.set(0, -0.2, -STEP_Z * 12);
    goalBank.receiveShadow = true;
    this.environmentGroup.add(goalBank);

    // Decorative Trees on safe zones
    [-7.5, -6.0, 6.0, 7.5].forEach((x) => {
      const tree1 = createTree();
      tree1.position.set(x, 0, 0.3);
      const tree2 = createTree();
      tree2.position.set(x, 0, -STEP_Z * 6);
      this.environmentGroup.add(tree1, tree2);
    });
  }

  initLanes() {
    this.lanes = [
      // ROAD LANES (Rows 1-5)
      {
        row: 1,
        type: 'road',
        speed: 2.2, // speed > 0 moves right (+X)
        entities: [],
        generator: () => createSedan(0xef4444),
        count: 3,
        spacing: 5.5,
        hitbox: { width: 1.6, depth: 1.0 }
      },
      {
        row: 2,
        type: 'road',
        speed: -2.8, // moves left (-X)
        entities: [],
        generator: () => createRaceCar(0xeab308),
        count: 3,
        spacing: 6.0,
        hitbox: { width: 1.6, depth: 1.0 }
      },
      {
        row: 3,
        type: 'road',
        speed: 1.8,
        entities: [],
        generator: () => createTruck(0x3b82f6),
        count: 2,
        spacing: 8.5,
        hitbox: { width: 3.2, depth: 1.1 }
      },
      {
        row: 4,
        type: 'road',
        speed: -3.4,
        entities: [],
        generator: () => createSedan(0xa855f7),
        count: 3,
        spacing: 5.2,
        hitbox: { width: 1.6, depth: 1.0 }
      },
      {
        row: 5,
        type: 'road',
        speed: 2.0,
        entities: [],
        generator: () => createTruck(0x10b981),
        count: 2,
        spacing: 9.0,
        hitbox: { width: 3.2, depth: 1.1 }
      },

      // RIVER LANES (Rows 7-11)
      {
        row: 7,
        type: 'river',
        speed: 1.8,
        entities: [],
        generator: () => createTurtleGroup(3),
        count: 3,
        spacing: 6.0,
        platformLength: 3.2
      },
      {
        row: 8,
        type: 'river',
        speed: -1.6,
        entities: [],
        generator: () => createLog(3.0),
        count: 3,
        spacing: 6.5,
        platformLength: 3.0
      },
      {
        row: 9,
        type: 'river',
        speed: 2.4,
        entities: [],
        generator: () => createLog(4.5),
        count: 2,
        spacing: 9.0,
        platformLength: 4.5
      },
      {
        row: 10,
        type: 'river',
        speed: -2.0,
        entities: [],
        generator: () => createTurtleGroup(2),
        count: 4,
        spacing: 5.0,
        platformLength: 2.2
      },
      {
        row: 11,
        type: 'river',
        speed: 1.7,
        entities: [],
        generator: () => createLog(3.2),
        count: 3,
        spacing: 6.2,
        platformLength: 3.2
      }
    ];

    // Instantiate lane meshes
    this.lanes.forEach((lane) => {
      const zPos = -STEP_Z * lane.row;
      const totalWidth = lane.count * lane.spacing;
      const startX = -totalWidth / 2;

      for (let i = 0; i < lane.count; i++) {
        const mesh = lane.generator();
        mesh.position.set(startX + i * lane.spacing, 0, zPos);

        // Face movement direction
        if (lane.type === 'road') {
          mesh.rotation.y = lane.speed > 0 ? -Math.PI / 2 : Math.PI / 2;
        } else {
          // Logs & floating platforms: align length along X axis
          if (mesh.userData.noGroupRotate) {
            mesh.rotation.y = 0;
          } else {
            mesh.rotation.y = lane.speed > 0 ? 0 : Math.PI;
            mesh.rotation.y += Math.PI / 2;
          }
        }

        this.entityGroup.add(mesh);
        lane.entities.push(mesh);
      }
    });
  }

  initFrog() {
    if (this.frogMesh) {
      this.scene.remove(this.frogMesh);
    }
    this.frogMesh = createPlayerTurtle();
    this.scene.add(this.frogMesh);
    this.resetFrogPosition();
  }

  resetFrogPosition() {
    this.frogGrid = { x: 0, row: 0 };
    this.highestRowThisLife = 0;
    this.isHopping = false;
    this.timeRemaining = this.maxTime;

    const startPos = new THREE.Vector3(0, 0, 0);
    this.frogMesh.position.copy(startPos);
    this.frogMesh.rotation.set(0, 0, 0);
    this.frogMesh.scale.set(1, 1, 1);
    this.frogMesh.visible = true;
  }

  initGoals() {
    this.goals.forEach((goal) => {
      const pad = createLilyPad();
      pad.position.set(goal.x, 0, -STEP_Z * ROW_GOAL);
      this.environmentGroup.add(pad);
      goal.pad = pad;

      // Miniature goal turtle (visible when occupied)
      const miniTurtle = createPlayerTurtle();
      miniTurtle.scale.set(0.65, 0.65, 0.65);
      miniTurtle.position.set(goal.x, 0, -STEP_Z * ROW_GOAL);
      miniTurtle.visible = false;
      this.environmentGroup.add(miniTurtle);
      goal.marker = miniTurtle;
    });
  }

  start() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.resetGoals();
    this.resetFrogPosition();
    this.state = 'PLAYING';
    sound.init();
    sound.playHop();
  }

  resetGoals() {
    this.goals.forEach((goal) => {
      goal.filled = false;
      if (goal.marker) goal.marker.visible = false;
    });
  }

  handleInput(action) {
    if (this.state !== 'PLAYING') return;
    if (this.isHopping) return;

    let targetGridX = this.frogGrid.x;
    let targetRow = this.frogGrid.row;
    let rotY = 0;

    switch (action) {
      case 'UP':
        targetRow += 1;
        rotY = 0;
        break;
      case 'DOWN':
        targetRow -= 1;
        rotY = Math.PI;
        break;
      case 'LEFT':
        targetGridX -= 1;
        rotY = Math.PI / 2;
        break;
      case 'RIGHT':
        targetGridX += 1;
        rotY = -Math.PI / 2;
        break;
      default:
        return;
    }

    // Boundary constraints
    if (targetRow < 0) return;
    if (targetRow > ROW_GOAL) return;

    // Check goal row boundaries & specific bays
    if (targetRow === ROW_GOAL) {
      const targetWorldX = targetGridX * STEP_X;
      // Find matching bay within tolerance
      const goalMatch = this.goals.find((g) => Math.abs(g.x - targetWorldX) < 0.85);
      if (!goalMatch) {
        // Can't jump into the goal wall bank
        return;
      }
      if (goalMatch.filled) {
        // Already filled bay
        return;
      }
    }

    // Check left/right world bounds
    const worldX = targetGridX * STEP_X;
    if (worldX < -HALF_WIDTH || worldX > HALF_WIDTH) return;

    // Begin hop
    this.isHopping = true;
    this.hopProgress = 0;
    this.hopStart.copy(this.frogMesh.position);
    this.hopTarget.set(targetGridX * STEP_X, 0, -STEP_Z * targetRow);
    this.targetRotationY = rotY;
    this.frogGrid = { x: targetGridX, row: targetRow };

    // Score for forward progression
    if (targetRow > this.highestRowThisLife) {
      this.highestRowThisLife = targetRow;
      this.addScore(10);
    }

    sound.playHop();
  }

  toggleCamera() {
    this.cameraMode = (this.cameraMode + 1) % 2;
  }

  update(delta) {
    // Animate water ripple
    if (this.riverMesh) {
      this.riverMesh.material.opacity = 0.82 + Math.sin(Date.now() * 0.003) * 0.06;
    }

    // Update Lanes
    this.updateLanes(delta);

    if (this.state === 'PLAYING') {
      // Countdown timer
      this.timeRemaining -= delta;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.triggerDeath('TIMEOUT');
        return;
      }

      // Update Frog Hopping
      if (this.isHopping) {
        this.hopProgress += delta / this.hopDuration;
        if (this.hopProgress >= 1) {
          this.hopProgress = 1;
          this.isHopping = false;
          this.frogMesh.position.copy(this.hopTarget);
          this.frogMesh.rotation.y = this.targetRotationY;
          this.onHopLanded();
        } else {
          // Quadratic hop arc
          this.frogMesh.position.x = THREE.MathUtils.lerp(this.hopStart.x, this.hopTarget.x, this.hopProgress);
          this.frogMesh.position.z = THREE.MathUtils.lerp(this.hopStart.z, this.hopTarget.z, this.hopProgress);
          this.frogMesh.position.y = Math.sin(this.hopProgress * Math.PI) * 0.75;
          this.frogMesh.rotation.y = this.targetRotationY;

          // Squash & stretch
          const hopPeak = Math.sin(this.hopProgress * Math.PI);
          this.frogMesh.scale.set(1.0 - hopPeak * 0.15, 1.0 + hopPeak * 0.35, 1.0 - hopPeak * 0.15);
        }
      } else {
        // Frog is resting on the ground or a river platform
        this.frogMesh.scale.set(1, 1, 1);
        this.handleRestingPhysics(delta);
      }
    } else if (this.state === 'DYING') {
      this.deathTimer -= delta;
      if (this.deathTimer <= 0) {
        this.afterDeathAnimation();
      }
    }

    // Camera follow logic
    this.updateCamera(delta);
  }

  updateLanes(delta) {
    const speedMult = 1.0 + (this.level - 1) * 0.15;
    const boundsX = HALF_WIDTH + 4.0;

    this.lanes.forEach((lane) => {
      const moveDist = lane.speed * speedMult * delta;
      lane.entities.forEach((entity) => {
        entity.position.x += moveDist;

        // Wrap around horizontally
        if (lane.speed > 0 && entity.position.x > boundsX) {
          entity.position.x = -boundsX;
        } else if (lane.speed < 0 && entity.position.x < -boundsX) {
          entity.position.x = boundsX;
        }
      });
    });
  }

  onHopLanded() {
    const row = this.frogGrid.row;

    // Check Goal Row
    if (row === ROW_GOAL) {
      const goalMatch = this.goals.find((g) => Math.abs(g.x - this.frogMesh.position.x) < 0.85);
      if (goalMatch && !goalMatch.filled) {
        goalMatch.filled = true;
        goalMatch.marker.visible = true;

        // Points: 500 for bay + time bonus
        const timeBonus = Math.floor(this.timeRemaining) * 15;
        this.addScore(500 + timeBonus);
        sound.playGoal();

        // Check if all goals filled
        const allFilled = this.goals.every((g) => g.filled);
        if (allFilled) {
          this.onLevelCleared();
        } else {
          // Reset frog for next run
          this.resetFrogPosition();
        }
        return;
      } else {
        this.triggerDeath('WATER');
        return;
      }
    }

    // Check Road Collisions
    if (row >= ROW_ROAD_START && row <= ROW_ROAD_END) {
      if (this.checkRoadCollision()) {
        this.triggerDeath('ROAD');
        return;
      }
    }

    // Check River Collisions
    if (row >= ROW_RIVER_START && row <= ROW_RIVER_END) {
      const platform = this.getCurrentRiverPlatform();
      if (!platform) {
        // Splashed into the water!
        this.triggerDeath('WATER');
        return;
      }
    }
  }

  handleRestingPhysics(delta) {
    const row = this.frogGrid.row;

    // Check road collisions continuously even while resting
    if (row >= ROW_ROAD_START && row <= ROW_ROAD_END) {
      if (this.checkRoadCollision()) {
        this.triggerDeath('ROAD');
        return;
      }
    }

    // On river: drift with platform
    if (row >= ROW_RIVER_START && row <= ROW_RIVER_END) {
      const lane = this.lanes.find((l) => l.row === row);
      const platform = this.getCurrentRiverPlatform();

      if (!platform) {
        this.triggerDeath('WATER');
        return;
      }

      const speedMult = 1.0 + (this.level - 1) * 0.15;
      const drift = lane.speed * speedMult * delta;
      this.frogMesh.position.x += drift;

      // Update frog grid X to match closest discrete grid
      this.frogGrid.x = Math.round(this.frogMesh.position.x / STEP_X);

      // Check off-screen boundary drift death
      if (this.frogMesh.position.x < -HALF_WIDTH - 0.5 || this.frogMesh.position.x > HALF_WIDTH + 0.5) {
        this.triggerDeath('WATER');
      }
    }
  }

  checkRoadCollision() {
    const row = this.frogGrid.row;
    const lane = this.lanes.find((l) => l.row === row && l.type === 'road');
    if (!lane) return false;

    const frogX = this.frogMesh.position.x;
    for (const vehicle of lane.entities) {
      const dx = Math.abs(vehicle.position.x - frogX);
      if (dx < lane.hitbox.width / 2 + 0.3) {
        return true;
      }
    }
    return false;
  }

  getCurrentRiverPlatform() {
    const row = this.frogGrid.row;
    const lane = this.lanes.find((l) => l.row === row && l.type === 'river');
    if (!lane) return null;

    const frogX = this.frogMesh.position.x;
    for (const platform of lane.entities) {
      const dx = Math.abs(platform.position.x - frogX);
      if (dx < lane.platformLength / 2 + 0.25) {
        return platform;
      }
    }
    return null;
  }

  triggerDeath(reason) {
    if (this.state !== 'PLAYING') return;
    this.state = 'DYING';
    this.deathTimer = 0.9;

    if (reason === 'WATER') {
      sound.playSplash();
      // Shrink & submerge
      this.frogMesh.position.y = -0.15;
      this.frogMesh.scale.set(0.4, 0.4, 0.4);
    } else {
      // Road squash / timeout
      sound.playSquash();
      this.frogMesh.scale.set(1.5, 0.1, 1.5);
      this.frogMesh.position.y = 0.05;
    }
  }

  afterDeathAnimation() {
    this.lives -= 1;
    if (this.lives <= 0) {
      this.state = 'GAME_OVER';
      sound.playGameOver();
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('frogger_high_score', this.highScore.toString());
      }
    } else {
      this.state = 'PLAYING';
      this.resetFrogPosition();
    }
  }

  onLevelCleared() {
    this.state = 'LEVEL_UP';
    sound.playLevelUp();
    this.addScore(1000);
    this.level += 1;

    setTimeout(() => {
      this.resetGoals();
      this.resetFrogPosition();
      this.state = 'PLAYING';
    }, 1500);
  }

  addScore(points) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('frogger_high_score', this.highScore.toString());
    }
  }

  updateCamera(delta) {
    const targetZ = this.frogMesh ? this.frogMesh.position.z : 0;
    const targetX = this.frogMesh ? this.frogMesh.position.x * 0.4 : 0;

    if (this.cameraMode === 0) {
      // Third-person arcade perspective
      const desiredCamPos = new THREE.Vector3(
        targetX,
        9.5,
        targetZ + 7.5
      );
      this.camera.position.lerp(desiredCamPos, delta * 6.0);
      this.camera.lookAt(targetX, 0.5, targetZ - 1.5);
    } else {
      // Bird's-eye / overhead view
      const overheadPos = new THREE.Vector3(0, 16.5, -STEP_Z * 6 + 1.5);
      this.camera.position.lerp(overheadPos, delta * 6.0);
      this.camera.lookAt(0, 0, -STEP_Z * 6);
    }
  }
}
