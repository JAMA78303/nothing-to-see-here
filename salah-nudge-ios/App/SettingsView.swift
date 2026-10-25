import SwiftUI

struct SettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var locating = false
    @State private var locationMessage: String?
    @State private var notificationsBlocked = false
    private let finder = LocationFinder()

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            Form {
                Section {
                    Picker("City", selection: cityBinding) {
                        Text("My location").tag(String?.none)
                        ForEach(City.all) { Text($0.name).tag(String?.some($0.name)) }
                    }
                    Button(locating ? "Finding you…" : "Use my location") { Task { await useLocation() } }
                        .disabled(locating)
                    if let locationMessage { Text(locationMessage).font(.footnote).foregroundStyle(.secondary) }
                    LabeledContent("Coordinates",
                                   value: String(format: "%.4f, %.4f", model.settings.latitude, model.settings.longitude))
                    LabeledContent("Time zone", value: model.settings.timeZoneID)
                } header: { Text("Location") }

                Section {
                    Picker("Method", selection: $model.settings.method) {
                        ForEach(CalcMethod.allCases) { Text($0.name).tag($0) }
                    }
                    Picker("Asr", selection: $model.settings.hanafiAsr) {
                        Text("Standard (Shafiʿi, Maliki, Hanbali)").tag(false)
                        Text("Hanafi").tag(true)
                    }
                } header: { Text("Calculation") }

                Section {
                    Toggle("Prayer reminders", isOn: notificationsBinding)
                    Toggle("Adhkar reminders", isOn: $model.settings.adhkarReminders)
                        .disabled(!model.settings.notifications)
                } header: { Text("Reminders") } footer: {
                    Text(notificationsBlocked
                         ? "Notifications are turned off for Salah Nudge. Turn them on in Settings › Notifications › Salah Nudge."
                         : "You get a reminder when each prayer begins, when about an hour is left, and when 10 minutes are left. They arrive even when the app is closed.")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }

    private var cityBinding: Binding<String?> {
        Binding(
            get: { model.settings.cityName },
            set: { name in
                guard let name, let city = City.all.first(where: { $0.name == name }) else { return }
                var s = Settings(city: city)
                s.hanafiAsr = model.settings.hanafiAsr
                s.notifications = model.settings.notifications
                s.adhkarReminders = model.settings.adhkarReminders
                model.settings = s
            })
    }

    private var notificationsBinding: Binding<Bool> {
        Binding(
            get: { model.settings.notifications },
            set: { on in
                guard on else { model.settings.notifications = false; return }
                Task {
                    let granted = await Reminders.requestPermission()
                    notificationsBlocked = !granted
                    model.settings.notifications = granted
                }
            })
    }

    private func useLocation() async {
        locating = true
        defer { locating = false }
        guard let loc = await finder.locate() else {
            locationMessage = "Location is off for Salah Nudge. Pick a city, or allow location in Settings › Privacy › Location Services."
            return
        }
        locationMessage = nil
        var s = model.settings
        s.cityName = nil
        s.latitude = (loc.coordinate.latitude * 10_000).rounded() / 10_000
        s.longitude = (loc.coordinate.longitude * 10_000).rounded() / 10_000
        s.timeZoneID = TimeZone.current.identifier
        model.settings = s
    }
}
