import {postScore, getGameHighScore, postGameHighScore} from '../scoreAPI.js'

const LEFT = 37;
const RIGHT = 39;
const UP = 38;
//STATES

//directions
const IDLE = "IDLE";
const DEAD = "DEAD";
const JUMPING = "JUMPING";
const RUNNING = "RUNNING";

const MAX_PLAYER_Y_MARGIN = 50;
const PLAYER_ANIMATION_INTERVAL = 4;
const N_PLAYER_FRAMES = 16;
const PLATFORMS_Y_INTERVAL = 100;
const MIN_PLATFORM_W = 100;
const MAX_PLATFORM_W = 400;
const MOVING_PLATFORM_CHANCE = 0.3;
const FALLING_PLATFORM_CHANCE = 1;
const MOVING_PLATFORM_VX = 1;
var highscore = 0;
var wallPattern;
const stateFrames = {
    IDLE: [0],
//    IDLE: Array(6).fill(4 * N_PLAYER_FRAMES +9).concat(Array(6).fill(4 *N_PLAYER_FRAMES +10)),
//    JUMPING: range(2 * N_PLAYER_FRAMES, 2 * N_PLAYER_FRAMES + 5),
    JUMPING: range(2 * N_PLAYER_FRAMES + 4, 2 * N_PLAYER_FRAMES + 10),
    RUNNING: range(1, 1 + 7),
    DEAD: range(10 * N_PLAYER_FRAMES, 10 * N_PLAYER_FRAMES + 3)
};
var score = 0;
const SCORE_FACT = 10;
//PHYSICS
const G = 2;
const AX = 0.9;
const FRICTION = 1.2;
const MAX_VX = 20;
const VY_JUMP = 10*G;
const DEAD_VY = 4;
const VX_JUMP_FACT = 0.03;
const VX_WALLJUMP_FACT = 2 * VX_JUMP_FACT;
const PLATFORM_INITIAL_VY = 3;
const PLATFORM_AY = 0.004;
var platform_vy = PLATFORM_INITIAL_VY;
// consts
const themeOn = true;
//const themeOn = false;
const showHitbox = false;
const WALL_WIDTH = 35;
const PLAYER_R = 20;

const PLATFORM_HEIGHT = 30;
const SCALE_PLAYER_IMG = 1.4;
//assets
const images = {};

var canvas = document.getElementById('game_canvas');
var ctx = canvas.getContext('2d');
canvas.left = window.innerWidth * 0.25;
canvas.width = window.innerWidth * 0.75;
canvas.height = window.innerHeight;

//key Press & mouse movement Listeners
window.addEventListener('keydown', keyPress, false);
window.addEventListener('keyup', keyPress, false);


function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

function rect(xPos, yPos, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(xPos, yPos, width, height);
}

function circle(xPos, yPos, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(xPos, cHeight - yPos, radius, 0, 2 * Math.PI, false);
    ctx.fill();
}

var bgVX = 1;
var BG_H, BG_W, BG_W_ORIGINAL, H_RATIO, SCALED_BG_W;
var bgOffsetX = 0;

function initBackground(){
    BG_H = images.background.height;
    BG_W_ORIGINAL = images.background.width;
    BG_W = canvasAspectRatio * BG_H;
    SCALED_BG_W = H_RATIO = cHeight/BG_H * BG_W_ORIGINAL;
}
function drawBG() {
    if (themeOn) {
        if ((bgVX < 0 && bgOffsetX <0 ) || (bgVX > 0 && (bgOffsetX + BG_W > BG_W_ORIGINAL))) { // || (bgOffsetX + BG_W < (cWidth-WALL_WIDTH))){
            console.log(bgVX, bgOffsetX, bgOffsetX + BG_W * H_RATIO,  (cWidth-WALL_WIDTH))

             bgVX = -bgVX;
        }
        bgOffsetX +=bgVX;
        ctx.drawImage(images.background, bgOffsetX, 0, BG_W, BG_H, 0, 0, cWidth, cHeight);
//        ctx.drawImage(images.background, 0, 0, cWidth, cHeight);
    } else {
        rect(0, 0, cWidth, cHeight, 'black');
    }
}

