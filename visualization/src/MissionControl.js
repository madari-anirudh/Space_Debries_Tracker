import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./MissionControl.css";

const API_URL =
  "https://space-debris-tracker-api-t9n9.onrender.com";

const MissionControl = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const loadCollisions = async () => {
    try {
      setError("");

      const response = await axios.get(
        `${API_URL}/api/collisions?minutes=180&threshold=100`
      );

      setData(response.data);
    } catch (err) {
      console.error("Collision API error:", err);
      setError("Unable to load collision analysis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollisions();

    // Refresh the collision calculation periodically.
    const interval = setInterval(
      loadCollisions,
      5 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, []);

  const riskCounts = useMemo(() => {
    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    if (!data?.results) {
      return counts;
    }

    data.results.forEach((item) => {
      const risk =
        item.riskLevel ||
        item.risk ||
        "LOW";

      if (counts[risk] !== undefined) {
        counts[risk]++;
      }
    });

    return counts;
  }, [data]);

  const getRiskLevel = (item) => {
    if (item.riskLevel) {
      return item.riskLevel.toUpperCase();
    }

    if (item.risk) {
      return item.risk.toUpperCase();
    }

    const distance =
      Number(
        item.missDistanceKm ??
        item.minimumDistanceKm ??
        item.distanceKm ??
        Infinity
      );

    if (distance < 5) return "CRITICAL";
    if (distance < 20) return "HIGH";
    if (distance < 50) return "MEDIUM";

    return "LOW";
  };

  const getDistance = (item) => {
    const value =
      item.missDistanceKm ??
      item.minimumDistanceKm ??
      item.distanceKm;

    return Number.isFinite(Number(value))
      ? Number(value).toFixed(2)
      : "—";
  };

  const getTCA = (item) => {
    return (
      item.tca ||
      item.timeOfClosestApproach ||
      item.closestApproachTime ||
      "—"
    );
  };

  const getRelativeVelocity = (item) => {
    const value =
      item.relativeVelocityKmS ??
      item.relativeVelocity ??
      item.relativeSpeed;

    return Number.isFinite(Number(value))
      ? `${Number(value).toFixed(2)} km/s`
      : "—";
  };

  const getObjectName = (object) => {
    return (
      object?.name ||
      "UNKNOWN OBJECT"
    );
  };

  const getNorad = (object) => {
    return (
      object?.noradId ||
      "N/A"
    );
  };

  if (loading) {
    return (
      <section className="mission-control">
        <div className="mission-loading">
          Loading orbital collision analysis...
        </div>
      </section>
    );
  }

  return (
    <section className="mission-control">

      {/* HEADER */}

      <div className="mission-header">

        <div>
          <div className="mission-eyebrow">
            ORBITAL SAFETY SYSTEM
          </div>

          <h1>
            Mission Control 
          </h1>

          <p>
            Real-time close-approach screening
            using cached orbital data and SGP4
            propagation.
          </p>
        </div>

        <div className="mission-status">
          <span className="status-dot" />
          SYSTEM ONLINE
        </div>

      </div>


      {/* ERROR */}

      {error && (
        <div className="mission-error">
          {error}
        </div>
      )}


      {/* OVERVIEW */}

      <div className="mission-stats">

        <div className="mission-stat">
          <span>OBJECTS TRACKED</span>
          <strong>
            {data?.statistics?.objectsPropagated ??
              data?.objectsChecked ??
              0}
          </strong>
        </div>

        <div className="mission-stat">
          <span>PAIRS ANALYZED</span>
          <strong>
            {data?.statistics?.analyzedPairs ??
              0}
          </strong>
        </div>

        <div className="mission-stat">
          <span>CLOSE APPROACHES</span>
          <strong>
            {data?.approachesFound ?? 0}
          </strong>
        </div>

        <div className="mission-stat">
          <span>WINDOW</span>
          <strong>
            {data?.predictionWindowMinutes ??
              180}
            <small> MIN</small>
          </strong>
        </div>

      </div>


      {/* RISK SUMMARY */}

      <div className="risk-summary">

        <div className="risk-title">
          RISK CLASSIFICATION
        </div>

        <div className="risk-grid">

          <div className="risk-card critical">
            <span>CRITICAL</span>
            <strong>
              {riskCounts.CRITICAL}
            </strong>
          </div>

          <div className="risk-card high">
            <span>HIGH</span>
            <strong>
              {riskCounts.HIGH}
            </strong>
          </div>

          <div className="risk-card medium">
            <span>MEDIUM</span>
            <strong>
              {riskCounts.MEDIUM}
            </strong>
          </div>

          <div className="risk-card low">
            <span>LOW</span>
            <strong>
              {riskCounts.LOW}
            </strong>
          </div>

        </div>

      </div>


      {/* APPROACH TABLE */}

      <div className="approach-panel">

        <div className="panel-header">

          <div>
            <span className="panel-label">
              PREDICTED CLOSE APPROACHES
            </span>

            <h2>
              Orbital Threat Feed
            </h2>
          </div>

          <button
            className="refresh-button"
            onClick={() => {
              setLoading(true);
              loadCollisions();
            }}
          >
            ↻ Refresh
          </button>

        </div>


        <div className="approach-list">

          {!data?.results?.length && (
            <div className="empty-state">
              No close approaches detected.
            </div>
          )}

          {data?.results?.map(
            (item, index) => {

              const risk =
                getRiskLevel(item);

              return (
                <button
                  key={
                    item.id ||
                    `${index}-${getNorad(
                      item.object1
                    )}-${getNorad(
                      item.object2
                    )}`
                  }
                  className="approach-row"
                  onClick={() =>
                    setSelected(item)
                  }
                >

                  <div className="approach-index">
                    {String(index + 1).padStart(
                      2,
                      "0"
                    )}
                  </div>


                  <div className="approach-objects">

                    <strong>
                      {getObjectName(
                        item.object1
                      )}
                    </strong>

                    <span>
                      NORAD{" "}
                      {getNorad(
                        item.object1
                      )}
                    </span>

                    <div className="approach-arrow">
                      ↕
                    </div>

                    <strong>
                      {getObjectName(
                        item.object2
                      )}
                    </strong>

                    <span>
                      NORAD{" "}
                      {getNorad(
                        item.object2
                      )}
                    </span>

                  </div>


                  <div className="approach-data">

                    <div>
                      <span>
                        MISS DISTANCE
                      </span>

                      <strong>
                        {getDistance(item)}
                        {" "}
                        km
                      </strong>
                    </div>

                    <div>
                      <span>
                        RELATIVE VELOCITY
                      </span>

                      <strong>
                        {getRelativeVelocity(
                          item
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        TCA
                      </span>

                      <strong>
                        {getTCA(item)}
                      </strong>
                    </div>

                  </div>


                  <div
                    className={`risk-badge ${risk.toLowerCase()}`}
                  >
                    {risk}
                  </div>

                </button>
              );
            }
          )}

        </div>

      </div>


      {/* SELECTED APPROACH */}

      {selected && (
        <div className="collision-detail">

          <div className="detail-header">

            <div>
              <span>
                SELECTED EVENT
              </span>

              <h2>
                Close Approach Analysis
              </h2>
            </div>

            <button
              onClick={() =>
                setSelected(null)
              }
            >
              ×
            </button>

          </div>


          <div className="detail-objects">

            <div className="detail-object">

              <span>OBJECT 01</span>

              <strong>
                {getObjectName(
                  selected.object1
                )}
              </strong>

              <small>
                NORAD{" "}
                {getNorad(
                  selected.object1
                )}
              </small>

            </div>


            <div className="detail-separator">
              CLOSE
            </div>


            <div className="detail-object">

              <span>OBJECT 02</span>

              <strong>
                {getObjectName(
                  selected.object2
                )}
              </strong>

              <small>
                NORAD{" "}
                {getNorad(
                  selected.object2
                )}
              </small>

            </div>

          </div>


          <div className="detail-metrics">

            <div>
              <span>
                MINIMUM DISTANCE
              </span>

              <strong>
                {getDistance(selected)}
                {" "}km
              </strong>
            </div>

            <div>
              <span>
                TIME OF CLOSEST APPROACH
              </span>

              <strong>
                {getTCA(selected)}
              </strong>
            </div>

            <div>
              <span>
                RELATIVE VELOCITY
              </span>

              <strong>
                {getRelativeVelocity(
                  selected
                )}
              </strong>
            </div>

            <div>
              <span>
                SCREENING THRESHOLD
              </span>

              <strong>
                {data?.thresholdKm ?? 100}
                {" "}km
              </strong>
            </div>

          </div>


          <div className="detail-note">

            <strong>
              SCREENING NOTICE
            </strong>

            <p>
            🔴Note:-This event represents a predicted
              close approach based on SGP4 orbital
              propagation. It is not a confirmed
              collision probability. Orbital
              uncertainty and covariance data are
              required for operational collision
              probability assessment.
            </p>

          </div>

        </div>
      )}

    </section>
  );
};

export default MissionControl;