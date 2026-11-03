package com.jnbot.app.widgets

import android.appwidget.AppWidgetManager
import android.content.Context
import android.os.Bundle
import android.widget.RemoteViews
import com.jnbot.app.widgets.JNbotWidgets.applyChrome
import com.jnbot.app.widgets.JNbotWidgets.showEmpty

class BotsWidgetProvider : android.appwidget.AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = JNbotWidgets.refreshAll(context)

  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) =
    JNbotWidgets.refreshAll(context)
}

internal object BotsWidget {
  private const val WIDE_ROWS = 4

  fun render(context: Context, snapshot: WidgetSnapshot?, wide: Boolean, now: Long): RemoteViews {
    val views = RemoteViews(context.packageName, if (wide) R.layout.widget_bots_wide else R.layout.widget_bots)
    val content = if (wide) R.id.rows else R.id.hero
    views.setOnClickPendingIntent(android.R.id.background, JNbotWidgets.open(context, "jnbot://bots"))
    views.setImageViewResource(R.id.title_icon, R.drawable.widget_ic_bot)
    views.setTextViewText(R.id.title, if (wide) snapshot?.profile ?: "Bots" else "Bots")
    if (snapshot == null) return views.apply { showEmpty("Open JNbot to see your bots", content) }

    val stale = snapshot.isStale(now)
    views.applyChrome(snapshot, content, intArrayOf(R.id.count), intArrayOf(R.id.title, R.id.empty, R.id.count_label))
    views.setInt(R.id.title_icon, "setColorFilter", snapshot.color("primary"))
    views.setTextColor(R.id.footer, snapshot.color("faint"))
    views.setTextViewText(R.id.meta, when {
      stale -> if (snapshot.live) JNbotWidgets.updatedLabel(context, snapshot) else "Offline"
      wide -> "${snapshot.online} online"
      else -> snapshot.profile.orEmpty()
    })
    views.setTextColor(R.id.meta, snapshot.color(if (wide && !stale) "success" else "faint"))
    if (snapshot.botCount == 0) return views.apply { showEmpty("No bots running", content) }

    if (wide) {
      views.removeAllViews(R.id.rows)
      snapshot.bots.take(WIDE_ROWS).forEach { views.addView(R.id.rows, row(context, snapshot, it, stale)) }
      val hidden = snapshot.botCount - minOf(snapshot.bots.size, WIDE_ROWS)
      views.setTextViewText(R.id.footer, if (hidden > 0) "+$hidden more" else "")
    } else {
      views.setTextViewText(R.id.count, snapshot.online.toString())
      views.setTextColor(R.id.count, snapshot.color(if (stale) "faint" else "text"))
      views.setTextViewText(R.id.count_label, "online · ${snapshot.botCount} active")
      views.setTextViewText(R.id.footer, if (stale && snapshot.live) JNbotWidgets.updatedLabel(context, snapshot) else "")
    }
    return views
  }

  private fun row(context: Context, snapshot: WidgetSnapshot, bot: WidgetSnapshot.Bot, stale: Boolean) =
    RemoteViews(context.packageName, R.layout.widget_bot_row).apply {
      val color = snapshot.color(stateColor(bot.state, stale))
      setInt(R.id.row_dot, "setColorFilter", color)
      setTextViewText(R.id.row_name, bot.name)
      setTextColor(R.id.row_name, snapshot.color(if (stale) "muted" else "text"))
      setTextViewText(R.id.row_script, bot.script)
      setTextColor(R.id.row_script, snapshot.color("faint"))
      setTextViewText(R.id.row_state, bot.state.replaceFirstChar { it.uppercase() })
      setTextColor(R.id.row_state, color)
      setOnClickPendingIntent(R.id.row_root, JNbotWidgets.open(context, "jnbot://bot/${bot.id}"))
    }

  private fun stateColor(state: String, stale: Boolean) = when {
    stale -> "faint"
    state == "online" -> "success"
    state == "paused" -> "warning"
    state == "failed" -> "danger"
    else -> "faint"
  }
}
