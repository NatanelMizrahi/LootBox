import {postScore, getGameHighScore, postGameHighScore} from '../scoreAPI.js'


// Key mapping
const LEFT = 37;
const RIGHT = 39;
const UP = 38;
const DOWN = 40;
const RESTART_KEY_CODE = 82;

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
const ALLOW_WRAP = true;
const G = 2;
const FRICTION = 1.2;

const PLAYER_AX = 0.9;
const MAX_PLAYER_VX = 20;
const PLAYER_JUMP_VY = 10*G;
const PLAYER_DEAD_VY = 4;
const VX_JUMP_FACT = 0.03;
const VX_WALLJUMP_FACT = 2 * VX_JUMP_FACT;

const PLATFORM_AY = 0.004;
const PLATFORM_INITIAL_VY = 3;
const PLATFORM_FALL_DELAY = 70;
const PLATFORM_PRE_FALL_SHAKE_DY = 5;
const MOVING_PLATFORM_VX = 1;

var platform_vy = PLATFORM_INITIAL_VY;

// misc.
const PRODUCTION = false;
const THEME_ON = true;
const SHOW_HITBOX = false;
const FLAMES_ON_DEAD_ONLY = false;
const gameOverMessage = `GAME OVER (press ${String.fromCharCode(RESTART_KEY_CODE).toUpperCase()} to replay)`;

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

const images = {};



const HOLE_W = 50;
const HOLE_H = 50;
const HOLE_RX = HOLE_W/2;
const HOLE_RY = HOLE_H/4;
const AVO_H =  HOLE_H;
const AVO_W =  HOLE_W;
const PADDING = HOLE_H;
const HOLES_OFFSET_X = PADDING;
const HOLES_OFFSET_Y = 100 + PADDING;
const N_HOLES_X = 6;
const N_HOLES_Y = 4;

const canvas = document.getElementById('game_canvas');
const ctx = canvas.getContext('2d');
canvas.width = N_HOLES_X * HOLE_W + PADDING + HOLES_OFFSET_X;
canvas.height = N_HOLES_Y * HOLE_H + PADDING + HOLES_OFFSET_Y;
const cWidth = canvas.width;
const cHeight = canvas.height;

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
//        ctx.drawImage(images.background, 0, 0, cWidth, cHeight);
    } else {
        rect(0, 0, cWidth, cHeight, 'black');
    }
}

