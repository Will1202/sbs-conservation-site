"use strict";

let lang = "zh";
try {
  const requested = new URLSearchParams(location.search).get("lang");
  const saved = localStorage.getItem("sbs-language");
  if (["zh", "en"].includes(requested)) lang = requested;
  else if (["zh", "en"].includes(saved)) lang = saved;
} catch { /* The default language also works when storage is unavailable. */ }

let ASSETS = null;
let heroIdx = 0;
let heroTimer = null;
let heroTransition = null;
let autoplay = false;
let activeFlyway = "yellowsea";
let lightboxItems = [];
let lbIdx = 0;
let returnFocus = null;
const quizAnswers = [null, null];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const t = key => window.I18N?.[lang]?.[key] ?? key;

function applyI18n() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const value = window.I18N?.[lang]?.[el.dataset.i18n];
    if (value !== undefined) el.textContent = value;
  });
  for (const [dataAttr, attribute] of [["data-i18n-aria", "aria-label"], ["data-i18n-alt", "alt"]]) {
    document.querySelectorAll(`[${dataAttr}]`).forEach(el => {
      const value = window.I18N?.[lang]?.[el.getAttribute(dataAttr)];
      if (value !== undefined) el.setAttribute(attribute, value);
    });
  }
  const languageButton = document.getElementById("langBtn");
  languageButton.textContent = lang === "zh" ? "EN" : "中文";
  languageButton.setAttribute("aria-label", lang === "zh" ? "Read in English" : "切换为中文");
  document.title = t("page_title");
  document.querySelector('meta[name="description"]').content = t("page_description");
  updateMenuLabel();
  updatePlayButton();
  renderHeroCaption();
}

function setupLanguage() {
  document.getElementById("langBtn").addEventListener("click", () => {
    lang = lang === "zh" ? "en" : "zh";
    try { localStorage.setItem("sbs-language", lang); } catch { /* Storage is optional. */ }
    applyI18n();
    renderHeroThumbs();
    renderQuiz();
    renderFlyway();
    renderPVGallery();
    renderLightbox();
    document.getElementById("copyStatus").textContent = "";
  });
}

function updateMenuLabel() {
  const button = document.getElementById("menuBtn");
  button.setAttribute("aria-label", t(button.getAttribute("aria-expanded") === "true" ? "menu_close" : "menu_open"));
}

function closeMenu(restoreFocus = false) {
  const button = document.getElementById("menuBtn");
  document.getElementById("mainNav").classList.remove("is-open");
  button.setAttribute("aria-expanded", "false");
  updateMenuLabel();
  if (restoreFocus) button.focus();
}

function setupNavigation() {
  document.getElementById("menuBtn").addEventListener("click", () => {
    const button = document.getElementById("menuBtn");
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    document.getElementById("mainNav").classList.toggle("is-open", open);
    updateMenuLabel();
  });
  document.querySelectorAll('#mainNav a').forEach(link => {
    link.addEventListener("click", () => {
      closeMenu();
      const section = document.querySelector(link.getAttribute("href"));
      if (section && window.matchMedia("(max-width: 1000px)").matches) {
        section.setAttribute("tabindex", "-1");
        section.focus({ preventScroll: true });
      }
    });
  });
  document.addEventListener("click", event => {
    if (!event.target.closest(".topbar")) closeMenu();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1000) closeMenu();
  });
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      document.querySelectorAll('.nav a').forEach(link => {
        const active = link.getAttribute("href") === `#${entry.target.id}`;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-100px 0px -55% 0px", threshold: 0 });
  document.querySelectorAll('main > section[id]').forEach(section => observer.observe(section));
}

function renderHeroCaption() {
  const item = ASSETS?.heroImages?.[heroIdx];
  if (!item) return;
  const title = lang === "zh" ? item.zhTitle : item.enTitle;
  document.getElementById("heroCaption").textContent = title;
  document.getElementById("heroBg").setAttribute("aria-label", title);
}

function setHeroBg(index, immediate = false) {
  const items = ASSETS?.heroImages ?? [];
  if (!items.length) return;
  heroIdx = (index + items.length) % items.length;
  const background = document.getElementById("heroBg");
  clearTimeout(heroTransition);
  const update = () => {
    background.style.backgroundImage = `url('${items[heroIdx].url}')`;
    background.classList.remove("is-switching");
  };
  if (immediate || reducedMotion.matches) update();
  else {
    background.classList.add("is-switching");
    heroTransition = setTimeout(update, 160);
  }
  document.querySelectorAll(".thumb").forEach((button, i) => {
    button.classList.toggle("is-active", i === heroIdx);
    button.setAttribute("aria-pressed", String(i === heroIdx));
  });
  renderHeroCaption();
}

function renderHeroThumbs() {
  const root = document.getElementById("heroThumbs");
  root.replaceChildren();
  (ASSETS?.heroImages ?? []).forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thumb";
    button.style.backgroundImage = `url('${item.url}')`;
    const title = lang === "zh" ? item.zhTitle : item.enTitle;
    button.setAttribute("aria-label", title);
    button.title = title;
    button.addEventListener("click", () => setHeroBg(index));
    root.append(button);
  });
  setHeroBg(heroIdx, true);
}

