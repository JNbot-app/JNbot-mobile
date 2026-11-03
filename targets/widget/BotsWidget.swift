import SwiftUI
import WidgetKit

struct BotsWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "bots", provider: SnapshotProvider()) { BotsView(entry: $0) }
      .configurationDisplayName("Bots")
      .description("Check which bots are online.")
      .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}

private struct BotsView: View {
  @Environment(\.widgetFamily) private var family
  let entry: SnapshotEntry

  private var palette: Palette { Palette(entry.snapshot?.colors) }

  var body: some View {
    content
      .widgetURL(URL(string: "jnbot://bots"))
      .widgetContainer(family, palette.bg)
  }

  @ViewBuilder
  private var content: some View {
    let snapshot = entry.snapshot
    let online = snapshot?.online ?? 0
    let total = snapshot?.botCount ?? 0
    switch family {
    case .accessoryInline:
      Label("\(online) of \(total) bots online", systemImage: "cpu")
    case .accessoryCircular:
      Gauge(value: Double(online), in: 0...Double(max(total, 1))) {
        Image(systemName: "cpu")
      } currentValueLabel: {
        Text("\(online)")
      }
      .gaugeStyle(.accessoryCircularCapacity)
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 0) {
        Text("\(online) online").font(.headline).widgetAccentable()
        ForEach(snapshot?.bots.prefix(2) ?? []) { bot in
          Text("\(bot.name) · \(bot.state)").font(.caption).lineLimit(1)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    default:
      if let snapshot {
        system(snapshot)
      } else {
        VStack(alignment: .leading) {
          WidgetHeader(icon: "cpu", title: "Bots", palette: palette)
          EmptyMessage(text: "Open JNbot to see your bots", palette: palette)
        }
      }
    }
  }

  private func system(_ snapshot: WidgetSnapshot) -> some View {
    let stale = snapshot.isStale(at: entry.date)
    let freshness = snapshot.live ? Text("Updated ") + Text(snapshot.updated, style: .time) : Text("Offline")
    let medium = family == .systemMedium
    let meta: Text? = stale
      ? freshness.foregroundColor(palette.faint)
      : medium ? Text("\(snapshot.online) online").foregroundColor(palette.success) : snapshot.profile.map { Text($0).foregroundColor(palette.faint) }

    return VStack(alignment: .leading, spacing: 0) {
      WidgetHeader(icon: "cpu", title: medium ? snapshot.profile ?? "Bots" : "Bots", meta: meta, palette: palette)
      if snapshot.botCount == 0 {
        EmptyMessage(text: "No bots running", palette: palette)
      } else if medium {
        VStack(alignment: .leading, spacing: 7) {
          ForEach(snapshot.bots.prefix(4)) { bot in
            Link(destination: URL(string: "jnbot://bot/\(bot.id)")!) { row(bot, stale: stale) }
          }
        }
        .padding(.top, 10)
        Spacer(minLength: 0)
        let hidden = snapshot.botCount - min(snapshot.bots.count, 4)
        if hidden > 0 { Text("+\(hidden) more").font(.caption2).foregroundStyle(palette.faint) }
      } else {
        Spacer(minLength: 4)
        Text("\(snapshot.online)")
          .font(.system(size: 36, weight: .semibold, design: .rounded).monospacedDigit())
          .foregroundStyle(stale ? palette.faint : palette.text)
        Text("online · \(snapshot.botCount) active").font(.footnote).foregroundStyle(palette.muted).lineLimit(1)
        HStack(spacing: 4) {
          ForEach(snapshot.bots) { bot in
            Circle().fill(palette.state(bot.state, stale: stale)).frame(width: 6, height: 6)
          }
        }
        .padding(.top, 8)
      }
    }
  }

  private func row(_ bot: WidgetSnapshot.Bot, stale: Bool) -> some View {
    let color = palette.state(bot.state, stale: stale)
    return HStack(spacing: 8) {
      Circle().fill(color).frame(width: 7, height: 7)
      Text(bot.name).font(.subheadline.weight(.medium)).foregroundStyle(stale ? palette.muted : palette.text).lineLimit(1)
      if !bot.script.isEmpty {
        Text(bot.script).font(.footnote).foregroundStyle(palette.faint).lineLimit(1)
      }
      Spacer(minLength: 4)
      Text(bot.state.capitalized).font(.caption).foregroundStyle(color)
    }
  }
}