var player = {
    color: 'red',
    dead: false,
    r: PLAYER_R,
    x: HOLES_OFFSET_X,
    y: HOLES_OFFSET_Y,
    w: HOLE_W,
    h: HOLE_H,
    vx: 0,
    vy: 0,
    boardX: 0,
    boardY: 0,
    tgtX: HOLES_OFFSET_X,
    tgtY: HOLES_OFFSET_Y,
    movingX: false,
    movingY: false,
    moveX: function(direction){
        this.movingX = true;
        let delta = (direction == RIGHT) ? 1 : -1;
        let prevBoardX = this.boardX;
        this.boardX += delta;
        if (this.boardX < 0 || this.boardX >= N_HOLES_X) {
            if (ALLOW_WRAP){
                this.boardX = (this.boardX+ N_HOLES_X) % N_HOLES_X;
            } else {
                this.boardX = clamp(this.boardX, 0, N_HOLES_X-1);
            }
        }
        this.vx = (prevBoardX < this.boardX) ? MAX_PLAYER_VX : -MAX_PLAYER_VX;
        this.tgtX = HOLES_OFFSET_X + this.boardX * HOLE_W;
    },
    moveY: function(direction){
        this.movingY = true;
        let prevBoardY = this.boardY;
        let delta = (direction == DOWN) ? 1 : -1;
        this.boardY += delta;
        if (this.boardY < 0 || this.boardY >= N_HOLES_Y) {
            if (ALLOW_WRAP){
                this.boardY = (this.boardY+ N_HOLES_Y) % N_HOLES_Y;
            } else {
                this.boardY = clamp(this.boardY, 0, N_HOLES_Y-1);
            }
        }
        this.vy = (prevBoardY < this.boardY) ? MAX_PLAYER_VX : -MAX_PLAYER_VX;
        this.tgtY = HOLES_OFFSET_Y + this.boardY * HOLE_H;
    },
    move: function(direction) {
        switch(direction){
            case UP:
            case DOWN:
                this.moveY(direction);
                break;
            case LEFT:
            case RIGHT:
                this.moveX(direction);
                break;
        }
    },
    nextX: function() {
        return this.x + this.vx;
    },
    nextY: function() {
        return this.y + this.vy;
    },
    updateCoords: function(){
        if(this.movingX) {
            let nextX = this.nextX();
            if ((this.x <= this.tgtX && this.tgtX <= nextX) || (this.x >= this.tgtX && this.tgtX >= nextX)){
                this.x = this.tgtX;
                this.movingX = 0;
                this.vx = 0;
            } else {
                this.x += this.vx;
            }
        }
        if(this.movingY) {
            let nextY = this.nextY();
            if ((this.y <= this.tgtY && this.tgtY <= nextY) || (this.y >= this.tgtY && this.tgtY >= nextY)){
                this.y = this.tgtY;
                this.movingY = 0;
                this.vy = 0;
            } else {
                this.y += this.vy;
            }
        }
    },
    // player animation
    currFrameIdx: 0,
    animationFrameArr: stateFrames[IDLE],
    animationIntervalCounter: PLAYER_ANIMATION_INTERVAL,
    draw: function() {
        this.updateCoords();
        let img = images.player;
        let currFrame = this.animationFrameArr[this.currFrameIdx];
        let xOffset = (currFrame % N_PLAYER_FRAMES);
        let yOffset = Math.floor(currFrame / N_PLAYER_FRAMES);
        let fw = img.width / N_PLAYER_FRAMES;
        let fh = img.height / N_PLAYER_FRAMES;
        let fx = xOffset * fw;
        let fy = yOffset * fh;
        let fr = SCALE_PLAYER_IMG * this.r;
        rect(this.x, this.y,this.w, this.h, this.color);
        ctx.drawImage(img, fx, fy, fw, fh, this.x, this.y), this., fr * 2);

        this.animationIntervalCounter--;
        if (this.animationIntervalCounter == 0) {
            this.currFrameIdx = (this.currFrameIdx + 1) % this.animationFrameArr.length;
            this.animationIntervalCounter = PLAYER_ANIMATION_INTERVAL;
        }
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

// aux functions
function range(min, max) {
    let arr = [];
    for (let i = min; i <= max; i++) arr.push(i);
    return arr;
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
    return (Math.random() * (max - min)) + min;
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
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

function initHighScore(){
    getGameHighScore('tower')
    .then(gameHighScore => highscore = gameHighScore);
}
function submitHighScore(){
    postGameHighScore('tower', score)
    .then(gameHighScore => highscore = gameHighScore);
}

function drawScoreBoard(){
    ctx.textAlign='center';
    ctx.fillStyle='white';
    ctx.font= '80px arial';
    ctx.fillText(score,           cWidth/4, cHeight/8 + 70);
    ctx.fillText(highscore,   3 * cWidth/4, cHeight/8 + 70);
    ctx.font='20px arial';
    ctx.fillText('Score',         cWidth/4, cHeight/8);
    ctx.fillText('Highscore', 3 * cWidth/4, cHeight/8);

    if (player.dead){
        if (THEME_ON) ctx.fillStyle='black';
        ctx.fillText(gameOverMessage, cWidth/2, cHeight/2);
    }
}


// key Press EventListeners
window.addEventListener('keydown', keyDown, false);

function keyDown(e) {
    if (e.repeat) return;
    var key = e.which || e.keyCode;
    if (key != 82 && key != 123 || PRODUCTION) e.preventDefault();
    switch (key) {
        case UP:
        case DOWN:
        case LEFT:
        case RIGHT:
            player.move(key);
            break;
    }
}

// render
function render() {
    drawBG();
//    drawWalls();
    drawScoreBoard();
//    drawFlames();
    drawHoles();
    drawAvocados();
    player.draw();
//    drawPlatforms();
    requestAnimationFrame(render);
}


function loadImages() {
    let imageList = ["player", "player_inv", "flames", "wall", "log", "background", "hole", "avocado", "boss"];
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
        initHoles();
        initAvocados();
        initBackground();
        initHighScore();
        requestAnimationFrame(render);
    });
}

