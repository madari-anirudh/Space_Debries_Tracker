const assistantTools = require("./assistantTools");

/* =========================================================
   SAFE NUMBER
   ========================================================= */

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

/* =========================================================
   FORMAT NUMBER
   ========================================================= */

function formatNumber(value, decimals = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "N/A";
  }

  return number.toFixed(decimals);
}

/* =========================================================
   NORMALIZE TEXT
   ========================================================= */

function normalizeText(text) {
  return String(text || "")
    .trim()
    .toLowerCase();
}

/* =========================================================
   INTENT DETECTION
   ========================================================= */

function detectIntent(message) {
  const text = normalizeText(message);

  if (!text) {
    return {
      intent: "unknown",
      confidence: 0,
    };
  }

  /* ---------------------------------------------
     AI STATUS
     --------------------------------------------- */

  if (
    text.includes("ai status") ||
    text.includes("is ai online") ||
    text.includes("ai online") ||
    text.includes("model status") ||
    text.includes("is the ai working")
  ) {
    return {
      intent: "ai_status",
      confidence: 0.99,
    };
  }

  /* ---------------------------------------------
     HIGHEST RISK
     --------------------------------------------- */

  if (
    text.includes("highest risk") ||
    text.includes("most dangerous") ||
    text.includes("dangerous collision") ||
    text.includes("worst collision") ||
    text.includes("highest collision risk") ||
    text.includes("critical collision")
  ) {
    return {
      intent: "highest_risk",
      confidence: 0.98,
    };
  }

  /* ---------------------------------------------
     COLLISION ANALYSIS
     --------------------------------------------- */

  if (
    text.includes("collision") ||
    text.includes("close approach") ||
    text.includes("conjunction") ||
    text.includes("miss distance") ||
    text.includes("near miss")
  ) {
    return {
      intent: "collision_analysis",
      confidence: 0.96,
    };
  }

  /* ---------------------------------------------
     TRACK DEBRIS
     --------------------------------------------- */

  if (
    text.includes("track debris") ||
    text.includes("track object") ||
    text.includes("find debris") ||
    text.includes("where is debris") ||
    text.includes("locate debris") ||
    text.includes("show debris")
  ) {
    return {
      intent: "track_debris",
      confidence: 0.95,
    };
  }

  /* ---------------------------------------------
     SGP4
     --------------------------------------------- */

  if (
    text.includes("sgp4") ||
    text.includes("tle") ||
    text.includes("propagation") ||
    text.includes("orbit propagation")
  ) {
    return {
      intent: "explain_sgp4",
      confidence: 0.98,
    };
  }

  /* ---------------------------------------------
     DEBRIS COUNT
     --------------------------------------------- */

  if (
    text.includes("how many debris") ||
    text.includes("debris count") ||
    text.includes("number of debris") ||
    text.includes("objects tracked") ||
    text.includes("how many objects")
  ) {
    return {
      intent: "debris_count",
      confidence: 0.96,
    };
  }

  /* ---------------------------------------------
     GREETING
     --------------------------------------------- */

  if (
    text === "hi" ||
    text === "hello" ||
    text === "hey" ||
    text.startsWith("hello ") ||
    text.startsWith("hi ")
  ) {
    return {
      intent: "greeting",
      confidence: 0.99,
    };
  }

  return {
    intent: "unknown",
    confidence: 0.35,
  };
}

/* =========================================================
   EXTRACT OBJECT QUERY
   ========================================================= */

function extractObjectQuery(message) {
  const text = String(message || "").trim();

  const patterns = [
    /track\s+(.+)/i,
    /find\s+(.+)/i,
    /locate\s+(.+)/i,
    /where\s+is\s+(.+)/i,
    /show\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match && match[1]) {
      return match[1]
        .replace(/[?.!,]+$/, "")
        .trim();
    }
  }

  return null;
}

/* =========================================================
   HIGHEST RISK
   ========================================================= */

