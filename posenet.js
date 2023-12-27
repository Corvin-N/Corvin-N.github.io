//"video" is a canvas on which the camera stream is painted every frame
const videoCanvas = document.getElementById("video");
const videoContext = videoCanvas.getContext("2d");

//"camera" contains video stream of camera
const camera = document.getElementById("camera");
camera.addEventListener("loadedmetadata", () => {
    //calculate scale factor such that camera stream fits on screen. website needs to be reloaded to resize camera properly
    const scaleFactorDisplay = Math.min(
        middleDisplay.offsetWidth / camera.videoWidth,
        middleDisplay.offsetHeight / camera.videoHeight
    );

    videoCanvas.width = camera.videoWidth * scaleFactorDisplay;
    videoCanvas.height = camera.videoHeight * scaleFactorDisplay;
});

const middleDisplay = document.getElementById("middleDisplay");

//"leftIntensity" and "rightIntensity" are used to display the input of the player
const leftIntensity = document.getElementById("leftIntensity");
const rightIntensity = document.getElementById("rightIntensity");



//-------------------------------------------------------------------------------------------------------------------------------
//----------------------------------------------- KEYPOINTS GENERATING ----------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------

//add all possible calcMovements-handler functions to the following array
const calcMovements = [followHead, steeringWheel, triggerOnRaiseArm];
var currentMovement = 0;
var calcMovement = calcMovements[currentMovement];

//switch calcMovement handler by clicking on the videoCanvas
videoCanvas.addEventListener('click', switchCalcMovement, false);

//frame counter
var counter = 0;
const recalculateEveryXFrames = isDeviceMobile() ? 8 : 3;

//current detected poses by PoseNet
// Note: poses need to be saved so that they can be accessed during drawing
var poses;

//color for movement direction
const chosenColor = "green";
//color for active, but not movement direction
const activeColor = "lightgreen";
//color for deactive direction
const deactiveColor = "blue";

//colors of left and right intensity bar
var rightColor;
var leftColor;

//only create detector once
var createDetectorCalled = false;
//config for setting up detector
//for more information refer to https://github.com/tensorflow/tfjs-models/tree/master/pose-detection/src/posenet
const detectorConfig = {
    architecture: "MobileNetV1",
    outputStride: 16,
    //input resolution is shrinked to increase calculation speed
    // but not shrinked so much that the results suffer
    inputResolution: { width: 160, height: 120 },
    multiplier: 0.75,
};
//detector used to detect pose from image
var detector;

/**
 * function by http://detectmobilebrowsers.com/
 * @returns true if device is mobile, false else
 */
function isDeviceMobile() {
    let check = false;
    (function (a) {
        if (
            /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
                a
            ) ||
            /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
                a.substr(0, 4)
            )
        )
            check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
}

/**
 * Streaming users camera to camera object
 */
navigator.mediaDevices
    .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } })
    .then((stream) => {
        camera.srcObject = stream;
    })
    .catch((error) => {
        console.error("Error accessing the camera:", error);
    });

/**
 * Process a single frame from the camera object.
 * That means, draw it on the canvas and recalculate the movement command derived by the picture.
 */
function processFrame() {
    videoContext.drawImage(camera, 0, 0, videoCanvas.width, videoCanvas.height);
    //draw poses if not empty
    if (poses) {
        drawPose(videoContext, poses[0]);
    }

    //only recalculate movement command every x frames to reduce lag
    if (counter % recalculateEveryXFrames == 0) {
        counter = 0;
        estimatePoses();
    }
    counter++;
}

/**
 * Estimate poses on most recent camera input image.
 * Creates detector if it not has been created before.
 */
async function estimatePoses() {
    if (!detector && !createDetectorCalled) {
        //create detector as it has not been created and 
        detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.PoseNet,
            detectorConfig
        );
        createDetectorCalled = true;
    }
    //estimate new poses and derive the new movement instructions
    detector.estimatePoses(videoCanvas).then((newPoses) => {
        poses = newPoses;
        calcMovement();
    });
}

//-------------------------------------------------------------------------------------------------------------------------------
//----------------------------------------------- KEYPOINTS HANDLING ------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------

// MOVEMENT CALCULATIONS

/**
 * Switch calcMovement variable to next function in calcMovements array. Restart when hitting the end
 */
