import {
    postScore,
    getGameHighScore,
    postGameHighScore
} from '../common/scoreAPI.js'
import {
    images,
    canvas,
    ctx,
    RESTART_KEY_CODE,
    MUTE_KEY,
    PRODUCTION,
    THEME_ON,
    SHOW_HITBOX,
    FLAMES_ON_DEAD_ONLY,
    DEFAULT_MUTED,
    gameOverMessage,
    rect,
    circle,
    range,
    randInt,
    randFloat,
    clamp,
    drawScoreBoard,
    loadImages,
    toggleTheme,
    loadGame,
    gamePad,
    clearCanvas
} from '../common/common.js';
const UP = 38;
const DOWN = 40;
const INIT_HP = 5;
const HEART_SIZE = 30;
const PLAYER_SPEED = 5;
const DIFFICULTY_STEP = 1;
const MIN_BALL_Y_SPEED = 1;
const MAX_BALL_Y_SPEED = 3;
const INIT_DIFFICULTY = 2;
const SUBMIT_SCORE_DELTA = 1;
const CORNER_HIT_SPEED_FACT_Y = 0.3;
const CORNER_HIT_SPEED_FACT_X = 0.2;
const PLAYER_SCALE = 1.5;
const NUM_AUDIOS = 24;

function drawHP() {
    for (let i = 0; i < player.hp; i++) {
        ctx.drawImage(images.heart, i * HEART_SIZE, HEART_SIZE, HEART_SIZE, HEART_SIZE);
    }
}

function drawImage(ctx, image, x, y, w, h, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.drawImage(image, 0, 0, image.width, image.height, -w / 2, -h / 2, w, h);
    ctx.restore();
}
class Portal {
    static PLAYER_MARGIN_WIDTH = 200;
    static MIN_PORTAL_DISTANCE = 150;
    static MIN_PORTAL_HEIGHT_FACTOR = 5;
    static MAX_PORTAL_HEIGHT_FACTOR = 20;
    static MIN_PORTAL_WIDTH_FACTOR = 3;
    static MAX_PORTAL_WIDTH_FACTOR = 5;
    static MIN_PORTAL_DURATION = 50;
    static MAX_PORTAL_DURATION = 300;
    static MAX_PORTAL_DELAY = 100;
    static ALPHA_INCREMENT = 0.1;
    static LEFT = "LEFT";
    static RIGHT = "RIGHT";

    constructor(canvas, ball) {
        this.alpha = 0;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ball = ball;
        this.ballEnteredPortal = false;
        this.ballInPortal = null;
        this.ballOutPortal = null;
        this.randomizeParams();
    }
    randomizeDims() {
        // Portal dimensions are relative to the ball radius
        let r = this.ball.radius;
        let height = r * this.randomInRange(Portal.MIN_PORTAL_HEIGHT_FACTOR, Portal.MAX_PORTAL_HEIGHT_FACTOR);
        let width = r * this.randomInRange(Portal.MIN_PORTAL_WIDTH_FACTOR, Portal.MAX_PORTAL_WIDTH_FACTOR);
        this.height = Math.min(height, this.canvas.height * 0.5);
        this.width = width;
    }
    randomizeXCoordinates() {
        let minPortalXMargin = Portal.PLAYER_MARGIN_WIDTH + (this.width / 2);
        let minLeftPortalX = minPortalXMargin;
        let maxRightPortalX = this.canvas.width - minPortalXMargin;
        let minPortalCentersDistance = Portal.MIN_PORTAL_DISTANCE + this.width;
        let maxLeftPortalX = this.canvas.width - (minPortalXMargin + minPortalCentersDistance);
        this.leftPortalX = this.randomInRange(minLeftPortalX, maxLeftPortalX);
        let minRightPortalX = this.leftPortalX + minPortalCentersDistance;
        if (minRightPortalX > maxRightPortalX) minRightPortalX = maxRightPortalX;
        this.rightPortalX = this.randomInRange(minRightPortalX, maxRightPortalX);
    }
    randomizeYCoordinates() {
        let minPortalY = this.height / 2;
        let maxPortalY = this.canvas.height - minPortalY;
        this.leftPortalY = this.randomInRange(minPortalY, maxPortalY);
        this.rightPortalY = this.randomInRange(minPortalY, maxPortalY);
    }
    randomizeCoordinates() {
        this.randomizeYCoordinates();
        this.randomizeXCoordinates();
        this.coordinates = {};
        this.coordinates[Portal.LEFT] = {
            x: this.leftPortalX,
            y: this.leftPortalY
        };
        this.coordinates[Portal.RIGHT] = {
            x: this.rightPortalX,
            y: this.rightPortalY
        };
    }

