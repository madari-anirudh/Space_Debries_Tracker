from typing import List

from pydantic import BaseModel, Field

from ai.knowledge.retrieval.retriever import (
    KnowledgeRetriever
)


class KnowledgeSearchRequest(BaseModel):

    query: str = Field(
        ...,
        min_length=1,
        max_length=2000
    )

    top_k: int = Field(
        default=5,
        ge=1,
        le=10
    )


class KnowledgeSearchResponse(BaseModel):

    success: bool

    query: str

    results: List[dict]


retriever = KnowledgeRetriever()


def search_knowledge(
    query: str,
    top_k: int = 5
):

    results = retriever.search(
        query=query,
        top_k=top_k
    )

    return results