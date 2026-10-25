import AppIntents
import SwiftUI
import WidgetKit

@main
struct SalahWidgetBundle: WidgetBundle {
    var body: some Widget {
        SalahWidget()
    }
}

struct SalahWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SalahNudge", provider: Provider()) { entry in
            SalahWidgetView(entry: entry)
        }
        .configurationDisplayName("Salah Nudge")
        .description("Time left for the current prayer: green with time to spare, yellow under an hour, red under 10 minutes.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

// MARK: - Timeline

struct SalahEntry: TimelineEntry {
    let date: Date
    let schedule: Schedule
    let level: Level
    let current: PrayerWindow?
    let next: PrayerWindow?
    let today: [PrayerWindow]
    let prayed: Set<String>
    let adhkarDue: (window: AdhkarWindow, closing: Bool)?

    init(date: Date, store: SharedStore = .shared) {
        self.date = date
        schedule = Schedule(settings: store.settings, around: date)
        prayed = store.prayed
        level = schedule.level(at: date, prayed: prayed)
        current = schedule.current(at: date)
        next = schedule.next(after: date)
        today = schedule.windows.filter { $0.dayKey == schedule.today.key }
        let todayKey = schedule.today.key
        var due: (window: AdhkarWindow, closing: Bool)? = nil
        for a in schedule.adhkarWindows(for: schedule.today) {
            let state = a.state(at: date, complete: store.isComplete(a.set, day: todayKey))
            if state == .open || state == .closing {
                due = (a, state == .closing)
                break
            }
        }
        adhkarDue = due
    }

    /// The moment the big countdown counts toward.
    var target: Date? {
        if let current, level != .done { return current.end }
        return next?.start
    }

    var shownPrayer: PrayerKey? {
        (level == .done || level == .idle) ? next?.key : current?.key
    }

    var headline: String {
        switch level {
        case .done: "\(current?.key.name ?? "") prayed"
        case .idle: "No prayer due"
        default: level.message
        }
    }

    /// Fraction of the current window still left, for the lock-screen gauge.
    var remainingFraction: Double {
        guard let current, level != .done else { return 0 }
        let total = current.end.timeIntervalSince(current.start)
        return total > 0 ? max(0, min(1, current.end.timeIntervalSince(date) / total)) : 0
    }
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SalahEntry { SalahEntry(date: .now) }

    func getSnapshot(in context: Context, completion: @escaping (SalahEntry) -> Void) {
        completion(SalahEntry(date: .now))
    }

    /// One entry at every colour change (start, 1 hour left, 10 minutes left, end) for the next day,
    /// plus every 10 minutes so the lock-screen gauge keeps moving.
    func getTimeline(in context: Context, completion: @escaping (Timeline<SalahEntry>) -> Void) {
        let store = SharedStore.shared
        let now = Date()
        let horizon = now.addingTimeInterval(24 * 3600)
        let schedule = Schedule(settings: store.settings, around: now)

        var points: Set<Date> = [now]
        for w in schedule.windows {
            for d in [w.start, w.end.addingTimeInterval(-Level.warnThreshold), w.end.addingTimeInterval(-Level.lateThreshold), w.end] {
                points.insert(d)
            }
        }
        for day in schedule.days.dropFirst() {
            for a in schedule.adhkarWindows(for: day) {
                for d in [a.start, a.best, a.end.addingTimeInterval(-30 * 60), a.end] { points.insert(d) }
            }
        }
        var tick = now
        while tick < now.addingTimeInterval(12 * 3600) {
            tick = tick.addingTimeInterval(10 * 60)
            points.insert(tick)
        }

        let entries = points.filter { $0 >= now && $0 < horizon }.sorted().map { SalahEntry(date: $0, store: store) }
        completion(Timeline(entries: entries, policy: .after(entries.last?.date ?? horizon)))
    }
}

// MARK: - Views

struct SalahWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SalahEntry

    var body: some View {
        switch family {
        case .accessoryCircular: circular
        case .accessoryRectangular: rectangular
        case .accessoryInline: inline
        case .systemMedium: medium
        default: small
        }
    }

    private var deepLink: URL? {
        if let due = entry.adhkarDue { return URL(string: "salahnudge://adhkar/\(due.window.set.rawValue)") }
        return URL(string: "salahnudge://home")
    }

    @ViewBuilder
    private var countdown: some View {
        if let target = entry.target, target > entry.date {
            Text(timerInterval: entry.date...target, countsDown: true)
                .monospacedDigit()
        } else {
            Text("--")
        }
    }

    private var prayedButton: some View {
        Group {
            if let current = entry.current, entry.level != .idle {
                Button(intent: MarkPrayedIntent(prayerID: current.id)) {
                    Image(systemName: entry.level == .done ? "checkmark.circle.fill" : "checkmark.circle")
                        .font(.title3)
                        .foregroundStyle(entry.level.tone)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(entry.level == .done ? "Undo \(current.key.name)" : "Mark \(current.key.name) as prayed")
            }
        }
    }

    private var status: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
                Text(entry.schedule.settings.placeName)
                    .font(.caption2.weight(.semibold)).foregroundStyle(Palette.muted)
                    .lineLimit(1)
                Spacer(minLength: 4)
                prayedButton
            }
            if let p = entry.shownPrayer {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(p.name).font(.system(.title2, design: .rounded, weight: .bold))
                    Text(p.arabic).font(.caption).foregroundStyle(Palette.muted)
                }
                .foregroundStyle(Palette.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            }
            countdown
                .font(.system(.title2, design: .monospaced, weight: .medium))
                .foregroundStyle(entry.level.tone)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Spacer(minLength: 0)
            Text(entry.level == .done || entry.level == .idle
                 ? "Adhan \(entry.next.map { entry.schedule.clock($0.start) } ?? "")"
                 : entry.headline)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(entry.level.tone)
                .lineLimit(2)
        }
    }

    private var small: some View {
        status
            .containerBackground(for: .widget) { entry.level.soft }
            .widgetURL(deepLink)
    }

    private var medium: some View {
        HStack(spacing: 14) {
            status.frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .leading, spacing: 3) {
                ForEach(entry.today) { w in
                    let isCurrent = entry.current?.id == w.id
                    HStack(spacing: 6) {
                        Image(systemName: entry.prayed.contains(w.id) ? "checkmark.circle.fill" : isCurrent ? "circle.fill" : "circle")
                            .font(.system(size: 9))
                            .foregroundStyle(isCurrent ? entry.level.tone : Palette.accent)
                        Text(w.key.name).fontWeight(isCurrent ? .bold : .regular)
                        Spacer(minLength: 4)
                        Text(entry.schedule.clock(w.start)).monospacedDigit()
                    }
                    .font(.caption)
                    .foregroundStyle(w.end < entry.date && !isCurrent ? Palette.muted : Palette.ink)
                }
                if let due = entry.adhkarDue {
                    Text(due.closing ? "\(due.window.set.title) closing" : "\(due.window.set.title) due")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(due.closing ? Palette.warn : Palette.ok)
                        .lineLimit(1)
                        .padding(.top, 2)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .containerBackground(for: .widget) { entry.level.soft }
        .widgetURL(deepLink)
    }

    private var circular: some View {
        Gauge(value: entry.remainingFraction) {
            Text(entry.shownPrayer?.name ?? "")
        } currentValueLabel: {
            Text(entry.shownPrayer.map { String($0.name.prefix(3)) } ?? "")
                .font(.system(size: 12, weight: .semibold))
        }
        .gaugeStyle(.accessoryCircular)
        .tint(entry.level.tone)
        .widgetAccentable()
        .containerBackground(for: .widget) { AccessoryWidgetBackground() }
        .widgetURL(deepLink)
    }

    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text("\(entry.shownPrayer?.name ?? "") · \(entry.headline)")
                .font(.headline)
                .widgetAccentable()
                .lineLimit(1)
            HStack(spacing: 4) {
                countdown
                Text(entry.level == .done || entry.level == .idle ? "to adhan" : "left")
            }
            .font(.body)
            if let due = entry.adhkarDue {
                Text(due.closing ? "\(due.window.set.shortTitle) adhkar closing" : "\(due.window.set.shortTitle) adhkar due")
                    .font(.caption)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .containerBackground(for: .widget) { Color.clear }
        .widgetURL(deepLink)
    }

    private var inline: some View {
        Group {
            if let current = entry.current, entry.level != .done {
                Text("\(current.key.name) ends \(entry.schedule.clock(current.end))")
            } else if let next = entry.next {
                Text("\(next.key.name) at \(entry.schedule.clock(next.start))")
            }
        }
        .containerBackground(for: .widget) { Color.clear }
    }
}

#Preview(as: .systemSmall) {
    SalahWidget()
} timeline: {
    SalahEntry(date: .now)
}
