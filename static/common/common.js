
// Key bindings
const RESTART_KEY_CODE = 82; // R
const MUTE_KEY = 77; // M
// misc.
const DEFAULT_MUTED = true;
const PRODUCTION = false;
const THEME_ON = true;
const SHOW_HITBOX = false;
const FLAMES_ON_DEAD_ONLY = false;

const gameOverMessage = `GAME OVER (press ${String.fromCharCode(RESTART_KEY_CODE).toUpperCase()} to replay)`;

// common resources
const images = {};
const canvas = document.getElementById('game_canvas');
const ctx = canvas.getContext('2d');

// functions
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
    ctx.font= '80px arial';
    ctx.fillText(score,           cWidth/4, cHeight/8 + 70);
    ctx.fillText(highscore,   3 * cWidth/4, cHeight/8 + 70);
    ctx.font='20px arial';
    ctx.fillText('Score',         cWidth/4, cHeight/8);
    ctx.fillText('Highscore', 3 * cWidth/4, cHeight/8);
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

function loadAudio(audioList){
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

async function loadGame(imageList, audioList) {
    loadAudio(audioList); // non blocking
    return loadImages(imageList)
}

export {images, canvas, ctx, RESTART_KEY_CODE, MUTE_KEY, DEFAULT_MUTED, PRODUCTION, THEME_ON, SHOW_HITBOX, FLAMES_ON_DEAD_ONLY, gameOverMessage, rect, circle, range, randInt, randFloat, clamp, drawScoreBoard, loadAudio, loadImages, toggleTheme, loadGame};