/*
  Week 9 — Example 3: Adding Sound & Music

  Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
  Date: Mar. 19, 2026

  Controls:
    A or D (Left / Right Arrow)   Horizontal movement
    W (Up Arrow)                  Jump
    Space Bar                     Attack

  Tile key:
    g = groundTile.png       (surface ground)
    d = groundTileDeep.png   (deep ground, below surface)
      = empty (no sprite)
*/

let player;
let playerImg, bgImg;
let jumpSfx, musicSfx;
let musicStarted = false;

let playerAnis = {
  idle: { row: 0, frames: 4, frameDelay: 10 },
  run: { row: 1, frames: 4, frameDelay: 3 },
  jump: { row: 2, frames: 3, frameDelay: Infinity, frame: 0 },
  attack: { row: 3, frames: 6, frameDelay: 2 },
};

let ground, groundDeep;
let groundImg, groundDeepImg;

let attacking = false; // track if the player is attacking
let attackFrameCounter = 0; // tracking attack animation

// --- TILE MAP ---
// an array that uses the tile key to create the level
let level = [
  "              ",
  "              ",
  "              ",
  "              ",
  "              ",
  "       ggg    ",
  "gggggggggggggg", // surface ground
  "dddddddddddddd", // deep ground
];

// --- LEVEL CONSTANTS ---
// camera view size
const VIEWW = 320,
  VIEWH = 180;

// tile width & height
const TILE_W = 24,
  TILE_H = 24;

// size of individual animation frames
const FRAME_W = 32,
  FRAME_H = 32;

// Y-coordinate of player start (4 tiles above the bottom)
const MAP_START_Y = VIEWH - TILE_H * 4;

// gravity
const GRAVITY = 10;
// moon gravity (approx. 1.62 m/s^2 relative to Earth's ~9.81)
const MOON_GRAVITY = 1.62;

// debug & gravity toggle state
let debugMode = false;
let moonGravityEnabled = false;
// collision boxes debug
let showCollisionBoxes = false;

function preload() {
  // --- IMAGES ---
  playerImg = loadImage("assets/foxSpriteSheet.png");
  bgImg = loadImage("assets/combinedBackground.png");
  groundImg = loadImage("assets/groundTile.png");
  groundDeepImg = loadImage("assets/groundTileDeep.png");

  // --- SOUND ---
  if (typeof loadSound === "function") {
    jumpSfx = loadSound("assets/sfx/jump.wav");
    musicSfx = loadSound("assets/sfx/music.wav");
  }
}

function setup() {
  // pixelated rendering with autoscaling
  new Canvas(VIEWW, VIEWH, "pixelated");

  // needed to correct an visual artifacts from attempted antialiasing
  allSprites.pixelPerfect = true;

  world.gravity.y = GRAVITY;

  // Try to start background music immediately.
  if (musicSfx) musicSfx.setLoop(true);
  startMusicIfNeeded();

  // --- TILE GROUPS ---
  ground = new Group();
  ground.physics = "static";
  ground.img = groundImg;
  ground.tile = "g";

  groundDeep = new Group();
  groundDeep.physics = "static";
  groundDeep.img = groundDeepImg;
  groundDeep.tile = "d";

  // a Tiles object creates a level based on the level map array (defined at the beginning)
  new Tiles(level, 0, 0, TILE_W, TILE_H);

  // --- PLAYER ---
  player = new Sprite(FRAME_W, MAP_START_Y, FRAME_W, FRAME_H); // create the player
  player.spriteSheet = playerImg; // use the sprite sheet
  player.rotationLock = true; // turn off rotations (player shouldn't rotate)

  // player animation parameters
  player.anis.w = FRAME_W;
  player.anis.h = FRAME_H;
  player.anis.offset.y = -4; // offset the collision box up
  player.addAnis(playerAnis); // add the player animations defined earlier
  player.ani = "idle"; // default to the idle animation
  player.w = 18; // set the width of the collsion box
  player.h = 20; // set the height of the collsion box
  player.friction = 0; // set the friciton to 0 so we don't stick to walls
  player.bounciness = 0; // set the bounciness to 0 so the player doesn't bounce

  // --- GROUND SENSOR --- for use when detecting if the player is standing on the ground
  sensor = new Sprite();
  sensor.x = player.x;
  sensor.y = player.y + player.h / 2;
  sensor.w = player.w;
  sensor.h = 2;
  sensor.mass = 0.01;
  sensor.removeColliders();
  sensor.visible = false;
  let sensorJoint = new GlueJoint(player, sensor);
  sensorJoint.visible = false;
}

