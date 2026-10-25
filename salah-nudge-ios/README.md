# Salah Nudge for iPhone

Native iPhone app and widgets for Salah Nudge, the prayer and adhkar reminder. It works the same way as the web app in `../salah-nudge/`, plus:

- **Home Screen widgets** (small and medium) that turn **green**, **yellow** (under 1 hour left) and **red** (under 10 minutes left) on time, even while the app is closed. The countdown ticks live.
- **Lock Screen widgets**: a ring showing how much of the prayer window is left, a line with the countdown, and a one-line inline version above the clock.
- **A "Prayed" button on the widget**, so you can mark the current prayer without opening the app.
- **Reminders that arrive with the app closed**: when each prayer begins, when about an hour is left, and when 10 minutes are left, plus morning and evening adhkar.
- **Use my location**, the same calculation methods as the web app, and Hanafi Asr.

Prayer times are calculated on the phone. Nothing is sent anywhere.

## What you need

- A Mac with Xcode 16 or later.
- Your iPhone (iOS 17 or later; the iPhone 17 is fine) and a USB cable for the first install.
- An Apple ID signed in to Xcode (Xcode › Settings › Accounts).

## Build and install

1. Install XcodeGen, which creates the Xcode project from `project.yml`:
   ```sh
   brew install xcodegen
   ```
2. Open `project.yml` and set:
   - `BUNDLE_PREFIX` to something unique to you, such as `com.yourname`.
   - `DEVELOPMENT_TEAM` to your team ID. Xcode shows it under Settings › Accounts › your Apple ID. You can also leave it empty and pick the team in each target's Signing & Capabilities tab.
3. Generate and open the project:
   ```sh
   cd salah-nudge-ios
   xcodegen
   open SalahNudge.xcodeproj
   ```
4. Plug in your iPhone, select it as the run destination, and press Run. The first time, iOS asks you to turn on **Developer Mode** (Settings › Privacy & Security › Developer Mode) and to trust your developer profile (Settings › General › VPN & Device Management).
5. In the app, open Settings (the gear), pick your city or tap **Use my location**, and turn on **Prayer reminders**.
6. Add the widgets: touch and hold the Home Screen › Edit › Add Widget › Salah Nudge. For the Lock Screen, touch and hold the Lock Screen › Customize › Lock Screen › tap the widget area.

### Free Apple ID or paid developer account

With a free Apple ID, apps you install yourself stop opening after 7 days. Press Run in Xcode again to renew it. The app and widget share data through an **App Group**. If Xcode says it cannot register the App Group with your free account, you need the Apple Developer Program ($99 a year). That also removes the 7-day limit and lets you share the app through TestFlight.

## How reminders work

iOS lets an app schedule up to 64 reminders in advance. Salah Nudge schedules about three days ahead. It tops them up every time you open the app, whenever you change settings, and when iOS gives it background time (usually at least once a day). If you don't open the app for several days and iOS skips the background refresh, reminders run out until you open it again.

Marking a prayer as prayed, in the app or on the widget, cancels the rest of that prayer's reminders. Finishing the morning or evening adhkar cancels their reminders too.

## Project layout

| Folder | Contents |
| --- | --- |
| `Shared/` | Used by both the app and the widget: prayer-time calculation, schedule and colour levels, adhkar text, saved data, reminders, the "Prayed" widget action, colours |
| `App/` | The app: main screen, adhkar counters, settings, location, background refresh |
| `Widget/` | The widget extension: timeline (one entry at every colour change) and the five widget layouts |
| `project.yml` | XcodeGen project definition; the generated `SalahNudge.xcodeproj` is not committed |

## Status

This code was written without access to a Mac, so it has not been compiled or run yet. Expect a few small compile fixes the first time you build. Paste any Xcode errors back and they can be fixed quickly. The prayer-time calculation is a direct port of the web app's, which was checked against London, Makkah, New York and Sydney.
