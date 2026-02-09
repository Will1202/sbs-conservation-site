let lang = "zh";
let ASSETS = null;

function t(key){
  return (window.I18N?.[lang]?.[key]) ?? key;
}

function applyI18n(){
  document.documentElement.lang = (lang === "zh") ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k = el.getAttribute("data-i18n");
    const v = window.I18N?.[lang]?.[k];
    if(v) el.textContent = v;
  });
}

async function loadAssets(){
  const res = await fetch("./assets.json");
  ASSETS = await res.json();
}

function setupLang(){
  document.getElementById("langBtn")?.addEventListener("click", ()=>{
    lang = (lang === "zh") ? "en" : "zh";
    applyI18n();
    renderQuiz(true);
    renderFlyway(true);
    renderLightboxCopy();
    renderHeroThumbs();
  });
}

function setupReveal(){
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting) e.target.classList.add("in");
    });
  },{threshold:0.12});
  document.querySelectorAll(".card").forEach(c=>{
    c.classList.add("reveal");
    observer.observe(c);
  });
}

function animateCounts(){
  const counters = document.querySelectorAll(".count");
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(!e.isIntersecting) return;
      const el = e.target;
      const target = Number(el.getAttribute("data-count") || "0");
      const start = performance.now();
      const dur = 900;

      function tick(now){
        const p = Math.min(1, (now-start)/dur);
        const val = Math.round(target * (0.15 + 0.85*p));
        el.textContent = String(val);
        if(p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  },{threshold:0.6});

  counters.forEach(c=>io.observe(c));
}

/* HERO slideshow */
let heroIdx = 0;
let heroTimer = null;

function setHeroBg(idx){
  const heroBg = document.getElementById("heroBg");
  if(!heroBg || !ASSETS?.heroImages?.length) return;

  heroBg.classList.add("is-switching");
  setTimeout(()=>{
    heroBg.style.backgroundImage = `url('${ASSETS.heroImages[idx].url}')`;
    heroBg.classList.remove("is-switching");
  }, 250);

  heroIdx = idx;
  document.querySelectorAll(".thumb").forEach((t,i)=>{
    t.classList.toggle("is-active", i === idx);
    t.setAttribute("aria-pressed", i === idx ? "true" : "false");
  });
}

function renderHeroThumbs(){
  const wrap = document.getElementById("heroThumbs");
  if(!wrap || !ASSETS?.heroImages?.length) return;
  wrap.innerHTML = "";

  ASSETS.heroImages.forEach((img, i)=>{
    const b = document.createElement("button");
    b.className = "thumb";
    b.style.backgroundImage = `url('${img.url}')`;
    b.type = "button";
    b.title = (lang === "zh") ? img.zhTitle : img.enTitle;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", ()=>{
      stopHeroAuto();
      setHeroBg(i);
      startHeroAuto();
    });
    wrap.appendChild(b);
  });

  setHeroBg(heroIdx);
}

function startHeroAuto(){
  stopHeroAuto();
  heroTimer = setInterval(()=>{
    const n = ASSETS?.heroImages?.length || 0;
    if(!n) return;
    setHeroBg((heroIdx + 1) % n);
  }, 5200);
}
function stopHeroAuto(){
  if(heroTimer) clearInterval(heroTimer);
  heroTimer = null;
}

/* Tabs */
function setupTabs(){
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tabPanel");
  tabs.forEach(tab=>{
    tab.addEventListener("click", ()=>{
      const key = tab.getAttribute("data-tab");
      tabs.forEach(t=>t.classList.toggle("is-active", t===tab));
      tabs.forEach(t=>t.setAttribute("aria-selected", t===tab ? "true":"false"));
      panels.forEach(p=>{
        p.classList.toggle("is-active", p.getAttribute("data-panel") === key);
      });
    });
  });
}

/* Quiz */
const QUIZ = [
  {
    zhQ: "“间接影响”最核心的机制是？",
    enQ: "The core mechanism of indirect harm is…",
    options: [
      { zh:"直接捕猎导致即时死亡", en:"Immediate mortality from hunting", ok:false },
      { zh:"破碎化提高能量成本，长期降低生存/繁殖", en:"Fragmentation raises energy costs and reduces survival/breeding over time", ok:true },
      { zh:"气温变化让鸟变色", en:"Temperature changes bird color", ok:false }
    ]
  },
  {
    zhQ: "为什么“保护面积”不等于“保护功能”？",
    enQ: "Why is protecting area not the same as protecting function?",
    options: [
      { zh:"面积越大鸟越可爱", en:"Bigger areas make birds cuter", ok:false },
      { zh:"觅食地与高潮栖息地必须可达且距离合适", en:"Feeding flats and roosts must be accessible and sufficiently close", ok:true },
      { zh:"保护区里必须有咖啡店", en:"Protected areas must have cafés", ok:false }
    ]
  }
];

function renderQuiz(reset=false){
  const root = document.getElementById("quiz");
  if(!root) return;
  if(reset) root.innerHTML = "";

  root.innerHTML = "";
  QUIZ.forEach((q, qi)=>{
    const box = document.createElement("div");
    box.className = "quiz__item";

    const title = document.createElement("div");
    title.className = "quiz__q";
    title.textContent = (lang==="zh") ? q.zhQ : q.enQ;

    const opts = document.createElement("div");
    opts.className = "quiz__opts";

    q.options.forEach((o, oi)=>{
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz__opt";
      btn.textContent = (lang==="zh") ? o.zh : o.en;
      btn.addEventListener("click", ()=>{
        opts.querySelectorAll(".quiz__opt").forEach(x=>x.classList.remove("is-correct","is-wrong"));
        btn.classList.add(o.ok ? "is-correct" : "is-wrong");
      });
      opts.appendChild(btn);
    });

    box.appendChild(title);
    box.appendChild(opts);
    root.appendChild(box);
  });

  // add small styles via class hooks
  root.querySelectorAll(".quiz__item").forEach(el=>el.classList.add("reveal"));
}

