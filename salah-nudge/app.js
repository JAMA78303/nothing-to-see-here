import { METHODS, computeDay } from "./prayer-times.js";
import { CITIES, PRAYERS, ADHKAR, SET_NAMES } from "./data.js";

/* ---------- Storage ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem("sn:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("sn:" + k, JSON.stringify(v)); } catch {} },
};

/* ---------- Settings ---------- */
const browserTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; } })();
const defaultCity = CITIES.find(c => c[3] === browserTz) || CITIES[0];
let S = Object.assign({
  city: defaultCity[0], lat: defaultCity[1], lng: defaultCity[2], tz: defaultCity[3], method: defaultCity[4],
  asr: 1, sound: false, adhkar: true, notify: false,
}, store.get("settings", {}));
let prayed = store.get("prayed", {});
let counts = store.get("counts", {});
let offsetMin = 0;
let tab = null;

const $ = id => document.getElementById(id);

function localYMD(date, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(date).filter(x => x.type !== "literal").map(x => [x.type, +x.value]));
  return [p.year, p.month, p.day];
}
function localMinutes(date, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(date).filter(x => x.type !== "literal").map(x => [x.type, +x.value]));
  return p.hour * 60 + p.minute;
}
const shiftYMD = ([y, m, d], n) => { const t = new Date(Date.UTC(y, m - 1, d + n)); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; };
const ymdKey = a => a.map(n => String(n).padStart(2, "0")).join("-");
const fmtTime = d => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: S.tz });
function fmtLeft(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(m / 60), r = m % 60;
  return h ? `${h}h ${String(r).padStart(2, "0")}m` : `${r} min`;
}

/* ---------- Model: windows for yesterday, today, tomorrow ---------- */
function buildModel(now) {
  const today = localYMD(now, S.tz);
  const method = METHODS[S.method] || METHODS.MWL;
  const days = [-1, 0, 1, 2].map(n => {
    const ymd = shiftYMD(today, n);
    return { ymd, key: ymdKey(ymd), t: computeDay(ymd[0], ymd[1], ymd[2], +S.lat, +S.lng, method, +S.asr) };
  });
  const windows = [];
  for (let i = 0; i < 3; i++) {
    const day = days[i];
    for (const p of PRAYERS) {
      const end = p.until === "nextFajr" ? days[i + 1].t.fajr : day.t[p.until];
      windows.push({ ...p, day: day.key, start: day.t[p.key], end, id: day.key + ":" + p.key });
    }
  }
  const current = windows.find(w => w.start <= now && now < w.end) || null;
  const next = windows.find(w => w.start > now);
  const t = days[1].t;
  // Adhkar windows for the current day.
  const adhkarDue = [
    { set: "morning", start: t.fajr, end: t.dhuhr, best: t.sunrise, id: days[1].key + ":morning", bestText: "best before sunrise" },
    { set: "evening", start: t.asr, end: t.isha, best: t.maghrib, id: days[1].key + ":evening", bestText: "best before Maghrib" },
  ];
  return { now, today: days[1], windows, current, next, adhkarDue, method };
}

function levelFor(m) {
  const w = m.current;
  if (!w) return "idle";
  if (prayed[w.id]) return "done";
  const left = w.end - m.now;
  if (left <= 10 * 60e3) return "late";
  if (left <= 60 * 60e3) return "warn";
  return "ok";
}
function setComplete(set, dayKey) {
  const c = counts[dayKey + ":" + set] || {};
  return ADHKAR[set].every((x, i) => (c[i] || 0) >= x.n);
}
function setProgress(set, dayKey) {
  const c = counts[dayKey + ":" + set] || {};
  return ADHKAR[set].filter((x, i) => (c[i] || 0) >= x.n).length;
}
function dueState(a, m) {
  if (setComplete(a.set, m.today.key)) return "done";
  if (m.now < a.start) return "upcoming";
  if (m.now >= a.end) return "missed";
  if (a.end - m.now <= 30 * 60e3 || m.now >= a.best) return "closing";
  return "open";
}
function suggestedSet(m) {
  const due = m.adhkarDue.find(a => ["open", "closing"].includes(dueState(a, m)));
  if (due) return due.set;
  return "after";
}

