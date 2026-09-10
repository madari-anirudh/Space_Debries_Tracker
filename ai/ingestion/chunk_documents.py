import json
import glob
import os
import re
import hashlib


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

DOCUMENTS_DIR = os.path.join(
    BASE_DIR,
    "knowledge",
    "documents"
)

CHUNKS_DIR = os.path.join(
    BASE_DIR,
    "knowledge",
    "chunks"
)

CHUNK_SIZE = 1800
CHUNK_OVERLAP = 300


def load_documents():
    files = glob.glob(
        os.path.join(
            DOCUMENTS_DIR,
            "*.json"
        )
    )

    documents = []

    for path in files:
        with open(
            path,
            "r",
            encoding="utf-8"
        ) as file:
            documents.append(
                json.load(file)
            )

    return documents


def normalize_text(text):
    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


def split_into_chunks(
    text,
    chunk_size=CHUNK_SIZE,
    overlap=CHUNK_OVERLAP
):
    text = normalize_text(text)

    if not text:
        return []

    chunks = []

    start = 0
    text_length = len(text)

    while start < text_length:

        end = min(
            start + chunk_size,
            text_length
        )

        if end < text_length:
            boundary = text.rfind(
                ". ",
                start,
                end
            )

            if boundary != -1 and boundary > start + 500:
                end = boundary + 1

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        next_start = end - overlap

        if next_start <= start:
            next_start = end

        start = next_start

    return chunks


def create_chunk_id(
    document_id,
    chunk_number,
    text
):
    raw_id = (
        f"{document_id}:"
        f"{chunk_number}:"
        f"{text}"
    )

    return hashlib.sha256(
        raw_id.encode("utf-8")
    ).hexdigest()[:16]


def create_chunks(document):
    text = document.get(
        "text",
        ""
    )

    chunks = split_into_chunks(
        text
    )

    results = []

    for index, chunk_text in enumerate(
        chunks,
        start=1
    ):
        chunk_id = create_chunk_id(
            document["id"],
            index,
            chunk_text
        )

        results.append({
            "chunk_id": chunk_id,
            "document_id": document["id"],
            "chunk_number": index,
            "title": document.get(
                "title"
            ),
            "organization": document.get(
                "organization"
            ),
            "url": document.get(
                "url"
            ),
            "topics": document.get(
                "topics",
                []
            ),
            "text": chunk_text
        })

    return results


def save_chunks(chunks):
    os.makedirs(
        CHUNKS_DIR,
        exist_ok=True
    )

    output_path = os.path.join(
        CHUNKS_DIR,
        "knowledge_chunks.json"
    )

    with open(
        output_path,
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            chunks,
            file,
            indent=2,
            ensure_ascii=False
        )

    return output_path


def main():
    documents = load_documents()

    print(
        f"Loaded {len(documents)} documents."
    )

    all_chunks = []

    for document in documents:
        chunks = create_chunks(
            document
        )

        all_chunks.extend(
            chunks
        )

        print(
            f"{document['id']}: "
            f"{len(chunks)} chunks"
        )

    output_path = save_chunks(
        all_chunks
    )

    print()
    print("=" * 70)
    print("CHUNKING COMPLETE")
    print(f"Documents: {len(documents)}")
    print(f"Chunks:    {len(all_chunks)}")
    print(f"Saved:     {output_path}")
    print("=" * 70)


if __name__ == "__main__":
    main()