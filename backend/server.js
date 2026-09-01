const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const satellite = require("satellite.js");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

/*
=========================================================
CONFIGURATION
=========================================================
*/

const CACHE_DIR = path.join(
  __dirname,
  "orbitalCache"
);

const DEBRIS_CACHE = path.join(
  CACHE_DIR,
  "debris.json"
);

const STATIONS_CACHE = path.join(
  CACHE_DIR,
  "stations.json"
);

/*
 * Real orbital-data sources.
 *
 * Retlector is used first because this is the source
 * currently being used by updateOrbitalCache.js.
 *
 * CelesTrak is used as a fallback.
 */

const DEBRIS_SOURCES = [
  "https://retlector.eu/cosmos-2251-debris/tle",
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=tle",
];

const STATION_SOURCES = [
  "https://retlector.eu/stations/tle",
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
];

/*
 * External data is refreshed every 2 hours.
 *
 * IMPORTANT:
 * This is NOT the frontend telemetry interval.
 *
 * The frontend only asks our local server for positions.
 */
const REFRESH_INTERVAL =
  2 * 60 * 60 * 1000;

/*
 * Give the server a few seconds to start before
 * attempting the first external refresh.
 */
const INITIAL_REFRESH_DELAY =
  5000;


  const {
  findCloseApproaches,
  analyzeCloseApproach
} = require("./services/collisionService");
/*
=========================================================
RUNTIME STATUS
=========================================================
*/

let debrisCache = null;

let stationsCache = null;

let refreshInProgress = false;

let lastRefreshStarted = null;

let lastRefreshCompleted = null;

let lastRefreshError = null;

/*
=========================================================
CREATE CACHE DIRECTORY
=========================================================
*/

if (
  !fs.existsSync(CACHE_DIR)
) {
  fs.mkdirSync(
    CACHE_DIR,
    {
      recursive: true,
    }
  );
}

/*
=========================================================
CACHE LOADER
=========================================================
*/

function loadCache(filePath) {
  try {
    if (
      !fs.existsSync(filePath)
    ) {
      return null;
    }

    const raw =
      fs.readFileSync(
        filePath,
        "utf8"
      );

    return JSON.parse(raw);

  } catch (error) {

    console.error(
      `[CACHE] Failed reading ${filePath}:`,
      error.message
    );

    return null;
  }
}

/*
=========================================================
LOAD CACHE INTO MEMORY
=========================================================
*/

function reloadCaches() {

  const loadedDebris =
    loadCache(
      DEBRIS_CACHE
    );

  const loadedStations =
    loadCache(
      STATIONS_CACHE
    );

  if (
    loadedDebris &&
    Array.isArray(
      loadedDebris.objects
    )
  ) {
    debrisCache =
      loadedDebris;
  }

  if (
    loadedStations &&
    Array.isArray(
      loadedStations.objects
    )
  ) {
    stationsCache =
      loadedStations;
  }
}

/*
=========================================================
INITIAL CACHE LOAD
=========================================================
*/

reloadCaches();

/*
=========================================================
ATOMIC CACHE WRITER
=========================================================
*/

function saveCache(
  filePath,
  data
) {

  const tempPath =
    `${filePath}.tmp`;

  fs.writeFileSync(
    tempPath,
    JSON.stringify(
      data,
      null,
      2
    ),
    "utf8"
  );

  fs.renameSync(
    tempPath,
    filePath
  );
}

/*
=========================================================
PARSE TLE TEXT
=========================================================
*/

