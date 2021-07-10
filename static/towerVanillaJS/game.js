const LEFT = 37;
const RIGHT = 39;
const UP = 38;
//STATES
const IDLE = "IDLE";
const FALL = "FALL";
const GO_UP = "FALL";

const AX = 1.5;
const FRICTION = 2;
const MAX_VX = 30;
//FORCES
const G = 5;
const VY_JUMP = 30;
const VX_JUMP_FACT = 0.03;
// consts
const themeOn = false;
const WALL_WIDTH = 35;
const PLAYER_R = 20;
//assets
const images = {
  background: {}
};

var canvas=document.getElementById('game_canvas');
var ctx=canvas.getContext('2d');

//key Press & mouse movement Listeners
window.addEventListener('keydown',keyPress,false);
window.addEventListener('keyup',keyPress,false);

//canvas size
const WINDOW_WIDTH_CANVAS_RATIO= 0.7;
const WINDOW_HEIGHT_CANVAS_RATIO = 0.9;
const aspectRatio= 0.8; //images.background.width/images.background.height;
const maxWidth = (window.innerWidth * WINDOW_WIDTH_CANVAS_RATIO);
const maxHeight = (window.innerHeight * WINDOW_HEIGHT_CANVAS_RATIO);
let scaledMaxWidth = maxHeight * aspectRatio;
let scaleFactor = Math.min(1, maxWidth/scaledMaxWidth);
canvas.width=scaledMaxWidth * scaleFactor;
canvas.height=maxHeight * scaleFactor;
canvas.width=window.innerWidth;
canvas.height=window.innerHeight;

function clamp(val,min,max){
  return Math.min(Math.max(val, min), max);
}
function rect(xPos,yPos,width,height,color,invertX){
    ctx.fillStyle=color;
    if(invertX){
        xPos= -xPos+cWidth-pWidth
    }
    ctx.fillRect(xPos,yPos,width,height);
}
function circle(xPos,yPos,radius,color){
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.arc(xPos,cHeight - yPos,radius,0,2*Math.PI,false);
    ctx.fill();
}


function drawBG(){
    if(themeOn){
        ctx.drawImage(images.background,0,0, cWidth, cHeight);
    } else{
        rect(0,0,cWidth,cHeight,'black');
    }
}

//Settings
var cWidth 	=	canvas.width;
var cHeight	= canvas.height;
var player = {
  color: 'red',
  sprite: null,
  r: PLAYER_R,
  x: cWidth/2,
  y: PLAYER_R*2,
  vx: 0,
  vy: 0,
  w : 5,
  h: 10,
  ax: 0,
  ay: -G,
  state: IDLE,
  running: false,
  jumping: false,
  left :  function(){ this.ax = -AX;     this.running = true;}, //TODO collision
  right : function(){ this.ax = AX;      this.running = true;}, //TODO collision
  stop :  function(){ this.ax = -1 * Math.sign(this.ax) * FRICTION; this.running = false;},
  jump:   function(){
    if (!this.jumping){
      this.vy = VY_JUMP + VX_JUMP_FACT * this.vx * this.vx;
      this.jumping = true;
    }
  },
  checkCollisionX: function(){ return (this.x - this.r <= WALL_WIDTH) || (this.x + this.r >= (cWidth - WALL_WIDTH)); },
  collideX: function(){
    this.vx = -this.vx;
    this.ax = -this.ax;
    if (this.x - this.r <= WALL_WIDTH) {
      this.x = this.r + WALL_WIDTH;
    }
    if (this.x + this.r >= (cWidth - WALL_WIDTH)) {
      this.x = (cWidth - WALL_WIDTH) - this.r;
    }
  },
  checkFloorHit: function(){
    if (this.y - this.r <= 0) {
      if (!this.jumping)
        this.vy = 0;
      this.y = this.r;
      this.jumping = false;
    }
  }, // TODO PLATFORM
  collideY: function(){
    this.vx = -this.vx;
    this.ax = -this.ax;
  },
  stopped: function(){ return !this.running && ((this.ax < 0 && this.vx <= 0) || (this.ax > 0 && this.vx >= 0)); },
  move : function(){
    this.vy = this.vy + this.ay;
    this.vx = clamp(this.vx + this.ax, -MAX_VX, +MAX_VX);
    if (this.stopped()){
        this.vx = 0
        this.ax = 0
    }
    if (this.checkCollisionX())
      this.collideX();

    this.x += this.vx;
    this.y += this.vy;
    this.checkFloorHit();
  },
  draw: function(){
    this.move();
    if(themeOn) ctx.drawImage(images.background,0,0, cWidth, cHeight);
    else circle(this.x,this.y,this.r,this.color);
  }
}

