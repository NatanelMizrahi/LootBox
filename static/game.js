// const fetch = require('node-fetch');
const PORT =  5000
const HTTP_HEADER = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    'Access-Control-Allow-Origin': '*',
    'User-Agent': '*',
};

function drawImage(ctx, image, x, y, w, h) {
    ctx.save();
    ctx.translate(x, y);
    ctx.drawImage(image, 0,0,image.width, image.height, -w/2, -h/2, w, h);
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
    static MAX_PORTAL_DELAY = 0;

    static LEFT = "LEFT";
    static RIGHT = "RIGHT";

    constructor(canvas , ball) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ball = ball;
        this.ballEnteredPortal = false;
        this.ballInPortal = null;
        this.ballOutPortal = null;
        this.randomizeParams();
    }
    randomizeDims(){
        // Portal dimensions are relative to the ball radius
        let r = this.ball.radius;
        let height = r * this.randomInRange(Portal.MIN_PORTAL_HEIGHT_FACTOR, Portal.MAX_PORTAL_HEIGHT_FACTOR);
        let width  = r * this.randomInRange(Portal.MIN_PORTAL_WIDTH_FACTOR,  Portal.MAX_PORTAL_WIDTH_FACTOR);
        this.height = Math.min(height, this.canvas.height * 0.5);
        this.width = width;
    }
    randomizeXCoordinates(){
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
    randomizeYCoordinates(){
        let minPortalY = this.height / 2;
        let maxPortalY = this.canvas.height - minPortalY;
        this.leftPortalY = this.randomInRange(minPortalY, maxPortalY);
        this.rightPortalY = this.randomInRange(minPortalY, maxPortalY);
    }
    randomizeCoordinates(){
        this.randomizeYCoordinates();
        this.randomizeXCoordinates();
        this.coordinates = {};
        this.coordinates[Portal.LEFT]  = {x: this.leftPortalX,  y: this.leftPortalY };
        this.coordinates[Portal.RIGHT] = {x: this.rightPortalX, y: this.rightPortalY};
    }

    randomizeDuration() {
        this.delay = this.randomInRange(0,Portal.MAX_PORTAL_DELAY);
        this.duration = this.randomInRange(Portal.MIN_PORTAL_DURATION,Portal.MAX_PORTAL_DURATION);
    }

    randomizeParams() {
        this.randomizeDims();
        this.randomizeCoordinates();
        this.randomizeDuration();
    }
    randomInRange(low, high){
        return Math.floor(Math.random() * (high- low)) + low;
    }

    drawPortal() {
        drawImage(this.ctx, images.portal, this.leftPortalX, this.leftPortalY, this.width, this.height);
        drawImage(this.ctx, images.portal, this.rightPortalX, this.rightPortalY, this.width, this.height);
    }
    pointInsidePortal(x, y, padding=0){
        // Returns the portal in which the (x,y) coordinates resides in, with a specified padding,
        // or null if not in a portal

        // The region bounded by the ellipse centered at (h,k), with semi-major axis rx, semi-minor axis ry
        // is given by the equation (x-h)^2/rx^2 + (y-k)^2/ry^2 <=1
        let sq = num => Math.pow(num,2);
        let rx = this.width/2 - padding;
        let ry = this.height/2 - padding;
        for (let portal in this.coordinates) {
            let h = this.coordinates[portal].x;
            let k = this.coordinates[portal].y;
            if (sq(x-h)/sq(rx) + sq(y-k)/sq(ry) <= 1)
                return portal;
        }
        return null;
    }

    exitPortal(){
        this.ballInPortal = null;
        this.ballEnteredPortal = false;
    }
    teleportBall(){
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
        let currentPortal = this.pointInsidePortal(ballX, ballY, this.ball.radius/2);
        if (this.ballInPortal === currentPortal) {
            this.ball.x = ballX;
            this.ball.y = ballY;
        } else {
            this.exitPortal();
        }
    }

    drawClippedBallInPortal(portal, OnRightSide){
        this.ctx.save();
        this.ctx.beginPath();
        let offsetX = OnRightSide ?  0 :this.width;
        this.ctx.rect(this.coordinates[portal].x - offsetX, 0, this.width, this.canvas.height);
        // this.ctx.ellipse(this.coordinates[portal].x,this.coordinates[portal].y, this.width/2, this.height/2, 0, Math.PI * 0.5, Math.PI * 1.5, OnRightSide);
        this.ctx.closePath();
        this.ctx.clip();
        this.ball.draw();
        this.ctx.restore();
    }

    drawBall(){
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
        if (this.delay === 0 && this.duration === 0)
            this.randomizeParams();
        if (this.delay > 0){
            this.delay--;
            this.ball.draw();
        } else {
            this.drawPortal();
            this.drawBall();
            this.duration--;
        }
    }
}

