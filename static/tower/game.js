import {postScore, getGameHighScore, postGameHighScore} from '../common/scoreAPI.js'
import {images, canvas, ctx, RESTART_KEY_CODE, MUTE_KEY, PRODUCTION, THEME_ON, SHOW_HITBOX, FLAMES_ON_DEAD_ONLY, DEFAULT_MUTED, gameOverMessage, rect, circle, range, randInt, randFloat, clamp, drawScoreBoard, loadAudio, loadImages, toggleTheme, loadGame, gamePad, clearCanvas,drawLogo} from '../common/common.js';
// Key mapping
const LEFT = 37;
const RIGHT = 39;
const UP = 32; // space


// animation
const INITIAL_BG_VX = 1;
const PLAYER_ANIMATION_INTERVAL = 4;
const FLAME_ANIMATION_INTERVAL = 3;
const N_PLAYER_FRAMES = 16;
const MAX_PLAYER_Y_MARGIN = 50;

//STATES
const IDLE = "IDLE";
const DEAD = "DEAD";
const JUMPING = "JUMPING";
const RUNNING = "RUNNING";

const stateFrames = {
    IDLE: [0],
    JUMPING: range(2 * N_PLAYER_FRAMES + 4, 2 * N_PLAYER_FRAMES + 10),
    RUNNING: range(1, 1 + 7),
    DEAD: range(10 * N_PLAYER_FRAMES, 10 * N_PLAYER_FRAMES + 3)
};

// SCORE
const SUBMIT_SCORE_DELTA = 10;

// PHYSICS
const G = 1.3;
const FRICTION = 1.2;

const PLAYER_AX = 0.7; // 0.9;
const MAX_PLAYER_VX = 20;
const PLAYER_JUMP_VY = 13 * G; // 10*G;
const PLAYER_DEAD_VY = 4;
const VX_JUMP_FACT =  0.02;// 0.03;
const VX_WALLJUMP_FACT = 2 * VX_JUMP_FACT;

const PLATFORM_AY = 0.004; //0.004;
const PLATFORM_INITIAL_VY = 3;
const PLATFORM_FALL_DELAY = 70;
const PLATFORM_PRE_FALL_SHAKE_DY = 5;
const MOVING_PLATFORM_VX = 1;

var platform_vy = PLATFORM_INITIAL_VY;


//sizes
const WALL_WIDTH = 35;
const PLAYER_R = 20;
const SCALE_PLAYER_IMG = 1.4;
const PLATFORM_HEIGHT = 1.5 * PLAYER_R;

// flames
const FLAME_SIZE = 30;
const FLAME_SPACE = 40;
const N_FLAME_FRAMES = 12;
const N_FLAME_FRAMES_X = 4;
const N_FLAME_FRAMES_Y = 3;
const MIN_FLAME_SCALE = 0.7;
const MAX_FLAME_SCALE = 5;

// platforms
const PLATFORMS_Y_INTERVAL = 5*PLAYER_R;
const MIN_PLATFORM_W = 100;
const MAX_PLATFORM_W = 400;
const MOVING_PLATFORM_CHANCE = 0.3;
const FALLING_PLATFORM_CHANCE = 1;

canvas.width = window.innerWidth * 0.75;
canvas.height = window.innerHeight;
const cWidth = canvas.width;
const cHeight = canvas.height;


// background
var backgroundVX = INITIAL_BG_VX;
var BG_H, BG_W, BG_W_ORIGINAL;
var bgOffsetX = 0;

function initBackground(){
    const canvasAspectRatio = cWidth/cHeight;
    BG_H = images.background.height;
    BG_W = BG_H * canvasAspectRatio;
    BG_W_ORIGINAL = images.background.width;
}

function drawBG() {
    if (THEME_ON) {
        if ((backgroundVX < 0 && bgOffsetX <0 ) || (backgroundVX > 0 && (bgOffsetX + BG_W > BG_W_ORIGINAL))) {
             backgroundVX = -backgroundVX;
        }
        bgOffsetX +=backgroundVX;
        ctx.drawImage(images.background, bgOffsetX, 0, BG_W, BG_H, 0, 0, cWidth, cHeight);
    }
}

