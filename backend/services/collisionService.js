const satellite = require("satellite.js");

/*
============================================================
CONFIGURATION
============================================================
*/

const DEFAULT_PREDICTION_MINUTES = 180;
const DEFAULT_STEP_SECONDS = 60;
const DEFAULT_THRESHOLD_KM = 100;
const DEFAULT_MAX_RESULTS = 50;


/*
============================================================
NORAD ID
============================================================
*/

function getNoradId(line1) {
  if (!line1 || typeof line1 !== "string") {
    return null;
  }

  /*
   * NORAD catalog number occupies columns 3-7
   * in a standard TLE line.
   */

  const id = line1.substring(2, 7).trim();

  return id || null;
}


/*
============================================================
CREATE SATREC
============================================================
*/

function createSatrec(object) {
  try {
    if (
      !object ||
      !object.line1 ||
      !object.line2
    ) {
      return null;
    }

    return satellite.twoline2satrec(
      object.line1,
      object.line2
    );

  } catch (error) {
    return null;
  }
}


/*
============================================================
VECTOR DISTANCE
============================================================
*/

function vectorDistance(a, b) {
  if (!a || !b) {
    return Infinity;
  }

  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;

  return Math.sqrt(
    dx * dx +
    dy * dy +
    dz * dz
  );
}


/*
============================================================
RELATIVE VELOCITY
============================================================
*/

function calculateRelativeVelocity(
  velocityA,
  velocityB
) {
  if (!velocityA || !velocityB) {
    return null;
  }

  const dx =
    velocityA.x - velocityB.x;

  const dy =
    velocityA.y - velocityB.y;

  const dz =
    velocityA.z - velocityB.z;

  return Math.sqrt(
    dx * dx +
    dy * dy +
    dz * dz
  );
}


/*
============================================================
PROPAGATE OBJECT
============================================================
*/

function propagateObject(
  satrec,
  date
) {
  try {
    if (!satrec || !date) {
      return null;
    }

    const propagated =
      satellite.propagate(
        satrec,
        date
      );

    if (
      !propagated ||
      !propagated.position
    ) {
      return null;
    }

    const position =
      propagated.position;

    const velocity =
      propagated.velocity;

    if (
      !position ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      return null;
    }

    return {
      position,
      velocity: velocity || null
    };

  } catch (error) {
    return null;
  }
}


/*
============================================================
RISK CLASSIFICATION
============================================================

IMPORTANT:

This is a screening score.

It is NOT a scientifically validated collision
probability.

Actual collision probability requires covariance /
uncertainty information.
============================================================
*/

function classifyRisk(
  missDistanceKm
) {
  if (!Number.isFinite(missDistanceKm)) {
    return "LOW";
  }

  if (missDistanceKm <= 1) {
    return "CRITICAL";
  }

  if (missDistanceKm <= 5) {
    return "HIGH";
  }

  if (missDistanceKm <= 25) {
    return "MEDIUM";
  }

  return "LOW";
}


/*
============================================================
RISK SCORE
============================================================
*/

function calculateRiskScore(
  missDistanceKm,
  relativeVelocityKms = null
) {
  if (!Number.isFinite(missDistanceKm)) {
    return 0;
  }

  let score = 0;

  /*
   * Distance component
   */

  if (missDistanceKm <= 1) {
    score += 70;
  } else if (missDistanceKm <= 5) {
    score += 55;
  } else if (missDistanceKm <= 10) {
    score += 40;
  } else if (missDistanceKm <= 25) {
    score += 25;
  } else if (missDistanceKm <= 50) {
    score += 10;
  }

  /*
   * Relative velocity component.
   *
   * This is deliberately capped so velocity does
   * not dominate the miss-distance signal.
   */

  if (
    Number.isFinite(
      relativeVelocityKms
    )
  ) {
    if (relativeVelocityKms >= 10) {
      score += 30;
    } else if (relativeVelocityKms >= 5) {
      score += 20;
    } else if (relativeVelocityKms >= 1) {
      score += 10;
    } else if (relativeVelocityKms >= 0.1) {
      score += 5;
    }
  }

  return Math.min(
    100,
    Math.round(score)
  );
}


/*
============================================================
ANALYZE CLOSE APPROACH
============================================================
*/

