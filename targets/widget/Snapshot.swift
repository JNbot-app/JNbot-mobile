import Foundation
import SwiftUI
import WidgetKit

/// Mirror of src/widgets/widgetSnapshot.ts.
struct WidgetSnapshot: Decodable {
  struct Colors: Decodable {
    let bg, surface, text, muted, faint, primary, success, warning, danger: String
  }
  struct Bot: Decodable, Identifiable {
    let id: Int
    let name: String
    let script: String
    let state: String
  }
  struct Cooldown: Decodable, Identifiable {
    let id: String
    let name: String
    let startAt: Double
    let dueAt: Double

    var due: Date { Date(timeIntervalSince1970: dueAt / 1000) }
    /// nil for one-time schedules, which have no interval to show progress against.
    var interval: ClosedRange<Date>? {
      startAt > 0 && dueAt > startAt ? Date(timeIntervalSince1970: startAt / 1000)...due : nil
    }
  }

  let v: Int
  let updatedAt: Double
  let profile: String?
  let live: Bool
  let colors: Colors
  let bots: [Bot]
  let botCount: Int
  let online: Int
  let cooldowns: [Cooldown]

  static let staleAfter: TimeInterval = 10 * 60

  var updated: Date { Date(timeIntervalSince1970: updatedAt / 1000) }
  /// Bot state is only trustworthy while the app keeps reporting it.
  func isStale(at date: Date) -> Bool { !live || date.timeIntervalSince(updated) > Self.staleAfter }

  static func load() -> WidgetSnapshot? {
    guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: "snapshot") else { return nil }
    guard let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: Data(json.utf8)), snapshot.v == 1 else { return nil }
    return snapshot
  }

  // AltStore re-registers app groups per team and writes the real identifiers to the app's ALTAppGroups.
  private static var appGroup: String {
    let app = Bundle(url: Bundle.main.bundleURL.deletingLastPathComponent().deletingLastPathComponent())
    return (app?.object(forInfoDictionaryKey: "ALTAppGroups") as? [String])?.first ?? "group.com.jnbot.app"
  }
}

struct SnapshotEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
}

struct SnapshotProvider: TimelineProvider {
  func placeholder(in context: Context) -> SnapshotEntry { SnapshotEntry(date: .now, snapshot: .preview) }

  func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
    completion(SnapshotEntry(date: .now, snapshot: context.isPreview ? .preview : WidgetSnapshot.load() ?? .preview))
  }

  /// Re-render when a cooldown turns ready, switches to a live timer, or bot data goes stale.
  func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
    let now = Date.now
    let snapshot = WidgetSnapshot.load()
    var dates = (snapshot?.cooldowns ?? []).flatMap { [$0.due, $0.due.addingTimeInterval(-Countdown.liveWindow)] }
    if let snapshot, snapshot.live { dates.append(snapshot.updated.addingTimeInterval(WidgetSnapshot.staleAfter)) }
    let entries = ([now] + dates.filter { $0 > now }.sorted().prefix(40)).map { SnapshotEntry(date: $0, snapshot: snapshot) }
    completion(Timeline(entries: entries, policy: .atEnd))
  }
}

struct Palette {
  let bg, surface, text, muted, faint, primary, success, warning, danger: Color

  init(_ colors: WidgetSnapshot.Colors?) {
    let c = colors ?? WidgetSnapshot.preview.colors
    (bg, surface, text, muted, faint) = (Color(hex: c.bg), Color(hex: c.surface), Color(hex: c.text), Color(hex: c.muted), Color(hex: c.faint))
    (primary, success, warning, danger) = (Color(hex: c.primary), Color(hex: c.success), Color(hex: c.warning), Color(hex: c.danger))
  }

  func state(_ state: String, stale: Bool) -> Color {
    if stale { return faint }
    switch state {
    case "online": return success
    case "paused": return warning
    case "failed": return danger
    default: return faint
    }
  }
}

extension Color {
  init(hex: String) {
    let value = UInt64(hex.dropFirst(), radix: 16) ?? 0
    let hasAlpha = hex.count == 9
    let rgb = hasAlpha ? value >> 8 : value
    self.init(
      .sRGB,
      red: Double((rgb >> 16) & 0xFF) / 255,
      green: Double((rgb >> 8) & 0xFF) / 255,
      blue: Double(rgb & 0xFF) / 255,
      opacity: hasAlpha ? Double(value & 0xFF) / 255 : 1
    )
  }
}

extension WidgetSnapshot {
  static let preview: WidgetSnapshot = {
    let now = Date.now.timeIntervalSince1970 * 1000
    return WidgetSnapshot(
      v: 1, updatedAt: now, profile: "Main", live: true,
      colors: Colors(bg: "#121315", surface: "#232429", text: "#F5F5F7", muted: "#B0B0B7", faint: "#92929A",
                     primary: "#FF7A45", success: "#30D158", warning: "#FFD60A", danger: "#FF453A"),
      bots: [
        Bot(id: 1, name: "Steve_Alt1", script: "Mining", state: "online"),
        Bot(id: 2, name: "Builder22", script: "AutoFarm", state: "online"),
        Bot(id: 3, name: "Fisher", script: "Fishing", state: "paused"),
        Bot(id: 4, name: "Alt_4", script: "", state: "queued"),
      ],
      botCount: 4, online: 2,
      cooldowns: [
        Cooldown(id: "1", name: "Daily kit", startAt: now - 3_600_000 * 2, dueAt: now + 47 * 60_000),
        Cooldown(id: "2", name: "Vote rewards", startAt: now - 3_600_000, dueAt: now + 3_600_000 * 3),
        Cooldown(id: "3", name: "Weekly crate", startAt: now - 86_400_000, dueAt: now + 86_400_000 * 3),
      ]
    )
  }()
}
