const fs = require("fs");
const path = require("path");
const axios = require("axios");

const CACHE_DIR = path.join(
  __dirname,
  "orbitalCache"
);

const SOURCES = {
  debris: [
    "https://retlector.eu/cosmos-2251-debris/tle",
    "https://orbits.stowaway.live/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=TLE",
  ],

  stations: [
    "https://retlector.eu/stations/tle",
    "https://orbits.stowaway.live/NORAD/elements/gp.php?GROUP=stations&FORMAT=TLE",
  ],
};

const TIMEOUT = 20000;

function ensureCacheDirectory() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, {
      recursive: true,
    });
  }
}

function parseTLEText(rawText) {
  if (
    !rawText ||
    typeof rawText !== "string"
  ) {
    return [];
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const objects = [];

  for (
    let i = 0;
    i < lines.length - 2;
    i++
  ) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    if (
      line1.startsWith("1 ") &&
      line2.startsWith("2 ")
    ) {
      objects.push({
        name,
        line1,
        line2,
      });

      i += 2;
    }
  }

  return objects;
}

async function downloadSource(
  urls,
  type
) {
  let lastError = null;

  for (const url of urls) {
    try {
      console.log(
        `\n[${type.toUpperCase()}] Trying: ${url}`
      );

      const response =
        await axios.get(url, {
          timeout: TIMEOUT,
          responseType: "text",
          headers: {
            Accept: "text/plain",
            "User-Agent":
              "Space-Debris-Tracker/1.0",
          },
        });

      const objects =
        parseTLEText(
          response.data
        );

      if (!objects.length) {
        throw new Error(
          "No valid TLE objects returned."
        );
      }

      console.log(
        `[${type.toUpperCase()}] Received ${objects.length} objects.`
      );

      return {
        objects,
        source: url,
      };
    } catch (error) {
      lastError =
        error.message;

      console.log(
        `[${type.toUpperCase()}] Source failed: ${error.message}`
      );
    }
  }

  throw new Error(
    `All ${type} orbital sources failed. Last error: ${lastError}`
  );
}

async function updateCache(
  type
) {
  const result =
    await downloadSource(
      SOURCES[type],
      type
    );

  const output = {
    source:
      "ReTLEctor / orbital mirror",

    dataset:
      type === "debris"
        ? "COSMOS 2251 DEBRIS"
        : "SPACE STATIONS",

    fetchedAt:
      new Date().toISOString(),

    objectCount:
      result.objects.length,

    upstream:
      result.source,

    objects:
      result.objects,
  };

  const filePath =
    path.join(
      CACHE_DIR,
      `${type}.json`
    );

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      output,
      null,
      2
    ),
    "utf8"
  );

  console.log(
    `[CACHE] ${filePath}`
  );

  return output;
}

async function main() {
  ensureCacheDirectory();

  console.log(
    "=========================================="
  );

  console.log(
    " ORBITAL CACHE UPDATE"
  );

  console.log(
    "=========================================="
  );

  let success = 0;

  try {
    await updateCache(
      "debris"
    );

    success++;
  } catch (error) {
    console.error(
      "\nDebris cache failed:",
      error.message
    );
  }

  try {
    await updateCache(
      "stations"
    );

    success++;
  } catch (error) {
    console.error(
      "\nStations cache failed:",
      error.message
    );
  }

  console.log(
    "\n=========================================="
  );

  console.log(
    `Cache update completed: ${success}/2`
  );

  console.log(
    "=========================================="
  );

  if (success === 0) {
    process.exitCode = 1;
  }
}

main();