function startMusicIfNeeded() {
  if (musicStarted || !musicSfx) return;

  const startLoop = () => {
    if (!musicSfx.isPlaying()) musicSfx.play();
    musicStarted = musicSfx.isPlaying();
  };

  // Some browsers require a user gesture before audio can start.
  const maybePromise = userStartAudio();
  if (maybePromise && typeof maybePromise.then === "function") {
    maybePromise.then(startLoop).catch(() => {});
  } else {
    startLoop();
  }
}

function setMoonGravity(enabled) {
  moonGravityEnabled = !!enabled;
  world.gravity.y = moonGravityEnabled ? MOON_GRAVITY : GRAVITY;
}

function keyPressed() {
  startMusicIfNeeded();
  // toggle debug overlay
  if (key === "m" || key === "M") {
    debugMode = !debugMode;
  }
  // toggle moon gravity
  if (key === "g" || key === "G") {
    setMoonGravity(!moonGravityEnabled);
  }
  // toggle collision boxes
  if (key === "c" || key === "C") {
    showCollisionBoxes = !showCollisionBoxes;
  }
}

function mousePressed() {
  startMusicIfNeeded();
  // If debug overlay is visible, allow clicking the gravity toggle box
  if (debugMode) {
    // toggle button region at top-left: x:8-112, y:8-40
    if (mouseX >= 8 && mouseX <= 112 && mouseY >= 8 && mouseY <= 40) {
      setMoonGravity(!moonGravityEnabled);
    }
    // collision boxes toggle button: x:8-112, y:58-74
    if (mouseX >= 8 && mouseX <= 112 && mouseY >= 58 && mouseY <= 74) {
      showCollisionBoxes = !showCollisionBoxes;
    }
  }
  // persistent debug toggle button (top-right)
  if (
    mouseX >= VIEWW - 44 &&
    mouseX <= VIEWW - 8 &&
    mouseY >= 8 &&
    mouseY <= 26
  ) {
    debugMode = !debugMode;
  }
}

function touchStarted() {
  startMusicIfNeeded();
  return false;
}

