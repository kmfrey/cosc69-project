/**
 * Created by Wing on 13-2-17.
 * This is a nodejs server.
 * Most of the code is boilerplate such as necessary dependencies declarations,
 * setup of ip, port.
 */

//region Setup
//---------------------------------------------------------------------------------------

// dependencies:
var express = require('express');
var ip = require('ip');
var path = require('path');
var fs = require('fs');
var mlog = require('morgan'); // request mlog
var log4js = require('log4js'); // common mlog (logging our messages to file)
var createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { spawn } = require('child_process');


// region DATA COLLECTION
// ------------------------------------------------------
var logsPath = 'logs/';
// create log file path, replace all : occurences for Windows
var logfile = logsPath + (new Date()).toISOString().replace(/:/g, '.');
var dataPath = 'data/';
// ------------------------------------------------------
// endregion

var logger = log4js.getLogger();

var ipaddress = ip.isPrivate(ip.address()) ? 'localhost' : ip.address();

// process.argv is the list of arguments given when executing the server.
// format: npm start -- <port> <demo /test>
// port: process.argv[2]
// mode: process.argv[3]

// Check if port given is a number
var port = (process.argv[2] !== undefined && !isNaN(process.argv[2]))
    ? parseInt(process.argv[2]) : 8000;

// Running the app in test or demo mode?
var mode = "PROTOTYPE";

// Check if mode is valid
if (process.argv[3] !== undefined && process.argv[3].toUpperCase() === "EVALUATE") {
    mode = "EVALUATE";
}

var app = express();
app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));

// set up of the body parser
// this dependency is required to send json files
// the limit of 5mb means that it allows the posting of files <= 5mb
// this high limit is needed for the video tracking part as we send a lot of data there.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({
    limit: '5mb',
    extended: true,
    parameterLimit: 5000
}));
app.locals.pretty = true;

app.use(mlog('common'));

/**
 * Sets up the app.
 * Initializes the logs folder if needed.
 */
app.listen(port, function () {
    // check if log folder exists
    if (!fs.existsSync(logsPath)) {
        console.log('Creating logs folder for log4js');
        fs.mkdirSync(logsPath);
    }

    // Logger to write logs to file.
    // to change the filename or folder, change the filename part below.
    log4js.configure({
        appenders: {
            fileLog: { type: 'file', filename: logfile },
            console: { type: 'console' },
        },
        categories: {
            file: { appenders: ['fileLog'], level: 'error' },
            another: { appenders: ['console'], level: 'trace' },
            default: { appenders: ['console', 'fileLog'], level: 'trace' }
        }
    });

    //check if data folder exists
    if (!fs.existsSync(dataPath)) {
        console.log('Creating data folder');
        fs.mkdirSync(dataPath);
    }

    logger.info('[%s] Node server started on %s:%d in %s mode type %s, subject keep their heads stable during video: %s',
        (new Date()).toLocaleTimeString(), ipaddress, port, mode);
});


//---------------------------------------------------------------------------------------
//endregion

//region Data log setup
//---------------------------------------------------------------------------------------

var activity;
var calibration_gazer;
var video_gazer;
var user;
var dataIsWritten;
var user_clicks;
var mw_prediction;

function initDatacollection() {
    activity = { "stage_changes": [] };
    calibration_gazer = [];
    video_gazer = [];
    recent_video_data = [];
    user_clicks = [];
    dataIsWritten = false;
    mw_prediction = undefined;
}

/**
 * Creates user's properties.
 * Called when a new user is made.
 * The id of the user is the ISO time string of creation.
 * It's also the name of the data JSON saved at the end.
 * <environment> contains windows and screen size/resizes
 */
function initUser() {
    var d = new Date();
    user = {
        environment: {
            "initial": {},
            "resizes": []
        },
        id: d.toISOString().replace(/:/g, '.'),
        ratings: [],
        ratingbells: [],
        videostatus: []
    };

    user.stageCount = 0;

    logger.info("User created: " + JSON.stringify(user));
    return user;
}

/**
 *  * Writes the recorded data to file.
 * Saves the data to a file with name determined by the user.id.
 * @returns {string} Filename of saved data.
 */
function createFile() {
    var filename = dataPath + 'data (' + user.id + ').json';

    if (dataIsWritten)
        return filename;

    //combine data
    var data = {
        activity: activity,
        user: user,
        calibration_gazer_predictions: calibration_gazer,
        video_gazer_predictions: video_gazer,
        user_clicks: user_clicks
    }

    fs.writeFile(filename, Buffer.from(JSON.stringify(data)), function (err) {
        if (err) {
            logger.error("Error writing file " + filename + "\n" + err);
        }

        dataIsWritten = true;
    });
    return filename;
}

