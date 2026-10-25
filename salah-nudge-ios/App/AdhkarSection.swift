import SwiftUI

struct AdhkarSection: View {
    @Environment(AppModel.self) private var model
    let schedule: Schedule
    let now: Date

    var body: some View {
        @Bindable var model = model
        let day = schedule.today.key

        Card(title: "Adhkar") {
            VStack(spacing: 8) {
                ForEach(schedule.adhkarWindows(for: schedule.today)) { a in
                    dueRow(a, day: day)
                }
                let afterDone = model.counts(.after, day: day).enumerated().filter { $0.element >= AdhkarSet.after.items[$0.offset].count }.count
                DueRow(title: "After each salah", pill: "\(afterDone)/\(AdhkarSet.after.items.count) today", pillTone: Palette.muted,
                       detail: "Suggested when you mark a prayer as prayed", border: .clear)
            }

            Picker("Adhkar set", selection: $model.adhkarTab) {
                ForEach(AdhkarSet.allCases) { Text($0.shortTitle).tag($0) }
            }
            .pickerStyle(.segmented)

            VStack(spacing: 8) {
                let counts = model.counts(model.adhkarTab, day: day)
                ForEach(Array(model.adhkarTab.items.enumerated()), id: \.offset) { i, item in
                    DhikrRow(item: item, value: min(counts[i], item.count)) {
                        model.tap(i, in: model.adhkarTab, day: day)
                    }
                }
            }

            HStack {
                Text("Tap a dhikr to count it. Counts reset each day.")
                Spacer()
                Button("Reset") { model.reset(model.adhkarTab, day: day) }
            }
            .font(.caption).foregroundStyle(Palette.muted).tint(Palette.accent)
        }
    }

    private func dueRow(_ a: AdhkarWindow, day: String) -> some View {
        let state = a.state(at: now, complete: model.isComplete(a.set, day: day))
        let info = describe(a, state: state, day: day)
        return DueRow(title: a.set.title, pill: info.pill, pillTone: info.tone, detail: info.detail,
                      border: state == .open ? Palette.ok : state == .closing ? Palette.warn : .clear)
            .opacity(state == .done ? 0.65 : 1)
            .onTapGesture { model.adhkarTab = a.set }
    }

    private func describe(_ a: AdhkarWindow, state: AdhkarWindow.State, day: String) -> (pill: String, tone: Color, detail: String) {
        let done = zip(model.counts(a.set, day: day), a.set.items).filter { $0 >= $1.count }.count
        let best = "\(a.bestText) (\(schedule.clock(a.best)))"
        switch state {
        case .done:
            return ("Done", Palette.accent, "\(done) of \(a.set.items.count) done")
        case .open:
            return ("Due now", Palette.ok, "\(done) of \(a.set.items.count) done · \(best) · until \(schedule.clock(a.end))")
        case .closing:
            return ("Closing soon", Palette.warn, "\(done) of \(a.set.items.count) done · \(best) · until \(schedule.clock(a.end))")
        case .upcoming:
            return ("Later", Palette.muted, "From \(schedule.clock(a.start)), \(best)")
        case .missed:
            return ("Window passed", Palette.muted, "Window was \(schedule.clock(a.start)) to \(schedule.clock(a.end))")
        }
    }
}

struct DueRow: View {
    let title: String
    let pill: String
    let pillTone: Color
    let detail: String
    let border: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(title).fontWeight(.semibold)
                Spacer()
                Text(pill).font(.caption.weight(.semibold)).foregroundStyle(pillTone)
                    .padding(.horizontal, 9).padding(.vertical, 2)
                    .background(Capsule().fill(Palette.surface))
                    .overlay(Capsule().stroke(pillTone == Palette.muted ? Palette.line : pillTone))
            }
            Text(detail).font(.caption).foregroundStyle(Palette.muted)
        }
        .padding(.horizontal, 12).padding(.vertical, 10)
        .background(RoundedRectangle(cornerRadius: 10).fill(Palette.bg))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(border))
    }
}

struct DhikrRow: View {
    let item: Dhikr
    let value: Int
    let onTap: () -> Void

    var body: some View {
        let full = value >= item.count
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 6) {
                if let arabic = item.arabic {
                    Text(arabic)
                        .font(.title3)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .multilineTextAlignment(.trailing)
                } else if let title = item.title {
                    Text(title).font(.system(.headline, design: .rounded))
                }
                HStack(alignment: .center, spacing: 14) {
                    VStack(alignment: .leading, spacing: 2) {
                        if let t = item.transliteration { Text(t).italic().font(.subheadline) }
                        Text(item.meaning).font(.caption).foregroundStyle(Palette.muted)
                    }
                    Spacer(minLength: 0)
                    CountRing(value: value, total: item.count)
                }
            }
            .foregroundStyle(Palette.ink)
            .padding(.horizontal, 14).padding(.vertical, 12)
            .background(RoundedRectangle(cornerRadius: 12).fill(full ? Palette.accent.opacity(0.07) : Palette.surface))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(full ? Palette.accent : Palette.line))
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.increase, trigger: value)
        .accessibilityLabel("\(item.title ?? item.transliteration ?? "Dhikr"): \(value) of \(item.count)")
    }
}

struct CountRing: View {
    let value: Int
    let total: Int

    var body: some View {
        ZStack {
            Circle().stroke(Palette.line, lineWidth: 4)
            Circle()
                .trim(from: 0, to: CGFloat(value) / CGFloat(max(total, 1)))
                .stroke(Palette.accent, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeOut(duration: 0.2), value: value)
            Text("\(value)/\(total)").font(.system(size: 11, design: .monospaced)).monospacedDigit()
        }
        .frame(width: 48, height: 48)
    }
}
