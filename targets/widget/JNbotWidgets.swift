import SwiftUI
import WidgetKit

@main
struct JNbotWidgetBundle: WidgetBundle {
  var body: some Widget {
    CooldownsWidget()
    BotsWidget()
  }
}
