import {postScore, getGameHighScore, postGameHighScore} from '../common/scoreAPI.js'
import {images, canvas, ctx, RESTART_KEY_CODE, MUTE_KEY, PRODUCTION, THEME_ON, SHOW_HITBOX, FLAMES_ON_DEAD_ONLY, DEFAULT_MUTED, gameOverMessage, rect, circle, range, randInt, randFloat, clamp, drawScoreBoard, loadAudio, loadImages, toggleTheme, loadGame, gamePad, clearCanvas, drawLogo} from '../common/common.js';

// Key mapping
const LEFT = 37;
const RIGHT = 39;
const UP = 38;
const DOWN = 40;
const HIT_KEY = 32; // space

// animation
const INITIAL_BG_VX = 1;
const N_PLAYER_FRAMES = 4;
const MAX_PLAYER_Y_MARGIN = 50;

//STATES
const IDLE = "IDLE";
const HIT = "HIT";

const stateFrames = {
    IDLE: [0],
    HIT: [0,1,1,1,2,2,1,1,1]
};

// SCORE
const SUBMIT_SCORE_DELTA = 10;

// PHYSICS
const ALLOW_WRAP = false;
const MAX_PLAYER_VX = 20;

const SPAWN_CHANCE = 0.002;
const INITIAL_MAX_AVOCADOS = 3;
const MAX_AVOCADOS_STEP = 10;

const HOLE_W = 70; //50;
const HOLE_H = HOLE_W;
const MALLET_W = HOLE_W * 1.1;
const MALLET_H = HOLE_H * 1.1;
const HOLE_RX = HOLE_W/2;
const HOLE_RY = HOLE_H/4;
const MALLET_OFFSET_X = -HOLE_W / 4;
const MALLET_OFFSET_Y = -HOLE_H / 2;

const AVO_H =  HOLE_H;
const AVO_W =  HOLE_W;
const AVO_MARGIN_TOP = AVO_H/4;
const PADDING = HOLE_H;
const HOLES_OFFSET_X = PADDING;
const HOLES_OFFSET_Y = 2 * HOLE_H + PADDING;
const N_HOLES_X = 5; //6;
const N_HOLES_Y = 5; //4;
const MALLET_MAX_X = (N_HOLES_X-1) * HOLE_W + HOLES_OFFSET_X;
const MALLET_MAX_Y = (N_HOLES_Y-1) * HOLE_H + HOLES_OFFSET_Y;
const HEART_SIZE = 30;
const INIT_HP = 10;


const MIN_AVO_SPEED = 2;
const MAX_AVO_SPEED = 5;
const MIN_AVO_DURATION = 150;
const MAX_AVO_DURATION = 250;
const AVO_DELAY = 20;
const HITTABLE_THRESHOLD = 0.25;

const BOSS_CHANCE = 0.1;
const BOSS_HP = 3
const BOSS_SCORE = BOSS_HP;
const BOSS_DURATION_RATIO = 1.15;


canvas.width = N_HOLES_X * HOLE_W + PADDING + HOLES_OFFSET_X;
canvas.height = N_HOLES_Y * HOLE_H + PADDING + HOLES_OFFSET_Y;
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
//        ctx.drawImage(images.background, 0, 0, cWidth, cHeight);
    } else {
        rect(0, 0, cWidth, cHeight, 'black');
    }
}

function drawHP(){
    for (let i = 0; i < player.hp; i++){
        ctx.drawImage(images.heart, i * HEART_SIZE, HEART_SIZE, HEART_SIZE, HEART_SIZE);
    }
}


