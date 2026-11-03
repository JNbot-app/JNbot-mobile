package com.jnbot.app.widgets

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class JNbotWidgetsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("JNbotWidgets")

    AsyncFunction("setSnapshot") { json: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      WidgetSnapshot.save(context, json)
      JNbotWidgets.refreshAll(context)
    }
  }
}
