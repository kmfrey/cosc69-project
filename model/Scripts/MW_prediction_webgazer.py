# the necessary cells from the Script03 in MWDET_Project to predict mind wandering.
# feature_labels_webgazer.csv has all the important information.

import datetime
import math
import sys

import numpy as np
import pandas as pd
import pickle
import rpy2.robjects as robjects
from imblearn.over_sampling import SMOTE
from rpy2.robjects.packages import importr

from scipy.stats import kurtosis, skew
from sklearn.naive_bayes import GaussianNB

robjects.r['source'](
    "c:/Users/kmfre/projects/mobileX/MWDET_Project/Scripts/process_data.R")
# Output: CSV filepath
transform_data_r = robjects.globalenv['fixation_webgazer_for_mw']
base = importr('base')
# import packages for R script
zoom = importr('zoom', lib_loc="C:/Users/kmfre/Documents/R/win-library/4.1")
saccades = importr('saccades', lib_loc="C:/Users/kmfre/Documents/R/win-library/4.1")
zoo = importr('zoo', lib_loc="C:/Users/kmfre/Documents/R/win-library/4.1")

# only need to include the global features as it provides the best results.
feature_index_global = [18, 19, 20, 21, 22, 23, 24, 25, 26,
                        42, 43, 44, 45, 46, 47, 48, 49, 50,
                        51, 52, 53, 54, 55, 56, 57, 58, 59,
                        60, 61, 62, 63, 64, 65, 66, 67]

model_file_name = "'C:/Users/kmfre/projects/mobileX/mw_model.sav"

# Adapted from the various trainings provided in the script.
# returns a Naive Bayes model trained on all but 1 data.

def train_MW_model():
    # Attempt to load the model
    try:
        clf_GaussianNB = pickle.load(open(model_file_name, 'rb'))
    # Otherwise, create the model and save it.
    except Exception:
        df_merge = pd.read_csv(
            "c:/Users/kmfre/projects/mobileX/MWDET_Project/Scripts/features_labels_webgazer.csv")

        # no need to keep a test set as this has been demonstrated by the prior work.
        data_train = df_merge

        X_train = data_train.iloc[:, feature_index_global].fillna(value=0)
        y_train = data_train.iloc[:, 4]

        sm = SMOTE(random_state=48)
        X_train, y_train = sm.fit_resample(X_train, y_train)

        clf_GaussianNB = GaussianNB()
        clf_GaussianNB = clf_GaussianNB.fit(X_train, y_train)

        # save to pickle
        pickle.dump(clf_GaussianNB, open(model_file_name, 'wb'))
    return clf_GaussianNB


# Takes in the trained model, the raw input CSV from webgazer.
# Output: 0 or 1 for mind-wandering.
def predict_MW(model, raw_input_filepath):
    output_filepath_r = "C:/Users/kmfre/projects/mobileX/temp-data/processed_data.csv"
    transform_data_r(raw_input_filepath, output_filepath_r)
    # retrieve processed data & read it into a df
    df_features = extract_features(output_filepath_r)

    column_labels = model.feature_names_in_
    
    # predict using the features
    X_test = df_features[column_labels].fillna(value=0)
    y_pred_bayes = model.predict(X_test)

    # return the output. It will be a double, 0 or 1.
    return y_pred_bayes[0]


