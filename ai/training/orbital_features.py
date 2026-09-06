"""
Orbital feature engineering for the Space Debris Tracker ML system.

The existing JavaScript/Satellite.js SGP4 engine remains the source
of orbital propagation.

This module converts collision observations into independent
physics-derived ML features.

IMPORTANT:
- Existing backend risk classification is NOT used as an ML feature.
- Existing AI prediction values are NOT used as ML features.
- This prevents target leakage.
- The target currently comes from the backend screening classification.
- This is a risk-classification model, NOT a physical collision
  probability model.
"""

from __future__ import annotations

from typing import Any, Dict

from .config import (
    DISTANCE_MIN_KM,
    DISTANCE_MAX_KM,
    RELATIVE_VELOCITY_MIN_KMS,
    RELATIVE_VELOCITY_MAX_KMS,
    TIME_TO_TCA_MIN_SECONDS,
    TIME_TO_TCA_MAX_SECONDS,
)


# ============================================================
# SAFE NUMERIC CONVERSION
# ============================================================

def safe_float(value: Any, default: float = 0.0) -> float:
    """
    Safely convert a value to float.
    """
    try:
        if value is None:
            return default

        result = float(value)

        if result != result:  # NaN
            return default

        return result

    except (TypeError, ValueError):
        return default


# ============================================================
# CLAMP
# ============================================================

def clamp(value: float, minimum: float, maximum: float) -> float:
    """
    Keep value inside [minimum, maximum].
    """
    return max(minimum, min(value, maximum))


# ============================================================
# NORMALIZATION
# ============================================================

def normalize(
    value: float,
    minimum: float,
    maximum: float,
) -> float:
    """
    Min-max normalization to [0, 1].
    """

    if maximum <= minimum:
        return 0.0

    normalized = (value - minimum) / (maximum - minimum)

    return clamp(normalized, 0.0, 1.0)


# ============================================================
# PHYSICS RISK COMPONENTS
# ============================================================

def calculate_distance_risk(miss_distance_km: float) -> float:
    """
    Smaller miss distance = higher risk.

    0 km   -> 1.0
    100 km -> 0.0
    """

    normalized = normalize(
        miss_distance_km,
        DISTANCE_MIN_KM,
        DISTANCE_MAX_KM,
    )

    return 1.0 - normalized


def calculate_velocity_risk(relative_velocity_kms: float) -> float:
    """
    Higher relative velocity = higher energetic encounter risk.
    """

    return normalize(
        relative_velocity_kms,
       RELATIVE_VELOCITY_MIN_KMS,
        RELATIVE_VELOCITY_MAX_KMS,
    )


def calculate_time_risk(time_to_tca_seconds: float) -> float:
    """
    Shorter time to closest approach = higher urgency.

    0 seconds -> 1.0
    10800 sec  -> 0.0
    """

    normalized = normalize(
        time_to_tca_seconds,
        TIME_TO_TCA_MIN_SECONDS,
        TIME_TO_TCA_MAX_SECONDS,
    )

    return 1.0 - normalized


def calculate_physics_risk_score(
    distance_risk: float,
    velocity_risk: float,
    time_risk: float,
) -> float:
    """
    Physics-inspired screening score.

    This is NOT collision probability.

    Distance receives the highest weight because miss distance
    is the strongest immediate screening signal.

    Time is the second strongest factor because an approaching
    event with little time remaining is more urgent.

    Relative velocity contributes additional encounter severity.
    """

    score = (
        0.50 * distance_risk
        + 0.30 * time_risk
        + 0.20 * velocity_risk
    )

    return clamp(score, 0.0, 1.0)


# ============================================================
# FEATURE VECTOR
# ============================================================