function analyzeCloseApproach(
  objectA,
  objectB,
  predictionMinutes =
    DEFAULT_PREDICTION_MINUTES,
  stepSeconds =
    DEFAULT_STEP_SECONDS
) {
  const satrecA =
    createSatrec(objectA);

  const satrecB =
    createSatrec(objectB);

  if (!satrecA || !satrecB) {
    return null;
  }

  const startTime =
    new Date();

  const totalSeconds =
    predictionMinutes * 60;

  let closestDistanceKm =
    Infinity;

  let closestTime =
    null;

  let closestRelativeVelocity =
    null;

  let closestPositionA =
    null;

  let closestPositionB =
    null;

  let closestVelocityA =
    null;

  let closestVelocityB =
    null;


  /*
  ----------------------------------------------------------
  TIME PROPAGATION
  ----------------------------------------------------------
  */

  for (
    let seconds = 0;
    seconds <= totalSeconds;
    seconds += stepSeconds
  ) {

    const currentTime =
      new Date(
        startTime.getTime() +
        seconds * 1000
      );

    const stateA =
      propagateObject(
        satrecA,
        currentTime
      );

    const stateB =
      propagateObject(
        satrecB,
        currentTime
      );

    if (!stateA || !stateB) {
      continue;
    }

    const distanceKm =
      vectorDistance(
        stateA.position,
        stateB.position
      );

    if (
      distanceKm <
      closestDistanceKm
    ) {

      closestDistanceKm =
        distanceKm;

      closestTime =
        currentTime;

      closestRelativeVelocity =
        calculateRelativeVelocity(
          stateA.velocity,
          stateB.velocity
        );

      closestPositionA =
        stateA.position;

      closestPositionB =
        stateB.position;

      closestVelocityA =
        stateA.velocity;

      closestVelocityB =
        stateB.velocity;
    }
  }


  /*
  ----------------------------------------------------------
  VALIDATION
  ----------------------------------------------------------
  */

  if (
    !closestTime ||
    !Number.isFinite(
      closestDistanceKm
    )
  ) {
    return null;
  }


  /*
  ----------------------------------------------------------
  RELATIVE VELOCITY
  ----------------------------------------------------------
  */

  const relativeVelocityKms =
    Number.isFinite(
      closestRelativeVelocity
    )
      ? Number(
          closestRelativeVelocity.toFixed(3)
        )
      : null;


  /*
  ----------------------------------------------------------
  RISK
  ----------------------------------------------------------
  */

  const riskLevel =
    classifyRisk(
      closestDistanceKm
    );

  const riskScore =
    calculateRiskScore(
      closestDistanceKm,
      relativeVelocityKms
    );


  /*
  ----------------------------------------------------------
  TIME TO CLOSEST APPROACH
  ----------------------------------------------------------
  */

  const timeToClosestApproachMs =
    closestTime.getTime() -
    startTime.getTime();

  const timeToClosestApproachSeconds =
    Math.max(
      0,
      Math.round(
        timeToClosestApproachMs /
        1000
      )
    );


  /*
  ----------------------------------------------------------
  RETURN
  ----------------------------------------------------------
  */

  return {

    object1: {
      name:
        objectA.name ||
        "UNKNOWN",

      noradId:
        objectA.noradId ||
        getNoradId(
          objectA.line1
        )
    },

    object2: {
      name:
        objectB.name ||
        "UNKNOWN",

      noradId:
        objectB.noradId ||
        getNoradId(
          objectB.line1
        )
    },


    closestApproach: {

      tca:
        closestTime.toISOString(),

      timeToClosestApproachSeconds,

      missDistanceKm:
        Number(
          closestDistanceKm.toFixed(3)
        ),

      relativeVelocityKms,

      riskLevel,

      riskScore
    },


    positions: {

      object1:
        closestPositionA,

      object2:
        closestPositionB
    },


    velocities: {

      object1:
        closestVelocityA,

      object2:
        closestVelocityB
    },


    analysis: {

      predictionWindowMinutes:
        predictionMinutes,

      stepSeconds,

      method:
        "SGP4 propagation using satellite.js",

      type:
        "close-approach screening",

      collisionProbability:
        null
    }
  };
}


/*
============================================================
ORBITAL PRE-FILTER
============================================================

This is ONLY a performance optimization.

The final result is still calculated using SGP4.
============================================================
*/

function shouldAnalyzePair(
  stateA,
  stateB,
  thresholdKm
) {
  if (!stateA || !stateB) {
    return false;
  }

  const currentDistance =
    vectorDistance(
      stateA.position,
      stateB.position
    );

  /*
   * Generous screening margin.
   *
   * We don't want to discard an object that is
   * currently farther away but approaches during
   * the prediction window.
   */

  const safetyMarginKm = 500;

  const screeningDistanceKm =
    thresholdKm +
    safetyMarginKm;

  return (
    currentDistance <=
    screeningDistanceKm
  );
}


/*
============================================================
FIND CLOSE APPROACHES
============================================================
*/

