import AppIntents
import WidgetKit

/// Lets the widget's "Prayed" button mark a prayer without opening the app.
struct MarkPrayedIntent: AppIntent {
    static var title: LocalizedStringResource = "Mark prayer as prayed"
    static var description = IntentDescription("Marks the current prayer as prayed and stops its reminders.")

    @Parameter(title: "Prayer")
    var prayerID: String

    init() {}

    init(prayerID: String) {
        self.prayerID = prayerID
    }

    func perform() async throws -> some IntentResult {
        let store = SharedStore.shared
        store.setPrayed(prayerID, !store.prayed.contains(prayerID))
        if store.prayed.contains(prayerID) {
            Reminders.cancel(prayerID: prayerID)
        } else {
            await Reminders.reschedule(store: store)
        }
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