/* ---------- Render ---------- */
let M;
function render() {
  const now = new Date(Date.now() + offsetMin * 60e3);
  M = buildModel(now);
  const lvl = levelFor(M);
  const arch = $("arch");
  arch.dataset.level = lvl;
  document.documentElement.style.setProperty("--tone", `var(--${{ ok: "ok", warn: "warn", late: "late" }[lvl] || "accent"})`);

  $("cityLabel").textContent = S.city || "Custom location";
  $("gregLabel").textContent = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", timeZone: S.tz });
  try { $("hijriLabel").textContent = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric", timeZone: S.tz }).format(now); } catch { $("hijriLabel").textContent = ""; }
  $("clockLabel").textContent = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: S.tz }) + (offsetMin ? " (preview)" : "");
  $("methodLabel").textContent = M.method.name + (S.asr == 2 ? " · Hanafi Asr" : "");

  const w = M.current, nx = M.next;
  if (w && lvl !== "done") {
    $("archEyebrow").textContent = `Time left to pray`;
    $("archName").innerHTML = `${w.name}<span class="ar" lang="ar">${w.ar}</span>`;
    $("archCount").textContent = fmtLeft(w.end - now);
    $("archChip").textContent = { ok: "You have time", warn: "Less than an hour left", late: "Pray now, under 10 minutes left" }[lvl];
    $("archSub").textContent = `${w.name} began at ${fmtTime(w.start)} and ends at ${w.untilName} (${fmtTime(w.end)}).`;
    $("archMark").hidden = false;
    $("archMark").textContent = `Mark ${w.name} as prayed`;
  } else if (w && lvl === "done") {
    $("archEyebrow").textContent = `${w.name} prayed`;
    $("archName").innerHTML = `${nx.name}<span class="ar" lang="ar">${nx.ar}</span>`;
    $("archCount").textContent = "in " + fmtLeft(nx.start - now);
    $("archChip").textContent = `Next adhan at ${fmtTime(nx.start)}`;
    $("archSub").textContent = setComplete("after", M.today.key) ? "Well done. You will be nudged when the next prayer begins." : "Take a minute for the after-salah adhkar while you are still seated.";
    $("archMark").hidden = false;
    $("archMark").textContent = `Undo ${w.name}`;
  } else {
    $("archEyebrow").textContent = "No prayer due";
    $("archName").innerHTML = `${nx.name}<span class="ar" lang="ar">${nx.ar}</span>`;
    $("archCount").textContent = "in " + fmtLeft(nx.start - now);
    $("archChip").textContent = `Adhan at ${fmtTime(nx.start)}`;
    $("archSub").textContent = "The sun has risen, so Fajr has ended. Duha can be prayed until shortly before Dhuhr.";
    $("archMark").hidden = true;
  }

  renderTimeline();
  renderList();
  renderAdhkar();
  document.title = w && lvl !== "done" ? `${{ ok: "🟢", warn: "🟡", late: "🔴" }[lvl]} ${w.name} · ${fmtLeft(w.end - now)} left` : "Salah Nudge";
  checkNudges(lvl);
}

function renderTimeline() {
  const t = M.today.t, tz = S.tz, now = M.now;
  const pct = d => (localMinutes(d, tz) / 1440 * 100).toFixed(2) + "%";
  const keys = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
  let html = `<div class="bar">`;
  for (const p of PRAYERS) {
    const s = localMinutes(t[p.key], tz);
    const e = p.key === "isha" ? 1440 : localMinutes(t[p.until], tz);
    const cur = M.current && M.current.day === M.today.key && M.current.key === p.key;
    html += `<div class="seg${cur ? " cur" : ""}" style="left:${(s / 1440 * 100).toFixed(2)}%;width:${(Math.max(0, e - s) / 1440 * 100).toFixed(2)}%"></div>`;
  }
  // Isha that carries over from the previous night, shown from midnight to Fajr.
  const f = localMinutes(t.fajr, tz);
  const ishaCur = M.current && M.current.key === "isha" && M.current.day !== M.today.key;
  html += `<div class="seg${ishaCur ? " cur" : ""}" style="left:0;width:${(f / 1440 * 100).toFixed(2)}%;border-left:0"></div></div>`;
  keys.forEach((k, i) => {
    const label = k === "sunrise" ? "Sunrise" : PRAYERS.find(p => p.key === k).name;
    html += `<div class="mark ${i % 2 ? "down" : "up"}" style="left:${pct(t[k])}">${label} <span class="num">${fmtTime(t[k])}</span></div>`;
  });
  html += `<div class="now" style="left:${pct(now)}" title="Now"></div>`;
  $("track").innerHTML = html;
}

