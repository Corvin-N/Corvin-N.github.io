//get canvas element
const gameCanvas = document.getElementById("game");
const gameContext = gameCanvas.getContext("2d");

//-------------------------------------------------------------------------------------------------------------------------------
//----------------------------------------------- GAME OBJECTS / CONSTANTS ------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------

//absolute, base size reference
const gridSize = 6;

//text (is used relative to grid size)
const textSize = 4;

//paddle
const paddleWidth = 5 * gridSize;
const paddleMinX = gridSize;
const paddleMaxX = gameCanvas.width - paddleMinX - paddleWidth;
const aiPaddleMaxSpeed = (4 * gridSize) / 15;
const playerPaddleMaxSpeed = (2 * gridSize) / 5;

//ball
const ballSpeed = gridSize / 3;

//score
var aiScore = 0;
var playerScore = 0;

/**
 * Paddle controlled by computer
 */
const aiPaddle = {
    x: gameCanvas.width / 2 - paddleWidth / 2,
    //keep 2 gridsize distance to top
    y: gridSize * 2,
    width: paddleWidth,
    height: gridSize,

    // relative offset from middle of paddle where algorithm tries to hit the ball
    hitBallOffset: 0,
    // paddle initial velocity
    dx: 0,
};

/**
 * Paddle controlled by player
 */
const playerPaddle = {
    x: gameCanvas.width / 2 - paddleWidth / 2,
    //keep 2 gridsize distance from bottom
    y: gameCanvas.height - gridSize * 3,
    width: paddleWidth,
    height: gridSize,

    // paddle initial velocity
    dx: 0,
};

const ball = {
    x: gameCanvas.width / 2 - gridSize / 2,
    y: gameCanvas.height / 2 - gridSize / 2,
    width: gridSize,
    height: gridSize,

    resetting: false,

    // ball initial velocity
    dx: 0,
    dy: ballSpeed,
};


//-------------------------------------------------------------------------------------------------------------------------------
//----------------------------------------------- GAME LOCIC --------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------

/**
 * Clamp number to given interval. That means return the closest value to the given number on the interval [min, max].
 * @param {number} num number
 * @param {number} min min value of number
 * @param {number} max max value of number
 * @returns value of num clamped to the interval [min, max]
 */
function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

/**
 * Draws a random number from a gaussian distribution with given properties.
 *
 * @param {number} mean mean of gaussian distribution
 * @param {number} variance variance of gaussian distribution
 * @returns {number} random number drawn with given properties
 */
function gaussianRandom(mean = 0, variance = 1) {
    const u = 1 - Math.random(); // (0,1]
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * variance + mean;
}

/**
 * Checks if two literals (game objects) do collide.
 *
 * @param {Literal} lit1 Literal that has the properties x, y, width and height
 * @param {Literal} lit2 Literal that has the properties x, y, width and height
 * @returns true if the two literals collide, false otherwise
 */
function collide(lit1, lit2) {
    return (
        lit1.x < lit2.x + lit2.width &&
        lit1.x + lit1.width > lit2.x &&
        lit1.y < lit2.y + lit2.height &&
        lit1.y + lit1.height > lit2.y
    );
}


//paddle movement - inputs

/**
 * Changes the offset of the ai paddle to a new value.
 */
function recalculateAIPaddleOffset() {
    aiPaddle.hitBallOffset = gaussianRandom(0, 0.6 * (aiPaddle.width / 2));
}

/**
 * Handles player input along the x-axis.
 * @param {number} signedPercentage value from [-1,1] that represents in which direction the player should move with which intensity
 */
function handleInput(signedPercentage) {
    playerPaddle.dx = playerPaddleMaxSpeed * signedPercentage;
}


//paddle movement

/**
 * Calculates ai paddles desired velocity depending on balls current position and target hit point.
 * @returns velocity of the ai paddle along x-axis (dx)
 */
function calculateAIPaddleDX() {
    const ballCenter = ball.x + ball.width / 2;
    const target = aiPaddle.x + aiPaddle.width / 2 + aiPaddle.hitBallOffset;

    diff = ballCenter - target;
    //clamp to max speed
    return Math.sign(diff) * Math.min(Math.abs(diff), aiPaddleMaxSpeed);
}

/**
 * Move paddles according to their current velocity once.
 * Check that paddles stay within bounds.
 */
function movePaddles() {
    aiPaddle.x += aiPaddle.dx;
    aiPaddle.x = clamp(aiPaddle.x, paddleMinX, paddleMaxX);

    playerPaddle.x += playerPaddle.dx;
    playerPaddle.x = clamp(playerPaddle.x, paddleMinX, paddleMaxX);
}


//ball movement