/**
 * Write a temporary data file for a single video period.
 * Processes the saccades with the R script.
 * @returns {Promise} CSV write promise.
 */
async function processData() {
    // build CSV: transform x & y for s
    tempDir = 'C:/Users/kmfre/projects/mobileX/temp-data/';
    csvPath = tempDir + 'gaze.csv';
    //check if data temp folder exists
    if (!fs.existsSync(tempDir)) {
        console.log('Creating data temp folder');
        fs.mkdirSync(tempDir);
    }

    const csvWriter = createCsvWriter({
        path: csvPath,
        header: [
            { id: 'gazeX_b_px', title: 'GazeX_b_px' },
            { id: 'gazeY_b_px', title: 'GazeY_b_px' },
            { id: 'timestamp_utc', title: 'Timestamp_utc' },
            { id: 'video_length', title: 'Video_length' },
            { id: 'video_time', title: 'Video_time' },
            { id: 'gazeX_s_px', title: 'GazeX_s_px' },
            { id: 'gazeY_s_px', title: 'GazeY_s_px' },
        ]
    });

    var csvData = [];
    for (const pred of recent_video_data) {
        var dataObj = {
            gazeX_b_px: pred.gazerX,
            gazeY_b_px: pred.gazerY,
            timestamp_utc: pred.time,
            video_length: pred.videoLength,
            video_time: pred.videoTime,
            gazeX_s_px: Number(pred.gazerX) + 8,
            gazeY_s_px: Number(pred.gazerY) + 109,
        }

        csvData.push(dataObj);
    }

    // Return the Promise
    await csvWriter.writeRecords(csvData);
    console.log('File written successfully.');
}

// Code taken from https://stackoverflow.com/a/47655913
function runPyModel(filepath) {
    // return a Promise for running the python code
    return new Promise((resolve, reject) => {
        const pyScript = spawn('python', ['c:/Users/kmfre/projects/mobileX/model/Scripts/MW_prediction_webgazer.py', filepath]);
        // handle output
        pyScript.stdout.on('data', data => { resolve(data.toString()); })
        pyScript.stderr.on('data', data => { reject(data.toString()) });
    });
}

//---------------------------------------------------------------------------------------
//endregion

/**
 * If we access localhost:8000/ , the server will render the index.jade view.
 */
app.get('/', function (req, res) {
    if (user === undefined) {
        initUser();
        initDatacollection();
        res.render('index', { title: mode + ': Eye-tracker experiment', mode: mode });
        logger.info("Beginning process.");
    } else {
        res.redirect('/instructions');
        logger.info("Restarting process.");
    }

    user.stageCount += 1;
    // cap on stageCount since there are only 2 stages (calibration & recording)
    if (user.stageCount > 2) user.stageCount = 2;
});

/**
 * Post general user infomation
 * Environment contains information about the user's screen and browser size.
 */
app.post('/environment/:type', function (req, res) {
    if (user === undefined) res.end();
    var type = req.params.type;
    if (type === "initial") {
        user.environment.initial = req.body;
    } else if (type === "resize") {
        user.environment.resizes.push(req.body);
    }
    logger.info("Environment (" + type + "):" + JSON.stringify(req.body));
    res.end();
});

app.get('/instructions', function (req, res) {
    if (user === undefined) {
        res.redirect('/');
    } else {
        res.render('instructions', { title: mode + ': Instructions', mode: mode });
    }
});

/**
 * Serves the calibration /video page
 */
app.get('/video', function (req, res) {
    if (user === undefined) {
        res.redirect('/');
    } else {
        res.render('video', { title: mode + ': Video', mode: mode, stageCount: user.stageCount, prediction: mw_prediction});
    }
});

/**
 * Serves the facechecker page
 */
app.get('/facecheck', function (req, res) {
    res.render('facecheck', { title: mode + ' Face checking', mode: mode });
});

/**
 * Logs the status of the recording.
 * The data is sent from the client as URL
 * format: /video/<status message>
 */
app.post('/videostatus', function (req, res) {
    if (user === undefined) res.end();
    user.videostatus.push(req.body);
    logger.info("Video: " + JSON.stringify(req.body));
    res.end();
});