function keyPress(e){
  e.preventDefault();
  if (e.repeat) return;
  var key=e.which || e.keyCode;
  switch(e.type){
      case "keydown":
          switch(key){
              case UP: player.jump(); break;
              case RIGHT: player.right(); break;
              case LEFT: player.left(); break;
              default: break;
          }
          break;
      case 'keyup':
          switch(key){
              case RIGHT: player.stop(); break;
              case LEFT: player.stop(); break;
              default: break;
          }
          break;
      default: break;
  }
}


function drawWalls(){
  rect(0, 0, WALL_WIDTH, cHeight, 'blue'); // LEFT WALL
  rect(cWidth-WALL_WIDTH, 0, WALL_WIDTH, cHeight); // RIGHT WALL
}

const FLAME_SPACE = 40;
const FLAME_SIZE = 30;
const N_FLAME_FRAMES = 12;
const N_FLAME_FRAMES_X = 4;
const N_FLAME_FRAMES_Y = 3;
const MIN_FRAME_SCALE = 0.7;
const MAX_FRAME_SCALE = 3;
var FLAMES_W, FLAMES_H, flamesAspectRatio;

var flameFrames = [];
var flameFramesSizes = []

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randN(min, max) {
  return (Math.random() * (max - min + 1)) + min;
}
function initFlames(){
    FLAMES_W = images.flames.width/N_FLAME_FRAMES_X;
    FLAMES_H = images.flames.height/N_FLAME_FRAMES_Y;
    flamesAspectRatio = FLAMES_H/FLAMES_W;
    for (let x = 0; x <= cWidth; x += FLAME_SPACE) {
        flameFrames.push(randInt(0, N_FLAME_FRAMES-1));
        flameFramesSizes.push(randN(MIN_FRAME_SCALE,MAX_FRAME_SCALE) * FLAME_SIZE);
    }

}

function drawFlames(){
    for (let i = 0; i < flameFrames.length; i++) {
        let frameIdx = flameFrames[i];
        let flameH = flameFramesSizes[i] * flamesAspectRatio;
        let flameW = flameFramesSizes[i];
        let xCoord = (frameIdx % N_FLAME_FRAMES_X) * FLAMES_W;
        let yCoord = Math.floor(frameIdx / N_FLAME_FRAMES_X) * FLAMES_H;

        ctx.drawImage(images.flames, xCoord ,yCoord ,FLAMES_W, FLAMES_H, FLAME_SPACE * i ,cHeight - flameH * 0.8, flameW, flameH); //TODO check dx, dy
        flameFrames[i] = (flameFrames[i] + 1) % N_FLAME_FRAMES; // FIXED ORDER
//        flameFrames[i] = randInt(0, N_FLAME_FRAMES-1); // COMPLETE CHAOS
    }
}
// render
var lastTS = Date.now();
var dt;
function render(){
    const now = Date.now();
    const dt = now - lastTS;
    lastTS = now;
    drawBG();
    drawWalls();
    drawFlames();
    player.draw();
    requestAnimationFrame(render);
}


function loadImages(){
    let imageList = ["flames"];
    let numOfImages = imageList.length;
    for (let img of imageList) {
        images[img] = new Image();
        images[img].src = `assets/images/${img}.png`;
    }
}
function main(){
    loadImages();
    initFlames();
    console.log(flameFrames);
    requestAnimationFrame(render);
}

main();

// debug prints
document.addEventListener('keydown', e => console.log('down', e.keyCode));
document.addEventListener('keyup', e => console.log('up', e.keyCode));