    randomizeDuration() {
        this.delay = this.randomInRange(0, Portal.MAX_PORTAL_DELAY);
        this.duration = this.randomInRange(Portal.MIN_PORTAL_DURATION, Portal.MAX_PORTAL_DURATION);
    }

    randomizeParams() {
        this.randomizeDims();
        this.randomizeCoordinates();
        this.randomizeDuration();
    }
    randomInRange(low, high) {
        return Math.floor(Math.random() * (high - low)) + low;
    }

    drawPortal() {
        this.alpha = Math.min(1, this.alpha + Portal.ALPHA_INCREMENT);
        drawImage(this.ctx, images.portal, this.leftPortalX, this.leftPortalY, this.width, this.height, this.alpha);
        drawImage(this.ctx, images.portal, this.rightPortalX, this.rightPortalY, this.width, this.height, this.alpha);
    }
    pointInsidePortal(x, y, padding = 0) {
        // Returns the portal in which the (x,y) coordinates resides in, with a specified padding,
        // or null if not in a portal

        // The region bounded by the ellipse centered at (h,k), with semi-major axis rx, semi-minor axis ry
        // is given by the equation (x-h)^2/rx^2 + (y-k)^2/ry^2 <=1
        let sq = num => Math.pow(num, 2);
        let rx = this.width / 2 - padding;
        let ry = this.height / 2 - padding;
        for (let portal in this.coordinates) {
            let h = this.coordinates[portal].x;
            let k = this.coordinates[portal].y;
            if (sq(x - h) / sq(rx) + sq(y - k) / sq(ry) <= 1)
                return portal;
        }
        return null;
    }

    exitPortal() {
        this.ballInPortal = null;
        this.ballEnteredPortal = false;
    }
    teleportBall() {
        // draw ball on both sides of the portal and clip the relevant half in each
        if (!this.ballEnteredPortal) {
            this.ballOnRightSide = this.coordinates[this.ballInPortal].x <= this.ball.x;
            this.ballEnteredPortal = true;
        }
        let ballX = this.ball.x;
        let ballY = this.ball.y;
        let ballRelativeX = this.coordinates[this.ballInPortal].x - ballX;
        let ballRelativeY = this.coordinates[this.ballInPortal].y - ballY;
        this.drawClippedBallInPortal(this.ballInPortal, this.ballOnRightSide);

        this.ball.x = this.coordinates[this.ballOutPortal].x - ballRelativeX;
        this.ball.y = this.coordinates[this.ballOutPortal].y - ballRelativeY;
        this.drawClippedBallInPortal(this.ballOutPortal, !this.ballOnRightSide);
        // check if ball is out of the other side yet
        let currentPortal = this.pointInsidePortal(ballX, ballY, this.ball.radius / 2);
        if (this.ballInPortal === currentPortal) {
            this.ball.x = ballX;
            this.ball.y = ballY;
        } else {
            this.exitPortal();
        }
    }

    drawClippedBallInPortal(portal, OnRightSide) {
        this.ctx.save();
        this.ctx.beginPath();
        let offsetX = OnRightSide ? 0 : this.width;
        this.ctx.rect(this.coordinates[portal].x - offsetX, 0, this.width, this.canvas.height);
        this.ctx.closePath();
        this.ctx.clip();
        this.ball.draw();
        this.ctx.restore();
    }

