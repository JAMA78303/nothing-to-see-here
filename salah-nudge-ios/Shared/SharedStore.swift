import Foundation

/// Settings, prayed prayers and dhikr counts, kept in the App Group so the app and widget see the same data.
final class SharedStore {
    static let shared = SharedStore()

    /// Set from the APP_GROUP_ID build setting through each target's Info.plist.
    static let appGroupID = Bundle.main.object(forInfoDictionaryKey: "AppGroupID") as? String ?? ""

    private let defaults: UserDefaults

    init() {
        defaults = UserDefaults(suiteName: Self.appGroupID) ?? .standard
    }

    private func load<T: Decodable>(_ key: String, as type: T.Type) -> T? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    private func save<T: Encodable>(_ value: T, _ key: String) {
        if let data = try? JSONEncoder().encode(value) { defaults.set(data, forKey: key) }
    }

    var settings: Settings {
        get { load("settings", as: Settings.self) ?? .default }
        set { save(newValue, "settings") }
    }

    var prayed: Set<String> {
        get { load("prayed", as: Set<String>.self) ?? [] }
        set {
            // Keep about a week of history.
            let cutoff = Calendar.current.date(byAdding: .day, value: -7, to: .now) ?? .now
            let cutoffKey = String(format: "%04d-%02d-%02d", Calendar.current.component(.year, from: cutoff),
                                   Calendar.current.component(.month, from: cutoff), Calendar.current.component(.day, from: cutoff))
            save(newValue.filter { $0 >= cutoffKey }, "prayed")
        }
    }

    func setPrayed(_ id: String, _ isPrayed: Bool) {
        var p = prayed
        if isPrayed { p.insert(id) } else { p.remove(id) }
        prayed = p
    }

    private var allCounts: [String: [Int]] {
        get { load("counts", as: [String: [Int]].self) ?? [:] }
        set { save(newValue, "counts") }
    }

    func counts(_ set: AdhkarSet, day: String) -> [Int] {
        let stored = allCounts["\(day):\(set.rawValue)"] ?? []
        return set.items.indices.map { $0 < stored.count ? stored[$0] : 0 }
    }

    func setCounts(_ counts: [Int], _ set: AdhkarSet, day: String) {
        var all = allCounts.filter { $0.key.hasPrefix(day) } // only today's counts are kept
        all["\(day):\(set.rawValue)"] = counts
        allCounts = all
    }

    func isComplete(_ set: AdhkarSet, day: String) -> Bool {
        zip(counts(set, day: day), set.items).allSatisfy { $0 >= $1.count }
    }
}