function parseTLEText(
  rawText
) {

  if (
    !rawText ||
    typeof rawText !==
      "string"
  ) {
    return [];
  }

  const lines =
    rawText
      .split(/\r?\n/)
      .map(
        (line) =>
          line.trim()
      )
      .filter(
        (line) =>
          line.length > 0
      );

  const objects = [];

  /*
   * Standard 3-line TLE format:
   *
   * NAME
   * LINE 1
   * LINE 2
   */

  for (
    let i = 0;
    i + 2 < lines.length;
    i++
  ) {

    const name =
      lines[i];

    const line1 =
      lines[i + 1];

    const line2 =
      lines[i + 2];

    /*
     * Validate that these are actually
     * TLE lines.
     */

    if (
      !line1.startsWith(
        "1 "
      )
    ) {
      continue;
    }

    if (
      !line2.startsWith(
        "2 "
      )
    ) {
      continue;
    }

    objects.push({
      name,
      line1,
      line2,
    });

    /*
     * Skip the two TLE lines.
     */

    i += 2;
  }

  return objects;
}

/*
=========================================================
FETCH REAL ORBITAL SOURCE
=========================================================
*/

async function fetchFromSources(
  sources,
  label
) {

  let lastError = null;

  for (
    const url of sources
  ) {

    try {

      console.log(
        `[${label}] Trying: ${url}`
      );

      const response =
        await axios.get(
          url,
          {
            timeout: 20000,

            responseType:
              "text",

            headers: {
              "User-Agent":
                "Space-Debris-Tracker/1.0",
            },
          }
        );

      const objects =
        parseTLEText(
          response.data
        );

      if (
        objects.length === 0
      ) {
        throw new Error(
          "No valid TLE objects received."
        );
      }

      console.log(
        `[${label}] Received ${objects.length} objects.`
      );

      return {
        objects,
        source: url,
      };

    } catch (error) {

      lastError =
        error;

      console.error(
        `[${label}] Failed:`,
        error.message
      );
    }
  }

  throw (
    lastError ||
    new Error(
      `${label} source unavailable`
    )
  );
}

/*
=========================================================
REFRESH DEBRIS CACHE
=========================================================
*/

async function refreshDebrisCache() {

  const result =
    await fetchFromSources(
      DEBRIS_SOURCES,
      "DEBRIS"
    );

  /*
   * Never replace cache with empty data.
   */

  if (
    !result.objects ||
    result.objects.length === 0
  ) {
    throw new Error(
      "Debris source returned zero objects."
    );
  }

  const cacheData = {
    dataset:
      "COSMOS 2251 DEBRIS",

    upstream:
      result.source,

    fetchedAt:
      new Date().toISOString(),

    objects:
      result.objects,
  };

  saveCache(
    DEBRIS_CACHE,
    cacheData
  );

  /*
   * Update in-memory cache immediately.
   */

  debrisCache =
    cacheData;

  console.log(
    `[CACHE] Debris updated: ${result.objects.length} objects`
  );

  return result.objects.length;
}

/*
=========================================================
REFRESH STATIONS CACHE
=========================================================
*/

async function refreshStationsCache() {

  const result =
    await fetchFromSources(
      STATION_SOURCES,
      "STATIONS"
    );

  if (
    !result.objects ||
    result.objects.length === 0
  ) {
    throw new Error(
      "Station source returned zero objects."
    );
  }

  const cacheData = {
    dataset:
      "SPACE STATIONS",

    upstream:
      result.source,

    fetchedAt:
      new Date().toISOString(),

    objects:
      result.objects,
  };

  saveCache(
    STATIONS_CACHE,
    cacheData
  );

  stationsCache =
    cacheData;

  console.log(
    `[CACHE] Stations updated: ${result.objects.length} objects`
  );

  return result.objects.length;
}

/*
=========================================================
BACKGROUND ORBITAL DATA REFRESH
=========================================================
*/

