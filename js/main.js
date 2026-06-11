/* FOOTBALL 2026 — cinematic experience: Three.js stage + GSAP choreography */

import * as THREE from "three";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 860px)").matches;

gsap.registerPlugin(ScrollTrigger);

/* ---------------- Smooth scroll (Lenis) ---------------- */
let lenis = null;
if (!reducedMotion && window.Lenis) {
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* Anchor navigation works with (or without) Lenis */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -20 });
    else target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  });
});

/* ---------------- Three.js stage ---------------- */
const canvas = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05070d, 0.045);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.4, 7.5);

/* Lights — stadium floodlight mood */
scene.add(new THREE.AmbientLight(0x223044, 0.7));

const keyLight = new THREE.DirectionalLight(0xfbbf24, 2.2);
keyLight.position.set(4, 6, 3);
scene.add(keyLight);

const rimLight = new THREE.PointLight(0xdc2626, 30, 24);
rimLight.position.set(-4, 1.5, -4);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0x3b82f6, 14, 20);
fillLight.position.set(-3, -2, 4);
scene.add(fillLight);

/* The ball — faceted core + golden geodesic wireframe + halo */
const BALL_HOME = { x: isMobile ? 0 : 2.1, y: isMobile ? 1.4 : -0.1 };
const ball = new THREE.Group();
ball.position.set(BALL_HOME.x, BALL_HOME.y, 0);
scene.add(ball);

const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.45, 1),
  new THREE.MeshPhysicalMaterial({
    color: 0x0d1322,
    metalness: 0.6,
    roughness: 0.28,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
    flatShading: true,
  })
);
ball.add(core);

const wire = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.465, 1),
  new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  })
);
ball.add(wire);

const halo = new THREE.Mesh(
  new THREE.SphereGeometry(1.45, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0xdc2626,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
halo.scale.setScalar(1.45);
ball.add(halo);

/* Orbit rings */
const ringMatGold = new THREE.MeshBasicMaterial({
  color: 0xfbbf24, transparent: true, opacity: 0.4,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const ringMatRed = ringMatGold.clone();
ringMatRed.color.set(0xdc2626);

const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.012, 8, 120), ringMatGold);
ringA.rotation.set(Math.PI / 2.4, 0.4, 0);
ball.add(ringA);

const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.008, 8, 120), ringMatRed);
ringB.rotation.set(Math.PI / 1.8, -0.5, 0.3);
ball.add(ringB);

/* Volumetric floodlight cones (faked with additive geometry) */
function floodCone(color, x, opacity) {
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(2.6, 11, 32, 1, true),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  cone.position.set(x, 5.2, -3);
  cone.rotation.x = 0.25;
  scene.add(cone);
  return cone;
}
floodCone(0xfbbf24, isMobile ? 1.5 : 3.5, 0.04);
floodCone(0xdc2626, isMobile ? -1.5 : -2.5, 0.03);

/* Pitch grid floor */
const grid = new THREE.GridHelper(70, 70, 0x1e293b, 0x111827);
grid.position.y = -2.6;
scene.add(grid);

const centerCircle = new THREE.Mesh(
  new THREE.RingGeometry(2.9, 2.95, 80),
  new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
);
centerCircle.rotation.x = -Math.PI / 2;
centerCircle.position.set(BALL_HOME.x, -2.59, 0);
scene.add(centerCircle);

/* Particle field — stadium dust / camera flashes */
const COUNT = reducedMotion ? 0 : 1600;
let particles = null;
if (COUNT) {
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const gold = new THREE.Color(0xfbbf24);
  const white = new THREE.Color(0xcbd5e1);
  const red = new THREE.Color(0xef4444);
  for (let i = 0; i < COUNT; i++) {
    const r = 4 + Math.random() * 14;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi) * 0.6;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 2;
    const c = Math.random() < 0.55 ? white : Math.random() < 0.75 ? gold : red;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  particles = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.035, vertexColors: true, transparent: true, opacity: 0.75,
    sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(particles);
}

/* ---------------- Interaction ---------------- */
const mouse = { x: 0, y: 0 };
const eased = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) - 0.5;
  mouse.y = (e.clientY / window.innerHeight) - 0.5;
});

const scrollState = { ballX: BALL_HOME.x, camZ: 7.5 };

