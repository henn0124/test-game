import * as THREE from 'three';
import { FroggerGame } from './game.js';

// DOM elements
const canvas = document.getElementById('webgl-canvas');
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score-display');
const levelDisplay = document.getElementById('level-display');
const livesContainer = document.getElementById('lives-container');
const timeBarFill = document.getElementById('time-bar-fill');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const finalStats = document.getElementById('final-stats');
const finalScore = document.getElementById('final-score');
const newHighBadge = document.getElementById('new-high-badge');
const startBtn = document.getElementById('start-btn');

// Touch controls
const btnUp = document.getElementById('dpad-up');
const btnDown = document.getElementById('dpad-down');
const btnLeft = document.getElementById('dpad-left');
const btnRight = document.getElementById('dpad-right');
const btnCam = document.getElementById('cam-toggle-btn');

// Setup Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);
scene.fog = new THREE.FogExp2(0x0f172a, 0.025);

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 10, 8);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
dirLight.position.set(12, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -16;
dirLight.shadow.camera.right = 16;
dirLight.shadow.camera.top = 16;
dirLight.shadow.camera.bottom = -16;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x166534, 0.4);
scene.add(hemiLight);

// Game Instance
const game = new FroggerGame(scene, camera);

// UI Update Helper
function updateUI() {
  scoreDisplay.textContent = game.score.toString().padStart(5, '0');
  highScoreDisplay.textContent = game.highScore.toString().padStart(5, '0');
  levelDisplay.textContent = game.level.toString();

  // Lives
  livesContainer.innerHTML = '';
  for (let i = 0; i < game.lives; i++) {
    const span = document.createElement('span');
    span.className = 'life-icon';
    span.textContent = '🐢';
    livesContainer.appendChild(span);
  }

  // Time bar
  const timePercent = Math.max(0, (game.timeRemaining / game.maxTime) * 100);
  timeBarFill.style.width = `${timePercent}%`;

  // Overlay state
  if (game.state === 'GAME_OVER') {
    overlay.classList.add('active');
    overlayTitle.textContent = 'GAME OVER';
    overlaySubtitle.textContent = 'Better luck next hop!';
    finalStats.classList.remove('hidden');
    finalScore.textContent = game.score.toString();

    if (game.score === game.highScore && game.score > 0) {
      newHighBadge.classList.remove('hidden');
    } else {
      newHighBadge.classList.add('hidden');
    }
    startBtn.textContent = 'PLAY AGAIN';
  } else if (game.state === 'PLAYING' || game.state === 'DYING') {
    overlay.classList.remove('active');
  }
}

// Start Game
function startGame() {
  overlay.classList.remove('active');
  game.start();
  updateUI();
}

startBtn.addEventListener('click', startGame);

// Keyboard controls
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;

  if (game.state === 'MENU' || game.state === 'GAME_OVER') {
    if (e.code === 'Space' || e.code === 'Enter') {
      startGame();
      return;
    }
  }

  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
      game.handleInput('UP');
      break;
    case 'ArrowDown':
    case 'KeyS':
      game.handleInput('DOWN');
      break;
    case 'ArrowLeft':
    case 'KeyA':
      game.handleInput('LEFT');
      break;
    case 'ArrowRight':
    case 'KeyD':
      game.handleInput('RIGHT');
      break;
    case 'Space':
      game.toggleCamera();
      break;
  }
});

// Mobile / Touch controls
btnUp?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  game.handleInput('UP');
});
btnDown?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  game.handleInput('DOWN');
});
btnLeft?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  game.handleInput('LEFT');
});
btnRight?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  game.handleInput('RIGHT');
});
btnCam?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  game.toggleCamera();
});

// Swipe detection for mobile touch screen
let touchStartX = 0;
let touchStartY = 0;
window.addEventListener(
  'touchstart',
  (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  },
  { passive: true }
);

window.addEventListener(
  'touchend',
  (e) => {
    if (game.state !== 'PLAYING') return;
    const diffX = e.changedTouches[0].screenX - touchStartX;
    const diffY = e.changedTouches[0].screenY - touchStartY;
    const threshold = 35;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > threshold) game.handleInput('RIGHT');
      else if (diffX < -threshold) game.handleInput('LEFT');
    } else {
      if (diffY < -threshold) game.handleInput('UP');
      else if (diffY > threshold) game.handleInput('DOWN');
    }
  },
  { passive: true }
);

// Window resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Animation Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1); // clamp delta to avoid hitching
  game.update(delta);
  updateUI();

  renderer.render(scene, camera);
}

animate();
updateUI();