var player = {
    color: 'red',
    r: PLAYER_R,
    x: cWidth / 2,
    y: cHeight,
    vx: 0,
    vy: 0,
    ax: 0,
    ay: -G,
    state: IDLE,
    dead: false,
    running: false,
    jumping: false,
    platform: null,
    controllerMoveX: function(val) {
        if (Math.sign(val) != Math.sign(this.vx))
            this.vx=0;
        this.controllerMove = true;
        this.ax = PLAYER_AX * val;
        this.running = true;
    },
    left: function() {
        this.vx=0;
        this.ax = -PLAYER_AX;
        this.running = true;
    },
    right: function() {
        this.vx=0;
        this.ax = PLAYER_AX;
        this.running = true;
    },
    stop: function() {
        this.running = false;
        if (!this.jumping)
            this.ax = -1 * Math.sign(this.ax) * FRICTION;
    },
    jump: function() {
        if (!this.jumping && ! this.dead) {
            this.vy = PLAYER_JUMP_VY + VX_WALLJUMP_FACT * this.vx * this.vx;
            this.jumping = true;
            this.platform = null;
        }
    },
    isWallCollision: function() {
        return (this.x - this.r <= WALL_WIDTH) || (this.x + this.r >= (cWidth - WALL_WIDTH));
    },
    collideWall: function() {
        this.vx = -this.vx;
        if (this.jumping)
            this.vy += VX_JUMP_FACT * this.vx * this.vx;
        this.ax = -this.ax;
        if (this.x - this.r <= WALL_WIDTH) {
            this.x = this.r + WALL_WIDTH;
        }
        if (this.x + this.r >= (cWidth - WALL_WIDTH)) {
            this.x = (cWidth - WALL_WIDTH) - this.r;
        }
    },
    checkFloorHit: function() {
        if (this.y - this.r <= 0) {
            if (!this.jumping)
                this.vy = 0;
            this.y = this.r;
            if (!this.dead){
                submitHighScore();
            }
            this.jumping = false;
            this.dead = true;
            this.vy = PLAYER_DEAD_VY;
            this.ay = 0;

        }
    },
    isOnPlatform: function(platform) {
        return this.isOnPlatformX(platform) && this.isOnPlatformY(platform);
    },
    isOnPlatformX: function(platform) {
        return (this.x >= platform.x) && (this.x <= platform.x + platform.w);
    },
    isOnPlatformY: function(platform) {
        let goingDownOrSideWays = (this.vy <= 0);
        let bottomY = (this.y - this.r);
        let bottomNextY = (this.nextY() - this.r);
        let onPlatformY = ((bottomY >= platform.y) && (bottomNextY <= platform.y));
        return goingDownOrSideWays && onPlatformY;
    },

    alignPlatformY: function(platform) {
        this.vy = 0;
        this.y = platform.y + this.r;
        this.platform = platform;
        this.jumping = false;
    },
    alignPlatformX: function(platform) {
        this.x += platform.vx;
    },

    stopped: function() {
        return !this.running && ((this.ax < 0 && this.vx <= 0) || (this.ax > 0 && this.vx >= 0));
    },
    nextX: function() {
        return this.x + this.vx;
    },
    nextY: function() {
        return this.y + this.vy;
    },
    checkCurrPlatform: function() {
        if (this.platform != null) {
            if (!this.isOnPlatformX(this.platform)) {
                this.platform = null;
            } else {
                this.platform.hit();
                this.alignPlatformY(this.platform);
                this.alignPlatformX(this.platform);
            }
        }
    },
    checkNewPlatform: function() {
        if (this.platform != null)
            return;
        for (let platform of platforms) {
            if (this.isOnPlatform(platform)) {
                this.alignPlatformY(platform);
                break;
            }
        }
    },
    move: function() {
        this.vy = this.vy + this.ay;
        this.vx = clamp(this.vx + this.ax, -MAX_PLAYER_VX, +MAX_PLAYER_VX);
        if (this.stopped()) {
            this.vx = 0
            this.ax = 0
        }
        this.x = this.nextX();
        if (this.isWallCollision())
            this.collideWall();

        this.checkCurrPlatform();
        this.checkNewPlatform();

        this.y = this.nextY();
        this.checkFloorHit();
        this.updateState();
    },
    updateState: function() {
        let prevState = this.state;
        if (this.dead) {
            this.state = DEAD;
        } else if (this.jumping) {
            this.state = JUMPING;
        } else if (this.vx != 0) {
            this.state = RUNNING;
        } else {
            this.state = IDLE;
        }
        if (prevState != this.state)
            this.animationFrameArr = stateFrames[this.state];
    },
    // player animation
    currFrameIdx: 0,
    animationFrameArr: stateFrames[IDLE],
    animationIntervalCounter: PLAYER_ANIMATION_INTERVAL,
    draw: function() {
        this.move();
        let invert = (this.vx < 0);
        let img = images.player;
        let currFrame = this.animationFrameArr[this.currFrameIdx];
        let xOffset = (currFrame % N_PLAYER_FRAMES);
        let yOffset = Math.floor(currFrame / N_PLAYER_FRAMES);
        if (invert) {
            xOffset = (N_PLAYER_FRAMES - 1) - xOffset;
            img = images.player_inv;
        }
        if (SHOW_HITBOX)
            circle(this.x, this.y, this.r, this.color);
        let fw = img.width / N_PLAYER_FRAMES;
        let fh = img.height / N_PLAYER_FRAMES;
        let fx = xOffset * fw;
        let fy = yOffset * fh;
        let fr = SCALE_PLAYER_IMG * this.r;
        ctx.drawImage(img, fx, fy, fw, fh, this.x - fr, cHeight - (this.y + fr), fr * 2, fr * 2);
        this.animationIntervalCounter--;
        if (this.animationIntervalCounter == 0) {
            this.currFrameIdx = (this.currFrameIdx + 1) % this.animationFrameArr.length;
            this.animationIntervalCounter = PLAYER_ANIMATION_INTERVAL;
        }
    },
    reset: function() {
        this.x = cWidth / 2;
        this.y = cHeight;
        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = -G;
        this.state = IDLE;
        this.running = false;
        this.jumping = false;
        this.platform = null;
        this.dead = false;
        this.animationFrameArr = stateFrames[this.state];
    }
}

