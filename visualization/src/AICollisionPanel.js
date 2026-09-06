import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./AICollisionPanel.css";

/*
=========================================================
API CONFIGURATION
=========================================================
*/

const API_BASE =
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const AI_COLLISIONS_API =
  `${API_BASE}/api/ai/collisions`;

const AI_STATUS_API =
  `${API_BASE}/api/ai/status`;


/*
=========================================================
REFRESH CONFIGURATION
=========================================================
*/

const REFRESH_INTERVAL = 30000;


/*
=========================================================
FORMAT HELPERS
=========================================================
*/

function formatNumber(
  value,
  decimals = 2
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toFixed(decimals);
}


function formatTimeToTCA(seconds) {
  const value = Number(seconds);

  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value <= 0) {
    return "NOW";
  }

  const totalSeconds =
    Math.round(value);

  const hours =
    Math.floor(
      totalSeconds / 3600
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const remainingSeconds =
    totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
}


function formatTCA(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}


function getRiskLevel(event) {
  return (
    event?.aiPrediction?.risk_level ||
    event?.closestApproach?.riskLevel ||
    "UNAVAILABLE"
  ).toUpperCase();
}


function getRiskClass(riskLevel) {
  switch (riskLevel) {
    case "CRITICAL":
      return 3;

    case "HIGH":
      return 2;

    case "MEDIUM":
      return 1;

    case "LOW":
      return 0;

    default:
      return -1;
  }
}


/*
=========================================================
COMPONENT
=========================================================
*/

