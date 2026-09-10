/**
 * =========================================================
 * ORBITAL NLP TOKENIZER
 * =========================================================
 *
 * First stage of our language pipeline.
 *
 * Input:
 *   "Show me the highest risk debris near Earth"
 *
 * Output:
 *   ["show", "me", "the", "highest", "risk", ...]
 *
 * This is deliberately simple.
 * We are building the concepts ourselves before
 * introducing an LLM.
 * =========================================================
 */

function tokenize(text) {
  if (typeof text !== "string") {
    return [];
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

module.exports = {
  tokenize,
};