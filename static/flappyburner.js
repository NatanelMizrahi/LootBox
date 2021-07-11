// const fetch = require('node-fetch');
const PORT = 5000
const HTTP_HEADER = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    'Access-Control-Allow-Origin': '*',
    'User-Agent': '*',
};

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
    let imageList = ["flappybg", "ball", "p1", "p2", "bird", "cactus"];
    let numOfImages = imageList.length;
    let counter = 0;
    for (img of imageList) {
        images[img] = new Image();
        images[img].src = `assets/images/${img}.png`;
    }
    for (img in images) {
        images[img].onload = function () {
            this.imageReady = true;
            counter++;
            $('#imgLoad').text(Math.floor(counter / numOfImages * 100));
            if (counter == numOfImages) isLoaded();
        }
    }
}

function hideLoadingScreen() {
    $('#loadingMenu').hide();
    // $("#loadScreenPlayBtn").hide();
}

function isLoaded() {
    var imagesLoaded = true;
    for (img in images) {
        if (!images[img].imageReady) {
            imagesLoaded = false;
        }
    }
    if (imagesLoaded) {
        $("#loadScreenPlayBtn").show();
        $("#loadScreenPlayBtn").click(playGame);
    }

}

function playGame() {
    hideLoadingScreen();
    var canvas = document.getElementById('game_canvas');

    //canvas size
    const WINDOW_WIDTH_CANVAS_RATIO = 0.7;
    const WINDOW_HEIGHT_CANVAS_RATIO = 0.9;
    var ctx = canvas.getContext('2d');

    const aspectRatio = images.flappybg.width / images.flappybg.height;
    const maxWidth = (window.innerWidth * WINDOW_WIDTH_CANVAS_RATIO);
    const maxHeight = (window.innerHeight * WINDOW_HEIGHT_CANVAS_RATIO);
    let scaledMaxWidth = maxHeight * aspectRatio;
    let scaleFactor = Math.min(1, maxWidth / scaledMaxWidth);
    canvas.width = scaledMaxWidth * scaleFactor;
    canvas.height = maxHeight * scaleFactor;

    //Settings
    var fps = 35;
    var cWidth = canvas.width;
    var cHeight = canvas.height;
    const stoneHeight = 55;
    var pHeight = 85;
    var pWidth = 15;
    var spacing = 10;
    var strpSize = 15;
    var stripClr = "white";
    var playerSpeed = 20;

    //Controls
    var default_settings = true;
    var multiplayer = false;
    var themeOn = true;
    const showHitBox = false;
    var roundEdges = true;
    var default_speed = 6;
    var difficulty = 1.5;
    var autoplay = true;
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

    //Controls- functions
    var pauseMenu = document.getElementById('pauseMenu');
    var pauseBtn = document.getElementById('pauseBtn');
    var message = document.getElementById('message');

    function pause(msg, buttonTxt) {
        paused = !paused;
        message.innerHTML = msg;
        pauseBtn.innerHTML = buttonTxt;
        pauseMenu.style.display = paused ? "inline-block" : "none";
        pauseBtn.onclick = function () {
            pauseMenu.style.display = "none";
            paused = false;
            resetGameState()
        };
    }


    function onEndGame() {
        pause("Game Over", "New Game")
    }

    function setDifficulty(e) {
        e.target.blur();
        switch (e.target.value) {
            case 'easy':
                difficulty = 1.5;
                break;
            case 'medium':
                difficulty = 2;
                break;
            case 'hard':
                difficulty = 3;
                break;
            case 'insane':
                difficulty = 3.5;
                break;
        }
        if (!multiplayer) {
            p2.speed = 5 * difficulty;
        }

        ball.xSpeed *= difficulty;
        ball.ySpeed *= difficulty;
    }

    function setKey(e) {
        var key = e.which || e.keyCode;
        if (key == 9 || key == 27 || key == 13) return;	//prevent 'tab','esc', 'enter' keys
        e.preventDefault();
        this.value = e.key;
        switch (this.id) {
            case 'p1_upkey':
                p1.upkey = key;
                break;
            case 'p1_downkey':
                p1.downkey = key;
                break;
            case 'p2_upkey':
                p2.upkey = key;
                break;
            case 'p2_downkey':
                p2.downkey = key;
                break;
        }
        this.value = this.value.indexOf('Arrow') == -1 ? this.value : this.value.substring(5);
        this.blur();
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
        player.vy = 0
        previousRenderTime = nowSec();
        prevGenDistance = 0;
        setTimeout(playGame, 0)

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
        scoreBoard(now, dt);

        if (endGame) onEndGame();

        requestAnimationFrame(render);
        // Old Game below

        // movePlayers();
        // drawPlayers();
        // scoreBoard();
        // middleLine();
        // moveBall();

    }

    const sceneSpeed = 300;
    let prevGenDistance = 0;
    let obstacles = [];

    function renderObstacles(now, dt) {
        const obstacleGenInteval = 300 + (1200 - 300) * Math.random()
        if (player.distanceCovered > (prevGenDistance + obstacleGenInteval)) {
            prevGenDistance = player.distanceCovered
            let obstacle = {
                y: cHeight,
                x: cWidth,
                scale: (0.3 + 1.7 * Math.random()),
                speed: sceneSpeed,
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
                if (showHitBox) {
                    ctx.save()
                    circle(obstacle.x, obstacle.y, obstacle.hitBoxRadius(), 'red')
                    ctx.restore()
                }
                ctx.save()
                ctx.drawImage(
                    images.cactus, cactusW * cactusFrames.frameI, cactusH * cactusFrames.frameJ, cactusW, cactusH,
                    obstacle.x - obstacle.radiusX(), obstacle.y - obstacle.radiusY(), obstacle.radiusX() * 2, obstacle.radiusY() * 2
                );
                if (showHitBox) {
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
        speed: playerSpeed,
        reverse: false,
        color: 'white',
        score: 0,
        scale: 0.5,
        up: false,
        vy: 0,
        upkey: 87,	//W
        yMax: cHeight * 0.9,
        yMin: cHeight * 0.1,
        distanceCovered: 0,
        getCenter: function () {
            return [this.x + this.radius, this.y + this.radius]
        },
        checkRange: function () {
            return this.x >= 0 && this.x < cWidth && this.y >= 0 && this.y < cHeight
        },


        move: function (dt) {
            const acceleration = 2000.0 * (this.up ? -1.0 : 1.0) // pixels / s^2
            this.vy = this.vy + acceleration * dt
            const new_y = this.y + this.vy * dt + 0.5 * acceleration * dt * dt
            this.y = Math.min(Math.max(new_y, this.yMin), this.yMax)
            if (this.y !== new_y) this.vy = 0
        },

        onUpKeyPress: function (e) {
            if (e.keyCode !== this.upkey) return;
            this.up = true
            this.vy = 0
        },
        onUpKeyRelease: function (e) {
            if (e.keyCode !== this.upkey) return;
            this.up = false
        },
        calcScore: function (dt) {
            this.distanceCovered += sceneSpeed * dt
            this.score = Math.floor(this.distanceCovered * 0.01)
        },
        hitBoxFactor: 0.7,
        hitBoxRadius: function () {
            return this.radius * this.hitBoxFactor
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
        if (showHitBox) {
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
        return endGame;
    }

    let seemX = 0

    function drawBG(now, dt) {
        if (themeOn) {
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

    function scoreBoard(now, dt) {
        ctx.save()
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = '15px arial';
        ctx.fillText('Score', 3 * 0.25 * cWidth, cHeight / 8);
        ctx.font = '80px arial';
        ctx.fillText(player.score, 3 * 0.25 * cWidth, cHeight / 8 + 70);
        ctx.restore()
    }


    //Game logics
    function postScore() {
        $.get(`http://localhost:${PORT}/score`, {score: difficulty}, console.log);
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

    function rect2(xPos, yPos, width, height, color, invertX) {
        if (invertX) {
            xPos = -xPos + cWidth - width;
        }
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.moveTo(xPos, yPos);
        ctx.lineTo(xPos, yPos + height);
        ctx.arc(xPos + width / 2, yPos + height, width / 2, Math.PI, 0, true);
        ctx.lineTo(xPos + width, yPos);
        ctx.arc(xPos + width / 2, yPos, width / 2, 0, Math.PI, true);
        ctx.fill();
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

    //Sound controls

    /*	0: p1 score;
    1: p2 score;
    2: p1 win;
    3: p2 win */
    function playRandomAudio(event) {
        if (!themeOn) return;
        var length = audios[event].length;
        var index = Math.floor(Math.random() * length);
        audios[event][index].play();
    }

    $(document).ready(function () {
        $('#theme').prop('volume', 0.2);
        $('#theme').prop('autoplay', autoplay ? true : false);
        $('#theme').prop('loop', true);
        $('#theme').prop('currentTime', 8.4);

        $('#mute_btn').click(function () {
            let muted = $('#theme').prop("muted");
            $(this).toggleClass("glyphicon glyphicon-volume-up");
            $(this).toggleClass("glyphicon glyphicon-volume-off");
            $('#theme').prop("muted", !muted);
            if (muted)
                $('#theme')[0].play();
            else
                $('#theme')[0].pause();
        });
        $('#volume_up').click(function () {
            $('#theme')[0].volume += 0.05;
        });
        $('#volume_down').click(function () {
            $('#theme')[0].volume -= 0.05;
        });
    });
}