    drawBall() {
        if (this.ballInPortal === null) {
            this.ballInPortal = this.pointInsidePortal(this.ball.x, this.ball.y, this.ball.radius);
            if (this.ballInPortal === null) {
                this.ball.draw();
                return;
            }
        }
        this.ballOutPortal = this.ballInPortal === Portal.LEFT ? Portal.RIGHT : Portal.LEFT;
        this.teleportBall();
    }
    tick() {
        if (this.delay === 0 && this.duration === 0) {
            this.alpha = 0;
            this.randomizeParams();
        }
        if (this.delay > 0) {
            this.delay--;
            this.ball.draw();
        } else {
            this.drawPortal();
            this.drawBall();
            this.duration--;
        }
    }
}

//audio files
var audios = [];
loadAudioEffects();

function loadAudioEffects() {
    for (let i = 0; i < NUM_AUDIOS; i++) {
        audios.push(new Audio(`assets/audio/${i}.wav`))
    }
}

canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

//Settings
var cWidth = canvas.width;
var cHeight = canvas.height;
var pHeight = 85 * PLAYER_SCALE;
var pWidth = 15 * PLAYER_SCALE;
var spacing = 10 * PLAYER_SCALE;
var strpSize = 15;
var stripClr = "white";
var playerSpeed = 15;
var playerAspectRatio = 0.25;

//Controls
var default_settings = true;
var multiplayer = false;
var roundEdges = true;
var default_speed = 6;
var difficulty = INIT_DIFFICULTY;
var autoplay = true;
var paused = false;

//game render interval
var time = 0;
var frames = {
    frameRate: 5,
    hit: 0,
    sprites: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    frameI: 0,
    frameJ: 0
}
//Players and ball Objects
var player = {
    dead: false,
    hp: INIT_HP,
    y: cHeight / 2,
    size: pHeight,
    baseSpeed: playerSpeed,
    speed: 0,
    reverse: false,
    color: 'white',
    points: 0,
    up: false,
    down: false,
    bottom: function() {
        return this.y + this.size / 2
    },
    top: function() {
        return this.y - this.size / 2
    },
    checkRange: function() {
        if (this.bottom() > cHeight) this.y = cHeight - this.size / 2;
        if (this.top() < 0) this.y = this.size / 2;
    }
}

var computer = {
    y: cHeight / 2,
    size: pHeight,
    speed: PLAYER_SPEED,
    reverse: false,
    color: 'blue',
    points: 0,
    up: false,
    down: false,
    bottom: function() {
        return this.y + this.size / 2
    },
    top: function() {
        return this.y - this.size / 2
    },
    checkRange: function() {
        if (this.bottom() > cHeight) this.y = cHeight - this.size / 2;
        if (this.top() < 0) this.y = this.size / 2;
    }
}

function getRandYSpeed(){
    let baseSpeed = randFloat(MIN_BALL_Y_SPEED, MAX_BALL_Y_SPEED);
    let direction = randInt(0,1) ? 1: -1;
    return baseSpeed * direction * difficulty;
}
var ball = {
    x: cWidth / 2,
    y: cHeight / 2,
    xSpeed: -default_speed * difficulty,
    ySpeed: getRandYSpeed(),
    radius: 20,
    color: 'red',
    draw: drawBall
}

const portal = new Portal(canvas, ball);

var fw, fh;

function playGame() {
    fw = images.player.width / 5;
    fh = images.player.height / 4;
    gamePad.loop();
    requestAnimationFrame(render);
}

function reset() {
    if (!player.dead)
        return;
    score = 0;
    difficulty = INIT_DIFFICULTY;
    player.dead = false;
    player.hp = INIT_HP;
    render();
}


function setSpeed(factor){
    player.speed = player.baseSpeed * factor;
}
function stop(){
    player.speed = 0;
}
//key press handlers
window.addEventListener('keydown', keyDown, false);
window.addEventListener('keyup', keyUp, false);

function keyDown(e) {
    var key = e.which || e.keyCode;
    if (PRODUCTION)
        e.preventDefault();
    switch (key) {
        case UP:
            player.speed = -player.baseSpeed;
            e.preventDefault();
            break;
        case DOWN:
            player.speed = +player.baseSpeed;
            e.preventDefault();
            break;
        case RESTART_KEY_CODE:
            reset();
            break;
        case MUTE_KEY:
            toggleTheme();
            break;
    }
}

