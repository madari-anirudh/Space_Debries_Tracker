/**
 * =========================================================
 * ORBITAL NLU ENGINE
 * =========================================================
 *
 * Converts tokenized human language into structured meaning.
 *
 * Example:
 *
 * "Show me the highest risk debris near Earth"
 *
 * becomes:
 *
 * {
 *   intent: "highest_risk",
 *   entities: {
 *     object_type: "debris",
 *     location: "Earth"
 *   }
 * }
 *
 * This first version uses simple rules.
 */

const { tokenize } = require("./tokenizer");
const { normalizeTokens } = require("./normalizer");

/*
=========================================================
INTENT DETECTION
=========================================================
*/

function detectIntent(tokens) {

  /*
  -------------------------------------------------------
  HIGHEST RISK
  -------------------------------------------------------
  */

  if (
    tokens.includes("highest") &&
    (
      tokens.includes("risk") ||
      tokens.includes("dangerous")
    )
  ) {
    return "highest_risk";
  }


  /*
  -------------------------------------------------------
  COLLISION LOOKUP
  -------------------------------------------------------
  */

  if (
    tokens.includes("collision") ||
    tokens.includes("collisions")
  ) {
    return "collision_lookup";
  }


  /*
  -------------------------------------------------------
  TRACK OBJECT
  -------------------------------------------------------
  */

  if (
    tokens.includes("track") ||
    tokens.includes("tracking")
  ) {
    return "track_object";
  }


  /*
  -------------------------------------------------------
  EXPLAIN SGP4
  -------------------------------------------------------
  */

  if (
    tokens.includes("sgp4")
  ) {
    return "explain_sgp4";
  }


  /*
  -------------------------------------------------------
  UNKNOWN
  -------------------------------------------------------
  */

  return "unknown";
}


/*
=========================================================
ENTITY EXTRACTION
=========================================================
*/

function extractEntities(tokens) {

  const entities = {};


  /*
  -------------------------------------------------------
  OBJECT TYPE
  -------------------------------------------------------
  */

  if (
    tokens.includes("debris")
  ) {
    entities.object_type = "debris";

  } else if (
    tokens.includes("satellite")
  ) {
    entities.object_type = "satellite";
  }


  /*
  -------------------------------------------------------
  LOCATION
  -------------------------------------------------------
  */

  if (
    tokens.includes("earth")
  ) {
    entities.location = "Earth";
  }


  /*
  -------------------------------------------------------
  NORAD ID
  -------------------------------------------------------
  */

  const noradIndex =
    tokens.indexOf("norad");

  if (
    noradIndex !== -1 &&
    tokens[noradIndex + 1]
  ) {

    const candidate =
      tokens[noradIndex + 1];

    if (
      /^\d+$/.test(candidate)
    ) {
      entities.norad_id =
        candidate;
    }
  }


  /*
  -------------------------------------------------------
  RETURN
  -------------------------------------------------------
  */

  return entities;
}


/*
=========================================================
MAIN NLU FUNCTION
=========================================================
*/

function understand(text) {

  const rawTokens =
  tokenize(text);

const tokens =
  normalizeTokens(rawTokens);

  const intent =
    detectIntent(tokens);

  const entities =
    extractEntities(tokens);

  return {
  text,
  rawTokens,
  tokens,
  intent,
  entities,
};
}


/*
=========================================================
EXPORT
=========================================================
*/

module.exports = {
  understand,
  detectIntent,
  extractEntities,
};