function main() {
    loadImages();
}

main();




function createHolePattern(){
  var canvas1 = document.createElement( 'canvas' );
  var ctx1 = canvas1.getContext( '2d' );
  var holeAspectRatio  = images.hole.width/ images.hole.height;

  canvas1.width = HOLE_W;
  canvas1.height = HOLE_H;
  ctx1.drawImage(images.hole, 0, 0, canvas1.width, canvas1.height );
  return ctx.createPattern( canvas1, 'repeat');
};

var holePattern;
function initHoles(){
    holePattern = createHolePattern();
}
function drawHoles(){
  ctx.fillStyle = holePattern;
  ctx.fillRect(HOLES_OFFSET_X, HOLES_OFFSET_Y, N_HOLES_X * HOLE_W, N_HOLES_Y * HOLE_H);
}


var avocados;

const MIN_AVO_SPEED = 2;
const MAX_AVO_SPEED = 5;
const MIN_AVO_DELAY = 50;
const MAX_AVO_DELAY = 150;
const HITTABLE_THRESHOLD = 0.25;

function initAvocados(){
    avocados = initAvocadosMatrix();
}
function initAvocadosMatrix(){
    let arr = [];
    for (let i = 0; i< N_HOLES_Y; i++){
        arr.push([]);
        for (let j = 0; j< N_HOLES_X; j++){
            arr[i].push(null);
        }
    }
    return arr;
}
const SPAWN_CHANCE = 0.001;
function drawAvocados(){
    for (let i = 0; i< N_HOLES_Y; i++){
        for (let j = 0; j< N_HOLES_X; j++){
            if (avocados[i][j] == null && (randFloat(0,1) < SPAWN_CHANCE)){
                addAvocado(i,j);
            }
            if (avocados[i][j] != null)
                avocados[i][j].draw();
        }
    }
}
function addAvocado(i,j){
    console.log(i,j);
    let avocado = {
        img: images.avocado,
        x: j * HOLE_W + HOLES_OFFSET_X,
        y: i * HOLE_H + HOLES_OFFSET_Y + AVO_H,
        w: AVO_W,
        h: AVO_H,
        boardX :j,
        boardY :i,
        delay: randInt(MIN_AVO_DELAY,MAX_AVO_DELAY),
        speed: randInt(MIN_AVO_SPEED,MAX_AVO_SPEED),
        visible : true,
        hittable: true,
        move: function(){
        },
        draw: function (){
//            rect(this.x, this.y, this.w, this.h, 'black');
            this.delay--;
            if (this.delay == 0)
                this.die();
            else
                this.crop();
        },
        crop: function (){
            rect(this.x, this.y, this.w, this.h, 'black');
//            ctx.save();
//            ctx.beginPath();
////            rect(this.x, this.y, this.w, this.h);
//            let cw = false;
//            let holeCenterX = this.x + HOLE_W/2;
//            let holeCenterY = this.y - HOLE_H/2;
//            ctx.ellipse(holeCenterX ,holeCenterY, HOLE_RX, HOLE_RY, 0, 0, Math.PI, cw);
//            ctx.fill();
//            ctx.closePath();
//
////            ctx.clip();
////            ctx.drawImage(this.x, this.y, this.w, this.h);
//            ctx.restore();
        },
        die: function(){
            this.visible = false;
            console.log(this.boardY,this.boardX, "DEAD" );
            avocados[this.boardY][this.boardX] = null;
        }
    }
    avocados[i][j] = avocado;
}