var player = {
    color: 'red',
    dead: false,
    x: HOLES_OFFSET_X,
    y: HOLES_OFFSET_Y,
    w: MALLET_W,
    h: MALLET_H,
    vx: 0,
    vy: 0,
    hp: INIT_HP,
    boardX: 0,
    boardY: 0,
    tgtX: HOLES_OFFSET_X,
    tgtY: HOLES_OFFSET_Y,
    movingX: false,
    movingY: false,
    wrapping: false,
    hit: function(){
        this.state = HIT;
        this.animationFrameArr = stateFrames[HIT];
        let avocadoInHole = avocados[this.boardY][this.boardX];
        if (avocadoInHole != null)
            avocadoInHole.hit();
    },
    miss: function(){
        this.hp--;
        if (this.hp == 0){
            this.dead = true;
            submitHighScore();
        }
    },
    moveX: function(direction){
        this.movingX = true;
        let delta = (direction == RIGHT) ? 1 : -1;
        let prevBoardX = this.boardX;
        if (ALLOW_WRAP && this.wrapping) return;
        this.boardX += delta;
        if (this.boardX < 0 || this.boardX >= N_HOLES_X) {
            if (ALLOW_WRAP){
                this.wrapping = true;
                this.boardX = (this.boardX+ N_HOLES_X) % N_HOLES_X;
            } else {
                this.boardX = clamp(this.boardX, 0, N_HOLES_X-1);
            }
        }
        this.vx = (prevBoardX < this.boardX) ? MAX_PLAYER_VX : -MAX_PLAYER_VX;
        this.tgtX = HOLES_OFFSET_X + this.boardX * HOLE_W;
        this.vx = this.x < this.tgtX ? MAX_PLAYER_VX : -MAX_PLAYER_VX;
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
        this.vy = this.y < this.tgtY ? MAX_PLAYER_VX : -MAX_PLAYER_VX;
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
                this.wrapping = false;
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
                this.wrapping = false;
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
        if (SHOW_HITBOX)
            rect(this.x, this.y, this.w, this.h, this.color, 0.5);
        ctx.drawImage(img, fx, fy, fw, fh, this.x + MALLET_OFFSET_X, this.y + MALLET_OFFSET_Y, this.w, this.h);
        this.currFrameIdx = (this.currFrameIdx + 1) % this.animationFrameArr.length;
        this.checkIdle();
    },
    reset: function() {
        this.dead = false;
        this.x = HOLES_OFFSET_X;
        this.y = HOLES_OFFSET_Y;
        this.w = MALLET_W;
        this.h = MALLET_H;
        this.vx = 0;
        this.vy = 0;
        this.hp = INIT_HP;
        this.boardX = 0;
        this.boardY = 0;
        this.tgtX = HOLES_OFFSET_X;
        this.tgtY = HOLES_OFFSET_Y;
        this.movingX = false;
        this.movingY = false;
        this.wrapping = false;
        this.state = IDLE;
        this.animationFrameArr = stateFrames[this.state];
    }
}

// scoreboard
var highscore = 0;
var score = 0;
var prevScore = 0;
function updateScore(val) {
    if (!player.dead){
        score = Math.max(val,score);
        maxAvocados = Math.max(INITIAL_MAX_AVOCADOS, Math.floor(score / MAX_AVOCADOS_STEP));
        if (score - prevScore > SUBMIT_SCORE_DELTA) {
            let normalizedScore = (score - prevScore)/SUBMIT_SCORE_DELTA;
            postScore(normalizedScore);
            prevScore = score;
        }
    }
}

function initHighScore(){
    getGameHighScore('guacamole')
    .then(gameHighScore => highscore = gameHighScore);
}
function submitHighScore(){
    postGameHighScore('guacamole', score)
    .then(gameHighScore => highscore = gameHighScore);
}

function drawMessages(){
    ctx.fillStyle='white';
    ctx.font='20px uroob';
    if (player.dead){
        ctx.fillText(gameOverMessage, cWidth/2, cHeight/2);
    }
    ctx.fillText("[SPACE:hit][ARROW KEYS:move][M: toggle music]", cWidth/2, 30);

}


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
var numAvocados = 0;
var maxAvocados = INITIAL_MAX_AVOCADOS;

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

function drawAvocados(){
    if (numAvocados < maxAvocados && !player.dead) {
        for (let i = 0; i< N_HOLES_Y; i++){
            for (let j = 0; j< N_HOLES_X; j++){
                if (avocados[i][j] == null && (randFloat(0,1) < SPAWN_CHANCE)){
                    addAvocado(i,j);
                }
            }
        }
    }
    for (let row of avocados){
        for (let avo of row){
            if (avo != null)
                avo.draw();
        }
    }
}

