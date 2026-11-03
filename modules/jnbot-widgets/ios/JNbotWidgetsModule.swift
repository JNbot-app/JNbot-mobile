import ExpoModulesCore
import WidgetKit

public class JNbotWidgetsModule: Module {
  // AltStore re-registers app groups per team and writes the real identifiers to ALTAppGroups.
  private static let appGroup =
    (Bundle.main.object(forInfoDictionaryKey: "ALTAppGroups") as? [String])?.first ?? "group.com.jnbot.app"

  public func definition() -> ModuleDefinition {
    Name("JNbotWidgets")

    AsyncFunction("setSnapshot") { (json: String) in
      UserDefaults(suiteName: Self.appGroup)?.set(json, forKey: "snapshot")
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