//Settings
const cWidth = canvas.width;
const cHeight = canvas.height;
const canvasAspectRatio = cWidth/cHeight;
var player = {
    color: 'red',
    sprite: null,
    dead: false,
    r: PLAYER_R,
    x: cWidth / 2,
    y: cHeight, //PLAYER_R*2,
    vx: 0,
    vy: 0,
    w: 5,
    h: 10,
    ax: 0,
    ay: -G,
    state: IDLE,
    running: false,
    jumping: false,
    platform: null,
    prevPlatform: null,
    left: function() {
        this.vx=0;
        this.ax = -AX;
        this.running = true;
    },
    right: function() {
        this.vx=0;
        this.ax = AX;
        this.running = true;
    },
    stop: function() {
        this.running = false;
        if (!this.jumping) // TODO check
            this.ax = -1 * Math.sign(this.ax) * FRICTION;
    },
    jump: function() {
        if (this.dead)
            return;
        if (!this.jumping) {
            this.vy = VY_JUMP + VX_WALLJUMP_FACT * this.vx * this.vx;
            this.jumping = true;
            this.prevPlatform = this.platform;
            this.platform = null;
        }
    },
    checkCollisionX: function() {
        return (this.x - this.r <= WALL_WIDTH) || (this.x + this.r >= (cWidth - WALL_WIDTH));
    },
    collideX: function() {
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
            this.vy = DEAD_VY;
            this.ay = 0;

        }
    },
    checkOnPlatform: function(platform) {
        return this.checkOnPlatformX(platform) && this.checkOnPlatformY(platform);
    },
    checkOnPlatformX: function(platform) {
        return (this.x >= platform.x) && (this.x <= platform.x + platform.w);
    },
    checkOnPlatformY: function(platform) {
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
        this.prevPlatform = null;
        this.jumping = false;
    },
    alignPlatformX: function(platform) {
        this.x += platform.vx;
    },

    stopped: function() {
        return !this.running &&
            ((this.ax < 0 && this.vx <= 0) ||
                (this.ax > 0 && this.vx >= 0));
    },
    nextX: function() {
        return this.x + this.vx;
    },
    nextY: function() {
        return this.y + this.vy;
    },
    checkCurrPlatform: function() {
        if (this.platform != null) {
            if (!this.checkOnPlatformX(this.platform)) {
                this.prevPlatform = this.platform;
                this.platform = null;
            } else {
                this.platform.hit();
                this.alignPlatformY(this.platform);
                this.alignPlatformX(this.platform);
            }
            return true;
        }
        return false;
    },
    checkNewPlatform: function() {
        let possiblePlatforms = getPossiblePlatformsForPlayer(this);
        for (let platform of possiblePlatforms) {
            if (this.checkOnPlatform(platform)) {
                this.alignPlatformY(platform);
                break;
            }
        }
    },
    move: function() {
        this.vy = this.vy + this.ay;
        this.vx = clamp(this.vx + this.ax, -MAX_VX, +MAX_VX);
        if (this.stopped()) {
            this.vx = 0
            this.ax = 0
        }
        this.x = this.nextX();
        if (this.checkCollisionX())
            this.collideX();

        if (!this.checkCurrPlatform())
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
    currFrameIdx: 0,
    animationFrameArr: stateFrames.IDLE,
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
        if (showHitbox)
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
    }
}

function range(min, max) {
    let arr = [];
    for (let i = min; i <= max; i++) arr.push(i);
    return arr;
}