function switchCalcMovement() {
    leftIntensity.style.height = 0 + "%";
    leftIntensity.style.backgroundColor = deactiveColor;
    rightIntensity.style.height = 0 + "%";
    rightIntensity.style.backgroundColor = deactiveColor;

    currentMovement++;
    currentMovement = currentMovement % calcMovements.length;
    console.log(currentMovement);

    calcMovement = calcMovements[currentMovement];

    alert("Movement is now calculated by the following method: " + calcMovement.name);
}


/**
 * Function to calculate the movement instruction according to the current pose.
 * Following the head along the x-axis.
 */
function followHead() {
    //there should only one relevant pose be detected as PoseNet is configured for a single-person
    keypoints = poses[0].keypoints;
    const nose = findKeypoint(keypoints, 'nose');
    const maxDiff = 5 * videoCanvas.width / 7;

    //only take values between 1/7 and 6/7 of the screen width into account
    const percentage = (nose.x - videoCanvas.width / 7) / maxDiff;

    playerPaddle.x = gameCanvas.width * (1 - clamp(percentage, 0, 1));
}

/**
 * Function to calculate the movement instruction according to the current pose.
 * Moves left when right hand is higher than left hand and moves right when left hand is higher than right hand.
 */
function steeringWheel() {
    //there should only one relevant pose be detected as PoseNet is configured for a single-person
    keypoints = poses[0].keypoints;
    //calculate absolute y-difference between left and right wrist
    const diff = calcYDiff(keypoints, "right_wrist", "left_wrist");
    const maxDiff = 2 * videoCanvas.height / 3;

    //calculate y-difference relative to the image size
    const percentage = clamp(diff / maxDiff, -1, 1);
    var leftPercentage;
    var rightPercentage;

    handleInput(percentage);
    if (percentage > 0) {
        //move to the left
        leftColor = chosenColor;
        leftPercentage = percentage;

        rightColor = deactiveColor;
        rightPercentage = 0;
    } else if (percentage < 0) {
        //move to the right
        leftColor = deactiveColor;
        leftPercentage = 0;

        rightColor = chosenColor;
        rightPercentage = -percentage;
    } else {
        //do not move
        leftColor = deactiveColor;
        leftPercentage = 0;

        rightColor = deactiveColor;
        rightPercentage = 0;
    }

    //update intensity bars left and right to the camera
    leftIntensity.style.height = leftPercentage * 100 + "%";
    leftIntensity.style.backgroundColor = leftColor;
    rightIntensity.style.height = rightPercentage * 100 + "%";
    rightIntensity.style.backgroundColor = rightColor;
}

/**
 * Function to calculate the movement instruction according to the current pose.
 * Moves left when left arm is raised and moves right when the right arm is raised.
 */
function triggerOnRaiseArm() {
    //there should only one relevant pose be detected as PoseNet is configured for a single-person
    keypoints = poses[0].keypoints;
    //calculate absolute y-difference of both arms
    const leftdiff = calcYDiff(keypoints, "left_elbow", "left_wrist");
    const rightdiff = calcYDiff(keypoints, "right_elbow", "right_wrist");
    const maxdiff = calcMaxDistance(keypoints);

    //calculate y-difference relative to the size of the percepted body
    const leftPercentage = leftdiff / maxdiff;
    const rightPercentage = rightdiff / maxdiff;

    if (leftdiff > 0 && leftdiff >= rightdiff) {
        //input left
        handleInput(-leftPercentage);
        leftColor = chosenColor;
        //determine if right is active or deactive
        if (rightdiff > 0) {
            rightColor = activeColor;
        } else {
            rightColor = deactiveColor;
        }
    } else if (rightdiff > 0 && rightdiff > leftdiff) {
        //input right
        handleInput(rightPercentage);
        rightColor = chosenColor;
        //determine if left is active or deactive
        if (leftdiff > 0) {
            leftColor = activeColor;
        } else {
            leftColor = deactiveColor;
        }
    } else {
        //input stay, both directions are deactive
        handleInput(0);
        rightColor = deactiveColor;
        leftColor = deactiveColor;
    }

    //update intensity bars left and right to the camera
    leftIntensity.style.height = clamp(leftPercentage, 0, 1) * 100 + "%";
    leftIntensity.style.backgroundColor = leftColor;
    rightIntensity.style.height = clamp(rightPercentage, 0, 1) * 100 + "%";
    rightIntensity.style.backgroundColor = rightColor;
}