function addAvocado(i,j){
    let holeX = j * HOLE_W + HOLES_OFFSET_X;
    let holeY = i * HOLE_H + HOLES_OFFSET_Y;
    let boss = randFloat(0,1) < BOSS_CHANCE;
    let hitScore = boss ? BOSS_SCORE :1;
    let hp = boss ? BOSS_HP : 1;
    let durationRation = boss? BOSS_DURATION_RATIO: 1;
    let avocado = {
        img: boss ? images.boss : images.avocado,
        isBoss : boss,
        hp: hp,
        hitScore : hitScore,
        x: holeX,
        y: holeY + AVO_H,
        holeX: holeX,
        holeY: holeY,
        tgtY: i * HOLE_H + HOLES_OFFSET_Y,
        w: AVO_W,
        h: AVO_H,
        boardX :j,
        boardY :i,
        duration: randInt(MIN_AVO_DURATION * durationRation,MAX_AVO_DURATION*durationRation),
        speed: -randInt(MIN_AVO_SPEED,MAX_AVO_SPEED),
        delay: AVO_DELAY,
        visible : true,
        hiding: false,
        hittable: true,
        dead: false,
        killed: false,
        move: function(){
            this.y += this.speed;
            if (this.y < this.tgtY){
                this.y = this.tgtY;
            }
            if (!this.dead && this.hidden()){
                this.die();
                player.miss();
            }
            if (this.dead) {
                this.delay--;
                if (this.delay == 0){
                    avocados[this.boardY][this.boardX] = null;
                    numAvocados--;
                }
            }
            this.duration--;
            if (this.duration == 0) {
                this.hide();
            }
            if (this.isHurt)
                this.toggleOpacity();
        },
        hidden: function(){
            let holeCenterY = this.holeY + HOLE_H/2;
            let holeBottom = holeCenterY + HOLE_RY;
            let avoTop = this.y + AVO_MARGIN_TOP;
            return this.hiding && (avoTop > holeBottom);
        },
        draw: function (){
            this.move();
            if (!this.dead)
                this.drawAvo();
            if (this.killed)
                ctx.drawImage(images.pow, this.holeX, this.holeY, this.w, this.h);
        },
        hide: function(){
            this.speed *=-1;
            this.hiding = true;
        },
        drawAvo: function (){
            if (SHOW_HITBOX)
                rect(this.x, this.y, this.w, this.h, 'black', 0.4);
            ctx.save();
            ctx.beginPath();
            let holeCenterX = this.holeX + HOLE_W/2;
            let holeCenterY = this.holeY + HOLE_H/2;
            let cw = false;
            ctx.ellipse(holeCenterX ,holeCenterY, HOLE_RX, HOLE_RY, 0, 0, Math.PI, cw);
            ctx.rect(this.holeX, holeCenterY - HOLE_W, this.w, this.h);
            ctx.closePath();

            ctx.clip();
            ctx.globalAlpha = this.opacity;
            ctx.drawImage(this.img, this.x, this.y, this.w, this.h);
            ctx.globalAlpha = 1;
            ctx.restore();
        },
        opacity: 1,
        toggleOpacity: function(){
            this.opacity = 1.5 - this.opacity;
        },
        die: function(){
            this.dead = true;
        },
        isHurt: false,
        hit: function(){
            this.hp--;
            this.isHurt = true;
            if (this.hp == 0 && !this.dead){
                this.killed = true;
                this.die();
                updateScore(score + this.hitScore);
            }
        }
    }
    avocados[i][j] = avocado;
    numAvocados++;
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
        case RESTART_KEY_CODE:
            reset(); //location.reload();
            break;
        case MUTE_KEY:
            toggleTheme();
            break;
    }
}

// render
function render() {
    clearCanvas();
    drawLogo();
    drawHP();
    drawHoles();
    drawAvocados();
    player.draw();
    drawScoreBoard(score,highscore);
    drawMessages();
    requestAnimationFrame(render);
}

function reset(){
    if (!player.dead)
        return;
    score = 0;
    prevScore = 0;
    player.reset();
}

function playGame() {
    initHoles();
    initAvocados();
    initBackground();
    initHighScore();
    gamePad.loop();
    requestAnimationFrame(render);
}

let imageList = ["background", "logo", "hole", "avocado", "boss", "mallet", "pow", "heart"];
let audioList = ["theme"];


gamePad.onThumbstickPress(  1, function(v){ player.move(v > 0 ? DOWN : UP);}, true);
gamePad.onThumbstickPress(  0, function(v){ player.move(v > 0 ? RIGHT : LEFT);}, true);

gamePad.onButtonPress("DOWN",   function(){ player.move(DOWN);   }, true);
gamePad.onButtonPress("UP",     function(){ player.move(UP);     }, true);
gamePad.onButtonPress("LEFT",   function(){ player.move(LEFT);   }, true);
gamePad.onButtonPress("RIGHT",  function(){ player.move(RIGHT);  }, true);
gamePad.onButtonPress(3,        function(){ player.hit();        }, true);
gamePad.onButtonPress("L2", toggleTheme, true);
gamePad.onButtonPress("START", reset , true);

gamePad.connect()
    .then(connected => loadGame(imageList, audioList))
    .then(playGame)