/**
 * Calculates balls velocity along x-axis depending on where the ball hit the paddle.
 *
 * @param {ball} ball
 * @param {paddle} paddle
 * @returns {number} velocity of the ball along x-axis (dx)
 */
function calculateBallDX(ball, paddle) {
    const ballCenter = ball.x + ball.width / 2;
    const paddleCenter = paddle.x + paddle.width / 2;

    return ((ballCenter - paddleCenter) / (paddle.width / 2)) * ballSpeed;
}

/**
 * Check if ball collided with wall. If so, calculate new velocity.
 */
function checkWallCollision() {
    if (ball.x < gridSize) {
        ball.x = gridSize;
        ball.dx *= -1;
    } else if (ball.x + ball.width > gameCanvas.width - gridSize) {
        ball.x = gameCanvas.width - gridSize - ball.width;
        ball.dx *= -1;
    }
}

/**
 * Check if paddle missed the ball. If so, reset ball.
 */
function checkPaddleMissed() {
    if ((ball.y < 0 || ball.y > gameCanvas.height) && !ball.resetting) {
        ball.resetting = true;
        if (ball.y < 0) {
            playerScore++;
        } else {
            aiScore++;
        }
        recalculateAIPaddleOffset();

        // wait so that player can recover before launching the ball again
        setTimeout(() => {
            ball.resetting = false;
            ball.x = gameCanvas.width / 2 - ball.width / 2;
            ball.y = gameCanvas.height / 2 - ball.width / 2;
            ball.dx = 0;
        }, 1000);
    }
}

/**
 * Check if paddle hit the ball. If so, calculate new velocity of ball.
 */
function checkPaddleCollision() {
    if (collide(ball, aiPaddle)) {
        ball.dx = calculateBallDX(ball, aiPaddle);
        ball.dy *= -1;

        // move ball below paddle to prevent multiple collisions in next frames
        ball.y = aiPaddle.y + aiPaddle.height;
        recalculateAIPaddleOffset();
    } else if (collide(ball, playerPaddle)) {
        ball.dx = calculateBallDX(ball, playerPaddle);
        ball.dy *= -1;

        // move ball above paddle to prevent multiple collisions in next frames
        ball.y = playerPaddle.y - ball.height;
    }
}

/**
 * Move ball according to its current velocity once.
 * Handles collisions of the ball with walls and players or if a player misses the ball.
 */
function moveBall() {
    // move ball by its velocity
    ball.x += ball.dx;
    ball.y += ball.dy;

    checkWallCollision();

    checkPaddleMissed();
    checkPaddleCollision();

}



//-------------------------------------------------------------------------------------------------------------------------------
//----------------------------------------------- DRAWING -----------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------


/**
 * Draw paddles onto gameContext.
 */
function drawPaddles() {
    gameContext.fillRect(aiPaddle.x, aiPaddle.y, aiPaddle.width, aiPaddle.height);
    gameContext.fillRect(
        playerPaddle.x,
        playerPaddle.y,
        playerPaddle.width,
        playerPaddle.height
    );
}

/**
 * Draw ball onto gameContext.
 */
function drawBall() {
    gameContext.fillRect(ball.x, ball.y, ball.width, ball.height);
}

/**
 * Draw walls onto gameContext
 */
function drawWalls() {
    gameContext.fillRect(0, 0, gridSize, gameCanvas.height);
    gameContext.fillRect(
        gameCanvas.width - gridSize,
        0,
        gridSize,
        gameCanvas.height
    );
}

/**
 * Draw dotted middle line onto gameContext.
 */
function drawMiddleLine() {
    for (let i = gridSize; i < gameCanvas.width - gridSize; i += gridSize * 2) {
        gameContext.fillRect(
            i,
            gameCanvas.height / 2 - gridSize / 2,
            gridSize,
            gridSize
        );
    }
}

/**
 * Draw score on the left side above and below the middle of the screen.
 */
function drawScore() {
    gameContext.font = "bold " + textSize * gridSize + "px serif";
    gameContext.fillText(
        aiScore,
        2 * gridSize,
        gameCanvas.height / 2 - 2 * gridSize
    );
    gameContext.fillText(
        playerScore,
        2 * gridSize,
        gameCanvas.height / 2 + (1 + textSize) * gridSize
    );
}

/**
 * Draws the current state of the entire pong game.
 */
function drawPong() {
    gameContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    gameContext.fillStyle = "white";
    drawPaddles();
    drawBall();

    gameContext.fillStyle = "lightgrey";
    drawWalls();
    drawMiddleLine();

    gameContext.fillStyle = "yellow";
    drawScore();
}

/**
 * Main game loop
 */
function loop() {
    requestAnimationFrame(loop);

    aiPaddle.dx = calculateAIPaddleDX();

    movePaddles();
    moveBall();

    drawPong();

    processFrame();
}

//start loop
requestAnimationFrame(loop);