// MOVEMENT CALCULATIONS END

/**
 * Returns the first keypoint in keypoints that matches the given name
 * @param {keypoints} keypoints all available keypoints to search
 * @param {String} name name of the keypoint to be found
 * @returns keypoint if found, null otherwise
 */
function findKeypoint(keypoints, name) {
    return keypoints.find((keypoint) => keypoint.name == name);
}

/**
 * Calculate difference between x-values of two keypoints
 * @param {keypoints} keypoints all available keypoints
 * @param {String} topName name of the keypoint who is subtracted from
 * @param {String} bottomName name of the keypoint who's x-value gets subtracted
 * @returns {number} the x-difference
 */
function calcXDiff(keypoints, topName, bottomName) {
    return (
        findKeypoint(keypoints, topName).x - findKeypoint(keypoints, bottomName).x
    );
}

/**
 * Calculate difference between y-values of two keypoints
 * @param {keypoints} keypoints all available keypoints
 * @param {String} topName name of the keypoint who is subtracted from
 * @param {String} bottomName name of the keypoint who's y-value gets subtracted
 * @returns {number} the y-difference, positive if topName above bottomName
 */
function calcYDiff(keypoints, topName, bottomName) {
    return (
        findKeypoint(keypoints, topName).y - findKeypoint(keypoints, bottomName).y
    );
}

/**
 * Calculates distance between two keypoints in 2D.
 * @param {keypoints} keypoints all available keypoints
 * @param {String} topName name of the first keypoint
 * @param {String} bottomName name of the second keypoint
 * @returns {number} the distance between two keypoints
 */
function calcDistance(keypoints, topName, bottomName) {
    xdiff = calcXDiff(keypoints, topName, bottomName);
    ydiff = calcYDiff(keypoints, topName, bottomName);
    return Math.sqrt(xdiff * xdiff + ydiff * ydiff);
}

/**
 * Calculates the maximum distance that is expected between an elbow and the wrist on the same arm
 * @param {keypoints} keypoints all available keypoints
 * @returns the maximum expected distance
 */
function calcMaxDistance(keypoints) {
    // approximation: dist(hip, shoulder) = 2*max(dist(elbow, wrist))
    var left = calcDistance(keypoints, "left_shoulder", "left_hip");
    var right = calcDistance(keypoints, "right_shoulder", "right_hip");
    // approximation: 3*dist(left_ear, right_ear) = 2*max(dist(elbow, wrist))
    var head = calcDistance(keypoints, "left_ear", "right_ear");
    //solve above approximations for max(dist(elbow, wrist)) and return the expected maximum value for dist(elbow, wrist)
    return (left / 2 + right / 2 + (3 * head) / 2) / 3;
}

//-------------------------------------------------------------------------------------------------------------------------------
//----------------------------------------------- DRAWING POSE ------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------

/**
 * Draw an entire pose which was created by PoseNet on the given context
 * @param {context} context the context on which is drawn
 * @param {pose} pose the pose that gets drawn
 */
function drawPose(context, pose) {
    const keypoints = pose.keypoints;
    // draw line between the two relevant keypoint-pairs
    drawLink(context, leftColor, keypoints, "left_elbow", "left_wrist");
    drawLink(context, rightColor, keypoints, "right_elbow", "right_wrist");
    // draw all available keypoints
    keypoints.forEach((keypoint) => drawKeypoint(context, keypoint));
}

/**
 * Draw a single keypoint which was created by PoseNet on the given context
 * @param {context} context the context on which is drawn
 * @param {keypoint} keypoint the keypoint that gets drawn
 */
function drawKeypoint(context, keypoint) {
    // Set the color and size for the keypoint
    context.fillStyle = "red";
    context.beginPath();

    // Draw a filled circle for the keypoint
    context.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
    context.fill();
}

/**
 * Draw a line connecting two keypoints created by PoseNet on the given context
 * @param {context} context the context on which is drawn
 * @param {color} color the color with which the line gets drawn
 * @param {keypoints} keypoints all available keypoints
 * @param {String} nameFrom the name of the keypoint where the line starts
 * @param {String} nameTo the name of the keypoint where the line ends
 */
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