const AICollisionPanel = ({
  onSelectCollision,
}) => {

  const [
    data,
    setData,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    aiAvailable,
    setAiAvailable,
  ] = useState(false);

  const [
    selectedIndex,
    setSelectedIndex,
  ] = useState(null);


  /*
  =======================================================
  FETCH AI STATUS
  =======================================================
  */

  const checkAIStatus =
    useCallback(
      async () => {

        try {

          const response =
            await fetch(
              AI_STATUS_API
            );

          if (!response.ok) {
            setAiAvailable(false);
            return;
          }

          const result =
            await response.json();

          setAiAvailable(
            result?.aiService?.available === true
          );

        } catch {
          setAiAvailable(false);
        }
      },
      []
    );


  /*
  =======================================================
  FETCH AI COLLISIONS
  =======================================================
  */

  const loadAICollisions =
    useCallback(
      async (
        showLoader = false
      ) => {

        try {

          if (showLoader) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }

          setError(null);

          const response =
            await fetch(
              AI_COLLISIONS_API
            );

          const result =
            await response.json();

          if (!response.ok) {

            throw new Error(
              result?.error ||
              result?.message ||
              "AI collision analysis failed."
            );
          }

          setData(result);

          setAiAvailable(true);

        } catch (requestError) {

          console.error(
            "[AI UI] Collision request failed:",
            requestError
          );

          setError(
            requestError.message ||
            "Unable to load AI collision analysis."
          );

        } finally {

          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );


  /*
  =======================================================
  INITIAL LOAD
  =======================================================
  */

  useEffect(() => {

    checkAIStatus();

    loadAICollisions(true);

  }, [
    checkAIStatus,
    loadAICollisions,
  ]);


  /*
  =======================================================
  AUTO REFRESH
  =======================================================
  */

  useEffect(() => {

    const interval =
      setInterval(
        () => {
          checkAIStatus();
          loadAICollisions(false);
        },
        REFRESH_INTERVAL
      );

    return () => {
      clearInterval(interval);
    };

  }, [
    checkAIStatus,
    loadAICollisions,
  ]);


  /*
  =======================================================
  RESULTS
  =======================================================
  */

const results = useMemo(
  () =>
    Array.isArray(data?.results)
      ? data.results
      : [],
  [data]
);

  /*
  =======================================================
  SUMMARY
  =======================================================
  */

  const summary =
    useMemo(
      () => {

        const initial = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          unavailable: 0,
        };

        results.forEach(
          (event) => {

            const risk =
              getRiskLevel(event);

            if (
              risk === "CRITICAL"
            ) {
              initial.critical += 1;

            } else if (
              risk === "HIGH"
            ) {
              initial.high += 1;

            } else if (
              risk === "MEDIUM"
            ) {
              initial.medium += 1;

            } else if (
              risk === "LOW"
            ) {
              initial.low += 1;

            } else {
              initial.unavailable += 1;
            }
          }
        );

        return initial;

      },
      [results]
    );


  /*
  =======================================================
  SELECT COLLISION
  =======================================================
  */

  const handleSelect =
    (
      event,
      index
    ) => {

      setSelectedIndex(index);

      if (onSelectCollision) {
        onSelectCollision(event);
      }
    };


  /*
  =======================================================
  LOADING
  =======================================================
  */

  if (loading) {

    return (
      <section className="ai-collision-panel">

        <div className="ai-panel-header">

          <div>
            <span className="ai-panel-kicker">
              PHASE 4.2A
            </span>

            <h2>
              AI COLLISION ANALYSIS
            </h2>
          </div>

          <span className="ai-status ai-status-loading">
            INITIALIZING
          </span>

        </div>

        <div className="ai-panel-loading">
          Loading orbital risk analysis...
        </div>

      </section>
    );
  }


  /*
  =======================================================
  ERROR
  =======================================================
  */

  if (error) {

    return (
      <section className="ai-collision-panel">

        <div className="ai-panel-header">

          <div>
            <span className="ai-panel-kicker">
              PHASE 4.2A
            </span>

            <h2>
              AI COLLISION ANALYSIS
            </h2>
          </div>

          <span className="ai-status ai-status-offline">
            OFFLINE
          </span>

        </div>

        <div className="ai-panel-error">

          <strong>
            AI analysis unavailable
          </strong>

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              loadAICollisions(true)
            }
          >
            RETRY
          </button>

        </div>

      </section>
    );
  }


  /*
  =======================================================
  MAIN UI
  =======================================================
  */

  return (
    <section className="ai-collision-panel">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="ai-panel-header">

        <div>

          <span className="ai-panel-kicker">
            PHASE 4.2A
          </span>

          <h2>
            AI COLLISION ANALYSIS
          </h2>

          <p>
            SGP4 close-approach screening
            with Gradient Boosting risk classification
          </p>

        </div>

        <div className="ai-header-status">

          <span
            className={
              aiAvailable
                ? "ai-status ai-status-online"
                : "ai-status ai-status-offline"
            }
          >
            <span className="ai-status-dot" />

            {aiAvailable
              ? "AI ONLINE"
              : "AI OFFLINE"}
          </span>

          <button
            type="button"
            className="ai-refresh-button"
            onClick={() =>
              loadAICollisions(false)
            }
            disabled={refreshing}
          >
            {refreshing
              ? "UPDATING..."
              : "REFRESH"}
          </button>

        </div>

      </div>


      {/* =================================================
          ENGINE INFORMATION
      ================================================= */}

      <div className="ai-engine-bar">

        <div>
          <span>
            MODEL
          </span>

          <strong>
            GRADIENT BOOSTING
          </strong>
        </div>

        <div>
          <span>
            PROPAGATION
          </span>

          <strong>
            SGP4
          </strong>
        </div>

        <div>
          <span>
            WINDOW
          </span>

          <strong>
            {data?.predictionWindowMinutes ?? 180} MIN
          </strong>
        </div>

        <div>
          <span>
            THRESHOLD
          </span>

          <strong>
            {data?.thresholdKm ?? 100} KM
          </strong>
        </div>

      </div>


      {/* =================================================
          RISK SUMMARY
      ================================================= */}

      <div className="ai-risk-summary">

        <div className="ai-summary-card critical">
          <span>CRITICAL</span>
          <strong>{summary.critical}</strong>
        </div>

        <div className="ai-summary-card high">
          <span>HIGH</span>
          <strong>{summary.high}</strong>
        </div>

        <div className="ai-summary-card medium">
          <span>MEDIUM</span>
          <strong>{summary.medium}</strong>
        </div>

        <div className="ai-summary-card low">
          <span>LOW</span>
          <strong>{summary.low}</strong>
        </div>

        <div className="ai-summary-card total">
          <span>SCREENED</span>
          <strong>
            {data?.closeApproaches ??
              results.length}
          </strong>
        </div>

      </div>


      {/* =================================================
          COLLISION LIST
      ================================================= */}

      <div className="ai-results-section">

        <div className="ai-results-heading">

          <div>
            <span>
              AI RISK RANKING
            </span>

            <strong>
              {results.length} CLOSE APPROACHES
            </strong>
          </div>

          <span className="ai-sort-label">
            HIGHEST RISK FIRST
          </span>

        </div>


        {results.length === 0 ? (

          <div className="ai-empty">
            No close approaches detected
            within the current screening window.
          </div>

        ) : (

          <div className="ai-collision-list">

            {results.map(
              (event, index) => {

                const risk =
                  getRiskLevel(event);

                const riskClass =
                  getRiskClass(risk);

                const prediction =
                  event?.aiPrediction;

                const closest =
                  event?.closestApproach || {};

                const confidence =
                  Number(
                    prediction?.confidence
                  );

                const selected =
                  selectedIndex === index;

                return (
                  <button
                    type="button"
                    key={`${event?.object1?.noradId || "A"}-${event?.object2?.noradId || "B"}-${index}`}
                    className={
                      selected
                        ? "ai-collision-row selected"
                        : "ai-collision-row"
                    }
                    onClick={() =>
                      handleSelect(
                        event,
                        index
                      )
                    }
                  >

                    <div className="ai-row-risk">

                      <span
                        className={`ai-risk-indicator risk-${risk.toLowerCase()}`}
                      />

                      <div>
                        <strong>
                          {risk}
                        </strong>

                        <span>
                          CLASS {riskClass}
                        </span>
                      </div>

                    </div>


                    <div className="ai-row-objects">

                      <strong>
                        {event?.object1?.name ||
                          "UNKNOWN OBJECT"}
                      </strong>

                      <span>
                        NORAD{" "}
                        {event?.object1?.noradId ||
                          "—"}
                      </span>

                      <div className="ai-object-link">
                        ↕
                      </div>

                      <strong>
                        {event?.object2?.name ||
                          "UNKNOWN OBJECT"}
                      </strong>

                      <span>
                        NORAD{" "}
                        {event?.object2?.noradId ||
                          "—"}
                      </span>

                    </div>


                    <div className="ai-row-metric">

                      <span>
                        MISS DISTANCE
                      </span>

                      <strong>
                        {formatNumber(
                          closest.missDistanceKm,
                          3
                        )}{" "}
                        km
                      </strong>

                    </div>


                    <div className="ai-row-metric">

                      <span>
                        RELATIVE VELOCITY
                      </span>

                      <strong>
                        {formatNumber(
                          closest.relativeVelocityKms,
                          3
                        )}{" "}
                        km/s
                      </strong>

                    </div>


                    <div className="ai-row-metric">

                      <span>
                        TCA
                      </span>

                      <strong>
                        {formatTimeToTCA(
                          closest.timeToClosestApproachSeconds
                        )}
                      </strong>

                    </div>


                    <div className="ai-row-confidence">

                      <span>
                        CONFIDENCE
                      </span>

                      <strong>
                        {Number.isFinite(
                          confidence
                        )
                          ? `${(
                              confidence * 100
                            ).toFixed(2)}%`
                          : "—"}
                      </strong>

                    </div>

                  </button>
                );
              }
            )}

          </div>
        )}

      </div>


      {/* =================================================
          SELECTED COLLISION
      ================================================= */}

      {selectedIndex !== null &&
        results[selectedIndex] && (

        <div className="ai-selected-card">

          <div className="ai-selected-header">

            <div>

              <span>
                SELECTED CONJUNCTION
              </span>

              <h3>
                {
                  results[selectedIndex]
                    ?.object1
                    ?.name
                }

                <span>
                  {" "}↔{" "}
                </span>

                {
                  results[selectedIndex]
                    ?.object2
                    ?.name
                }
              </h3>

            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedIndex(null);
              }}
            >
              CLOSE
            </button>

          </div>


          <div className="ai-selected-grid">

            <div>
              <span>
                NORAD OBJECT 1
              </span>

              <strong>
                {
                  results[selectedIndex]
                    ?.object1
                    ?.noradId || "—"
                }
              </strong>
            </div>

            <div>
              <span>
                NORAD OBJECT 2
              </span>

              <strong>
                {
                  results[selectedIndex]
                    ?.object2
                    ?.noradId || "—"
                }
              </strong>
            </div>

            <div>
              <span>
                MISS DISTANCE
              </span>

              <strong>
                {formatNumber(
                  results[selectedIndex]
                    ?.closestApproach
                    ?.missDistanceKm,
                  3
                )} km
              </strong>
            </div>

            <div>
              <span>
                RELATIVE VELOCITY
              </span>

              <strong>
                {formatNumber(
                  results[selectedIndex]
                    ?.closestApproach
                    ?.relativeVelocityKms,
                  3
                )} km/s
              </strong>
            </div>

            <div>
              <span>
                TIME TO TCA
              </span>

              <strong>
                {formatTimeToTCA(
                  results[selectedIndex]
                    ?.closestApproach
                    ?.timeToClosestApproachSeconds
                )}
              </strong>
            </div>

            <div>
              <span>
                TCA
              </span>

              <strong>
                {formatTCA(
                  results[selectedIndex]
                    ?.closestApproach
                    ?.tca
                )}
              </strong>
            </div>

          </div>


          {/* AI FEATURE INFORMATION */}

          <div className="ai-feature-section">

            <span className="ai-feature-title">
              MODEL INPUT FEATURES
            </span>

            <div className="ai-feature-grid">

              <div>
                <span>
                  DISTANCE RISK
                </span>

                <strong>
                  {formatNumber(
                    results[selectedIndex]
                      ?.aiPrediction
                      ?.features
                      ?.distance_risk,
                    4
                  )}
                </strong>
              </div>

              <div>
                <span>
                  VELOCITY RISK
                </span>

                <strong>
                  {formatNumber(
                    results[selectedIndex]
                      ?.aiPrediction
                      ?.features
                      ?.velocity_risk,
                    4
                  )}
                </strong>
              </div>

              <div>
                <span>
                  TIME RISK
                </span>

                <strong>
                  {formatNumber(
                    results[selectedIndex]
                      ?.aiPrediction
                      ?.features
                      ?.time_risk,
                    4
                  )}
                </strong>
              </div>

              <div>
                <span>
                  PHYSICS RISK SCORE
                </span>

                <strong>
                  {formatNumber(
                    results[selectedIndex]
                      ?.aiPrediction
                      ?.features
                      ?.physics_risk_score,
                    4
                  )}
                </strong>
              </div>

            </div>

          </div>


          {/* SCIENTIFIC NOTE */}

          <div className="ai-scientific-note">

            <strong>
              SCIENTIFIC NOTE
            </strong>

            <span>
              AI confidence represents the model's
              classification confidence. It is not
              physical collision probability.
              Physical collision probability requires
              orbital covariance and uncertainty data.
            </span>

          </div>

        </div>
      )}

    </section>
  );
};


export default AICollisionPanel;