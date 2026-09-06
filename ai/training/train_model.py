"""
Phase 4.2A ML training pipeline.

Trains and evaluates independent orbital-risk classifiers.

Models:
    1. Random Forest
    2. Gradient Boosting

Important:
    - Split is performed by source_id.
    - Validation data is never artificially balanced.
    - Synthetic samples from the same source stay together.
    - The model predicts risk class, not collision probability.
"""

from __future__ import annotations

import json
import random
from collections import Counter
from pathlib import Path

import joblib
import numpy as np

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.ensemble import RandomForestClassifier

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)

from sklearn.model_selection import GroupShuffleSplit


# ============================================================
# PATHS
# ============================================================

TRAINING_DIR = Path(__file__).resolve().parent
AI_DIR = TRAINING_DIR.parent
MODELS_DIR = AI_DIR / "models"

DATASET_FILE = TRAINING_DIR / "balanced_training_data.jsonl"

MODEL_FILE = MODELS_DIR / "orbital_risk_model.joblib"
METADATA_FILE = MODELS_DIR / "orbital_risk_model_metadata.json"


# ============================================================
# CONFIGURATION
# ============================================================

RANDOM_SEED = 42

VALIDATION_SIZE = 0.20

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

CLASS_NAMES = {
    0: "LOW",
    1: "MEDIUM",
    2: "HIGH",
    3: "CRITICAL",
}


# ============================================================
# RANDOM SEED
# ============================================================

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


# ============================================================
# LOAD DATA
# ============================================================

def load_dataset():

    if not DATASET_FILE.exists():

        raise FileNotFoundError(
            f"Dataset not found: {DATASET_FILE}"
        )

    records = []

    with DATASET_FILE.open(
        "r",
        encoding="utf-8",
    ) as file:

        for line in file:

            if line.strip():

                records.append(
                    json.loads(line)
                )

    if not records:

        raise RuntimeError(
            "Training dataset is empty."
        )

    print(
        f"[INFO] Loaded {len(records)} samples."
    )

    return records


# ============================================================
# BUILD ARRAYS
# ============================================================

def build_arrays(records):

    X = []

    y = []

    groups = []

    for record in records:

        features = record["features"]

        X.append([
            float(features[name])
            for name in FEATURE_NAMES
        ])

        y.append(
            int(record["target"]["risk_class"])
        )

        groups.append(
            record["source_id"]
        )

    return (
        np.asarray(X, dtype=np.float64),
        np.asarray(y, dtype=np.int64),
        np.asarray(groups),
    )


# ============================================================
# CLASS COUNTS
# ============================================================

def print_class_distribution(
    title,
    y,
):

    counts = Counter(y)

    print()
    print("=" * 60)
    print(title)
    print("=" * 60)

    for class_id in range(4):

        print(
            f"{CLASS_NAMES[class_id]:<12}: "
            f"{counts.get(class_id, 0)}"
        )


# ============================================================
# BALANCE TRAINING DATA
# ============================================================

def balance_training_data(
    X,
    y,
):

    rng = np.random.default_rng(
        RANDOM_SEED
    )

    indices_by_class = {}

    for class_id in range(4):

        indices = np.where(
            y == class_id
        )[0]

        indices_by_class[class_id] = indices

    non_empty = [
        len(indices)
        for indices in indices_by_class.values()
        if len(indices) > 0
    ]

    if not non_empty:

        raise RuntimeError(
            "Training split contains no classes."
        )

    target_count = max(non_empty)

    selected_indices = []

    for class_id in range(4):

        indices = indices_by_class[class_id]

        if len(indices) == 0:

            print(
                f"[WARNING] No {CLASS_NAMES[class_id]} "
                "samples in training split."
            )

            continue

        if len(indices) < target_count:

            extra = rng.choice(
                indices,
                size=target_count - len(indices),
                replace=True,
            )

            selected = np.concatenate(
                [indices, extra]
            )

        else:

            selected = rng.choice(
                indices,
                size=target_count,
                replace=False,
            )

        selected_indices.extend(
            selected.tolist()
        )

    rng.shuffle(
        selected_indices
    )

    selected_indices = np.asarray(
        selected_indices
    )

    return (
        X[selected_indices],
        y[selected_indices],
    )


# ============================================================
# MODEL CREATION
# ============================================================

def create_models():

    models = {

        "random_forest": RandomForestClassifier(
            n_estimators=300,
            max_depth=12,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=RANDOM_SEED,
            n_jobs=-1,
        ),

        "gradient_boosting": GradientBoostingClassifier(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=3,
            min_samples_leaf=3,
            random_state=RANDOM_SEED,
        ),
    }

    return models


# ============================================================
# EVALUATION
# ============================================================