function stopHeroAuto() { clearInterval(heroTimer); heroTimer = null; }
function startHeroAuto() {
  stopHeroAuto();
  if (!autoplay || reducedMotion.matches || document.hidden || !document.getElementById("lightbox").hidden) return;
  heroTimer = setInterval(() => setHeroBg(heroIdx + 1), 6500);
}
function updatePlayButton() {
  const button = document.getElementById("heroPlayBtn");
  button.hidden = reducedMotion.matches;
  button.textContent = autoplay ? "Ⅱ" : "▶";
  button.setAttribute("aria-pressed", String(autoplay));
  button.setAttribute("aria-label", t(autoplay ? "slideshow_pause" : "slideshow_start"));
}
function setupSlideshow() {
  document.getElementById("heroPlayBtn").addEventListener("click", () => {
    autoplay = !autoplay;
    updatePlayButton();
    startHeroAuto();
  });
  const figure = document.querySelector(".hero__visual");
  figure.addEventListener("mouseenter", stopHeroAuto);
  figure.addEventListener("mouseleave", startHeroAuto);
  figure.addEventListener("focusin", stopHeroAuto);
  figure.addEventListener("focusout", event => {
    if (!figure.contains(event.relatedTarget)) startHeroAuto();
  });
  document.addEventListener("visibilitychange", () => document.hidden ? stopHeroAuto() : startHeroAuto());
  reducedMotion.addEventListener("change", () => { updatePlayButton(); startHeroAuto(); });
}

function setupTabs() {
  const tabs = [...document.querySelectorAll("[role=tab]")];
  function select(tab) {
    tabs.forEach(item => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute("aria-controls")).hidden = !active;
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", event => {
      const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(tabs[next]);
      tabs[next].focus();
    });
  });
}

const QUIZ = [
  {
    zh: "间接影响可能通过哪条路径发生？", en: "How can an indirect impact affect shorebirds?", correct: 1,
    options: [
      { zh: "只有直接捕猎才会影响鸟类生存", en: "Only direct hunting can affect survival" },
      { zh: "空间破碎化增加往返距离与能量成本", en: "Fragmentation increases travel distance and energy costs" },
      { zh: "开发只改变景观，不会改变栖息地利用", en: "Development changes scenery without affecting habitat use" }
    ],
    zhExplanation: "空间的分隔可能增加飞行成本，减少觅食与恢复时间。", enExplanation: "Separated habitats can require more travel, leaving less time to feed and recover."
  },
  {
    zh: "评估栖息地保护时，还应关注什么？", en: "What matters alongside the area of protected habitat?", correct: 0,
    options: [
      { zh: "觅食地与高潮栖息地的可达性和连接", en: "Access and connections between feeding flats and high-tide roosts" },
      { zh: "只要面积不变，就不需要继续监测", en: "An unchanged area removes the need for monitoring" },
      { zh: "不同地点的保护可以完全独立开展", en: "Conservation at different sites can work entirely independently" }
    ],
    zhExplanation: "觅食、停歇与空间连接共同决定栖息地是否可用。", enExplanation: "Feeding, roosting, and connectivity all help determine whether a habitat remains usable."
  }
];

