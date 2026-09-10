import json
import os

from sentence_transformers import SentenceTransformer


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

CHUNKS_PATH = os.path.join(
    BASE_DIR,
    "knowledge",
    "chunks",
    "knowledge_chunks.json"
)

EMBEDDINGS_DIR = os.path.join(
    BASE_DIR,
    "knowledge",
    "embeddings"
)

EMBEDDINGS_PATH = os.path.join(
    EMBEDDINGS_DIR,
    "knowledge_embeddings.npy"
)

METADATA_PATH = os.path.join(
    EMBEDDINGS_DIR,
    "knowledge_metadata.json"
)

MODEL_NAME = "all-MiniLM-L6-v2"


def load_chunks():
    with open(
        CHUNKS_PATH,
        "r",
        encoding="utf-8"
    ) as file:
        return json.load(file)


def main():
    print("=" * 70)
    print("LOADING KNOWLEDGE CHUNKS")
    print("=" * 70)

    chunks = load_chunks()

    print(
        f"Loaded {len(chunks)} chunks."
    )

    texts = [
    (
        f"Title: {chunk.get('title', '')}\n"
        f"Organization: {chunk.get('organization', '')}\n"
        f"Topics: {', '.join(chunk.get('topics', []))}\n"
        f"Content: {chunk.get('text', '')}"
    )
    for chunk in chunks
]

    print()
    print("=" * 70)
    print("LOADING EMBEDDING MODEL")
    print("=" * 70)

    print(
        f"Model: {MODEL_NAME}"
    )

    model = SentenceTransformer(
        MODEL_NAME
    )

    print()
    print("=" * 70)
    print("CREATING EMBEDDINGS")
    print("=" * 70)

    embeddings = model.encode(
        texts,
        show_progress_bar=True,
        normalize_embeddings=True
    )

    print(
        f"Embedding shape: {embeddings.shape}"
    )

    os.makedirs(
        EMBEDDINGS_DIR,
        exist_ok=True
    )

    import numpy as np

    np.save(
        EMBEDDINGS_PATH,
        embeddings
    )

    with open(
        METADATA_PATH,
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            chunks,
            file,
            indent=2,
            ensure_ascii=False
        )

    print()
    print("=" * 70)
    print("EMBEDDING BUILD COMPLETE")
    print("=" * 70)

    print(
        f"Chunks:      {len(chunks)}"
    )

    print(
        f"Dimensions:  {embeddings.shape[1]}"
    )

    print(
        f"Embeddings:  {EMBEDDINGS_PATH}"
    )

    print(
        f"Metadata:    {METADATA_PATH}"
    )


if __name__ == "__main__":
    main()