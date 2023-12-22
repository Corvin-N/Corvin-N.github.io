const content = document.getElementById('content');
const middleDisplay = document.getElementById('middleDisplay');

const gameCanvas = document.getElementById('game');
const gameContext = gameCanvas.getContext('2d');

const camera = document.getElementById('camera');

const videoCanvas = document.getElementById('video');
const videoContext = videoCanvas.getContext('2d');

const leftIntensity = document.getElementById('leftIntensity');
const rightIntensity = document.getElementById('rightIntensity');

camera.addEventListener("loadedmetadata", () => {
    const scaleFactorDisplay = Math.min(middleDisplay.offsetWidth / camera.videoWidth, middleDisplay.offsetHeight / camera.videoHeight);

    videoCanvas.width = camera.videoWidth * scaleFactorDisplay;
    videoCanvas.height = camera.videoHeight * scaleFactorDisplay;
});


//-------------------------------------------------------------------------------------------------------------------------------
//----------------------------------------------- GAME OBJECTS / SETTINGS -------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------

//absolute
const grid = 6;
var textSize = 4; //textSize relative to gridSize

//relative
const paddleWidth = grid * 5;
const maxPaddleX = gameCanvas.width - grid - paddleWidth;

var paddleSpeed = 2 * grid / 5;
var ballSpeed = grid / 3;
const aiPaddleMaxSpeed = 4 * ballSpeed / 5;

var topScore = 0;
var bottomScore = 0;

const topPaddle = {
    // start in the middle of the game on the left side
    x: gameCanvas.width / 2 - paddleWidth / 2,
    y: grid * 2,
    width: paddleWidth,
    height: grid,

    // offset from middle of paddle where algorithm tries to hit ball
    hitBallOffset: 0,
    // paddle velocity
    dx: 0
};
const bottomPaddle = {
    // start in the middle of the game on the right side
    x: gameCanvas.width / 2 - paddleWidth / 2,
    y: gameCanvas.height - grid * 3,
    width: paddleWidth,
    height: grid,

    // paddle velocity
    dx: 0
};
const ball = {
    // start in the middle of the game
    x: gameCanvas.width / 2 - grid / 2,
    y: gameCanvas.height / 2 - grid / 2,
    width: grid,
    height: grid,

    // keep track of when need to reset the ball position
    resetting: false,

    // ball velocity (start going to the top-right corner)
    dx: 0,
    dy: ballSpeed
};


//-------------------------------------------------------------------------------------------------------------------------------
//----------------------------------------------- GAME LOCIC --------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------


function calculateBallDX(ball, paddle) {
    const ballCenter = ball.x + ball.width / 2;
    const paddleCenter = paddle.x + paddle.width / 2;

    return - (paddleCenter - ballCenter) / (paddle.width / 2) * ballSpeed;
}

// check for collision between two objects using axis-aligned bounding box (AABB)
function collides(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
        obj1.x + obj1.width > obj2.x &&
        obj1.y < obj2.y + obj2.height &&
        obj1.y + obj1.height > obj2.y;
}

function gaussianRandom(mean=0, variance=1) {
    const u = 1 - Math.random(); // (0,1]
    const v = Math.random();
    const z = Math.sqrt( - 2.0 * Math.log(u)) * Math.cos( 2.0 * Math.PI * v);
    return z * variance + mean;
}

function recalculateTopPaddleOffset() {
    topPaddle.hitBallOffset = gaussianRandom(0, 0.6 * (topPaddle.width / 2));
}