var rightKeyPressed = false;
var leftKeyPressed = false;
function keyPress(e) {
    if (e.repeat) return;
    var key = e.which || e.keyCode;
    if (key != 82 && key != 123) e.preventDefault();
    switch (e.type) {
        case "keydown":
            switch (key) {
                case UP:
                    player.jump();
                    break;
                case RIGHT:
                    rightKeyPressed= true;
                    player.right();
                    break;
                case LEFT:
                    leftKeyPressed= true;
                    player.left();
                    break;
                default:
                    break;
            }
            break;
        case 'keyup':
            switch (key) {
                case RIGHT:
                    rightKeyPressed = false;
                    break;
                case LEFT:
                    leftKeyPressed = false;
                    break;
                default:
                    break;
            }
            if (!leftKeyPressed && !rightKeyPressed){
                player.stop();
            }
            break;
        default:
            break;
    }
}

function initWalls() {
    wallPattern = ctx.createPattern(images.wall, 'repeat');
}

function drawWalls() {
    rect(0, 0, WALL_WIDTH, cHeight, wallPattern); // LEFT WALL
    rect(cWidth - WALL_WIDTH, 0, WALL_WIDTH, cHeight, wallPattern); // RIGHT WALL
}

const FLAME_SPACE = 40;
const FLAME_ANIMATION_INTERVAL = 3;

const FLAME_SIZE = 30;
const N_FLAME_FRAMES = 12;
const N_FLAME_FRAMES_X = 4;
const N_FLAME_FRAMES_Y = 3;
const MIN_FRAME_SCALE = 0.7;
const MAX_FRAME_SCALE = 5;
var FLAMES_W, FLAMES_H, flamesAspectRatio;

var flameFrames = [];
var flameFramesSizes = []

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randN(min, max) {
    return (Math.random() * (max - min + 1)) + min;
}

function initFlames() {
    FLAMES_W = images.flames.width / N_FLAME_FRAMES_X;
    FLAMES_H = images.flames.height / N_FLAME_FRAMES_Y;
    flamesAspectRatio = FLAMES_H / FLAMES_W;
    for (let x = 0; x <= cWidth; x += FLAME_SPACE) {
        flameFrames.push(randInt(0, N_FLAME_FRAMES - 1));
        flameFramesSizes.push(randN(MIN_FRAME_SCALE, MAX_FRAME_SCALE) * FLAME_SIZE);
    }
}


