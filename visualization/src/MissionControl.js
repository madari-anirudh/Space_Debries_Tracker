import React, { useEffect, useMemo, useState } from "react";
import "./MissionControl.css";

const API_URL =
  "https://space-debris-tracker-api-t9n9.onrender.com";

const MissionControl = ({ onTrackEvent }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [error, setError] = useState(null);

  const loadCollisions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/api/collisions?minutes=180&threshold=100`
      );

      if (!response.ok) {
        throw new Error(
          `Collision API returned ${response.status}`
        );
      }

      const data = await response.json();

      setEvents(
        Array.isArray(data.results)
          ? data.results
          : []
      );
    } catch (err) {
      console.error(
        "Collision intelligence error:",
        err
      );

      setError(
        "Unable to load collision analysis."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollisions();

    const interval = setInterval(
      loadCollisions,
      60000
    );

    return () => clearInterval(interval);
  }, []);

  const statistics = useMemo(() => {
    return {
      total: events.length,

      high: events.filter(
        (event) =>
          event.closestApproach?.riskLevel ===
          "HIGH"
      ).length,

      medium: events.filter(
        (event) =>
          event.closestApproach?.riskLevel ===
          "MEDIUM"
      ).length,

      low: events.filter(
        (event) =>
          event.closestApproach?.riskLevel ===
          "LOW"
      ).length,
    };
  }, [events]);

  const getRiskClass = (risk) => {
    switch (risk) {
      case "HIGH":
        return "risk-high";

      case "MEDIUM":
        return "risk-medium";

      default:
        return "risk-low";
    }
  };

  const formatTimeToTCA = (seconds) => {
    if (
      !Number.isFinite(seconds)
    ) {
      return "--";
    }

    if (seconds <= 0) {
      return "NOW";
    }

    const minutes =
      Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours =
      Math.floor(minutes / 60);

    const remaining =
      minutes % 60;

    return `${hours}h ${remaining}m`;
  };

  const formatDistance = (distance) => {
    if (
      !Number.isFinite(distance)
    ) {
      return "--";
    }

    return `${distance.toFixed(2)} km`;
  };

  const trackEvent = (event) => {
    setSelectedEvent(event);

    if (onTrackEvent) {
      onTrackEvent(event);
    }
  };

  return (
    <div className="mission-control">

      <div className="mission-header">

        <div>
          <div className="mission-title">
            COLLISION INTELLIGENCE
          </div>

          <div className="mission-subtitle">
            SGP4 CLOSE-APPROACH ANALYSIS
          </div>
        </div>

        <button
          className="refresh-button"
          onClick={loadCollisions}
        >
          REFRESH
        </button>

      </div>

      <div className="risk-summary">

        <div className="summary-card">
          <span>TOTAL</span>
          <strong>
            {statistics.total}
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

      {loading && (
        <div className="mission-status">
          ANALYZING ORBITAL DATA...
        </div>
      )}

      {error && (
        <div className="mission-error">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        events.length === 0 && (
          <div className="mission-status">
            NO CLOSE APPROACHES DETECTED
          </div>
        )}

      <div className="collision-list">

        {events.map(
          (event, index) => {

            const approach =
              event.closestApproach || {};

            const object1 =
              event.object1 || {};

            const object2 =
              event.object2 || {};

            return (
              <div
                className={`collision-card ${
                  selectedEvent === event
                    ? "selected"
                    : ""
                }`}
                key={`${object1.noradId}-${object2.noradId}-${index}`}
              >

                <div className="collision-top">

                  <div
                    className={`risk-badge ${getRiskClass(
                      approach.riskLevel
                    )}`}
                  >
                    {approach.riskLevel ||
                      "UNKNOWN"}
                  </div>

                  <div className="risk-score">
                    SCORE{" "}
                    {approach.riskScore ?? "--"}
                  </div>

                </div>

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
                      {Number.isFinite(
                        approach.relativeVelocityKms
                      )
                        ? `${approach.relativeVelocityKms.toFixed(
                            3
                          )} km/s`
                        : "--"}
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

                <div className="tca-row">
                  TCA{" "}
                  {approach.tca
                    ? new Date(
                        approach.tca
                      ).toLocaleString()
                    : "--"}
                </div>

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
          }
        )}

      </div>

    </div>
  );
};

export default MissionControl;