async function handleHighestRisk() {
  const data = await assistantTools.getAICollisions({
    minutes: 180,
    thresholdKm: 100,
  });

  const results = Array.isArray(data?.results)
    ? data.results
    : [];

  if (results.length === 0) {
    return {
      reply:
        "I checked the current Phase 4.2A collision analysis, but no close approaches were returned.",
      data,
    };
  }

  const ranked = [...results].sort((a, b) => {
    const riskA = safeNumber(
      a?.aiPrediction?.risk_class,
      -1
    );

    const riskB = safeNumber(
      b?.aiPrediction?.risk_class,
      -1
    );

    if (riskB !== riskA) {
      return riskB - riskA;
    }

    const confidenceA = safeNumber(
      a?.aiPrediction?.confidence,
      0
    );

    const confidenceB = safeNumber(
      b?.aiPrediction?.confidence,
      0
    );

    return confidenceB - confidenceA;
  });

  const highest = ranked[0];

  const object1 =
    highest?.object1?.name ||
    "Unknown object";

  const object2 =
    highest?.object2?.name ||
    "Unknown object";

  const prediction =
    highest?.aiPrediction || {};

  const closest =
    highest?.closestApproach || {};

  const risk =
    prediction?.risk_level ||
    prediction?.riskLevel ||
    closest?.riskLevel ||
    "UNKNOWN";

  const confidence =
    safeNumber(prediction?.confidence, 0);

  const distance =
    safeNumber(closest?.missDistanceKm, NaN);

  const velocity =
    safeNumber(closest?.relativeVelocityKms, NaN);

  const tca =
    safeNumber(
      closest?.timeToClosestApproachSeconds,
      NaN
    );

  const tcaMinutes =
    Number.isFinite(tca)
      ? tca / 60
      : NaN;

  const confidenceText =
    Number.isFinite(confidence)
      ? `${(confidence * 100).toFixed(2)}%`
      : "N/A";

  const reply =
    `The highest Phase 4.2A screening risk is ${risk}. ` +
    `${object1} and ${object2} are the highest-ranked conjunction in the current results. ` +
    `Miss distance: ${formatNumber(distance)} km. ` +
    `Relative velocity: ${formatNumber(velocity)} km/s. ` +
    `Time to closest approach: ${formatNumber(tcaMinutes)} minutes. ` +
    `Classifier confidence: ${confidenceText}.`;

  return {
    reply,
    data: {
      highestRisk: highest,
    },
  };
}

/* =========================================================
   COLLISION ANALYSIS
   ========================================================= */

async function handleCollisionAnalysis() {
  const data = await assistantTools.getAICollisions({
    minutes: 180,
    thresholdKm: 100,
  });

  const results = Array.isArray(data?.results)
    ? data.results
    : [];

  const summary =
    data?.predictions || {};

  if (results.length === 0) {
    return {
      reply:
        "The current collision screening returned no close approaches within the configured 100 km threshold.",
      data,
    };
  }

  const critical =
    safeNumber(summary?.critical, 0);

  const high =
    safeNumber(summary?.high, 0);

  const medium =
    safeNumber(summary?.medium, 0);

  const low =
    safeNumber(summary?.low, 0);

  const unavailable =
    safeNumber(summary?.unavailable, 0);

  const total =
    safeNumber(
      summary?.total,
      results.length
    );

  return {
    reply:
      `I checked the current 180-minute collision screening. ` +
      `There are ${total} close approaches in the returned set: ` +
      `${critical} critical, ${high} high, ${medium} medium and ${low} low screening-risk events. ` +
      `${unavailable} predictions are unavailable. ` +
      `The screening uses satellite.js / SGP4-derived orbital data and the Phase 4.2A classifier.`,

    data: {
      summary,
      results,
    },
  };
}

/* =========================================================
   TRACK DEBRIS
   ========================================================= */