# extract global features from the input data
# Output: DataFrame with features
def extract_features(rprocessed_csv):
    df_GazeData_rprocessed = pd.read_csv(rprocessed_csv)
    df_GazeData_rprocessed = df_GazeData_rprocessed.reset_index()

    # Remove unnessesary data
    df_GazeData_rprocessed = df_GazeData_rprocessed[['Timestamp_utc',
                                                     'FixationIndex',
                                                     'GazeEventDuration',
                                                     'FixationPointX..MCSpx.',
                                                     'FixationPointY..MCSpx.',
                                                     'AbsoluteSaccadicDirection']]
    df_GazeData_rprocessed.columns = ["Timestamp_utc",
                                      "FixationIndex",
                                      "GazeEventDuration",
                                      "FixationPointX (MCSpx)",
                                      "FixationPointY (MCSpx)",
                                      "AbsoluteSaccadicDirection"]

    df_GazeData_rprocessed['Timestamp_utc'] = df_GazeData_rprocessed.apply(
        timestamp_trans, axis=1)

    # Global Features: Feature Selection based on selected data
    temp_fixationindex = 0
    temp_timestamp = ""
    temp_FixationPointX = 0
    temp_FixationPointY = 0
    list_fixationduration = []
    list_saccadeduration = []
    list_saccadedistance = []
    list_saccadeangle = []

    for index, row in df_GazeData_rprocessed.iterrows():
        if np.isnan(row['FixationIndex']):
            continue

        if temp_fixationindex == 0:
            temp_fixationindex = row['FixationIndex']
            temp_timestamp = row['Timestamp_utc']
            temp_FixationPointX = row['FixationPointX (MCSpx)']
            temp_FixationPointY = row['FixationPointY (MCSpx)']

            list_fixationduration.append(row['GazeEventDuration'])
            list_saccadeangle.append(row['AbsoluteSaccadicDirection'])

        elif temp_fixationindex != row['FixationIndex']:
            # Global features
            temp_fixationindex = row['FixationIndex']
            list_fixationduration.append(row['GazeEventDuration'])
            list_saccadeangle.append(row['AbsoluteSaccadicDirection'])

            datetime_previous = datetime.datetime.strptime(
                temp_timestamp, "%Y-%m-%dT%H:%M:%SZ")
            datetime_current = datetime.datetime.strptime(
                row['Timestamp_utc'], "%Y-%m-%dT%H:%M:%SZ")
            saccadeduration = datetime_current - datetime_previous
            list_saccadeduration.append(
                float(saccadeduration.total_seconds() * 1000))

            FixationPointX_current = row['FixationPointX (MCSpx)']
            FixationPointY_current = row['FixationPointY (MCSpx)']
            saccadedistance = math.sqrt(math.pow((FixationPointX_current - temp_FixationPointX), 2) +
                                        math.pow((FixationPointY_current - temp_FixationPointY), 2))
            list_saccadedistance.append(saccadedistance)

            temp_timestamp = row['Timestamp_utc']
            temp_FixationPointX = row['FixationPointX (MCSpx)']
            temp_FixationPointY = row['FixationPointY (MCSpx)']

        else:
            temp_timestamp = row['Timestamp_utc']

        num_saccade_horizon = sum(1 for i in list_saccadeangle if (
            (i <= 30 and i >= -30) or (i >= 150 and i <= 210) or (i >= 330)))

        # if any lists are empty, fill with 0s
        if len(list_fixationduration) == 0:
            list_fixationduration = [0]
        if len(list_saccadeduration) == 0:
            list_saccadeduration = [.1]
        if len(list_saccadeangle) == 0:
            list_saccadeangle = [1]  # not 0 to avoid divide by 0
        if len(list_saccadedistance) == 0:
            list_saccadedistance = [0]
        df_features = pd.DataFrame()
        df_features = df_features.append({
            'fixationduration_min': np.min(list_fixationduration),
            'fixationduration_max': np.max(list_fixationduration),
            'fixationduration_mean': np.mean(list_fixationduration),
            'fixationduration_median': np.median(list_fixationduration),
            'fixationduration_stddev': np.std(list_fixationduration),
            'fixationduration_range': np.max(list_fixationduration) - np.min(list_fixationduration),
            'fixationduration_kurtosis': kurtosis(list_fixationduration),
            'fixationduration_skew': skew(list_fixationduration),
            'saccadeduration_min': np.min(list_saccadeduration),
            'saccadeduration_max': np.max(list_saccadeduration),
            'saccadeduration_mean': np.mean(list_saccadeduration),
            'saccadeduration_median': np.median(list_saccadeduration),
            'saccadeduration_stddev': np.std(list_saccadeduration),
            'saccadeduration_range': np.max(list_saccadeduration) - np.min(list_saccadeduration),
            'saccadeduration_kurtosis': kurtosis(list_saccadeduration),
            'saccadeduration_skew': skew(list_saccadeduration),
            'saccadedistance_min': np.min(list_saccadedistance),
            'saccadedistance_max': np.max(list_saccadedistance),
            'saccadedistance_mean': np.mean(list_saccadedistance),
            'saccadedistance_median': np.median(list_saccadedistance),
            'saccadedistance_stddev': np.std(list_saccadedistance),
            'saccadedistance_range': np.max(list_saccadedistance) - np.min(list_saccadedistance),
            'saccadedistance_kurtosis': kurtosis(list_saccadedistance),
            'saccadedistance_skew': skew(list_saccadedistance),
            'saccadeangel_min': np.min(list_saccadeangle),
            'saccadeangel_max': np.max(list_saccadeangle),
            'saccadeangel_mean': np.mean(list_saccadeangle),
            'saccadeangel_median': np.median(list_saccadeangle),
            'saccadeangel_stddev': np.std(list_saccadeangle),
            'saccadeangel_range': np.max(list_saccadeangle) - np.min(list_saccadeangle),
            'saccadeangel_kurtosis': kurtosis(list_saccadeangle),
            'saccadeangel_skew': skew(list_saccadeangle),
            'saccade_num': len(list_saccadeduration),
            'saccade_horizonratio': float(num_saccade_horizon)/len(list_saccadeangle),
            'fixation_saccade_ratio': sum(list_fixationduration)/sum(list_saccadeduration)
        }, ignore_index=True)

    return df_features


# change the format of Timestamp_utc
def timestamp_trans(row):
    temp_str = row['Timestamp_utc']
    temp_str = temp_str+"Z"
    temp_str = temp_str.replace(" ", "T")
    return temp_str

# retreive stored model or train a new one.
model = train_MW_model()
if len(sys.argv) < 1:
    print("Requires an argument of the filepath to process.")
    exit()
prediction = predict_MW(model, sys.argv[1])
sys.stdout.write(str(prediction))
