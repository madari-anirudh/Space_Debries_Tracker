const axios = require("axios");

const PYTHON_AI_URL =
  process.env.PYTHON_AI_URL ||
  "http://127.0.0.1:8000";

const REQUEST_TIMEOUT =
  Number(
    process.env.PYTHON_AI_TIMEOUT_MS || 10000
  );

/* =========================================================
   PREDICT USER INTENT + ENTITIES
   ========================================================= */

async function understandUserQuery(message) {
  if (
    typeof message !== "string" ||
    !message.trim()
  ) {
    throw new Error(
      "Assistant message must be a non-empty string."
    );
  }

  const response =
    await axios.post(
      `${PYTHON_AI_URL}/nlu`,
      {
        text: message.trim(),
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
      "Python NLU returned an invalid response."
    );
  }

  return response.data;
}

module.exports = {
  understandUserQuery,
};