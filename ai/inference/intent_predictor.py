import os
import joblib


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "intent_classifier.joblib"
)


# Load the trained model once when this module starts.
model = joblib.load(MODEL_PATH)


def predict_intent(text):
    """
    Predict the user's intent from natural language.
    """

    if not isinstance(text, str):
        raise ValueError("text must be a string")

    text = text.strip()

    if not text:
        raise ValueError("text cannot be empty")

    prediction = model.predict([text])[0]

    probabilities = model.predict_proba([text])[0]

    classes = model.classes_

    confidence = float(
        max(probabilities)
    )

    return {
        "intent": prediction,
        "confidence": confidence,
        "probabilities": {
            class_name: float(probability)
            for class_name, probability
            in zip(classes, probabilities)
        }
    }