function renderQuiz() {
  const root = document.getElementById("quiz");
  root.replaceChildren();
  QUIZ.forEach((question, index) => {
    const box = document.createElement("div");
    box.className = "quiz__item";
    const title = document.createElement("p");
    title.className = "quiz__q";
    title.id = `quiz-question-${index}`;
    title.textContent = `${String(index + 1).padStart(2, "0")}. ${question[lang]}`;
    const options = document.createElement("div");
    options.className = "quiz__opts";
    options.setAttribute("role", "group");
    options.setAttribute("aria-labelledby", title.id);
    const feedback = document.createElement("p");
    feedback.id = `quiz-feedback-${index}`;
    feedback.className = "quiz__feedback";
    feedback.setAttribute("role", "status");
    function select(choice) {
      quizAnswers[index] = choice;
      const correct = choice === question.correct;
      [...options.children].forEach((button, i) => {
        button.setAttribute("aria-pressed", String(choice === i));
        button.classList.toggle("is-correct", choice === i && correct);
        button.classList.toggle("is-wrong", choice === i && !correct);
      });
      feedback.classList.toggle("is-wrong", !correct);
      feedback.textContent = `${t(correct ? "quiz_correct" : "quiz_retry")} ${question[lang + "Explanation"]}`;
    }
    question.options.forEach((option, choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz__opt";
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-describedby", feedback.id);
      const letter = document.createElement("span");
      letter.className = "quiz__letter";
      letter.setAttribute("aria-hidden", "true");
      letter.textContent = String.fromCharCode(65 + choice);
      const text = document.createElement("span");
      text.textContent = option[lang];
      button.append(letter, text);
      button.addEventListener("click", () => select(choice));
      options.append(button);
    });
    box.append(title, options, feedback);
    root.append(box);
    if (quizAnswers[index] !== null) select(quizAnswers[index]);
  });
}

const FLYWAY = [
  { id: "breeding", zh: "俄罗斯远东繁殖地", en: "Russian Far East", zhDesc: "勺嘴鹬在俄罗斯东北部繁殖；繁殖地与沿途停歇地共同构成它的年度生态网络。", enDesc: "The species breeds in northeastern Russia. Breeding habitat and migration stopovers form part of its annual habitat network." },
  { id: "yellowsea", zh: "黄海潮间带", en: "Yellow Sea mudflats", zhDesc: "潮滩为迁徙滨鸟提供觅食和补给空间。栖息地功能下降，可能影响后续迁徙。", enDesc: "Tidal flats provide feeding and refuelling opportunities. A loss of habitat function can affect the onward journey." },
  { id: "jiangsu", zh: "江苏沿海停歇地", en: "Jiangsu coast", zhDesc: "江苏沿海属于黄海停歇区域；课程案例关注开发与潮滩、高潮栖息地之间的空间联系。", enDesc: "The Jiangsu coast forms part of the Yellow Sea stopover region. The course case explores spatial links between development, tidal flats, and roosts." },
  { id: "wintering", zh: "南亚与东南亚越冬地", en: "Wintering habitats", zhDesc: "勺嘴鹬在南亚东部及东南亚沿海越冬；栖息地质量与干扰同样需要持续关注。", enDesc: "The species winters along coasts in Southeast Asia and eastern South Asia, where habitat quality and disturbance also matter." }
];

function renderFlyway() {
  const root = document.getElementById("flywayNodes");
  const info = document.getElementById("flywayInfo");
  root.replaceChildren();
  function select(item) {
    activeFlyway = item.id;
    [...root.children].forEach(button => {
      const active = button.dataset.node === item.id;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const title = document.createElement("strong");
    title.textContent = item[lang];
    const description = document.createElement("p");
    description.textContent = item[lang + "Desc"];
    info.replaceChildren(title, description);
  }
  FLYWAY.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "node";
    button.dataset.node = item.id;
    button.textContent = item[lang];
    button.addEventListener("click", () => select(item));
    root.append(button);
  });
  select(FLYWAY.find(item => item.id === activeFlyway) ?? FLYWAY[1]);
}

function renderLightbox() {
  if (!lightboxItems.length) return;
  const item = lightboxItems[lbIdx];
  const title = item[lang + "Title"] ?? "";
  const image = document.getElementById("lbImg");
  image.src = item.url;
  image.alt = title;
  document.getElementById("lbTitle").textContent = title;
  document.getElementById("lbDesc").textContent = item[lang + "Desc"] ?? "";
  document.getElementById("lbPrev").hidden = lightboxItems.length < 2;
  document.getElementById("lbNext").hidden = lightboxItems.length < 2;
  document.getElementById("lbCounter").textContent = `${lbIdx + 1} / ${lightboxItems.length}`;
}