async function refreshOrbitalData() {

  /*
   * Prevent two refresh operations from
   * running at the same time.
   */

  if (
    refreshInProgress
  ) {
    console.log(
      "[CACHE] Refresh already running."
    );

    return;
  }

  refreshInProgress =
    true;

  lastRefreshStarted =
    new Date().toISOString();

  lastRefreshError =
    null;

  console.log(
    "\n=========================================="
  );

  console.log(
    " BACKGROUND ORBITAL DATA REFRESH"
  );

  console.log(
    "=========================================="
  );

  /*
   * IMPORTANT:
   *
   * Debris and stations are refreshed
   * independently.
   *
   * If debris fails but stations succeed,
   * the debris cache remains untouched.
   */

  let debrisSuccess =
    false;

  let stationSuccess =
    false;

  try {

    await refreshDebrisCache();

    debrisSuccess =
      true;

  } catch (error) {

    console.error(
      "[DEBRIS] Refresh failed:",
      error.message
    );

    lastRefreshError =
      error.message;
  }

  try {

    await refreshStationsCache();

    stationSuccess =
      true;

  } catch (error) {

    console.error(
      "[STATIONS] Refresh failed:",
      error.message
    );

    lastRefreshError =
      error.message;
  }

  lastRefreshCompleted =
    new Date().toISOString();

  refreshInProgress =
    false;

  console.log(
    "=========================================="
  );

  console.log(
    `Refresh result: debris=${debrisSuccess}, stations=${stationSuccess}`
  );

  console.log(
    "Existing cache remains available if a source failed."
  );

  console.log(
    "==========================================\n"
  );
}

/*
=========================================================
TLE PROPAGATION
=========================================================
*/

function calculatePosition(
  object,
  date = new Date()
) {

  try {

    if (
      !object ||
      !object.line1 ||
      !object.line2
    ) {
      return null;
    }

    const satrec =
      satellite.twoline2satrec(
        object.line1,
        object.line2
      );

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

    const positionEci =
      propagated.position;

    const velocityEci =
      propagated.velocity;

    const gmst =
      satellite.gstime(
        date
      );

    const positionGd =
      satellite.eciToGeodetic(
        positionEci,
        gmst
      );

    const lat =
      satellite.degreesLat(
        positionGd.latitude
      );

    const lon =
      satellite.degreesLong(
        positionGd.longitude
      );

    const alt =
      positionGd.height;

    let velocity =
      null;

    if (
      velocityEci &&
      Number.isFinite(
        velocityEci.x
      ) &&
      Number.isFinite(
        velocityEci.y
      ) &&
      Number.isFinite(
        velocityEci.z
      )
    ) {

      velocity =
        Math.sqrt(
          velocityEci.x ** 2 +
          velocityEci.y ** 2 +
          velocityEci.z ** 2
        );
    }

    if (
      !Number.isFinite(
        lat
      ) ||
      !Number.isFinite(
        lon
      ) ||
      !Number.isFinite(
        alt
      )
    ) {
      return null;
    }

    return {

      name:
        object.name ||
        "UNKNOWN OBJECT",

      lat,

      lon,

      alt,

      velocity,

      source:
        "Local Orbital Cache",

      updatedAt:
        date.toISOString(),
    };

  } catch (error) {

    return null;
  }
}

/*
=========================================================
DEBRIS API
=========================================================
*/

app.get(
  "/api/debris",
  (req, res) => {

    /*
     * We DO NOT download anything here.
     *
     * We only use the cache already loaded
     * in memory.
     */

    if (
      !debrisCache ||
      !Array.isArray(
        debrisCache.objects
      ) ||
      debrisCache.objects.length === 0
    ) {

      return res
        .status(503)
        .json({
          live: false,

          cached: false,

          source:
            "Local Orbital Cache",

          error:
            "No debris orbital dataset is available.",

          objects: [],
        });
    }

    const now =
      new Date();

    const positions =
      debrisCache.objects
        .map(
          (object) =>
            calculatePosition(
              object,
              now
            )
        )
        .filter(
          Boolean
        );

    res.json(
      positions
    );
  }
);

/*
=========================================================
DEBRIS STATUS
=========================================================
*/

