import os
import pandas as pd
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

DATASET_PATH = os.path.join(
    BASE_DIR,
    "training",
    "intent_dataset.csv"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "intent_classifier.joblib"
)


# =========================================================
# LOAD DATA
# =========================================================

data = pd.read_csv(DATASET_PATH)

X = data["text"]
y = data["intent"]


# =========================================================
# TRAIN / VALIDATION SPLIT
# =========================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


# =========================================================
# NLP + ML PIPELINE
# =========================================================

model = Pipeline([
    (
        "tfidf",
        TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2)
        )
    ),
    (
        "classifier",
        LogisticRegression(
            max_iter=1000
        )
    )
])


# =========================================================
# TRAIN
# =========================================================

model.fit(
    X_train,
    y_train
)


# =========================================================
# EVALUATE
# =========================================================

predictions = model.predict(
    X_test
)

print(
    classification_report(
        y_test,
        predictions
    )
)


# =========================================================
# SAVE MODEL
# =========================================================

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

joblib.dump(
    model,
    MODEL_PATH
)

print()
print(
    f"Model saved to: {MODEL_PATH}"
)