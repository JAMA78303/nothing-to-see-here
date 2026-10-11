import type { Backend } from "./backend";
import { CLIENT_RECORDED, TIERS, type Tier } from "./moments";

type Moment = {
  id: string;
  tier: Tier;
  name: string;
  blurb: string;
  /** Resolves false when the moment didn't land (e.g. the viewer ignored his link). */
  run: () => Promise<void | false>;
};
type RunOpts = { preview?: boolean; at?: number | null };

const VIDEOS = [
  { url: "https://www.youtube.com/watch?v=J---aiyznGQ", label: "cat-plays-music.link", back: "He played you off, didn't he." },
  { url: "https://www.youtube.com/watch?v=_OBlgSz8sSM", label: "brothers-being-nice.link", back: "Charlie had it coming." },
  { url: "https://www.youtube.com/watch?v=oavMtUWDBTM", label: "happiest-man-alive.link", back: "Ooh-ooh-ooh. Ahem. Sorry." },
  { url: "https://www.youtube.com/watch?v=EwTZ2xpQwpA", label: "weather-report.link", back: "Stay dry out there." },
];
const RICKROLL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const rand = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const fmt = (n: number) => n.toLocaleString("en-GB");

/**
 * Runs Gerald inside the markup from markup.ts. Returns a teardown function
 * that stops every timer and listener (React runs effects twice in dev).
 */
