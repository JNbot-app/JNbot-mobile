package com.jnbot.app.widgets

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import com.jnbot.app.widgets.JNbotWidgets.applyChrome
import com.jnbot.app.widgets.JNbotWidgets.bindCountdown
import com.jnbot.app.widgets.JNbotWidgets.showEmpty

class CooldownsWidgetProvider : android.appwidget.AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = JNbotWidgets.refreshAll(context)

  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) =
    JNbotWidgets.refreshAll(context)

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == JNbotWidgets.ACTION_REFRESH) JNbotWidgets.refreshAll(context)
  }
}

internal object CooldownsWidget {
  private const val WIDE_ROWS = 3

  fun render(context: Context, snapshot: WidgetSnapshot?, wide: Boolean, now: Long): RemoteViews {
    val views = RemoteViews(context.packageName, if (wide) R.layout.widget_cooldowns_wide else R.layout.widget_cooldowns)
    views.setOnClickPendingIntent(android.R.id.background, JNbotWidgets.open(context, "jnbot://automation?section=cooldowns"))
    if (snapshot == null) return views.apply { showEmpty("Open JNbot to load your cooldowns", R.id.content) }

    views.applyChrome(snapshot, R.id.content, intArrayOf(), intArrayOf(R.id.title, R.id.hero_name, R.id.empty))
    views.setTextViewText(R.id.meta, snapshot.profile.orEmpty())
    views.setTextColor(R.id.meta, snapshot.color("faint"))
    views.setTextColor(R.id.footer, snapshot.color("faint"))
    views.setInt(R.id.title_icon, "setColorFilter", snapshot.color("primary"))

    val next = snapshot.cooldowns.firstOrNull()
      ?: return views.apply { showEmpty("No cooldowns yet", R.id.content) }
    views.setTextViewText(R.id.hero_name, next.name)
    views.bindCountdown(R.id.hero_timer, R.id.hero_text, next.dueAt, now, snapshot)
    val span = next.dueAt - next.startAt
    views.setViewVisibility(R.id.hero_progress, if (next.startAt > 0 && span > 0) View.VISIBLE else View.INVISIBLE)
    if (next.startAt > 0 && span > 0) {
      views.setProgressBar(R.id.hero_progress, 1000, ((now - next.startAt) * 1000 / span).toInt().coerceIn(0, 1000), false)
    }

    val rest = snapshot.cooldowns.drop(1)
    val rows = if (wide) rest.take(WIDE_ROWS) else emptyList()
    if (wide) views.removeAllViews(R.id.rows)
    rows.forEach { cooldown ->
      val row = RemoteViews(context.packageName, R.layout.widget_cooldown_row)
      row.setTextViewText(R.id.row_name, cooldown.name)
      row.setTextColor(R.id.row_name, snapshot.color("text"))
      row.bindCountdown(R.id.row_timer, R.id.row_text, cooldown.dueAt, now, snapshot)
      views.addView(R.id.rows, row)
    }
    val hidden = rest.size - rows.size
    views.setTextViewText(R.id.footer, if (hidden > 0) "+$hidden more" else "")
    return views
  }
}
