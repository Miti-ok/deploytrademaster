import { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import * as THREE from "three";

// ── Centroid from GeoJSON polygon ─────────────────────────────────────────────
const centroidCache = {};

function computeCentroid(feature) {
  const geom = feature.geometry;
  if (!geom) return [0, 0];
  let coords = [];
  if (geom.type === "Polygon") {
    coords = geom.coordinates[0];
  } else if (geom.type === "MultiPolygon") {
    coords = geom.coordinates.reduce((a, b) =>
      a[0].length > b[0].length ? a : b
    )[0];
  }
  if (!coords.length) return [0, 0];
  const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lat  = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return [lng, lat];
}

function getCentroid(name, features) {
  if (centroidCache[name]) return centroidCache[name];
  if (!features) return [0, 0];
  let f = features.find(f =>
    (f.properties.ADMIN || f.properties.NAME || "").toLowerCase() === name.toLowerCase()
  );
  if (!f) f = features.find(f => {
    const n = (f.properties.ADMIN || f.properties.NAME || "").toLowerCase();
    return n.includes(name.toLowerCase()) || name.toLowerCase().includes(n);
  });
  if (!f) return [0, 0];
  const r = computeCentroid(f);
  centroidCache[name] = r;
  return r;
}

// ── Math ──────────────────────────────────────────────────────────────────────
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const GR  = 100;

function toXYZ(lat, lng, alt = 0) {
  const r = GR * (1 + alt), p = lat * D2R, l = lng * D2R;
  return new THREE.Vector3(
    r * Math.cos(p) * Math.sin(l),
    r * Math.sin(p),
    r * Math.cos(p) * Math.cos(l)
  );
}

function slerp(a, b, t) {
  const [lo1,la1]=a, [lo2,la2]=b;
  const p1=la1*D2R,l1=lo1*D2R,p2=la2*D2R,l2=lo2*D2R;
  const ax=Math.cos(p1)*Math.cos(l1),ay=Math.cos(p1)*Math.sin(l1),az=Math.sin(p1);
  const bx=Math.cos(p2)*Math.cos(l2),by=Math.cos(p2)*Math.sin(l2),bz=Math.sin(p2);
  const dot=Math.min(1,ax*bx+ay*by+az*bz), O=Math.acos(dot);
  if (Math.abs(O)<1e-7) return a;
  const s=Math.sin(O),fa=Math.sin((1-t)*O)/s,fb=Math.sin(t*O)/s;
  return [Math.atan2(fa*ay+fb*by,fa*ax+fb*bx)*R2D, Math.asin(fa*az+fb*bz)*R2D];
}

function arcAlt(t, peak=0.32) { return Math.sin(t*Math.PI)*peak; }
function eio(t) { return t<0.5?2*t*t:-1+(4-2*t)*t; }

function makeArrowGeo() {
  const sh = new THREE.Shape();
  sh.moveTo(0,1); sh.lineTo(-0.55,-0.6); sh.lineTo(0,-0.2); sh.lineTo(0.55,-0.6);
  sh.closePath();
  return new THREE.ShapeGeometry(sh);
}

function normalizeTradeRoute(raw) {
  if (!Array.isArray(raw) || raw.length < 2) return [];

  const normalized = raw
    .filter((entry) => entry && entry.country)
    .map((entry) => ({
      ...entry,
      country: String(entry.country).trim(),
      role: String(entry.role || "").toLowerCase(),
    }));

  if (normalized.length < 2) return [];

  const exporter = normalized.find((entry) => entry.role === "exporter") || normalized[0];
  const importer =
    normalized.find((entry) => entry.role === "importer") || normalized[normalized.length - 1];

  if (!exporter?.country || !importer?.country) return [];

  return [
    {
      ...exporter,
      role: "exporter",
      material: exporter.material || "Export shipment",
      hs_code: exporter.hs_code || "0000.00",
    },
    {
      ...importer,
      role: "importer",
      material: importer.material || exporter.material || "Import shipment",
      hs_code: importer.hs_code || exporter.hs_code || "0000.00",
    },
  ];
}

// ── Detail Panel Component ─────────────────────────────────────────────────────
function DetailPanel({ entry, onClose }) {
  if (!entry) return null;
  const isExporter = entry.role === "exporter";
  const accent = isExporter ? "#00ff78" : "#00aaff";
  const accentBg = isExporter ? "rgba(0,255,120,0.07)" : "rgba(0,160,255,0.07)";
  const accentBorder = isExporter ? "rgba(0,255,120,0.35)" : "rgba(0,160,255,0.35)";
  const accentGlow = isExporter ? "rgba(0,255,120,0.15)" : "rgba(0,160,255,0.15)";

  const reserved = ["country", "role", "hs_code", "material"];
  const extra = Object.entries(entry).filter(([k]) => !reserved.includes(k));

  return (
    <div style={{
      position: "absolute",
      top: "50%",
      right: 32,
      transform: "translateY(-50%)",
      width: 300,
      background: "rgba(0,2,14,0.92)",
      border: `1px solid ${accentBorder}`,
      borderRadius: 16,
      padding: "24px 26px",
      fontFamily: "'Courier New', monospace",
      backdropFilter: "blur(20px)",
      boxShadow: `0 0 40px ${accentGlow}, 0 0 80px rgba(0,0,0,0.6)`,
      animation: "slideIn 0.3s cubic-bezier(0.16,1,0.3,1)",
      zIndex: 1000,
    }}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 14, right: 16,
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.3)", fontSize: 18, lineHeight: 1,
          transition: "color 0.2s",
          padding: "2px 6px",
        }}
        onMouseEnter={e => e.target.style.color = "#fff"}
        onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.3)"}
      >✕</button>

      {/* Role badge */}
      <div style={{
        display: "inline-block",
        background: accentBg,
        border: `1px solid ${accentBorder}`,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 9,
        letterSpacing: "0.2em",
        color: accent,
        marginBottom: 10,
        textTransform: "uppercase",
      }}>{entry.role}</div>

      {/* Country name */}
      <div style={{
        color: "#fff",
        fontSize: 22,
        fontWeight: "bold",
        letterSpacing: "0.04em",
        marginBottom: 4,
        lineHeight: 1.2,
      }}>{entry.country}</div>

      {/* Material */}
      <div style={{
        color: accent,
        fontSize: 13,
        marginBottom: 20,
        opacity: 0.85,
      }}>{entry.material}</div>

      {/* Divider */}
      <div style={{
        height: 1,
        background: `linear-gradient(90deg, ${accentBorder}, transparent)`,
        marginBottom: 18,
      }}/>

      {/* HS Code */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      }}>
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
          HS Code
        </span>
        <span style={{
          color: "#fff",
          fontSize: 13,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 4,
          padding: "2px 8px",
          letterSpacing: "0.08em",
        }}>{entry.hs_code}</span>
      </div>

      {/* Extra fields */}
      {extra.map(([k, v]) => (
        <div key={k} style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
          gap: 12,
        }}>
          <span style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            paddingTop: 2,
            flexShrink: 0,
          }}>{k.replace(/_/g, " ")}</span>
          <span style={{
            color: "rgba(220,235,255,0.85)",
            fontSize: 12,
            textAlign: "right",
            lineHeight: 1.4,
          }}>{v}</span>
        </div>
      ))}

      {/* Bottom accent line */}
      <div style={{
        marginTop: 18,
        height: 2,
        borderRadius: 1,
        background: `linear-gradient(90deg, ${accent}, transparent)`,
        opacity: 0.4,
      }}/>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function GlobeComponent({ routeData = null }) {
  const mountRef = useRef(null);
  const globeRef = useRef(null);
  const geoRef   = useRef(null);
  const seqRef   = useRef({ stop:false, raf:null, tid:null });
  const spheresRef = useRef([]);

  const [tradeData,    setTradeData]    = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [phase,        setPhase]        = useState("loading");
  const [status,       setStatus]       = useState("Loading…");
  const [geoReady,     setGeoReady]     = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  // ── resetKey increments on each reset to re-trigger fetch + sequence ──────
  const [resetKey,     setResetKey]     = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Load / re-load test.json ───────────────────────────────────────────────
  useEffect(() => {
    setTradeData([]);
    setCurrentIndex(-1);
    setPhase("loading");
    setStatus("Loading…");
    setSelectedEntry(null);

    const fromRouteData = normalizeTradeRoute(routeData);
    if (fromRouteData.length >= 2) {
      setTradeData(fromRouteData);
      setIsRefreshing(false);
      return;
    }

    // cache-bust so browser always fetches fresh copy
    fetch(`/test.json?_=${Date.now()}`)
      .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(raw => {
        const fallbackRoute = normalizeTradeRoute(raw);
        setTradeData(fallbackRoute);
        setIsRefreshing(false);
      })
      .catch(e => {
        setStatus(`Error loading test.json: ${e.message}`);
        setIsRefreshing(false);
      });
  }, [resetKey, routeData]);

  // ── Init Globe ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;

    const world = Globe()(mountRef.current)
      .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundColor("rgba(0,0,0,0)")
      .atmosphereColor("#1060ee")
      .atmosphereAltitude(0.18)
      .polygonsData([])
      .polygonAltitude(0.006)
      .polygonCapColor(d => d.__cap || "rgba(255,255,255,0.03)")
      .polygonSideColor(() => "rgba(60,130,255,0.04)")
      .polygonStrokeColor(() => "#1a3d88")
      .labelsData([]);

    world.renderer().setClearColor(0x000005, 1);
    world.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const sc = world.scene();
    sc.add(new THREE.AmbientLight(0xffffff, 2.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(200, 100, 200); sc.add(sun);
    const fill = new THREE.DirectionalLight(0x4488ff, 0.5);
    fill.position.set(-200, -50, -200); sc.add(fill);

    const gc = document.createElement("canvas");
    gc.width = gc.height = 256;
    const gx = gc.getContext("2d");
    const gr = gx.createRadialGradient(128,128,48,128,128,128);
    gr.addColorStop(0,"rgba(20,100,255,0.20)");
    gr.addColorStop(0.5,"rgba(10,55,200,0.07)");
    gr.addColorStop(1,"rgba(0,0,0,0)");
    gx.fillStyle=gr; gx.fillRect(0,0,256,256);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map:new THREE.CanvasTexture(gc),
      blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,
    }));
    halo.scale.set(380,380,1); sc.add(halo);

    const ctrl = world.controls();
    ctrl.autoRotate=false; ctrl.enableDamping=true;
    ctrl.dampingFactor=0.08; ctrl.enableZoom=true; ctrl.enabled=true;

    world.pointOfView({lat:20,lng:10,altitude:3.1});
    globeRef.current = world;

    fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson")
      .then(r=>r.json())
      .then(geo=>{
        geoRef.current = geo.features;
        world.polygonsData(geo.features);
        setGeoReady(true);
        setStatus("Ready");
      });

    return () => { if (mountRef.current) mountRef.current.innerHTML=""; };
  }, []);

  // ── Gate ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (geoReady && tradeData.length>=2 && phase==="loading") {
      // Clear leftover labels + polygon highlights from prior run
      if (globeRef.current) {
        globeRef.current.labelsData([]);
        if (geoRef.current) {
          geoRef.current.forEach(f => { f.__cap = "rgba(255,255,255,0.03)"; });
          globeRef.current.polygonsData([...geoRef.current]);
        }
      }
      setPhase("ready");
    }
  }, [geoReady, tradeData, phase, resetKey]);

  // ── Spawn nodes (free roam) ────────────────────────────────────────────────
  useEffect(() => {
    if (phase!=="done" || !geoRef.current || !globeRef.current) return;

    const world    = globeRef.current;
    const features = geoRef.current;
    const scene    = world.scene();
    const camera   = world.camera();
    const canvas   = world.renderer().domElement;

    const SPHERE_R    = 2.5;
    const CENTRE_DIST = GR - SPHERE_R * 0.5;
    const FLOWER_SEGMENTS = 80;
    const FLOWER_PEAK     = 0.28;

    // ── Build sphere meshes ───────────────────────────────────────────────
    const meshes = tradeData.map(entry => {
      const [lng, lat] = getCentroid(entry.country, features);
      const col = entry.role==="exporter" ? 0x00ff78 : 0x00aaff;

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(SPHERE_R, 20, 20),
        new THREE.MeshPhongMaterial({
          color: col, emissive: col, emissiveIntensity: 0.45, shininess: 80,
        })
      );
      mesh.frustumCulled = false;
      const p=lat*D2R, l=lng*D2R;
      mesh.position.set(
        CENTRE_DIST * Math.cos(p) * Math.sin(l),
        CENTRE_DIST * Math.sin(p),
        CENTRE_DIST * Math.cos(p) * Math.cos(l)
      );
      scene.add(mesh);
      return { mesh, entry, lng, lat };
    });

    spheresRef.current = meshes;

    // ── Flower lines state ────────────────────────────────────────────────
    // flowerLines: array of { line, phaseSeed, importerEntry }
    let flowerLines   = [];
    let flowerRaf     = null;
    let activeExporter = null; // entry currently blooming

    function buildFlowerArcPoints(fromLL, toLL) {
      const pts = [];
      for (let i = 0; i <= FLOWER_SEGMENTS; i++) {
        const t = i / FLOWER_SEGMENTS;
        const [lng, lat] = slerp(fromLL, toLL, t);
        pts.push(toXYZ(lat, lng, arcAlt(t, FLOWER_PEAK)));
      }
      return pts;
    }

    function clearFlower() {
      cancelAnimationFrame(flowerRaf);
      flowerLines.forEach(({ line }) => {
        scene.remove(line);
        line.geometry.dispose();
        line.material.dispose();
      });
      flowerLines = [];
      activeExporter = null;
      // restore all sphere appearances
      meshes.forEach(m => {
        m.mesh.scale.setScalar(1);
        m.mesh.material.emissiveIntensity = 0.45;
        m.mesh.material.opacity = 1;
        m.mesh.material.transparent = false;
      });
    }

    function spawnFlower(exporterItem) {
      clearFlower();
      activeExporter = exporterItem.entry;

      // find all importers sharing the same hs_code (coerce to string to avoid type mismatch)
      const exporterHs = String(exporterItem.entry.hs_code).trim();
      const allImporters = meshes.filter(m => m.entry.role === "importer");
      const matched = allImporters.filter(m =>
        String(m.entry.hs_code).trim() === exporterHs
      );
      // fallback: if no hs_code match, connect to ALL importers so flower is always visible
      const targets = matched.length ? matched : allImporters;

      if (!targets.length) return;

      // guard: exporter must have valid position
      const fromLL = [exporterItem.lng, exporterItem.lat];
      if (fromLL[0] === 0 && fromLL[1] === 0) return;

      // dim everything except exporter + its targets
      const relevant = new Set([exporterItem, ...targets]);
      meshes.forEach(m => {
        if (!relevant.has(m)) {
          m.mesh.material.transparent = true;
          m.mesh.material.opacity = 0.12;
          m.mesh.material.emissiveIntensity = 0.05;
        } else {
          m.mesh.material.transparent = false;
          m.mesh.material.opacity = 1;
          m.mesh.material.emissiveIntensity = m === exporterItem ? 1.4 : 0.9;
          m.mesh.scale.setScalar(m === exporterItem ? 2.0 : 1.5);
        }
      });

      // one arc per target — 3 stacked lines for a visible glow effect
      const total = targets.length || 1;
      targets.forEach((imp, idx) => {
        const toLL = [imp.lng, imp.lat];
        const pts  = buildFlowerArcPoints(fromLL, toLL);

        // makePosAttr: each call creates a fresh Float32Array (typed copy)
        // NOTE: Float32Array.slice() returns a Float32Array — this is correct
        function makePosAttr() {
          const arr = new Float32Array(pts.length * 3);
          pts.forEach((v, i) => { arr[i*3]=v.x; arr[i*3+1]=v.y; arr[i*3+2]=v.z; });
          return new THREE.BufferAttribute(arr, 3);
        }

        // core — bright, depthTest OFF so globe never occludes it
        const geo1 = new THREE.BufferGeometry();
        geo1.setAttribute("position", makePosAttr());
        const mat1 = new THREE.LineBasicMaterial({
          color: 0x00ff88, transparent: true, opacity: 1.0,
          depthTest: false, depthWrite: false,
        });

        // inner glow — additive blend
        const geo2 = new THREE.BufferGeometry();
        geo2.setAttribute("position", makePosAttr());
        const mat2 = new THREE.LineBasicMaterial({
          color: 0x00ff44, transparent: true, opacity: 0.7,
          depthTest: false, depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        // outer halo — additive, cyan tint
        const geo3 = new THREE.BufferGeometry();
        geo3.setAttribute("position", makePosAttr());
        const mat3 = new THREE.LineBasicMaterial({
          color: 0x00ffcc, transparent: true, opacity: 0.4,
          depthTest: false, depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        const line1 = new THREE.Line(geo1, mat1);
        const line2 = new THREE.Line(geo2, mat2);
        const line3 = new THREE.Line(geo3, mat3);
        [line1, line2, line3].forEach((l, li) => {
          l.frustumCulled = false;
          l.renderOrder = 999 - li;
          scene.add(l);
        });

        const seed = idx / total;
        flowerLines.push(
          { line: line1, phaseSeed: seed, layer: "core" },
          { line: line2, phaseSeed: seed, layer: "glow" },
          { line: line3, phaseSeed: seed, layer: "halo" },
        );
      });

      // ── Animate loop ──────────────────────────────────────────────────
      const startTime = performance.now();

      function animateFlower(now) {
        const elapsed = (now - startTime) / 1000;

        flowerLines.forEach(({ line, phaseSeed, layer }) => {
          // sine pulse 0→1, never goes below 0
          const wave = (Math.sin(elapsed * 2.5 + phaseSeed * Math.PI * 2) + 1) / 2;

          if (layer === "core") {
            // core is always visible, just pulses between 0.5 and 1.0
            line.material.opacity = 0.5 + 0.5 * wave;
            // interpolate color: green ↔ bright cyan using THREE's method
            line.material.color.setRGB(
              0,
              0.8 + 0.2 * wave,
              0.3 + 0.7 * wave
            );
          } else if (layer === "glow") {
            line.material.opacity = 0.3 + 0.5 * wave;
          } else {
            // halo breathes slower
            const slow = (Math.sin(elapsed * 1.4 + phaseSeed * Math.PI * 2) + 1) / 2;
            line.material.opacity = 0.15 + 0.35 * slow;
          }
          line.material.needsUpdate = true;
        });

        // pulse exporter node scale
        const p = 1.6 + 0.5 * Math.abs(Math.sin(elapsed * 3.0));
        exporterItem.mesh.scale.setScalar(p);
        exporterItem.mesh.material.emissiveIntensity = 0.9 + 0.9 * Math.abs(Math.sin(elapsed * 3.0));

        flowerRaf = requestAnimationFrame(animateFlower);
      }

      flowerRaf = requestAnimationFrame(animateFlower);
    }

    // ── Raycaster for hover + click ───────────────────────────────────────
    const ray   = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let   hoveredMesh = null;

    function getHit(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x =  ((e.clientX-rect.left)/rect.width) *2-1;
      mouse.y = -((e.clientY-rect.top) /rect.height)*2+1;
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObjects(meshes.map(m=>m.mesh), false);
      return hits.length ? meshes.find(m=>m.mesh===hits[0].object) : null;
    }

    function onMove(e) {
      const found = getHit(e);
      if (found) {
        canvas.style.cursor = "pointer";
        if (hoveredMesh !== found) {
          hoveredMesh = found;
          // only scale if not already in flower mode managing scale
          if (!activeExporter) {
            meshes.forEach(m => {
              const h = m === found;
              m.mesh.scale.setScalar(h ? 1.5 : 1.0);
              m.mesh.material.emissiveIntensity = h ? 1.0 : 0.45;
            });
          }
        }
      } else {
        canvas.style.cursor = "default";
        if (hoveredMesh) {
          hoveredMesh = null;
          if (!activeExporter) {
            meshes.forEach(m => {
              m.mesh.scale.setScalar(1);
              m.mesh.material.emissiveIntensity = 0.45;
            });
          }
        }
      }
    }

    function onClick(e) {
      const found = getHit(e);

      if (found) {
        const isExporter = found.entry.role === "exporter";

        if (isExporter) {
          // toggle: clicking same exporter twice collapses the flower
          if (activeExporter?.country === found.entry.country) {
            clearFlower();
            setSelectedEntry(null);
          } else {
            spawnFlower(found);
            setSelectedEntry(found.entry);
          }
        } else {
          // importer click: just show panel, no flower
          clearFlower();
          setSelectedEntry(prev =>
            prev?.country === found.entry.country ? null : found.entry
          );
        }
      } else {
        // click empty space → collapse everything
        clearFlower();
        setSelectedEntry(null);
      }
    }

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);

    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
      canvas.style.cursor = "default";
      cancelAnimationFrame(flowerRaf);
      flowerLines.forEach(({ line }) => {
        scene.remove(line);
        line.geometry.dispose();
        line.material.dispose();
      });
      meshes.forEach(({mesh})=>{
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      spheresRef.current=[];
    };
  }, [phase, tradeData]);

  // ── Animation sequence ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase!=="ready"||!globeRef.current||!geoRef.current) return;

    const world    = globeRef.current;
    const features = geoRef.current;
    const seq      = {stop:false,raf:null,tid:null};
    seqRef.current = seq;

    const ROLE = {
      exporter:{cap:"rgba(0,255,120,0.28)",label:"#00c45a"},
      importer:{cap:"rgba(0,160,255,0.28)",label:"#0088cc"},
    };
    const ARC_MS=2600, PAUSE_MS=4000, MAX_PTS=200;

    function lockCam() { world.controls().enabled=false; }
    function freeCam()  { world.controls().enabled=true;  }
    function setCam(lat,lng,alt) { world.pointOfView({lat,lng,altitude:alt},0); }

    function lerpCam(fromLL,toLL,a0,a1,ms) {
      return new Promise(res=>{
        const t0=performance.now();
        function tick(now){
          if(seq.stop) return res();
          const raw=Math.min((now-t0)/ms,1), t=eio(raw);
          const [lng,lat]=slerp(fromLL,toLL,t);
          setCam(lat,lng,a0+(a1-a0)*t);
          if(raw<1) seq.raf=requestAnimationFrame(tick); else res();
        }
        seq.raf=requestAnimationFrame(tick);
      });
    }

    function highlight(name,role){
      if(!geoRef.current) return;
      features.forEach(f=>{
        const n=f.properties.ADMIN||f.properties.NAME||"";
        f.__cap=n.toLowerCase()===name.toLowerCase()
          ?ROLE[role]?.cap:"rgba(255,255,255,0.03)";
      });
      world.polygonsData([...features]);
    }

    // custom sprite labels with stroke border
    const labelSprites = [];

    function addLabel(lat, lng, text, color) {
      const canvas = document.createElement("canvas");
      const ctx    = canvas.getContext("2d");
      const font   = "bold 28px 'Courier New', monospace";
      ctx.font = font;
      const tw = ctx.measureText(text).width;
      canvas.width  = Math.ceil(tw) + 32;
      canvas.height = 52;

      // re-apply font after resize (canvas reset clears it)
      ctx.font = font;
      ctx.textBaseline = "middle";

      // dark stroke / border — drawn first, underneath
      ctx.strokeStyle = "rgba(0,0,0,0.95)";
      ctx.lineWidth   = 6;
      ctx.lineJoin    = "round";
      ctx.strokeText(text, 16, 26);

      // slight outer glow in the accent color
      ctx.shadowColor   = color;
      ctx.shadowBlur    = 10;
      ctx.fillStyle     = color;
      ctx.fillText(text, 16, 26);
      ctx.shadowBlur    = 0;

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;

      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.frustumCulled = false;
      sprite.renderOrder = 900;

      // scale: keep canvas aspect, size proportional to globe radius
      const aspect = canvas.width / canvas.height;
      const h = GR * 0.055;
      sprite.scale.set(h * aspect, h, 1);

      // position: surface + small altitude offset
      const ALT = GR * 1.035;
      const p   = (lat + 3) * D2R, l = lng * D2R;
      sprite.position.set(
        ALT * Math.cos(p) * Math.sin(l),
        ALT * Math.sin(p),
        ALT * Math.cos(p) * Math.cos(l)
      );

      world.scene().add(sprite);
      labelSprites.push(sprite);
    }

    const posBuf=new Float32Array(MAX_PTS*3);
    const lineGeo=new THREE.BufferGeometry();
    lineGeo.setAttribute("position",new THREE.BufferAttribute(posBuf,3));
    lineGeo.setDrawRange(0,0);
    const liveLine=new THREE.Line(lineGeo,new THREE.LineBasicMaterial({color:0xffee00}));
    liveLine.frustumCulled=false; liveLine.visible=false;
    world.scene().add(liveLine);

    const arrowMesh=new THREE.Mesh(
      makeArrowGeo(),
      new THREE.MeshBasicMaterial({color:0xffcc00,side:THREE.DoubleSide})
    );
    arrowMesh.frustumCulled=false; arrowMesh.visible=false;
    world.scene().add(arrowMesh);

    function bake(fromLL,toLL){
      const N=80,pts=[];
      for(let i=0;i<=N;i++){
        const t=i/N,[lng,lat]=slerp(fromLL,toLL,t);
        pts.push(toXYZ(lat,lng,arcAlt(t,0.32)));
      }
      const g=new THREE.BufferGeometry().setFromPoints(pts);
      world.scene().add(new THREE.Line(g,
        new THREE.LineBasicMaterial({color:0xff8800,opacity:0.18,transparent:true})
      ));
    }

    function animateArc(fromE,toE){
      return new Promise(res=>{
        if(seq.stop) return res();
        const fromLL=getCentroid(fromE.country,features);
        const toLL=getCentroid(toE.country,features);
        const N=Math.min(MAX_PTS-1,120);

        const pts=Array.from({length:N+1},(_,i)=>{
          const t=i/N,[lng,lat]=slerp(fromLL,toLL,t),alt=arcAlt(t,0.32);
          return {lat,lng,alt,xyz:toXYZ(lat,lng,alt)};
        });

        lineGeo.setDrawRange(0,0);
        liveLine.visible=true; arrowMesh.visible=true;
        let t0=null;

        function frame(now){
          if(seq.stop) return res();
          if(!t0) t0=now;
          const raw=Math.min((now-t0)/ARC_MS,1),t=eio(raw);
          const idx=Math.min(Math.floor(t*N),N);
          const tip=pts[idx],prev=pts[Math.max(idx-1,0)];

          for(let i=0;i<=idx;i++){
            const {xyz}=pts[i];
            posBuf[i*3]=xyz.x; posBuf[i*3+1]=xyz.y; posBuf[i*3+2]=xyz.z;
          }
          lineGeo.attributes.position.needsUpdate=true;
          lineGeo.setDrawRange(0,idx+1);

          const dir=new THREE.Vector3().subVectors(tip.xyz,prev.xyz).normalize();
          const up=tip.xyz.clone().normalize();
          const right=new THREE.Vector3().crossVectors(dir,up).normalize();
          const fwd=new THREE.Vector3().crossVectors(up,right);
          arrowMesh.position.copy(tip.xyz);
          arrowMesh.setRotationFromMatrix(new THREE.Matrix4().makeBasis(right,up,fwd));
          arrowMesh.scale.setScalar(GR*0.028);

          setCam(tip.lat,tip.lng,1.5+tip.alt*2.6);
          if(raw<1) seq.raf=requestAnimationFrame(frame); else res();
        }
        seq.raf=requestAnimationFrame(frame);
      });
    }

    function wait(ms){ return new Promise(res=>{seq.tid=setTimeout(res,ms);}); }

    async function run(){
      lockCam();
      const first=tradeData[0];
      const firstLL=getCentroid(first.country,features);
      const [fLng,fLat]=firstLL;

      setCurrentIndex(0);
      setStatus(`Flying to ${first.country}…`);
      highlight(first.country,first.role);

      await lerpCam([10,20],firstLL,2.5,1.75,2200);
      if(seq.stop) return;

      addLabel(fLat,fLng,
        `[${first.role==="exporter"?"EXP":"IMP"}] ${first.country}`,
        ROLE[first.role]?.label||"#fff"
      );

      await wait(800);
      if(seq.stop) return;

      for(let i=0;i<tradeData.length-1;i++){
        if(seq.stop) return;
        const fromE=tradeData[i],toE=tradeData[i+1];
        const toLL=getCentroid(toE.country,features);
        const [toLng,toLat]=toLL;

        setStatus(`${fromE.country}  ──▶  ${toE.country}`);
        setCurrentIndex(i);

        await animateArc(fromE,toE);
        if(seq.stop) return;

        bake(getCentroid(fromE.country,features),toLL);
        liveLine.visible=false; arrowMesh.visible=false;
        lineGeo.setDrawRange(0,0);

        highlight(toE.country,toE.role);
        setCurrentIndex(i+1);
        addLabel(toLat,toLng,
          `[${toE.role==="exporter"?"EXP":"IMP"}] ${toE.country}`,
          ROLE[toE.role]?.label||"#fff"
        );

        const arrivalAlt=1.5+arcAlt(1,0.32)*2.6;
        await lerpCam(toLL,toLL,arrivalAlt,1.75,500);
        if(seq.stop) return;

        setStatus(`${toE.country} — ${toE.material}`);
        await wait(PAUSE_MS);
        if(seq.stop) return;
      }

      setPhase("done");
      setStatus("All routes mapped — click any node to explore · reset to reload");
      freeCam();
    }

    run();

    return ()=>{
      seq.stop=true;
      if(seq.raf) cancelAnimationFrame(seq.raf);
      if(seq.tid) clearTimeout(seq.tid);
      // clean up custom label sprites
      labelSprites.forEach(s => {
        world.scene().remove(s);
        s.material.map?.dispose();
        s.material.dispose();
      });
    };
  }, [phase, tradeData]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const cur = tradeData[currentIndex]??null;
  const rs  = cur?.role==="exporter"
    ?{text:"#00ff78",border:"rgba(0,255,120,0.4)",bg:"rgba(0,255,120,0.07)"}
    :{text:"#00b0ff",border:"rgba(0,160,255,0.4)",bg:"rgba(0,160,255,0.07)"};

  return (
    <div style={{width:"100vw",height:"100vh",background:"#000005",position:"relative",overflow:"hidden"}}>
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height: "100%",
          transform: "translate(-50%, 0%)"
        }}
      />

      <div style={{
        position:"absolute",top:22,left:"50%",transform:"translateX(-50%)",
        fontFamily:"'Courier New',monospace",color:"#4a9fff",fontSize:13,
        letterSpacing:"0.22em",textTransform:"uppercase",
        textShadow:"0 0 14px #4a9fff88",userSelect:"none",whiteSpace:"nowrap",
      }}>
        ⬡ &nbsp; Global Trade Flow Visualizer &nbsp; ⬡
      </div>

      {tradeData.length>1&&(
        <div style={{
          position:"absolute",top:52,left:"50%",transform:"translateX(-50%)",
          width:280,height:2,background:"rgba(255,255,255,0.07)",borderRadius:2,
        }}>
          <div style={{
            height:"100%",width:`${((currentIndex+1)/tradeData.length)*100}%`,
            background:"linear-gradient(90deg,#00ff78,#00b0ff)",
            borderRadius:2,transition:"width 0.5s ease",boxShadow:"0 0 10px #00b0ff88",
          }}/>
        </div>
      )}

      <div style={{
        position:"absolute",top:63,left:"50%",transform:"translateX(-50%)",
        fontFamily:"'Courier New',monospace",fontSize:11,
        color:"rgba(120,180,255,0.5)",letterSpacing:"0.12em",whiteSpace:"nowrap",
      }}>{status}</div>

      {cur&&phase!=="done"&&(
        <div key={currentIndex} style={{
          position:"absolute",bottom:38,left:38,
          background:rs.bg,border:`1px solid ${rs.border}`,
          borderRadius:12,padding:"16px 22px",
          fontFamily:"'Courier New',monospace",color:"#fff",
          backdropFilter:"blur(10px)",
          boxShadow:`0 0 24px ${rs.border}`,minWidth:230,
          animation:"fadeUp 0.4s ease",
        }}>
          <div style={{color:rs.text,fontSize:17,fontWeight:"bold",marginBottom:3}}>{cur.country}</div>
          <div style={{color:"#666",fontSize:10,letterSpacing:"0.18em",marginBottom:8}}>
            {cur.role.toUpperCase()} &nbsp;·&nbsp; HS {cur.hs_code}
          </div>
          <div style={{color:"#ddd",fontSize:13}}>{cur.material}</div>
        </div>
      )}

      {/* ── Click-to-open detail panel ── */}
      {selectedEntry && (
        <DetailPanel
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}

      {/* ── Free roam hint + Reset button ── */}
      {phase==="done"&&!selectedEntry&&(
        <div style={{
          position:"absolute",bottom:38,left:38,
          display:"flex",flexDirection:"column",gap:10,alignItems:"flex-start",
        }}>
          <div style={{
            fontFamily:"'Courier New',monospace",
            color:"rgba(100,170,255,0.3)",fontSize:11,
            letterSpacing:"0.1em",
          }}>
            CLICK EXPORTER → SEE TRADE LINKS
          </div>
          <button
            onClick={() => {
              setIsRefreshing(true);
              setResetKey(k => k + 1);
            }}
            disabled={isRefreshing}
            style={{
              fontFamily:"'Courier New',monospace",
              fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase",
              color: isRefreshing ? "rgba(100,170,255,0.3)" : "#4a9fff",
              background:"rgba(0,10,40,0.7)",
              border:"1px solid rgba(74,159,255,0.35)",
              borderRadius:6,padding:"7px 14px",
              cursor: isRefreshing ? "default" : "pointer",
              backdropFilter:"blur(10px)",
              boxShadow: isRefreshing ? "none" : "0 0 14px rgba(74,159,255,0.2)",
              transition:"all 0.2s",
              display:"flex",alignItems:"center",gap:7,
            }}
            onMouseEnter={e => { if(!isRefreshing){ e.currentTarget.style.borderColor="rgba(74,159,255,0.7)"; e.currentTarget.style.boxShadow="0 0 20px rgba(74,159,255,0.35)"; }}}
            onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(74,159,255,0.35)"; e.currentTarget.style.boxShadow="0 0 14px rgba(74,159,255,0.2)"; }}
          >
            <span style={{
              display:"inline-block",
              animation: isRefreshing ? "spin 0.8s linear infinite" : "none",
            }}>⟳</span>
            {isRefreshing ? "FETCHING…" : "RESET & RELOAD"}
          </button>
        </div>
      )}

      <div style={{
        position:"absolute",bottom:38,right:38,
        fontFamily:"'Courier New',monospace",
        color:"rgba(100,170,255,0.45)",fontSize:12,letterSpacing:"0.1em",textAlign:"right",
      }}>
        {phase==="done"?"✓  FREE ROAM"
          :tradeData.length>0?`STOP ${Math.min(currentIndex+1,tradeData.length)} / ${tradeData.length}`:""}
      </div>

      <div style={{
        position:"absolute",top:86,right:28,
        fontFamily:"'Courier New',monospace",fontSize:11,color:"#555",lineHeight:"22px",
      }}>
        <div><span style={{color:"#00ff78"}}>█</span> Exporter</div>
        <div><span style={{color:"#00aaff"}}>█</span> Importer</div>
        <div><span style={{color:"#ffee00"}}>——▶</span> Route</div>
        <div><span style={{color:"#00ff78"}}>∿∿</span> Trade links</div>
      </div>

      {phase==="done"&&(
        <div style={{
          position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
          fontFamily:"'Courier New',monospace",color:"rgba(0,255,120,0.8)",fontSize:14,
          letterSpacing:"0.3em",textTransform:"uppercase",textShadow:"0 0 20px #00ff78",
          pointerEvents:"none",animation:"fadeOut 1s ease 2s forwards",
        }}>Free Roam</div>
      )}

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeOut{from{opacity:1}to{opacity:0}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-50%) translateX(20px)}to{opacity:1;transform:translateY(-50%) translateX(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