// walls
var wallPattern;
function initWalls() {
    wallPattern = ctx.createPattern(images.wall, 'repeat');
}

function drawWalls() {
    rect(0, 0, WALL_WIDTH, cHeight, wallPattern);                   // LEFT WALL
    rect(cWidth - WALL_WIDTH, 0, WALL_WIDTH, cHeight, wallPattern); // RIGHT WALL
}

// flames
var FLAMES_W, FLAMES_H, flamesAspectRatio;
var flameFrames = [];
var flameFramesSizes = []

function initFlames() {
    FLAMES_W = images.flames.width / N_FLAME_FRAMES_X;
    FLAMES_H = images.flames.height / N_FLAME_FRAMES_Y;
    flamesAspectRatio = FLAMES_H / FLAMES_W;
    for (let x = 0; x <= cWidth; x += FLAME_SPACE) {
        flameFrames.push(randInt(0, N_FLAME_FRAMES - 1));
        flameFramesSizes.push(randFloat(MIN_FLAME_SCALE, MAX_FLAME_SCALE) * FLAME_SIZE);
    }
}

function drawFlames() {
    if (!FLAMES_ON_DEAD_ONLY && !player.dead)
        return;
    drawFlames.count = (drawFlames.count + 1) % FLAME_ANIMATION_INTERVAL;
    for (let i = 0; i < flameFrames.length; i++) {
        let frameIdx = flameFrames[i];
        let flameH = flameFramesSizes[i] * flamesAspectRatio;
        let flameW = flameFramesSizes[i];
        let xCoord = (frameIdx % N_FLAME_FRAMES_X) * FLAMES_W;
        let yCoord = Math.floor(frameIdx / N_FLAME_FRAMES_X) * FLAMES_H;
        ctx.drawImage(images.flames, xCoord, yCoord, FLAMES_W, FLAMES_H, FLAME_SPACE * i, cHeight - flameH * 0.8, flameW, flameH); //TODO check dx, dy
        if (drawFlames.count == 0)
            flameFrames[i] = (flameFrames[i] + 1) % N_FLAME_FRAMES;
    }
}
drawFlames.count = 0;