function draw() {
  // --- BACKGROUND ---
  camera.off();
  imageMode(CORNER);
  image(bgImg, 0, 0, bgImg.width, bgImg.height);
  camera.on();

  // --- PLAYER CONTROLS ---
  // first check to see if the player is on the ground
  let grounded = sensor.overlapping(ground);

  // -- ATTACK INPUT --
  if (grounded && !attacking && kb.presses("space")) {
    attacking = true;
    attackFrameCounter = 0;
    player.vel.x = 0;
    player.ani.frame = 0;
    player.ani = "attack";
    player.ani.play(); // plays once to end
  }

  // -- JUMP --
  if (grounded && kb.presses("up")) {
    player.vel.y = -4;
    if (jumpSfx) jumpSfx.play();
  }

  // --- STATE MACHINE ---
  if (attacking) {
    attackFrameCounter++;
    // Attack lasts ~6 frames * frameDelay 2 = 12 cycles (adjust if needed)
    if (attackFrameCounter > 12) {
      attacking = false;
      attackFrameCounter = 0;
    }
  } else if (!grounded) {
    player.ani = "jump";
    player.ani.frame = player.vel.y < 0 ? 0 : 1;
  } else {
    player.ani = kb.pressing("left") || kb.pressing("right") ? "run" : "idle";
  }

  // --- MOVEMENT ---
  if (!attacking) {
    player.vel.x = 0;
    if (kb.pressing("left")) {
      player.vel.x = -1.5;
      player.mirror.x = true;
    } else if (kb.pressing("right")) {
      player.vel.x = 1.5;
      player.mirror.x = false;
    }
  }

  // --- KEEP IN VIEW ---
  player.pos.x = constrain(player.pos.x, FRAME_W / 2, VIEWW - FRAME_W / 2);

  // persistent debug button (always visible)
  camera.off();
  push();
  noStroke();
  fill(0, 120);
  rect(VIEWW - 44, 8, 36, 18, 4);
  fill(255);
  textSize(10);
  textAlign(CENTER, CENTER);
  text(debugMode ? "DBG ON" : "DEBUG", VIEWW - 26, 17);
  pop();
  camera.on();

  // Instruction text
  textSize(10);
  fill(0, 120);
  rect(4, 8, 100, 18, 4);
  fill(255);
  textAlign(LEFT, CENTER);
  text("M: DEBUG MENU", 10, 17);

  // --- DEBUG OVERLAY ---
  if (debugMode) {
    camera.off();
    push();
    noStroke();
    fill(0, 180);
    rect(4, 4, 160, 88, 6);
    fill(255);
    textSize(8);
    textAlign(LEFT, TOP);
    text("DEBUG", 12, 8);
    text(`Gravity: ${world.gravity.y.toFixed(2)}`, 12, 22);

    // draw toggle button
    const bx = 8,
      by = 34,
      bw = 104,
      bh = 16;
    stroke(255);
    strokeWeight(1);
    fill(moonGravityEnabled ? "#88c0ff" : "#444");
    rect(bx, by, bw, bh, 4);
    noStroke();
    fill(0);
    textAlign(CENTER, CENTER);
    text(
      moonGravityEnabled ? "Moon Gravity (ON)" : "Moon Gravity (OFF)",
      bx + bw / 2,
      by + bh / 2,
    );

    // collision boxes toggle
    const cbx = 8,
      cby = 58,
      cbw = 104,
      cbh = 16;
    stroke(255);
    strokeWeight(1);
    fill(showCollisionBoxes ? "#88ff88" : "#444");
    rect(cbx, cby, cbw, cbh, 4);
    noStroke();
    fill(0);
    textAlign(CENTER, CENTER);
    text(
      showCollisionBoxes ? "Collisions (ON)" : "Collisions (OFF)",
      cbx + cbw / 2,
      cby + cbh / 2,
    );

    pop();
    camera.on();
    // draw collision boxes in world space when enabled
    if (showCollisionBoxes) {
      // ensure we're drawing in world coordinates
      push();
      camera.on();
      noFill();
      strokeWeight(1);

      // player box (red)
      stroke(255, 100, 100);
      rectMode(CENTER);
      rect(player.pos.x, player.pos.y, player.w, player.h);

      // sensor box (green)
      if (typeof sensor !== "undefined") {
        stroke(100, 255, 100);
        rect(sensor.pos.x, sensor.pos.y, sensor.w, sensor.h);
      }

      // ground tiles (magenta)
      stroke(200, 100, 200);
      if (ground && ground.length) {
        for (let i = 0; i < ground.length; i++) {
          const s = ground[i];
          if (!s) continue;
          rect(s.pos.x, s.pos.y, s.w || TILE_W, s.h || TILE_H);
        }
      }
      if (groundDeep && groundDeep.length) {
        for (let i = 0; i < groundDeep.length; i++) {
          const s = groundDeep[i];
          if (!s) continue;
          rect(s.pos.x, s.pos.y, s.w || TILE_W, s.h || TILE_H);
        }
      }

      pop();
    }
  }
}
