import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import * as THREE from "three";

import {
  OrbitControls,
} from "three/examples/jsm/controls/OrbitControls";

import axios from "axios";

import "./EarthScene.css";

/*
=========================================================
API CONFIGURATION
=========================================================
*/

const API_BASE =
  process.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const DEBRIS_API =
  `${API_BASE}/api/debris`;

const DEBRIS_STATUS_API =
  `${API_BASE}/api/debris/status`;

const ISS_API =
  `${API_BASE}/api/iss`;

const COLLISION_API =
  `${API_BASE}/api/collisions`;


/*
=========================================================
UPDATE INTERVALS
=========================================================
*/

const POSITION_UPDATE_INTERVAL = 5000;


/*
=========================================================
EARTH CONSTANTS
=========================================================
*/

const EARTH_RADIUS = 100;

const SIDEREAL_DAY_MS =
  23 * 60 * 60 * 1000 +
  56 * 60 * 1000 +
  4.0905 * 1000;


/*
=========================================================
COMPONENT
=========================================================
*/

const EarthScene = ({
  onBack,
  trackedEvent,
}) => {

  const mountRef =
    useRef(null);

  const viewModeRef =
    useRef("TRACKING");


  /*
  ========================================================
  TIME SCALE
  ========================================================
  */

  const [
    timeScale,
    setTimeScale,
  ] = useState(1);

  const timeScaleRef =
    useRef(1);


  /*
  ========================================================
  CAMERA VIEW
  ========================================================
  */

  const [
    viewMode,
    setViewMode,
  ] = useState("TRACKING");


  /*
  ========================================================
  PHASE 3 CAMERA RESTORE
  ========================================================
  */

  const previousCameraStateRef =
    useRef(null);


  /*
  ========================================================
  TELEMETRY STATE
  ========================================================
  */

  const [
    telemetry,
    setTelemetry,
  ] = useState({

    debrisCount: 0,

    connected: false,

    cached: false,

    live: false,

    refreshing: false,

    source:
      "LOCAL CACHE",

    dataset:
      "COSMOS 2251 DEBRIS",

    cacheUpdatedAt:
      null,

    lastPositionUpdate:
      null,

    error:
      null,

    selected:
      null,

    iss:
      null,

    collision:
      null,
  });


  const telemetryRef =
    useRef(telemetry);


  /*
  ========================================================
  TIME SCALE
  ========================================================
  */

  const changeTimeScale =
    (value) => {

      timeScaleRef.current =
        value;

      setTimeScale(
        value
      );
    };


  /*
  ========================================================
  THREE.JS
  ========================================================
  */

  useEffect(() => {

    const mount =
      mountRef.current;

    if (!mount) {
      return;
    }

    let disposed =
      false;


    /*
    ======================================================
    SIZE
    ======================================================
    */

    const width =
      mount.clientWidth ||
      window.innerWidth;

    const height =
      mount.clientHeight ||
      window.innerHeight;


    /*
    ======================================================
    SCENE
    ======================================================
    */

    const scene =
      new THREE.Scene();

    scene.background =
      new THREE.Color(
        0x010409
      );


    /*
    ======================================================
    CAMERA
    ======================================================
    */

    const camera =
      new THREE.PerspectiveCamera(
        45,
        width / height,
        0.1,
        5000
      );

    camera.position.set(
      0,
      160,
      430
    );


    /*
    ======================================================
    RENDERER
    ======================================================
    */

    const renderer =
      new THREE.WebGLRenderer({
        antialias: true,
        powerPreference:
          "high-performance",
      });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio ||
          1,
        2
      )
    );

    renderer.setSize(
      width,
      height
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    mount.appendChild(
      renderer.domElement
    );


    /*
    ======================================================
    ORBIT CONTROLS
    ======================================================
    */

    const controls =
      new OrbitControls(
        camera,
        renderer.domElement
      );

    controls.enableRotate =
      true;

    controls.enablePan =
      true;

    controls.enableZoom =
      true;

    controls.enableDamping =
      true;

    controls.dampingFactor =
      0.06;

    controls.rotateSpeed =
      0.55;

    controls.panSpeed =
      0.5;

    controls.zoomSpeed =
      0.8;

    controls.minDistance =
      115;

    controls.maxDistance =
      1000;

    controls.minPolarAngle =
      0.15;

    controls.maxPolarAngle =
      Math.PI - 0.15;

    controls.target.set(
      0,
      0,
      0
    );

    controls.update();


    /*
    ======================================================
    LIGHTING
    ======================================================
    */

    scene.add(
      new THREE.AmbientLight(
        0xffffff,
        0.38
      )
    );

    const sunLight =
      new THREE.DirectionalLight(
        0xffffff,
        2.1
      );

    sunLight.position.set(
      450,
      250,
      400
    );

    scene.add(
      sunLight
    );

    const rimLight =
      new THREE.DirectionalLight(
        0x4cc9ff,
        0.45
      );

    rimLight.position.set(
      -350,
      50,
      -300
    );

    scene.add(
      rimLight
    );


    /*
    ======================================================
    TEXTURES
    ======================================================
    */

    const loader =
      new THREE.TextureLoader();

    const earthTexture =
      loader.load(
        "/textures/earth_atmos_2048.jpg"
      );

    const cloudTexture =
      loader.load(
        "/textures/earth_clouds_1024.png"
      );


    /*
    ======================================================
    EARTH
    ======================================================
    */

    const earthGroup =
      new THREE.Group();

    scene.add(
      earthGroup
    );

    const earthGeometry =
      new THREE.SphereGeometry(
        EARTH_RADIUS,
        96,
        96
      );

    const earthMaterial =
      new THREE.MeshPhongMaterial({

        map:
          earthTexture,

        shininess:
          12,

        specular:
          new THREE.Color(
            0x1b4055
          ),
      });

    const earth =
      new THREE.Mesh(
        earthGeometry,
        earthMaterial
      );

    earthGroup.add(
      earth
    );


    /*
    ======================================================
    CLOUDS
    ======================================================
    */

    const cloudGeometry =
      new THREE.SphereGeometry(
        EARTH_RADIUS + 2.1,
        72,
        72
      );

    const cloudMaterial =
      new THREE.MeshPhongMaterial({

        map:
          cloudTexture,

        transparent:
          true,

        opacity:
          0.22,

        depthWrite:
          false,
      });

    const clouds =
      new THREE.Mesh(
        cloudGeometry,
        cloudMaterial
      );

    earthGroup.add(
      clouds
    );


    /*
    ======================================================
    ATMOSPHERE
    ======================================================
    */

    const atmosphereGeometry =
      new THREE.SphereGeometry(
        EARTH_RADIUS + 5,
        64,
        64
      );

    const atmosphereMaterial =
      new THREE.MeshBasicMaterial({

        color:
          0x39bdf8,

        transparent:
          true,

        opacity:
          0.055,

        side:
          THREE.BackSide,

        blending:
          THREE.AdditiveBlending,

        depthWrite:
          false,
      });

    const atmosphere =
      new THREE.Mesh(
        atmosphereGeometry,
        atmosphereMaterial
      );

    earthGroup.add(
      atmosphere
    );


    /*
    ======================================================
    STARS
    ======================================================
    */

    const starGeometry =
      new THREE.BufferGeometry();

    const starCount =
      18000;

    const starPositions =
      new Float32Array(
        starCount * 3
      );

    for (
      let i = 0;
      i < starCount;
      i++
    ) {

      const radius =
        1500 +
        Math.random() *
          3000;

      const theta =
        Math.random() *
        Math.PI *
        2;

      const phi =
        Math.acos(
          2 *
            Math.random() -
            1
        );

      starPositions[
        i * 3
      ] =
        radius *
        Math.sin(phi) *
        Math.cos(theta);

      starPositions[
        i * 3 + 1
      ] =
        radius *
        Math.cos(phi);

      starPositions[
        i * 3 + 2
      ] =
        radius *
        Math.sin(phi) *
        Math.sin(theta);
    }

    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        starPositions,
        3
      )
    );

    const starMaterial =
      new THREE.PointsMaterial({

        color:
          0xffffff,

        size:
          0.65,

        transparent:
          true,

        opacity:
          0.72,

        sizeAttenuation:
          true,
      });

    const stars =
      new THREE.Points(
        starGeometry,
        starMaterial
      );

    scene.add(
      stars
    );


    /*
    ======================================================
    ORBIT REFERENCE
    ======================================================
    */

    const orbitGroup =
      new THREE.Group();

    scene.add(
      orbitGroup
    );


    /*
    ======================================================
    COLLISION VISUALIZATION
    ======================================================
    */

    const collisionGroup =
      new THREE.Group();

    scene.add(
      collisionGroup
    );

    const collisionLineMaterial =
      new THREE.LineBasicMaterial({
        color: 0xff3b30,
        transparent: true,
        opacity: 0.9,
      });

    const collisionMarkerMaterial =
      new THREE.MeshBasicMaterial({
        color: 0xff3b30,
      });

    const collisionMarkerGeometry =
      new THREE.SphereGeometry(
        2.8,
        16,
        16
      );

    let collisionLine =
      null;

    let collisionMarker1 =
      null;

    let collisionMarker2 =
      null;


    const clearCollisionVisualization =
      () => {

        if (collisionLine) {

          collisionGroup.remove(
            collisionLine
          );

          collisionLine.geometry.dispose();

          collisionLine =
            null;
        }

        if (collisionMarker1) {

          collisionGroup.remove(
            collisionMarker1
          );

          collisionMarker1 =
            null;
        }

        if (collisionMarker2) {

          collisionGroup.remove(
            collisionMarker2
          );

          collisionMarker2 =
            null;
        }
      };


    const showCollisionVisualization =
      (
        event,
        currentDebrisData
      ) => {

        clearCollisionVisualization();

        if (
          !event ||
          !Array.isArray(currentDebrisData)
        ) {
          return;
        }

        const norad1 =
          String(
            event.object1?.noradId || ""
          );

        const norad2 =
          String(
            event.object2?.noradId || ""
          );

        const object1 =
          currentDebrisData.find(
            object =>
              String(
                object.noradId
              ) === norad1
          );

        const object2 =
          currentDebrisData.find(
            object =>
              String(
                object.noradId
              ) === norad2
          );

        if (
          !object1 ||
          !object2
        ) {

          console.warn(
            "Collision objects not found in debris cache",
            norad1,
            norad2
          );

          return;
        }

        const position1 =
          convertCoordsToVector(
            object1.lat,
            object1.lon,
            object1.alt
          );

        const position2 =
          convertCoordsToVector(
            object2.lat,
            object2.lon,
            object2.alt
          );

        const geometry =
          new THREE.BufferGeometry()
            .setFromPoints([
              position1,
              position2,
            ]);

        collisionLine =
          new THREE.Line(
            geometry,
            collisionLineMaterial
          );

        collisionGroup.add(
          collisionLine
        );

        collisionMarker1 =
          new THREE.Mesh(
            collisionMarkerGeometry,
            collisionMarkerMaterial
          );

        collisionMarker2 =
          new THREE.Mesh(
            collisionMarkerGeometry,
            collisionMarkerMaterial
          );

        collisionMarker1.position.copy(
          position1
        );

        collisionMarker2.position.copy(
          position2
        );

        collisionGroup.add(
          collisionMarker1
        );

        collisionGroup.add(
          collisionMarker2
        );
      };


    /*
    ======================================================
    CREATE ORBIT RING
    ======================================================
    */

    const createOrbitRing =
      (
        radius,
        rotationX,
        rotationZ,
        opacity
      ) => {

        const points =
          [];

        for (
          let i = 0;
          i <= 128;
          i++
        ) {

          const angle =
            (i / 128) *
            Math.PI *
            2;

          points.push(
            new THREE.Vector3(
              radius *
                Math.cos(angle),

              0,

              radius *
                Math.sin(angle)
            )
          );
        }

        const geometry =
          new THREE.BufferGeometry()
            .setFromPoints(
              points
            );

        const material =
          new THREE.LineBasicMaterial({

            color:
              0x3da8d8,

            transparent:
              true,

            opacity,
          });

        const ring =
          new THREE.LineLoop(
            geometry,
            material
          );

        ring.rotation.x =
          rotationX;

        ring.rotation.z =
          rotationZ;

        orbitGroup.add(
          ring
        );

        return ring;
      };


    createOrbitRing(
      122,
      THREE.MathUtils.degToRad(12),
      THREE.MathUtils.degToRad(20),
      0.13
    );

    createOrbitRing(
      145,
      THREE.MathUtils.degToRad(42),
      THREE.MathUtils.degToRad(-30),
      0.1
    );

    createOrbitRing(
      175,
      THREE.MathUtils.degToRad(72),
      THREE.MathUtils.degToRad(50),
      0.075
    );

    createOrbitRing(
      215,
      THREE.MathUtils.degToRad(25),
      THREE.MathUtils.degToRad(80),
      0.06
    );


    /*
    ======================================================
    COORDINATE CONVERSION
    ======================================================
    */

    const convertCoordsToVector =
      (
        lat,
        lon,
        alt
      ) => {

        const safeLat =
          Number(lat) || 0;

        const safeLon =
          Number(lon) || 0;

        const safeAlt =
          Number(alt) || 0;

        const visualAltitude =
          Math.max(
            10,
            Math.min(
              260,
              safeAlt / 1000
            )
          );

        const radius =
          EARTH_RADIUS +
          visualAltitude;

        const phi =
          (90 - safeLat) *
          Math.PI /
          180;

        const theta =
          (safeLon + 180) *
          Math.PI /
          180;

        return new THREE.Vector3(

          -radius *
            Math.sin(phi) *
            Math.cos(theta),

          radius *
            Math.cos(phi),

          radius *
            Math.sin(phi) *
            Math.sin(theta)
        );
      };


    /*
    ======================================================
    DEBRIS
    ======================================================
    */

    const debrisGroup =
      new THREE.Group();

    scene.add(
      debrisGroup
    );

    const debrisGeometry =
      new THREE.SphereGeometry(
        1.55,
        8,
        8
      );

    const debrisMaterial =
      new THREE.MeshStandardMaterial({

        color:
          0x55d9ff,

        emissive:
          0x073a4f,

        emissiveIntensity:
          1.7,

        roughness:
          0.4,

        metalness:
          0.3,
      });

    let debrisMesh =
      null;

    let debrisData =
      [];

    const debrisMatrix =
      new THREE.Matrix4();


    /*
    ======================================================
    CREATE / REUSE DEBRIS MESH
    ======================================================
    */

    const ensureDebrisMesh =
      (count) => {

        if (
          count <= 0
        ) {

          if (
            debrisMesh
          ) {

            debrisGroup.remove(
              debrisMesh
            );

            debrisMesh =
              null;
          }

          return;
        }

        if (
          debrisMesh &&
          debrisMesh.count ===
            count
        ) {

          return;
        }

        if (
          debrisMesh
        ) {

          debrisGroup.remove(
            debrisMesh
          );
        }

        debrisMesh =
          new THREE.InstancedMesh(
            debrisGeometry,
            debrisMaterial,
            count
          );

        debrisMesh.frustumCulled =
          false;

        debrisMesh.instanceMatrix.setUsage(
          THREE.DynamicDrawUsage
        );

        debrisGroup.add(
          debrisMesh
        );
      };


    /*
    ======================================================
    SELECTED OBJECT
    ======================================================
    */

    const selectedMarker =
      new THREE.Group();

    const selectedRingGeometry =
      new THREE.RingGeometry(
        4,
        4.7,
        32
      );

    const selectedRingMaterial =
      new THREE.MeshBasicMaterial({

        color:
          0xffffff,

        transparent:
          true,

        opacity:
          0.9,

        side:
          THREE.DoubleSide,
      });

    const selectedRing =
      new THREE.Mesh(
        selectedRingGeometry,
        selectedRingMaterial
      );

    selectedMarker.add(
      selectedRing
    );


    const selectedCoreGeometry =
      new THREE.SphereGeometry(
        2.4,
        12,
        12
      );

    const selectedCoreMaterial =
      new THREE.MeshBasicMaterial({

        color:
          0xffffff,
      });

    const selectedCore =
      new THREE.Mesh(
        selectedCoreGeometry,
        selectedCoreMaterial
      );

    selectedMarker.add(
      selectedCore
    );

    selectedMarker.visible =
      false;

    scene.add(
      selectedMarker
    );


    /*
    ======================================================
    SELECTED ORBIT
    ======================================================
    */

    let selectedOrbit =
      null;


    /*
    ======================================================
    COLLISION TRACKING
    ======================================================
    */

    let trackedCollisionGroup =
      null;


    /*
    ======================================================
    CLEAR SELECTED ORBIT
    ======================================================
    */

    const clearSelectedOrbit =
      () => {

        if (
          selectedOrbit
        ) {

          scene.remove(
            selectedOrbit
          );

          selectedOrbit.geometry.dispose();

          selectedOrbit.material.dispose();

          selectedOrbit =
            null;
        }
      };


    /*
    ======================================================
    PHASE 3 CAMERA STATE
    SAVE CURRENT CAMERA
    ======================================================
    */

    const savePreviousCameraState =
      () => {

        /*
         * Do not overwrite the saved camera
         * if Track Event is already active.
         */

        if (
          previousCameraStateRef.current
        ) {
          return;
        }

        previousCameraStateRef.current = {

          position:
            camera.position.clone(),

          target:
            controls.target.clone(),

          viewMode:
            viewModeRef.current,
        };

        console.log(
          "PHASE 3: Camera state saved",
          previousCameraStateRef.current
        );
      };


    /*
    ======================================================
    PHASE 3 CAMERA RESTORE
    ======================================================
    */

    const restorePreviousCameraState =
      () => {

        const saved =
          previousCameraStateRef.current;

        if (!saved) {
          return;
        }

        console.log(
          "PHASE 3: Restoring previous camera state",
          saved
        );

        camera.position.copy(
          saved.position
        );

        controls.target.copy(
          saved.target
        );

        controls.update();

        setViewMode(
          saved.viewMode
        );

        viewModeRef.current =
          saved.viewMode;

        previousCameraStateRef.current =
          null;
      };


    /*
    ======================================================
    CLEAR COLLISION TRACKING
    ======================================================
    */

    const clearTrackedCollision = () => {

      if (!trackedCollisionGroup) {
        return;
      }

      scene.remove(
        trackedCollisionGroup
      );

      trackedCollisionGroup.traverse(
        (child) => {

          if (child.geometry) {
            child.geometry.dispose();
          }

          if (child.material) {

            if (
              Array.isArray(
                child.material
              )
            ) {

              child.material.forEach(
                (material) => {
                  material.dispose();
                }
              );

            } else {

              child.material.dispose();

            }
          }

        }
      );

      trackedCollisionGroup =
        null;
    };


    /*
    ======================================================
    TRACK COLLISION EVENT
    ======================================================
    */

    const trackCollisionEvent = (
      event
    ) => {

      if (!event) {
        return;
      }

      /*
       * PHASE 3:
       * Save the exact camera state BEFORE
       * moving the camera to the collision.
       */

      savePreviousCameraState();

      clearTrackedCollision();


      /*
      -------------------------------------------------------
      FIND OBJECTS
      -------------------------------------------------------
      */

      const object1 =
        event.object1 || {};

      const object2 =
        event.object2 || {};


      const norad1 =
        String(
          object1.noradId ?? ""
        );

      const norad2 =
        String(
          object2.noradId ?? ""
        );


      const debris1 =
        debrisData.find(
          (object) =>
            String(
              object.noradId ??
              object.id ??
              ""
            ) === norad1
        );


      const debris2 =
        debrisData.find(
          (object) =>
            String(
              object.noradId ??
              object.id ??
              ""
            ) === norad2
        );


      /*
      -------------------------------------------------------
      DEBUG
      -------------------------------------------------------
      */

      console.log(
        "PHASE 3 TRACK EVENT",
        {
          norad1,
          norad2,
          debris1,
          debris2,
          debrisCount:
            debrisData.length,
        }
      );


      /*
      -------------------------------------------------------
      OBJECTS NOT FOUND
      -------------------------------------------------------
      */

      if (
        !debris1 ||
        !debris2
      ) {

        console.warn(
          "Collision objects not found in current debris dataset",
          {
            norad1,
            norad2,
          }
        );

        /*
         * Since tracking did not actually start,
         * restore the camera state that was saved.
         */

        restorePreviousCameraState();

        return;
      }


      /*
      -------------------------------------------------------
      CONVERT TO THREE.JS POSITIONS
      -------------------------------------------------------
      */

      const position1 =
        convertCoordsToVector(
          debris1.lat,
          debris1.lon,
          debris1.alt
        );


      const position2 =
        convertCoordsToVector(
          debris2.lat,
          debris2.lon,
          debris2.alt
        );


      /*
      -------------------------------------------------------
      COLLISION GROUP
      -------------------------------------------------------
      */

      trackedCollisionGroup =
        new THREE.Group();


      /*
      -------------------------------------------------------
      OBJECT 1 MARKER
      -------------------------------------------------------
      */

      const markerGeometry1 =
        new THREE.SphereGeometry(
          3.8,
          16,
          16
        );


      const markerMaterial1 =
        new THREE.MeshBasicMaterial({
          color:
            0xff3b30,

          transparent:
            true,

          opacity:
            0.95,
        });


      const marker1 =
        new THREE.Mesh(
          markerGeometry1,
          markerMaterial1
        );


      marker1.position.copy(
        position1
      );


      trackedCollisionGroup.add(
        marker1
      );


      /*
      -------------------------------------------------------
      OBJECT 2 MARKER
      -------------------------------------------------------
      */

      const markerGeometry2 =
        new THREE.SphereGeometry(
          3.8,
          16,
          16
        );


      const markerMaterial2 =
        new THREE.MeshBasicMaterial({
          color:
            0xff3b30,

          transparent:
            true,

          opacity:
            0.95,
        });


      const marker2 =
        new THREE.Mesh(
          markerGeometry2,
          markerMaterial2
        );


      marker2.position.copy(
        position2
      );


      trackedCollisionGroup.add(
        marker2
      );


      /*
      -------------------------------------------------------
      CONNECTION LINE
      -------------------------------------------------------
      */

      const lineGeometry =
        new THREE.BufferGeometry()
          .setFromPoints([
            position1,
            position2,
          ]);


      const lineMaterial =
        new THREE.LineBasicMaterial({

          color:
            0xff3b30,

          transparent:
            true,

          opacity:
            0.9,
        });


      const collisionLine =
        new THREE.Line(
          lineGeometry,
          lineMaterial
        );


      trackedCollisionGroup.add(
        collisionLine
      );


      /*
      -------------------------------------------------------
      MIDPOINT
      -------------------------------------------------------
      */

      const midpoint =
        new THREE.Vector3()
          .addVectors(
            position1,
            position2
          )
          .multiplyScalar(
            0.5
          );


      /*
      -------------------------------------------------------
      TRACK CAMERA
      -------------------------------------------------------
      */

      const cameraDirection =
        midpoint
          .clone()
          .normalize();


      const cameraDistance =
        Math.max(
          220,
          position1.distanceTo(
            position2
          ) * 3
        );


      const cameraPosition =
        midpoint
          .clone()
          .add(
            cameraDirection.multiplyScalar(
              cameraDistance
            )
          );


      camera.position.copy(
        cameraPosition
      );


      controls.target.copy(
        midpoint
      );


      controls.update();


      /*
      -------------------------------------------------------
      ADD TO SCENE
      -------------------------------------------------------
      */

      scene.add(
        trackedCollisionGroup
      );

      console.log(
        "PHASE 3: Collision camera tracking active"
      );
    };


    /*
    ======================================================
    CREATE SELECTED ORBIT
    ======================================================
    */

    const createSelectedOrbit =
      (position) => {

        clearSelectedOrbit();

        const direction =
          position
            .clone()
            .normalize();

        const reference =
          Math.abs(
            direction.y
          ) < 0.9
            ? new THREE.Vector3(
                0,
                1,
                0
              )
            : new THREE.Vector3(
                1,
                0,
                0
              );

        const axisA =
          new THREE.Vector3()
            .crossVectors(
              direction,
              reference
            )
            .normalize();

        const axisB =
          new THREE.Vector3()
            .crossVectors(
              direction,
              axisA
            )
            .normalize();

        const radius =
          Math.max(
            125,
            position.length()
          );

        const points =
          [];

        for (
          let i = 0;
          i <= 128;
          i++
        ) {

          const angle =
            (i / 128) *
            Math.PI *
            2;

          const point =
            new THREE.Vector3()
              .addScaledVector(
                axisA,
                radius *
                  Math.cos(
                    angle
                  )
              )
              .addScaledVector(
                axisB,
                radius *
                  0.46 *
                  Math.sin(
                    angle
                  )
              );

          points.push(
            point
          );
        }

        const geometry =
          new THREE.BufferGeometry()
            .setFromPoints(
              points
            );

        const material =
          new THREE.LineBasicMaterial({

            color:
              0xffffff,

            transparent:
              true,

            opacity:
              0.48,
          });

        selectedOrbit =
          new THREE.LineLoop(
            geometry,
            material
          );

        scene.add(
          selectedOrbit
        );
      };


    /*
    ======================================================
    UPDATE DEBRIS
    ======================================================
    */

    const updateDebrisMesh =
      (data) => {

        debrisData =
          Array.isArray(data)
            ? data
            : [];

        ensureDebrisMesh(
          debrisData.length
        );

        if (
          !debrisMesh
        ) {
          return;
        }

        debrisData.forEach(
          (
            object,
            index
          ) => {

            const position =
              convertCoordsToVector(
                object.lat,
                object.lon,
                object.alt
              );

            debrisMatrix.makeTranslation(
              position.x,
              position.y,
              position.z
            );

            debrisMesh.setMatrixAt(
              index,
              debrisMatrix
            );
          }
        );

        debrisMesh.instanceMatrix.needsUpdate =
          true;


        /*
         * Update selected object position
         */

        const selected =
          telemetryRef.current.selected;

        if (
          selected &&
          selectedMarker.visible
        ) {

          const index =
            selected.index;

          if (
            index >= 0 &&
            index <
              debrisData.length
          ) {

            const selectedObject =
              debrisData[
                index
              ];

            const position =
              convertCoordsToVector(
                selectedObject.lat,
                selectedObject.lon,
                selectedObject.alt
              );

            selectedMarker.position.copy(
              position
            );
          }
        }
      };


    /*
    ======================================================
    LOCAL POSITION API
    ======================================================
    */

    const updateDebris =
      async () => {

        try {

          const response =
            await axios.get(
              DEBRIS_API,
              {
                timeout:
                  10000,
              }
            );

          if (
            disposed
          ) {
            return;
          }

          const data =
            Array.isArray(
              response.data
            )
              ? response.data
              : [];

          updateDebrisMesh(
            data
          );

          setTelemetry(
            (previous) => {

              const next = {

                ...previous,

                debrisCount:
                  data.length,

                connected:
                  true,

                error:
                  null,

                lastPositionUpdate:
                  new Date(),

                source:
                  "LOCAL CACHE",
              };

              telemetryRef.current =
                next;

              return next;
            }
          );

        } catch (
          error
        ) {

          if (
            disposed
          ) {
            return;
          }

          console.error(
            "Local debris API error:",
            error.message
          );

          setTelemetry(
            (previous) => {

              const next = {

                ...previous,

                connected:
                  false,

                error:
                  "Local orbital telemetry unavailable.",
              };

              telemetryRef.current =
                next;

              return next;
            }
          );
        }
      };


    /*
    ======================================================
    CACHE STATUS API
    ======================================================
    */

    const updateCacheStatus =
      async () => {

        try {

          const response =
            await axios.get(
              DEBRIS_STATUS_API,
              {
                timeout:
                  10000,
              }
            );

          if (
            disposed
          ) {
            return;
          }

          const status =
            response.data;

          setTelemetry(
            (previous) => {

              const next = {

                ...previous,

                cached:
                  Boolean(
                    status.cached
                  ),

                live:
                  Boolean(
                    status.live
                  ),

                refreshing:
                  Boolean(
                    status.refreshing
                  ),

                dataset:
                  status.dataset ||
                  "COSMOS 2251 DEBRIS",

                cacheUpdatedAt:
                  status.fetchedAt ||
                  null,

                source:
                  status.cached
                    ? "LOCAL CACHE"
                    : "NO DATA",
              };

              telemetryRef.current =
                {
                  ...telemetryRef.current,
                  ...next,
                };

              return next;
            }
          );

        } catch (
          error
        ) {

          console.error(
            "Cache status error:",
            error.message
          );
        }
      };


    /*
    ======================================================
    ISS
    ======================================================
    */

    const issGroup =
      new THREE.Group();

    scene.add(
      issGroup
    );


    const issGeometry =
      new THREE.SphereGeometry(
        3.6,
        20,
        20
      );

    const issMaterial =
      new THREE.MeshStandardMaterial({

        color:
          0xff3b30,

        emissive:
          0x6e0b05,

        emissiveIntensity:
          2,
      });

    const iss =
      new THREE.Mesh(
        issGeometry,
        issMaterial
      );

    issGroup.add(
      iss
    );


    const issGlowGeometry =
      new THREE.SphereGeometry(
        6,
        16,
        16
      );

    const issGlowMaterial =
      new THREE.MeshBasicMaterial({

        color:
          0xff3b30,

        transparent:
          true,

        opacity:
          0.11,

        blending:
          THREE.AdditiveBlending,

        depthWrite:
          false,
      });

    const issGlow =
      new THREE.Mesh(
        issGlowGeometry,
        issGlowMaterial
      );

    issGroup.add(
      issGlow
    );


    /*
    ======================================================
    ISS UPDATE
    ======================================================
    */

    const updateISS =
      async () => {

        try {

          const response =
            await axios.get(
              ISS_API,
              {
                timeout:
                  10000,
              }
            );

          if (
            disposed
          ) {
            return;
          }

          const {
            lat,
            lon,
            alt,
          } =
            response.data;

          const position =
            convertCoordsToVector(
              lat,
              lon,
              alt
            );

          iss.position.copy(
            position
          );

          issGlow.position.copy(
            position
          );

          setTelemetry(
            (previous) => ({

              ...previous,

              iss: {
                lat,
                lon,
                alt,
              },

            })
          );

        } catch (
          error
        ) {

          console.error(
            "ISS telemetry error:",
            error.message
          );
        }
      };


    /*
    ======================================================
    COLLISION DATA
    ======================================================
    */

    const updateCollisions =
      async () => {

        try {

          const response =
            await axios.get(
              COLLISION_API,
              {
                timeout:
                  15000,
              }
            );

          if (disposed) {
            return;
          }

          const data =
            response.data;

          const results =
            Array.isArray(
              data?.results
            )
              ? data.results
              : [];

          if (
            results.length === 0
          ) {

            setTelemetry(
              previous => ({
                ...previous,
                collision: null,
              })
            );

            clearCollisionVisualization();

            return;
          }

          const collision =
            results[0];

          showCollisionVisualization(
            collision,
            debrisData
          );

          setTelemetry(
            previous => ({
              ...previous,
              collision,
            })
          );

        } catch (
          error
        ) {

          console.error(
            "Collision API error:",
            error.message
          );
        }
      };


    /*
    ======================================================
    CAMERA VIEWS
    ======================================================
    */

    const setCameraView =
      (mode) => {

        setViewMode(mode);

        viewModeRef.current =
          mode;

        if (mode === "EARTH") {

          camera.position.set(
            0,
            35,
            245
          );
        }

        if (mode === "TRACKING") {

          camera.position.set(
            0,
            160,
            430
          );
        }

        if (mode === "WIDE") {

          camera.position.set(
            0,
            300,
            720
          );
        }

        controls.target.set(
          0,
          0,
          0
        );

        controls.update();
      };


    /*
    ======================================================
    RESET CAMERA
    ======================================================
    */

    const resetCamera =
      () => {

        camera.position.set(
          0,
          160,
          430
        );

        controls.target.set(
          0,
          0,
          0
        );

        setViewMode(
          "TRACKING"
        );

        viewModeRef.current =
          "TRACKING";

        controls.update();
      };


    /*
    ======================================================
    EXPOSE CAMERA FUNCTIONS
    ======================================================
    */

    mount.__setCameraView =
      setCameraView;

    mount.__resetCamera =
      resetCamera;

    mount.__trackCollision =
      trackCollisionEvent;


    /*
    ======================================================
    EXPOSE CAMERA RESTORE
    ======================================================
    */

    mount.__restorePreviousCamera =
      restorePreviousCameraState;


    /*
    ======================================================
    CLEAR SELECTION
    ======================================================
    */

    const clearSelection =
      () => {

        selectedMarker.visible =
          false;

        clearSelectedOrbit();

        const next = {

          ...telemetryRef.current,

          selected:
            null,
        };

        telemetryRef.current =
          next;

        setTelemetry(
          (previous) => ({
            ...previous,

            selected:
              null,
          })
        );
      };


    mount.__clearSelection =
      clearSelection;


    /*
    ======================================================
    RAYCASTING
    ======================================================
    */

    const raycaster =
      new THREE.Raycaster();

    const pointer =
      new THREE.Vector2();


    const handlePointerClick =
      (event) => {

        if (
          !debrisMesh
        ) {
          return;
        }

        const rect =
          renderer.domElement.getBoundingClientRect();

        pointer.x =
          (
            (
              event.clientX -
              rect.left
            ) /
            rect.width
          ) *
            2 -
          1;

        pointer.y =
          -(
            (
              event.clientY -
              rect.top
            ) /
            rect.height
          ) *
            2 +
          1;

        raycaster.setFromCamera(
          pointer,
          camera
        );

        const intersections =
          raycaster.intersectObject(
            debrisMesh
          );

        if (
          !intersections.length
        ) {

          clearSelection();

          return;
        }

        const hit =
          intersections[0];

        const instanceId =
          hit.instanceId;

        if (
          instanceId ===
            undefined ||
          !debrisData[
            instanceId
          ]
        ) {
          return;
        }

        const object =
          debrisData[
            instanceId
          ];

        const position =
          convertCoordsToVector(
            object.lat,
            object.lon,
            object.alt
          );

        selectedMarker.position.copy(
          position
        );

        selectedMarker.visible =
          true;

        createSelectedOrbit(
          position
        );

        const selectedObject =
          {
            ...object,

            index:
              instanceId,
          };

        const next = {

          ...telemetryRef.current,

          selected:
            selectedObject,
        };

        telemetryRef.current =
          next;

        setTelemetry(
          (previous) => ({

            ...previous,

            selected:
              selectedObject,

          })
        );
      };


    renderer.domElement.addEventListener(
      "click",
      handlePointerClick
    );


    /*
    ======================================================
    INITIAL DATA LOAD
    ======================================================
    */

    updateDebris();

    updateCacheStatus();

    updateISS();

    updateCollisions();


    /*
    ======================================================
    POSITION UPDATE
    ======================================================
    */

    const positionInterval =
      setInterval(
        updateDebris,
        POSITION_UPDATE_INTERVAL
      );


    const collisionInterval =
      setInterval(
        updateCollisions,
        POSITION_UPDATE_INTERVAL
      );


    /*
    ======================================================
    CACHE STATUS UPDATE
    ======================================================
    */

    const statusInterval =
      setInterval(
        updateCacheStatus,
        POSITION_UPDATE_INTERVAL
      );


    /*
    ======================================================
    ISS UPDATE
    ======================================================
    */

    const issInterval =
      setInterval(
        updateISS,
        POSITION_UPDATE_INTERVAL
      );


    /*
    ======================================================
    EARTH ROTATION
    ======================================================
    */

    const earthRotationStart =
      Date.now();

    const earthStartAngle =
      earth.rotation.y;


    const updateEarthRotation =
      () => {

        const elapsed =
          Date.now() -
          earthRotationStart;

        const simulatedElapsed =
          elapsed *
          timeScaleRef.current;

        const rotation =
          (
            simulatedElapsed /
            SIDEREAL_DAY_MS
          ) *
          Math.PI *
          2;

        earth.rotation.y =
          earthStartAngle +
          rotation;

        clouds.rotation.y =
          earth.rotation.y;
      };


    /*
    ======================================================
    ANIMATION LOOP
    ======================================================
    */

    let animationFrame;

    const animate =
      () => {

        if (
          disposed
        ) {
          return;
        }

        animationFrame =
          requestAnimationFrame(
            animate
          );

        updateEarthRotation();

        stars.rotation.y =
          0;

        orbitGroup.rotation.y +=
          0.00008;


        /*
         * Selected marker pulse
         */

        if (
          selectedMarker.visible
        ) {

          selectedMarker.rotation.z +=
            0.012;

          const pulse =
            1 +
            Math.sin(
              performance.now() *
                0.005
            ) *
              0.12;

          selectedMarker.scale.set(
            pulse,
            pulse,
            pulse
          );
        }


        /*
         * ISS glow
         */

        issGlow.scale.setScalar(
          1 +
            Math.sin(
              performance.now() *
                0.004
            ) *
              0.12
        );


        controls.update();

        renderer.render(
          scene,
          camera
        );
      };


    animate();


    /*
    ======================================================
    WINDOW RESIZE
    ======================================================
    */

    const handleResize =
      () => {

        const newWidth =
          mount.clientWidth ||
          window.innerWidth;

        const newHeight =
          mount.clientHeight ||
          window.innerHeight;

        camera.aspect =
          newWidth /
          newHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
          newWidth,
          newHeight
        );
      };


    window.addEventListener(
      "resize",
      handleResize
    );


    /*
    ======================================================
    CLEANUP
    ======================================================
    */

    return () => {

      disposed =
        true;

      cancelAnimationFrame(
        animationFrame
      );

      clearInterval(
        positionInterval
      );

      clearInterval(
        statusInterval
      );

      clearInterval(
        issInterval
      );

      clearInterval(
        collisionInterval
      );

      window.removeEventListener(
        "resize",
        handleResize
      );

      renderer.domElement.removeEventListener(
        "click",
        handlePointerClick
      );

      controls.dispose();

      clearCollisionVisualization();

      clearSelectedOrbit();

      clearTrackedCollision();


      /*
       * Dispose Three.js resources.
       */

      earthGeometry.dispose();
      earthMaterial.dispose();

      cloudGeometry.dispose();
      cloudMaterial.dispose();

      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();

      starGeometry.dispose();
      starMaterial.dispose();

      debrisGeometry.dispose();
      debrisMaterial.dispose();

      selectedRingGeometry.dispose();
      selectedRingMaterial.dispose();

      selectedCoreGeometry.dispose();
      selectedCoreMaterial.dispose();

      issGeometry.dispose();
      issMaterial.dispose();

      issGlowGeometry.dispose();
      issGlowMaterial.dispose();

      renderer.dispose();


      mount.__setCameraView =
        null;

      mount.__resetCamera =
        null;

      mount.__clearSelection =
        null;

      mount.__trackCollision =
        null;

      mount.__restorePreviousCamera =
        null;


      if (
        renderer
          .domElement
          .parentNode ===
        mount
      ) {

        mount.removeChild(
          renderer.domElement
        );
      }

    };

  }, []);


  /*
  ==========================================================
  TRACK COLLISION EVENT
  ==========================================================
  */

  useEffect(() => {

    if (!trackedEvent) {
      return;
    }

    const track =
      mountRef.current?.__trackCollision;

    if (!track) {
      return;
    }

    track(
      trackedEvent
    );

  }, [trackedEvent]);


  /*
  ==========================================================
  RESTORE CAMERA WHEN TRACK EVENT ENDS
  ==========================================================
  */

  useEffect(() => {

    if (trackedEvent) {
      return;
    }

    const restore =
      mountRef.current?.__restorePreviousCamera;

    if (!restore) {
      return;
    }

    restore();

  }, [trackedEvent]);


  /*
  ==========================================================
  TIME SCALE LABEL
  ==========================================================
  */

  const getTimeScaleLabel =
    () => {

      if (
        timeScale === 1
      ) {
        return "REAL-TIME";
      }

      if (
        timeScale === 60
      ) {
        return "1 MINUTE / SECOND";
      }

      if (
        timeScale === 600
      ) {
        return "10 MINUTES / SECOND";
      }

      if (
        timeScale === 3600
      ) {
        return "1 HOUR / SECOND";
      }

      return `${timeScale}×`;
    };


  /*
  ==========================================================
  CACHE TIME
  ==========================================================
  */

  const formatCacheTime =
    () => {

      if (
        !telemetry.cacheUpdatedAt
      ) {
        return "--:--:--";
      }

      const date =
        new Date(
          telemetry.cacheUpdatedAt
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "--:--:--";
      }

      return date.toLocaleTimeString(
        [],
        {
          hour12:
            false,
        }
      );
    };


  /*
  ==========================================================
  POSITION TIME
  ==========================================================
  */

  const formatPositionTime =
    () => {

      if (
        !telemetry.lastPositionUpdate
      ) {
        return "--:--:--";
      }

      return telemetry.lastPositionUpdate.toLocaleTimeString(
        [],
        {
          hour12:
            false,
        }
      );
    };


  /*
  ==========================================================
  RENDER
  ==========================================================
  */

  return (

    <div className="earth-tracker">


      {/* =================================================
          THREE.JS CANVAS
      ================================================= */}

      <div
        ref={mountRef}
        className="earth-canvas"
      />


      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="tracker-topbar">

        <div className="tracker-brand">

          <button
            className="tracker-back"
            onClick={() => {

              if (
                onBack
              ) {

                onBack();

              }

            }}
          >
            ←
          </button>


          <div>

            <strong>
              ORBITAL
            </strong>

            <span>
              DEBRIS TRACKER
            </span>

          </div>

        </div>


        <div className="tracker-title">

          <span>
            EARTH ORBITAL MONITORING
          </span>

          <strong>
            LIVE TRACKING ENVIRONMENT
          </strong>

        </div>


        <div className="tracker-connection">

          <span
            className={
              telemetry.connected
                ? "connection-dot online"
                : "connection-dot"
            }
          />


          <div>

            <strong>

              {telemetry.connected
                ? "ORBITAL FEED ONLINE"
                : "ORBITAL FEED OFFLINE"}

            </strong>


            <small>

              POSITION{" "}
              {formatPositionTime()}

            </small>

          </div>

        </div>

      </header>


      {/* =================================================
          LEFT TELEMETRY
      ================================================= */}

      <aside className="tracker-left-panel">

        <div className="hud-panel">

          <div className="hud-panel-title">

            <span>
              LIVE TELEMETRY
            </span>

            <small>
              01
            </small>

          </div>


          <div className="hud-stat">

            <span>
              TRACKED OBJECTS
            </span>

            <strong>
              {telemetry.debrisCount.toLocaleString()}
            </strong>

          </div>


          <div className="hud-stat">

            <span>
              DATA MODE
            </span>

            <strong className="green">

              {telemetry.cached
                ? "CACHE + LIVE"
                : "WAITING"}

            </strong>

          </div>


          <div className="hud-stat">

            <span>
              ORBITAL SOURCE
            </span>

            <strong>
              LOCAL CACHE
            </strong>

          </div>


          <div className="hud-stat">

            <span>
              CACHE UPDATED
            </span>

            <strong>
              {formatCacheTime()}
            </strong>

          </div>


          <div className="hud-stat">

            <span>
              PROPAGATION
            </span>

            <strong className="green">
              SGP4
            </strong>

          </div>


          <div className="hud-stat">

            <span>
              EXTERNAL REFRESH
            </span>

            <strong>
              2 HOURS
            </strong>

          </div>

        </div>


        {/* =================================================
            LEGEND
        ================================================= */}

        <div className="hud-panel legend-panel">

          <div className="hud-panel-title">

            <span>
              OBJECT LEGEND
            </span>

            <small>
              02
            </small>

          </div>


          <div className="legend-row">

            <span className="legend-dot debris-dot" />

            <span>
              SPACE DEBRIS
            </span>

          </div>


          <div className="legend-row">

            <span className="legend-dot iss-dot" />

            <span>
              INTERNATIONAL SPACE STATION
            </span>

          </div>


          <div className="legend-row">

            <span className="legend-line" />

            <span>
              REFERENCE ORBIT
            </span>

          </div>

        </div>

      </aside>


      {/* =================================================
          MISSION CONTROL
      ================================================= */}

      <aside className="tracker-right-panel">

        <div className="hud-panel mission-control-panel">


          {/* HEADER */}

          <div className="hud-panel-title">

            <span>
              MISSION CONTROL
            </span>

            <small>
              03
            </small>

          </div>


          {/* =================================================
              TIME SCALE
          ================================================= */}

          <section className="mission-section">

            <div className="mission-section-label">
              TIME SCALE
            </div>


            <div className="time-scale-grid">

              <button
                type="button"
                className={
                  timeScale === 1
                    ? "view-button active"
                    : "view-button"
                }
                onClick={() =>
                  changeTimeScale(
                    1
                  )
                }
              >

                <span>
                  1×
                </span>

                <small>
                  REAL TIME
                </small>

              </button>


              <button
                type="button"
                className={
                  timeScale === 60
                    ? "view-button active"
                    : "view-button"
                }
                onClick={() =>
                  changeTimeScale(
                    60
                  )
                }
              >

                <span>
                  60×
                </span>

                <small>
                  1 MIN / SEC
                </small>

              </button>


              <button
                type="button"
                className={
                  timeScale === 600
                    ? "view-button active"
                    : "view-button"
                }
                onClick={() =>
                  changeTimeScale(
                    600
                  )
                }
              >

                <span>
                  600×
                </span>

                <small>
                  10 MIN / SEC
                </small>

              </button>


              <button
                type="button"
                className={
                  timeScale === 3600
                    ? "view-button active"
                    : "view-button"
                }
                onClick={() =>
                  changeTimeScale(
                    3600
                  )
                }
              >

                <span>
                  3600×
                </span>

                <small>
                  1 HOUR / SEC
                </small>

              </button>

            </div>


            <div className="time-scale-current">

              {getTimeScaleLabel()}

            </div>

          </section>


          {/* =================================================
              CAMERA CONTROL
          ================================================= */}

          <section className="mission-section">

            <div className="mission-section-label">
              CAMERA CONTROL
            </div>


            <div className="camera-grid">

              <button
                type="button"
                className={
                  viewMode === "EARTH"
                    ? "camera-button active"
                    : "camera-button"
                }
                onClick={() =>
                  mountRef.current?.__setCameraView?.(
                    "EARTH"
                  )
                }
              >

                <strong>
                  EARTH
                </strong>

                <small>
                  PLANET VIEW
                </small>

              </button>


              <button
                type="button"
                className={
                  viewMode === "TRACKING"
                    ? "camera-button active"
                    : "camera-button"
                }
                onClick={() =>
                  mountRef.current?.__setCameraView?.(
                    "TRACKING"
                  )
                }
              >

                <strong>
                  TRACKING
                </strong>

                <small>
                  ORBITAL VIEW
                </small>

              </button>


              <button
                type="button"
                className={
                  viewMode === "WIDE"
                    ? "camera-button active"
                    : "camera-button"
                }
                onClick={() =>
                  mountRef.current?.__setCameraView?.(
                    "WIDE"
                  )
                }
              >

                <strong>
                  WIDE ORBIT
                </strong>

                <small>
                  FULL SYSTEM
                </small>

              </button>


              <button
                type="button"
                className="camera-button reset"
                onClick={() =>
                  mountRef.current?.__resetCamera?.()
                }
              >

                <strong>
                  RESET
                </strong>

                <small>
                  DEFAULT CAMERA
                </small>

              </button>

            </div>

          </section>


          {/* =================================================
              MANUAL CAMERA
          ================================================= */}

          <section className="mission-section">

            <div className="mission-section-label">
              MANUAL CAMERA
            </div>


            <div className="camera-help">

              <div>

                <span>
                  ROTATE
                </span>

                <strong>
                  LEFT DRAG
                </strong>

              </div>


              <div>

                <span>
                  PAN
                </span>

                <strong>
                  RIGHT DRAG
                </strong>

              </div>


              <div>

                <span>
                  ZOOM
                </span>

                <strong>
                  SCROLL
                </strong>

              </div>


              <div>

                <span>
                  SELECT
                </span>

                <strong>
                  CLICK OBJECT
                </strong>

              </div>

            </div>

          </section>


          {/* =================================================
              SYSTEM STATUS
          ================================================= */}

          <section className="mission-section">

            <div className="mission-section-label">
              SYSTEM STATUS
            </div>


            <div className="mission-status-row">

              <span>
                ORBITAL FEED
              </span>

              <strong
                className={
                  telemetry.connected
                    ? "green"
                    : "red"
                }
              >

                {telemetry.connected
                  ? "ONLINE"
                  : "OFFLINE"}

              </strong>

            </div>


            <div className="mission-status-row">

              <span>
                CACHE
              </span>

              <strong
                className={
                  telemetry.cached
                    ? "green"
                    : "red"
                }
              >

                {telemetry.cached
                  ? "READY"
                  : "EMPTY"}

              </strong>

            </div>


            <div className="mission-status-row">

              <span>
                UPSTREAM REFRESH
              </span>

              <strong>

                {telemetry.refreshing
                  ? "REFRESHING"
                  : "2 HOURS"}

              </strong>

            </div>


            <div className="mission-status-row">

              <span>
                PROPAGATION
              </span>

              <strong className="green">
                SGP4
              </strong>

            </div>


            <div className="mission-status-row">

              <span>
                OBJECTS
              </span>

              <strong>
                {telemetry.debrisCount.toLocaleString()}
              </strong>

            </div>

          </section>

        </div>

      </aside>


      {/* =================================================
          SELECTED OBJECT
      ================================================= */}

      {telemetry.selected && (

        <div className="selected-object-panel">

          <div className="selected-header">

            <div>

              <span>
                SELECTED OBJECT
              </span>

              <strong>
                {
                  telemetry.selected.name ||
                  `OBJECT-${telemetry.selected.index + 1}`
                }
              </strong>

            </div>


            <button
              onClick={() =>
                mountRef.current?.__clearSelection?.()
              }
            >
              ×
            </button>

          </div>


          <div className="selected-grid">

            <div>

              <span>
                LATITUDE
              </span>

              <strong>
                {Number(
                  telemetry.selected.lat
                ).toFixed(2)}
                °
              </strong>

            </div>


            <div>

              <span>
                LONGITUDE
              </span>

              <strong>
                {Number(
                  telemetry.selected.lon
                ).toFixed(2)}
                °
              </strong>

            </div>


            <div>

              <span>
                ALTITUDE
              </span>

              <strong>
                {Number(
                  telemetry.selected.alt
                ).toFixed(2)}
                km
              </strong>

            </div>


            <div>

              <span>
                VELOCITY
              </span>

              <strong>

                {telemetry.selected.velocity
                  ? `${Number(
                      telemetry.selected.velocity
                    ).toFixed(2)} km/s`
                  : "—"}

              </strong>

            </div>

          </div>


          <div className="selected-note">

            Position calculated from the
            local orbital cache using
            satellite.js / SGP4.

          </div>

        </div>

      )}


      {/* =================================================
          ISS POSITION
      ================================================= */}

      {telemetry.iss && (

        <div className="iss-panel">

          <div className="iss-panel-title">

            <span className="iss-live-dot" />

            ISS LIVE POSITION

          </div>


          <div className="iss-data">

            <span>
              LAT{" "}
              {Number(
                telemetry.iss.lat
              ).toFixed(2)}
              °
            </span>

            <span>
              LON{" "}
              {Number(
                telemetry.iss.lon
              ).toFixed(2)}
              °
            </span>

            <span>
              ALT{" "}
              {Number(
                telemetry.iss.alt
              ).toFixed(2)}
              km
            </span>

          </div>

        </div>

      )}


      {/* =================================================
          BOTTOM STATUS
      ================================================= */}

      <div className="tracker-bottom">

        <div>

          <span>
            TIME SCALE
          </span>

          <strong>
            {timeScale}×
          </strong>

        </div>


        <div>

          <span>
            VIEW
          </span>

          <strong>
            {viewMode}
          </strong>

        </div>


        <div>

          <span>
            DATA SOURCE
          </span>

          <strong>
            LOCAL CACHE
          </strong>

        </div>


        <div>

          <span>
            CACHE
          </span>

          <strong>
            {formatCacheTime()}
          </strong>

        </div>


        <div>

          <span>
            OBJECTS
          </span>

          <strong>
            {telemetry.debrisCount.toLocaleString()}
          </strong>

        </div>


        <div>

          <span>
            STATUS
          </span>

          <strong
            className={
              telemetry.connected
                ? "green"
                : "red"
            }
          >

            {telemetry.connected
              ? "OPERATIONAL"
              : "OFFLINE"}

          </strong>

        </div>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {telemetry.error && (

        <div className="tracker-error">

          <span>
            !
          </span>

          {telemetry.error}

        </div>

      )}

    </div>
  );
};


export default EarthScene;