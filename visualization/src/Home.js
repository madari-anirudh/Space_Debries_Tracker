
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import EarthScene from "./EarthScene";
import "./home.css";
const Home = () => {
  const [startSpace, setStartSpace] = useState(false);
  const [debrisData, setDebrisData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    axios
      .get("https://space-debris-tracker-api-t9n9.onrender.com/api/debris")
      .then((res) => {
        setDebrisData(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error("Failed to fetch debris telemetry:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const statistics = useMemo(() => {
    const objects = debrisData.length;

    const altitudes = debrisData
      .map((item) => Number(item.alt))
      .filter((alt) => Number.isFinite(alt));

    const averageAltitude =
      altitudes.length > 0
        ? altitudes.reduce((sum, value) => sum + value, 0) / altitudes.length
        : 0;

    return {
      objects,
      averageAltitude,
      coverage: altitudes.length > 0 ? "ACTIVE" : "STANDBY",
    };
  }, [debrisData]);

  const launchTracker = () => {
    setStartSpace(true);
  };

  if (startSpace) {
    return <EarthScene onBack={() => setStartSpace(false)} />;
  }

  return (
    <div className="space-home">
      {/* =========================
          NAVIGATION
      ========================== */}
      <header className="space-nav">
        <div className="nav-brand">
          <div className="brand-mark">
            <span />
            <span />
            <span />
          </div>

          <div>
            <strong>ORBITAL</strong>
            <small>DEBRIS TRACKER</small>
          </div>
        </div>

        <nav className="nav-links">
          <button
  className={activeSection === "overview" ? "active" : ""}
  onClick={() => {
    setActiveSection("overview");
    document
      .getElementById("overview")
      ?.scrollIntoView({ behavior: "smooth" });
  }}
>
  Overview
</button>

<button
  className={activeSection === "telemetry" ? "active" : ""}
  onClick={() => {
    setActiveSection("telemetry");
    document
      .getElementById("telemetry")
      ?.scrollIntoView({ behavior: "smooth" });
  }}
>
  Live Telemetry
</button>

<button
  className={activeSection === "mission" ? "active" : ""}
  onClick={() => {
    setActiveSection("mission");
    document
      .getElementById("mission")
      ?.scrollIntoView({ behavior: "smooth" });
  }}
>
  Mission
</button>
        </nav>

        <button className="nav-launch" onClick={launchTracker}>
          Launch Tracker
          <span>↗</span>
        </button>
      </header>

      {/* =========================
          HERO
      ========================== */}
      <main>
        <section className="hero-section" id="overview">
          <div className="hero-grid" />

          <div className="hero-content">
            <div className="system-status">
              <span className="status-dot" />
              SYSTEM OPERATIONAL
            </div>

            <p className="hero-eyebrow">
              EARTH ORBITAL MONITORING SYSTEM
            </p>

            <h1>
              TRACK THE
              <br />
              <span>ORBIT.</span>
              <br />
              PROTECT THE
              <br />
              <span>FUTURE.</span>
            </h1>

            <p className="hero-description">
              Monitor space debris, orbital objects and satellite telemetry
              through a centralized tracking platform designed to visualize
              the environment surrounding Earth.
            </p>

            <div className="hero-actions">
              <button className="primary-action" onClick={launchTracker}>
                <span>Explore Live Tracker</span>
                <span className="action-arrow">→</span>
              </button>

              <button
                className="secondary-action"
                onClick={() =>
                  document
                    .getElementById("mission")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Mission Overview
              </button>
            </div>
          </div>

          {/* Orbital visual */}
          <div className="orbital-visual">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />

            <div className="earth-glow">
              <div className="earth">
                <div className="earth-light" />
                <div className="earth-land land-one" />
                <div className="earth-land land-two" />
                <div className="earth-land land-three" />
              </div>
            </div>

            <div className="debris-object debris-one" />
            <div className="debris-object debris-two" />
            <div className="debris-object debris-three" />
            <div className="debris-object debris-four" />
            <div className="debris-object debris-five" />

            <div className="visual-label label-top">
              <span>OBJECT</span>
              <strong>TRACKING</strong>
            </div>

            <div className="visual-label label-bottom">
              <span>ORBITAL</span>
              <strong>ENVIRONMENT</strong>
            </div>
          </div>

          <div className="scroll-indicator">
            <span>SCROLL TO EXPLORE</span>
            <div className="scroll-line" />
          </div>
        </section>

        {/* =========================
            STATISTICS
        ========================== */}
        <section className="stats-section">
          <div className="section-container">
            <div className="section-label">
              <span>01</span>
              LIVE SYSTEM STATUS
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">OBJECTS TRACKED</span>
                <strong>{loading ? "—" : statistics.objects}</strong>
                <small>Detected orbital objects</small>
              </div>

              <div className="stat-card">
                <span className="stat-label">TELEMETRY STATUS</span>
                <strong className="status-value">
                  {loading ? "LOADING" : "LIVE"}
                </strong>
                <small>API data connection</small>
              </div>

              <div className="stat-card">
                <span className="stat-label">AVG. ALTITUDE</span>
                <strong>
                  {loading
                    ? "—"
                    : `${statistics.averageAltitude.toFixed(1)}`}
                  <em> km</em>
                </strong>
                <small>Across available objects</small>
              </div>

              <div className="stat-card">
                <span className="stat-label">TRACKING COVERAGE</span>
                <strong className="status-value">
                  {statistics.coverage}
                </strong>
                <small>Current monitoring state</small>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            MISSION
        ========================== */}
        <section className="mission-section" id="mission">
          <div className="section-container mission-grid">
            <div>
              <div className="section-label">
                <span>02</span>
                THE MISSION
              </div>

              <h2>
                Understanding what
                <br />
                <span>surrounds Earth.</span>
              </h2>
            </div>

            <div className="mission-copy">
              <p className="large-copy">
                Space is becoming increasingly crowded. Thousands of active
                satellites operate alongside fragments created by launches,
                collisions and decades of orbital activity.
              </p>

              <p>
                Orbital Debris Tracker brings this information into a
                centralized visual environment, making orbital objects easier
                to monitor, understand and explore.
              </p>

              <button className="text-action" onClick={launchTracker}>
                Enter the orbital environment
                <span>→</span>
              </button>
            </div>
          </div>
        </section>

        {/* =========================
            TELEMETRY
        ========================== */}
        <section className="telemetry-section" id="telemetry">
          <div className="section-container">
            <div className="telemetry-header">
              <div>
                <div className="section-label">
                  <span>03</span>
                  LIVE TELEMETRY
                </div>

                <h2>
                  Orbital
                  <br />
                  <span>data feed.</span>
                </h2>
              </div>

              <div className="feed-status">
                <span className="status-dot" />
                LIVE CONNECTION
              </div>
            </div>

            <div className="telemetry-panel">
              <div className="telemetry-panel-header">
                <div>
                  <span>REAL-TIME OBJECT DATA</span>
                  <small>
                    Source: Orbital Debris Tracking API
                  </small>
                </div>

                <button onClick={launchTracker}>
                  OPEN 3D TRACKER →
                </button>
              </div>

              <div className="table-wrapper">
                <table className="telemetry-table">
                  <thead>
                    <tr>
                      <th>OBJECT</th>
                      <th>LATITUDE</th>
                      <th>LONGITUDE</th>
                      <th>ALTITUDE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
   <tbody>
  {loading ? (
    <tr>
      <td colSpan="5" className="empty-state">
        <div className="telemetry-loading">
          <span>Loading orbital telemetry...</span>
          <div className="loading-track">
            <div className="loading-bar" />
          </div>
        </div>
      </td>
    </tr>
  ) : debrisData.length === 0 ? (
    <tr>
      <td colSpan="5" className="empty-state">
        No telemetry data available.
      </td>
    </tr>
  ) : (
    debrisData.map((debris, index) => (
      <tr key={debris.id || index}>
        <td>
          <div className="object-name">
            <span className="object-marker" />
            {debris.name || `OBJECT-${index + 1}`}
          </div>
        </td>

        <td>
          {Number.isFinite(Number(debris.lat))
            ? Number(debris.lat).toFixed(2)
            : "—"}
        </td>

        <td>
          {Number.isFinite(Number(debris.lon))
            ? Number(debris.lon).toFixed(2)
            : "—"}
        </td>

        <td>
          {Number.isFinite(Number(debris.alt))
            ? `${Number(debris.alt).toFixed(2)} km`
            : "—"}
        </td>

        <td>
          <span className="object-status">
            TRACKED
          </span>
        </td>
      </tr>
    ))
  )}
</tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            CAPABILITIES
        ========================== */}
        <section className="capabilities-section">
          <div className="section-container">
            <div className="section-label">
              <span>04</span>
              TRACKING CAPABILITIES
            </div>

            <div className="capabilities-grid">
              <article className="capability-card">
                <span className="capability-number">01</span>
                <div className="capability-icon">◌</div>
                <h3>Orbital Monitoring</h3>
                <p>
                  Visualize tracked objects and their position within the
                  orbital environment surrounding Earth.
                </p>
              </article>

              <article className="capability-card">
                <span className="capability-number">02</span>
                <div className="capability-icon">⌁</div>
                <h3>Telemetry Analysis</h3>
                <p>
                  Access location and altitude information through a
                  continuously updated telemetry feed.
                </p>
              </article>

              <article className="capability-card">
                <span className="capability-number">03</span>
                <div className="capability-icon">+</div>
                <h3>3D Visualization</h3>
                <p>
                  Move from raw telemetry into an interactive visualization
                  of Earth's orbital environment.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* =========================
            FINAL CTA
        ========================== */}
        <section className="final-cta">
          <div className="cta-grid" />

          <div className="cta-content">
            <div className="section-label">
              <span>05</span>
              ENTER ORBIT
            </div>

            <h2>
              See the space
              <br />
              <span>around us.</span>
            </h2>

            <p>
              Explore tracked orbital objects through the interactive 3D
              environment.
            </p>

            <button className="primary-action large" onClick={launchTracker}>
              <span>Launch Live Tracker</span>
              <span className="action-arrow">→</span>
            </button>
          </div>
        </section>
      </main>

      {/* =========================
          FOOTER
      ========================== */}
      <footer className="space-footer">
        <div className="footer-brand">
          <div className="brand-mark">
            <span />
            <span />
            <span />
          </div>

          <div>
            <strong>ORBITAL</strong>
            <small>DEBRIS TRACKER</small>
          </div>
        </div>

        <p>
          Monitoring the orbital environment around Earth.
        </p>

        <span className="footer-copy">
          © {new Date().getFullYear()} Orbital Debris Tracker
        </span>
      </footer>
    </div>
  );
};

export default Home;