// platforms
var platforms = [];
var n_platforms = 0

function removeOutOfBoundsPlatforms() {
    let i = 0;
    while (i < platforms.length && platforms[i].y <= 0)
        i++;
    platforms.splice(0, i);
}


function createPlatform(image, dx, dy, dWidth, dHeight) {
    n_platforms++;
    let moving = randFloat(0,1) < MOVING_PLATFORM_CHANCE;
    let direction = (randInt(0,1) == 0 ? 1 : -1);
    let vx = moving ? MOVING_PLATFORM_VX * direction : 0;
    let falling = !moving && randFloat(0,1) < FALLING_PLATFORM_CHANCE;

    let platform = {
        img: image,
        vy: -platform_vy,
        ay: 0,
        vx: vx,
        x: dx, // top left x coord
        y: dy, // top left y coord
        w: dWidth,
        h: dHeight,
        moving: moving,
        falling: falling,
        platformNumber: n_platforms,
//        direction: randInt(0,1) == 0 ? 1 : -1,
        move: function() {
            if (this.ay != 0){
                this.vy += this.ay;
            } else {
                this.vy = -platform_vy;
            }

            this.y += this.vy;
            if (this.moving){
                this.x += this.vx;
                if (this.x <= WALL_WIDTH) {
                    this.x = WALL_WIDTH;
                    this.vx = -this.vx;
                }
                if (this.x + this.w >= (cWidth - WALL_WIDTH)) {
                    this.x = (cWidth - WALL_WIDTH) - this.w;
                    this.vx = -this.vx;
                }
            }
        },
        fallCounter: PLATFORM_FALL_DELAY,
        hit: function(){
            updateScore(this.platformNumber);
            if (!this.falling)
                return;
            this.fallCounter--;
            if(this.fallCounter == 0)
                this.ay = -G/3;
            else
                this.y += PLATFORM_PRE_FALL_SHAKE_DY * ((this.fallCounter % 2 == 0) ? -1 : 1);
        },
        draw: function() {
            this.move();
            ctx.drawImage(this.img, this.x, cHeight - this.y, this.w, this.h);
        }
    };
    platforms.push(platform);
}

function addPlatformsFromTop() {
    let topPlatformY = platforms.length == 0 ? 0 : platforms[platforms.length - 1].y;
    while (topPlatformY <= cHeight) {
        let platformWidth = randInt(MIN_PLATFORM_W, MAX_PLATFORM_W);
        let platformOffset = randInt(WALL_WIDTH, cWidth - WALL_WIDTH - platformWidth);
        topPlatformY += PLATFORMS_Y_INTERVAL;
        createPlatform(images.log, platformOffset, topPlatformY, platformWidth, PLATFORM_HEIGHT);
    }
}
function updatePlayerRelativeY(){
    let playerDistanceAboveTopMargin = player.y - (cHeight - MAX_PLAYER_Y_MARGIN);
    if (playerDistanceAboveTopMargin > 0){
        player.y -= playerDistanceAboveTopMargin
        platforms.forEach(platform => platform.y -= playerDistanceAboveTopMargin);
    }
}

function updatePlatformVY(){
    platform_vy += PLATFORM_AY;
}

function updatePlatforms() {
    updatePlatformVY();
    updatePlayerRelativeY();
    removeOutOfBoundsPlatforms();
    if (!player.dead)
        addPlatformsFromTop();

}

function initPlatforms(){
    platform_vy = PLATFORM_INITIAL_VY;
    addPlatformsFromTop();
}

