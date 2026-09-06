"""
Space Debris Tracker
Training Dataset Generator

Phase 4.2A

Converts collision-engine output into JSONL training data.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import requests

from ai.training.config import (
    COLLISION_THRESHOLD_KM,
    DATASET_FILE,
    DATASET_VERSION,
    GENERATOR_VERSION,
    PREDICTION_WINDOW_MINUTES,
)
from ai.training.orbital_features import (
    build_training_record,
    build_training_records,
    validate_feature_vector,
)


# ============================================================
# INPUT LOADING
# ============================================================

def load_json_file(file_path: Path) -> Any:
    """
    Load JSON data from a local file.
    """

    if not file_path.exists():
        raise FileNotFoundError(
            f"Input file does not exist: {file_path}"
        )

    with file_path.open(
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def extract_collisions(data: Any) -> List[Dict[str, Any]]:
    """
    Extract collision records from different possible
    API/JSON response structures.
    """

    if isinstance(data, list):
        return [
            item
            for item in data
            if isinstance(item, dict)
        ]

    if not isinstance(data, dict):
        return []

    # Common API structure:
    # { "collisions": [...] }
    collisions = data.get("collisions")

    if isinstance(collisions, list):
        return [
            item
            for item in collisions
            if isinstance(item, dict)
        ]

    # Alternative:
    # { "results": [...] }
    results = data.get("results")

    if isinstance(results, list):
        return [
            item
            for item in results
            if isinstance(item, dict)
        ]

    # Single collision object
    if (
        "closestApproach" in data
        or "missDistance" in data
        or "miss_distance_km" in data
    ):
        return [data]

    return []


# ============================================================
# API LOADING
# ============================================================

def fetch_collisions_from_api(
    api_url: str,
    minutes: int,
    threshold: float,
) -> List[Dict[str, Any]]:
    """
    Fetch collision data from the Node.js backend.
    """

    params = {
        "minutes": minutes,
        "threshold": threshold,
    }

    print("[INFO] Fetching collision data...")
    print(f"[INFO] API: {api_url}")

    response = requests.get(
        api_url,
        params=params,
        timeout=60,
    )

    response.raise_for_status()

    data = response.json()

    collisions = extract_collisions(data)

    print(
        f"[INFO] Received {len(collisions)} "
        f"collision records."
    )

    return collisions


# ============================================================
# DATASET RECORD
# ============================================================

def add_dataset_metadata(
    record: Dict[str, Any],
    source: str,
    index: int,
) -> Dict[str, Any]:
    """
    Add metadata required for reproducibility.
    """

    record["sample_id"] = (
        f"collision_{index + 1:06d}"
    )

    record["metadata"] = {
        "dataset_version": DATASET_VERSION,
        "generator_version": GENERATOR_VERSION,
        "created_at": datetime.now(
            timezone.utc
        ).isoformat(),
        "source": source,
        "prediction_window_minutes": (
            PREDICTION_WINDOW_MINUTES
        ),
        "collision_threshold_km": (
            COLLISION_THRESHOLD_KM
        ),
    }

    return record


# ============================================================
# VALIDATION
# ============================================================

def validate_records(
    records: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Keep only records containing a complete numerical
    feature vector.
    """

    valid_records = []

    for record in records:
        features = record.get("features")

        if validate_feature_vector(features):
            valid_records.append(record)
        else:
            print(
                "[WARNING] Invalid feature vector "
                f"for {record.get('sample_id')}. "
                "Skipping."
            )

    return valid_records


# ============================================================
# JSONL WRITER
# ============================================================

def write_jsonl(
    records: List[Dict[str, Any]],
    output_path: Path,
    overwrite: bool = False,
) -> None:
    """
    Write training records in JSON Lines format.
    """

    if output_path.exists() and not overwrite:
        raise FileExistsError(
            f"Output file already exists: {output_path}\n"
            "Use --overwrite to replace it."
        )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with output_path.open(
        "w",
        encoding="utf-8",
    ) as file:
        for record in records:
            file.write(
                json.dumps(
                    record,
                    separators=(",", ":"),
                )
                + "\n"
            )

    print(
        f"[SUCCESS] Dataset written to:\n"
        f"{output_path}"
    )


# ============================================================
# SUMMARY
# ============================================================

