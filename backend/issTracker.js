const express = require("express");
const cors = require("cors");
const axios = require("axios");
const satellite = require("satellite.js");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5000;

/*
=========================================================
CONFIGURATION
=========================================================
*/

const CELESTRAK_BASE =
  "https://celestrak.org/NORAD/elements/gp.php";

const DEBRIS_URL =
  `${CELESTRAK_BASE}?NAME=COSMOS%202251%20DEB&FORMAT=JSON`;

const STATIONS_URL =
  `${CELESTRAK_BASE}?GROUP=STATIONS&FORMAT=JSON`;

const CACHE_TIME = 60 * 1000;

/*
=========================================================
CACHE
=========================================================
*/

let debrisCache = {
  data: [],
  fetchedAt: 0,
};

let stationsCache = {
  data: [],
  fetchedAt: 0,
};

let lastDebrisError = null;
let lastStationsError = null;

/*
=========================================================
HTTP CLIENT
=========================================================
*/

const celestrak = axios.create({
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "User-Agent":
      "Orbital-Debris-Tracker/1.0",
  },
});

/*
=========================================================
NORMALIZE CELESTRAK JSON
=========================================================
*/

function normalizeObjects(data) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(
    (item) =>
      item &&
      item.TLE_LINE1 &&
      item.TLE_LINE2
  );
}

/*
=========================================================
FETCH DEBRIS ORBITAL ELEMENTS
=========================================================
*/

async function getDebrisElements() {
  const now = Date.now();

  if (
    debrisCache.data.length > 0 &&
    now - debrisCache.fetchedAt <
      CACHE_TIME
  ) {
    return debrisCache.data;
  }

  try {
    console.log(
      "Fetching live COSMOS 2251 debris data from CelesTrak..."
    );

    const response =
      await celestrak.get(
        DEBRIS_URL
      );

    const objects =
      normalizeObjects(
        response.data
      );

    if (!objects.length) {
      throw new Error(
        "CelesTrak returned no debris objects."
      );
    }

    debrisCache = {
      data: objects,
      fetchedAt: now,
    };

    lastDebrisError = null;

    console.log(
      `Live debris feed updated: ${objects.length} objects`
    );

    return objects;
  } catch (error) {
    lastDebrisError =
      error.message;

    console.error(
      "CelesTrak debris request failed:",
      error.message
    );

    /*
     * IMPORTANT:
     * Do NOT replace live data with fake
     * objects.
     *
     * If we already have cached orbital data,
     * continue using it.
     */
    if (
      debrisCache.data.length > 0
    ) {
      console.log(
        `Using cached orbital data: ${debrisCache.data.length} objects`
      );

      return debrisCache.data;
    }

    return [];
  }
}

/*
=========================================================
PROPAGATE TLE TO CURRENT POSITION
=========================================================
*/

function calculatePosition(
  object,
  now
) {
  try {
    const satrec =
      satellite.twoline2satrec(
        object.TLE_LINE1,
        object.TLE_LINE2
      );

    const positionEci =
      satellite.propagate(
        satrec,
        now
      );

    if (
      !positionEci ||
      !positionEci.position
    ) {
      return null;
    }

    const gmst =
      satellite.gstime(now);

    const positionGd =
      satellite.eciToGeodetic(
        positionEci.position,
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

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      !Number.isFinite(alt)
    ) {
      return null;
    }

    return {
      name:
        object.OBJECT_NAME ||
        object.OBJECT_ID ||
        "UNKNOWN OBJECT",

      noradId:
        object.NORAD_CAT_ID || null,

      lat,
      lon,
      alt,

      inclination:
        object.INCLINATION || null,

      period:
        object.PERIOD || null,

      apogee:
        object.APOGEE || null,

      perigee:
        object.PERIGEE || null,

      eccentricity:
        object.ECCENTRICITY || null,

      epoch:
        object.EPOCH || null,

      source:
        "CelesTrak",
    };
  } catch (error) {
    return null;
  }
}

/*
=========================================================
LIVE DEBRIS API
=========================================================
*/

app.get(
  "/api/debris",
  async (req, res) => {
    const now = new Date();

    const elements =
      await getDebrisElements();

    const positions =
      elements
        .map((object) =>
          calculatePosition(
            object,
            now
          )
        )
        .filter(Boolean);

    res.json(
      positions
    );
  }
);

/*
=========================================================
DEBRIS STATUS API
=========================================================
*/

app.get(
  "/api/debris/status",
  async (req, res) => {
    const elements =
      await getDebrisElements();

    res.json({
      source: "CelesTrak",
      dataset:
        "COSMOS 2251 DEB",
      objectsAvailable:
        elements.length,
      cacheAge:
        debrisCache.fetchedAt
          ? Date.now() -
            debrisCache.fetchedAt
          : null,
      live:
        elements.length > 0,
      error:
        lastDebrisError,
      updatedAt:
        debrisCache.fetchedAt
          ? new Date(
              debrisCache.fetchedAt
            ).toISOString()
          : null,
    });
  }
);

/*
=========================================================
FETCH SPACE STATIONS
=========================================================
*/

async function getStationElements() {
  const now = Date.now();

  if (
    stationsCache.data.length > 0 &&
    now -
      stationsCache.fetchedAt <
      CACHE_TIME
  ) {
    return stationsCache.data;
  }

  try {
    const response =
      await celestrak.get(
        STATIONS_URL
      );

    const objects =
      normalizeObjects(
        response.data
      );

    stationsCache = {
      data: objects,
      fetchedAt: now,
    };

    lastStationsError = null;

    return objects;
  } catch (error) {
    lastStationsError =
      error.message;

    console.error(
      "Station feed error:",
      error.message
    );

    return stationsCache.data;
  }
}

/*
=========================================================
ISS API
=========================================================
*/

app.get(
  "/iss",
  async (req, res) => {
    try {
      const stations =
        await getStationElements();

      const iss =
        stations.find(
          (object) => {
            const name =
              (
                object.OBJECT_NAME ||
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
        throw new Error(
          "ISS not found in live station feed."
        );
      }

      const position =
        calculatePosition(
          iss,
          new Date()
        );

      if (!position) {
        throw new Error(
          "Unable to calculate ISS position."
        );
      }

      res.json(
        position
      );
    } catch (error) {
      console.error(
        "ISS tracking error:",
        error.message
      );

      /*
       * Do NOT generate fake ISS coordinates.
       * Tell the frontend that the live source
       * is currently unavailable.
       */
      res.status(503).json({
        error:
          "Live ISS telemetry unavailable.",
        source:
          "CelesTrak",
      });
    }
  }
);

/*
=========================================================
HEALTH CHECK
=========================================================
*/

app.get(
  "/",
  (req, res) => {
    res.json({
      service:
        "Space Debris Tracker Direct Engine",
      status: "running",
      source:
        "CelesTrak",
      debrisDataset:
        "COSMOS 2251 DEB",
    });
  }
);

/*
=========================================================
START SERVER
=========================================================
*/

app.listen(
  PORT,
  () => {
    console.log(
      `Backend running on http://localhost:${PORT}`
    );

    console.log(
      "Live source: CelesTrak"
    );

    console.log(
      "Debris dataset: COSMOS 2251 DEB"
    );
  }
);