function renderList() {
  const t = M.today.t;
  const rows = [];
  let done = 0;
  for (const p of PRAYERS) {
    const id = M.today.key + ":" + p.key;
    const isCur = M.current && M.current.id === id;
    const started = t[p.key] <= M.now;
    const isPrayed = !!prayed[id];
    if (isPrayed) done++;
    const cls = [isCur ? "cur" : "", isPrayed ? "prayed" : "", !isCur && started ? "past" : ""].join(" ");
    rows.push(`<li class="${cls}"><span class="dot"></span><span class="nm">${p.name}<span class="ar" lang="ar">${p.ar}</span></span>
      <span class="num">${fmtTime(t[p.key])}</span>
      <button class="tick" type="button" data-id="${id}" aria-pressed="${isPrayed}" ${started ? "" : "disabled"} aria-label="Mark ${p.name} as prayed">${isPrayed ? "Prayed" : "Mark"}</button></li>`);
    if (p.key === "fajr") rows.push(`<li class="sun"><span></span><span>Sunrise</span><span class="num">${fmtTime(t.sunrise)}</span><span></span></li>`);
  }
  $("plist").innerHTML = rows.join("");
  $("prayedCount").textContent = `${done} of 5 prayed today`;
}

function renderAdhkar() {
  const sug = suggestedSet(M);
  if (!tab) tab = sug;
  $("adhkarSuggest").textContent = `Suggested now: ${SET_NAMES[sug]}`;
  const dueHtml = M.adhkarDue.map(a => {
    const st = dueState(a, M);
    const prog = setProgress(a.set, M.today.key), total = ADHKAR[a.set].length;
    const pill = { done: ["done", "Done"], open: ["open", "Due now"], closing: ["closing", "Closing soon"], upcoming: ["", "Later"], missed: ["", "Window passed"] }[st];
    const meta = st === "upcoming" ? `From ${fmtTime(a.start)}, ${a.bestText} (${fmtTime(a.best)})`
      : st === "missed" ? `Window was ${fmtTime(a.start)} to ${fmtTime(a.end)}`
      : `${prog} of ${total} done · ${a.bestText} (${fmtTime(a.best)}) · until ${fmtTime(a.end)}`;
    return `<div class="due-row" data-state="${st}"><b>${SET_NAMES[a.set]}</b><span class="pill ${pill[0]}">${pill[1]}</span><span class="meta">${meta}</span></div>`;
  }).join("");
  const afterProg = setProgress("after", M.today.key);
  $("due").innerHTML = dueHtml + `<div class="due-row" data-state="${afterProg === ADHKAR.after.length ? "done" : ""}"><b>After each salah</b><span class="pill">${afterProg}/${ADHKAR.after.length} today</span><span class="meta">Nudged when you mark a prayer as prayed</span></div>`;

  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.set === tab)));
  const c = counts[M.today.key + ":" + tab] || {};
  $("dlist").innerHTML = ADHKAR[tab].map((x, i) => {
    const v = Math.min(c[i] || 0, x.n), r = 20, circ = 2 * Math.PI * r;
    return `<button type="button" class="dhikr${v >= x.n ? " full" : ""}" data-i="${i}" aria-label="${(x.name || x.tr)}: ${v} of ${x.n}">
      ${x.ar ? `<span class="ar" lang="ar">${x.ar}</span>` : `<span class="nm">${x.name}</span>`}
      <span class="txt">${x.tr ? `<span class="tr">${x.tr}</span>` : ""}<span class="en">${x.en}</span></span>
      <span class="count"><svg viewBox="0 0 48 48" aria-hidden="true"><circle class="bg" cx="24" cy="24" r="${r}"/><circle class="fg" cx="24" cy="24" r="${r}" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - v / x.n)}"/></svg>${v}/${x.n}</span>
    </button>`;
  }).join("");
}

