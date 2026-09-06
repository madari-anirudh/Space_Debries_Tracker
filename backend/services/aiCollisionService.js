const {
  predictBatchWithPythonAI,
  checkPythonAIHealth,
} = require("./pythonAiPredictionService");

/**
 * Run the Python AI model against all collision events.
 */
async function analyzeCollisionsWithAI(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return [];
  }

  try {
    const predictions = await predictBatchWithPythonAI(results);

    if (!Array.isArray(predictions)) {
      throw new Error(
        "Python AI returned an invalid prediction list"
      );
    }

    return results.map((event, index) => {
      const prediction = predictions[index] || null;

      if (!prediction) {
        return {
          ...event,
          aiPrediction: null,
          aiAnalysis: {
            success: false,
            error: "No prediction returned for this collision",
          },
        };
      }

      return {
        ...event,

        aiPrediction: prediction,

        aiAnalysis: {
          success: true,
          riskLevel: prediction.risk_level,
          riskClass: prediction.risk_class,
          confidence: prediction.confidence,
          classScores: prediction.class_scores,
          model: prediction.model,
          interpretation: prediction.interpretation,
        },
      };
    });
  } catch (error) {
    console.error(
      "[AI Collision Service] Batch prediction failed:",
      error.message
    );

    return results.map((event) => ({
      ...event,

      aiPrediction: null,

      aiAnalysis: {
        success: false,
        error: error.message,
      },
    }));
  }
}

/**
 * Sort collisions from highest AI risk to lowest.
 */
function sortByAIRisk(results) {
  if (!Array.isArray(results)) {
    return [];
  }

  return [...results].sort((a, b) => {
    const classA =
      Number(a?.aiPrediction?.risk_class ?? -1);

    const classB =
      Number(b?.aiPrediction?.risk_class ?? -1);

    if (classB !== classA) {
      return classB - classA;
    }

    const confidenceA =
      Number(a?.aiPrediction?.confidence ?? 0);

    const confidenceB =
      Number(b?.aiPrediction?.confidence ?? 0);

    return confidenceB - confidenceA;
  });
}

/**
 * Create a summary of AI classifications.
 */
function createAISummary(results) {
  const summary = {
    total: Array.isArray(results) ? results.length : 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unavailable: 0,
  };

  if (!Array.isArray(results)) {
    return summary;
  }

  for (const event of results) {
    const prediction = event?.aiPrediction;

    if (!prediction) {
      summary.unavailable += 1;
      continue;
    }

    switch (Number(prediction.risk_class)) {
      case 3:
        summary.critical += 1;
        break;

      case 2:
        summary.high += 1;
        break;

      case 1:
        summary.medium += 1;
        break;

      case 0:
        summary.low += 1;
        break;

      default:
        summary.unavailable += 1;
        break;
    }
  }

  return summary;
}

/**
 * Check Python AI service status.
 */
async function getAIServiceStatus() {
  return checkPythonAIHealth();
}

module.exports = {
  analyzeCollisionsWithAI,
  sortByAIRisk,
  createAISummary,
  getAIServiceStatus,
};