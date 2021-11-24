/**
 * Created by Wing on 14-2-17.
 * This file controls the calibration step
 */
'use strict'
function main() {
    //notifyStage server of stage change
    activity.notifyStage('Calibration', 'Start');

    //region webgazer code
    //---------------------------------------------------------------------------------------

    var pageStartTime = Date.now();
    var recentGazePrediction;

    var predPoint = (activity.getAppMode() !== "PROTOTYPE") ? true : false;
    // Initializes the webgazer, copied from the webgazer test page.
    function initWebgazer() {
        webgazer.setRegression('ridge') /* currently must set regression and tracker */
            .setTracker('clmtrackr')
            .setGazeListener(function (data, clock) {
                if (!data)
                    return;
                var x = data.x
                var y = data.y
                recentGazePrediction = { 'x': x, 'y': y, 'time': (Date.now() - pageStartTime) }
            })
            .begin()
            .showPredictionPoints(predPoint); /* shows a square every 100 milliseconds where current prediction is */
    }

    //---------------------------------------------------------------------------------------
    //endregion

    //region Calibration game code
    //---------------------------------------------------------------------------------------

    /*
     * Calibration parameters:
     * To change the calibration screen,
     * edit these parameters below:
     * (might require a bit of trial and error to get it just right)
     * i.e. for 40 buttons you can try 8x5, 5x8, 4x10, 10x4
     * the closer the 2 numbers are to each other, the better since then they're distributed more evenly.
     * 8x5 is in this case better since width > height; 8 and 5 are closer to each other than 4 and 10.
     */

    // size of buttons
    var button_size = 30;
    // determines how much padding there is from the edges to the nodes
    var padding = 30;
    // number of horizontal nodes
    var gameNodes_h = 8;
    // number of vertical nodes
    var gameNodes_v = 5;

    // list containing all the buttons
    var listOfIds = [];

    // calibration data to send to the server
    var calibrationData = [];
    var estimationData = [];
    var dataIsSent = false; // prevent multiple posts of data

    /**
     * Initializes the buttons on the screen
     * The number of nodes can be modified using the gameNodes_h and gameNodes_v parameters.
     * The nodes are divided evenly on the screen.
     */
    function initGame() {

        // Calculate the available space between the buttons.
        // rest: # pixels available to use
        // space: space between buttons
        var rest_h = $('#overlay').width() - (gameNodes_h * button_size / 2);
        var rest_v = $('#overlay').height() - (gameNodes_v * button_size / 2);
        var space_h = (rest_h) / (gameNodes_h - 1);
        var space_v = (rest_v) / (gameNodes_v - 1);
        var number = 0;

        // this determines which button should be displayed first
        var randStart = parseInt(Math.random() * gameNodes_h * gameNodes_v + 1);
        for (var i_width = 0; i_width < gameNodes_h; i_width++) {
            var bspace_h = (i_width === 0 || i_width === gameNodes_h) ? padding : (space_h * i_width) + padding;
            for (var i_height = 0; i_height < gameNodes_v; i_height++) {
                var bspace_v = (i_height === 0 || i_height === gameNodes_v) ? padding : (space_v * i_height) + padding;
                number++;
                var bId = 'calibration-btn-' + number;

                // button creation:
                var b = $('<button/>', {
                    text: '',
                    click: function (e) { $(this).hide(); clickedButton(e) },
                    id: bId,
                    class: 'cal-button',
                    style: 'top:' + parseInt(bspace_v) +
                    'px;left:' + parseInt(bspace_h) + 'px' +
                    ';height:' + button_size + 'px;' + 'width:' + button_size + 'px'
                });

                // show the middle node, hide the rest in the list
                if (number === randStart) {
                    $(b).css({ 'display': 'block' });
                    $(b).bind('click', function() {
                        $('#cal-info').fadeOut();
                    });
                }
                listOfIds.push(bId);

                $("#overlay").append(b);
            }
        }
        shuffle(listOfIds); // shuffles the buttons so random buttons pop up one by one
    }

    /**
     * A generic shuffle method, takes an array and outputs a shuffled array.
     * @param array Array to shuffle.
     * @returns {*} The shuffled array.
     */
    function shuffle(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;
        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    }

    /**
     * When a button is clicked,
     * another will be shown until there is no more left in the array
     * When array is empty, video will be loaded.
     * When a calibration button is clicked,
     * The user's mouse data is stored together with the webgazer's prediction.
     * This is then sent to the server.
     */
    function clickedButton(e) {
        // WHEN DONE:
        if (listOfIds.length !== 0) {
            // each calibration button is popped out of the list one-by-one.
            // it is set to fade in.
            $('#' + listOfIds.pop()).show();
        } else {
            if (!dataIsSent) {
               activity.stopCollectingGazerData();
            }
            showRecordingPage();
        }

        //hide progress after click
        $('#cal-progress').hide();
    }

    /**
     * Hides the overlay and shows the video page
     */
    function showRecordingPage() {
        $("#overlay").hide("fade");
        activity.notifyStage('Calibration', 'Finish');
        activity.notifyStage('Recording', 'Start');
    }

    //---------------------------------------------------------------------------------------
    //endregion

    initWebgazer(); // starts the webgazer code
    initGame(); // initializes the calibration buttons
    activity.startCollectingGazerData('/calibration/gazer'); // initalizes collection of gazer data, see activity.js

    //region Mouse, button events
    //---------------------------------------------------------------------------------------

    /**
     * When the skip button is clicked,
     * The list of buttons is set to empty so that we can skip the calibration step.
     */
    $('#btn-cal-skip').on('click', function () {
        listOfIds = [];
        clickedButton();
    });

    /**
     * When the user hovers on a calibration button,
     * progress is shown.
     */
    $('.cal-button').hover(function () {
        // empty progress div and append the new progress text
        $('#cal-progress').empty()
            .append(gameNodes_h * gameNodes_v - listOfIds.length + '/' + gameNodes_h * gameNodes_v);
        $('#cal-progress').show();
        // realign the progress div
        $('#cal-progress').css('top', $(this).position().top - button_size * .8);
        $('#cal-progress').css('left', $(this).position().left);
    }, function () {
        // when user hovers away, hide div.
        $('#cal-progress').hide();
    });

    //---------------------------------------------------------------------------------------
    //endregion
}

$(document).ready(main());
