/**
 * author: Zakaiah Frey
 * Controls the events of the /video page.
 */
'use strict'

//region video recording
//---------------------------------------------------------------------------------------

var gazerpaused = true;
// keep track of the FIRST time we enable the webgazer for the timestamp.
var starting = true;

//  The function indicates that when recording (state=1),
//  we should record for 10 seconds and then send the information to server.
function onStateChange(state) {
    if (state === "ACTIVE") {
        activity.startCollectingGazerData('/video/gazer');
        if (activity.getAppMode() !== "PROTOTYPE")
            rating.enable();
        webgazer.resume();
    } else if (state === "PAUSED") {
        $('#btn-end-gazer').show();
        sendRemainingData();
        rating.pause();
        webgazer.pause();
    }

    if (state === "ACTIVE" ||
        state === "PAUSED") {
        var status = state;
        if (starting) {
            status = "STARTED";
            starting = false;
        }
        activity.notifyVideo(status);
    }
}

//---------------------------------------------------------------------------------------
//endregion

//region UI and Mouse, button events
//---------------------------------------------------------------------------------------

// prevents congestion on server level because they share same route.
function sendRemainingData() {
    activity.stopCollectingGazerData();
}

// =============================================================================
// Page events
// =============================================================================

/**
 * pause/enable the webgazer
 */
$('#btn-enable-gazer').on('click', function () {
    gazerpaused = !gazerpaused;
    var newState = (gazerpaused) ? "PAUSED" : "ACTIVE";
    onStateChange(newState);
    // Color change indicates that recording is occuring.
    if (!gazerpaused) {
        this.style.backgroundColor = "rgb(2, 88, 88)";
        this.style.color = "white";
    }
    else {
        this.style.backgroundColor = "";
        this.style.color = "";
    }
});

/**
 * close textbox
 * "slide" is the mode of showing, box will slide into screen
 * direction: which way the box will slide
 * time in ms for animation.
 */
$('#btn-text-ok').on('click', function () {
    $('.textContainer').hide("slide", { direction: "left" }, 300);
});

/** 
 * When the user is done with the attention monitoring, send any remaining data and trigger next step.
 */
$('#btn-end-gazer').on('click', function () {
    activity.notifyStage('Recording', 'Finish');
    sendRemainingData();
    window.location.href = '/done';
});

//---------------------------------------------------------------------------------------
//endregion