/* Flyway nodes (interactive “map”) */
const FLYWAY = [
  {
    id:"breeding",
    zh:"繁殖地",
    en:"Breeding grounds",
    zhDesc:"高纬度繁殖地决定种群起点，但迁徙补给同样关键。",
    enDesc:"Breeding grounds set the starting point, but migration refuelling is equally critical."
  },
  {
    id:"yellowsea",
    zh:"黄海潮间带",
    en:"Yellow Sea mudflats",
    zhDesc:"关键补给站：停歇与换羽。栖息地功能下降会影响整条迁飞链条。",
    enDesc:"A critical refuelling stopover. Functional loss can destabilize the entire chain."
  },
  {
    id:"jiangsu",
    zh:"江苏沿海",
    en:"Jiangsu coast",
    zhDesc:"开发与保护冲突集中区：更需要把“功能连通性”写进规划与环评。",
    enDesc:"A focal conflict zone—planning must protect functional connectivity."
  },
  {
    id:"wintering",
    zh:"越冬地",
    en:"Wintering grounds",
    zhDesc:"越冬地压力与栖息地质量决定越冬存活与翌年繁殖状态。",
    enDesc:"Winter habitat quality shapes survival and next-year breeding condition."
  }
];

function renderFlyway(reset=false){
  const nodes = document.getElementById("flywayNodes");
  const info = document.getElementById("flywayInfo");
  if(!nodes || !info) return;
  if(reset){ nodes.innerHTML=""; info.innerHTML=""; }

  nodes.innerHTML = "";
  FLYWAY.forEach((n, idx)=>{
    const b = document.createElement("button");
    b.type = "button";
    b.className = "node";
    b.textContent = (lang==="zh") ? n.zh : n.en;
    b.addEventListener("click", ()=>{
      nodes.querySelectorAll(".node").forEach(x=>x.classList.remove("is-active"));
      b.classList.add("is-active");
      info.innerHTML = `<strong>${(lang==="zh") ? n.zh : n.en}</strong><div class="muted" style="margin-top:6px;line-height:1.6">${(lang==="zh") ? n.zhDesc : n.enDesc}</div>`;
    });
    nodes.appendChild(b);
    if(idx===1) setTimeout(()=>b.click(), 0);
  });
}

/* Lightbox story */
let lbIdx = 0;

function renderLightboxCopy(){
  // updates copy when language changes
  if(!ASSETS?.storyImages?.length) return;
  const item = ASSETS.storyImages[lbIdx];
  document.getElementById("lbTitle").textContent = (lang==="zh") ? item.zhTitle : item.enTitle;
  document.getElementById("lbDesc").textContent = (lang==="zh") ? item.zhDesc : item.enDesc;
}

function openLightbox(idx=0){
  if(!ASSETS?.storyImages?.length) return;
  lbIdx = idx;
  const lb = document.getElementById("lightbox");
  lb.classList.add("is-open");
  lb.setAttribute("aria-hidden","false");

  const item = ASSETS.storyImages[lbIdx];
  document.getElementById("lbImg").src = item.url;
  renderLightboxCopy();
}

function closeLightbox(){
  const lb = document.getElementById("lightbox");
  lb.classList.remove("is-open");
  lb.setAttribute("aria-hidden","true");
}

function stepLightbox(dir){
  const n = ASSETS?.storyImages?.length || 0;
  if(!n) return;
  lbIdx = (lbIdx + dir + n) % n;
  const item = ASSETS.storyImages[lbIdx];
  const img = document.getElementById("lbImg");
  img.style.opacity = "0.35";
  setTimeout(()=>{
    img.src = item.url;
    renderLightboxCopy();
    img.style.opacity = "1";
  }, 180);
}

function setupLightbox(){
  document.getElementById("openLightboxBtn")?.addEventListener("click", ()=>openLightbox(0));
  document.getElementById("lbClose")?.addEventListener("click", closeLightbox);
  document.getElementById("lbBackdrop")?.addEventListener("click", closeLightbox);
  document.getElementById("lbPrev")?.addEventListener("click", ()=>stepLightbox(-1));
  document.getElementById("lbNext")?.addEventListener("click", ()=>stepLightbox(1));
  window.addEventListener("keydown", (e)=>{
    const lb = document.getElementById("lightbox");
    if(!lb.classList.contains("is-open")) return;
    if(e.key === "Escape") closeLightbox();
    if(e.key === "ArrowLeft") stepLightbox(-1);
    if(e.key === "ArrowRight") stepLightbox(1);
  });
}

function setupCopy(){
  document.getElementById("copyChainBtn")?.addEventListener("click", async ()=>{
    const text = t("cta_d");
    try{
      await navigator.clipboard.writeText(text);
      alert(lang==="zh" ? "已复制！" : "Copied!");
    }catch{
      alert(lang==="zh" ? "复制失败，请手动复制" : "Copy failed—please copy manually.");
    }
  });
}

async function main(){
  await loadAssets();
  setupLang();
  applyI18n();

  setupReveal();
  animateCounts();
  setupTabs();

  renderHeroThumbs();
  startHeroAuto();

  renderQuiz();
  renderFlyway();

  setupLightbox();
  setupCopy();

  // initial bg
  setHeroBg(0);
}

main();
