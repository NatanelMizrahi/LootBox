import {postScore, getGameHighScore, postGameHighScore} from '../scoreAPI.js'


// Key mapping
const LEFT = 37;
const RIGHT = 39;
const UP = 38;
const DOWN = 40;
const RESTART_KEY_CODE = 82;
const HIT_KEY = 32; // space

// animation
const INITIAL_BG_VX = 1;
const PLAYER_ANIMATION_INTERVAL = 4;
const FLAME_ANIMATION_INTERVAL = 3;
const N_PLAYER_FRAMES = 4;
const MAX_PLAYER_Y_MARGIN = 50;

//STATES
const IDLE = "IDLE";
const HIT = "HIT"
const DEAD = "DEAD";
const JUMPING = "JUMPING";
const RUNNING = "RUNNING";

const stateFrames = {
    IDLE: [0],
    HIT: [0,1,1,1,2,2,1,1,1,0]
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
const MALLET_W = HOLE_W * 1.1;
const MALLET_H = HOLE_H * 1.1;
const HOLE_RX = HOLE_W/2;
const HOLE_RY = HOLE_H/4;
const MALLET_OFFSET_X = -HOLE_W / 4;
const MALLET_OFFSET_Y = -HOLE_H / 2;
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
    w: MALLET_W,
    h: MALLET_H,
    vx: 0,
    vy: 0,
    boardX: 0,
    boardY: 0,
    tgtX: HOLES_OFFSET_X,
    tgtY: HOLES_OFFSET_Y,
    movingX: false,
    movingY: false,
    hit: function(){
        this.state = HIT;
        this.animationFrameArr = stateFrames[HIT];
        let avocadoInHole = avocados[this.boardY][this.boardX];
        if (avocadoInHole != null)
            avocadoInHole.hit();
    },
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
    checkIdle: function(){
        if (this.state == HIT && this.currFrameIdx == 0){
            this.state = IDLE;
            this.animationFrameArr = stateFrames[IDLE];
        }
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
        let img = images.mallet;
        let currFrame = this.animationFrameArr[this.currFrameIdx];
        let xOffset = (currFrame % N_PLAYER_FRAMES);
        let yOffset = 0;
        let fw = img.width / N_PLAYER_FRAMES;
        let fh = img.height;
        let fx = xOffset * fw;
        let fy = yOffset * fh;
        let fr = SCALE_PLAYER_IMG * this.r;
        if (SHOW_HITBOX)
            rect(this.x, this.y, this.w, this.h, this.color);
        ctx.drawImage(img, fx, fy, fw, fh, this.x + MALLET_OFFSET_X, this.y + + MALLET_OFFSET_Y, this.w, this.h);
        this.currFrameIdx = (this.currFrameIdx + 1) % this.animationFrameArr.length;
        this.checkIdle();
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
        case HIT_KEY:
            player.hit();
            break
    }
}

// render
function render() {
    drawBG();
    drawScoreBoard();
    drawHoles();
    drawAvocados();
    player.draw();
    requestAnimationFrame(render);
}


function loadImages() {
    let imageList = ["background", "hole", "avocado", "boss", "mallet", "pow"];
    let imageLoadedPromises = [];
    for (let img of imageList) {
        images[img] = new Image();
        images[img].src = `assets/images/${img}.png`;
        imageLoadedPromises.push(new Promise(resolve => images[img].onload = resolve));
    }
    Promise.all(imageLoadedPromises).then(loaded => {
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
const MIN_AVO_DURATION = 50;
const MAX_AVO_DURATION = 150;
const AVO_DELAY = 20;
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
    let avocado = {
        img: images.avocado,
        x: j * HOLE_W + HOLES_OFFSET_X,
        y: i * HOLE_H + HOLES_OFFSET_Y + AVO_H,
        w: AVO_W,
        h: AVO_H,
        boardX :j,
        boardY :i,
        duration: randInt(MIN_AVO_DURATION,MAX_AVO_DURATION),
        speed: randInt(MIN_AVO_SPEED,MAX_AVO_SPEED),
        delay: AVO_DELAY,
        visible : true,
        hittable: true,
        dead: false,
        killed: false,
        move: function(){
        },
        draw: function (){
            if (this.dead){
                ctx.drawImage(images.pow, this.x, this.y, this.w, this.h);
                this.delay--;
                if (this.delay == 0)
                    avocados[this.boardY][this.boardX] = null;
                return;
            }
            this.duration--;
            if (this.duration == 0) {
                this.die();
                avocados[this.boardY][this.boardX] = null;
            }

            else
                this.crop();
        },
        crop: function (){
            ctx.globalAlpha = 0.4;
            rect(this.x, this.y, this.w, this.h, 'black');
            ctx.globalAlpha = 1.0;
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
            this.dead = true;
        },
        hit: function(){
            if (!this.dead){
//                console.log(images.pow, this.x, this.y, this.w, this.h);
//                ctx.drawImage(images.pow, this.x, this.y, this.w, this.h);
                this.killed = true;
                this.die();
            }
        }
    }
    avocados[i][j] = avocado;
}