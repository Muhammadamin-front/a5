/* =========================================================
   A5 — Prezentatsiya dvigateli + animatsiya effektlari
   Effektlar: Tubes cursor (Hero animate.md), FlowField (motion.md),
   Kinetic Grid (prompt (1).md), Card Flip (flip-card.md),
   3D CoverFlow (prompt.md), TextRoll (2-prompt.md)
   ========================================================= */

const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- TextRoll (2-prompt.md) ---------------- */
function prepareRoll(el) {
  const text = el.textContent;
  el.textContent = "";
  el.setAttribute("aria-label", text);
  let i = 0;
  text.split(" ").forEach((word, wi, words) => {
    const w = document.createElement("span");
    w.style.whiteSpace = "nowrap";
    w.setAttribute("aria-hidden", "true");
    for (const ch of word) {
      const c = document.createElement("span");
      c.className = "roll__ch";
      c.style.setProperty("--i", i++);
      c.innerHTML = `<span class="roll__a">${ch}</span><span class="roll__b">${ch}</span><span class="roll__ghost">${ch}</span>`;
      w.appendChild(c);
    }
    el.appendChild(w);
    if (wi < words.length - 1) { el.appendChild(document.createTextNode(" ")); i++; }
  });
  el.addEventListener("mouseenter", () => playRoll(el));
}
function playRoll(el) {
  el.classList.remove("is-rolling");
  void el.offsetWidth; // qayta ishga tushirish uchun reflow
  el.classList.add("is-rolling");
}

