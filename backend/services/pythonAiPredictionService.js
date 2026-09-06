const PYTHON_AI_URL =
  process.env.PYTHON_AI_URL || "http://127.0.0.1:8000";

const PYTHON_AI_TIMEOUT_MS = Number(
  process.env.PYTHON_AI_TIMEOUT_MS || 10000
);

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/**
 * Convert one collision event into the format
 * expected by the Python AI service.
 */
function buildPredictionRequest(event) {
  const closestApproach = event?.closestApproach || {};

  return {
    closestApproach: {
      missDistanceKm: safeNumber(
        closestApproach.missDistanceKm
      ),
      relativeVelocityKms: safeNumber(
        closestApproach.relativeVelocityKms
      ),
      timeToClosestApproachSeconds: safeNumber(
        closestApproach.timeToClosestApproachSeconds
      ),
    },
  };
}

/**
 * Python /predict/batch expects an OBJECT:
 *
 * {
 *   collisions: [...]
 * }
 */
function buildBatchPredictionRequest(events) {
  return {
    collisions: events.map(buildPredictionRequest),
  };
}

/**
 * Send a request to the Python AI service.
 */
async function requestPythonAI(endpoint, payload = null) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, PYTHON_AI_TIMEOUT_MS);

  try {
    const options = {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    };

    if (payload !== null) {
      options.method = "POST";
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(
      `${PYTHON_AI_URL}${endpoint}`,
      options
    );

    const text = await response.text();

    let data;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(
        `Python AI returned invalid JSON (${response.status}): ${text}`
      );
    }

    if (!response.ok) {
      const detail =
        data?.detail ||
        data?.message ||
        `HTTP ${response.status}`;

      throw new Error(
        `Python AI request failed: ${detail}`
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Predict one collision.
 */
async function predictWithPythonAI(event) {
  const payload = buildPredictionRequest(event);

  return requestPythonAI("/predict", payload);
}

/**
 * Predict multiple collisions in one request.
 */
async function predictBatchWithPythonAI(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  const payload = buildBatchPredictionRequest(events);

  const response = await requestPythonAI(
    "/predict/batch",
    payload
  );

  /*
   * Actual Python response:
   *
   * {
   *   count: 1,
   *   results: [...]
   * }
   */
  if (Array.isArray(response?.results)) {
    return response.results;
  }

  /*
   * Keep support for a direct array response
   * in case the Python API changes later.
   */
  if (Array.isArray(response)) {
    return response;
  }

  /*
   * Optional compatibility with an older
   * predictions-based response.
   */
  if (Array.isArray(response?.predictions)) {
    return response.predictions;
  }

  throw new Error(
    "Python AI batch response does not contain results"
  );
}

/**
 * Check Python AI service health.
 */
async function checkPythonAIHealth() {
  try {
    const response = await requestPythonAI("/health");

    return {
      available: true,
      ...response,
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
    };
  }
}

module.exports = {
  buildPredictionRequest,
  buildBatchPredictionRequest,
  requestPythonAI,
  predictWithPythonAI,
  predictBatchWithPythonAI,
  checkPythonAIHealth,
};