const axios = require("axios");

const API_BASE =
  process.env.TRACKER_INTERNAL_API_URL ||
  "http://127.0.0.1:5000";

const REQUEST_TIMEOUT = 30000;

/* =========================================================
   LOCAL REQUEST
   ========================================================= */

async function getLocal(endpoint, params = {}) {
  console.log(
    `[ORBITAL AI TOOL] GET ${endpoint}`,
    params
  );

  try {
    const response = await axios.get(
      `${API_BASE}${endpoint}`,
      {
        params,
        timeout: REQUEST_TIMEOUT,
      }
    );

    console.log(
      `[ORBITAL AI TOOL] ${endpoint} -> ${response.status}`
    );

    return response.data;
  } catch (error) {
    console.error(
      `[ORBITAL AI TOOL ERROR] ${endpoint}`
    );

    console.error(
      "message:",
      error.message
    );

    console.error(
      "code:",
      error.code
    );

    console.error(
      "status:",
      error.response?.status
    );

    console.error(
      "data:",
      error.response?.data
    );

    throw error;
  }
}

/* =========================================================
   DEBRIS
   ========================================================= */

async function getDebris() {
  return getLocal("/api/debris");
}

/* =========================================================
   NORMAL COLLISIONS
   ========================================================= */

async function getCollisions(options = {}) {
  const minutes =
    Number.isFinite(Number(options.minutes))
      ? Number(options.minutes)
      : 180;

  const thresholdKm =
    Number.isFinite(Number(options.thresholdKm))
      ? Number(options.thresholdKm)
      : 100;

  return getLocal(
    "/api/collisions",
    {
      minutes,
      thresholdKm,
    }
  );
}

/* =========================================================
   AI COLLISIONS
   ========================================================= */

async function getAICollisions(options = {}) {
  const minutes =
    Number.isFinite(Number(options.minutes))
      ? Number(options.minutes)
      : 180;

  const thresholdKm =
    Number.isFinite(Number(options.thresholdKm))
      ? Number(options.thresholdKm)
      : 100;

  return getLocal(
    "/api/ai/collisions",
    {
      minutes,
      thresholdKm,
    }
  );
}

/* =========================================================
   AI STATUS
   ========================================================= */

async function getAIStatus() {
  return getLocal(
    "/api/ai/status"
  );
}

/* =========================================================
   FIND OBJECT
   ========================================================= */

function findObject(
  debrisResponse,
  query
) {
  const objects =
    Array.isArray(debrisResponse)
      ? debrisResponse
      : Array.isArray(
          debrisResponse?.data
        )
        ? debrisResponse.data
        : Array.isArray(
            debrisResponse?.results
          )
          ? debrisResponse.results
          : [];

  const normalizedQuery =
    String(query || "")
      .trim()
      .toLowerCase();

  if (!normalizedQuery) {
    return null;
  }

  const exactMatch =
    objects.find((object) => {
      const name =
        String(
          object?.name ||
          object?.satelliteName ||
          object?.objectName ||
          ""
        ).toLowerCase();

      const noradId =
        String(
          object?.noradId ||
          object?.noradID ||
          object?.id ||
          ""
        ).toLowerCase();

      return (
        name === normalizedQuery ||
        noradId === normalizedQuery
      );
    });

  if (exactMatch) {
    return exactMatch;
  }

  return (
    objects.find((object) => {
      const name =
        String(
          object?.name ||
          object?.satelliteName ||
          object?.objectName ||
          ""
        ).toLowerCase();

      const noradId =
        String(
          object?.noradId ||
          object?.noradID ||
          object?.id ||
          ""
        ).toLowerCase();

      return (
        name.includes(normalizedQuery) ||
        noradId.includes(normalizedQuery)
      );
    }) || null
  );
}

module.exports = {
  getDebris,
  getCollisions,
  getAICollisions,
  getAIStatus,
  findObject,
};