/* ---------- Nudges ---------- */
let lastStage = null, lastDue = {}, firstRun = true;
function checkNudges(lvl) {
  const w = M.current;
  const stage = w ? w.id + ":" + lvl : "idle";
  if (!firstRun && stage !== lastStage && w) {
    if (lvl === "ok" && lastStage && !lastStage.startsWith(w.id)) nudge("ok", `${w.name} has begun`, `You have until ${fmtTime(w.end)} to pray.`);
    if (lvl === "warn") nudge("warn", `About an hour left for ${w.name}`, `${w.name} ends at ${fmtTime(w.end)}. A good time to pray.`);
    if (lvl === "late") nudge("late", `${w.name}: under 10 minutes left`, `It ends at ${fmtTime(w.end)}. Pray now.`);
  }
  if (S.adhkar) {
    for (const a of M.adhkarDue) {
      const st = dueState(a, M);
      if (!firstRun && lastDue[a.id] && lastDue[a.id] !== st) {
        if (st === "open") nudge("ok", `${SET_NAMES[a.set]} are due`, `Read them ${a.bestText}, ${fmtTime(a.best)}.`, a.set);
        if (st === "closing") nudge("warn", `${SET_NAMES[a.set]} not finished`, `The window closes at ${fmtTime(a.end)}.`, a.set);
      }
      lastDue[a.id] = st;
    }
  }
  lastStage = stage; firstRun = false;
}
function nudge(level, title, body, set) {
  const tone = { ok: "var(--ok)", warn: "var(--warn)", late: "var(--late)" }[level] || "var(--accent)";
  const el = document.createElement("div");
  el.className = "toast"; el.style.setProperty("--tone", tone);
  el.innerHTML = `<div class="stripe"></div><div><b></b><span></span></div><button type="button" aria-label="Dismiss">×</button>`;
  el.querySelector("b").textContent = title;
  el.querySelector("span").textContent = body;
  if (set) { el.style.cursor = "pointer"; el.addEventListener("click", e => { if (e.target.tagName !== "BUTTON") openSet(set); el.remove(); }); }
  el.querySelector("button").addEventListener("click", () => el.remove());
  const box = $("toasts");
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 15000);
  if (S.sound) chime(level);
  systemNotify(title, body, set);
}

/* ---------- System notifications (via the service worker, so they show while backgrounded) ---------- */
const canNotify = "Notification" in window && "serviceWorker" in navigator;
async function systemNotify(title, body, set) {
  if (!S.notify || !canNotify || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, { body, tag: "salah-nudge:" + title, icon: "icon-192.png", badge: "icon-192.png", data: { set: set || null } });
  } catch {}
}
navigator.serviceWorker?.addEventListener("message", e => { if (e.data?.type === "open-adhkar" && e.data.set) openSet(e.data.set); });
let ctx;
function chime(level) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = level === "late" ? [660, 660, 660] : level === "warn" ? [587, 784] : [523, 659];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + i * 0.32;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
      o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + 0.65);
    });
  } catch {}
}

