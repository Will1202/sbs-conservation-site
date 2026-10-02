"use strict";

// Decorative effects are independent of the site's content and interactions.
(() => {
  const root = document.documentElement;
  const hero = document.querySelector(".hero");
  const canvas = document.getElementById("networkCanvas");
  const context = canvas.getContext("2d");
  const button = document.getElementById("motionBtn");
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  let paused = false;
  try { paused = localStorage.getItem("sbs-effects") === "off"; } catch { /* Storage is optional. */ }
  let visible = true;
  let frame = 0;
  let lastTime = 0;
  let width = 0;
  let height = 0;
  let particles = [];
  let pointer = null;

  function isPaused() { return paused || motionPreference.matches; }
  function canAnimate() { return context && !isPaused() && visible && !document.hidden && !document.body.classList.contains("modal-open"); }

  function draw(delta = 0) {
    if (!context || !width) return;
    context.clearRect(0, 0, width, height);
    for (const dot of particles) {
      dot.x = (dot.x + dot.vx * delta + width) % width;
      dot.y = (dot.y + dot.vy * delta + height) % height;
    }
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance >= 145) continue;
        context.strokeStyle = `rgba(96,245,206,${(1 - distance / 145) * .21})`;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
      if (pointer) {
        const distance = Math.hypot(a.x - pointer.x, a.y - pointer.y);
        if (distance < 180) {
          context.strokeStyle = `rgba(120,223,255,${(1 - distance / 180) * .34})`;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(pointer.x, pointer.y);
          context.stroke();
        }
      }
      context.fillStyle = a.tint;
      context.beginPath();
      context.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function animate(now) {
    frame = 0;
    if (!canAnimate()) return;
    // Cap drawing at 30 fps and limit time steps after a suspended frame.
    if (!lastTime || now - lastTime >= 32) {
      draw(lastTime ? Math.min(now - lastTime, 50) / 1000 : 0);
      lastTime = now;
    }
    frame = requestAnimationFrame(animate);
  }

  function syncAnimation() {
    if (canAnimate()) {
      if (!frame) {
        lastTime = 0;
        frame = requestAnimationFrame(animate);
      }
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    }
  }

  function resize() {
    const nextWidth = hero.clientWidth;
    const nextHeight = hero.clientHeight;
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    if (!context) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineWidth = .6;
    const count = Math.min(64, Math.max(28, Math.round(width * height / 16000)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - .5) * 15,
      vy: (Math.random() - .5) * 15,
      radius: index % 7 === 0 ? 1.8 : 1,
      tint: index % 3 === 0 ? "rgba(120,223,255,.65)" : "rgba(96,245,206,.48)"
    }));
    draw();
    syncAnimation();
  }

  function updateControl() {
    root.classList.toggle("motion-paused", isPaused());
    button.hidden = motionPreference.matches;
    button.setAttribute("aria-pressed", String(paused));
    const locale = root.lang === "en" ? "en" : "zh";
    const label = window.I18N[locale][paused ? "effects_resume" : "effects_pause"];
    button.setAttribute("aria-label", label);
    button.title = label;
    if (isPaused()) {
      pointer = null;
      hero.style.removeProperty("--hero-x");
      hero.style.removeProperty("--hero-y");
    }
    syncAnimation();
  }

  button.addEventListener("click", () => {
    paused = !paused;
    try { localStorage.setItem("sbs-effects", paused ? "off" : "on"); } catch { /* Storage is optional. */ }
    updateControl();
  });
  document.getElementById("langBtn").addEventListener("click", updateControl);
  motionPreference.addEventListener("change", updateControl);
  document.addEventListener("visibilitychange", syncAnimation);
  new MutationObserver(syncAnimation).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      syncAnimation();
    }).observe(hero);
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(hero);
  else window.addEventListener("resize", resize, { passive: true });

  hero.addEventListener("pointermove", event => {
    if (!finePointer.matches || isPaused()) return;
    const bounds = hero.getBoundingClientRect();
    pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    hero.style.setProperty("--hero-x", `${(pointer.x / bounds.width - .5) * 7}px`);
    hero.style.setProperty("--hero-y", `${(pointer.y / bounds.height - .5) * 7}px`);
  }, { passive: true });
  hero.addEventListener("pointerleave", () => {
    pointer = null;
    hero.style.removeProperty("--hero-x");
    hero.style.removeProperty("--hero-y");
  });

  document.querySelectorAll(".principle, .strategyItem, .actionGrid > article").forEach(card => {
    card.classList.add("fx-card");
    card.addEventListener("pointermove", event => {
      if (!finePointer.matches || isPaused()) return;
      const bounds = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
      card.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
    }, { passive: true });
    card.addEventListener("pointerleave", () => {
      card.style.removeProperty("--spot-x");
      card.style.removeProperty("--spot-y");
    });
  });

  // Animate on entry without hiding content when JavaScript is unavailable.
  if ("IntersectionObserver" in window) {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!isPaused()) entry.target.classList.add("is-revealed");
        reveal.unobserve(entry.target);
      });
    }, { threshold: .08 });
    document.querySelectorAll(".sectionHead, .principle, .learnGrid, .flyway, .threatGrid, .caseCard, .strategyItem, .actionGrid").forEach(el => reveal.observe(el));
  }

  let progressFrame = 0;
  function updateProgress() {
    progressFrame = 0;
    const distance = document.documentElement.scrollHeight - innerHeight;
    const progress = distance > 0 ? Math.max(0, Math.min(1, scrollY / distance)) : 0;
    root.style.setProperty("--reading-progress", progress);
  }
  function scheduleProgress() {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
  }
  window.addEventListener("scroll", scheduleProgress, { passive: true });
  window.addEventListener("resize", scheduleProgress, { passive: true });
  window.addEventListener("load", scheduleProgress, { once: true });
  updateControl();
  resize();
  updateProgress();
})();