//Load images & audio files

var audios=[
    //p1 score audios
    [
        "https://www.myinstants.com/media/sounds/pickle_rick.mp3", //pickle rick r
        "https://peal.io/download/74hun", //shum shum shlippity r
        "https://peal.io/download/kechr", // the way the news goes r
        "https://peal.io/download/o3b9s", //hit the sack r
        "https://peal.io/download/fijtn", //wubaluba r
        "https://peal.io/download/hr8m0", // wrecked son r
        "https://peal.io/download/h3tlq", // tiny rick r
        "https://peal.io/download/elcp9", // biach r
        "https://peal.io/download/beknl",// thank you r
        "https://peal.io/download/lkwsv", //burger time r
        "https://peal.io/download/ese2n", //baby bunkers r
        "https://peal.io/download/n4a6w", //help m
    ],
    //p2 score audios
    [
        "https://peal.io/download/eolny", //ooee m
        "https://peal.io/download/yb659", //OMG m
        "https://peal.io/download/h6grs", // that's retarded r
        "https://peal.io/download/eovn2", //my man ?
        "https://peal.io/download/zau51", //for real m
        "https://peal.io/download/rttym", //dream bitch r
        "https://peal.io/download/s2m8i", //whatever r
    ],
    //p1 win audios
    [
        "https://peal.io/download/ldaze", //lick my balls r
        "https://peal.io/download/6iens", //oh man m
        "https://peal.io/download/79qmp", // f u god
    ],
    //p2 win audios
    [
        "https://peal.io/download/n4a6w", //ooo yeah ?
        "https://peal.io/download/tvqbh"	 //who the fuck are you? r
    ]
];
var audioLoaded=false;
var numOfAudios=0;
audios.forEach(function(arr){
    numOfAudios+=arr.length;
});
loadAudio();
function loadAudio(){
    var counter=0;
    audios=audios.map(function(array){
        array=array.map(function(url){
            var audio=new Audio(url);
            audio.oncanplaythrough=function(){
                counter++;
                $('#audioLoad').text(Math.floor(counter/numOfAudios*100));
                if(counter==numOfAudios){
                    audioLoaded=true;
                    // isLoaded();
                }
            };
            return audio;
        });
        return array;
    });
}
var images={};
loadImages();

function loadImages(){
    let imageList = ["background", "ball", "p1", "p2", "portal"];
    let numOfImages = imageList.length;
    let counter=0;
    for (img of imageList) {
        images[img] = new Image();
        images[img].src = `assets/images/${img}.png`;
    }
    for (img in images){
        images[img].onload=function(){
            this.imageReady=true;
            counter++;
            $('#imgLoad').text(Math.floor(counter/numOfImages*100));
            if(counter==numOfImages) isLoaded();
        }
    }
}
function hideLoadingScreen(){
    $('#loadingMenu').hide();
    // $("#loadScreenPlayBtn").hide();
}
function isLoaded(){
    var imagesLoaded=true;
    var skipAudioLoad = true;
    for (img in images){
        if (!images[img].imageReady){
            imagesLoaded=false;
        }
    }
    if(imagesLoaded && (audioLoaded||skipAudioLoad)){
        $("#loadScreenPlayBtn").show();
        $("#loadScreenPlayBtn").click(playGame);
    }

}