app.get(
  "/api/debris/status",
  (req, res) => {

    const objects =
      debrisCache &&
      Array.isArray(
        debrisCache.objects
      )
        ? debrisCache.objects
        : [];

    const positions =
      objects
        .map(
          (object) =>
            calculatePosition(
              object,
              new Date()
            )
        )
        .filter(
          Boolean
        );

    res.json({

      service:
        "Space Debris Tracker",

      source:
        "Local Orbital Cache",

      dataset:
        debrisCache?.dataset ||
        "COSMOS 2251 DEBRIS",

      upstream:
        debrisCache?.upstream ||
        null,

      /*
       * This means the application has
       * usable real orbital data.
       */

      live:
        positions.length > 0,

      cached:
        objects.length > 0,

      objectsAvailable:
        objects.length,

      positionsCalculated:
        positions.length,

      fetchedAt:
        debrisCache?.fetchedAt ||
        null,

      refreshing:
        refreshInProgress,

      lastRefreshStarted,

      lastRefreshCompleted,

      refreshInterval:
        "2 hours",

      fakeData:
        false,

      error:
        lastRefreshError,
    });
  }
);

/*
=========================================================
ISS API
=========================================================
*/

app.get(
  "/api/iss",
  (req, res) => {

    if (
      !stationsCache ||
      !Array.isArray(
        stationsCache.objects
      )
    ) {

      return res
        .status(503)
        .json({
          live: false,

          cached: false,

          error:
            "No station orbital cache is available.",
        });
    }

    const iss =
      stationsCache.objects.find(
        (object) => {

          const name =
            (
              object.name ||
              ""
            ).toUpperCase();

          return (
            name.includes(
              "ISS"
            ) ||
            name.includes(
              "ZARYA"
            )
          );
        }
      );

    if (!iss) {

      return res
        .status(404)
        .json({
          live: false,

          cached: true,

          error:
            "ISS not found in station cache.",
        });
    }

    const position =
      calculatePosition(
        iss,
        new Date()
      );

    if (!position) {

      return res
        .status(503)
        .json({
          live: false,

          cached: true,

          error:
            "Unable to calculate ISS position.",
        });
    }

    res.json({

      ...position,

      type:
        "space-station",

      live:
        true,

      cached:
        true,
    });
  }
);

/*
=========================================================
GLOBAL STATUS
=========================================================
*/

app.get(
  "/api/status",
  (req, res) => {

    const debrisObjects =
      debrisCache &&
      Array.isArray(
        debrisCache.objects
      )
        ? debrisCache.objects.length
        : 0;

    const stationObjects =
      stationsCache &&
      Array.isArray(
        stationsCache.objects
      )
        ? stationsCache.objects.length
        : 0;

    res.json({

      service:
        "Space Debris Tracker",

      status:
        "running",

      orbitalSource:
        "Local Orbital Cache",

      debris: {

        objects:
          debrisObjects,

        cached:
          debrisObjects > 0,

        updatedAt:
          debrisCache?.fetchedAt ||
          null,

        upstream:
          debrisCache?.upstream ||
          null,
      },

      stations: {

        objects:
          stationObjects,

        cached:
          stationObjects > 0,

        updatedAt:
          stationsCache?.fetchedAt ||
          null,

        upstream:
          stationsCache?.upstream ||
          null,
      },

      propagation:
        "satellite.js / SGP4",

      externalRefresh:
        "every 2 hours",

      positionUpdate:
        "on API request",

      refreshing:
        refreshInProgress,

      lastRefreshStarted,

      lastRefreshCompleted,

      lastRefreshError,

      fakeData:
        false,
    });
  }
);

/*
=========================================================
MANUAL CACHE REFRESH
=========================================================
*/

app.post(
  "/api/cache/refresh",
  async (req, res) => {

    if (
      refreshInProgress
    ) {

      return res
        .status(409)
        .json({

          success:
            false,

          message:
            "Orbital cache refresh is already running.",
        });
    }

    /*
     * Start refresh in background.
     *
     * Do not make the browser wait
     * for the external source.
     */

    refreshOrbitalData();

    res.json({

      success:
        true,

      message:
        "Background orbital cache refresh started.",

    });
  }
);

/*
=========================================================
ROOT
=========================================================
*/

