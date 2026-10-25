import BackgroundTasks
import Combine
import SwiftUI
import UserNotifications
import WidgetKit

@main
struct SalahNudgeApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var model = AppModel()
    @Environment(\.scenePhase) private var scenePhase

    static let refreshTaskID = (Bundle.main.bundleIdentifier ?? "salahnudge") + ".refresh"

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(model)
                .onReceive(NotificationCenter.default.publisher(for: .openAdhkar)) { note in
                    if let set = note.object as? AdhkarSet { model.adhkarTab = set; model.scrollToAdhkar = true }
                }
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .active:
                model.reload()
                Task { await Reminders.reschedule() }
            case .background:
                Self.scheduleRefresh()
            default:
                break
            }
        }
        .backgroundTask(.appRefresh(Self.refreshTaskID)) {
            await Reminders.reschedule()
            WidgetCenter.shared.reloadAllTimelines()
            Self.scheduleRefresh()
        }
    }

    /// Asks iOS to wake the app about twice a day to top up the scheduled reminders.
    static func scheduleRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: refreshTaskID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 12 * 3600)
        try? BGTaskScheduler.shared.submit(request)
    }
}

extension Notification.Name {
    static let openAdhkar = Notification.Name("openAdhkar")
}

/// Shows reminders while the app is open and routes taps on adhkar reminders to the right set.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async
        -> UNNotificationPresentationOptions {
        [.banner, .sound, .list]
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        if let raw = response.notification.request.content.userInfo["adhkar"] as? String, let set = AdhkarSet(rawValue: raw) {
            await MainActor.run { NotificationCenter.default.post(name: .openAdhkar, object: set) }
        }
    }
}
