import SwiftUI

struct ContentView: View {
    @Environment(AppModel.self) private var model
    @State private var showSettings = false

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let now = context.date
            let schedule = model.schedule(at: now)
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        header(schedule: schedule, now: now)
                        StatusArch(schedule: schedule, now: now)
                        PrayerList(schedule: schedule, now: now)
                        AdhkarSection(schedule: schedule, now: now)
                            .id("adhkar")
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 32)
                }
                .onChange(of: model.scrollToAdhkar) { _, go in
                    guard go else { return }
                    withAnimation { proxy.scrollTo("adhkar", anchor: .top) }
                    model.scrollToAdhkar = false
                }
            }
        }
        .background(Palette.bg.ignoresSafeArea())
        .sheet(isPresented: $showSettings) { SettingsView() }
        .onOpenURL { url in
            // From the widget: salahnudge://adhkar/<set>
            if url.host() == "adhkar", let set = AdhkarSet(rawValue: url.lastPathComponent) {
                model.adhkarTab = set
                model.scrollToAdhkar = true
            }
        }
    }

    private func header(schedule: Schedule, now: Date) -> some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Salah Nudge")
                    .font(.system(.title2, design: .rounded, weight: .bold))
                    .foregroundStyle(Palette.accent)
                Text("\(model.settings.placeName) · \(hijri(now))")
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
            }
            Spacer()
            Button { showSettings = true } label: {
                Image(systemName: "gearshape").font(.title3)
            }
            .tint(Palette.accent)
            .accessibilityLabel("Location and settings")
        }
        .padding(.top, 8)
    }

    private func hijri(_ date: Date) -> String {
        var style = Date.FormatStyle(date: .long, time: .omitted, timeZone: model.settings.timeZone)
        style.calendar = Calendar(identifier: .islamicUmmAlQura)
        return date.formatted(style)
    }
}

/// The main status: current prayer, time left and its colour.
struct StatusArch: View {
    @Environment(AppModel.self) private var model
    let schedule: Schedule
    let now: Date

    var body: some View {
        let level = schedule.level(at: now, prayed: model.prayed)
        let current = schedule.current(at: now)
        let next = schedule.next(after: now)

        VStack(spacing: 12) {
            Text(eyebrow(level, current))
                .font(.caption.weight(.semibold)).textCase(.uppercase).tracking(1.2)
                .foregroundStyle(Palette.muted)

            let shown = (level == .done || level == .idle) ? next?.key : current?.key
            if let shown {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(shown.name).font(.system(size: 44, weight: .bold, design: .rounded))
                    Text(shown.arabic).font(.title2).foregroundStyle(Palette.muted)
                }
                .foregroundStyle(Palette.ink)
            }

            Group {
                if let current, level != .done {
                    Text(formatLeft(current.end.timeIntervalSince(now)))
                } else if let next {
                    Text("in " + formatLeft(next.start.timeIntervalSince(now)))
                }
            }
            .font(.system(size: 40, weight: .medium, design: .monospaced))
            .foregroundStyle(level.tone)
            .contentTransition(.numericText())

            Label(chip(level, next), systemImage: "circle.fill")
                .labelStyle(ChipLabelStyle(tone: level.tone))

            Text(subtitle(level, current))
                .font(.subheadline).foregroundStyle(Palette.muted)
                .multilineTextAlignment(.center)

            HStack(spacing: 10) {
                if let current {
                    Button(level == .done ? "Undo \(current.key.name)" : "Mark \(current.key.name) as prayed") {
                        withAnimation { model.togglePrayed(current) }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(level == .done ? Palette.accent : level.tone)
                }
                Button("Open adhkar") {
                    model.adhkarTab = level == .done ? .after : suggestedSet()
                    model.scrollToAdhkar = true
                }
                .buttonStyle(.bordered)
                .tint(Palette.accent)
            }
            .font(.subheadline.weight(.semibold))
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 64).padding(.bottom, 28).padding(.horizontal, 20)
        .background(ArchShape().fill(level.soft))
        .overlay(ArchShape().stroke(level.tone.opacity(0.35), lineWidth: 1))
        .animation(.easeInOut(duration: 0.4), value: level)
        .accessibilityElement(children: .contain)
    }