export function startGame(backend: Backend, opts: { devTools: boolean }): () => void {
  /* ---------- lifecycle ---------- */
  let dead = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const unlisteners: (() => void)[] = [];
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!dead) fn();
    }, ms);
    timers.add(t);
    return t;
  };
  const cancel = (t: ReturnType<typeof setTimeout> | undefined) => {
    if (t) {
      clearTimeout(t);
      timers.delete(t);
    }
  };
  // A sleep that never resolves after teardown, so running moments just stop.
  const sleep = (ms: number) => new Promise<void>((r) => later(r, ms));
  function listen<K extends keyof WindowEventMap>(t: Window, type: K, fn: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions): void;
  function listen<K extends keyof DocumentEventMap>(t: Document, type: K, fn: (e: DocumentEventMap[K]) => void, o?: AddEventListenerOptions): void;
  function listen<K extends keyof HTMLElementEventMap>(t: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void, o?: AddEventListenerOptions): void;
  function listen(t: EventTarget, type: string, fn: (e: never) => void, o?: AddEventListenerOptions) {
    t.addEventListener(type, fn as EventListener, o);
    unlisteners.push(() => t.removeEventListener(type, fn as EventListener, o));
  }

  /* ---------- elements ---------- */
  const E = (id: string) => document.getElementById(id) as HTMLElement;
  const S = (id: string) => document.getElementById(id) as unknown as SVGElement;
  const stage = E("stage");
  const svg = stage.querySelector("svg") as SVGSVGElement;
  const G = {
    gerald: S("gerald"), flip: S("flip"), abduct: S("abduct"), head: S("head"), hat: S("hat"),
    pupils: S("pupils"), lids: S("lids"), bag: S("bag"), sweat: S("sweat"), twin: S("twin"),
    nest1: S("nest1"), nest2: S("nest2"), ferrets: S("ferrets"), shadowArm: S("shadowArm"),
    shadowBody: S("shadowBody"), ufo: S("ufo"), beam: S("beam"), trio: S("trio"),
  };
  const bubble = E("bubble");
  const slip = E("slip") as HTMLAnchorElement;
  const reveal = E("reveal");
  const panel = E("panel");

  /* ---------- state ---------- */
  const PREFS = "ntsh:prefs";
  let pokes = 0;
  let muted = false;
  try {
    const p = JSON.parse(localStorage.getItem(PREFS) ?? "{}");
    pokes = +p.pokes || 0;
    muted = !!p.muted;
  } catch {}
  const savePrefs = () => {
    try {
      localStorage.setItem(PREFS, JSON.stringify({ pokes, muted }));
    } catch {}
  };
  let worldVisits = 0, myVisits = 0, milestone = 50000, ready = false, offline = false;
  let mode: "live" | "local" = "live";
  let seen = new Set<string>();
  let counts: Record<string, number> = {};
  const witnesses = (id: string) => counts[id] ?? 0;
  const arrivedAt = Date.now();

  /* ---------- helpers ---------- */
  const on = (el: Element | string) => (typeof el === "string" ? E(el) : el).classList.add("on");
  const off = (el: Element | string) => (typeof el === "string" ? E(el) : el).classList.remove("on");
  function play(el: Element, cls: string, ms: number) {
    el.classList.remove(cls);
    void el.getBoundingClientRect();
    el.classList.add(cls);
    return sleep(ms).then(() => el.classList.remove(cls));
  }
  const setPupils = (x: number, y: number) => {
    G.pupils.style.transform = `translate(${x}px,${y}px)`;
  };
  function svgPt(x: number, y: number) {
    const p = svg.createSVGPoint();
    p.x = x;
    p.y = y;
    const s = p.matrixTransform(svg.getScreenCTM()!);
    const r = stage.getBoundingClientRect();
    return { x: s.x - r.left, y: s.y - r.top };
  }
  function toSvg(cx: number, cy: number) {
    const p = svg.createSVGPoint();
    p.x = cx;
    p.y = cy;
    return p.matrixTransform(svg.getScreenCTM()!.inverse());
  }

  /* ---------- sound (all synthesised, no files) ---------- */
  let ac: AudioContext | null = null;
  let gestured = false; // browsers only allow sound after the first tap or keypress
  listen(window, "pointerdown", () => { gestured = true; }, { capture: true, once: true });
  listen(window, "keydown", () => { gestured = true; }, { capture: true, once: true });
  function audio() {
    if (muted || !gestured) return null;
    try {
      ac ??= new AudioContext();
      if (ac.state === "suspended") void ac.resume();
      return ac;
    } catch {
      return null;
    }
  }
  function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.01 + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function noise(dur: number, vol: number, fFrom: number, fTo: number) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + 0.01;
    const b = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b;
    f.type = "bandpass";
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(fFrom, t);
    f.frequency.exponentialRampToValueAtTime(fTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(a.destination);
    s.start(t);
  }
  const SFX = {
    tap: () => { const p = 0.8 + Math.random() * 0.4; tone("sine", 200 * p, 80 * p, 0.12, 0.28); noise(0.03, 0.07, 2200, 1500); },
    squeak: () => tone("triangle", 900 + Math.random() * 200, 1500, 0.09, 0.1),
    hmph: () => tone("sawtooth", 150, 105, 0.18, 0.05),
    whoosh: () => noise(0.35, 0.16, 400, 2400),
    boing: () => { tone("sine", 220, 620, 0.14, 0.14); tone("sine", 620, 260, 0.16, 0.1, 0.14); },
    honk: () => { tone("sawtooth", 330, 300, 0.12, 0.05); tone("square", 335, 0, 0.12, 0.03); },
    pop: () => tone("sine", 400, 1200, 0.06, 0.16),
    knock: () => { tone("sine", 140, 70, 0.09, 0.4); noise(0.05, 0.25, 900, 500); },
    gulp: () => { tone("sine", 620, 180, 0.13, 0.14); tone("sine", 520, 160, 0.12, 0.11, 0.17); },
    babble: (text: string) => {
      const n = Math.min(9, Math.max(1, Math.round(text.replace(/[^a-z]/gi, "").length / 3)));
      const base = 190 + Math.random() * 40;
      for (let i = 0; i < n; i++) tone("square", base * (1 + Math.random() * 0.45), 0, 0.05, 0.028, i * 0.075);
    },
    sting: (tier: Tier) =>
      (tier === "legend" ? [523, 659, 784, 1047, 1319] : tier === "big" ? [523, 659, 784, 1047] : [659, 880]).forEach((f, i) =>
        tone("triangle", f, 0, 0.4, 0.09, i * 0.09),
      ),
  };
  const POKE_SOUNDS = ["squeak", "boing", "hmph", "gulp", "honk", "squeak", "pop"] as const;
  // An original, cheesy little tune for his singing. Not the real song.
  function hum(offset: number) {
    const mel = [523, 659, 784, 659, 698, 880, 784, 659, 587, 698, 659, 523, 587, 659, 523, 0], bass = [131, 175, 196, 131];
    mel.forEach((f, i) => {
      if (f) tone("triangle", f, 0, 0.26, 0.08, offset + i * 0.28);
      if (i % 2 === 0) tone("sine", bass[Math.floor(i / 4) % 4], 0, 0.5, 0.12, offset + i * 0.28);
    });
  }
  function melody(disco = false) {
    const a = audio();
    if (!a) return;
    const notes = disco ? [392, 494, 587, 494, 392, 494, 587, 659, 587, 494, 440, 494] : [659, 587, 523, 494, 440, 415, 440];
    const step = disco ? 0.25 : 0.5, t0 = a.currentTime + 0.05;
    notes.forEach((f, i) => {
      const o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
      o.type = disco ? "square" : "triangle";
      o.frequency.value = f;
      lfo.frequency.value = 5.5;
      lg.gain.value = disco ? 0 : 6;
      lfo.connect(lg).connect(o.frequency);
      o.connect(g).connect(a.destination);
      const t = t0 + i * step;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(disco ? 0.04 : 0.09, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.95);
      o.start(t);
      lfo.start(t);
      o.stop(t + step);
      lfo.stop(t + step);
    });
  }
  const muteBtn = E("mute");
  const renderMute = () => {
    muteBtn.textContent = muted ? "Sound off" : "Sound on";
    muteBtn.setAttribute("aria-pressed", String(muted));
  };
  muteBtn.onclick = () => {
    muted = !muted;
    savePrefs();
    renderMute();
  };
  renderMute();

  /* ---------- speech + effects ---------- */
  let bubbleT: ReturnType<typeof setTimeout> | undefined;
  function say(text: string, ms = 1400, kind = "", x = 200, y = 104, top = false) {
    bubble.textContent = text;
    bubble.className = "bubble " + kind;
    if (top) {
      bubble.style.left = "50%";
      bubble.style.top = "72px";
    } else {
      const p = svgPt(x, y);
      bubble.style.left = p.x + "px";
      bubble.style.top = p.y + "px";
    }
    void bubble.offsetWidth;
    bubble.classList.add("show");
    if (kind !== "silent" && /[a-z]/i.test(text) && !text.includes("♪")) SFX.babble(text);
    cancel(bubbleT);
    bubbleT = later(() => bubble.classList.remove("show"), ms);
  }
  function floaty(txt: string, x: number, y: number, dx = 0) {
    const p = svgPt(x, y);
    const s = document.createElement("span");
    s.className = "floaty";
    s.textContent = txt;
    s.style.cssText = `left:${p.x}px;top:${p.y}px;font-size:26px;color:var(--lamp);--dx:${dx}px;--r:${dx / 3}deg`;
    stage.appendChild(s);
    later(() => s.remove(), 1700);
  }
  const CONF = ["#e8d27a", "#ff8a5c", "#c98bff", "#7fdc9a", "#5fd0ff", "#ff5fa2"];
  function confetti(x: number, y: number, n: number) {
    const p = svgPt(x, y);
    for (let i = 0; i < n; i++) {
      const c = document.createElement("i");
      c.className = "confetti";
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 140;
      c.style.cssText = `left:${p.x}px;top:${p.y}px;background:${CONF[i % CONF.length]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d + 60}px;--r:${Math.random() * 720}deg`;
      stage.appendChild(c);
      later(() => c.remove(), 1500);
    }
  }

  /* ---------- links ---------- */
  listen(slip, "pointerdown", (e) => e.stopPropagation());
  function offerLink(ms: number, url: string, label: string) {
    slip.href = url;
    E("slipLabel").textContent = label;
    return new Promise<boolean>((res) => {
      const p = svgPt(262, 300);
      slip.style.left = p.x + "px";
      slip.style.top = p.y + "px";
      slip.classList.add("show");
      SFX.squeak();
      const done = (v: boolean) => {
        cancel(t);
        slip.classList.remove("show");
        slip.onclick = null;
        res(v);
      };
      const t = later(() => done(false), ms);
      slip.onclick = () => void later(() => done(true), 60);
    });
  }
  // Resolves when the viewer comes back from the video tab (or soon, if it never opened).
  function waitForReturn(ms: number) {
    return new Promise<void>((res) => {
      let left = false, finished = false;
      const fin = () => {
        if (finished) return;
        finished = true;
        cancel(t1);
        cancel(t2);
        document.removeEventListener("visibilitychange", vis);
        window.removeEventListener("blur", blur);
        window.removeEventListener("focus", focus);
        later(res, 500);
      };
      const vis = () => {
        if (document.hidden) left = true;
        else if (left) fin();
      };
      const blur = () => { left = true; };
      const focus = () => { if (left) fin(); };
      document.addEventListener("visibilitychange", vis);
      window.addEventListener("blur", blur);
      window.addEventListener("focus", focus);
      unlisteners.push(fin);
      const t1 = later(fin, ms);
      const t2 = later(() => { if (!left) fin(); }, 2500);
    });
  }

  /* ---------- moments ---------- */
  const MOMENTS: Moment[] = [
    { id: "grape", tier: "small", name: "The Grape", blurb: "He showed you what he was hiding. It was a single grape.", run: async () => {
      G.gerald.classList.add("narrow"); await sleep(300); on("grape"); say("…", 900); await sleep(1100);
      say("It's a grape.", 1500); await sleep(1700); off("grape"); say("You saw nothing.", 1500); await sleep(1600); } },
    { id: "pigeon", tier: "small", name: "Under the Hat", blurb: "He lifted his hat. There was a pigeon. It looked at you.", run: async () => {
      setPupils(0, -4); await sleep(300); G.hat.classList.add("lift"); await sleep(500); say("coo.", 1300); await sleep(1600);
      setPupils(4, 1); await sleep(400); G.hat.classList.remove("lift"); await sleep(400); say("Don't.", 1400); await sleep(1500); } },
    { id: "sneeze", tier: "small", name: "Confetti Sneeze", blurb: "He sneezed. It was mostly confetti.", run: async () => {
      G.gerald.classList.add("wide"); say("ah…", 700); await sleep(800); say("ah…!", 700); await sleep(800);
      G.gerald.classList.remove("wide"); void play(G.gerald, "flinch", 400); say("ACHOO", 1000, "loud"); confetti(202, 200, 60); await sleep(1500);
      say("Excuse me.", 1400); await sleep(1500); } },
    { id: "shadow", tier: "small", name: "The Shadow Waved", blurb: "He stood perfectly still. His shadow did not.", run: async () => {
      setPupils(0, 1); G.shadowArm.classList.add("wave"); await sleep(2600);
      setPupils(5, -1); void play(G.head, "turnR", 1000); await sleep(250); G.shadowArm.classList.remove("wave"); await sleep(800);
      say("…", 1300); await sleep(1400); } },
    { id: "hello", tier: "small", name: "A Normal Hello", blurb: "For a moment he was warm, friendly and completely normal.", run: async () => {
      setPupils(0, 1); G.gerald.classList.add("wide", "hello"); await sleep(200);
      say("Oh, hello there! Lovely to see you. Mind how you go.", 2800, "warm"); await sleep(3000);
      G.gerald.classList.remove("wide", "hello"); void play(G.gerald, "flinch", 400); say("What.", 1400); await sleep(1500); } },
    { id: "twin", tier: "small", name: "There Are Two", blurb: "Another one peeked out from behind him. He did not notice.", run: async () => {
      setPupils(0, 1); on(G.twin); await play(G.twin, "peek", 3000); off(G.twin);
      G.gerald.classList.add("narrow"); say("Why are you looking behind me?", 1900); await sleep(2000); } },
    { id: "knock", tier: "small", name: "Knock Knock", blurb: "He walked right up to your screen and knocked on the glass.", run: async () => {
      setPupils(0, 1); G.gerald.classList.add("approach"); await sleep(900);
      for (let i = 0; i < 3; i++) { SFX.knock(); stage.classList.remove("shake"); void stage.offsetWidth; stage.classList.add("shake"); await sleep(280); }
      await sleep(300); say("Hello? Can you hear me in there?", 2000, "", 200, 60); await sleep(2200);
      say("It's very small in here.", 1600, "", 200, 60); await sleep(1800); G.gerald.classList.remove("approach"); await sleep(900); } },
    { id: "leave", tier: "small", name: "He Left", blurb: "He walked off the website. Then he came back.", run: async () => {
      say("Right. I'm off.", 1300); await sleep(1500); SFX.whoosh(); G.abduct.classList.add("walkoff"); await sleep(1300);
      E("goneMsg").classList.add("show"); await sleep(2800); E("goneMsg").classList.remove("show");
      G.abduct.classList.remove("walkoff"); setPupils(-5.5, 0); await play(G.abduct, "peekback", 800); say("Kidding.", 1400); await sleep(1500); } },
    { id: "timer", tier: "small", name: "He Kept Count", blurb: "He told you exactly how long you had been staring at him.", run: async () => {
      const s = Math.round((Date.now() - arrivedAt) / 1000), mins = Math.floor(s / 60);
      setPupils(0, 1); G.gerald.classList.add("narrow");
      say(`You've been staring at me for ${mins ? mins + (mins === 1 ? " minute and " : " minutes and ") : ""}${s % 60} seconds.`, 2400); await sleep(2600);
      say(myVisits > 1 ? `And this is visit number ${fmt(myVisits)}.` : "And this is your first visit.", 1900); await sleep(2100);
      say(myVisits > 3 ? "Get a hobby." : "I'm watching you too.", 1500); await sleep(1600); } },
    { id: "pressure", tier: "small", name: "The Pressure", blurb: "He noticed the counter at the top of the page and did not cope well.", run: async () => {
      setPupils(0, -4.5); G.gerald.classList.add("wide"); await sleep(600);
      say(`${fmt(worldVisits)} visits. All to look at me.`, 2200); await sleep(2400);
      G.sweat.classList.add("on"); SFX.gulp(); say("It's a lot of pressure.", 1700); await sleep(1900); } },

    { id: "ferrets", tier: "big", name: "Three Ferrets in a Coat", blurb: "The coat dropped. It was three ferrets the whole time.", run: async () => {
      void play(G.gerald, "flinch", 400); await sleep(300); G.flip.classList.add("gone"); on(G.ferrets);
      await sleep(500); say("We are one adult man.", 2200, "", 200, 244); await sleep(2500); say("Please leave.", 1400, "", 200, 244); await sleep(1600);
      off(G.ferrets); G.flip.classList.remove("gone"); await sleep(300); say("What?", 1200); await sleep(1300); } },
    { id: "backflip", tier: "big", name: "The Backflip", blurb: "He did a flawless standing backflip, then pretended he had not.", run: async () => {
      setPupils(0, 1); await sleep(400); await play(G.flip, "backflip", 1150); setPupils(-4, 0); await sleep(300); say("Anyway.", 1500); await sleep(1600); } },
    { id: "tux", tier: "big", name: "Black Tie", blurb: "The lights went out. When they came back he was in a tuxedo, holding a rose.", run: async () => {
      stage.classList.add("lightsoff"); await sleep(250); stage.classList.remove("lightsoff"); await sleep(120); stage.classList.add("lightsoff"); await sleep(900);
      G.gerald.classList.add("tux"); on("tux"); stage.classList.remove("lightsoff"); setPupils(0, 1); await sleep(400);
      say("Good evening.", 2000, "warm"); await sleep(2400); stage.classList.add("lightsoff"); await sleep(700);
      G.gerald.classList.remove("tux"); off("tux"); stage.classList.remove("lightsoff"); await sleep(300); say("What? Nothing happened.", 1600); await sleep(1700); } },
    { id: "violin", tier: "big", name: "The Sad Song", blurb: "He produced a tiny violin and played you something sad.", run: async () => {
      G.gerald.classList.add("narrow"); on("violin"); await sleep(300); melody();
      for (let i = 0; i < 7; i++) { floaty(["♪", "♫"][i % 2], 140 + Math.random() * 30, 230, -30 + Math.random() * 60); await sleep(420); }
      say('This one is called "Mine".', 1800); await sleep(1900); off("violin"); } },
    { id: "cake", tier: "big", name: "A Cake for You", blurb: "What he was hiding all along: a cake, with your visit number on it.", run: async () => {
      G.bag.classList.add("tuck"); setPupils(0, 1); await sleep(400); S("cakeText").textContent = "visit #" + fmt(myVisits);
      on("cake"); G.gerald.classList.add("wide"); await sleep(300); say("Happy… whatever this is.", 2200); await sleep(2400);
      G.gerald.classList.remove("wide"); G.gerald.classList.add("narrow"); say("Don't make it weird.", 1600); await sleep(1700); off("cake"); } },

    { id: "nesting", tier: "legend", name: "Gerald All the Way Down", blurb: "He took off his head. There was a smaller Gerald inside. And another.", run: async () => {
      setPupils(0, 1); on(G.nest1); on(G.nest2); await sleep(400); say("Fine.", 1000); await sleep(1100);
      await play(G.head, "liftoff", 900); G.head.style.opacity = "0"; await sleep(900);
      await play(G.nest1, "liftoff", 900); G.nest1.style.opacity = "0"; await sleep(700);
      say("That's all of us.", 1800, "", 200, 170); await sleep(2100);
      G.nest1.style.opacity = ""; void play(G.nest1, "dropin", 500); await sleep(400); G.head.style.opacity = ""; await play(G.head, "dropin", 500);
      off(G.nest1); off(G.nest2); say("Tell no one.", 1500); await sleep(1600); } },
    { id: "disco", tier: "legend", name: "The Disco", blurb: "The alley became a dance floor. He danced like nobody was watching. You were watching.", run: async () => {
      stage.classList.add("disco"); await sleep(900); G.gerald.classList.add("dance"); melody(true);
      for (let i = 0; i < 9; i++) { confetti(200, 120, 6); await sleep(600); }
      G.gerald.classList.remove("dance"); setPupils(0, 1); G.gerald.classList.add("narrow"); await sleep(500);
      say("You saw nothing.", 1700); await sleep(1800); stage.classList.remove("disco"); await sleep(600); } },
    { id: "ufo", tier: "legend", name: "Taken", blurb: "A UFO took him. He came back a bit sunburnt and will not discuss it.", run: async () => {
      setPupils(0, -4); G.ufo.classList.add("arrive"); await sleep(1100); G.beam.classList.add("on"); G.gerald.classList.add("wide"); await sleep(500);
      G.abduct.classList.add("up"); await sleep(1900); G.beam.classList.remove("on"); G.ufo.classList.remove("arrive"); await sleep(1300);
      say("brb", 1300, "", 200, 330); await sleep(2000);
      G.abduct.classList.remove("up"); G.gerald.classList.remove("wide"); G.gerald.classList.add("sunburn"); await play(G.abduct, "down", 900);
      later(() => G.gerald.classList.remove("sunburn"), 90000);
      setPupils(-4, 1); say("I don't want to talk about it.", 1900); await sleep(2000); } },
    { id: "confess", tier: "legend", name: "The Confession", blurb: "He looked straight at you and admitted it. All of it.", run: async () => {
      setPupils(0, 1); stage.classList.add("zoom"); G.gerald.classList.add("narrow"); await sleep(1100);
      say("Fine. It was me.", 1900, "", 0, 0, true); await sleep(2100); say("It was always me.", 1900, "", 0, 0, true); await sleep(2000);
      E("dsWitness").textContent = fmt(Math.max(1, witnesses("confess")));
      E("dossier").classList.add("show"); await sleep(700); E("dossier").classList.add("stamped"); await sleep(2300);
      E("dossier").classList.remove("show", "stamped"); stage.classList.remove("zoom"); await sleep(1000);
      say("…what are you looking at?", 1700); await sleep(1800); } },

    { id: "link", tier: "often", name: "The Link", blurb: "He slipped you a link. You clicked it. When you came back, he was singing.", run: async () => {
      G.gerald.classList.add("narrow"); setPupils(-5.5, 0); await sleep(500); setPupils(5.5, 0); await sleep(500); setPupils(0, 1);
      say("Psst. Want to see something?", 2200); await sleep(700);
      if (!(await offerLink(9000, RICKROLL, "totally-normal-video.link"))) { say("Your loss.", 1500); await sleep(1600); return false; }
      say("…", 30000, "silent"); await waitForReturn(30000);
      G.gerald.classList.remove("narrow"); G.gerald.classList.add("wide", "dance"); on("mic"); hum(0); hum(4.48);
      const la = ["♪ la la laaa ♪", "♪ doo doo ♪", "♪ ba-da-ba ♪", "♪ ooh ♪", "♪ la laaa ♪"];
      for (let i = 0; i < 18; i++) {
        if (i % 4 === 0) say(la[i / 4], 1500, "warm", 196, 104);
        if (i % 2 === 0) floaty(i % 4 ? "♫" : "♪", 186 + Math.random() * 30, 220, -40 + Math.random() * 80);
        await sleep(500);
      }
      G.gerald.classList.remove("dance", "wide"); off("mic"); setPupils(0, 1); G.gerald.classList.add("narrow");
      say("Gotcha.", 1600); await sleep(1700); } },
    { id: "video", tier: "often", name: "A Recommendation", blurb: "He sent you a video. He had opinions about it when you got back.", run: async () => {
      const v = rand(VIDEOS); setPupils(-5.5, 0); await sleep(400); setPupils(0, 1);
      say("You have to see this.", 1800); await sleep(600);
      if (!(await offerLink(9000, v.url, v.label))) { say("Fine. Philistine.", 1500); await sleep(1600); return false; }
      say("…", 30000, "silent"); await waitForReturn(30000);
      G.gerald.classList.add("wide"); say(v.back, 2000); await sleep(2200); } },

    { id: "belt", tier: "secret", name: "Three in a Coat", blurb: "You undid his belt. He is three people standing on each other's shoulders.", run: async () => {
      SFX.squeak(); void play(G.gerald, "flinch", 400); say("Hey—", 700); await sleep(500);
      SFX.whoosh(); G.flip.classList.add("gone"); on(G.trio); await sleep(700);
      say("Hi.", 1200, "", 200, 256); await sleep(1400);
      say("He's really heavy.", 1600, "", 200, 332); await sleep(1800);
      say("Close the coat, Kevin.", 1700); await sleep(1900);
      SFX.whoosh(); off(G.trio); G.flip.classList.remove("gone"); await sleep(300);
      G.gerald.classList.add("narrow"); say("Nothing to see here.", 1500); await sleep(1600); } },
  ];
  const byId = (id: string) => MOMENTS.find((m) => m.id === id);

  /* ---------- running a moment ---------- */
  let busy = false, track = true;
  function resetPose() {
    G.gerald.classList.value = G.gerald.classList.contains("sunburn") ? "sunburn" : "";
    for (const el of [G.flip, G.abduct, G.head, G.hat, G.bag, G.twin, G.nest1, G.nest2, G.ferrets, G.shadowArm, G.ufo, G.beam, G.trio]) {
      el.classList.value = el.classList.contains("prop") ? "prop" : "";
      el.style.opacity = "";
    }
    document.querySelectorAll("#gerald .prop").forEach((el) => off(el));
    slip.classList.remove("show");
    E("goneMsg").classList.remove("show");
    stage.classList.remove("lightsoff", "disco", "zoom", "shake");
    E("dossier").classList.remove("show", "stamped");
  }
  async function runMoment(m: Moment, o: RunOpts = {}) {
    busy = true;
    track = false;
    closeReveal();
    bubble.classList.remove("show");
    resetPose();
    let result: void | false = undefined;
    try {
      result = await m.run();
    } catch (e) {
      console.error(e);
    }
    if (dead) return;
    resetPose();
    busy = false;
    track = true;
    bubble.classList.remove("show");
    if (result === false) return; // e.g. he offered a link and you ignored it
    const repeat = CLIENT_RECORDED.includes(m.tier) && seen.has(m.id) && !o.preview;
    if (!o.preview) {
      const first = !seen.has(m.id);
      seen.add(m.id);
      render();
      if (first) {
        // Rare and legendary moments were already recorded by the server when it rolled them.
        const recorded = CLIENT_RECORDED.includes(m.tier) ? backend.recordSighting(m.id) : Promise.resolve();
        await Promise.race([recorded.then(() => backend.counts()).then((c) => { counts = c; }).catch(console.error), sleep(1200)]);
      }
    }
    if (repeat) return; // links and secrets only get the card the first time
    SFX.sting(m.tier);
    showReveal(m, o);
  }

  /* ---------- reveal card + sharing ---------- */
  const shareUrl = () => location.origin;
  function showReveal(m: Moment, { preview, at }: RunOpts) {
    const t = TIERS[m.tier];
    const chip = E("rvChip");
    chip.className = "chip " + m.tier;
    chip.textContent = at ? `Legendary · world visit #${fmt(at)}` : t.label;
    E("rvTitle").textContent = m.name;
    E("rvBlurb").textContent = m.blurb;
    E("rvOdds").textContent =
      m.tier === "legend" ? `Only on every ${fmt(milestone)}th visit to the site`
      : m.tier === "secret" ? "Found by clicking the right spot"
      : m.tier === "often" ? "He does this every minute or two"
      : `About 1 in ${fmt(t.odds)} visits`;
    const n = witnesses(m.id);
    E("rvRarity").textContent = preview ? "Preview. Not logged as seen."
      : n <= 1 ? "You're the first person to see this."
      : `You're one of ${fmt(n)} people who've seen this.`;
    const what = m.tier === "legend" ? `legendary, world visit #${fmt(at ?? 0)}` : m.tier === "secret" ? "a secret" : m.tier === "often" ? "he does this a lot" : `1 in ${fmt(t.odds)}`;
    (E("rvShare") as HTMLTextAreaElement).value = `I just saw Gerald do "${m.name}" (${what}). ${n > 1 ? `Only ${fmt(n)} people have seen it.` : "Nobody else has seen it yet."} The world has visited him ${fmt(worldVisits)} times. ${shareUrl()}`;
    E("rvCopy").textContent = "Share";
    reveal.classList.add("show");
  }
  function closeReveal() {
    reveal.classList.remove("show");
  }
  E("rvClose").onclick = closeReveal;
  E("rvCopy").onclick = async () => {
    const box = E("rvShare") as HTMLTextAreaElement, btn = E("rvCopy");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Nothing To See Here", text: box.value.replace(shareUrl(), "").trim(), url: shareUrl() });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(box.value);
      btn.textContent = "Copied";
    } catch {
      box.select();
      btn.textContent = "Press ⌘C / Ctrl+C";
    }
  };

  /* ---------- sightings ---------- */
  function renderPanel() {
    E("panelSub").textContent = `You've seen ${seen.size} of ${MOMENTS.length}.`;
    const tiers = E("tiers");
    tiers.innerHTML = "";
    for (const tier of ["often", "small", "big", "legend", "secret"] as Tier[]) {
      const h = document.createElement("div");
      h.className = "tier-h";
      h.textContent =
        tier === "legend" ? "Legendary · world milestones"
        : tier === "secret" ? "Secrets · found, not rolled"
        : tier === "often" ? "Everyday · he sends you links"
        : `${TIERS[tier].label}s · about 1 in ${fmt(TIERS[tier].odds)} visits`;
      const g = document.createElement("div");
      g.className = "grid";
      for (const m of MOMENTS.filter((x) => x.tier === tier)) {
        const has = seen.has(m.id), n = witnesses(m.id);
        const c = document.createElement("div");
        c.className = "card" + (has ? "" : " locked");
        c.innerHTML = `<span class="chip ${has ? tier : "unseen"}"></span><h4></h4><div class="meta"></div>`;
        c.querySelector(".chip")!.textContent = TIERS[tier].label;
        c.querySelector("h4")!.textContent = has ? m.name : "???";
        c.querySelector(".meta")!.textContent = n ? `Seen by ${fmt(n)} ${n === 1 ? "person" : "people"}` : "Nobody has seen this yet";
        // Replays are for moments you've already seen; dev tools can preview everything.
        if (has || opts.devTools) {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = has ? "Watch again" : "Preview";
          b.onclick = () => {
            panel.classList.remove("show");
            if (!busy) void runMoment(m, { preview: true });
          };
          c.appendChild(b);
        }
        g.appendChild(c);
      }
      tiers.append(h, g);
    }
  }
  E("openSightings").onclick = () => {
    renderPanel();
    panel.classList.add("show");
  };
  E("closeSightings").onclick = () => panel.classList.remove("show");

  /* ---------- counter ---------- */
  function render() {
    const into = worldVisits % milestone, toGo = milestone - into;
    E("worldCount").textContent = ready ? fmt(worldVisits) : "…";
    E("meter").style.width = (into / milestone) * 100 + "%";
    const tense = ready && toGo <= Math.max(3, Math.round(milestone * 0.02));
    E("world").classList.toggle("tense", tense);
    G.gerald.classList.toggle("tensed", tense && !busy);
    E("nextText").textContent = !ready ? " "
      : tense ? `Something is about to happen. ${fmt(toGo)} ${toGo === 1 ? "visit" : "visits"} to go.`
      : `Next world event at visit ${fmt(worldVisits + toGo)} · ${fmt(toGo)} to go`;
    E("meText").textContent = ready ? `Your visit #${fmt(myVisits)} · poked ${fmt(pokes)} ${pokes === 1 ? "time" : "times"}` : " ";
    E("seenCount").textContent = `${seen.size}/${MOMENTS.length}`;
    const live = mode === "live" && ready && !offline;
    E("pill").classList.toggle("live", live);
    E("pillText").textContent = offline ? "Offline" : !ready ? "Connecting" : live ? "Live" : "Local test mode";
  }

  /* ---------- eyes ---------- */
  let lastPointer = 0, lastPoke = 0, idleAsked = false;
  function lookAt(cx: number, cy: number) {
    const q = toSvg(cx, cy);
    const dx = q.x - 200, dy = q.y - 181, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 110);
    setPupils((dx / d) * 5.5 * k, (dy / d) * 3.5 * k);
  }
  listen(window, "pointermove", (e) => {
    lastPointer = Date.now();
    idleAsked = false;
    if (track && !busy) lookAt(e.clientX, e.clientY);
  });

  /* ---------- poking: just a sound ---------- */
  let pokeSaveT: ReturnType<typeof setTimeout> | undefined;
  function poke() {
    SFX.tap();
    if (Math.random() < 0.6) SFX[rand([...POKE_SOUNDS])]();
    void play(G.gerald, "poke", 160);
    pokes++;
    cancel(pokeSaveT);
    pokeSaveT = later(() => {
      savePrefs();
      render();
    }, 400);
  }
  listen(stage, "pointerdown", (e) => {
    if (e.button > 0) return;
    const q = toSvg(e.clientX, e.clientY);
    const onBelt = q.x > 138 && q.x < 262 && q.y > 312 && q.y < 344;
    const onHim = q.x > 105 && q.x < 295 && q.y > 95 && q.y < 445;
    lastPoke = Date.now();
    if (onBelt && !busy) {
      SFX.tap();
      void runMoment(byId("belt")!);
    } else if (onHim) poke();
    else if (!busy) lookAt(e.clientX, e.clientY);
  });
  listen(stage, "keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      lastPoke = Date.now();
      poke();
    }
  });

  /* ---------- idle + fourth wall ---------- */
  async function idle() {
    const quiet = Date.now() - Math.max(lastPointer, lastPoke);
    if (!busy && quiet > 2500) {
      const r = Math.random();
      if (r < 0.3) { setPupils(-5.5, 0); await sleep(550); setPupils(5.5, 0); await sleep(550); setPupils(0, 1); }
      else if (r < 0.45) { setPupils(-5.5, -1); void play(G.head, "turn", 1100); }
      else if (r < 0.55) say("♪ hm hm hmm", 1300);
      else if (r < 0.65) { G.hat.classList.add("down"); later(() => G.hat.classList.remove("down"), 700); }
      else if (r < 0.75) { G.bag.classList.add("tuck"); later(() => G.bag.classList.remove("tuck"), 900); }
      else if (r < 0.82) void play(G.gerald, "sidestep", 1200);
      else if (r < 0.88) { G.sweat.classList.remove("on"); void G.sweat.getBoundingClientRect(); G.sweat.classList.add("on"); }
    }
    if (!busy && quiet > 60000 && !idleAsked) { idleAsked = true; say("Are you still there?", 1800); }
    later(() => void idle(), 2000 + Math.random() * 2500);
  }
  const blink = () => {
    if (!busy) void play(G.lids, "blink", 110);
    later(blink, 2500 + Math.random() * 3500);
  };
  let hiddenAt = 0, lastLeaveLine = 0;
  listen(document, "visibilitychange", () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (!busy && hiddenAt && Date.now() - hiddenAt > 2000)
      later(() => { if (!busy) say(rand(["Where did you go?", "I saw that.", "Welcome back. I didn't move.", "Who were you talking to?"]), 1700); }, 500);
  });
  listen(document.documentElement, "mouseleave", () => {
    if (busy || Date.now() - lastLeaveLine < 25000) return;
    lastLeaveLine = Date.now();
    say(rand(["Don't go.", "Where are you going?", "Leaving already?"]), 1400);
  });
  // His shadow moves when he doesn't. Sometimes he notices.
  const SHADOW_MOVES = ["sdrift", "sstretch", "slean", "shop", "raise"];
  function shadowTick() {
    if (!busy && !document.hidden) {
      const k = rand(SHADOW_MOVES);
      if (k === "raise") void play(G.shadowArm, "raise", 1500);
      else void play(G.shadowBody, k, 1800);
      if (Math.random() < 0.3)
        later(() => {
          if (busy) return;
          track = false;
          setPupils(5.5, -1);
          void play(G.head, "turnR", 1000);
          later(() => { track = true; }, 1000);
        }, 1500);
    }
    later(shadowTick, 5000 + Math.random() * 9000);
  }
  // Every minute or two he slips you a link: the rick roll about half the time.
  const blocked = () => busy || document.hidden || panel.classList.contains("show") || reveal.classList.contains("show");
  function tryLink() {
    if (blocked()) return void later(tryLink, 5000);
    void runMoment(byId(Math.random() < 0.5 ? "link" : "video")!);
    later(tryLink, 60000 + Math.random() * 60000);
  }

  /* ---------- visits drive the world counter and the rolls ---------- */
  async function roll() {
    if (blocked() || !ready) return;
    try {
      const id = await backend.roll();
      const m = id && byId(id);
      if (m && !dead && !busy) await runMoment(m);
    } catch (e) {
      console.error(e);
    }
  }
  function greet(counted: boolean) {
    const h = new Date().getHours(), time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    let l: string;
    if (h < 5) l = `It's ${time}. Why are you here?`;
    else if (myVisits <= 1) l = "…who sent you?";
    else if (!counted) l = "You again. Already.";
    else if (myVisits % 10 === 0) l = `Visit ${fmt(myVisits)}. Are you following me?`;
    else l = rand(["You again.", "Oh. It's you.", "Back so soon?", `Visit number ${fmt(myVisits)}. I'm counting.`]);
    say(l, 1900);
  }
  async function arrive() {
    try {
      const s = await backend.start();
      if (dead) return;
      mode = s.mode;
      milestone = s.milestone;
      worldVisits = s.worldVisits;
      myVisits = s.myVisits;
      seen = new Set(s.seen);
      counts = s.counts;
      const a = await backend.arrive();
      if (dead) return;
      worldVisits = Math.max(worldVisits, a.worldVisits);
      myVisits = a.myVisits;
      ready = true;
      render();
      unlisteners.push(backend.onWorld((n) => { worldVisits = Math.max(worldVisits, n); render(); }));
      await sleep(500);
      if (a.legendary && byId(a.legendary)) {
        seen.add(a.legendary);
        counts = await backend.counts().catch(() => counts);
        await runMoment(byId(a.legendary)!, { at: a.visitNumber });
      } else {
        greet(a.counted);
        await sleep(2400);
        if (a.counted) await roll();
      }
    } catch (e) {
      console.error(e);
      offline = true;
      ready = true;
      render();
      say("…what.", 1400);
      return;
    }
    // Staying longer earns more chances; the server enforces its own cooldown.
    const rollEvery = () => { void roll(); later(rollEvery, 30000); };
    later(rollEvery, 30000);
    later(tryLink, 15000 + Math.random() * 15000);
  }

  render();
  setPupils(0, 1);
  later(() => void idle(), 4000);
  later(blink, 2000);
  later(shadowTick, 6000);
  void arrive();

  return () => {
    dead = true;
    timers.forEach(clearTimeout);
    timers.clear();
    unlisteners.forEach((u) => u());
    resetPose();
    bubble.classList.remove("show");
    closeReveal();
  };
}
