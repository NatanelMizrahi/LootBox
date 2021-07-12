const LEFT = 37;
const RIGHT = 39;
const UP = 38;
//STATES

//directions
const IDLE = "IDLE";
const DEAD = "DEAD";
const JUMPING = "JUMPING";
const RUNNING = "RUNNING";

const PLAYER_ANIMATION_INTERVAL = 4;
const N_PLAYER_FRAMES = 16;
const PLATFORMS_Y_INTERVAL = 100;
const MIN_PLATFORM_W = 100;
const MAX_PLATFORM_W = 400;

const stateFrames = {
    IDLE: [0],
    DEAD: range(10 * N_PLAYER_FRAMES, 10 * N_PLAYER_FRAMES + 3),
    JUMPING: range(2 * N_PLAYER_FRAMES, 2 * N_PLAYER_FRAMES + 5),
    RUNNING: range(1, 1 + 7)

};
var score = 0;
const AX = 0.9;
const FRICTION = 1.2;
const MAX_VX = 20;
//FORCES
const G = 5;
const VY_JUMP = 40;
const VX_JUMP_FACT = 0.03;
const VX_WALLJUMP_FACT = 2 * VX_JUMP_FACT;
// consts
const themeOn = false;
const showHitbox = false;
const WALL_WIDTH = 35;
const PLAYER_R = 20;
const PLATFORM_VY = 1;
const PLATFORM_HEIGHT = 30;
const PLATFORM_DELTA = 5;
const SCALE_PLAYER_IMG = 1.4;
//assets
const images = {};

var canvas = document.getElementById('game_canvas');
var ctx = canvas.getContext('2d');

//key Press & mouse movement Listeners
window.addEventListener('keydown', keyPress, false);
window.addEventListener('keyup', keyPress, false);

//canvas size
const WINDOW_WIDTH_CANVAS_RATIO = 0.7;
const WINDOW_HEIGHT_CANVAS_RATIO = 0.9;
const aspectRatio = 0.8; //images.background.width/images.background.height;
const maxWidth = (window.innerWidth * WINDOW_WIDTH_CANVAS_RATIO);
const maxHeight = (window.innerHeight * WINDOW_HEIGHT_CANVAS_RATIO);
let scaledMaxWidth = maxHeight * aspectRatio;
let scaleFactor = Math.min(1, maxWidth / scaledMaxWidth);
//canvas.width=scaledMaxWidth * scaleFactor;
//canvas.height=maxHeight * scaleFactor;
canvas.left = window.innerWidth * 0.25;
canvas.width = window.innerWidth * 0.75;
canvas.height = window.innerHeight;

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

function rect(xPos, yPos, width, height, color, invertX) {
    ctx.fillStyle = color;
    if (invertX) {
        xPos = -xPos + cWidth - pWidth
    }
    ctx.fillRect(xPos, yPos, width, height);
}

function circle(xPos, yPos, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(xPos, cHeight - yPos, radius, 0, 2 * Math.PI, false);
    ctx.fill();
}


function drawBG() {
    if (themeOn) {
        ctx.drawImage(images.background, 0, 0, cWidth, cHeight);
    } else {
        rect(0, 0, cWidth, cHeight, 'black');
    }
}

//Settings
var cWidth = canvas.width;
var cHeight = canvas.height;
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
        this.ax = -AX;
        this.running = true;
    },
    right: function() {
        this.ax = AX;
        this.running = true;
    },
    stop: function() {
        this.running = false;
        if (!this.jumping) // TODO check
            this.ax = -1 * Math.sign(this.ax) * FRICTION;
    },
    jump: function() {
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
            if (!this.dead)
                this.jump();
            this.jumping = false;
            this.dead = true;
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
                this.alignPlatformY(this.platform);
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
                    player.right();
                    break;
                case LEFT:
                    player.left();
                    break;
                default:
                    break;
            }
            break;
        case 'keyup':
            switch (key) {
                case RIGHT:
                    player.stop();
                    break;
                case LEFT:
                    player.stop();
                    break;
                default:
                    break;
            }
            break;
        default:
            break;
    }
}

var wallPattern;

function initWalls() {
    wallPattern = ctx.createPattern(images.wall, 'repeat');
}

function drawWalls() {
    //
    //  rect(0, 0, WALL_WIDTH, cHeight, 'blue'); // LEFT WALL
    //  rect(cWidth-WALL_WIDTH, 0, WALL_WIDTH, cHeight); // RIGHT WALL
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

function removeOutOfBoundsPlatforms() {
    let i = 0;
    while (i > platforms.length && platforms[i].y <= 0)
        i++;
    platforms.splice(0, i);
}

function addPlatformsFromTop() {

    let topPlatformY = platforms[platforms.length - 1].y;
    console.log(topPlatformY, platforms.map(p => p.y));
    if (topPlatformY <= cHeight - PLATFORMS_Y_INTERVAL) {
        let platformWidth = randInt(MIN_PLATFORM_W, MAX_PLATFORM_W);
        let platformOffset = randInt(WALL_WIDTH, cWidth - WALL_WIDTH - platformWidth);
        createPlatform(images.log, platformOffset, cHeight, platformWidth, PLATFORM_HEIGHT);
    }
}

function updatePlatforms() {
    removeOutOfBoundsPlatforms();
    addPlatformsFromTop();
}

function initPlatforms() {
    createPlatform(images.log, cWidth / 4, cHeight / 2, cWidth / 2, PLATFORM_HEIGHT);
    createPlatform(images.log, cWidth / 2, cHeight / 2 + 100, 300, PLATFORM_HEIGHT);

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

// render
var lastTS = Date.now();
var dt;

function render() {
    const now = Date.now();
    const dt = now - lastTS;
    lastTS = now;
    drawBG();
    drawWalls();
    drawFlames();
    drawPlatforms();
    player.draw();
    updateScore();
    requestAnimationFrame(render);
}


function loadImages() {
    let imageList = ["player", "player_inv", "flames", "wall", "log"];
    let numOfImages = imageList.length;
    for (let img of imageList) {
        images[img] = new Image();
        images[img].src = `assets/images/${img}.png`;
    }
}

function updateScore(val = 1) {
    score += val;
}

function main() {
    loadImages();
    initFlames();
    initPlatforms();
    initWalls();
    requestAnimationFrame(render);

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

function createPlatform(image, dx, dy, dWidth, dHeight) {
    let platform = {
        img: image,
        vy: PLATFORM_VY,
        x: dx, // top left x coord
        y: dy, // top left y coord
        w: dWidth,
        h: dHeight,
        visible: true,
        move: function() {
            this.y -= this.vy;
        },
        draw: function() {
            this.move();
            ctx.drawImage(this.img, this.x, cHeight - this.y, this.w, this.h);
        }
    };
    console.log(dy, '!!');
    platforms.push(platform);
}

function getPossiblePlatformsForPlayer(player) {
    return platforms;
}
//
//--- --- ---
//----- ---- --
//
//p
//if vx <=0 && p.
//
//landed