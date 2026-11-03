package com.jnbot.app.widgets

import android.content.Context
import android.graphics.Color
import org.json.JSONArray
import org.json.JSONObject

/** Mirror of src/widgets/widgetSnapshot.ts. */
internal class WidgetSnapshot(json: JSONObject) {
  class Bot(val id: Int, val name: String, val script: String, val state: String)
  class Cooldown(val name: String, val startAt: Long, val dueAt: Long)

  val updatedAt = json.getLong("updatedAt")
  val profile: String? = if (json.isNull("profile")) null else json.getString("profile")
  val live = json.getBoolean("live")
  val botCount = json.getInt("botCount")
  val online = json.getInt("online")
  val bots = json.getJSONArray("bots").objects().map {
    Bot(it.getInt("id"), it.getString("name"), it.getString("script"), it.getString("state"))
  }
  val cooldowns = json.getJSONArray("cooldowns").objects().map {
    Cooldown(it.getString("name"), it.getLong("startAt"), it.getLong("dueAt"))
  }
  private val colors = json.getJSONObject("colors")

  fun color(key: String): Int = Color.parseColor(colors.getString(key))

  /** Bot state is only trustworthy while the app keeps reporting it. */
  fun isStale(now: Long) = !live || now - updatedAt > STALE_MS

  companion object {
    const val STALE_MS = 10 * 60_000L
    private const val PREFS = "jnbot_widgets"
    private const val KEY = "snapshot"

    fun save(context: Context, json: String) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
    }

    fun load(context: Context): WidgetSnapshot? {
      val json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: return null
      return runCatching { JSONObject(json).takeIf { it.getInt("v") == 1 }?.let(::WidgetSnapshot) }.getOrNull()
    }
  }
}

private fun JSONArray.objects() = (0 until length()).map { getJSONObject(it) }
