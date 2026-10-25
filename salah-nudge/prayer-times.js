/* ---------- Prayer time calculation (PrayTimes-style astronomical method) ---------- */
const DEG = Math.PI / 180;
const sin = d => Math.sin(d * DEG), cos = d => Math.cos(d * DEG), tan = d => Math.tan(d * DEG);
const asin = x => Math.asin(x) / DEG, acos = x => Math.acos(x) / DEG, atan2 = (y, x) => Math.atan2(y, x) / DEG, acot = x => Math.atan(1 / x) / DEG;
const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };

export const METHODS = {
  MWL:     { name: "Muslim World League", fajr: 18, isha: 17 },
  ISNA:    { name: "ISNA (North America)", fajr: 15, isha: 15 },
  Egypt:   { name: "Egyptian General Authority", fajr: 19.5, isha: 17.5 },
  Makkah:  { name: "Umm al-Qura, Makkah", fajr: 18.5, ishaMin: 90 },
  Karachi: { name: "University of Islamic Sciences, Karachi", fajr: 18, isha: 18 },
  Dubai:   { name: "Dubai", fajr: 18.2, isha: 18.2 },
  Singapore: { name: "MUIS / JAKIM (Singapore, Malaysia)", fajr: 20, isha: 18 },
  Turkey:  { name: "Diyanet (Turkey)", fajr: 18, isha: 17 },
};

function julian(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}
function sunPos(jd) {
  const D = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * D, 360);
  const q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360);
  const e = 23.439 - 0.00000036 * D;
  const RA = atan2(cos(e) * sin(L), cos(L)) / 15;
  return { decl: asin(sin(e) * sin(L)), eq: q / 15 - fix(RA, 24) };
}
// Returns Date objects for one local calendar day (y, m, d) at the given place.
export function computeDay(y, m, d, lat, lng, method, asrFactor) {
  const jd = julian(y, m, d) - lng / (15 * 24);
  const midDay = t => fix(12 - sunPos(jd + t).eq, 24);
  const angleTime = (angle, t, ccw) => {
    const decl = sunPos(jd + t).decl;
    const T = acos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) / 15;
    return midDay(t) + (ccw ? -T : T);
  };
  const asrTime = (f, t) => {
    const decl = sunPos(jd + t).decl;
    return angleTime(-acot(f + tan(Math.abs(lat - decl))), t);
  };
  const guess = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, isha: 18 };
  let t = { ...guess };
  for (let i = 0; i < 2; i++) {
    const p = k => (isNaN(t[k]) ? guess[k] : t[k]) / 24;
    t = {
      fajr: angleTime(method.fajr, p("fajr"), true),
      sunrise: angleTime(0.833, p("sunrise"), true),
      dhuhr: midDay(p("dhuhr")),
      asr: asrTime(asrFactor, p("asr")),
      sunset: angleTime(0.833, p("sunset")),
      isha: method.ishaMin ? NaN : angleTime(method.isha, p("isha")),
    };
  }
  // High-latitude fallback: angle-based portion of the night.
  const night = fix(t.sunrise - t.sunset, 24);
  const fajrPortion = method.fajr / 60 * night;
  if (isNaN(t.fajr) || fix(t.sunrise - t.fajr, 24) > fajrPortion) t.fajr = t.sunrise - fajrPortion;
  if (method.ishaMin) t.isha = t.sunset + method.ishaMin / 60;
  else {
    const ishaPortion = method.isha / 60 * night;
    if (isNaN(t.isha) || fix(t.isha - t.sunset, 24) > ishaPortion) t.isha = t.sunset + ishaPortion;
  }
  t.maghrib = t.sunset;
  const base = Date.UTC(y, m - 1, d);
  const out = {};
  for (const k of ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"]) {
    const h = t[k] - lng / 15;
    out[k] = new Date(Math.round((base + h * 3600e3) / 60000) * 60000);
  }
  return out;
}

