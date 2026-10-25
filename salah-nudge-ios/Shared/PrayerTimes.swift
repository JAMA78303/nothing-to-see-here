import Foundation

/// Calculation methods: twilight angles for Fajr and Isha (Umm al-Qura uses a fixed 90 minutes after Maghrib).
enum CalcMethod: String, CaseIterable, Codable, Identifiable {
    case mwl, isna, egypt, makkah, karachi, dubai, singapore, turkey

    var id: String { rawValue }

    var name: String {
        switch self {
        case .mwl: "Muslim World League"
        case .isna: "ISNA (North America)"
        case .egypt: "Egyptian General Authority"
        case .makkah: "Umm al-Qura, Makkah"
        case .karachi: "University of Islamic Sciences, Karachi"
        case .dubai: "Dubai"
        case .singapore: "MUIS / JAKIM (Singapore, Malaysia)"
        case .turkey: "Diyanet (Turkey)"
        }
    }

    var fajrAngle: Double {
        switch self {
        case .mwl, .karachi, .turkey: 18
        case .isna: 15
        case .egypt: 19.5
        case .makkah: 18.5
        case .dubai: 18.2
        case .singapore: 20
        }
    }

    /// nil when Isha is a fixed interval after Maghrib.
    var ishaAngle: Double? {
        switch self {
        case .mwl, .turkey: 17
        case .isna: 15
        case .egypt: 17.5
        case .makkah: nil
        case .karachi: 18
        case .dubai: 18.2
        case .singapore: 18
        }
    }

    var ishaMinutesAfterMaghrib: Double? { self == .makkah ? 90 : nil }
}

enum TimeKey: String, CaseIterable, Codable {
    case fajr, sunrise, dhuhr, asr, maghrib, isha
}

struct DayTimes: Codable, Hashable {
    var fajr, sunrise, dhuhr, asr, maghrib, isha: Date

    subscript(key: TimeKey) -> Date {
        switch key {
        case .fajr: fajr
        case .sunrise: sunrise
        case .dhuhr: dhuhr
        case .asr: asr
        case .maghrib: maghrib
        case .isha: isha
        }
    }
}

/// Astronomical prayer-time calculation (the PrayTimes method), done entirely on device.
enum PrayerTimes {
    private static func rad(_ d: Double) -> Double { d * .pi / 180 }
    private static func deg(_ r: Double) -> Double { r * 180 / .pi }
    private static func dsin(_ d: Double) -> Double { sin(rad(d)) }
    private static func dcos(_ d: Double) -> Double { cos(rad(d)) }
    private static func dtan(_ d: Double) -> Double { tan(rad(d)) }
    private static func fix(_ a: Double, _ b: Double) -> Double {
        let r = a - b * (a / b).rounded(.down)
        return r < 0 ? r + b : r
    }

    private static func julian(_ year: Int, _ month: Int, _ day: Int) -> Double {
        var y = Double(year), m = Double(month)
        if m <= 2 { y -= 1; m += 12 }
        let a = (y / 100).rounded(.down)
        let b = 2 - a + (a / 4).rounded(.down)
        return (365.25 * (y + 4716)).rounded(.down) + (30.6001 * (m + 1)).rounded(.down) + Double(day) + b - 1524.5
    }

    private static func sunPosition(_ jd: Double) -> (declination: Double, equation: Double) {
        let d = jd - 2451545.0
        let g = fix(357.529 + 0.98560028 * d, 360)
        let q = fix(280.459 + 0.98564736 * d, 360)
        let l = fix(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g), 360)
        let e = 23.439 - 0.00000036 * d
        let ra = deg(atan2(dcos(e) * dsin(l), dcos(l))) / 15
        return (deg(asin(dsin(e) * dsin(l))), q / 15 - fix(ra, 24))
    }

    /// Times for one local calendar day at the given coordinates.
    static func compute(year: Int, month: Int, day: Int, latitude lat: Double, longitude lng: Double,
                        method: CalcMethod, hanafiAsr: Bool) -> DayTimes {
        let jd = julian(year, month, day) - lng / (15 * 24)

        func midDay(_ t: Double) -> Double { fix(12 - sunPosition(jd + t).equation, 24) }
        func angleTime(_ angle: Double, _ t: Double, ccw: Bool = false) -> Double {
            let decl = sunPosition(jd + t).declination
            let x = (-dsin(angle) - dsin(decl) * dsin(lat)) / (dcos(decl) * dcos(lat))
            let span = deg(acos(x)) / 15 // NaN when the sun never reaches the angle
            return midDay(t) + (ccw ? -span : span)
        }
        func asrTime(_ factor: Double, _ t: Double) -> Double {
            let decl = sunPosition(jd + t).declination
            return angleTime(-deg(atan(1 / (factor + dtan(abs(lat - decl))))), t)
        }

        let guess: [TimeKey: Double] = [.fajr: 5, .sunrise: 6, .dhuhr: 12, .asr: 13, .maghrib: 18, .isha: 18]
        var t = guess
        for _ in 0..<2 {
            func p(_ k: TimeKey) -> Double { (t[k]!.isNaN ? guess[k]! : t[k]!) / 24 }
            t = [
                .fajr: angleTime(method.fajrAngle, p(.fajr), ccw: true),
                .sunrise: angleTime(0.833, p(.sunrise), ccw: true),
                .dhuhr: midDay(p(.dhuhr)),
                .asr: asrTime(hanafiAsr ? 2 : 1, p(.asr)),
                .maghrib: angleTime(0.833, p(.maghrib)),
                .isha: method.ishaAngle.map { angleTime($0, p(.isha)) } ?? .nan,
            ]
        }

        // High latitudes: cap Fajr and Isha at an angle-based portion of the night.
        let sunrise = t[.sunrise]!, sunset = t[.maghrib]!
        let night = fix(sunrise - sunset, 24)
        let fajrPortion = method.fajrAngle / 60 * night
        if t[.fajr]!.isNaN || fix(sunrise - t[.fajr]!, 24) > fajrPortion { t[.fajr] = sunrise - fajrPortion }
        if let minutes = method.ishaMinutesAfterMaghrib {
            t[.isha] = sunset + minutes / 60
        } else if let angle = method.ishaAngle {
            let ishaPortion = angle / 60 * night
            if t[.isha]!.isNaN || fix(t[.isha]! - sunset, 24) > ishaPortion { t[.isha] = sunset + ishaPortion }
        }

        var utc = Calendar(identifier: .gregorian)
        utc.timeZone = TimeZone(identifier: "UTC")!
        let base = utc.date(from: DateComponents(year: year, month: month, day: day))!
        func date(_ k: TimeKey) -> Date {
            let seconds = base.timeIntervalSince1970 + (t[k]! - lng / 15) * 3600
            return Date(timeIntervalSince1970: (seconds / 60).rounded() * 60)
        }
        return DayTimes(fajr: date(.fajr), sunrise: date(.sunrise), dhuhr: date(.dhuhr),
                        asr: date(.asr), maghrib: date(.maghrib), isha: date(.isha))
    }
}
