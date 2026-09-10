from retriever import KnowledgeRetriever


TEST_CASES = [
    {
        "query": "What is a satellite?",
        "expected_sources": [
            "NASA - What Is a Satellite?"
        ]
    },
    {
        "query": "Why do satellites stay in orbit?",
        "expected_sources": [
            "NASA - What Is a Satellite?",
            "ESA - Types of Orbits"
        ]
    },
    {
        "query": "What is space debris?",
        "expected_sources": [
            "ESA - Space Debris FAQ",
            "ESA - About Space Debris",
            "NASA - What Is Orbital Debris?"
        ]
    },
    {
        "query": "Why is orbital debris dangerous?",
        "expected_sources": [
            "NASA - Space Debris: Understanding the Risks",
            "NASA - What Is Orbital Debris?",
            "ESA - Space Debris FAQ"
        ]
    },
    {
        "query": "What are the different types of Earth orbit?",
        "expected_sources": [
            "ESA - Types of Orbits"
        ]
    },
    {
        "query": "What is low Earth orbit?",
        "expected_sources": [
            "ESA - Types of Orbits"
        ]
    },
    {
        "query": "What is geostationary orbit?",
        "expected_sources": [
            "ESA - Types of Orbits"
        ]
    },
    {
        "query": "How is orbital debris tracked?",
        "expected_sources": [
            "ESA - Space Debris FAQ",
            "ESA - About Space Debris",
            "NASA - What Is Orbital Debris?"
        ]
    },
    {
        "query": "What happens to old satellites?",
        "expected_sources": [
            "ESA - Space Debris FAQ",
            "ESA - About Space Debris",
            "NASA - What Is Orbital Debris?",
            "NASA - What Is a Satellite?"
        ]
    },
    {
        "query": "How do satellites help with GPS?",
        "expected_sources": [
            "NASA - What Is a Satellite?"
        ]
    }
]


def evaluate():

    retriever = KnowledgeRetriever()

    total = len(TEST_CASES)
    passed = 0

    rank_sum = 0

    print("=" * 70)
    print("RETRIEVAL EVALUATION")
    print("=" * 70)

    for number, case in enumerate(
        TEST_CASES,
        start=1
    ):

        query = case["query"]
        expected = case["expected_sources"]

        results = retriever.search(
            query,
            top_k=3
        )

        retrieved_sources = [
            result["title"]
            for result in results
        ]

        matched_rank = None

        for rank, source in enumerate(
            retrieved_sources,
            start=1
        ):
            if source in expected:
                matched_rank = rank
                break

        if matched_rank is not None:
            passed += 1
            rank_sum += matched_rank

            status = "PASS"

        else:
            status = "FAIL"

        print()
        print(
            f"[{status}] {number}. {query}"
        )

        print(
            f"Expected: {expected}"
        )

        print(
            f"Retrieved:"
        )

        for rank, result in enumerate(
            results,
            start=1
        ):
            print(
                f"  #{rank} "
                f"{result['title']} "
                f""
                f"score={result['score']:.4f}"
            )

        if matched_rank:
            print(
                f"Relevant source rank: "
                f"#{matched_rank}"
            )
        else:
            print(
                "Relevant source rank: NOT FOUND"
            )

    accuracy = (
        passed / total
    ) * 100

    average_rank = (
        rank_sum / passed
        if passed > 0
        else 0
    )

    print()
    print("=" * 70)
    print("EVALUATION COMPLETE")
    print("=" * 70)

    print(
        f"Queries:            {total}"
    )

    print(
        f"Passed:             {passed}/{total}"
    )

    print(
        f"Retrieval accuracy: {accuracy:.2f}%"
    )

    print(
        f"Average rank:       {average_rank:.2f}"
    )


if __name__ == "__main__":
    evaluate()