function keyUp(e) {
    var key = e.which || e.keyCode;
    switch (key) {
        case UP:
        case DOWN:
            player.speed = 0;
            break;
    }
}


//graphics
function render() {
    time++;
    clearCanvas();
    middleLine();
    drawScoreBoard(score, highscore);
    drawMessages();
    drawHP();
    if (!player.dead) {
        movePlayers();
        moveBall();
        portal.tick();
        drawPlayers();
        requestAnimationFrame(render);
    }
}

function drawBG() {
    ctx.drawImage(images.background, 0, 0, cWidth, cHeight);
}

function drawPlayers() {
    animate();
    computerMove();
}

function animate() {
    var arr = frames.sprites;
    var index = (Math.floor(time / frames.frameRate) % arr.length);
    frames.frameI = index % 5;
    frames.frameJ = Math.floor(arr[index] / 5);
    //animate player
    ctx.save();
    ctx.translate(spacing * 2, player.y);
    ctx.rotate(35 * Math.PI / 180);
    ctx.drawImage(images.player, fw * frames.frameI, fh * frames.frameJ, fw, fh, -fw / 4 * PLAYER_SCALE, -fh / 4* PLAYER_SCALE, fw / 2 * PLAYER_SCALE, fh / 2 * PLAYER_SCALE);
    ctx.restore();
    //animate computer
    ctx.save();
    ctx.translate(cWidth - spacing * 2, computer.y);
    ctx.rotate(-35 * Math.PI / 180);
    ctx.drawImage(images.computer, fw * frames.frameI, fh * frames.frameJ, fw, fh, -fw / 4* PLAYER_SCALE, -fh / 4* PLAYER_SCALE, fw / 2 * PLAYER_SCALE, fw / 2 * PLAYER_SCALE);
    ctx.restore();
}

//Game logics
//player=true, computer=false
function doScore(isPlayer1) {
    ball.x = cWidth / 2;
    ball.y = cHeight / 2;
    ball.xSpeed = default_speed * difficulty * 0.7;
    ball.ySpeed = getRandYSpeed();
    if (isPlayer1) {
        player.points++;
        updateScore(score + 1);
    } else {
        computer.points++;
        ball.xSpeed = -ball.xSpeed; //ball goes to P1's direction
        player.hp--;
        if (player.hp == 0) {
            player.dead = true;
            paused = true;
            submitHighScore();
        }
    }
    playRandomAudio();
}

function movePlayers() {
    player.y += player.speed;
    player.checkRange();
    if (computer.up) {
        computer.y -= computer.speed;
        computer.checkRange();
    }
    if (computer.down) {
        computer.y += computer.speed;
        computer.checkRange();
    }
}

function drawBall() {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate((time / 50) * ball.xSpeed);
    ctx.drawImage(images.ball, 0, 0, images.ball.width, images.ball.height, -ball.radius, -ball.radius, ball.radius * 2, ball.radius * 2);
    ctx.restore();
}

