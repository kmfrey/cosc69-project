/**
 * Created by codesalad on 6-3-17.
 *
 * Rating is a module that contains all functions
 * for the rating feature of the experiment.
 */
var rating = (function() {
    // public object to return
    var module = {};

    //region settings
    //---------------------------------------------------------------------------------------
    var rating_period = 40000; // 2*sampling period (20 seconds)
    var rating_min_time = 20000; // lower-bound of rating enable time
    var rating_max_time = rating_period - 1000; // upper-bound of rating enable time, the period minus 1 second
    var rating_time     = 10000; // the time user gets to rate

    var tutorialMode = false;

    // UI
    var ratingbox = $('.ratingContainer');
    var ratebutton = $('#btn-rate-submit');

    var rating_enabled = false;
    var rating_reminder = false;

    // timeout function for the rating box
    var ratingInterval;
    var ratingTimeout;
    //---------------------------------------------------------------------------------------
    //endregion

    //region private functions
    //---------------------------------------------------------------------------------------
    /**
     * Initializes general things like event handlers
     */
    function init() {
        // move ratingbox to appropriate location on page
        ratingbox.css('right', "30px");

        $(document).keydown(function(e) {
            if (e.which === 49) {
                module.rate(1);
            }
        });

        $('#btn-rate-ok').on('click', function() {
            ratingbox.hide("slide", {direction: "right"}, 300);
        });
    }

    /**
     * Enables the rating process after <rand time> seconds.
     */
    function enableRating() {
        // After set rating time, disable rating

        if (!tutorialMode) {
            // Every 40 seconds, get a new timeout between 20 and 39 seconds
            ratingInterval = setInterval(function() {
                waitAndExecute(getRandTime(), function() {
                    rating_enabled = true;
                    var audio = new Audio('other/alert.mp3');
                    audio.play();
    
                    // add focus back to document to rate
                    window.focus();
                    disableRating();
    
                    //send bell data to server
                    var data = {
                        "time": (new Date()).toISOString(),
                        "videoTime": new Date().valueOf() - activity.getMonitorStart(),
                        "videoDuration": 20000,
                        "stage": activity.getStageCount(),
                        "sample": activity.getSample()
                    };   
    
                    $.post('/rating/bell', data);         
                });
            }, rating_period);
        } else {
            waitAndExecute(2000, function() {
                rating_enabled = true;
                var audio = new Audio('other/alert.mp3');
                audio.play();
                disableRating();
            });
        }
    }

    /**
     * Gives the user <rating_time> seconds to rate before disabling rating.
     */
    function disableRating() {
        // After random time between rating_min_time and rating_max_time, enable rating again
        waitAndExecute(rating_time, function() {
            rating_enabled = false;
            // No need to call enableRating because there is now an interval.
            // enableRating();
        });
    }

    /**
     * Clears all timeouts and disables rating.
     */
    function pauseRating() {
        rating_enabled = false;
        clearTimeout(ratingTimeout);
    }

    /**
     * Returns a random time interval to wait before enabling rating
     * @returns {number} A random number between rating_max_time and rating_min_time
     */
    function getRandTime() {
        return Math.floor(Math.random()*(rating_max_time-rating_min_time+1)+rating_min_time);
    }

    /**
     * Used for the rating function
     * time is in ms, how long there needs to be waited before
     * the function "action" can be executed.
     * @param time Time to wait before executing
     * @param action Action to execute. MUST BE FUNCTION!
     */
    function waitAndExecute(time, action) {
        if (ratingTimeout !== undefined)
            clearTimeout(ratingTimeout); // clear all current timeouts for rating
        ratingTimeout = setTimeout(action, time); // set new timeout
    }
    //---------------------------------------------------------------------------------------
    //endregion

    //region public functions
    //---------------------------------------------------------------------------------------
    module.init = function() {
        init();
        console.log("Rating Initialized");
    };

    /**
     * Start rating procedure
     */
    module.enable = function() {
        enableRating();
        console.log("Rating Enabled");
    };

    /**
     * Pauses rating
     */
    module.pause = function() {
        pauseRating();
        console.log("Rating Paused");
    }

    /**
     * Sends the rating of the user to the server
     * @param rating The rating of the user
     * @param videotime Current time of the video in seconds
     * @param videoduration Duration of the video in seconds.
     */
    module.rate = function(rating)  {
        if (!rating_enabled || tutorialMode)
            return;

        var d = new Date();
        var time = d.toISOString();

        var data = {
            "time": time,
            "rating" : rating,
            "videoTime": d.valueOf() - activity.getMonitorStart(),
            "videoDuration": 20000,
            "stage": activity.getStageCount(),
            "sample": activity.getSample()
        };

        $.post('/rating/rate', data);

        rating_enabled = false;
        enableRating();
    };

    module.setTutorialMode = function() {
        console.log("Tutorial rating on");
        tutorialMode = true;
    }

    /**
     * Returns whether rating is enabled.
     */
    module.ratingEnabled = function() {
        return rating_enabled;
    }
    //---------------------------------------------------------------------------------------
    //endregion

    return module;
}) ();

$(document).ready(function() {
    rating.init();
});