const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();

  if (!reducedMotion) {
    eased.x += (mouse.x - eased.x) * 0.04;
    eased.y += (mouse.y - eased.y) * 0.04;

    ball.rotation.y = t * 0.18 + eased.x * 0.9;
    ball.rotation.x = Math.sin(t * 0.25) * 0.12 + eased.y * 0.5;
    ball.position.y = BALL_HOME.y + Math.sin(t * 0.7) * 0.14;
    ball.position.x = scrollState.ballX;

    ringA.rotation.z = t * 0.22;
    ringB.rotation.z = -t * 0.16;

    if (particles) particles.rotation.y = t * 0.012 + eased.x * 0.08;

    rimLight.intensity = 26 + Math.sin(t * 1.8) * 7;

    camera.position.x = eased.x * 0.7;
    camera.position.y = 0.4 - eased.y * 0.5;
    camera.position.z = scrollState.camZ;
    camera.lookAt(isMobile ? 0 : 1.2, 0, 0);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------------- Text splitting ---------------- */
document.querySelectorAll("[data-split]").forEach((el) => {
  const text = el.textContent;
  el.textContent = "";
  el.setAttribute("aria-label", text);
  [...text].forEach((ch) => {
    const s = document.createElement("span");
    s.className = "char";
    s.setAttribute("aria-hidden", "true");
    s.textContent = ch;
    el.appendChild(s);
  });
});

/* ---------------- Intro choreography ---------------- */
const loader = document.getElementById("loader");
const loaderCount = document.getElementById("loaderCount");
const loaderBar = document.getElementById("loaderBar");

if (reducedMotion) {
  loader.remove();
} else {
  ball.scale.setScalar(0.001);
  gsap.set(".hero__title .char", { yPercent: 115 });
  gsap.set(".hero [data-reveal]", { autoAlpha: 0, y: 24 });
  gsap.set("#nav", { autoAlpha: 0, y: -16 });
  gsap.set(".hero__scroll", { autoAlpha: 0 });

  const count = { v: 0 };
  const intro = gsap.timeline();

  intro
    .to(count, {
      v: 100, duration: 1.3, ease: "power2.inOut",
      onUpdate: () => { loaderCount.textContent = String(Math.round(count.v)).padStart(2, "0"); },
    })
    .to(loaderBar, { scaleX: 1, duration: 1.3, ease: "power2.inOut" }, 0)
    .to(loader, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, 1.45)
    .add(() => loader.remove())
    .to(ball.scale, { x: 1, y: 1, z: 1, duration: 1.6, ease: "expo.out" }, 1.7)
    .to(".hero__title .char", {
      yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.045,
    }, 1.85)
    .to(".hero [data-reveal]", {
      autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08,
    }, 2.2)
    .to("#nav", { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" }, 2.3)
    .to(".hero__scroll", { autoAlpha: 1, duration: 0.8 }, 2.8);
}

/* ---------------- Horizontal cities journey ---------------- */
const citiesSection = document.getElementById("cities");
const citiesTrack = document.getElementById("citiesTrack");

if (reducedMotion || isMobile) {
  citiesSection.classList.add("cities--static");
} else {
  const travel = () => citiesTrack.scrollWidth - window.innerWidth;
  gsap.to(citiesTrack, {
    x: () => -travel(),
    ease: "none",
    scrollTrigger: {
      trigger: citiesSection,
      start: "top top",
      end: () => "+=" + travel(),
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });
}

/* ---------------- Scroll storytelling ---------------- */
if (!reducedMotion) {
  // Hero content drifts up and fades as the journey begins
  gsap.to(".hero__content, .hero__stats", {
    yPercent: -14,
    autoAlpha: 0.15,
    ease: "none",
    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom 35%", scrub: true },
  });

  // The ball travels to centre stage and the camera pushes in
  gsap.to(scrollState, {
    ballX: 0,
    camZ: 5.6,
    ease: "none",
    scrollTrigger: { trigger: "#nations", start: "top bottom", end: "top 20%", scrub: true },
  });

  gsap.to(wire.material, {
    opacity: 0.7,
    ease: "none",
    scrollTrigger: { trigger: "#nations", start: "top bottom", end: "top 30%", scrub: true },
  });

  // The stage dims behind the schedule and beyond
  gsap.to("#stage", {
    opacity: 0.3,
    ease: "none",
    scrollTrigger: { trigger: "#schedule", start: "top 90%", end: "top 30%", scrub: true },
  });

  // ...and flares back up for the final call to action
  gsap.to("#stage", {
    opacity: 0.75,
    ease: "none",
    scrollTrigger: { trigger: "#tickets", start: "top 80%", end: "top 30%", scrub: true },
  });

  // Section headers and content reveal as they enter
  gsap.utils.toArray("main section:not(#hero) [data-reveal]").forEach((el) => {
    gsap.from(el, {
      autoAlpha: 0, y: 36, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  gsap.from("[data-card]", {
    autoAlpha: 0, y: 48, duration: 1, ease: "power3.out", stagger: 0.14,
    scrollTrigger: { trigger: ".story__cards", start: "top 80%" },
  });

  // City cards rise as the horizontal journey starts
  gsap.from("[data-city]", {
    autoAlpha: 0, y: 60, duration: 1, ease: "power3.out", stagger: 0.08,
    scrollTrigger: { trigger: citiesSection, start: "top 60%" },
  });

  // Timeline: golden progress line + item reveals
  gsap.to("#timelineProgress", {
    scaleY: 1,
    ease: "none",
    scrollTrigger: { trigger: ".timeline", start: "top 70%", end: "bottom 60%", scrub: true },
  });

  gsap.utils.toArray("[data-tl]").forEach((item) => {
    gsap.from(item, {
      autoAlpha: 0, x: -28, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: item, start: "top 82%" },
    });
  });
}

/* ---------------- Countdown to the final ---------------- */
const FINAL_KICKOFF = new Date("2026-07-19T15:00:00-04:00").getTime();
const cdEls = {
  d: document.querySelector('[data-cd="d"]'),
  h: document.querySelector('[data-cd="h"]'),
  m: document.querySelector('[data-cd="m"]'),
  s: document.querySelector('[data-cd="s"]'),
};

function updateCountdown() {
  const diff = Math.max(0, FINAL_KICKOFF - Date.now());
  const sec = Math.floor(diff / 1000);
  cdEls.d.textContent = String(Math.floor(sec / 86400)).padStart(2, "0");
  cdEls.h.textContent = String(Math.floor((sec % 86400) / 3600)).padStart(2, "0");
  cdEls.m.textContent = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  cdEls.s.textContent = String(sec % 60).padStart(2, "0");
}
updateCountdown();
setInterval(updateCountdown, 1000);
