import json
import os
from pydoc import text
import re
import hashlib
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup


BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

SOURCES_PATH = os.path.join(
    BASE_DIR,
    "knowledge",
    "sources.json"
)

RAW_DIR = os.path.join(
    BASE_DIR,
    "knowledge",
    "raw"
)

DOCUMENTS_DIR = os.path.join(
    BASE_DIR,
    "knowledge",
    "documents"
)

USER_AGENT = (
    "OrbitalAI-KnowledgeBot/1.0 "
    "(educational space-debris research project)"
)

REQUEST_TIMEOUT = 30


def load_sources():
    with open(
        SOURCES_PATH,
        "r",
        encoding="utf-8"
    ) as file:
        data = json.load(file)

    return data.get("sources", [])


def create_filename(source_id):
    return f"{source_id}.html"


def clean_text(html):
    soup = BeautifulSoup(
        html,
        "html.parser"
    )

    for element in soup(
        [
            "script",
            "style",
            "noscript",
            "svg",
            "nav",
            "footer",
            "header",
            "form"
        ]
    ):
        element.decompose()

    text = soup.get_text(
        separator="\n"
    )
    text =text.encode(
        "latin1",
        errors="ignore"
    ).decode(
        "utf-8",
        errors="ignore"
    )

    lines = []

    for line in text.splitlines():
        line = re.sub(
            r"\s+",
            " ",
            line
        ).strip()

        if line:
            lines.append(line)

    return "\n".join(lines)


def create_document(source, text):
    content_hash = hashlib.sha256(
        text.encode("utf-8")
    ).hexdigest()

    return {
        "id": source["id"],
        "title": source["name"],
        "organization": source["organization"],
        "url": source["url"],
        "topics": source.get("topics", []),
        "retrieved_at": datetime.now(
            timezone.utc
        ).isoformat(),
        "content_hash": content_hash,
        "text": text
    }


def fetch_source(source):
    print()
    print("=" * 70)
    print(f"Fetching: {source['name']}")
    print(f"URL: {source['url']}")

    response = requests.get(
        source["url"],
        headers={
            "User-Agent": USER_AGENT
        },
        timeout=REQUEST_TIMEOUT
    )

    response.raise_for_status()

    print(
        f"HTTP status: {response.status_code}"
    )

    response.encoding = response.apparent_encoding
    text = clean_text(
        response.text
    )

    if not text:
        raise ValueError(
            "No useful text was extracted."
        )

    print(
        f"Extracted characters: {len(text):,}"
    )

    return text


def save_raw(source, html):
    path = os.path.join(
        RAW_DIR,
        create_filename(source["id"])
    )

    with open(
        path,
        "w",
        encoding="utf-8"
    ) as file:
        file.write(html)

    return path


def save_document(source, text):
    document = create_document(
        source,
        text
    )

    path = os.path.join(
        DOCUMENTS_DIR,
        f"{source['id']}.json"
    )

    with open(
        path,
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            document,
            file,
            indent=2,
            ensure_ascii=False
        )

    return path


def main():
    os.makedirs(
        RAW_DIR,
        exist_ok=True
    )

    os.makedirs(
        DOCUMENTS_DIR,
        exist_ok=True
    )

    sources = load_sources()

    print(
        f"Loaded {len(sources)} sources."
    )

    successful = 0
    failed = 0

    for source in sources:
        try:
            response = requests.get(
                source["url"],
                headers={
                    "User-Agent": USER_AGENT
                },
                timeout=REQUEST_TIMEOUT
            )

            response.raise_for_status()

            save_raw(
                source,
                response.text
            )

            response.encoding = response.apparent_encoding
            text = clean_text(
                response.text
            )

            if not text:
                raise ValueError(
                    "No useful text extracted."
                )

            path = save_document(
                source,
                text
            )

            print(
                f"Saved: {path}"
            )

            successful += 1

        except Exception as error:
            failed += 1

            print(
                f"FAILED: {source['name']}"
            )

            print(
                f"Reason: {error}"
            )

    print()
    print("=" * 70)
    print("INGESTION COMPLETE")
    print(f"Successful: {successful}")
    print(f"Failed:     {failed}")
    print("=" * 70)


if __name__ == "__main__":
    main()