import SwiftUI
import WidgetKit

struct CooldownsWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "cooldowns", provider: SnapshotProvider()) { CooldownsView(entry: $0) }
      .configurationDisplayName("Cooldowns")
      .description("See when your next cooldown is ready.")
      .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}

private struct CooldownsView: View {
  @Environment(\.widgetFamily) private var family
  let entry: SnapshotEntry

  private var palette: Palette { Palette(entry.snapshot?.colors) }
  private var cooldowns: [WidgetSnapshot.Cooldown] { entry.snapshot?.cooldowns ?? [] }

  var body: some View {
    content
      .widgetURL(URL(string: "jnbot://automation?section=cooldowns"))
      .widgetContainer(family, palette.bg)
  }

  @ViewBuilder
  private var content: some View {
    let next = cooldowns.first
    switch family {
    case .accessoryInline:
      if let next {
        Label { Text("\(next.name) ") + countdown(next) } icon: { Image(systemName: "hourglass") }
      } else {
        Label("No cooldowns", systemImage: "hourglass")
      }
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        VStack(spacing: 1) {
          Image(systemName: "hourglass").font(.caption)
          (next.map(countdown) ?? Text("–"))
            .font(.system(size: 12, weight: .semibold).monospacedDigit())
            .multilineTextAlignment(.center)
            .minimumScaleFactor(0.5)
        }
        .padding(4)
      }
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 0) {
        Text(next?.name ?? "Cooldowns").font(.headline).widgetAccentable().lineLimit(1)
        (next.map(countdown) ?? Text("No cooldowns")).font(.body.monospacedDigit()).lineLimit(1)
        if cooldowns.count > 1 { Text("+\(cooldowns.count - 1) more").font(.caption).foregroundStyle(.secondary) }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    default:
      VStack(alignment: .leading, spacing: 0) {
        WidgetHeader(icon: "hourglass", title: "Cooldowns", meta: entry.snapshot?.profile.map { Text($0).foregroundColor(palette.faint) }, palette: palette)
        if let next {
          HStack(alignment: .bottom, spacing: 20) {
            hero(next)
            if family == .systemMedium && cooldowns.count > 1 { list }
          }
          .frame(maxHeight: .infinity, alignment: .bottom)
          let hidden = cooldowns.count - 1 - (family == .systemMedium ? 3 : 0)
          if hidden > 0 {
            Text("+\(hidden) more").font(.caption2).foregroundStyle(palette.faint).padding(.top, 6)
          }
        } else {
          EmptyMessage(text: entry.snapshot == nil ? "Open JNbot to load your cooldowns" : "No cooldowns yet", palette: palette)
        }
      }
    }
  }

  private func countdown(_ cooldown: WidgetSnapshot.Cooldown) -> Text {
    Countdown.text(until: cooldown.due, from: entry.date, palette: palette)
  }

  private func hero(_ cooldown: WidgetSnapshot.Cooldown) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(cooldown.name).font(.footnote).foregroundStyle(palette.muted).lineLimit(1)
      countdown(cooldown)
        .font(.system(size: 30, weight: .semibold, design: .rounded).monospacedDigit())
        .foregroundStyle(palette.text)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
      if let interval = cooldown.interval, cooldown.due > entry.date {
        ProgressView(timerInterval: interval, countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }
          .tint(palette.primary)
          .widgetAccentable()
          .padding(.top, 6)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var list: some View {
    VStack(alignment: .leading, spacing: 8) {
      ForEach(cooldowns.dropFirst().prefix(3)) { cooldown in
        HStack(spacing: 6) {
          Text(cooldown.name).foregroundStyle(palette.text).lineLimit(1)
          Spacer(minLength: 4)
          countdown(cooldown)
            .foregroundStyle(palette.muted)
            .monospacedDigit()
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: 76, alignment: .trailing)
        }
        .font(.footnote)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}