function openLightbox(items, index = 0) {
  if (!items?.length) return;
  returnFocus = document.activeElement;
  lightboxItems = items;
  lbIdx = Math.max(0, Math.min(index, items.length - 1));
  renderLightbox();
  document.getElementById("lightbox").hidden = false;
  document.body.classList.add("modal-open");
  document.querySelector("main").inert = true;
  document.querySelector("header").inert = true;
  stopHeroAuto();
  document.getElementById("lbClose").focus();
}

function closeLightbox() {
  document.getElementById("lightbox").hidden = true;
  document.body.classList.remove("modal-open");
  document.querySelector("main").inert = false;
  document.querySelector("header").inert = false;
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  startHeroAuto();
}

function stepLightbox(direction) {
  if (!lightboxItems.length) return;
  lbIdx = (lbIdx + direction + lightboxItems.length) % lightboxItems.length;
  renderLightbox();
}

function setupLightbox() {
  document.getElementById("openLightboxBtn").addEventListener("click", () => openLightbox(ASSETS?.storyImages));
  document.getElementById("openCaseLightboxBtn").addEventListener("click", () => openLightbox([{
    url: document.getElementById("caseImg").getAttribute("src"), zhTitle: "通州湾：空间规划图（课程资料）", enTitle: "Tongzhou Bay: spatial planning material",
    zhDesc: "课程项目保留的规划图，用于讨论开发与栖息地之间的空间关系。", enDesc: "A planning image retained from the course project, used to discuss spatial relationships between development and habitat."
  }]));
  document.getElementById("lbClose").addEventListener("click", closeLightbox);
  document.getElementById("lbBackdrop").addEventListener("click", closeLightbox);
  document.getElementById("lbPrev").addEventListener("click", () => stepLightbox(-1));
  document.getElementById("lbNext").addEventListener("click", () => stepLightbox(1));
  window.addEventListener("keydown", event => {
    const lightbox = document.getElementById("lightbox");
    if (lightbox.hidden) {
      if (event.key === "Escape" && document.getElementById("menuBtn").getAttribute("aria-expanded") === "true") closeMenu(true);
      return;
    }
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") { event.preventDefault(); stepLightbox(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); stepLightbox(1); }
    if (event.key === "Tab") {
      const buttons = [...lightbox.querySelectorAll("button")].filter(button => !button.hidden);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
}

function renderPVGallery() {
  const root = document.getElementById("pvGrid");
  root.replaceChildren();
  (ASSETS?.pvImages ?? []).forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pvItem";
    const image = document.createElement("img");
    image.src = item.url;
    image.alt = item[lang + "Title"];
    image.style.objectFit = item.fit === "contain" ? "contain" : "cover";
    image.loading = "lazy";
    image.decoding = "async";
    const caption = document.createElement("span");
    caption.className = "pvCap";
    const title = document.createElement("span");
    title.textContent = item[lang + "Title"];
    const arrow = document.createElement("span");
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");
    caption.append(title, arrow);
    button.append(image, caption);
    button.addEventListener("click", () => openLightbox(ASSETS.pvImages, index));
    root.append(button);
  });
}

function setupCopy() {
  document.getElementById("copyChainBtn").addEventListener("click", async () => {
    const status = document.getElementById("copyStatus");
    try {
      await navigator.clipboard.writeText(t("cta_d"));
      status.textContent = t("copy_success");
    } catch {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector(".ctaBand__d"));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = t("copy_manual");
    }
  });
}

async function main() {
  applyI18n();
  setupLanguage();
  setupNavigation();
  setupTabs();
  setupSlideshow();
  setupLightbox();
  setupCopy();
  renderQuiz();
  renderFlyway();
  try {
    const response = await fetch("./assets.json");
    if (!response.ok) throw new Error(`Asset manifest: HTTP ${response.status}`);
    ASSETS = await response.json();
    renderHeroThumbs();
    renderPVGallery();
  } catch (error) {
    console.error(error);
    document.getElementById("heroCaption").textContent = t("assets_unavailable");
    document.getElementById("openLightboxBtn").hidden = true;
    document.getElementById("heroPlayBtn").hidden = true;
  }
}
main();
