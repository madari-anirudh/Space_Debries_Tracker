import re

from ai.inference.intent_predictor import predict_intent


def extract_entities(text):
    """
    Extract important orbital entities from user text.
    """

    entities = {}

    text_lower = text.lower()

    # -------------------------------------------------
    # NORAD ID
    # -------------------------------------------------

    norad_match = re.search(
        r"\b(?:norad(?:\s+id)?|object|satellite)\s*#?\s*(\d{4,6})\b",
        text_lower
    )

    if norad_match:
        entities["norad_id"] = norad_match.group(1)

    # -------------------------------------------------
    # Object type
    # -------------------------------------------------

    if "debris" in text_lower:
        entities["object_type"] = "debris"

    elif "satellite" in text_lower:
        entities["object_type"] = "satellite"

    # -------------------------------------------------
    # Location
    # -------------------------------------------------

    if "earth" in text_lower:
        entities["location"] = "Earth"

    return entities


def understand(text):
    """
    Combine ML intent classification
    with entity extraction.
    """

    intent_result = predict_intent(text)

    entities = extract_entities(text)

    return {
        "text": text,
        "intent": {
            "name": intent_result["intent"],
            "confidence": intent_result["confidence"],
        },
        "entities": entities,
    }