/**
 * The gaze predictions from the watching stage is handled here.
 * params can be <gazer> or <clicks>
 *     <gazer> is the data of the gazer, automatically sent by client.
 *     <clicks> is the user clicks, sent at each click.
 */
app.post('/video/:type', function (req, res) {
    if (user === undefined) res.end();
    switch (req.params.type) {
        case "gazer":
            video_gazer = video_gazer.concat(req.body.data);
            recent_video_data = req.body.data;
            logger.info("Received video gazer data batch of length: " + req.body.data.length);
            // await data from model prediction, then send back to activity.js
            processData().then(
                runPyModel(csvPath).then((pred) => {
                    console.log('Prediction returned:', pred);
                    mw_prediction = pred;
                    res.end(pred, 'utf-8');
                }).catch((err) => { console.info('Python failed:', err); }))
                .catch((_) => console.error('Processing data failed'));
            break;
        default:
            video_gazer = video_gazer.concat(req.body.data);
            logger.info("Received tracker data batch of length: " + req.body.data.length);
            res.end();
            break;
    }
});

/**
 * Handles the log of period:predictions from activity.js.
 * Writes the data object to a file.
 */
app.post('/video/done', function(req, res){
    if (user === undefined) res.end();
    // Write the object to a data file
    predfile = dataPath + 'predictions' + user.id + '.json'
    fs.writeFile(predfile, Buffer.from(JSON.stringify(req.body.data)), function (err) {
        if (err) {
            logger.error("Error writing file " + filename + "\n" + err);
        }
    });
    // Write the bells to a data file
    ratingfile = dataPath + 'ratings' + user.id + '.json'
    fs.writeFile(ratingfile, Buffer.from(JSON.stringify(user.ratings)));
    res.end();
});

/**
 * Handles incoming userclicks.
 */
app.post('/userclicks', function (req, res) {
    if (user === undefined) res.end();
    user_clicks.push(req.body.data);
    logger.info("Received user clicks: " + JSON.stringify(req.body.data));
    res.end();
});

/**
 * Handles the calibration data coming in from the client.
 */
app.post('/calibration/:type', function (req, res) {
    if (user === undefined) res.end();

    switch (req.params.type) {
        case "gazer":
            calibration_gazer = calibration_gazer.concat(req.body.data);
            break;
        default:
        // do nothing
    }

    logger.info("Calibration data added: " + req.params.type);
    res.end();
});

/**
 * The rating information is being handled here.
 * After the user submits a rating, a rating object is created and added to the user.rating array.
 * Data is sent as URL, format:
 * /rate/ <rating> / <current video time in seconds> / <full video time in seconds>
 */
app.post('/rating/:type', function (req, res) {
    if (user === undefined) res.end();
    var type = req.params.type;
    var data = req.body;
    logger.info("Rating event recorded (" + type + "): " + JSON.stringify(data));
    switch (type) {
        case "rate":
            user.ratings.push(data);
            break;
        case "bell":
            user.ratingbells.push(data);
            break;
        default:
        // Do nothing.
    }
    res.end();
});

/**
 * After video playing is done.
 */
app.get('/next', function (req, res) {
    res.redirect('/');
});

/**
 * Receives and logs the stage changes of the user.
 * The stage changes are sent from the client.
 */
app.post('/stagechange', function (req, res) {
    if (user === undefined) res.end();
    activity.stage_changes.push(req.body);
    logger.info(JSON.stringify(req.body));
    res.end();
});

/**
 * Last page of the app, thanks the user and has additional notes.
 * Calls collectData() which returns a filename to log.
 */
app.get('/done', function (req, res) {
    if (user === undefined)
        res.redirect('/');

    logger.info("Experiment has reached its ending.\n Data saved at: " + createFile());
    logger.info("Last period data has been sent.\n Data saved.");
    res.render('done', { title: mode + ': Done', mode: mode });
});

/**
 * returns current stagecount
 */
app.get('/getstagecount', function (req, res) {
    res.send({ "stageCount": user.stageCount });
});

/**
 * returns app mode (prototype/evaluate)
 */
app.get('/getappmode', function (req, res) {
    res.send({ "mode": mode });
});

/**
 * Resets the app.
 * When user is set to undefined, the whole experiment starts anew.
 */
app.get('/reset', function (req, res) {
    user = undefined;
    logger.info('----------------------------- App reset -----------------------------');
    res.redirect('/');
});

//region Error handling
//---------------------------------------------------------------------------------------
/*
 * From here just catching errors
 */
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
//---------------------------------------------------------------------------------------
//endregion