// game loop
function loop() {
    requestAnimationFrame(loop);
    gameContext.clearRect(0,0,gameCanvas.width,gameCanvas.height);


    diff = (ball.x + ball.width / 2) - (topPaddle.x + topPaddle.width / 2 + topPaddle.hitBallOffset);
    topPaddle.dx = Math.sign(diff) * Math.min(Math.abs(diff), aiPaddleMaxSpeed);

    // move paddles by their velocity
    topPaddle.x += topPaddle.dx;
    bottomPaddle.x += bottomPaddle.dx;

    // prevent paddles from going through walls
    if (topPaddle.x < grid) {
    topPaddle.x = grid;
    }
    else if (topPaddle.x > maxPaddleX) {
    topPaddle.x = maxPaddleX;
    }

    if (bottomPaddle.x < grid) {
    bottomPaddle.x = grid;
    }
    else if (bottomPaddle.x > maxPaddleX) {
    bottomPaddle.x = maxPaddleX;
    }

    // draw paddles
    gameContext.fillStyle = 'white';
    gameContext.fillRect(topPaddle.x, topPaddle.y, topPaddle.width, topPaddle.height);
    gameContext.fillRect(bottomPaddle.x, bottomPaddle.y, bottomPaddle.width, bottomPaddle.height);

    // move ball by its velocity
    ball.x += ball.dx;
    ball.y += ball.dy;

    // prevent ball from going through walls by changing its velocity
    if (ball.x < grid) {
    ball.x = grid;
    ball.dx *= -1;
    }
    else if (ball.x + ball.width > gameCanvas.width - grid) {
    ball.x = gameCanvas.width - grid - ball.width;
    ball.dx *= -1;
    }

    // reset ball if it goes past paddle (but only if we haven't already done so)
    if ( (ball.y < 0 || ball.y > gameCanvas.height) && !ball.resetting) {
    ball.resetting = true;
    if (ball.y < 0) {
        bottomScore++;
    } else {
        topScore++;
    }
    recalculateTopPaddleOffset();

    // give some time for the player to recover before launching the ball again
    setTimeout(() => {
        ball.resetting = false;
        ball.x = gameCanvas.width / 2 - ball.width / 2;
        ball.y = gameCanvas.height / 2 - ball.width / 2;
        ball.dx = 0;
    }, 1000);
    }

    // check to see if ball collides with paddle. if they do change x velocity
    if (collides(ball, topPaddle)) {
    ball.dx = calculateBallDX(ball, topPaddle);
    ball.dy *= -1;

    // move ball next to the paddle otherwise the collision will happen again
    // in the next frame
    ball.y = topPaddle.y + topPaddle.height;
    recalculateTopPaddleOffset();
    }
    else if (collides(ball, bottomPaddle)) {
    ball.dx = calculateBallDX(ball, bottomPaddle);
    ball.dy *= -1;

    // move ball next to the paddle otherwise the collision will happen again
    // in the next frame
    ball.y = bottomPaddle.y - ball.height;
    }

    // draw ball
    gameContext.fillRect(ball.x, ball.y, ball.width, ball.height);

    // draw walls
    gameContext.fillStyle = 'lightgrey';
    gameContext.fillRect(0, 0, grid, gameCanvas.height);
    gameContext.fillRect(gameCanvas.width - grid, 0, grid, gameCanvas.height);

    // draw dotted line down the middle
    for (let i = grid; i < gameCanvas.width - grid; i += grid * 2) {
    gameContext.fillRect(i, gameCanvas.height / 2 - grid / 2, grid, grid);
    }

    gameContext.fillStyle = 'yellow';
    gameContext.font = "bold " + textSize * grid + "px serif";
    gameContext.fillText(topScore, 2 * grid, gameCanvas.height / 2 - 2 * grid);
    gameContext.fillText(bottomScore, 2 * grid, gameCanvas.height / 2 + (1 + textSize) * grid);

    processFrame();
}

// Event Listener for key events, deprecated as enemy is AI and player moves via camera
/**
document.addEventListener('keydown', (event) => {
    //skip events that are part of composition of multiple keys
    if (event.isComposing || event.keyCode === 229) {
    return;
    }

    //KeyA
    if (event.keyCode === 65) {
    topPaddle.dx = -paddleSpeed;
    }
    //KeyD
    else if (event.keyCode === 68) {
    topPaddle.dx = paddleSpeed;
    }

    //ArrowLeft
    if (event.keyCode === 37) {
    bottomPaddle.dx = -paddleSpeed;
    }
    //ArrowRight
    else if (event.keyCode === 39) {
    bottomPaddle.dx = paddleSpeed;
    }
});

document.addEventListener('keyup', (event) => {
    //skip events that are part of composition of multiple keys
    if (event.isComposing || event.keyCode === 229) {
    return;
    }

    if (event.keyCode === 65 || event.keyCode === 68) {
    topPaddle.dx = 0;
    }

    if (event.keyCode === 37 || event.keyCode === 39) {
    bottomPaddle.dx = 0;
    }
});
 */


//-------------------------------------------------------------------------------------------------------------------------------
//----------------------------------------------- KEYPOINTS GENERATING ----------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------

var counter = 0;
var recalculateEveryXFrames = isDeviceMobile() ? 8 : 3;
var poses;
var rightColor;
var leftColor;
var createDetectorCalled = false;

function isDeviceMobile() {
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
};

navigator.mediaDevices.getUserMedia({ video: {width: {ideal: 640}, height: {ideal: 480}} })
.then((stream) => {
    camera.srcObject = stream;
})
.catch((error) => {
    console.error('Error accessing the camera:', error);
});

function processFrame() {
    videoContext.drawImage(camera, 0, 0, videoCanvas.width, videoCanvas.height);
    if (poses) {
    drawPose(videoContext, poses[0]);
    }

    if (counter % recalculateEveryXFrames == 0) {
    counter = 0;
    calcPoseNet();
    }
    counter++;
}

const detectorConfig = {
    architecture: 'MobileNetV1',
    outputStride: 16,
    inputResolution: { width: 160, height: 120 },
    multiplier: 0.75
};
var detector;

