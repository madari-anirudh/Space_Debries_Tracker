/**
 * =========================================================
 * ORBITAL NLP NORMALIZER
 * =========================================================
 *
 * Converts common language variations into canonical terms.
 *
 * This is NOT machine learning.
 *
 * It is a controlled preprocessing layer that helps our
 * NLU engine deal with spelling variations and synonyms.
 * =========================================================
 */

const NORMALIZATION_MAP = {

  // -------------------------------------------------------
  // DEBRIS
  // -------------------------------------------------------

  debries: "debris",
  "space-debris": "debris",
  "space debris": "debris",
  "orbital debris": "debris",


  // -------------------------------------------------------
  // NORAD
  // -------------------------------------------------------

  nord: "norad",
  "norad-id": "norad",
  "noradid": "norad",
  "catalog": "norad",


  // -------------------------------------------------------
  // RISK
  // -------------------------------------------------------

  dangerous: "risk",
  danger: "risk",
  threatening: "risk",
  threat: "risk",
  concerning: "risk",
  criticality: "risk",

};


/*
=========================================================
NORMALIZE TOKENS
=========================================================
*/

function normalizeTokens(tokens) {

  return tokens.map(
    (token) =>
      NORMALIZATION_MAP[token] || token
  );

}


module.exports = {
  normalizeTokens,
};