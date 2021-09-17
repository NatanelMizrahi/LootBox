
// Key bindings
const RESTART_KEY_CODE = 82; // R
const MUTE_KEY = 77; // M
// misc.
const DEFAULT_MUTED = true;

const PRODUCTION = false;
const THEME_ON = true;
const SHOW_HITBOX = false;
const FLAMES_ON_DEAD_ONLY = false;
const LOGO_SIZE = 200;

const GAMEPAD_POLL_INTERVAL = 10;
const GAMEPAD_NOISE_THRESHOLD = 0.1;
const GAMEPAD_ACTIVE = true;

const RESTART_KEY = GAMEPAD_ACTIVE ? "START" :  String.fromCharCode(RESTART_KEY_CODE).toUpperCase();
const gameOverMessage = `GAME OVER (press ${RESTART_KEY} to replay)`;

// common resources
const images = {};
const canvas = document.getElementById('game_canvas');
const ctx = canvas.getContext('2d');

const ThumbStickToAxis = {
    0 : 0,
    1 : 1,
//    2 : 0,
//    3 : 1
};

const buttonMapping = {
    UP: 12,
    DOWN: 13,
    LEFT: 14,
    RIGHT: 15,
    START: 9,
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    L2: 6
};

// functions
function clearCanvas(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function setDims(width, height){
    let cHeight= Math.Floor(height * window.height);
    let cWidth= Math.Floor(width * window.width);
    let canvasWrapper = document.getElementById("canvas_wrapper");
    canvasWrapper.style.height = cHeight + "px";
    canvasWrapper.style.width = cWidth + "px";

}
function rect(xPos, yPos, width, height, color, alpha=1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(xPos, yPos, width, height);
    ctx.globalAlpha = 1;
}

function circle(xPos, yPos, radius, color, alpha=1) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.globalAlpha = alpha;
    ctx.arc(xPos, cHeight - yPos, radius, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.globalAlpha = 1;
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
    return (Math.random() * (max - min + 1)) + min;
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

// common game logic
function drawScoreBoard(score, highscore, color='white'){
    let cWidth = canvas.width;
    let cHeight = canvas.height;
    ctx.textAlign='center';
    ctx.fillStyle=color;
    ctx.font= '80px uroob';
    ctx.fillText(score,           cWidth/4, cHeight/8 + 70);
    ctx.fillText(highscore,   3 * cWidth/4, cHeight/8 + 70);
    ctx.font='20px uroob';
    ctx.fillText('Score',         cWidth/4, cHeight/8);
    ctx.fillText('Highscore', 3 * cWidth/4, cHeight/8);
}

function drawLogo(width=LOGO_SIZE, height=LOGO_SIZE){
    ctx.drawImage(images.logo, canvas.width/2 - width/2, height/8, width, height);
}
function loadImages(imageList) {
    let imageLoadedPromises = [];
    for (let img of imageList) {
        images[img] = new Image();
        images[img].src = `assets/images/${img}.png`;
        imageLoadedPromises.push(new Promise(resolve => images[img].onload = resolve));
    }
    return Promise.all(imageLoadedPromises).then(imagesLoaded => images)
}

function toggleTheme() {
    const theme = document.getElementById('theme');
    theme.muted = !theme.muted;
}

function loadAudio(){
    window.onload = function(){
        const theme = document.getElementById('theme');
        theme.autoplay = true;
        theme.loop = true;
        theme.muted = DEFAULT_MUTED;
        let playTheme = function(){
            window.removeEventListener('keydown', playTheme, false);
            theme.play();

        }
        window.addEventListener('keydown', playTheme, false);
    }
}

async function loadGame(imageList) {
    loadAudio(); // non blocking
    return loadImages(imageList)
}


const gamePad = {
    active: GAMEPAD_ACTIVE,
    gamePad: null,
    connect: function(){
        if (!this.active)
            return new Promise(resolve => resolve(document.getElementById('prompt').style.display = 'none'));
        let startLoop = this.loop.bind(this);
        return new Promise(resolve => window.addEventListener("gamepadconnected", resolve))
            .then(connected => document.getElementById('prompt').style.display = 'none')
    },
    loop: function(){
        if (!this.active) return;
        this.processEvents();
        requestAnimationFrame(this.loop.bind(this));
    },
    processEvents: function() {
        let gamePadInst = null;
        const gamePads = navigator.getGamepads()
        for (let i=0; i < gamePads.length; i++){
            if (gamePads[i] !== null) {
                gamePadInst = gamePads[i];
                break;
            }
        }
        this.gamePad = gamePadInst
        this.handleThumbStick();
        this.handleButtons();
    },
    buttonPressed: {},
    buttonSticky: {},
    axisActive: [false, false],
    axisSticky: [false, false],
    handleThumbStick: function(){
        this.gamePad.axes.forEach((axisVal,i) => {
            let axis = ThumbStickToAxis[i];
            let axisHandler = this.thumbStickPressHandlers[axis];
            if(!axisHandler){
                return;
            }

            if(Math.abs(axisVal) > GAMEPAD_NOISE_THRESHOLD){

                if (this.axisActive[axis] && this.axisSticky[axis])
                    return;
                this.axisActive[axis] = true;

                axisHandler(axisVal);
            }
            else if (this.axisActive[axis]) {
                this.axisActive[axis] = false;
                let thumbStickReleaseHandler = this.thumbStickReleaseHandlers[axis];
                if(thumbStickReleaseHandler) thumbStickReleaseHandler();
            }
        });
    },
    handleButtons: function (){
        this.gamePad.buttons.forEach((button,i) => {
            if (!this.buttonPressHandlers[i]){
                if (button.pressed) console.log("unassigned button:",i);
                return;
            }
            if (button.pressed) {
                if (this.buttonPressed[i] && this.buttonSticky[i]){
                    return;
                }
                const repeat = this.buttonPressed[i] === true;
                this.buttonPressed[i] = true;
                if (this.buttonPressHandlers[i])
                    this.buttonPressHandlers[i]({repeat: repeat});
            } else if (this.buttonPressed[i]) {
                this.buttonPressed[i] = false;
                let buttonReleaseHandler = this.buttonReleaseHandlers[i];
                if(buttonReleaseHandler) buttonReleaseHandler();
            }
        });
    },
    buttonPressHandlers: {},
    buttonReleaseHandlers: {},
    thumbStickPressHandlers: [null, null],
    thumbStickReleaseHandlers: [null, null],
    onButtonPress: function(button, handler, sticky = false){
        let buttonIndex = buttonMapping[button];
        this.buttonPressHandlers[buttonIndex] = handler;
        this.buttonSticky[buttonIndex] = sticky;
    },
    onButtonRelease: function (button, handler){
        let buttonIndex = buttonMapping[button];
        this.buttonReleaseHandlers[buttonIndex] = handler;
    },
    onThumbstickPress: function(axis, handler, sticky = false){
        this.thumbStickPressHandlers[axis] = handler;
        this.axisSticky[axis] = sticky;
    },
    onThumbstickRelease: function(axis, handler){
        this.thumbStickReleaseHandlers[axis] = handler;
    }
}



export {images, canvas, ctx, RESTART_KEY_CODE, MUTE_KEY, DEFAULT_MUTED, PRODUCTION, THEME_ON, SHOW_HITBOX, FLAMES_ON_DEAD_ONLY, gameOverMessage, rect, circle, range, randInt, randFloat, clamp, drawScoreBoard, loadAudio, loadImages, toggleTheme, loadGame, gamePad, clearCanvas,drawLogo};