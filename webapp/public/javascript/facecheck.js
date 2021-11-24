/**
 * Created by codesalad on 11-3-17.
 * This is taken from the demo page:
 * https://webgazer.cs.brown.edu/search/examples/face_detection.htm
 */
window.onload = function() {
    window.localStorage.clear();
    webgazer.setRegression('ridge') /* currently must set regression and tracker */
        .setTracker('clmtrackr')
        .setGazeListener(function(data, clock) {
            //   console.log(data); /* data is an object containing an x and y key which are the x and y prediction coordinates (no bounds limiting) */
            //   console.log(clock); /* elapsed time in milliseconds since webgazer.begin() was called */
        })
        .begin()
        .showPredictionPoints(false); /* shows a square every 100 milliseconds where current prediction is */

    var width = 640;
    var height = 480;
    var topDist = ($(document).height() - height) / 2 + 'px';
    var leftDist = ($(document).width() - width) / 2 + 'px';

    var setup = function() {
        var video = document.getElementById('webgazerVideoFeed');
        video.style.display = 'block';
        video.style.position = 'absolute';
        video.style.top = topDist;
        video.style.left = leftDist;
        video.style.zIndex = -1;
        video.width = width;
        video.height = height;
        // video.style.margin = '0px';

        webgazer.params.imgWidth = width;
        webgazer.params.imgHeight = height;

        var overlay = document.createElement('canvas');
        overlay.id = 'overlay';
        overlay.style.position = 'absolute';
        overlay.width = width;
        overlay.height = height;
        overlay.style.top = topDist;
        overlay.style.left = leftDist;
        // overlay.style.margin = '0px';

        document.body.appendChild(overlay);
        $('.canvasContainer').prepend($('#overlay'));

        var cl = webgazer.getTracker().clm;

        function drawLoop() {
            requestAnimFrame(drawLoop);
            overlay.getContext('2d').clearRect(0,0,width,height);
            if (cl.getCurrentPosition()) {
                cl.draw(overlay);
            }
        }
        drawLoop();

        $('#infobox').show();
        $('#infobox').css('top', parseInt(height + (($(document).height() - height) / 2) + 25) + 'px');
    };

    function checkIfReady() {
        if (webgazer.isReady()) {
            setup();
        } else {
            setTimeout(checkIfReady, 100);
        }
    }
    setTimeout(checkIfReady,100);

    window.onbeforeunload = function() {
        webgazer.end();
    };

    $('#btn-fcheck-continue').on('click', function() {
       window.location.href = '/video';
    });

};