app.get(
  "/",
  (req, res) => {

    res.json({

      service:
        "Space Debris Tracker Direct Engine",

      status:
        "running",

      source:
        "Local Orbital Cache",

      propagation:
        "satellite.js / SGP4",

      orbitalDataRefresh:
        "every 2 hours",

      positionCalculation:
        "on API request",

      fakeData:
        false,

      cache: {

        debris:
          debrisCache?.objects
            ?.length || 0,

        stations:
          stationsCache?.objects
            ?.length || 0,
      },

    });
  }
);

app.get(
  "/api/collisions",
  async (req, res) => {
    try {

      // -----------------------------------------
      // Check orbital cache
      // -----------------------------------------

      if (
        !debrisCache ||
        !Array.isArray(
          debrisCache.objects
        ) ||
        debrisCache.objects.length < 2
      ) {

        return res.status(503).json({

          source:
            "Local orbital cache",

          error:
            "Debris orbital cache is not available or contains insufficient objects.",

          objectsChecked: 0,

          approachesFound: 0,

          results: []

        });
      }


      // -----------------------------------------
      // Read API parameters
      // -----------------------------------------

      const predictionMinutes =
        Number(
          req.query.minutes || 180
        );

      const thresholdKm =
        Number(
          req.query.threshold || 100
        );


      // -----------------------------------------
      // Safety validation
      // -----------------------------------------

      const safePredictionMinutes =
        Number.isFinite(
          predictionMinutes
        )
          ? Math.min(
              Math.max(
                predictionMinutes,
                1
              ),
              1440
            )
          : 180;


      const safeThresholdKm =
        Number.isFinite(
          thresholdKm
        )
          ? Math.min(
              Math.max(
                thresholdKm,
                1
              ),
              1000
            )
          : 100;


      // -----------------------------------------
      // Collision / close-approach analysis
      // -----------------------------------------

      const analysis =
        findCloseApproaches(
          debrisCache.objects,
          {
            predictionMinutes:
              safePredictionMinutes,

            stepSeconds:
              60,

            thresholdKm:
              safeThresholdKm,

            maxResults:
              50
          }
        );


      // -----------------------------------------
      // Return API response
      // -----------------------------------------

      res.json({

        source:
          "Local orbital cache",

        propagation:
          "satellite.js / SGP4",

        predictionWindowMinutes:
          safePredictionMinutes,

        thresholdKm:
          safeThresholdKm,

        objectsChecked:
          analysis
            .statistics
            .objectsPropagated,

        statistics:
          analysis.statistics,

        approachesFound:
          analysis.results.length,

        results:
          analysis.results

      });

    } catch (error) {

      console.error(
        "[COLLISION] Analysis error:",
        error
      );

      res.status(500).json({

        source:
          "Local orbital cache",

        error:
          "Collision analysis failed.",

        message:
          error.message,

        results:
          []

      });

    }
  }
);

/*
=========================================================
START SERVER
=========================================================
*/

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "=========================================="
    );

    console.log(
      " SPACE DEBRIS TRACKER"
    );

    console.log(
      "=========================================="
    );

    console.log(
      `Server: http://localhost:${PORT}`
    );

    console.log(
      `Debris cache: ${
        debrisCache?.objects
          ?.length || 0
      } objects`
    );

    console.log(
      `Station cache: ${
        stationsCache?.objects
          ?.length || 0
      } objects`
    );

    console.log(
      "Orbital source: LOCAL CACHE"
    );

    console.log(
      "Propagation: satellite.js / SGP4"
    );

    console.log(
      "External refresh: EVERY 2 HOURS"
    );

    console.log(
      "Fake data: DISABLED"
    );

    console.log(
      "=========================================="
    );

    /*
     * Server is ready immediately.
     *
     * The frontend can start using the
     * local cache immediately.
     *
     * Real source refresh happens in background.
     */

    setTimeout(
      () => {
        refreshOrbitalData();
      },
      INITIAL_REFRESH_DELAY
    );

    /*
     * Refresh real orbital data every 2 hours.
     */

    setInterval(
      () => {
        refreshOrbitalData();
      },
      REFRESH_INTERVAL
    );
  }
);