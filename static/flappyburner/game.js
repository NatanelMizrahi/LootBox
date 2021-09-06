import {postScore, getGameHighScore, postGameHighScore} from '../common/scoreAPI.js'
import {THEME_ON, SHOW_HITBOX, canvas, ctx, clamp,} from '../common/common.js'

// SCORE
const SUBMIT_SCORE_DELTA = 10;

// scoreboard
var highscore = 0;
var score = 0;
var prevScore = 0;
function updateScore(val) {
    score = Math.max(val,score);
    if (score - prevScore > SUBMIT_SCORE_DELTA) {
        let normalizedScore = (score - prevScore)/SUBMIT_SCORE_DELTA;
        postScore(normalizedScore);
        prevScore = score;
    }
}

function initHighScore(){
    getGameHighScore('flappyburner')
    .then(gameHighScore => highscore = gameHighScore);
}
function submitHighScore(){
    postGameHighScore('flappyburner', score)
    .then(gameHighScore => highscore = gameHighScore);
}
function range(start, stop, step) {
    if (typeof stop == 'undefined') {
        // one param defined
        stop = start;
        start = 0;
    }

    if (typeof step == 'undefined') {
        step = 1;
    }

    if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
        return [];
    }

    var result = [];
    for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
        result.push(i);
    }

    return result;
};


var images = {};
loadImages();

function loadImages() {
    let imageList = ["flappybg", "bird", "cactus"];
    let imageLoadedPromises = [];
    for (let img of imageList) {
        images[img] = new Image();
        images[img].src = `assets/images/${img}.png`;
        imageLoadedPromises.push(new Promise(resolve => images[img].onload = resolve));
    }
    Promise.all(imageLoadedPromises).then(loaded => {
        playGame();
        initHighScore();
    });
}