    private func suggestedSet() -> AdhkarSet {
        let due = schedule.adhkarWindows(for: schedule.today).first {
            let s = $0.state(at: now, complete: model.isComplete($0.set, day: schedule.today.key))
            return s == .open || s == .closing
        }
        return due?.set ?? .after
    }

    private func eyebrow(_ level: Level, _ w: PrayerWindow?) -> String {
        switch level {
        case .done: "\(w?.key.name ?? "") prayed"
        case .idle: "No prayer due"
        default: "Time left to pray"
        }
    }

    private func chip(_ level: Level, _ next: PrayerWindow?) -> String {
        switch level {
        case .done, .idle: "Adhan at \(next.map { schedule.clock($0.start) } ?? "")"
        default: level.message
        }
    }

    private func subtitle(_ level: Level, _ w: PrayerWindow?) -> String {
        switch level {
        case .idle: return "The sun has risen, so Fajr has ended. Duha can be prayed until shortly before Dhuhr."
        case .done:
            return model.isComplete(.after, day: schedule.today.key)
                ? "You will be nudged when the next prayer begins."
                : "Take a minute for the after-salah adhkar while you are still seated."
        default:
            guard let w else { return "" }
            return "\(w.key.name) began at \(schedule.clock(w.start)) and ends at \(w.key.endsAtName) (\(schedule.clock(w.end)))."
        }
    }
}

struct ChipLabelStyle: LabelStyle {
    let tone: Color
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 8) {
            configuration.icon.font(.system(size: 8)).foregroundStyle(tone)
            configuration.title.font(.subheadline.weight(.semibold)).foregroundStyle(tone)
        }
        .padding(.horizontal, 12).padding(.vertical, 5)
        .background(Capsule().fill(Palette.surface))
        .overlay(Capsule().stroke(tone.opacity(0.4)))
    }
}

/// Today's five prayers with a tick for each.
struct PrayerList: View {
    @Environment(AppModel.self) private var model
    let schedule: Schedule
    let now: Date

    var body: some View {
        let today = schedule.windows.filter { $0.dayKey == schedule.today.key }
        let done = today.filter { model.prayed.contains($0.id) }.count

        Card(title: "Prayers", detail: "\(done) of 5 prayed today") {
            VStack(spacing: 0) {
                ForEach(today) { w in
                    row(w)
                    if w.key == .fajr { sunriseRow }
                    if w.key != .isha { Divider().overlay(Palette.line) }
                }
            }
        }
    }

    private func row(_ w: PrayerWindow) -> some View {
        let isCurrent = schedule.current(at: now)?.id == w.id
        let isPrayed = model.prayed.contains(w.id)
        let started = w.start <= now
        let tone = isCurrent ? schedule.level(at: now, prayed: model.prayed).tone : Palette.accent
        return HStack(spacing: 12) {
            Circle()
                .strokeBorder(isCurrent ? tone : Palette.line, lineWidth: 2)
                .background(Circle().fill(isPrayed ? Palette.accent : isCurrent ? tone : started ? Palette.line : .clear))
                .frame(width: 12, height: 12)
            Text(w.key.name).fontWeight(.semibold)
            Text(w.key.arabic).foregroundStyle(Palette.muted)
            Spacer()
            Text(schedule.clock(w.start)).monospacedDigit()
            Button(isPrayed ? "Prayed" : "Mark") { withAnimation { model.togglePrayed(w) } }
                .font(.caption.weight(.semibold))
                .buttonStyle(.bordered)
                .tint(isPrayed ? Palette.accent : Palette.muted)
                .disabled(!started)
                .accessibilityLabel(isPrayed ? "\(w.key.name) prayed. Tap to undo" : "Mark \(w.key.name) as prayed")
        }
        .padding(.vertical, 10)
    }

    private var sunriseRow: some View {
        HStack(spacing: 12) {
            Color.clear.frame(width: 12, height: 12)
            Text("Sunrise")
            Spacer()
            Text(schedule.clock(schedule.today.times.sunrise)).monospacedDigit()
        }
        .font(.subheadline).foregroundStyle(Palette.muted)
        .padding(.bottom, 10)
    }
}

struct Card<Content: View>: View {
    let title: String
    var detail: String? = nil
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(title).font(.system(.headline, design: .rounded))
                Spacer()
                if let detail { Text(detail).font(.caption).foregroundStyle(Palette.muted) }
            }
            content
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 14).fill(Palette.surface))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.line))
    }
}
