"""
Space Debris Tracker
Phase 4.2A - ML inference engine.

Loads the trained orbital-risk classifier and produces
risk classifications from SGP4-derived conjunction data.

IMPORTANT:
    The returned confidence is model classification confidence.
    It is NOT physical collision probability.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

import joblib
import numpy as np

from ai.training.orbital_features import (
    build_feature_vector,
    validate_feature_vector,
)


# ============================================================
# PATHS
# ============================================================

AI_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = AI_DIR / "models"

MODEL_FILE = MODELS_DIR / "orbital_risk_model.joblib"
METADATA_FILE = MODELS_DIR / "orbital_risk_model_metadata.json"


# ============================================================
# CLASS NAMES
# ============================================================

CLASS_NAMES = {
    0: "LOW",
    1: "MEDIUM",
    2: "HIGH",
    3: "CRITICAL",
}


# ============================================================
# MODEL CONTAINER
# ============================================================

_model = None
_metadata = None


# ============================================================
# LOAD MODEL
# ============================================================

def load_model():
    """
    Load the trained model once and keep it in memory.
    """

    global _model
    global _metadata

    if _model is not None:
        return _model

    if not MODEL_FILE.exists():
        raise FileNotFoundError(
            f"Trained model not found: {MODEL_FILE}"
        )

    if not METADATA_FILE.exists():
        raise FileNotFoundError(
            f"Model metadata not found: {METADATA_FILE}"
        )

    _model = joblib.load(MODEL_FILE)

    with METADATA_FILE.open(
        "r",
        encoding="utf-8",
    ) as file:
        _metadata = json.load(file)

    return _model


# ============================================================
# METADATA
# ============================================================

def get_model_metadata() -> Dict[str, Any]:

    load_model()

    return dict(_metadata)


# ============================================================
# FEATURE ARRAY
# ============================================================

def build_model_input(
    collision: Dict[str, Any],
) -> tuple[np.ndarray, Dict[str, float]]:
    """
    Convert a backend collision record into the exact
    feature order used during training.
    """

    load_model()

    features = build_feature_vector(collision)

    if not validate_feature_vector(features):
        raise ValueError(
            "Generated feature vector failed validation."
        )

    feature_names = _metadata["feature_names"]

    missing = [
        name
        for name in feature_names
        if name not in features
    ]

    if missing:
        raise ValueError(
            f"Missing model features: {missing}"
        )

    values = [
        float(features[name])
        for name in feature_names
    ]

    X = np.asarray(
        [values],
        dtype=np.float64,
    )

    return X, features


# ============================================================
# PREDICTION
# ============================================================

def predict_collision_risk(
    collision: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Predict the ML screening-risk class for one conjunction.

    Expected input:

    {
        "closestApproach": {
            "missDistanceKm": ...,
            "relativeVelocityKms": ...,
            "timeToClosestApproachSeconds": ...
        }
    }

    Returns model classification confidence rather than
    physical collision probability.
    """

    model = load_model()

    X, features = build_model_input(
        collision
    )

    prediction = int(
        model.predict(X)[0]
    )

    risk_level = CLASS_NAMES.get(
        prediction,
        "UNKNOWN",
    )

    # --------------------------------------------------------
    # CLASS PROBABILITIES
    # --------------------------------------------------------

    class_scores = {
        "LOW": 0.0,
        "MEDIUM": 0.0,
        "HIGH": 0.0,
        "CRITICAL": 0.0,
    }

    confidence = 0.0

    if hasattr(model, "predict_proba"):

        probabilities = model.predict_proba(X)[0]

        for class_id, probability in zip(
            model.classes_,
            probabilities,
        ):

            class_name = CLASS_NAMES.get(
                int(class_id)
            )

            if class_name:

                class_scores[class_name] = float(
                    probability
                )

        confidence = max(
            class_scores.values()
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "risk_level": risk_level,
        "risk_class": prediction,

        "confidence": round(
            confidence,
            6,
        ),

        "class_scores": {
            name: round(score, 6)
            for name, score
            in class_scores.items()
        },

        "features": features,

        "model": {
            "name": _metadata.get(
                "model_name",
                "unknown",
            ),

            "version": "4.2A",

            "type": "orbital-risk-classifier",
        },

        "interpretation": {
            "confidence_type": (
                "ML classification confidence"
            ),

            "collision_probability": None,

            "note": (
                "Confidence is the classifier's confidence "
                "in its screening-risk class. It is not "
                "physical collision probability."
            ),
        },
    }


# ============================================================
# BATCH PREDICTION
# ============================================================

def predict_collision_batch(
    collisions: list[Dict[str, Any]],
) -> list[Dict[str, Any]]:
    """
    Predict multiple conjunction records.
    """

    return [
        predict_collision_risk(collision)
        for collision in collisions
    ]