var platforms = [];
var n_platforms = 0
function removeOutOfBoundsPlatforms() {
    let i = 0;
    while (i > platforms.length && platforms[i].y <= 0)
        i++;
    platforms.splice(0, i);
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


function drawFlames() {
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


function drawScoreBoard(){
        ctx.textAlign='center';
        ctx.fillStyle='white';
        ctx.font= '80px arial';
        ctx.fillText(score,           cWidth/4, cHeight/8 + 70);
        ctx.fillText(highscore,   3 * cWidth/4, cHeight/8 + 70);
        ctx.font='20px arial';
        ctx.fillText('Score', cWidth/4, cHeight/8);
        ctx.fillText('Highscore', 3 * cWidth/4, cHeight/8);

        if (player.dead){
            ctx.fillStyle='black';
            ctx.fillText('GAME OVER (press CTRL+R to replay)', cWidth/2, cHeight/2);
        }
    }
// render
var lastTS = Date.now();
function render() {
    const now = Date.now();
    const dt = now - lastTS;
    lastTS = now;
    drawBG();
    drawWalls();
    drawScoreBoard();
    drawFlames();
    player.draw();
    drawPlatforms();
    requestAnimationFrame(render);
}


function loadImages() {
    let imageList = ["player", "player_inv", "flames", "wall", "log", "background"];
    let imageLoadedPromises = [];
    for (let img of imageList) {
        images[img] = new Image();
        images[img].src = `assets/images/${img}.png`;
        imageLoadedPromises.push(new Promise(resolve => images[img].onload = resolve));
    }
    Promise.all(imageLoadedPromises).then(loaded => {
        initFlames();
        initPlatforms();
        initWalls();
        initBackground();
        initHighScore();
        requestAnimationFrame(render);
    });
}

let oldScore = 0;
function updateScore(val) {
    if (!player.dead){
        score = Math.max(val,score);
        if (score - oldScore > SCORE_FACT) {
            let normalizedScore = (score - oldScore)/SCORE_FACT;
            postScore(normalizedScore);
            oldScore = score;
        }
    }
}

function main() {
    loadImages();
}

main();



function getRandPlatformsXCoords() {
    // TODO account for distance from previous level platform
    // NAIVE implementation: randomize platforms and spacing until out of space
    let leftToRight = 1; // TODO (randInt(0,1) == 1);
    let availableSpace = cWidth - 2 * WALL_WIDTH;
    let randPlatformIdx = randInt(platformFramesCoords.length - 1);
    let randPlatform = platformFramesCoords[randPlatformIdx];
    let spacing = randInt(0, PLATFROM_MAX_SPACING_X);
    let xCoord = WALL_WIDTH + spacing;
    while (availableSpace >= randPlatform.w) {
        // draw a platform if there's space
        ctx.drawImage(images.logs, randPlatform.x, randPlatform.y, randPlatform.w, PLATFORM_H, xCoord, cHeight / 2); //TODO check dx, dy, w,h
        // randomize new platform
        spacing = randInt(0, PLATFROM_MAX_SPACING_X);
        xCoord = xCoord + randPlatform.w + spacing;
        randPlatformIdx = randInt(platformFramesCoords.length - 1);
        randPlatform = platformFramesCoords[randPlatformIdx];
        xCoord = xCoord + randPlatform.w + spacing;
        availableSpace = 0;
    }



    let sign = 1;
    if (!leftToRight) {

    }

    for (let i = 0; i < flameFrames.length; i++) {
        let frameIdx = flameFrames[i];
        let flameH = flameFramesSizes[i] * flamesAspectRatio;
        let flameW = flameFramesSizes[i];
        let xCoord = (frameIdx % N_FLAME_FRAMES_X) * FLAMES_W;
        let yCoord = Math.floor(frameIdx / N_FLAME_FRAMES_X) * FLAMES_H;
        ctx.drawImage(images.flames, xCoord, yCoord, FLAMES_W, FLAMES_H, FLAME_SPACE * i, cHeight - flameH * 0.8, flameW, flameH); //TODO check dx, dy
        flameFrames[i] = (flameFrames[i] + 1) % N_FLAME_FRAMES;
    }
}

const FALL_DELAY = 70;
const PRE_FALL_SHAKE_DY = 5;
function createPlatform(image, dx, dy, dWidth, dHeight) {
    n_platforms++;
    let movingRight = (randInt(0,1) == 0 ? 1 : -1);
    let moving = randN(0,1) < MOVING_PLATFORM_CHANCE;
    let vx = moving ? MOVING_PLATFORM_VX * movingRight : 0;
    let falling = !moving && randN(0,1) < FALLING_PLATFORM_CHANCE;

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
        direction: randInt(0,1) == 0 ? 1 : -1,
        visible: true,
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
        fallCounter: FALL_DELAY,
        hit: function(){
            updateScore(this.platformNumber);
            if (!this.falling)
                return;
            this.fallCounter--;
            if(this.fallCounter == 0)
                this.ay = -G/3;
            else
                this.y += PRE_FALL_SHAKE_DY * ((this.fallCounter % 2 == 0) ? -1 : 1);
        },
        draw: function() {
            this.move();
            ctx.drawImage(this.img, this.x, cHeight - this.y, this.w, this.h);
        }
    };
    platforms.push(platform);
}

function getPossiblePlatformsForPlayer(player) {
    return platforms;
}


function updatePlatformVY(){
    platform_vy += PLATFORM_AY;
}

function initHighScore(){
    getGameHighScore('tower')
    .then(gameHighScore => highscore = gameHighScore);
}
function submitHighScore(){
    postGameHighScore('tower', score)
    .then(gameHighScore => highscore = gameHighScore);
}