function playGame() {
    //canvas size
    const WINDOW_WIDTH_CANVAS_RATIO = 0.7;
    const WINDOW_HEIGHT_CANVAS_RATIO = 1;

    const aspectRatio = 16 / 9 // images.flappybg.width / images.flappybg.height;
    const maxWidth = (window.innerWidth * WINDOW_WIDTH_CANVAS_RATIO);
    const maxHeight = (window.innerHeight * WINDOW_HEIGHT_CANVAS_RATIO);
    let scaledMaxWidth = maxHeight * aspectRatio;
    let scaleFactor = Math.min(1, maxWidth / scaledMaxWidth);
    canvas.width = scaledMaxWidth * scaleFactor;
    canvas.height = maxHeight * scaleFactor;

    //Settings
    var cWidth = canvas.width;
    var cHeight = canvas.height;
    const stoneHeight = 55;
    var pHeight = 85;
    var pWidth = 15;

    //Controls
    var paused = false;

    //game render interval
    requestAnimationFrame(render);

    var birdFrames = {
        frameRate: 15.0,
        frameI: 0,
        frameJ: 0,
        numSprites: 9,
    }
    const numBirdW = 5
    const numBirdH = 3
    const birdW = images.bird.width / numBirdW;
    const birdH = images.bird.height / numBirdH;

    var cactusFrames = {
        frameRate: 5,
        hit: 0,
        sprites: range(74),
        frameI: 0,
        frameJ: 0,
    }

    const numCactusW = 6
    const numCactusH = 13
    const cactusW = images.cactus.width / numCactusW;
    const cactusH = images.cactus.height / numCactusH;

    function onEndGame() {
        submitHighScore()
        resetGameState()
//        player.dead = true;
    }

    function nowSec() {
        return 0.001 * Date.now()
    }

    function calculateDt() {
        const now = nowSec();
        const dt = now - previousRenderTime;
        previousRenderTime = now;
        return {now, dt};
    }

    //graphics
    let previousRenderTime = nowSec();

    function resetGameState() {
        obstacles = []
        player.distanceCovered = 0
        player.y = cHeight / 2
        player.x = player.initialX
        player.vy = player.initialVY
        previousRenderTime = nowSec();
        prevGenDistance = 0;
        sceneSpeed = sceneInitialSpeed;
    }

    function render() {

        if (paused) {
            requestAnimationFrame(render);
            return
        }

        const {now, dt} = calculateDt();
        drawBG(now, dt);
        renderPlayer(now, dt);
        renderObstacles(now, dt);
        const endGame = computeHitBox();
        scoreBoard(now, dt, endGame);

        if (endGame) onEndGame();

        requestAnimationFrame(render);
    }
    const sceneInitialSpeed = 300;
    const sceneAcceleration = 10;
    let sceneSpeed = sceneInitialSpeed;

    let prevGenDistance = 0;
    let obstacles = [];

    function renderObstacles(now, dt) {
        const obstacleGenInterval = 300 + (1200 - 300) * Math.random()
        if (player.distanceCovered > (prevGenDistance + obstacleGenInterval)) {
            prevGenDistance = player.distanceCovered
            let obstacle = {
                y: cHeight,
                x: cWidth,
                scale: (0.3 + 1.7 * Math.random()),
                up: false,
                down: false,
                checkRange: function () {
                    return this.x >= 0 && this.x <= cWidth && this.y >= 0 && this.y <= cHeight
                },
                move: function (dt) {
                    this.y = (0.9 * cHeight) - (this.radiusY() * 2)
                    this.x = this.x - sceneSpeed * dt
                },
                radiusX: function () {
                    return this.scale * cactusW * 0.5
                },
                radiusY: function () {
                    return this.scale * cactusH * 0.5
                },
                getCenter: function () {
                    return [this.x + this.radiusX(), this.y + this.radiusY()]
                },

                contains: function (p) {
                    const delta = [this.x - p.x, this.y - p.y]
                    const dist = Math.sqrt(delta[0] * delta[0] + delta[1] * delta[1])
                    return dist < (p.hitBoxRadius() + this.hitBoxRadius())
                },
                hitBoxFactor: 0.7,
                hitBoxRadius: function () {
                    return Math.max(this.radiusX(), this.radiusY()) * this.hitBoxFactor
                }
            }
            obstacles.push(obstacle)
        }
        obstacles = obstacles.filter(obstacle => obstacle.checkRange())
        obstacles.forEach(obstacle => obstacle.move(dt))
        obstacles.forEach(
            obstacle => {
                const arr = cactusFrames.sprites;
                const index = (Math.floor(now * cactusFrames.frameRate) % arr.length);
                cactusFrames.frameI = index % numCactusW;
                cactusFrames.frameJ = Math.floor(index / numCactusH);
                if (SHOW_HITBOX) {
                    ctx.save()
                    circle(obstacle.x, obstacle.y, obstacle.hitBoxRadius(), 'red')
                    ctx.restore()
                }
                ctx.save()
                ctx.drawImage(
                    images.cactus, cactusW * cactusFrames.frameI, cactusH * cactusFrames.frameJ, cactusW, cactusH,
                    obstacle.x - obstacle.radiusX(), obstacle.y - obstacle.radiusY(), obstacle.radiusX() * 2, obstacle.radiusY() * 2
                );
                if (SHOW_HITBOX) {
                    ctx.beginPath();
                    ctx.strokeStyle = 'green';
                    ctx.moveTo(obstacle.x, obstacle.y)
                    ctx.lineTo(player.x, player.y)
                    ctx.stroke()
                }
                ctx.restore()
                return obstacle
            }
        )
    }

    let player = {
        y: cHeight / 2,
        x: 100,
        size: pHeight,
        radius: pHeight * 0.5,
        reverse: false,
        color: 'white',
        score: 0,
        scale: 0.5,
        up: false,
        right: false,
        left: false,
        vy: -500,
        vx: 500,
        initialX: 100,
        initialVY: -500,
        upKey: 38,
        rightKey: 39,
        leftKey: 37,
        downKey: 40,
        Key: 37,
        yMax: cHeight,
        yMin: 0,
        xMax: cWidth,
        xMin: 0,
        distanceCovered: 0,
        getCenter: function () {
            return [this.x + this.radius, this.y + this.radius]
        },
        checkRange: function () {
            return this.x >= 0 && this.x < cWidth && this.y >= 0 && this.y < cHeight
        },


        move: function (dt) {
            const acceleration = 1500.0 * (this.up ? -1.0 : 1.0) // pixels / s^2
            this.vy = this.vy + acceleration * dt
            const new_y = this.y + this.vy * dt + 0.5 * acceleration * dt * dt
            this.y = clamp(new_y, this.yMin, this.yMax)
            if (this.y !== new_y) this.vy = 0
            let new_x = this.x
            if (this.right) {
                new_x += this.vx * dt
            } else if (this.left) {
                new_x -= this.vx * dt
            }
            this.x = clamp(new_x, this.xMin, this.xMax)
        },

        onUpKeyPress: function (e) {
            switch (e.keyCode) {
                case this.upKey: {
                    this.up = true
                    if (!e.repeat) {
                        this.vy = 0
                    }
                    break;
                }
                case this.rightKey: {
                    this.right = true
                    break;
                }
                case this.leftKey: {
                    this.left = true
                    break;
                }
                case this.downKey: {
                    this.up = false;
                    if (!e.repeat && this.vy <= 0){
                        this.vy = 0;
                    }
                    break;
                }
            }
        },
        onUpKeyRelease: function (e) {
            // if (e.keyCode !== this.upkey) return;
            switch (e.keyCode) {
                case this.upKey: {
                    this.up = false
                    break;
                }
                case this.rightKey: {
                    this.right = false
                    break;
                }
                case this.leftKey: {
                    this.left = false
                    break;
                }
            }
        },
        calcScore: function (dt) {
            this.distanceCovered += sceneSpeed * dt
            this.score = Math.floor(this.distanceCovered * 0.02)
            if ((this.score % 20) === 0) {
                updateScore(this.score / 2);
            }
        },
        hitBoxFactor: 0.7,
        hitBoxRadius: function () {
            return this.radius * this.hitBoxFactor
        },
        touchesFloorOrCeiling: function () {
            return (this.y >= cHeight) || (this.y <= 0);
        }
    }

    window.addEventListener('keydown', (e) => player.onUpKeyPress(e), false)
    window.addEventListener('keyup', (e) => player.onUpKeyRelease(e), false)


    function renderPlayer(now, dt) {
        player.move(dt)
        player.calcScore(dt)

        const index = (Math.floor(Math.floor(now * birdFrames.frameRate)) % birdFrames.numSprites);
        birdFrames.frameI = index % numBirdW;
        birdFrames.frameJ = Math.floor(index / numBirdH);
        if (SHOW_HITBOX) {
            ctx.save()
            circle(player.x, player.y, player.hitBoxRadius(), 'red')
            ctx.restore()
        }
        ctx.save()
        ctx.drawImage(images.bird, birdW * birdFrames.frameI, birdH * birdFrames.frameJ, birdW, birdH, player.x - player.radius, player.y - player.radius, player.size, player.size);
        ctx.restore()
    }

    function computeHitBox() {
        let endGame = false;
        obstacles.forEach((obstacle) => {
            if (obstacle.contains(player)) {
                endGame = true;
            }

        })
        if (player.touchesFloorOrCeiling()) {
            endGame = true;
        }
        return endGame;
    }

    let seemX = 0

    function drawBG(now, dt) {
        if (THEME_ON) {
            sceneSpeed = sceneSpeed + dt * sceneAcceleration
            seemX = (seemX - sceneSpeed * dt) % cWidth
            ctx.save()
            ctx.translate(seemX, 0)
            ctx.drawImage(images.flappybg, 0, 0, cWidth, cHeight);
            ctx.translate(cWidth, 0)
            ctx.drawImage(images.flappybg, 0, 0, cWidth, cHeight);
            ctx.restore()
        } else {
            rect(0, 0, cWidth, cHeight, 'black');
        }
    }

    function scoreBoard(now, dt, endGame) {
        ctx.save()
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = '15px uroob';
        ctx.fillText('Score', 2 * 0.25 * cWidth, cHeight / 8);
        ctx.fillText('Highscore', 3 * cWidth/4, cHeight/8);
        ctx.font = '80px uroob';
        ctx.fillText(player.score, 2 * 0.25 * cWidth, cHeight / 8 + 70);
        ctx.fillText(highscore,   3 * cWidth/4, cHeight/8 + 70);
        ctx.restore()
    }

    //Canvas shapes
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
        ctx.arc(xPos, yPos, radius, 0, 2 * Math.PI, false);
        ctx.fill();
    }


}