def evaluate_model(
    model_name,
    model,
    X_validation,
    y_validation,
):

    predictions = model.predict(
        X_validation
    )

    accuracy = accuracy_score(
        y_validation,
        predictions,
    )

    macro_f1 = f1_score(
        y_validation,
        predictions,
        average="macro",
        zero_division=0,
    )

    weighted_f1 = f1_score(
        y_validation,
        predictions,
        average="weighted",
        zero_division=0,
    )

    print()
    print("=" * 60)
    print(f"MODEL: {model_name}")
    print("=" * 60)

    print(
        f"Accuracy   : {accuracy:.4f}"
    )

    print(
        f"Macro F1   : {macro_f1:.4f}"
    )

    print(
        f"Weighted F1: {weighted_f1:.4f}"
    )

    print()
    print("CLASSIFICATION REPORT")
    print(
        classification_report(
            y_validation,
            predictions,
            labels=[0, 1, 2, 3],
            target_names=[
                CLASS_NAMES[0],
                CLASS_NAMES[1],
                CLASS_NAMES[2],
                CLASS_NAMES[3],
            ],
            zero_division=0,
        )
    )

    print("CONFUSION MATRIX")

    print(
        confusion_matrix(
            y_validation,
            predictions,
            labels=[0, 1, 2, 3],
        )
    )

    return {
        "accuracy": float(accuracy),
        "macro_f1": float(macro_f1),
        "weighted_f1": float(weighted_f1),
    }


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print("SPACE DEBRIS TRACKER")
    print("PHASE 4.2A ML TRAINING")
    print("=" * 60)

    records = load_dataset()

    X, y, groups = build_arrays(
        records
    )

    print_class_distribution(
        "FULL DATASET",
        y,
    )

    print(
        f"\n[INFO] Unique source groups: "
        f"{len(np.unique(groups))}"
    )

    # --------------------------------------------------------
    # GROUPED TRAIN / VALIDATION SPLIT
    # --------------------------------------------------------

    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=VALIDATION_SIZE,
        random_state=RANDOM_SEED,
    )

    train_indices, validation_indices = next(
        splitter.split(
            X,
            y,
            groups=groups,
        )
    )

    X_train = X[train_indices]
    y_train = y[train_indices]

    X_validation = X[validation_indices]
    y_validation = y[validation_indices]

    train_groups = set(
        groups[train_indices]
    )

    validation_groups = set(
        groups[validation_indices]
    )

    overlap = (
        train_groups
        & validation_groups
    )

    if overlap:

        raise RuntimeError(
            "DATA LEAKAGE DETECTED: "
            "source groups overlap."
        )

    print()
    print(
        f"[INFO] Training source groups: "
        f"{len(train_groups)}"
    )

    print(
        f"[INFO] Validation source groups: "
        f"{len(validation_groups)}"
    )

    print_class_distribution(
        "TRAINING BEFORE BALANCING",
        y_train,
    )

    print_class_distribution(
        "VALIDATION — UNTOUCHED",
        y_validation,
    )

    # --------------------------------------------------------
    # BALANCE TRAINING ONLY
    # --------------------------------------------------------

    X_train_balanced, y_train_balanced = (
        balance_training_data(
            X_train,
            y_train,
        )
    )

    print_class_distribution(
        "TRAINING AFTER BALANCING",
        y_train_balanced,
    )

    print(
        f"\n[INFO] Final training samples: "
        f"{len(y_train_balanced)}"
    )

    print(
        f"[INFO] Final validation samples: "
        f"{len(y_validation)}"
    )

    # --------------------------------------------------------
    # TRAIN MODELS
    # --------------------------------------------------------

    models = create_models()

    results = {}

    best_name = None
    best_model = None
    best_score = -1.0

    for model_name, model in models.items():

        print(
            f"\n[INFO] Training {model_name}..."
        )

        model.fit(
            X_train_balanced,
            y_train_balanced,
        )

        metrics = evaluate_model(
            model_name,
            model,
            X_validation,
            y_validation,
        )

        results[model_name] = metrics

        if metrics["macro_f1"] > best_score:

            best_score = metrics["macro_f1"]

            best_name = model_name
            best_model = model

    # --------------------------------------------------------
    # SAVE BEST MODEL
    # --------------------------------------------------------

    MODELS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        best_model,
        MODEL_FILE,
    )

    metadata = {
        "model_name": best_name,
        "model_file": MODEL_FILE.name,

        "feature_names": FEATURE_NAMES,

        "classes": CLASS_NAMES,

        "random_seed": RANDOM_SEED,

        "validation_size": VALIDATION_SIZE,

        "training_samples": int(
            len(y_train_balanced)
        ),

        "validation_samples": int(
            len(y_validation)
        ),

        "training_source_groups": int(
            len(train_groups)
        ),

        "validation_source_groups": int(
            len(validation_groups)
        ),

        "metrics": results,

        "scientific_note": (
            "This model performs risk classification "
            "from SGP4-derived orbital screening features. "
            "It does not produce a physical collision "
            "probability because covariance and empirical "
            "collision-outcome data are not available."
        ),
    }

    with METADATA_FILE.open(
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            metadata,
            file,
            indent=2,
        )

    print()
    print("=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)

    print(
        f"Best model : {best_name}"
    )

    print(
        f"Macro F1   : {best_score:.4f}"
    )

    print(
        f"Model      : {MODEL_FILE}"
    )

    print(
        f"Metadata   : {METADATA_FILE}"
    )

    print("=" * 60)


if __name__ == "__main__":
    main()