function findCloseApproaches(
  objects,
  {
    predictionMinutes =
      DEFAULT_PREDICTION_MINUTES,

    stepSeconds =
      DEFAULT_STEP_SECONDS,

    thresholdKm =
      DEFAULT_THRESHOLD_KM,

    maxObjects = null,

    maxResults =
      DEFAULT_MAX_RESULTS

  } = {}
) {

  /*
  ----------------------------------------------------------
  VALIDATION
  ----------------------------------------------------------
  */

  if (
    !Array.isArray(objects) ||
    objects.length < 2
  ) {

    return {
      results: [],

      statistics: {

        objectsAvailable:
          Array.isArray(objects)
            ? objects.length
            : 0,

        objectsPropagated: 0,

        totalPossiblePairs: 0,

        candidatePairs: 0,

        analyzedPairs: 0,

        closeApproaches: 0,

        returnedResults: 0
      }
    };
  }


  /*
  ----------------------------------------------------------
  OBJECT LIMIT
  ----------------------------------------------------------
  */

  const workingObjects =
    Number.isFinite(maxObjects) &&
    maxObjects > 0
      ? objects.slice(
          0,
          maxObjects
        )
      : objects;


  /*
  ----------------------------------------------------------
  CREATE SATREC
  ----------------------------------------------------------
  */

  const trackedObjects =
    workingObjects
      .map(
        object => ({
          object,

          satrec:
            createSatrec(
              object
            )
        })
      )
      .filter(
        item =>
          item.satrec !== null
      );


  /*
  ----------------------------------------------------------
  CURRENT PROPAGATION
  ----------------------------------------------------------
  */

  const now =
    new Date();

  const positionedObjects =
    [];

  for (
    const item of
    trackedObjects
  ) {

    const state =
      propagateObject(
        item.satrec,
        now
      );

    if (!state) {
      continue;
    }

    positionedObjects.push({

      object:
        item.object,

      satrec:
        item.satrec,

      state
    });
  }


  /*
  ----------------------------------------------------------
  STATISTICS
  ----------------------------------------------------------
  */

  const objectCount =
    positionedObjects.length;

  const totalPossiblePairs =
    (
      objectCount *
      (objectCount - 1)
    ) / 2;

  let candidatePairs = 0;

  let analyzedPairs = 0;

  const results = [];


  /*
  ----------------------------------------------------------
  PAIR SCREENING
  ----------------------------------------------------------
  */

  for (
    let i = 0;
    i <
    positionedObjects.length;
    i++
  ) {

    const objectA =
      positionedObjects[i];

    for (
      let j = i + 1;
      j <
      positionedObjects.length;
      j++
    ) {

      const objectB =
        positionedObjects[j];


      /*
       * Fast spatial filter
       */

      const possible =
        shouldAnalyzePair(
          objectA.state,
          objectB.state,
          thresholdKm
        );

      if (!possible) {
        continue;
      }

      candidatePairs++;


      /*
       * Accurate SGP4 prediction
       */

      const result =
        analyzeCloseApproach(
          objectA.object,
          objectB.object,
          predictionMinutes,
          stepSeconds
        );

      if (!result) {
        continue;
      }

      analyzedPairs++;


      /*
       * Retain only approaches
       * inside requested threshold.
       */

      if (
        result.closestApproach
          .missDistanceKm <=
        thresholdKm
      ) {

        results.push(
          result
        );
      }
    }
  }


  /*
  ----------------------------------------------------------
  SORT RESULTS
  ----------------------------------------------------------

  Priority:

  1. Risk score
  2. Miss distance
  3. Time to TCA
  ----------------------------------------------------------
  */

  results.sort(
    (a, b) => {

      const scoreA =
        a.closestApproach
          ?.riskScore || 0;

      const scoreB =
        b.closestApproach
          ?.riskScore || 0;

      if (
        scoreB !== scoreA
      ) {
        return (
          scoreB -
          scoreA
        );
      }


      const distanceA =
        a.closestApproach
          ?.missDistanceKm ??
        Infinity;

      const distanceB =
        b.closestApproach
          ?.missDistanceKm ??
        Infinity;

      if (
        distanceA !==
        distanceB
      ) {
        return (
          distanceA -
          distanceB
        );
      }


      const timeA =
        a.closestApproach
          ?.timeToClosestApproachSeconds ??
        Infinity;

      const timeB =
        b.closestApproach
          ?.timeToClosestApproachSeconds ??
        Infinity;

      return (
        timeA -
        timeB
      );
    }
  );


  /*
  ----------------------------------------------------------
  LIMIT RESULTS
  ----------------------------------------------------------
  */

  const limitedResults =
    results.slice(
      0,
      maxResults
    );


  /*
  ----------------------------------------------------------
  FINAL RESPONSE
  ----------------------------------------------------------
  */

  return {

    results:
      limitedResults,

    statistics: {

      objectsAvailable:
        objects.length,

      objectsPropagated:
        positionedObjects.length,

      totalPossiblePairs,

      candidatePairs,

      analyzedPairs,

      closeApproaches:
        results.length,

      returnedResults:
        limitedResults.length
    }
  };
}


/*
============================================================
FILTER BY RISK
============================================================
*/

function filterByRisk(
  results,
  riskLevels
) {

  if (
    !Array.isArray(results)
  ) {
    return [];
  }

  if (
    !Array.isArray(
      riskLevels
    ) ||
    riskLevels.length === 0
  ) {
    return results;
  }

  return results.filter(
    result =>
      riskLevels.includes(
        result
          ?.closestApproach
          ?.riskLevel
      )
  );
}


/*
============================================================
EXPORTS
============================================================
*/

module.exports = {

  getNoradId,

  createSatrec,

  propagateObject,

  vectorDistance,

  calculateRelativeVelocity,

  classifyRisk,

  calculateRiskScore,

  analyzeCloseApproach,

  findCloseApproaches,

  filterByRisk
};