async function handleTrackDebris(message) {
  const query = extractObjectQuery(message);

  if (!query) {
    return {
      reply:
        "Tell me the debris name or NORAD ID you want to track. For example: “Track 34563”.",
    };
  }

  const debris = await assistantTools.getDebris();

  const object =
    assistantTools.findObject(
      debris,
      query
    );

  if (!object) {
    return {
      reply:
        `I couldn't find an object matching "${query}" in the current local debris dataset.`,
      data: {
        query,
      },
    };
  }

  const name =
    object?.name ||
    object?.satelliteName ||
    object?.objectName ||
    "Unknown object";

  const noradId =
    object?.noradId ||
    object?.noradID ||
    object?.id ||
    "N/A";

  const latitude =
    object?.latitude ??
    object?.lat ??
    object?.position?.latitude;

  const longitude =
    object?.longitude ??
    object?.lon ??
    object?.position?.longitude;

  const altitude =
    object?.altitude ??
    object?.alt ??
    object?.position?.altitude;

  return {
    reply:
      `I found ${name} (NORAD ${noradId}). ` +
      `Latitude: ${latitude ?? "N/A"}°, ` +
      `Longitude: ${longitude ?? "N/A"}°, ` +
      `Altitude: ${altitude ?? "N/A"} km. ` +
      `The object can now be selected/tracked in the visualization.`,

    data: {
      object,
      trackingQuery: query,
    },
  };
}

/* =========================================================
   SGP4 EXPLANATION
   ========================================================= */

async function handleExplainSGP4() {
  return {
    reply:
      "SGP4 is the orbital propagation model used by the tracker to propagate satellite TLE data forward in time. In this system, satellite.js provides the SGP4 propagation engine, while the Phase 4.2A machine-learning model analyzes derived close-approach features such as miss distance, relative velocity and time to closest approach. The ML model does not replace SGP4.",
  };
}

/* =========================================================
   AI STATUS
   ========================================================= */

async function handleAIStatus() {
  const data =
    await assistantTools.getAIStatus();

  const status =
    data?.aiService || data;

  const available =
    status?.available === true ||
    status?.status === "ok";

  if (!available) {
    return {
      reply:
        "The Phase 4.2A AI service is currently unavailable.",
      data,
    };
  }

  return {
    reply:
      `Phase 4.2A AI is online. ` +
      `Model: ${status?.model || "gradient_boosting"}. ` +
      `Version: ${status?.version || "4.2A"}. ` +
      `The Node.js backend is connected to the local Python AI service.`,

    data,
  };
}

/* =========================================================
   DEBRIS COUNT
   ========================================================= */

async function handleDebrisCount() {
  const data =
    await assistantTools.getDebris();

  const objects =
    Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.results)
          ? data.results
          : [];

  return {
    reply:
      `The current local debris dataset contains approximately ${objects.length} tracked objects in the returned dataset.`,

    data: {
      count: objects.length,
    },
  };
}

/* =========================================================
   GREETING
   ========================================================= */

async function handleGreeting() {
  return {
    reply:
      "Hello! I'm Orbital AI. I can analyze current collision risks, inspect debris, explain SGP4 and query the tracker’s live local data. What would you like to investigate?",
  };
}

/* =========================================================
   UNKNOWN
   ========================================================= */

async function handleUnknown() {
  return {
    reply:
      "I can currently help with collision analysis, highest-risk conjunctions, debris tracking, SGP4 explanations and AI-system status. Try asking “What is the highest collision risk?” or “Explain SGP4.”",
  };
}

/* =========================================================
   MAIN ASSISTANT
   ========================================================= */

async function processAssistantMessage(message) {
  const intentResult =
    detectIntent(message);

  let result;

  switch (intentResult.intent) {
    case "highest_risk":
      result =
        await handleHighestRisk();
      break;

    case "collision_analysis":
      result =
        await handleCollisionAnalysis();
      break;

    case "track_debris":
      result =
        await handleTrackDebris(message);
      break;

    case "explain_sgp4":
      result =
        await handleExplainSGP4();
      break;

    case "ai_status":
      result =
        await handleAIStatus();
      break;

    case "debris_count":
      result =
        await handleDebrisCount();
      break;

    case "greeting":
      result =
        await handleGreeting();
      break;

    default:
      result =
        await handleUnknown();
      break;
  }

  return {
    success: true,

    reply:
      result?.reply ||
      "I couldn't generate a response.",

    intent: {
      name: intentResult.intent,
      confidence: intentResult.confidence,
    },

    data:
      result?.data || null,

    assistant: {
      name: "Orbital AI",
      version: "4.2A",
      mode: "tool-using orbital assistant",
    },
  };
}

module.exports = {
  processAssistantMessage,
  detectIntent,
};