/* ---------------- FlowField (motion.md) ---------------- */
const FLOW_THEMES = {
  aurora: { hueStart: 120, hueRange: 200, saturation: 90, lightness: 62, bg: "7, 7, 12", trailAlpha: 0.06 },
  ember: { hueStart: 0, hueRange: 55, saturation: 95, lightness: 58, bg: "8, 4, 2", trailAlpha: 0.07 },
  ocean: { hueStart: 180, hueRange: 90, saturation: 88, lightness: 60, bg: "2, 6, 10", trailAlpha: 0.06 },
};
function fieldAngle(x, y, t) {
  const s = 0.0025;
  return (
    Math.sin(x * s + t * 0.0007) * Math.PI +
    Math.cos(y * s + t * 0.0005) * Math.PI +
    Math.sin((x + y) * s * 0.6 + t * 0.0009) * Math.PI * 0.6 +
    Math.cos((x - y) * s * 0.4 + t * 0.0006) * Math.PI * 0.4
  );
}
function createFlowField(canvas, themeName = "aurora") {
  const ctx = canvas.getContext("2d");
  const cfg = FLOW_THEMES[themeName] || FLOW_THEMES.aurora;
  let width = 0, height = 0, raf = 0, time = 0, particles = [];
  const count = () => (window.innerWidth < 760 ? 600 : 1200);

  const spawn = () => {
    const maxLife = 200 + Math.floor(Math.random() * 300);
    return { x: Math.random() * width, y: Math.random() * height, speed: 1.1 + Math.random() * 1.8,
      hue: cfg.hueStart + Math.random() * cfg.hueRange, life: Math.floor(Math.random() * maxLife), maxLife };
  };
  const resize = () => {
    width = canvas.clientWidth; height = canvas.clientHeight;
    const dpr = DPR();
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = `rgb(${cfg.bg})`; ctx.fillRect(0, 0, width, height);
    particles = Array.from({ length: count() }, spawn);
  };
  const render = () => {
    time++;
    ctx.fillStyle = `rgba(${cfg.bg}, ${cfg.trailAlpha})`;
    ctx.fillRect(0, 0, width, height);
    for (const p of particles) {
      const angle = fieldAngle(p.x, p.y, time);
      p.x += Math.cos(angle) * p.speed;
      p.y += Math.sin(angle) * p.speed;
      p.life++;
      if (p.life > p.maxLife) {
        p.x = Math.random() * width; p.y = Math.random() * height; p.life = 0;
        p.hue = cfg.hueStart + Math.random() * cfg.hueRange; continue;
      }
      if (p.x < 0) p.x += width; else if (p.x > width) p.x -= width;
      if (p.y < 0) p.y += height; else if (p.y > height) p.y -= height;
      const progress = p.life / p.maxLife;
      const alpha = Math.min(progress * 8, 1) * Math.min((1 - progress) * 6, 1) * 0.9;
      const hueMod = (p.hue + (angle / (Math.PI * 2)) * 70 + 360) % 360;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hueMod}, ${cfg.saturation}%, ${cfg.lightness}%, ${alpha})`;
      ctx.fill();
    }
    raf = requestAnimationFrame(render);
  };
  let sized = false;
  return {
    start() {
      if (!sized) { resize(); sized = true; }
      if (reduceMotion) { for (let i = 0; i < 120; i++) { cancelAnimationFrame(raf); render(); } cancelAnimationFrame(raf); return; }
      if (!raf) raf = requestAnimationFrame(render);
    },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    resize() { sized = false; },
  };
}

/* ---------------- Kinetic Grid (prompt (1).md) ---------------- */
function createKineticGrid(canvas, host) {
  const ctx = canvas.getContext("2d");
  const CELL = 55, INFLUENCE = 260, MAX_WARP = 24, DOT = 28, LERP = 0.08;
  const BG = "#0b0b10";
  const base = { r: 255, g: 255, b: 255, a: 0.1 };
  const active = { r: 74, g: 158, b: 255, a: 0.9 };
  let W = 0, H = 0, raf = 0;
  const mouse = { x: -9999, y: -9999 }, target = { x: -9999, y: -9999 };
  const ripples = [];

  const lerp = (a, b, t) => a + (b - a) * t;
  const color = (t) => `rgba(${Math.round(lerp(base.r, active.r, t))},${Math.round(lerp(base.g, active.g, t))},${Math.round(lerp(base.b, active.b, t))},${lerp(base.a, active.a, t).toFixed(3)})`;

  const warp = (gx, gy, col, row, cols, rows) => {
    const m = 1.5;
    const cp = Math.min(col / m, (cols - 1 - col) / m, 1);
    const rp = Math.min(row / m, (rows - 1 - row) / m, 1);
    const pin = cp * cp * rp * rp;
    const dx = gx - mouse.x, dy = gy - mouse.y;
    const dist = Math.hypot(dx, dy);
    const prox = Math.max(0, 1 - dist / INFLUENCE) * pin;
    let rx = 0, ry = 0;
    for (const r of ripples) {
      const rdx = gx - r.x, rdy = gy - r.y;
      const diff = Math.hypot(rdx, rdy) - r.radius;
      if (Math.abs(diff) < 55) {
        const s = (1 - Math.abs(diff) / 55) * r.opacity * 18 * pin;
        const a = Math.atan2(rdy, rdx), sign = diff < 0 ? -1 : 1;
        rx -= Math.cos(a) * s * sign; ry -= Math.sin(a) * s * sign;
      }
    }
    if (dist < INFLUENCE && dist > 0 && pin > 0) {
      const t = dist / INFLUENCE;
      const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
      const amt = eased * MAX_WARP * pin, a = Math.atan2(dy, dx);
      return { x: gx - Math.cos(a) * amt + rx, y: gy - Math.sin(a) * amt + ry, p: prox };
    }
    return { x: gx + rx, y: gy + ry, p: prox };
  };

  const draw = (now) => {
    mouse.x = lerp(mouse.x, target.x, LERP);
    mouse.y = lerp(mouse.y, target.y, LERP);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = DOT / 2; x < W; x += DOT) for (let y = DOT / 2; y < H; y += DOT) { ctx.fillRect(x, y, 1.2, 1.2); }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i], age = (now - r.born) / 1000;
      r.radius = Math.max(0, age * 400); r.opacity = Math.max(0, 1 - age * 1.2);
      if (r.opacity <= 0) ripples.splice(i, 1);
    }
    const cols = Math.max(2, Math.ceil(W / CELL)) + 1, rows = Math.max(2, Math.ceil(H / CELL)) + 1;
    const cw = W / (cols - 1), ch = H / (rows - 1);
    const pts = [];
    for (let r = 0; r < rows; r++) { pts[r] = []; for (let c = 0; c < cols; c++) pts[r][c] = warp(c * cw, r * ch, c, r, cols, rows); }

    ctx.lineWidth = 1;
    const seg = (a, b) => {
      const t = Math.max(a.p, b.p);
      ctx.strokeStyle = color(t); ctx.lineWidth = 1 + t * 1.2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (c < cols - 1) seg(pts[r][c], pts[r][c + 1]);
      if (r < rows - 1) seg(pts[r][c], pts[r + 1][c]);
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const p = pts[r][c];
      if (p.p > 0.02) {
        ctx.fillStyle = `rgba(74,158,255,${p.p})`;
        ctx.shadowColor = "rgba(74,158,255,0.9)"; ctx.shadowBlur = 12 * p.p;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 + p.p * 1.4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    for (const r of ripples) {
      ctx.strokeStyle = `rgba(100,180,255,${r.opacity * 0.5})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2); ctx.stroke();
    }
    raf = requestAnimationFrame(draw);
  };
  const resize = () => {
    W = canvas.clientWidth; H = canvas.clientHeight;
    const dpr = DPR();
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  host.addEventListener("pointermove", (e) => { const b = host.getBoundingClientRect(); target.x = e.clientX - b.left; target.y = e.clientY - b.top; if (mouse.x < -1000) { mouse.x = target.x; mouse.y = target.y; } });
  host.addEventListener("pointerleave", () => { target.x = -9999; target.y = -9999; });
  host.addEventListener("pointerdown", (e) => { const b = host.getBoundingClientRect(); ripples.push({ x: e.clientX - b.left, y: e.clientY - b.top, radius: 0, opacity: 1, born: performance.now() }); });
  let sized = false;
  return {
    start() { if (!sized) { resize(); sized = true; } if (!raf) raf = requestAnimationFrame(draw); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    resize() { sized = false; },
  };
}

/* ---------------- Tubes cursor (Hero animate.md) ---------------- */
function createTubes(canvas, host) {
  let app = null, fallback = null, active = false, loading = false;
  const randomColors = (n) => Array.from({ length: n }, () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"));
  const load = async () => {
    loading = true;
    try {
      const mod = await import("https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js");
      app = mod.default(canvas, {
        tubes: {
          colors: ["#f967fb", "#53bc28", "#6958d5"],
          lights: { intensity: 200, colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"] },
        },
      });
    } catch (err) {
      // Internet bo‘lmasa — FlowField zaxira effekti
      console.warn("Tubes yuklanmadi, FlowField ishlatiladi:", err);
      const c2 = document.createElement("canvas");
      c2.className = "bg-canvas";
      canvas.replaceWith(c2);
      fallback = createFlowField(c2, "aurora");
      if (active) fallback.start();
    }
  };
  host.addEventListener("click", () => {
    if (!app) return;
    app.tubes.setColors(randomColors(3));
    app.tubes.setLightsColors(randomColors(4));
  });
  return {
    start() { active = true; if (!loading) load(); fallback && fallback.start(); },
    stop() { active = false; fallback && fallback.stop(); },
    resize() { fallback && fallback.resize(); },
  };
}

/* ---------------- 3D CoverFlow (prompt.md) ---------------- */
const COVER_ITEMS = [
  { tag: "#Indikativ", t1: "Fransiya", t2: "– Monnet rejasi", big: "FR", accent: "#8cb4ff",
    art: "linear-gradient(160deg,#1e3a8a,#0b1020 55%,#7f1d1d)",
    desc: "1946-yilda Reja bo‘yicha bosh komissariat tuzilgan. Indikativ rejalar davlat, biznes va kasaba uyushmalari kelishuvi asosida ishlab chiqilgan." },
  { tag: "#Strategik", t1: "Yaponiya", t2: "– Iqtisodiy rejalar", big: "JP", accent: "#ff8a9b",
    art: "linear-gradient(160deg,#7f1d1d,#140a0d 55%,#3b0764)",
    desc: "Urushdan keyingi o‘rta muddatli rejalar, jumladan 1960-yilgi «Daromadni ikki baravar oshirish» rejasi sanoat siyosatini yo‘naltirgan." },
  { tag: "#BeshYillik", t1: "Janubiy Koreya", t2: "– 1962–1996", big: "KR", accent: "#7dd3fc",
    art: "linear-gradient(160deg,#0c4a6e,#08111a 55%,#831843)",
    desc: "Yettita besh yillik iqtisodiy rivojlanish rejasi eksportga yo‘naltirilgan sanoatlashtirishni ta’minlab, mamlakatni «Osiyo yo‘lbarsi»ga aylantirgan." },
  { tag: "#BeshYillik", t1: "Xitoy", t2: "– 1953-yildan", big: "CN", accent: "#fca5a5",
    art: "linear-gradient(160deg,#991b1b,#160707 55%,#a16207)",
    desc: "Besh yillik rejalar tizimi hozirgacha davom etmoqda; rejalar indikativ ko‘rsatkichlar va ustuvor tarmoqlarni belgilaydi." },
  { tag: "#Milliy reja", t1: "Malayziya", t2: "– Malaysia Plan", big: "MY", accent: "#fde68a",
    art: "linear-gradient(160deg,#1e3a8a,#0a0f1f 55%,#a16207)",
    desc: "1966-yildan besh yillik «Malaysia Plan»lar va uzoq muddatli milliy strategiyalar (masalan, «Vision 2020») qo‘llanilgan." },
];
function createCoverflow(root, ambient, items) {
  const stage = root.querySelector(".cf-stage");
  const dotsEl = root.querySelector(".cf-dots");
  const total = items.length;
  let current = 0, timer = 0, hovered = false, running = false;

  const cards = items.map((it, idx) => {
    const el = document.createElement("div");
    el.className = "cf-card";
    el.style.setProperty("--art", it.art);
    el.style.setProperty("--accent", it.accent);
    el.style.setProperty("--glow", it.accent + "55");
    el.innerHTML = `<div class="cf-card__art" data-big="${it.big}"></div>
      <div class="cf-card__body"><span class="cf-tag">${it.tag}</span>
      <div class="cf-card__text"><h3>${it.t1}</h3><h4>${it.t2}</h4><p>${it.desc}</p></div></div>`;
    el.addEventListener("click", () => go(idx));
    stage.appendChild(el);
    const d = document.createElement("button");
    d.setAttribute("aria-label", it.t1);
    d.addEventListener("click", () => go(idx));
    dotsEl.appendChild(d);
    return el;
  });

  const layout = () => {
    const k = Math.min(1, window.innerWidth / 1200);
    cards.forEach((el, idx) => {
      const off = (idx - current + total) % total;
      let tf = "translateX(0) scale(0.4)", op = 0, z = 0, f = "brightness(0.4) blur(2px)";
      if (off === 0) { tf = "translateX(0) scale(1) rotateY(0)"; op = 1; z = 30; f = "brightness(1)"; }
      else if (off === 1) { tf = `translateX(${285 * k}px) scale(0.84) rotateY(-24deg)`; op = 0.65; z = 20; f = "brightness(0.75)"; }
      else if (off === 2) { tf = `translateX(${510 * k}px) scale(0.68) rotateY(-38deg)`; op = 0.38; z = 10; f = "brightness(0.55) blur(1px)"; }
      else if (off === total - 1) { tf = `translateX(${-285 * k}px) scale(0.84) rotateY(24deg)`; op = 0.65; z = 20; f = "brightness(0.75)"; }
      else if (off === total - 2) { tf = `translateX(${-510 * k}px) scale(0.68) rotateY(38deg)`; op = 0.38; z = 10; f = "brightness(0.55) blur(1px)"; }
      Object.assign(el.style, { transform: tf, opacity: op, zIndex: z, filter: f });
      el.classList.toggle("is-center", off === 0);
    });
    [...dotsEl.children].forEach((d, i) => d.classList.toggle("is-on", i === current));
    ambient.style.background = items[current].art;
  };
  const go = (i) => { current = (i + total) % total; layout(); restart(); };
  const restart = () => { clearInterval(timer); if (running && !hovered && !reduceMotion) timer = setInterval(() => { current = (current + 1) % total; layout(); }, 4500); };

  root.querySelector('[data-cf="prev"]').addEventListener("click", () => go(current - 1));
  root.querySelector('[data-cf="next"]').addEventListener("click", () => go(current + 1));
  root.addEventListener("mouseenter", () => { hovered = true; restart(); });
  root.addEventListener("mouseleave", () => { hovered = false; restart(); });
  let tx = 0;
  stage.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (e) => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 45) go(current + (d < 0 ? 1 : -1)); });
  layout();
  return {
    start() { running = true; restart(); },
    stop() { running = false; clearInterval(timer); },
    resize: layout,
  };
}

