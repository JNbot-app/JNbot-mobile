import SwiftUI
import WidgetKit

enum Countdown {
  /// Further out than this, a ticking timer is noise; show the day and time instead.
  static let liveWindow: TimeInterval = 24 * 60 * 60

  static func text(until due: Date, from now: Date, palette: Palette) -> Text {
    if due <= now { return Text("Ready").foregroundColor(palette.success) }
    if due.timeIntervalSince(now) < liveWindow { return Text(timerInterval: now...due, countsDown: true) }
    return Text(due, format: .dateTime.weekday(.abbreviated).hour().minute())
  }
}

struct WidgetHeader: View {
  let icon: String
  let title: String
  var meta: Text? = nil
  let palette: Palette

  var body: some View {
    HStack(spacing: 5) {
      Image(systemName: icon)
        .font(.caption2.weight(.semibold))
        .foregroundStyle(palette.primary)
        .widgetAccentable()
      Text(title)
        .font(.caption.weight(.semibold))
        .foregroundStyle(palette.muted)
        .lineLimit(1)
      Spacer(minLength: 6)
      meta?
        .font(.caption2)
        .lineLimit(1)
    }
  }
}

struct EmptyMessage: View {
  let text: String
  let palette: Palette

  var body: some View {
    Text(text)
      .font(.footnote)
      .foregroundStyle(palette.muted)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

extension WidgetFamily {
  var isAccessory: Bool { self == .accessoryCircular || self == .accessoryRectangular || self == .accessoryInline }
}

extension View {
  @ViewBuilder
  func widgetContainer(_ family: WidgetFamily, _ background: Color) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      containerBackground(family.isAccessory ? .clear : background, for: .widget)
    } else if family.isAccessory {
      self
    } else {
      padding().background(background)
    }
  }
}
