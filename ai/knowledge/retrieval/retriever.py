import json
import os

import numpy as np
from sentence_transformers import SentenceTransformer


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

EMBEDDINGS_PATH = os.path.join(
    BASE_DIR,
    "knowledge",
    "embeddings",
    "knowledge_embeddings.npy"
)

METADATA_PATH = os.path.join(
    BASE_DIR,
    "knowledge",
    "embeddings",
    "knowledge_metadata.json"
)

MODEL_NAME = "all-MiniLM-L6-v2"


class KnowledgeRetriever:

    def __init__(
        self,
        embeddings_path=EMBEDDINGS_PATH,
        metadata_path=METADATA_PATH,
        model_name=MODEL_NAME
    ):
        self.embeddings = np.load(
            embeddings_path
        )

        with open(
            metadata_path,
            "r",
            encoding="utf-8"
        ) as file:
            self.chunks = json.load(file)

        self.model = SentenceTransformer(
            model_name
        )

        if len(self.embeddings) != len(self.chunks):
            raise ValueError(
                "Embedding count does not match "
                "knowledge chunk count."
            )

    def search(
        self,
        query,
        top_k=5,
        max_chunks_per_source=2
    ):
        if not isinstance(query, str) or not query.strip():
            raise ValueError(
                "Query must be a non-empty string."
            )

        query_embedding = self.model.encode(
            [query],
            normalize_embeddings=True
        )[0]

        scores = np.dot(
            self.embeddings,
            query_embedding
        )

        ranked_indices = np.argsort(
            scores
        )[::-1]

        results = []
        source_counts = {}

        for index in ranked_indices:
            chunk = self.chunks[index]
            source_id = chunk["document_id"]

            current_count = source_counts.get(
                source_id,
                0
            )

            if current_count >= max_chunks_per_source:
                continue

            results.append({
                "score": float(scores[index]),
                "chunk_id": chunk["chunk_id"],
                "document_id": chunk["document_id"],
                "chunk_number": chunk["chunk_number"],
                "title": chunk["title"],
                "organization": chunk["organization"],
                "url": chunk["url"],
                "topics": chunk.get(
                    "topics"
                , []
                ),
                "text": chunk["text"]
            })
            
            source_counts[source_id] = (
                current_count + 1
            )
            if len(results) >= top_k:
                break
        return results


def main():

    retriever = KnowledgeRetriever()

    test_queries = [
        "What is a satellite?",
        "Why do satellites stay in orbit?",
        "What is space debris?",
        "What are different types of orbits?",
        "Why is orbital debris dangerous?"
    ]

    for query in test_queries:

        print()
        print("=" * 70)
        print(f"QUERY: {query}")
        print("=" * 70)

        results = retriever.search(
            query,
            top_k=3
        )

        for rank, result in enumerate(
            results,
            start=1
        ):
            print()
            print(
                f"#{rank} "
                f"score={result['score']:.4f}"
            )

            print(
                f"Source: {result['title']}"
            )

            print(
                f"Organization: "
                f"{result['organization']}"
            )

            print(
                f"Chunk: "
                f"{result['chunk_number']}"
            )

            print(
                f"Text: "
                f"{result['text'][:500]}"
            )


if __name__ == "__main__":
    main()