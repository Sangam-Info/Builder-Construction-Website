"use strict";

/* =========================================================================
   SANGAM BUILDERS — shared interaction layer + 3D scene
   The heavier 3D model loads lazily only when the hero canvas is present.
   ========================================================================= */

(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const initScene = async () => {
    const canvas = document.getElementById("hero-canvas");
    const loader = document.querySelector(".stage-loader");
    const stage = document.querySelector(".hero-stage");

    const hideLoader = () => {
      if (loader) loader.classList.add("is-done");
    };

    if (!canvas || canvas.dataset.static === "true") {
      hideLoader();
      return;
    }

    try {
      const [{ default: THREE }, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
        import("https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js"),
        import("https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/controls/OrbitControls.js"),
        import("https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/environments/RoomEnvironment.js"),
      ]);

      // ---------- Camera / scene setup ----------
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(9.4, 6.4, 10.2);

      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.enablePan = false;
      controls.minDistance = 9;
      controls.maxDistance = 20;
      controls.minPolarAngle = 0.5;
      controls.maxPolarAngle = Math.PI / 2.25;
      controls.target.set(0, 1.1, 0);
      controls.autoRotate = !reduceMotion;
      controls.autoRotateSpeed = 0.9;

      const hemi = new THREE.HemisphereLight(0xfff4e2, 0x8a8375, 0.75);
      scene.add(hemi);

      const key = new THREE.DirectionalLight(0xffe9c9, 2.3);
      key.position.set(7, 11, 6);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.near = 1;
      key.shadow.camera.far = 40;
      key.shadow.camera.left = -12;
      key.shadow.camera.right = 12;
      key.shadow.camera.top = 12;
      key.shadow.camera.bottom = -12;
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.02;
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xbcd0e8, 0.5);
      fill.position.set(-8, 5, -4);
      scene.add(fill);

      const mat = {
        stone: new THREE.MeshStandardMaterial({ color: 0xece9df, roughness: 0.88, metalness: 0 }),
        stoneWarm: new THREE.MeshStandardMaterial({ color: 0xe3ddce, roughness: 0.9, metalness: 0 }),
        plinth: new THREE.MeshStandardMaterial({ color: 0xd7d1c3, roughness: 0.95, metalness: 0 }),
        roof: new THREE.MeshStandardMaterial({ color: 0x8f8a7c, roughness: 0.7, metalness: 0.05 }),
        roofDark: new THREE.MeshStandardMaterial({ color: 0x4c4f44, roughness: 0.6, metalness: 0.1 }),
        wood: new THREE.MeshStandardMaterial({ color: 0xb37d49, roughness: 0.62, metalness: 0 }),
        frame: new THREE.MeshStandardMaterial({ color: 0x3b3d35, roughness: 0.5, metalness: 0.2 }),
        grass: new THREE.MeshStandardMaterial({ color: 0x7c8a5e, roughness: 1 }),
        deck: new THREE.MeshStandardMaterial({ color: 0xc9a173, roughness: 0.8 }),
        glass: new THREE.MeshPhysicalMaterial({
          color: 0xafc6c2,
          transmission: 0.92,
          transparent: true,
          opacity: 0.9,
          roughness: 0.06,
          metalness: 0,
          ior: 1.35,
          thickness: 0.4,
          envMapIntensity: 1.1,
          reflectivity: 0.4,
        }),
        water: new THREE.MeshPhysicalMaterial({
          color: 0x6f918a,
          roughness: 0.08,
          metalness: 0,
          transmission: 0.3,
          transparent: true,
          opacity: 0.92,
          envMapIntensity: 1.2,
        }),
        trunk: new THREE.MeshStandardMaterial({ color: 0x6b5740, roughness: 0.9 }),
        leafA: new THREE.MeshStandardMaterial({ color: 0x7f8f5c, roughness: 1, flatShading: true }),
        leafB: new THREE.MeshStandardMaterial({ color: 0x92a06c, roughness: 1, flatShading: true }),
      };

      const house = new THREE.Group();
      scene.add(house);

      const box = (w, h, d, m, x, y, z, { shadow = true, rx = 0, ry = 0, rz = 0 } = {}) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
        mesh.position.set(x, y, z);
        mesh.rotation.set(rx, ry, rz);
        mesh.castShadow = shadow;
        mesh.receiveShadow = true;
        house.add(mesh);
        return mesh;
      };

      box(10.5, 0.5, 8.5, mat.plinth, 0, -0.25, 0, { shadow: false });
      const lawn = box(4.2, 0.06, 3.4, mat.grass, -2.6, 0.03, -1.4, { shadow: false });
      lawn.receiveShadow = true;
      box(5.2, 0.08, 4.6, mat.deck, 1.6, 0.04, 0.8, { shadow: false });

      box(3.0, 0.16, 1.7, mat.frame, 1.7, 0.02, 1.1, { shadow: false });
      box(2.7, 0.12, 1.45, mat.water, 1.7, 0.06, 1.1, { shadow: false });

      box(3.6, 3.2, 3.2, mat.stone, -2.4, 1.6, -1.2);
      box(3.64, 0.9, 3.24, mat.stoneWarm, -2.4, 2.7, -1.2, { shadow: false });
      box(4.1, 0.28, 3.7, mat.roof, -2.4, 3.34, -1.2);
      box(4.1, 0.22, 0.14, mat.roofDark, -2.4, 3.5, 0.6, { shadow: false });

      box(2.5, 1.9, 0.08, mat.glass, -2.4, 1.15, 0.45);
      box(0.09, 1.95, 0.5, mat.frame, -1.15, 1.15, 0.3, { shadow: false });
      box(0.09, 1.95, 0.5, mat.frame, -3.65, 1.15, 0.3, { shadow: false });
      box(2.6, 0.09, 0.5, mat.frame, -2.4, 2.1, 0.3, { shadow: false });
      box(1.0, 0.9, 0.07, mat.glass, -3.0, 2.65, 0.45);
      box(1.0, 0.9, 0.07, mat.glass, -1.8, 2.65, 0.45);
      box(0.07, 1.4, 1.6, mat.glass, -4.22, 1.5, -1.2);

      box(3.4, 2.0, 2.6, mat.stone, 2.0, 1.0, -1.6);
      box(3.9, 0.26, 3.0, mat.roof, 2.0, 2.13, -1.6);
      box(3.9, 0.18, 0.12, mat.roofDark, 2.0, 2.28, -3.0, { shadow: false });

      const slatGroup = new THREE.Group();
      for (let i = 0; i < 9; i++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 0.08), mat.wood);
        slat.position.set(-1.05 + i * 0.26, 1.0, 0);
        slat.castShadow = true;
        slat.receiveShadow = true;
        slatGroup.add(slat);
      }
      slatGroup.position.set(2.0, 0, -0.26);
      house.add(slatGroup);

      box(1.1, 1.5, 0.07, mat.glass, 3.15, 1.0, -0.33);
      box(1.16, 0.09, 0.4, mat.frame, 3.15, 1.78, -0.45, { shadow: false });

      box(2.3, 0.16, 2.4, mat.roof, -0.3, 2.35, -1.3);
      box(0.16, 2.3, 0.16, mat.frame, 0.7, 1.2, -0.3, { shadow: false });
      box(0.16, 2.3, 0.16, mat.frame, -1.3, 1.2, -0.3, { shadow: false });
      box(1.6, 0.18, 0.7, mat.plinth, -0.3, 0.09, 1.2, { shadow: false });

      function tree(x, z, s = 1) {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.1 * s, 1.1 * s, 6), mat.trunk);
        trunk.position.y = 0.55 * s;
        trunk.castShadow = true;
        g.add(trunk);

        const blobs = [
          [0, 1.25, 0, 0.55, mat.leafA],
          [0.28, 1.1, 0.16, 0.42, mat.leafB],
          [-0.26, 1.15, -0.1, 0.4, mat.leafB],
          [0.05, 1.55, -0.05, 0.4, mat.leafA],
        ];

        blobs.forEach(([bx, by, bz, r, m]) => {
          const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 0), m);
          leaf.position.set(bx * s, by * s, bz * s);
          leaf.castShadow = true;
          g.add(leaf);
        });

        g.position.set(x, 0, z);
        g.rotation.y = Math.random() * Math.PI;
        house.add(g);
      }

      tree(-3.6, 2.3, 1.0);
      tree(3.9, 1.9, 0.82);
      tree(-4.0, -3.0, 0.7);

      for (const [sx, sz] of [[-0.4, 2.3], [0.5, 2.4], [4.1, -0.2]]) {
        const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), mat.leafA);
        shrub.position.set(sx, 0.2, sz);
        shrub.castShadow = true;
        house.add(shrub);
      }

      house.rotation.y = -0.15;

      function resize() {
        if (!stage) return;
        const w = stage.clientWidth || canvas.clientWidth || 1;
        const h = stage.clientHeight || canvas.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }

      resize();
      window.addEventListener("resize", resize);

      let px = 0;
      let py = 0;
      let tx = 0;
      let ty = 0;

      if (!reduceMotion) {
        window.addEventListener("pointermove", (e) => {
          tx = (e.clientX / window.innerWidth - 0.5) * 2;
          ty = (e.clientY / window.innerHeight - 0.5) * 2;
        });
      }

      let visible = true;
      if ("IntersectionObserver" in window && stage) {
        new IntersectionObserver((entries) => {
          visible = entries[0].isIntersecting;
        }, { threshold: 0.02 }).observe(stage);
      }

      const clock = new THREE.Clock();
      let revealed = false;

      function animate() {
        requestAnimationFrame(animate);
        if (!visible) return;

        const t = clock.getElapsedTime();
        px += (tx - px) * 0.05;
        py += (ty - py) * 0.05;

        house.position.y = reduceMotion ? 0 : Math.sin(t * 0.8) * 0.04;
        house.rotation.x = -py * 0.03;
        house.rotation.y = -0.15 + px * 0.05 + (controls.autoRotate ? 0 : 0);

        controls.update();
        renderer.render(scene, camera);

        if (!revealed) {
          revealed = true;
          hideLoader();
        }
      }

      animate();
      setTimeout(hideLoader, 2500);
    } catch (err) {
      console.error("3D scene failed to initialise:", err);
      hideLoader();
    }
  };

  /* ---------------- Mobile navigation ---------------- */
  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".nav");

  if (menuToggle instanceof HTMLButtonElement && navigation instanceof HTMLElement) {
    menuToggle.addEventListener("click", () => {
      const open = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!open));
      menuToggle.setAttribute("aria-label", open ? "Open navigation" : "Close navigation");
      navigation.classList.toggle("is-open", !open);
    });
    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navigation.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation");
      });
    });
  }

  /* ---------------- Scroll progress bar ---------------- */
  const progress = document.querySelector(".scroll-progress");
  if (progress instanceof HTMLElement) {
    const setProgress = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      progress.style.width = Math.max(0, Math.min(1, scrolled)) * 100 + "%";
    };
    setProgress();
    window.addEventListener("scroll", setProgress, { passive: true });
    window.addEventListener("resize", setProgress);
  }

  /* ---------------- Reveal on scroll ---------------- */
  const revealItems = document.querySelectorAll(".reveal, .reveal-scale");
  if (revealItems.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((el) => el.classList.add("in"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      revealItems.forEach((el) => io.observe(el));
    }
  }

  /* ---------------- Animated counters ---------------- */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    const runCounter = (el) => {
      const target = parseFloat(el.getAttribute("data-count") || "0");
      const decimals = (el.getAttribute("data-decimals") || "0") | 0;
      const duration = 1600;
      if (reduceMotion) {
        el.textContent = target.toFixed(decimals);
        return;
      }
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target.toFixed(decimals);
      };
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      counters.forEach(runCounter);
    } else {
      const cio = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              runCounter(entry.target);
              cio.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach((el) => cio.observe(el));
    }
  }

  /* ---------------- 3D tilt on cards ---------------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      const max = parseFloat(card.getAttribute("data-tilt") || "8");
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ---------------- Parallax elements ---------------- */
  const parallaxEls = document.querySelectorAll("[data-parallax]");
  if (parallaxEls.length && !reduceMotion) {
    const onScroll = () => {
      const vh = window.innerHeight;
      parallaxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const speed = parseFloat(el.getAttribute("data-parallax") || "0.12");
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  /* ---------------- Magnetic buttons ---------------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const strength = parseFloat(el.getAttribute("data-magnetic") || "0.3");
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------------- Custom cursor ---------------- */
  if (finePointer && !reduceMotion) {
    const dot = document.createElement("div");
    const ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add("has-cursor");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;

    window.addEventListener("pointermove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    document.querySelectorAll("a, button, [data-tilt], .hero-stage__canvas").forEach((el) => {
      el.addEventListener("pointerenter", () => ring.classList.add("is-hover"));
      el.addEventListener("pointerleave", () => ring.classList.remove("is-hover"));
    });
  }

  /* ---------------- Footer year ---------------- */
  document.querySelectorAll("#current-year").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------------- Contact form ---------------- */
  const contactForm = document.querySelector("#contact-form");
  if (contactForm instanceof HTMLFormElement) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(contactForm);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const message = String(data.get("message") || "").trim();
      if (!name || !email || !message) {
        contactForm.reportValidity();
        return;
      }
      const subject = encodeURIComponent(`Project enquiry from ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
      window.location.href = `mailto:hello@sangambuilders.com?subject=${subject}&body=${body}`;
    });
  }

  initScene();

  /* ---------------- Mark page ready (hero word reveal) ---------------- */
  requestAnimationFrame(() => document.body.classList.add("is-ready"));
})();