/* ---------------- Deck ---------------- */
(function deck() {
  const slides = [...document.querySelectorAll(".slide")];
  const total = slides.length;
  const bar = document.getElementById("progressBar");
  const cur = document.getElementById("curNum");
  document.getElementById("totalNum").textContent = String(total).padStart(2, "0");
  const dotsEl = document.getElementById("dots");
  let index = -1, lock = false;

  document.querySelectorAll("[data-roll]").forEach(prepareRoll);

  // Har bir slayd uchun fon effektini yaratish
  const effects = slides.map((s) => {
    const type = s.dataset.bg;
    const canvas = s.querySelector(".bg-canvas");
    if (type === "tubes") return createTubes(canvas, s);
    if (type === "flow") return createFlowField(canvas, s.dataset.flow);
    if (type === "kgrid") return createKineticGrid(canvas, s);
    return null;
  });
  const cf = document.getElementById("coverflow");
  if (cf) {
    const i = slides.indexOf(cf.closest(".slide"));
    effects[i] = createCoverflow(cf, document.getElementById("cfAmbient"), COVER_ITEMS);
  }

  // Flip kartalar: bosish bilan ham aylanadi (proyektor/sensor ekran uchun)
  document.querySelectorAll(".flip").forEach((f) => f.addEventListener("click", () => f.classList.toggle("is-flipped")));

  slides.forEach((s, i) => {
    const b = document.createElement("button");
    b.innerHTML = `<span>${String(i + 1).padStart(2, "0")} · ${s.dataset.title || ""}</span>`;
    b.setAttribute("aria-label", s.dataset.title || `Slayd ${i + 1}`);
    b.addEventListener("click", () => go(i));
    dotsEl.appendChild(b);
  });

  function go(n) {
    n = Math.max(0, Math.min(total - 1, n));
    if (n === index) return;
    const prev = index;
    index = n;
    slides.forEach((s, i) => {
      s.classList.toggle("is-active", i === n);
      s.classList.toggle("is-before", i < n);
    });
    if (prev >= 0) {
      if (effects[prev]) setTimeout(() => prev !== index && effects[prev].stop(), 900);
      slides[prev].querySelectorAll(".flip.is-flipped").forEach((f) => f.classList.remove("is-flipped"));
    }
    effects[n] && effects[n].start();
    slides[n].querySelectorAll("[data-roll]").forEach((el) => setTimeout(() => playRoll(el), 350));
    slides[n].querySelector(".content").scrollTop = 0;
    [...dotsEl.children].forEach((d, i) => d.classList.toggle("is-on", i === n));
    bar.style.width = `${((n + 1) / total) * 100}%`;
    cur.textContent = String(n + 1).padStart(2, "0");
    history.replaceState(null, "", `#${n + 1}`);
  }
  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  document.getElementById("nextBtn").addEventListener("click", next);
  document.getElementById("prevBtn").addEventListener("click", prev);
  document.getElementById("fsBtn").addEventListener("click", toggleFs);
  document.addEventListener("deck:goto", (e) => go(e.detail));
  function toggleFs() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); next(); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); prev(); }
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(total - 1);
    else if (e.key === "f" || e.key === "F") toggleFs();
  });

  window.addEventListener("wheel", (e) => {
    const box = slides[index].querySelector(".content");
    const scrollable = box.scrollHeight > box.clientHeight + 4;
    if (scrollable) {
      const atTop = box.scrollTop <= 0, atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
      if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return;
    }
    if (lock || Math.abs(e.deltaY) < 25) return;
    lock = true; setTimeout(() => (lock = false), 1000);
    e.deltaY > 0 ? next() : prev();
  }, { passive: true });

  let sx = 0, sy = 0;
  window.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (e.target.closest(".cf-stage")) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) dx < 0 ? next() : prev();
  });

  let rt = 0;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      effects.forEach((fx) => fx && fx.resize());
      const fx = effects[index];
      if (fx) { fx.stop(); fx.start(); }
    }, 150);
  });

  const start = parseInt(location.hash.slice(1), 10);
  go(Number.isFinite(start) ? start - 1 : 0);
})();
