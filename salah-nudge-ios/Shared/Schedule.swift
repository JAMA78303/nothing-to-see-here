import Foundation

struct Settings: Codable, Equatable {
    var cityName: String?          // nil means "My location"
    var latitude: Double
    var longitude: Double
    var timeZoneID: String
    var method: CalcMethod
    var hanafiAsr = false
    var notifications = false
    var adhkarReminders = true

    var timeZone: TimeZone { TimeZone(identifier: timeZoneID) ?? .current }
    var placeName: String { cityName ?? "My location" }

    static var `default`: Settings {
        let city = City.all.first { $0.timeZoneID == TimeZone.current.identifier } ?? City.all[0]
        return Settings(city: city)
    }

    init(city: City) {
        cityName = city.name
        latitude = city.latitude
        longitude = city.longitude
        timeZoneID = city.timeZoneID
        method = city.method
    }
}

struct PrayerWindow: Identifiable, Hashable {
    let key: PrayerKey
    let dayKey: String
    let start: Date
    let end: Date
    var id: String { "\(dayKey):\(key.rawValue)" }
}

/// How urgent the current prayer is.
enum Level: String {
    case ok      // more than an hour left
    case warn    // under an hour
    case late    // under ten minutes
    case done    // already prayed
    case idle    // no prayer due (sunrise to Dhuhr)

    static let warnThreshold: TimeInterval = 60 * 60
    static let lateThreshold: TimeInterval = 10 * 60

    var message: String {
        switch self {
        case .ok: "You have time"
        case .warn: "Less than an hour left"
        case .late: "Pray now, under 10 minutes left"
        case .done: "Prayed"
        case .idle: "No prayer due"
        }
    }
}

struct AdhkarWindow: Identifiable {
    enum State { case upcoming, open, closing, done, missed }

    let set: AdhkarSet
    let dayKey: String
    let start: Date
    let best: Date
    let end: Date
    let bestText: String
    var id: String { "\(dayKey):\(set.rawValue)" }

    func state(at now: Date, complete: Bool) -> State {
        if complete { return .done }
        if now < start { return .upcoming }
        if now >= end { return .missed }
        if now >= best || end.timeIntervalSince(now) <= 30 * 60 { return .closing }
        return .open
    }
}

/// Prayer windows from yesterday through `daysAhead` days from today, in the chosen place's time zone.
struct Schedule {
    struct Day {
        let key: String
        let times: DayTimes
    }

    let settings: Settings
    let days: [Day]          // days[0] is yesterday, days[1] today
    let windows: [PrayerWindow]

    init(settings: Settings, around date: Date = .now, daysAhead: Int = 1) {
        self.settings = settings
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = settings.timeZone
        let noon = cal.date(bySettingHour: 12, minute: 0, second: 0, of: date) ?? date
        days = (-1...(daysAhead + 1)).map { offset in
            let d = cal.date(byAdding: .day, value: offset, to: noon) ?? noon
            let c = cal.dateComponents([.year, .month, .day], from: d)
            let (y, m, dd) = (c.year ?? 2000, c.month ?? 1, c.day ?? 1)
            return Day(key: String(format: "%04d-%02d-%02d", y, m, dd),
                       times: PrayerTimes.compute(year: y, month: m, day: dd,
                                                  latitude: settings.latitude, longitude: settings.longitude,
                                                  method: settings.method, hanafiAsr: settings.hanafiAsr))
        }
        var all: [PrayerWindow] = []
        for i in 0..<(days.count - 1) {
            let day = days[i]
            for key in PrayerKey.allCases {
                let end = key.endsAt.map { day.times[$0] } ?? days[i + 1].times.fajr
                all.append(PrayerWindow(key: key, dayKey: day.key, start: day.times[key.startsAt], end: end))
            }
        }
        windows = all
    }

    var today: Day { days[1] }

    func current(at now: Date) -> PrayerWindow? { windows.first { $0.start <= now && now < $0.end } }
    func next(after now: Date) -> PrayerWindow? { windows.first { $0.start > now } }

    func level(at now: Date, prayed: Set<String>) -> Level {
        guard let w = current(at: now) else { return .idle }
        if prayed.contains(w.id) { return .done }
        let left = w.end.timeIntervalSince(now)
        if left <= Level.lateThreshold { return .late }
        if left <= Level.warnThreshold { return .warn }
        return .ok
    }

    func adhkarWindows(for day: Day) -> [AdhkarWindow] {
        [
            AdhkarWindow(set: .morning, dayKey: day.key, start: day.times.fajr, best: day.times.sunrise,
                         end: day.times.dhuhr, bestText: "best before sunrise"),
            AdhkarWindow(set: .evening, dayKey: day.key, start: day.times.asr, best: day.times.maghrib,
                         end: day.times.isha, bestText: "best before Maghrib"),
        ]
    }

    func clock(_ date: Date) -> String {
        date.formatted(Date.FormatStyle(date: .omitted, time: .shortened, timeZone: settings.timeZone))
    }
}

func formatLeft(_ seconds: TimeInterval) -> String {
    let m = max(0, Int((seconds / 60).rounded(.up)))
    let h = m / 60, r = m % 60
    return h > 0 ? "\(h)h \(String(format: "%02d", r))m" : "\(r) min"
}
