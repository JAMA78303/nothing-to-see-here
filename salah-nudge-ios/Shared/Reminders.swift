import Foundation
import UserNotifications

/// Schedules local notifications ahead of time, so reminders arrive even when the app is closed.
/// iOS keeps at most 64 pending notifications, so this covers about three days and is refreshed
/// whenever the app opens, settings change, or the background refresh runs.
enum Reminders {
    private static let maxPending = 60

    static func requestPermission() async -> Bool {
        (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    static func reschedule(store: SharedStore = .shared, now: Date = .now) async {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()
        let settings = store.settings
        guard settings.notifications else { return }

        let schedule = Schedule(settings: settings, around: now, daysAhead: 3)
        let prayed = store.prayed
        var requests: [(Date, UNNotificationRequest)] = []

        func add(_ id: String, at date: Date, title: String, body: String, adhkar: AdhkarSet? = nil) {
            guard date > now else { return }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            if let adhkar { content.userInfo = ["adhkar": adhkar.rawValue] }
            let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)
            requests.append((date, UNNotificationRequest(identifier: id, content: content,
                                                         trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false))))
        }

        for w in schedule.windows where w.end > now && !prayed.contains(w.id) {
            let name = w.key.name, ends = schedule.clock(w.end)
            add("\(w.id):start", at: w.start, title: "\(name) has begun", body: "You have until \(ends) to pray.")
            add("\(w.id):warn", at: w.end.addingTimeInterval(-Level.warnThreshold),
                title: "About an hour left for \(name)", body: "\(name) ends at \(ends). A good time to pray.")
            add("\(w.id):late", at: w.end.addingTimeInterval(-Level.lateThreshold),
                title: "\(name): under 10 minutes left", body: "It ends at \(ends). Pray now.")
        }

        if settings.adhkarReminders {
            for day in schedule.days.dropFirst() {
                for a in schedule.adhkarWindows(for: day) where !store.isComplete(a.set, day: day.key) {
                    add("\(a.id):open", at: a.start.addingTimeInterval(20 * 60), title: "\(a.set.title) are due",
                        body: "Read them \(a.bestText), \(schedule.clock(a.best)).", adhkar: a.set)
                    add("\(a.id):closing", at: a.best.addingTimeInterval(-20 * 60), title: "\(a.set.title) not finished",
                        body: "Try to finish them before \(schedule.clock(a.best)).", adhkar: a.set)
                }
            }
        }

        for (_, request) in requests.sorted(by: { $0.0 < $1.0 }).prefix(maxPending) {
            try? await center.add(request)
        }
    }

    /// Drops the remaining reminders for a prayer once it is marked as prayed.
    static func cancel(prayerID: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(
            withIdentifiers: ["start", "warn", "late"].map { "\(prayerID):\($0)" })
    }

    static func cancel(adhkar set: AdhkarSet, day: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(
            withIdentifiers: ["open", "closing"].map { "\(day):\(set.rawValue):\($0)" })
    }
}
