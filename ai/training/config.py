"""
Space Debris Tracker
AI Training Configuration

Phase 4.2A
"""

from pathlib import Path


# ============================================================
# PROJECT PATHS
# ============================================================

AI_DIR = Path(__file__).resolve().parent.parent
TRAINING_DIR = Path(__file__).resolve().parent

MODELS_DIR = AI_DIR / "models"

DATASET_FILE = TRAINING_DIR / "orbital_training_data.jsonl"


# ============================================================
# ORBITAL ANALYSIS
# ============================================================

# Prediction horizon used by the existing collision engine.
PREDICTION_WINDOW_MINUTES = 180

# Time step used when generating training observations.
TIME_STEP_SECONDS = 60

# Existing collision screening threshold.
COLLISION_THRESHOLD_KM = 100.0


# ============================================================
# PHYSICAL FEATURES
# ============================================================

# Distance ranges used to normalize the training features.
DISTANCE_MIN_KM = 0.0
DISTANCE_MAX_KM = 100.0

# Relative velocity range.
RELATIVE_VELOCITY_MIN_KMS = 0.0
RELATIVE_VELOCITY_MAX_KMS = 20.0

# Time-to-closest-approach range.
TIME_TO_TCA_MIN_SECONDS = 0.0
TIME_TO_TCA_MAX_SECONDS = PREDICTION_WINDOW_MINUTES * 60


# ============================================================
# RISK LEVELS
# ============================================================

RISK_LEVELS = {
    "LOW": 0,
    "MEDIUM": 1,
    "HIGH": 2,
    "CRITICAL": 3,
}


RISK_LEVEL_NAMES = {
    0: "LOW",
    1: "MEDIUM",
    2: "HIGH",
    3: "CRITICAL",
}


# ============================================================
# TRAINING DATA
# ============================================================

DATASET_VERSION = "1.0"

GENERATOR_VERSION = "4.2A"

RANDOM_SEED = 42


# ============================================================
# DATA AUGMENTATION
# ============================================================

# Number of synthetic variations generated from each
# real collision observation.
AUGMENTATION_VARIATIONS = 10

# Maximum random variation applied to numerical features.
DISTANCE_VARIATION_KM = 5.0
VELOCITY_VARIATION_KMS = 0.5
TIME_VARIATION_SECONDS = 120.0


# ============================================================
# MODEL
# ============================================================

MODEL_NAME = "space_debris_collision_risk"

MODEL_VERSION = "1.0"

MODEL_FILE = MODELS_DIR / f"{MODEL_NAME}.joblib"

MODEL_METADATA_FILE = MODELS_DIR / f"{MODEL_NAME}_metadata.json"


# ============================================================
# FEATURE NAMES
# ============================================================

# ============================================================
# MODEL FEATURES
# ============================================================
# These are independent orbital/physics-derived features.
#
# IMPORTANT:
# Do not include the existing backend risk classification here.
# The ML model must learn the risk relationship independently.
# ============================================================

FEATURE_NAMES = [
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
]


# ============================================================
# DIRECTORIES
# ============================================================

TRAINING_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)