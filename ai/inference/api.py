"""
Space Debris Tracker
Phase 4.2A - Local AI inference API.

FastAPI service exposing the locally trained orbital-risk
classifier to the existing Node.js backend.
"""

from __future__ import annotations
from typing import Any, Dict, List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ai.inference.intent_predictor import predict_intent
from ai.inference.nlu import understand
from ai.inference.predictor import (
    get_model_metadata,
    predict_collision_batch,
    predict_collision_risk,
)
from ai.inference.knowledge_api import (
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    search_knowledge
)


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="Space Debris Tracker AI",
    description=(
        "Local ML orbital-risk classification service "
        "for the Space Debris Tracker."
    ),
    version="4.2A",
)


# ============================================================
# REQUEST MODELS
# ============================================================

class CollisionRequest(BaseModel):
    closestApproach: Dict[str, Any]


class BatchCollisionRequest(BaseModel):
    collisions: List[Dict[str, Any]]

class IntentRequest(BaseModel):
    text: str

# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    try:

        metadata = get_model_metadata()

        return {
            "status": "ok",
            "service": "space-debris-tracker-ai",
            "version": "4.2A",
            "model_loaded": True,
            "model": metadata.get(
                "model_name",
                "unknown",
            ),
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# MODEL INFORMATION
# ============================================================

@app.get("/model")
def model_information():

    try:

        return get_model_metadata()

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


# ============================================================
# SINGLE PREDICTION
# ============================================================

@app.post("/predict")
def predict(
    request: CollisionRequest,
):

    try:

        result = predict_collision_risk(
            request.model_dump()
        )

        return result

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# ============================================================
# BATCH PREDICTION
# ============================================================

@app.post("/predict/batch")
def predict_batch(
    request: BatchCollisionRequest,
):

    try:

        results = predict_collision_batch(
            request.collisions
        )

        return {
            "count": len(results),
            "results": results,
        }

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "service": "Space Debris Tracker AI",
        "version": "4.2A",
        "status": "running",
        "endpoints": {
            "health": "GET /health",
            "model": "GET /model",
            "predict": "POST /predict",
            "batch": "POST /predict/batch",
        },
    }

# ============================================================
# intent prediction endpoint
# ============================================================

@app.post("/intent")
def predict_user_intent(request: IntentRequest):
    try:
        result = predict_intent(request.text)

        return {
            "success": True,
            **result
        }

    except ValueError as error:
        return {
            "success": False,
            "error": str(error)
        }

# ============================================================
# intent prediction endpoint
# ============================================================

@app.post("/nlu")
def understand_user_query(request: IntentRequest):
    try:
        result = understand(request.text)

        return {
            "success": True,
            **result
        }

    except ValueError as error:
        return {
            "success": False,
            "error": str(error)
        }

# ============================================================
# intent prediction endpoint
# ============================================================

@app.post(
    "/knowledge/search",
    response_model=KnowledgeSearchResponse
)
def knowledge_search(
    request: KnowledgeSearchRequest
):

    results = search_knowledge(
        query=request.query,
        top_k=request.top_k
    )

    return {
        "success": True,
        "query": request.query,
        "results": results
    }