function drawPlatforms() {
    updatePlatforms();
    platforms.forEach(p => p.draw());
}

// scoreboard
var highscore = 0;
var score = 0;
var prevScore = 0;
function updateScore(val) {
    if (!player.dead){
        score = Math.max(val,score);
        if (score - prevScore > SUBMIT_SCORE_DELTA) {
            let normalizedScore = (score - prevScore)/SUBMIT_SCORE_DELTA;
            postScore(normalizedScore);
            prevScore = score;
        }
    }
}

function drawMessages(){
    if (THEME_ON) ctx.fillStyle='black';
    ctx.font='20px arial';
    if (player.dead){
        ctx.fillText(gameOverMessage, cWidth/2, cHeight/2);
    }
//    ctx.fillText("[SPACE:jump][ARROW KEYS:move][M: toggle music]", cWidth/2, 30);
    ctx.fillText("[3:jump][Joystick/arrows:move][M: toggle music]", cWidth/2, 30);

}

function initHighScore(){
    getGameHighScore('tower')
    .then(gameHighScore => highscore = gameHighScore);
}
function submitHighScore(){
    postGameHighScore('tower', score)
    .then(gameHighScore => highscore = gameHighScore);
}

// key Press EventListeners
window.addEventListener('keydown', keyDown, false);
window.addEventListener('keyup', keyUp, false);

var rightKeyPressed = false;
var leftKeyPressed = false;

function keyUpLeft() {
    leftKeyPressed = false;
    checkPlayerIdle();
}
function keyUpRight() {
    rightKeyPressed = false;
    checkPlayerIdle();
}
function checkPlayerIdle(){
    if (!leftKeyPressed && !rightKeyPressed)
            player.stop();
}
function keyUp(e) {
    var key = e.which || e.keyCode;
    if (key == RIGHT) keyUpRight();
    if (key == LEFT)  keyUpLeft();
}

function moveRight(){
    rightKeyPressed= true;
    player.right();
}
function moveLeft(){
    leftKeyPressed= true;
    player.left();
}
function keyDown(e) {
    if (e.repeat) return;
    var key = e.which || e.keyCode;
    if (key != 82 && key != 123 || PRODUCTION) e.preventDefault();
    switch (key) {
        case UP:
            player.jump();
            break;
        case RIGHT:
            moveRight();
            break;
        case LEFT:
            moveLeft();
            break;
        case RESTART_KEY_CODE:
            reset();
            break;
        case MUTE_KEY:
            toggleTheme();
            break;
        default:
            break;
    }
}

// must implement
function render() {
//    gamePad.processEvents();
//    drawBG();
    clearCanvas();
    drawLogo();
    drawWalls();
    drawScoreBoard(score, highscore);
    drawMessages();
    drawFlames();
    player.draw();
    drawPlatforms();
    requestAnimationFrame(render);
}

function reset(){
    if (!player.dead) return;
    score = 0;
    prevScore = 0;
    n_platforms = 0;
    platforms = []
    platform_vy = PLATFORM_INITIAL_VY
    player.reset();
}

function playGame(){
        gamePad.loop();
        initFlames();
        initPlatforms();
        initWalls();
        initBackground();
        initHighScore();
        requestAnimationFrame(render);
}


gamePad.onThumbstickPress(  0, function(v){     player.controllerMoveX(v);  });
gamePad.onThumbstickRelease(0, function(){      player.stop();              });

gamePad.onButtonPress(      3, function(){      player.jump();              }, true);
gamePad.onButtonPress("LEFT",  moveLeft, true);
gamePad.onButtonPress("RIGHT",  moveRight, true);
gamePad.onButtonPress("START", reset, true);
gamePad.onButtonPress("L2", toggleTheme, true);

gamePad.onButtonRelease("LEFT", keyUpLeft);
gamePad.onButtonRelease("RIGHT", keyUpRight);

let imageList = ["player", "player_inv", "flames", "wall", "log", "background", "logo"];
let audioList = ["theme"];

gamePad.connect()
    .then(connected => loadGame(imageList, audioList))
    .then(playGame)
