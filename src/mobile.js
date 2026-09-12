import * as THREE from 'three';
import { FroggerGame } from './game.js';

// DOM Elements
const canvas = document.getElementById('webgl-canvas');
const scoreDisplay = document.getElementById('score-display');
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

// Gamepad buttons
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnCam = document.getElementById('btn-cam');

// Three.js Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1d);
scene.fog = new THREE.FogExp2(0x0a0f1d, 0.022);

// Camera tailored for portrait iPhone screens
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfffaed, 1.25);
dirLight.position.set(10, 22, 12);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -14;
dirLight.shadow.camera.right = 14;
dirLight.shadow.camera.top = 16;
dirLight.shadow.camera.bottom = -16;
scene.add(dirLight);

const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x166534, 0.45);
scene.add(hemiLight);

// Game Instance
const game = new FroggerGame(scene, camera);

// Dynamic camera aspect ratio & FOV tuning for portrait
function adjustCameraForOrientation() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;

  camera.aspect = aspect;
  if (aspect < 1.0) {
    // Tall portrait mode (iPhone): widen FOV so side banks remain in view
    camera.fov = 56 + (1.0 - aspect) * 22;
  } else {
    // Landscape
    camera.fov = 45;
  }
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

window.addEventListener('resize', adjustCameraForOrientation);
adjustCameraForOrientation();

// Haptic feedback helper
function vibrate(ms) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch {
      // Ignored
    }
  }
}

// UI Update Loop
function updateUI() {
  scoreDisplay.textContent = game.score.toString().padStart(5, '0');
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

function startGame() {
  overlay.classList.remove('active');
  game.start();
  vibrate(30);
  updateUI();
}

startBtn.addEventListener('click', startGame);

// Ergonomic Touch Actions
function triggerMove(dir) {
  if (game.state === 'MENU' || game.state === 'GAME_OVER') {
    startGame();
    return;
  }
  game.handleInput(dir);
  vibrate(18);
}

btnUp?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  triggerMove('UP');
});
btnDown?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  triggerMove('DOWN');
});
btnLeft?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  triggerMove('LEFT');
});
btnRight?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  triggerMove('RIGHT');
});
btnCam?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  game.toggleCamera();
  vibrate(25);
});

// Full-Screen Swipe Gestures
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

window.addEventListener(
  'touchstart',
  (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
    touchStartTime = Date.now();
  },
  { passive: true }
);

window.addEventListener(
  'touchend',
  (e) => {
    // Ignore swipe if tapping buttons
    if (e.target.closest('#mobile-gamepad') || e.target.closest('#overlay')) return;

    const diffX = e.changedTouches[0].clientX - touchStartX;
    const diffY = e.changedTouches[0].clientY - touchStartY;
    const elapsedTime = Date.now() - touchStartTime;

    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);
    const minThreshold = 28;

    if (elapsedTime < 450 && (absX > minThreshold || absY > minThreshold)) {
      if (absX > absY) {
        triggerMove(diffX > 0 ? 'RIGHT' : 'LEFT');
      } else {
        triggerMove(diffY < 0 ? 'UP' : 'DOWN');
      }
    }
  },
  { passive: true }
);

// Animation Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  game.update(delta);
  updateUI();

  renderer.render(scene, camera);
}

animate();
updateUI();
