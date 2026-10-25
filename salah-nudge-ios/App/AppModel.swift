import Observation
import SwiftUI
import WidgetKit

@Observable
final class AppModel {
    private let store = SharedStore.shared

    var settings: Settings { didSet { settingsChanged() } }
    var prayed: Set<String>
    var countsVersion = 0 // bumped when dhikr counts change so views refresh
    var adhkarTab: AdhkarSet = .after
    var scrollToAdhkar = false

    init() {
        settings = SharedStore.shared.settings
        prayed = SharedStore.shared.prayed
    }

    func reload() {
        prayed = store.prayed
        countsVersion += 1
    }

    func schedule(at now: Date) -> Schedule { Schedule(settings: settings, around: now) }

    private func settingsChanged() {
        store.settings = settings
        refreshEverywhere()
    }

    private func refreshEverywhere() {
        WidgetCenter.shared.reloadAllTimelines()
        Task { await Reminders.reschedule(store: store) }
    }

    func togglePrayed(_ window: PrayerWindow) {
        let nowPrayed = !prayed.contains(window.id)
        store.setPrayed(window.id, nowPrayed)
        prayed = store.prayed
        if nowPrayed {
            Reminders.cancel(prayerID: window.id)
            WidgetCenter.shared.reloadAllTimelines()
            adhkarTab = .after
        } else {
            refreshEverywhere()
        }
    }

    func counts(_ set: AdhkarSet, day: String) -> [Int] {
        _ = countsVersion
        return store.counts(set, day: day)
    }

    func isComplete(_ set: AdhkarSet, day: String) -> Bool {
        _ = countsVersion
        return store.isComplete(set, day: day)
    }

    func tap(_ index: Int, in set: AdhkarSet, day: String) {
        var c = store.counts(set, day: day)
        let target = set.items[index].count
        c[index] = c[index] >= target ? 0 : c[index] + 1
        store.setCounts(c, set, day: day)
        countsVersion += 1
        if store.isComplete(set, day: day) {
            Reminders.cancel(adhkar: set, day: day)
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    func reset(_ set: AdhkarSet, day: String) {
        store.setCounts(set.items.map { _ in 0 }, set, day: day)
        countsVersion += 1
        refreshEverywhere()
    }
}