def build_feature_vector(collision: Dict[str, Any]) -> Dict[str, float]:
    """
    Convert one /api/collisions result into an independent
    ML feature vector.

    Expected backend structure:

    {
        "closestApproach": {
            "tca": "...",
            "timeToClosestApproachSeconds": ...,
            "missDistanceKm": ...,
            "relativeVelocityKms": ...,
            "riskLevel": "...",
            "riskScore": ...
        }
    }
    """

    closest = collision.get("closestApproach", {})

    # --------------------------------------------------------
    # Actual orbital quantities produced by the backend
    # --------------------------------------------------------

    miss_distance_km = safe_float(
        closest.get("missDistanceKm")
    )

    relative_velocity_kms = safe_float(
        closest.get("relativeVelocityKms")
    )

    time_to_tca_seconds = safe_float(
        closest.get("timeToClosestApproachSeconds")
    )

    # --------------------------------------------------------
    # Normalize raw orbital values
    # --------------------------------------------------------

    miss_distance_normalized = normalize(
        miss_distance_km,
        DISTANCE_MIN_KM,
        DISTANCE_MAX_KM,
    )

    relative_velocity_normalized = normalize(
        relative_velocity_kms,
        RELATIVE_VELOCITY_MIN_KMS,
        RELATIVE_VELOCITY_MAX_KMS,
    )

    time_to_tca_normalized = normalize(
        time_to_tca_seconds,
        TIME_TO_TCA_MIN_SECONDS,
        TIME_TO_TCA_MAX_SECONDS,
    )

    # --------------------------------------------------------
    # Physics-derived risk components
    # --------------------------------------------------------

    distance_risk = calculate_distance_risk(
        miss_distance_km
    )

    velocity_risk = calculate_velocity_risk(
        relative_velocity_kms
    )

    time_risk = calculate_time_risk(
        time_to_tca_seconds
    )

    physics_risk_score = calculate_physics_risk_score(
        distance_risk,
        velocity_risk,
        time_risk,
    )

    # --------------------------------------------------------
    # Independent ML feature vector
    # --------------------------------------------------------

    return {
        "miss_distance_km": miss_distance_km,
        "relative_velocity_kms": relative_velocity_kms,
        "time_to_tca_seconds": time_to_tca_seconds,

        "miss_distance_normalized": miss_distance_normalized,
        "relative_velocity_normalized": relative_velocity_normalized,
        "time_to_tca_normalized": time_to_tca_normalized,

        "physics_risk_score": physics_risk_score,

        "distance_risk": distance_risk,
        "velocity_risk": velocity_risk,
        "time_risk": time_risk,
    }


# ============================================================
# TARGET
# ============================================================

def build_target(collision: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build the supervised-learning target.

    For Phase 4.2A, the existing SGP4 collision-screening
    classification is used as the initial reference label.

    This is NOT claimed to be a measured collision probability.
    """

    closest = collision.get("closestApproach", {})

    risk_level = str(
        closest.get("riskLevel", "LOW")
    ).upper()

    risk_classes = {
        "LOW": 0,
        "MEDIUM": 1,
        "HIGH": 2,
        "CRITICAL": 3,
    }

    if risk_level not in risk_classes:
        risk_level = "LOW"

    return {
        "risk_level": risk_level,
        "risk_class": risk_classes[risk_level],
    }

# ============================================================
# TRAINING RECORD
# ============================================================

def build_training_record(
    collision: Dict[str, Any],
    sample_id: str,
) -> Dict[str, Any]:
    """
    Build one complete raw training record.

    The feature vector contains only independent orbital/
    physics-derived features.

    The existing backend risk classification is retained only
    as the supervised target and metadata, never as an input.
    """

    features = build_feature_vector(collision)
    target = build_target(collision)

    return {
        "sample_id": sample_id,
        "features": features,
        "target": target,
    }

    # ============================================================
# TRAINING RECORDS
# ============================================================

def build_training_records(
    collisions: list[Dict[str, Any]],
) -> list[Dict[str, Any]]:
    """
    Convert a list of collision observations into training records.

    Each record contains:
      - independent orbital/physics-derived features
      - supervised target

    Existing backend risk information is used only to create
    the target and is never included as a model feature.
    """

    records = []

    for index, collision in enumerate(collisions, start=1):

        record = {
            "sample_id": f"collision_{index:06d}",
            "features": build_feature_vector(collision),
            "target": build_target(collision),
        }

        records.append(record)

    return records

# ============================================================
# FEATURE VALIDATION
# ============================================================

def validate_feature_vector(
    features: Dict[str, float],
) -> bool:
    """
    Validate that a feature vector contains exactly the
    independent features required by the ML model.

    Returns:
        True  -> valid
        False -> invalid
    """

    required_features = {
        "miss_distance_km",
        "relative_velocity_kms",
        "time_to_tca_seconds",
        "miss_distance_normalized",
        "relative_velocity_normalized",
        "time_to_tca_normalized",
        "physics_risk_score",
        "distance_risk",
        "velocity_risk",
        "time_risk",
    }

    # Must contain exactly the expected feature set.
    if set(features.keys()) != required_features:
        return False

    # Every value must be numeric and finite.
    for value in features.values():

        if not isinstance(value, (int, float)):
            return False

        if value != value:  # NaN
            return False

        if value == float("inf") or value == float("-inf"):
            return False

    # Normalized/risk features must stay within [0, 1].
    bounded_features = {
        "miss_distance_normalized",
        "relative_velocity_normalized",
        "time_to_tca_normalized",
        "physics_risk_score",
        "distance_risk",
        "velocity_risk",
        "time_risk",
    }

    for name in bounded_features:
        if not 0.0 <= features[name] <= 1.0:
            return False

    # Physical quantities cannot be negative.
    if features["miss_distance_km"] < 0:
        return False

    if features["relative_velocity_kms"] < 0:
        return False

    if features["time_to_tca_seconds"] < 0:
        return False

    return True