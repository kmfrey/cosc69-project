# AttentiSensor webapp
Experiment using webgazer.js, adapted from a project by [Yue Zhao](https://github.com/Yue-ZHAO/MWDET_WebApp). Data is processed using a Naive Bayes model adapted from the same team. Original code can be found [here](https://github.com/Yue-ZHAO/MWDET_Project).

# Running the app:
1. Download & install [Nodejs](https://nodejs.org/en/download/)
2. Go to the MW_webapp directory of the project, in terminal enter: ```npm install```
3. Enter ```npm start -- <port> </evaluate>``` <sup>[1][2]</sup>
4. Example: ```npm start -- 8000 prototype``` 
4. App should be available at ```localhost:8000/``` in prototype mode.

*<sup>[1]</sup> npm start*
- ```npm start``` is a script that runs ```node app.js```
- Format: ```npm start -- <port> <prototype/evaluate>```
- The `--` makes sure the given arguments are being passed to the underlying command
- ```node app.js <port> <prototype/evaluate>``` works just as well


*<sup>[2]</sup> All operating systems should respond to ```npm start``` which runs the command ```node app.js```. 
If ```node``` has been reserved for some other application (Linux), you can also start the server by entering ```nodejs app.js``` in the terminal.*

# Project Structure
Views are pug templates which are rendered into html pages by the server. The model runs on data processed by an R script that extracts saccade information using built in packages.

**Introduction**
- Views: index.pug
- Functions: intro.js

**Calibration**
- View: video.pug
- Functions: calibration.js 

**Watching & rating**
- View: video.pug
- Functions: video.js, rating.js, activity.js (server notifications)

**Mind Wandering Prediction**
- View: video.pug
- Functions (app side): app.js (running script), activity.js (sending information)
- Functions (script side): MW_prediction_webgazer.py, process_data.R (data preprocessing)

# Detailed Project Structure

```
MW_webapp/
  |-node_modules/
  |-public/
    |-fonts/                    - contains fonts and icons needed for bootstrap styling
    |-css/                        - contains bootstrap and custom stylesheets
      |-bootstrap-paper.min.css   - bootstrap stylesheet
      |-calibration.css           - custom styling for calibration page
      |-video.css                 - custom styling for video page
    |-javascript/               - contains client-side code
      |-bootstrap.min.js          - controls bootstrap elements
      |-jquery-3.1.1.min.js       - jQuery library
      |-jquery-ui-min.js          - jQuery UI library
      |-webgazer.js               - webgazer library  
      |-activity.js               - handles server notification functions such as videostatus, ratings, surveys.
      |-calibration.js            - used for the calibration function on page /video
      |-intro.js                  - used to control the index page (user information, welcome message)
      |-video.js                  - used to control the video on the /video page
      |-rating.js                 - used to control all rating functions
  |-views/                        - contains templates
    |-done.pug                    - Last page, displayed when the user finishes 2 rounds of the experiment
    |-error.pug                   - Error page when something goes wrong (server side or client side)
    |-index.pug                   - Index page, contains welcome message and the form for personal information 
    |-layout.pug                  - Main layout page, all other pages inherit from this page
    |-video.pug                   - Video page, contains rating and also the calibration step. Webgazer code runs here.
  |-app.js                        - Server application, handles routing, logs and saves data to file.
  |-package.json                  - Contains meta data and dependencies of project.
MWDET_Project/
  |-Scripts/
    |-features_labels_webgazer.csv                   - Contains the data from the original experiment to train the model.
    |-MW_prediction_webgazer.py                    - Code adapted from Script03 to build and use the model.
    |-process_data.R                   - Script to extract saccade information from webgazer data.
  |-node_modules/
  |-temp-data/
    |-gaze.csv                    - Data from the webapp. Replaced every period with new data.
    |-processed_data.csv                   - Information extracted from gaze.csv after running process_data.R
mw_model.sav                   - The Naive Bayes model created from data ini MWDET_Project/
package.json                   - Contains metadata and dependencies.
```

# Evaluation
By using the webapp in the evaluations mode, the user will be asked to provide information on when they find themselves mind wandering. To preserve the "randomness" and unobtrusiveness of the original experiment by Zhao, I only request an observation on mind state once every 2 cycles (40 seconds), sometime between 20 and 40 seconds.

It appears as though the model is continuously predicting that I am **not** mind-wandering, which is not true. However, the model does not work for everyone as stated in the work by Zhao & team. 