function playGame(){
    hideLoadingScreen();
    var canvas=document.getElementById('game_canvas');

    $('.input').keydown(setKey);
    document.getElementById('multiplayer').addEventListener('click',toggleMultiplayer,false);
    document.getElementById('graphics').addEventListener('click',toggleTheme,false);
    document.getElementById('reset').addEventListener('click',reset,false);

    //key Press & mouse movement Listeners
    window.addEventListener('keydown',keyPress,false);
    window.addEventListener('keyup',keyPress,false);
    canvas.addEventListener('mousemove',keyPress,false);
    document.getElementsByName('difficulty').forEach(function(input){
        input.addEventListener('change',setDifficulty,false);
    });

    //canvas size
    const WINDOW_WIDTH_CANVAS_RATIO= 0.7;
    const WINDOW_HEIGHT_CANVAS_RATIO = 0.9;
    var ctx=canvas.getContext('2d');

    const aspectRatio=images.background.width/images.background.height;
    const maxWidth = (window.innerWidth * WINDOW_WIDTH_CANVAS_RATIO);
    const maxHeight = (window.innerHeight * WINDOW_HEIGHT_CANVAS_RATIO);
    let scaledMaxWidth = maxHeight * aspectRatio;
    let scaleFactor = Math.min(1, maxWidth/scaledMaxWidth);
    canvas.width=scaledMaxWidth * scaleFactor;
    canvas.height=maxHeight * scaleFactor;

    //Settings
    var fps		=	35;
    var cWidth 	=	canvas.width;
    var cHeight	= 	canvas.height;
    var pHeight =	85;
    var pWidth 	=	15;
    var spacing =	10;
    var strpSize=	15;
    var stripClr=	"white";
    var playerSpeed=20;

    //Controls
    var default_settings=true;
    var multiplayer=false;
    var themeOn=true;
    var roundEdges=true;
    var default_speed=6;
    var difficulty=1.5;
    var autoplay=true;
    var paused=false;

    //game render interval
    setInterval(render,1000/fps);

    if(!default_settings){
        multiplayer=prompt('Please choose game mode. \n Singleplayer: (Enter) \n Multiplayer:  (any other key)') || false;
    }
    //game vars
    //var index=0;
    var time=0;
    var frames={
        //0  1	2  3  4
        //5  6  7  8  9
        //10 11 12 13 14
        //15 16 17 18 19

        frameRate: 5,
        hit:0,
        sprites:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19],
        frameI:0,
        frameJ:0
    }
    var fw=images.p1.width/5;
    var fh=images.p1.height/4;

    //Players and ball Objects
    var p1={
        y:cHeight/2,
        size: pHeight,
        speed:playerSpeed,
        reverse: false,
        color: 'white',
        points:0,
        up:false,
        down:false,
        upkey:		87,	//W
        downkey:	83,	//S
        bottom:function(){return this.y+this.size/2},
        top:function(){return this.y-this.size/2},
        checkRange: function(){
            if(this.bottom()>cHeight) this.y=cHeight-this.size/2;
            if(this.top()<0) this.y=this.size/2;
        }
    }

    var p2 = {
        y:cHeight/2,
        size:pHeight,
        speed:5,
        reverse: false,
        color:'blue',
        points:0,
        up:false,
        down:false,
        upkey: 		38,	//up arrow
        downkey: 	40,	//down arrow

        bottom:function(){return this.y+this.size/2},
        top:function(){return this.y-this.size/2},
        checkRange: function(){
            if(this.bottom()>cHeight) this.y=cHeight-this.size/2;
            if(this.top()<0) this.y=this.size/2;
        }
    }

    var ball = {
        x:cWidth/2,
        y:cHeight/2,
        xSpeed:-default_speed,
        ySpeed:3,
        radius:20,
        color:'red',
        draw : drawBall
    }

    const portal = new Portal(canvas, ball);
    //Controls- functions
    var pauseMenu= document.getElementById('pauseMenu');
    var pauseBtn= document.getElementById('pauseBtn');
    var message= document.getElementById('message');

    function pause(msg, buttonTxt){
        paused=!paused;
        message.innerHTML=msg;
        pauseBtn.innerHTML=buttonTxt;
        pauseMenu.style.display= paused ? "inline-block":"none";
        pauseBtn.onclick=function(){
            pauseMenu.style.display="none";
            paused=false;
        };
    }

    function toggleMultiplayer(){
        multiplayer=this.checked;
        p2.speed= multiplayer ? playerSpeed :p2.speed;
    }

    function toggleTheme(){
        themeOn=this.checked;
        ball.radius= themeOn ? ball.radius*1.5 : ball.radius/1.5;
    }

    function reset(){
        p1.points=0;
        p2.points=0;
        render();
        pause("Game reset", 'New Game');
    }

    function setDifficulty(e){
        e.target.blur();
        switch(e.target.value){
            case 'easy': 	difficulty=1.5;
                break;
            case 'medium': 	difficulty=2;
                break;
            case 'hard':    difficulty=3;
                break;
            case 'insane':  difficulty=3.5;
                break;
        }
        if(!multiplayer){p2.speed=5*difficulty;}

        ball.xSpeed*=difficulty;
        ball.ySpeed*=difficulty;
    }

    //key press handlers
    function keyPress(e){
        switch(e.type){
            case "keydown":
                var key=e.which || e.keyCode;
                switch(key){
                    case 27:
                    case 13: pause("Game paused", "Continue");
                        break;
                    case p1.upkey: p1.up=true;
                        break;
                    case p1.downkey: p1.down= true;
                        break;
                    case p2.upkey: p2.up = multiplayer? true: false;
                        break;
                    case p2.downkey: p2.down=multiplayer? true: false;
                        break;
                }
                break;

            case 'keyup':
                var key=e.which || e.keyCode;
                switch(key){
                    case p1.upkey: p1.up=false;
                        break;
                    case p1.downkey: p1.down= false;
                        break;
                    case p2.upkey: p2.up = false;
                        break;
                    case p2.downkey: p2.down=false;
                        break;
                }
                break;
            case 'mousemove':
                p1.y=e.layerY; //-mouseFix;
                p1.checkRange();
                break;
        }
    }

    function setKey(e){
        var key= e.which||e.keyCode;
        if(key==9 || key==27 || key==13) return;	//prevent 'tab','esc', 'enter' keys
        e.preventDefault();
        this.value= e.key;
        switch(this.id){
            case 'p1_upkey': p1.upkey = key;
                break;
            case 'p1_downkey': p1.downkey = key;
                break;
            case 'p2_upkey': p2.upkey = key;
                break;
            case 'p2_downkey': p2.downkey = key;
                break;
        }
        this.value= this.value.indexOf('Arrow')==-1 ? this.value : this.value.substring(5);
        this.blur();
    }


    //graphics
    function render(){
        if(paused) return;
        time++;
        drawBG();
        movePlayers();
        drawPlayers();
        scoreBoard();
        middleLine();
        moveBall();
        portal.tick();
    }

    function drawBG(){
        if(themeOn){
            ctx.drawImage(images.background,0,0, cWidth, cHeight);
        } else{
            rect(0,0,cWidth,cHeight,'black');
        }
    }
    function scoreBoard(){
        ctx.fillStyle='white';
        ctx.textAlign='center';
        ctx.font='15px arial';
        ctx.fillText('Player 1:', cWidth/4, cHeight/8);
        ctx.fillText('Player 2:', 3*cWidth/4, cHeight/8);
        ctx.font= '80px arial';
        ctx.fillText(p1.points, cWidth/4, cHeight/8 + 70);
        ctx.fillText(p2.points, 3*cWidth/4, cHeight/8 + 70);/**/
        ctx.font="20px arial";
        ctx.fillText('By Natanel Mizrahi', cWidth-140, cHeight-5);
    }
    function drawPlayers(){
        if(themeOn){
            drawPlayers2();
            return;
        }
        if(!roundEdges){
            rect(spacing,	p1.y-p1.size/2,	pWidth, p1.size, p1.color, false);
            rect(spacing,	p2.y-p2.size/2,	pWidth, p2.size, p2.color, true);	//true= invertX
            return;
        }
        rect2(spacing,	p1.y-p1.size/2,	pWidth, p1.size, p1.color, false);
        rect2(spacing,	p2.y-p2.size/2,	pWidth, p2.size, p2.color, true);	//true= invertX

        computerMove();
    }

    function drawPlayers2(){
        animate();
        computerMove();
    }
    function animate(){
        var arr= frames.sprites;
        var index=(Math.floor(time/frames.frameRate) % arr.length);
        frames.frameI= index % 5;
        frames.frameJ=Math.floor(arr[index]/5);
        //animate p1
        ctx.save();
        ctx.translate(spacing*2,p1.y);
        ctx.rotate(35*Math.PI/180);
        ctx.drawImage(images.p1,fw*frames.frameI,fh*frames.frameJ,fw, fh,-fw/4,-fh/4, fw/2,fh/2);
        ctx.restore();
        //animate p2
        ctx.save();
        ctx.translate(cWidth-spacing*2,p2.y);
        ctx.rotate(-35*Math.PI/180);
        ctx.drawImage(images.p2,fw*frames.frameI,fh*frames.frameJ,fw, fh,-fw/4,-fh/4, fw/2,fw/2);
        ctx.restore();
    }

    //Game logics
    function postScore(){
//        let body = ;
//        // fetch(`http://localhost:{$PORT}`, {
//        //         method: 'post',
//        //         body:    JSON.stringify(body),
//        //         headers: HTTP_HEADER
//        //     })
//        //     .then(console.log)
//        //     .catch(console.error);
//
//        console.log(`http://localhost:${PORT}`);
        $.post(`http://localhost:${PORT}/score`, { score: difficulty }, console.log);
    }
    //p1=true, p2=false
    function score(player1){
        ball.x=cWidth/2;
        ball.y=cHeight/2;
        ball.xSpeed=default_speed*difficulty*0.7;
        ball.ySpeed=((Math.random()*10)-5)*difficulty;
        while (ball.ySpeed==0){
            ball.ySpeed=((Math.random()*10)-5)*difficulty;
        }
        if(player1){
            p1.points++;
        }
        else{
            p2.points++;
            ball.xSpeed= -ball.xSpeed; //ball goes to P1's direction
        }
        postScore()
    }

    function checkWin(player1){
        var goal= document.getElementById('goal').value;
        var index=1;
        if(player1){
            if (p1.points==goal){
                pause("Player 1 won!", "New Game");
                p1.points=0;
                p2.points=0;
                index=2;
            }
            else index=0;
        }
        else{ //player 2
            if(p2.points==goal){
                pause("Player 2 won!", "New Game");
                p1.points=0;
                p2.points=0;
                index=3;
            }
            else index=1;
        }
        playRandomAudio(index);
        return;
    }

    function movePlayers(){
        if(p1.up){
            p1.y-=p1.speed;
            p1.checkRange();
        }
        if(p1.down){
            p1.y+=p1.speed;
            p1.checkRange();
        }
        if(p2.up){
            p2.y-=p2.speed;
            p2.checkRange();
        }
        if(p2.down){
            p2.y+=p2.speed;
            p2.checkRange();
        }
    }
    function drawBall(){
        if (themeOn){ //Morty ball
            ctx.save();
            ctx.translate(ball.x,ball.y);
            ctx.rotate((time/50)*ball.xSpeed);
            ctx.drawImage(images.ball, 0,0,images.ball.width, images.ball.height, -ball.radius, -ball.radius, ball.radius*2, ball.radius*2);
            ctx.restore();
        }
        else{ //Red Ball
            circle(ball.x, ball.y, ball.radius, ball.color);
        }
    }
    function moveBall(){
        //if hits horizontal walls, change direction.
        if((ball.y+ ball.radius > cHeight) || (ball.y -ball.radius < 0)){
            ball.ySpeed= -ball.ySpeed;
            //ball stuck in top/bottom fix
            ball.y= (ball.y+ ball.radius > cHeight) ? cHeight -ball.radius : ball.radius;
        }
        //if right player scores
        if((ball.x - ball.radius) <= 0){
            score(false);
            checkWin(false);
        }
        //if left player scores
        if((ball.x + ball.radius) >= cWidth){
            score(true);
            checkWin(true);
        }
        var topDist, bottomDist;

        //if left player hit the ball
        if(ball.xSpeed < 0
            && ((ball.x - ball.radius) <= (spacing+ pWidth))
            && ((ball.y + ball.radius) >= (p1.y - p1.size/2))
            && ((ball.y - ball.radius) <= (p1.y + p1.size/2))){
            ball.xSpeed= -ball.xSpeed;	//change direction;

            //Check for corner hit
            topDist=p1.top()-ball.y+ ball.radius;
            bottomDist=ball.y- p1.bottom() +ball.radius;
            if (topDist > 0){
                ball.xSpeed += topDist/4;
                ball.ySpeed = -topDist/2;
            }
            if (bottomDist > 0){
                ball.xSpeed += bottomDist/4;
                ball.ySpeed = bottomDist/2;
            }
        }

        //if right player hit the ball
        if(ball.xSpeed > 0
            && ((ball.x + ball.radius) >= (cWidth - spacing - pWidth))
            && ((ball.y+ ball.radius) >= (p2.y-p2.size/2))
            && ((ball.y - ball.radius) <= (p2.y + p2.size/2))){
            ball.xSpeed= -ball.xSpeed;	//change direction;

            //Check for corner hit
            topDist=p2.top()-ball.y+ ball.radius;
            bottomDist=ball.y- p2.bottom() +ball.radius;
            if (topDist > 0){
                ball.xSpeed -= topDist/4;
                ball.ySpeed = -topDist/2;

            }
            if (bottomDist > 0){
                ball.xSpeed -= bottomDist/4;
                ball.ySpeed = bottomDist/2;
            }
        }
        //Assure speed threshold is met
        var minSpeed=2;
        ball.xSpeed= (ball.xSpeed >minSpeed || ball.xSpeed< -minSpeed) ? ball.xSpeed : ball.xSpeed+minSpeed;

        //Move ball
        ball.x+=ball.xSpeed;
        ball.y+=ball.ySpeed;
    }

    function computerMove(){
        if(!multiplayer){
            if (p2.y< ball.y){
                p2.y+=p2.speed;
                p2.checkRange();
            }
            if(p2.y>ball.y){
                p2.y -= p2.speed;
                p2.checkRange()
            }
        }
    }

    //Canvas shapes
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
        ctx.arc(xPos,yPos,radius,0,2*Math.PI,false);
        ctx.fill();
    }

    function rect2(xPos,yPos,width,height,color,invertX){
        if(invertX){
            xPos= -xPos+cWidth-width;
        }
        ctx.beginPath();
        ctx.fillStyle=color;
        ctx.moveTo(xPos,yPos);
        ctx.lineTo(xPos,yPos+height);
        ctx.arc(xPos+width/2,yPos+height,width/2,Math.PI, 0,true);
        ctx.lineTo(xPos+width,yPos);
        ctx.arc(xPos+width/2,yPos,width/2,0,Math.PI,true);
        ctx.fill();
    }

    function middleLine(){
        var x= 0;
        ctx.beginPath();
        ctx.strokeStyle=stripClr;
        ctx.lineWidth=2;
        while(x<cHeight){
            x+=strpSize;
            ctx.lineTo(cWidth/2,x);
            x+=strpSize;
            ctx.moveTo(cWidth/2,x);
        }
        ctx.stroke();
    }

    //Sound controls

    /*	0: p1 score;
    1: p2 score;
    2: p1 win;
    3: p2 win */
    function playRandomAudio(event){
        if(!themeOn) return;
        var length=audios[event].length;
        var index= Math.floor(Math.random()*length);
        audios[event][index].play();
    }

    $(document).ready(function(){
        $('#theme').prop('volume', 0.2);
        $('#theme').prop('autoplay', autoplay ? true:false);
        $('#theme').prop('loop', true);
        $('#theme').prop('currentTime', 8.4);

        $('#mute_btn').click(function(){
            let muted = $('#theme').prop("muted");
            $(this).toggleClass("glyphicon glyphicon-volume-up");
            $(this).toggleClass("glyphicon glyphicon-volume-off");
            $('#theme').prop("muted", !muted);
            if (muted)
                $('#theme')[0].play();
            else
                $('#theme')[0].pause();
        });
        $('#volume_up').click(function(){
            $('#theme')[0].volume+=0.05;
        });
        $('#volume_down').click(function(){
            $('#theme')[0].volume-=0.05;
        });
    });
}
