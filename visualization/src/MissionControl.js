import React, { useEffect, useMemo, useState } from "react";
import "./MissionControl.css";

const API_URL =
  "https://space-debris-tracker-api-t9n9.onrender.com";

const MissionControl = ({ onTrackEvent }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [error, setError] = useState(null);

  // =========================================================
  // LOAD AI COLLISION PREDICTIONS
  // =========================================================

  const loadCollisions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/api/ai/collisions?minutes=180&threshold=100`
      );

      if (!response.ok) {
        throw new Error(
          `AI Collision API returned ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success !== true) {
        throw new Error(
          "AI Collision Prediction Engine failed."
        );
      }

      setEvents(
        Array.isArray(data.results)
          ? data.results
          : []
      );
    } catch (err) {
      console.error(
        "AI collision intelligence error:",
        err
      );

      setError(
        "Unable to load AI collision predictions."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD + AUTO REFRESH
  // =========================================================

  useEffect(() => {
    loadCollisions();

    const interval = setInterval(
      loadCollisions,
      60000
    );

    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // STATISTICS
  // =========================================================

  const statistics = useMemo(() => {
    return {
      total: events.length,

      critical: events.filter(
        (event) =>
          event.aiPrediction?.predictionLevel ===
          "CRITICAL"
      ).length,

      high: events.filter(
        (event) =>
          event.aiPrediction?.predictionLevel ===
          "HIGH"
      ).length,

      medium: events.filter(
        (event) =>
          event.aiPrediction?.predictionLevel ===
          "MEDIUM"
      ).length,

      low: events.filter(
        (event) =>
          event.aiPrediction?.predictionLevel ===
          "LOW"
      ).length,
    };
  }, [events]);

  // =========================================================
  // RISK CLASS
  // =========================================================

  const getRiskClass = (risk) => {
    switch (risk) {
      case "CRITICAL":
        return "risk-critical";

      case "HIGH":
        return "risk-high";

      case "MEDIUM":
        return "risk-medium";

      default:
        return "risk-low";
    }
  };

  // =========================================================
  // TIME FORMAT
  // =========================================================

  const formatTimeToTCA = (seconds) => {
    if (!Number.isFinite(seconds)) {
      return "--";
    }

    if (seconds <= 0) {
      return "NOW";
    }

    const minutes = Math.floor(
      seconds / 60
    );

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    const remaining = minutes % 60;

    return `${hours}h ${remaining}m`;
  };

  // =========================================================
  // DISTANCE FORMAT
  // =========================================================

  const formatDistance = (distance) => {
    if (!Number.isFinite(distance)) {
      return "--";
    }

    return `${distance.toFixed(2)} km`;
  };

  // =========================================================
  // VELOCITY FORMAT
  // =========================================================

  const formatVelocity = (velocity) => {
    if (!Number.isFinite(velocity)) {
      return "--";
    }

    return `${velocity.toFixed(3)} km/s`;
  };

  // =========================================================
  // TRACK EVENT
  // =========================================================

  const trackEvent = (event) => {
    setSelectedEvent(event);

    if (onTrackEvent) {
      onTrackEvent(event);
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="mission-control">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="mission-header">

        <div>
          <div className="mission-title">
            AI COLLISION PREDICTION
          </div>

          <div className="mission-subtitle">
            AI COLLISION PREDICTION ENGINE • SGP4 / SATELLITE.JS
          </div>
        </div>

        <button
          className="refresh-button"
          onClick={loadCollisions}
          disabled={loading}
        >
          {loading ? "ANALYZING" : "REFRESH"}
        </button>

      </div>

      {/* =====================================================
          ENGINE STATUS
          ===================================================== */}

      <div className="engine-status">

        <div className="engine-status-item">
          <span>ENGINE</span>
          <strong>AI PREDICTION</strong>
        </div>

        <div className="engine-status-item">
          <span>WINDOW</span>
          <strong>180 MIN</strong>
        </div>

        <div className="engine-status-item">
          <span>THRESHOLD</span>
          <strong>100 KM</strong>
        </div>

        <div className="engine-status-item">
          <span>MODE</span>
          <strong>LIVE CACHE</strong>
        </div>

      </div>

      {/* =====================================================
          RISK SUMMARY
          ===================================================== */}

      <div className="risk-summary">

        <div className="summary-card">
          <span>TOTAL</span>

          <strong>
            {statistics.total}
          </strong>
        </div>

        <div className="summary-card critical">
          <span>CRITICAL</span>

          <strong>
            {statistics.critical}
          </strong>
        </div>

        <div className="summary-card high">
          <span>HIGH</span>

          <strong>
            {statistics.high}
          </strong>
        </div>

        <div className="summary-card medium">
          <span>MEDIUM</span>

          <strong>
            {statistics.medium}
          </strong>
        </div>

        <div className="summary-card low">
          <span>LOW</span>

          <strong>
            {statistics.low}
          </strong>
        </div>

      </div>

      {/* =====================================================
          LOADING
          ===================================================== */}

      {loading && (
        <div className="mission-status">
          AI ENGINE ANALYZING ORBITAL TRAJECTORIES...
        </div>
      )}

      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <div className="mission-error">
          {error}
        </div>
      )}

      {/* =====================================================
          EMPTY
          ===================================================== */}

      {!loading &&
        !error &&
        events.length === 0 && (
          <div className="mission-status">
            NO PREDICTED CLOSE APPROACHES DETECTED
          </div>
        )}

      {/* =====================================================
          COLLISION LIST
          ===================================================== */}

      <div className="collision-list">

        {events.map((event, index) => {

          const approach =
            event.closestApproach || {};

          const ai =
            event.aiPrediction || {};

          const features =
            ai.features || {};

          const object1 =
            event.object1 || {};

          const object2 =
            event.object2 || {};

          const predictionLevel =
            ai.predictionLevel ||
            approach.riskLevel ||
            "LOW";

          return (
            <div
              className={`collision-card ${
                selectedEvent === event
                  ? "selected"
                  : ""
              }`}
              key={`${object1.noradId}-${object2.noradId}-${index}`}
            >

              {/* =================================================
                  AI TOP
                  ================================================= */}

              <div className="collision-top">

                <div
                  className={`risk-badge ${getRiskClass(
                    predictionLevel
                  )}`}
                >
                  {predictionLevel}
                </div>

                <div className="prediction-score">
                  AI SCORE{" "}
                  {ai.predictionScore ?? "--"}
                  <span>/100</span>
                </div>

              </div>

              {/* =================================================
                  OBJECTS
                  ================================================= */}

              <div className="object-row">

                <div className="object">

                  <div className="object-name">
                    {object1.name ||
                      "UNKNOWN OBJECT"}
                  </div>

                  <div className="norad">
                    NORAD{" "}
                    {object1.noradId ||
                      "--"}
                  </div>

                </div>

                <div className="separator">
                  ↔
                </div>

                <div className="object">

                  <div className="object-name">
                    {object2.name ||
                      "UNKNOWN OBJECT"}
                  </div>

                  <div className="norad">
                    NORAD{" "}
                    {object2.noradId ||
                      "--"}
                  </div>

                </div>

              </div>

              {/* =================================================
                  ORBITAL TELEMETRY
                  ================================================= */}

              <div className="telemetry-grid">

                <div>
                  <span>
                    MISS DISTANCE
                  </span>

                  <strong>
                    {formatDistance(
                      approach.missDistanceKm
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    RELATIVE VELOCITY
                  </span>

                  <strong>
                    {formatVelocity(
                      approach.relativeVelocityKms
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    TIME TO TCA
                  </span>

                  <strong>
                    {formatTimeToTCA(
                      approach.timeToClosestApproachSeconds
                    )}
                  </strong>
                </div>

              </div>

              {/* =================================================
                  AI PREDICTION
                  ================================================= */}

              <div className="ai-panel">

                <div className="ai-panel-header">

                  <div>
                    AI COLLISION ASSESSMENT
                  </div>

                  <div className="confidence">
                    CONFIDENCE{" "}
                    {ai.confidence ?? "--"}%
                  </div>

                </div>

                <div className="ai-features">

                  <div className="ai-feature">

                    <span>
                      DISTANCE RISK
                    </span>

                    <strong>
                      {features.distanceRisk ??
                        "--"}
                    </strong>

                  </div>

                  <div className="ai-feature">

                    <span>
                      VELOCITY RISK
                    </span>

                    <strong>
                      {features.velocityRisk ??
                        "--"}
                    </strong>

                  </div>

                  <div className="ai-feature">

                    <span>
                      TIME RISK
                    </span>

                    <strong>
                      {features.timeRisk ??
                        "--"}
                    </strong>

                  </div>

                  <div className="ai-feature">

                    <span>
                      ORBITAL RISK
                    </span>

                    <strong>
                      {features.orbitalRisk ??
                        "--"}
                    </strong>

                  </div>

                </div>

                {Array.isArray(ai.factors) &&
                  ai.factors.length > 0 && (
                    <div className="ai-factors">

                      <div className="ai-factors-title">
                        PREDICTION FACTORS
                      </div>

                      {ai.factors.map(
                        (factor, factorIndex) => (
                          <div
                            className="ai-factor"
                            key={factorIndex}
                          >
                            <span>•</span>
                            {factor}
                          </div>
                        )
                      )}

                    </div>
                  )}

              </div>

              {/* =================================================
                  TCA
                  ================================================= */}

              <div className="tca-row">

                TCA{" "}
                {approach.tca
                  ? new Date(
                      approach.tca
                    ).toLocaleString()
                  : "--"}

              </div>

              {/* =================================================
                  TRACK EVENT
                  ================================================= */}

              <button
                className="track-button"
                onClick={() =>
                  trackEvent(event)
                }
              >
                TRACK EVENT
              </button>

            </div>
          );
        })}

      </div>

    </div>
  );
};

export default MissionControl;