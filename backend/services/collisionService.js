const satellite = require("satellite.js");

/*
============================================================
 SPACE DEBRIS TRACKER
 COLLISION / CLOSE-APPROACH ENGINE
============================================================

Data source:
    Local orbital cache

Propagation:
    satellite.js / SGP4

Purpose:
    Close-approach screening

IMPORTANT:
    This is NOT an operational collision-probability system.

    TLE + SGP4 data does not contain the covariance/
    uncertainty information required for authoritative
    collision probability calculations.

============================================================
*/


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

  if (
    !line1 ||
    typeof line1 !== "string"
  ) {
    return null;
  }

  const match =
    line1.match(
      /^1\s+(\d{1,7})/
    );

  return match
    ? match[1]
    : null;
}


/*
============================================================
 CREATE SGP4 SATREC
============================================================
*/

function createSatrec(object) {

  if (
    !object ||
    !object.line1 ||
    !object.line2
  ) {
    return null;
  }

  try {

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
 PROPAGATE OBJECT
============================================================

Returns:

{
    position: {
        x,
        y,
        z
    },

    velocity: {
        x,
        y,
        z
    }
}

Position:
    km

Velocity:
    km/s
*/

function propagateObject(
  satrec,
  date
) {

  if (!satrec) {
    return null;
  }

  try {

    const state =
      satellite.propagate(
        satrec,
        date
      );

    if (
      !state ||
      !state.position ||
      !state.velocity
    ) {
      return null;
    }

    const position =
      state.position;

    const velocity =
      state.velocity;


    /*
    Validate position
    */

    if (
      !Number.isFinite(
        position.x
      ) ||
      !Number.isFinite(
        position.y
      ) ||
      !Number.isFinite(
        position.z
      )
    ) {
      return null;
    }


    /*
    Validate velocity
    */

    if (
      !Number.isFinite(
        velocity.x
      ) ||
      !Number.isFinite(
        velocity.y
      ) ||
      !Number.isFinite(
        velocity.z
      )
    ) {
      return null;
    }


    return {

      position: {
        x: position.x,
        y: position.y,
        z: position.z
      },

      velocity: {
        x: velocity.x,
        y: velocity.y,
        z: velocity.z
      }

    };

  } catch (error) {

    return null;
  }
}


/*
============================================================
 VECTOR DISTANCE
============================================================
*/

function vectorDistance(
  a,
  b
) {

  if (!a || !b) {
    return Infinity;
  }

  const dx =
    a.x - b.x;

  const dy =
    a.y - b.y;

  const dz =
    a.z - b.z;


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

  if (
    !velocityA ||
    !velocityB
  ) {
    return null;
  }

  const dx =
    velocityA.x -
    velocityB.x;

  const dy =
    velocityA.y -
    velocityB.y;

  const dz =
    velocityA.z -
    velocityB.z;


  return Math.sqrt(
    dx * dx +
    dy * dy +
    dz * dz
  );
}


/*
============================================================
 RISK CLASSIFICATION
============================================================

These are SCREENING categories.

They are NOT collision probabilities.
*/

function classifyRisk(
  distanceKm
) {

  if (
    !Number.isFinite(
      distanceKm
    )
  ) {
    return "UNKNOWN";
  }


  if (
    distanceKm < 1
  ) {
    return "CRITICAL";
  }


  if (
    distanceKm < 5
  ) {
    return "HIGH";
  }


  if (
    distanceKm < 25
  ) {
    return "MEDIUM";
  }


  if (
    distanceKm < 100
  ) {
    return "LOW";
  }


  return "NOMINAL";
}


/*
============================================================
 RISK SCORE
============================================================

Used only for UI sorting / analysis.

NOT a collision probability.
*/

function calculateRiskScore(
  distanceKm
) {

  if (
    !Number.isFinite(
      distanceKm
    )
  ) {
    return 0;
  }


  if (
    distanceKm < 1
  ) {
    return 100;
  }


  if (
    distanceKm < 5
  ) {
    return 80;
  }


  if (
    distanceKm < 25
  ) {
    return 50;
  }


  if (
    distanceKm < 100
  ) {
    return 20;
  }


  return 0;
}


/*
============================================================
 CLOSE APPROACH ANALYSIS
============================================================

Analyze two orbital objects over a future time window.
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
    createSatrec(
      objectA
    );

  const satrecB =
    createSatrec(
      objectB
    );


  if (
    !satrecA ||
    !satrecB
  ) {
    return null;
  }


  const startTime =
    new Date();


  const totalSeconds =
    predictionMinutes *
    60;


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
  Time propagation
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


    if (
      !stateA ||
      !stateB
    ) {
      continue;
    }


    /*
    Calculate distance
    */

    const distanceKm =
      vectorDistance(
        stateA.position,
        stateB.position
      );


    /*
    Check closest approach
    */

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
  No valid result
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


  const riskLevel =
    classifyRisk(
      closestDistanceKm
    );


  const riskScore =
    calculateRiskScore(
      closestDistanceKm
    );


  /*
  ----------------------------------------------------------
  Time until closest approach
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
  Return analysis
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
          closestDistanceKm.toFixed(
            3
          )
        ),

      relativeVelocityKms:
        closestRelativeVelocity !== null
          ? Number(
              closestRelativeVelocity.toFixed(
                3
              )
            )
          : null,

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

This function determines whether two objects are worth
running through the expensive prediction calculation.

IMPORTANT:

This is only a PERFORMANCE FILTER.

The final close approach is calculated using SGP4.
*/

function shouldAnalyzePair(
  stateA,
  stateB,
  thresholdKm
) {

  if (
    !stateA ||
    !stateB
  ) {
    return false;
  }


  const currentDistance =
    vectorDistance(
      stateA.position,
      stateB.position
    );


  /*
  Safety margin.

  We intentionally use a generous margin because an object
  that is currently farther away may approach later.
  */

  const safetyMarginKm =
    500;


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

Processes the complete supplied cache.

No artificial "first 150 objects" limitation.
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

    maxResults =
      DEFAULT_MAX_RESULTS

  } = {}
) {

  /*
  ----------------------------------------------------------
  Validate input
  ----------------------------------------------------------
  */

  if (
    !Array.isArray(
      objects
    ) ||
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

        closeApproaches: 0

      }

    };

  }


  /*
  ----------------------------------------------------------
  Prepare SGP4 records
  ----------------------------------------------------------
  */

  const trackedObjects =
    objects
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
  Current propagation
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
  Statistics
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
  Pair screening
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
      Fast spatial pre-filter
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
      Accurate SGP4 analysis
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
      Only retain approaches inside
      requested threshold.
      */

      if (
        result
          .closestApproach
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
  Sort by closest distance
  ----------------------------------------------------------
  */

  results.sort(
    (a, b) => {

      return (
        a.closestApproach
          .missDistanceKm -
        b.closestApproach
          .missDistanceKm
      );

    }
  );


  /*
  ----------------------------------------------------------
  Limit returned results
  ----------------------------------------------------------
  */

  const limitedResults =
    results.slice(
      0,
      maxResults
    );


  /*
  ----------------------------------------------------------
  Statistics
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
    !Array.isArray(
      results
    )
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