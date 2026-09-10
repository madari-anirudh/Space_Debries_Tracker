const axios = require("axios");

const PYTHON_AI_URL =
  process.env.PYTHON_AI_URL ||
  "http://127.0.0.1:8000";

const REQUEST_TIMEOUT =
  Number(
    process.env.PYTHON_AI_TIMEOUT_MS || 10000
  );

async function searchKnowledge(query, topK = 5) {
  if (
    typeof query !== "string" ||
    !query.trim()
  ) {
    throw new Error(
      "Knowledge search query must be a non-empty string."
    );
  }

  const response = await axios.post(
    `${PYTHON_AI_URL}/knowledge/search`,
    {
      query: query.trim(),
      top_k: topK,
    },
    {
      timeout: REQUEST_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (
    !response.data ||
    response.data.success !== true
  ) {
    throw new Error(
      response.data?.error ||
      "Python knowledge search returned an invalid response."
    );
  }

  return response.data;
}

module.exports = {
  searchKnowledge,
};