function moveBall() {
    //if hits horizontal walls, change direction.
    if ((ball.y + ball.radius > cHeight) || (ball.y - ball.radius < 0)) {
        ball.ySpeed = -ball.ySpeed;
        //ball stuck in top/bottom fix
        ball.y = (ball.y + ball.radius > cHeight) ? cHeight - ball.radius : ball.radius;
    }
    //if right player scores
    if ((ball.x - ball.radius) <= 0) {
        doScore(false);
    }
    //if left player scores
    if ((ball.x + ball.radius) >= cWidth) {
        doScore(true);
    }
    var topDist, bottomDist;

    //if left player hit the ball
    if (ball.xSpeed < 0 &&
        ((ball.x - ball.radius) <= (spacing + pWidth)) &&
        ((ball.y + ball.radius) >= (player.y - player.size / 2)) &&
        ((ball.y - ball.radius) <= (player.y + player.size / 2))) {
        ball.xSpeed = -ball.xSpeed; //change direction;

        //Check for corner hit
        topDist = player.top() - ball.y + ball.radius;
        bottomDist = ball.y - player.bottom() + ball.radius;
        if (topDist > 0) {
            ball.xSpeed += topDist * CORNER_HIT_SPEED_FACT_X;
            ball.ySpeed = -topDist * CORNER_HIT_SPEED_FACT_Y;
        }
        if (bottomDist > 0) {
            ball.xSpeed += bottomDist * CORNER_HIT_SPEED_FACT_X;
            ball.ySpeed = bottomDist * CORNER_HIT_SPEED_FACT_Y;
        }
    }

    //if right player hit the ball
    if (ball.xSpeed > 0 &&
        ((ball.x + ball.radius) >= (cWidth - spacing - pWidth)) &&
        ((ball.y + ball.radius) >= (computer.y - computer.size / 2)) &&
        ((ball.y - ball.radius) <= (computer.y + computer.size / 2))) {
        ball.xSpeed = -ball.xSpeed; //change direction;

        //Check for corner hit
        topDist = computer.top() - ball.y + ball.radius;
        bottomDist = ball.y - computer.bottom() + ball.radius;
        if (topDist > 0) {
            ball.xSpeed -= topDist * CORNER_HIT_SPEED_FACT_X;
            ball.ySpeed = -topDist * CORNER_HIT_SPEED_FACT_Y;

        }
        if (bottomDist > 0) {
            ball.xSpeed -= bottomDist * CORNER_HIT_SPEED_FACT_X;
            ball.ySpeed = bottomDist * CORNER_HIT_SPEED_FACT_Y;
        }
    }
    //Assure speed threshold is met
    var minSpeed = 2;
    ball.xSpeed = (ball.xSpeed > minSpeed || ball.xSpeed < -minSpeed) ? ball.xSpeed : ball.xSpeed + minSpeed;

    //Move ball
    ball.x += ball.xSpeed;
    ball.y += ball.ySpeed;
}

function computerMove() {
    if (computer.y < ball.y) {
        computer.y += computer.speed;
        computer.checkRange();
    }
    if (computer.y > ball.y) {
        computer.y -= computer.speed;
        computer.checkRange()
    }
}

function middleLine() {
    var x = 0;
    ctx.beginPath();
    ctx.strokeStyle = stripClr;
    ctx.lineWidth = 2;
    while (x < cHeight) {
        x += strpSize;
        ctx.lineTo(cWidth / 2, x);
        x += strpSize;
        ctx.moveTo(cWidth / 2, x);
    }
    ctx.stroke();
}

function playRandomAudio() {
    var index = Math.floor(Math.random() * audios.length);
    audios[index].play();
}

// scoreboard
var highscore = 0;
var score = 0;
var prevScore = 0;

function updateScore(val) {
    if (!player.dead) {
        score = val;
        if (score % DIFFICULTY_STEP == 0) {
            difficulty += 0.2;
        }
        let normalizedScore = (score - prevScore) / SUBMIT_SCORE_DELTA;
        postScore(normalizedScore);
        prevScore = score;
    }
}

function initHighScore() {
    getGameHighScore('pong')
        .then(gameHighScore => highscore = gameHighScore);
}

function submitHighScore() {
    postGameHighScore('pong', score)
        .then(gameHighScore => highscore = gameHighScore);
}

function drawMessages() {
    ctx.fillStyle = 'white';
    ctx.font = '20px uroob';
    if (player.dead) {
        ctx.fillText(gameOverMessage, cWidth / 2, cHeight / 2);
    }
    ctx.fillText("[Joystick/arrows:move (Hit edges to BOOST)][L2/M:toggle music]", cWidth/2, 30);

}

let imageList = ["background", "player", "computer", "portal", "heart", "ball"];

gamePad.onThumbstickPress(  1, setSpeed);
gamePad.onThumbstickRelease(1, function(){      player.speed = 0;              });

gamePad.onButtonPress("DOWN",  function(){ setSpeed(+1);  }, true);
gamePad.onButtonPress("UP",    function(){ setSpeed(-1);  }, true);
gamePad.onButtonPress("START", reset , true);
gamePad.onButtonPress("L2", toggleTheme, true);

gamePad.onButtonRelease("DOWN", stop);
gamePad.onButtonRelease("UP", stop);

gamePad.connect()
    .then(connected => loadGame(imageList))
    .then(playGame)