/* ---------- Interactions ---------- */
function togglePrayed(id) {
  if (prayed[id]) delete prayed[id]; else {
    prayed[id] = Date.now();
    const name = PRAYERS.find(p => id.endsWith(":" + p.key)).name;
    if (S.adhkar) nudge("done", `${name} marked as prayed`, "Tap here for the after-salah adhkar.", "after");
  }
  store.set("prayed", prayed); render();
}
function openSet(set) {
  tab = set; renderAdhkar();
  $("adhkarCard").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
$("archMark").addEventListener("click", () => { if (M.current) togglePrayed(M.current.id); });
$("archAdhkar").addEventListener("click", () => openSet(levelFor(M) === "done" ? "after" : suggestedSet(M)));
$("plist").addEventListener("click", e => { const b = e.target.closest(".tick"); if (b && !b.disabled) togglePrayed(b.dataset.id); });
$("tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { tab = b.dataset.set; renderAdhkar(); } });
$("dlist").addEventListener("click", e => {
  const b = e.target.closest(".dhikr"); if (!b) return;
  const k = M.today.key + ":" + tab, i = +b.dataset.i;
  counts[k] = counts[k] || {};
  const max = ADHKAR[tab][i].n;
  counts[k][i] = (counts[k][i] || 0) >= max ? 0 : (counts[k][i] || 0) + 1;
  if (navigator.vibrate) try { navigator.vibrate(8); } catch {}
  store.set("counts", counts); render();
});
$("resetCounts").addEventListener("click", () => { delete counts[M.today.key + ":" + tab]; store.set("counts", counts); render(); });

// Preview scrubber
$("offset").addEventListener("input", e => {
  offsetMin = +e.target.value;
  $("offsetLabel").textContent = offsetMin === 0 ? "Live" : (offsetMin > 0 ? "+" : "−") + fmtLeft(Math.abs(offsetMin) * 60e3);
  render();
});
function buildJumps() {
  const t = M.today.t;
  const real = Date.now();
  const opts = [
    ["Live", null],
    ["Asr, plenty of time", new Date(+t.asr + 20 * 60e3)],
    ["Asr, 50 min left", new Date(+t.maghrib - 50 * 60e3)],
    ["Asr, 8 min left", new Date(+t.maghrib - 8 * 60e3)],
    ["Just after Fajr", new Date(+t.fajr + 5 * 60e3)],
  ];
  $("jumps").innerHTML = opts.map(([l], i) => `<button class="jump" type="button" data-i="${i}">${l}</button>`).join("");
  $("jumps").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    const d = opts[+b.dataset.i][1];
    offsetMin = d ? Math.max(-720, Math.min(720, Math.round((d - real) / 60e3))) : 0;
    $("offset").value = offsetMin; $("offset").dispatchEvent(new Event("input"));
  };
}

// Settings
function fillSettings() {
  $("city").innerHTML = CITIES.map(c => `<option>${c[0]}</option>`).join("") + `<option value="">Custom location</option>`;
  $("city").value = S.city;
  let zones = [];
  try { zones = Intl.supportedValuesOf("timeZone"); } catch { zones = [...new Set(CITIES.map(c => c[3]))]; }
  if (!zones.includes(S.tz)) zones.unshift(S.tz);
  $("tz").innerHTML = zones.map(z => `<option>${z}</option>`).join("");
  $("method").innerHTML = Object.entries(METHODS).map(([k, m]) => `<option value="${k}">${m.name}</option>`).join("");
  $("lat").value = S.lat; $("lng").value = S.lng; $("tz").value = S.tz; $("method").value = S.method;
  $("asr").value = S.asr; $("soundOn").checked = S.sound; $("adhkarOn").checked = S.adhkar;
  $("notifyOn").checked = S.notify && canNotify && Notification.permission === "granted";
  $("notifyOn").disabled = !canNotify;
  if (!canNotify) $("notifyHint").textContent = "This browser cannot show notifications. On iPhone, add Salah Nudge to your Home Screen, then open it from there.";
}
function saveSettings() { store.set("settings", S); tab = null; lastStage = null; firstRun = true; render(); buildJumps(); }
$("city").addEventListener("change", e => {
  const c = CITIES.find(x => x[0] === e.target.value);
  if (c) { S = { ...S, city: c[0], lat: c[1], lng: c[2], tz: c[3], method: c[4] }; } else S.city = "";
  fillSettings(); saveSettings();
});
for (const id of ["lat", "lng"]) $(id).addEventListener("change", e => {
  const v = parseFloat(e.target.value);
  if (isNaN(v)) { e.target.value = S[id]; return; }
  S[id] = v; S.city = ""; $("city").value = ""; saveSettings();
});
$("tz").addEventListener("change", e => { S.tz = e.target.value; S.city = ""; $("city").value = ""; saveSettings(); });
$("method").addEventListener("change", e => { S.method = e.target.value; saveSettings(); });
$("asr").addEventListener("change", e => { S.asr = +e.target.value; saveSettings(); });
$("soundOn").addEventListener("change", e => { S.sound = e.target.checked; store.set("settings", S); if (S.sound) chime("ok"); });
$("adhkarOn").addEventListener("change", e => { S.adhkar = e.target.checked; store.set("settings", S); });
$("notifyOn").addEventListener("change", async e => {
  if (!e.target.checked) { S.notify = false; store.set("settings", S); return; }
  const result = await Notification.requestPermission();
  S.notify = result === "granted";
  e.target.checked = S.notify;
  store.set("settings", S);
  if (S.notify) systemNotify("Notifications are on", "You will be nudged as prayer and adhkar times approach.");
  else $("notifyHint").textContent = "Notifications are blocked. Allow them for this site in your browser settings, then try again.";
});
$("locate").addEventListener("click", () => {
  const btn = $("locate");
  if (!navigator.geolocation) { btn.textContent = "Location unavailable"; return; }
  btn.textContent = "Finding you…";
  navigator.geolocation.getCurrentPosition(pos => {
    S.lat = +pos.coords.latitude.toFixed(4); S.lng = +pos.coords.longitude.toFixed(4);
    S.tz = browserTz; S.city = "";
    btn.textContent = "Use my location";
    fillSettings(); saveSettings();
  }, () => { btn.textContent = "Location blocked. Pick a city instead"; }, { maximumAge: 6 * 3600e3, timeout: 15000 });
});

/* ---------- Install ---------- */
let installEvent = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvent = e; $("installBar").hidden = false; });
$("installBtn").addEventListener("click", async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null; $("installBar").hidden = true;
});
window.addEventListener("appinstalled", () => { $("installBar").hidden = true; });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

fillSettings();
render();
buildJumps();
if (location.hash === "#adhkar") openSet(suggestedSet(M));
setInterval(render, 1000);