def print_summary(
    records: List[Dict[str, Any]],
) -> None:
    """
    Print a simple dataset summary.
    """

    risk_counts = {
        "LOW": 0,
        "MEDIUM": 0,
        "HIGH": 0,
        "CRITICAL": 0,
    }

    for record in records:
        target = record.get("target", {})

        risk = str(
            target.get(
                "risk_level",
                "LOW",
            )
        ).upper()

        if risk in risk_counts:
            risk_counts[risk] += 1

    print()
    print("=" * 60)
    print("TRAINING DATASET SUMMARY")
    print("=" * 60)

    print(
        f"Total samples : {len(records)}"
    )

    print(
        f"LOW           : {risk_counts['LOW']}"
    )

    print(
        f"MEDIUM        : {risk_counts['MEDIUM']}"
    )

    print(
        f"HIGH          : {risk_counts['HIGH']}"
    )

    print(
        f"CRITICAL      : {risk_counts['CRITICAL']}"
    )

    print("=" * 60)


# ============================================================
# MAIN
# ============================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Generate ML training data from "
            "space-debris collision observations."
        )
    )

    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help=(
            "Local JSON collision file."
        ),
    )

    parser.add_argument(
        "--api",
        type=str,
        default=(
            "http://localhost:5000/api/collisions"
        ),
        help=(
            "Collision API endpoint."
        ),
    )

    parser.add_argument(
        "--minutes",
        type=int,
        default=PREDICTION_WINDOW_MINUTES,
        help=(
            "Collision prediction window."
        ),
    )

    parser.add_argument(
        "--threshold",
        type=float,
        default=COLLISION_THRESHOLD_KM,
        help=(
            "Collision screening threshold in km."
        ),
    )

    parser.add_argument(
        "--output",
        type=str,
        default=str(DATASET_FILE),
        help=(
            "Output JSONL file."
        ),
    )

    parser.add_argument(
        "--overwrite",
        action="store_true",
        help=(
            "Overwrite an existing dataset."
        ),
    )

    args = parser.parse_args()

    # --------------------------------------------------------
    # Load source data
    # --------------------------------------------------------

    try:
        if args.input:
            input_path = Path(
                args.input
            ).resolve()

            print(
                f"[INFO] Loading local file:\n"
                f"{input_path}"
            )

            raw_data = load_json_file(
                input_path
            )

            collisions = extract_collisions(
                raw_data
            )

            source = str(input_path)

        else:
            collisions = (
                fetch_collisions_from_api(
                    args.api,
                    args.minutes,
                    args.threshold,
                )
            )

            source = args.api

    except Exception as error:
        print(
            f"[ERROR] Could not load collision data:\n"
            f"{error}"
        )
        sys.exit(1)

    # --------------------------------------------------------
    # Validate source
    # --------------------------------------------------------

    if not collisions:
        print(
            "[ERROR] No collision records found."
        )
        sys.exit(1)

    print(
        f"[INFO] Processing {len(collisions)} "
        f"collision observations..."
    )

    # --------------------------------------------------------
    # Build feature records
    # --------------------------------------------------------

    try:
        records = build_training_records(
            collisions
        )

    except Exception as error:
        print(
            "[ERROR] Feature generation failed:"
        )
        print(error)
        sys.exit(1)

    # --------------------------------------------------------
    # Add metadata
    # --------------------------------------------------------

    for index, record in enumerate(records):
        add_dataset_metadata(
            record,
            source,
            index,
        )

    # --------------------------------------------------------
    # Validate records
    # --------------------------------------------------------

    records = validate_records(
        records
    )

    if not records:
        print(
            "[ERROR] No valid training records "
            "were produced."
        )
        sys.exit(1)

    # --------------------------------------------------------
    # Write dataset
    # --------------------------------------------------------

    try:
        output_path = Path(
            args.output
        ).resolve()

        write_jsonl(
            records,
            output_path,
            args.overwrite,
        )

    except Exception as error:
        print(
            f"[ERROR] Could not write dataset:\n"
            f"{error}"
        )
        sys.exit(1)

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print_summary(records)

    print()
    print(
        "[SUCCESS] Phase 4.2A training-data "
        "generation completed."
    )


if __name__ == "__main__":
    main()