async function calcPoseNet() {
    if (!detector && !createDetectorCalled) {
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.PoseNet, detectorConfig);
    createDetectorCalled = true;
    }
    detector.estimatePoses(videoCanvas)
    .then((newPoses) => {
    poses = newPoses;
    calcNewMovement();
    })
}


//-------------------------------------------------------------------------------------------------------------------------------
//----------------------------------------------- KEYPOINTS HANDLING ------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------

function calcNewMovement() {
    keypoints = poses[0].keypoints;
    const leftdiff = calcYDiff(keypoints, 'left_elbow', 'left_wrist');
    const rightdiff = calcYDiff(keypoints, 'right_elbow', 'right_wrist');
    const maxdiff = calcMaxSize(keypoints);

    const leftPercentage = leftdiff / maxdiff;
    const rightPercentage = rightdiff / maxdiff;

    const chosenColor = "green";
    const activeColor = "lightgreen";
    const deactiveColor = "blue";

    if (leftdiff > 0 && leftdiff >= rightdiff) {
        //input left
        //down arrow key
        bottomPaddle.dx = -paddleSpeed * leftPercentage;
        leftColor = chosenColor;
        if (rightdiff > 0) {
        rightColor = activeColor;
        } else {
        rightColor = deactiveColor;
        }
    } else if (rightdiff > 0 && rightdiff > leftdiff) {
        //input right
        //up arrow key
        bottomPaddle.dx = paddleSpeed * rightPercentage;
        rightColor = chosenColor;
        if (leftdiff > 0) {
        leftColor = activeColor;
        } else {
        leftColor = deactiveColor;
        }
    } else {
        //clear input
        bottomPaddle.dx = 0;
        rightColor = deactiveColor;
        leftColor = deactiveColor;
    }

    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

    leftIntensity.style.height = clamp(leftPercentage, 0, 1) * 100 + "%";
    leftIntensity.style.backgroundColor = leftColor;
    rightIntensity.style.height = clamp(rightPercentage, 0, 1) * 100 + "%";
    rightIntensity.style.backgroundColor = rightColor;
}

function findKeypoint(keypoints, name) {
    return keypoints.find(keypoint => keypoint.name == name);
}

function calcXDiff(keypoints, topName, bottomName) {
    return findKeypoint(keypoints, topName).x - findKeypoint(keypoints, bottomName).x;
}

function calcYDiff(keypoints, topName, bottomName) {
    return findKeypoint(keypoints, topName).y - findKeypoint(keypoints, bottomName).y;
}

function calcDistance(keypoints, topName, bottomName) {
    xdiff = calcXDiff(keypoints, topName, bottomName);
    ydiff = calcYDiff(keypoints, topName, bottomName);
    return Math.sqrt(xdiff * xdiff + ydiff * ydiff);
}

function calcMaxSize(keypoints) {
    // approximation: dist(hip, shoulder) = 2*max(dist(elbow, wrist))
    var left = calcDistance(keypoints, 'left_shoulder', 'left_hip');
    var right = calcDistance(keypoints, 'right_shoulder', 'right_hip');
    // approximation: 3*dist(left_ear, right_ear) = 2*max(dist(elbow, wrist))
    var head = calcDistance(keypoints, 'left_ear', 'right_ear');
    return (left / 2 + right / 2 + 3 * head / 2) / 3;
}



//-------------------------------------------------------------------------------------------------------------------------------
//----------------------------------------------- DRAWING POSE ------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------


// Function to draw the entire pose
function drawPose(context, pose) {
    const keypoints = pose.keypoints;
    drawLink(context, leftColor, keypoints, 'left_elbow', 'left_wrist');
    drawLink(context, rightColor, keypoints, 'right_elbow', 'right_wrist');
    // Draw keypoints
    keypoints.forEach(keypoint => drawKeypoint(context, keypoint));
}

// Function to draw a single keypoint
function drawKeypoint(context, keypoint) {
    // Set the color and size for the keypoint
    context.fillStyle = 'red';
    context.beginPath();

    // Draw a circle for the keypoint
    context.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);

    // Fill the circle
    context.fill();
}

// Function to draw a line connecting two keypoints
function drawLink(context, color, keypoints, nameFrom, nameTo) {
    const keypointFrom = findKeypoint(keypoints, nameFrom);
    const keypointTo = findKeypoint(keypoints, nameTo);

    if (keypointFrom && keypointTo) {
        // Set the color and size for the line
        context.strokeStyle = color;
        context.lineWidth = 2;

        // Draw a line between the two keypoints
        context.beginPath();
        context.moveTo(keypointFrom.x, keypointFrom.y);
        context.lineTo(keypointTo.x, keypointTo.y);
        context.stroke();
    }
}


// start the game
requestAnimationFrame(loop);
