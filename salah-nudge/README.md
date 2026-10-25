# Salah Nudge

Prayer and adhkar reminders. The status panel shows the prayer whose window is open and how long is left:

- **Green**: more than 1 hour left
- **Yellow**: under 1 hour left
- **Red**: under 10 minutes left

It also nudges you about adhkar:

- **Morning adhkar** from Fajr until Dhuhr, best before sunrise
- **Evening adhkar** from Asr until Isha, best before Maghrib
- **After-salah adhkar** when you mark a prayer as prayed

Prayer times are calculated on the device (no API calls) from the chosen city or your location, using the selected method (MWL, ISNA, Umm al-Qura, Egyptian, Karachi, Dubai, MUIS/JAKIM, Diyanet) and Standard or Hanafi Asr.

## Run it

It is a static site with no build step. Serve the folder over HTTP (service workers do not run from `file://`):

```sh
cd salah-nudge
python3 -m http.server 8080
# open http://localhost:8080
```

Deploy it to any static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages) with `salah-nudge/` as the root. It needs HTTPS for install, location and notifications.

## Install and notifications

- **Android / desktop Chrome or Edge**: an Install bar appears. After installing, turn on "Show phone notifications" in Location and settings.
- **iPhone (iOS 16.4+)**: Share → Add to Home Screen, open it from the Home Screen, then turn on notifications.

Notifications fire while the app is open or running in the background. Phones suspend background apps, so a closed app will not alert you. Reliable alerts on a locked phone need Web Push from a small server that sends the reminders on schedule.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page markup |
| `styles.css` | Theme tokens (light and dark) and layout |
| `prayer-times.js` | Astronomical prayer-time calculation |
| `data.js` | Cities, prayers and adhkar text |
| `app.js` | State, rendering, nudges, settings, install |
| `sw.js` | Offline cache and notification taps |
| `manifest.webmanifest`, `icon*.{svg,png}` | Install metadata and icons |
