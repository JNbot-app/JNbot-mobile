package com.jnbot.app.widgets

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.SystemClock
import android.text.format.DateFormat
import android.view.View
import android.widget.RemoteViews
import java.util.Locale

internal object JNbotWidgets {
  const val ACTION_REFRESH = "com.jnbot.app.widgets.REFRESH"
  private const val DAY_MS = 24 * 60 * 60_000L
  private const val WIDE_MIN_WIDTH_DP = 220

  fun refreshAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val snapshot = WidgetSnapshot.load(context)
    val now = System.currentTimeMillis()
    for (id in manager.getAppWidgetIds(ComponentName(context, CooldownsWidgetProvider::class.java))) {
      manager.updateAppWidget(id, CooldownsWidget.render(context, snapshot, isWide(manager, id), now))
    }
    for (id in manager.getAppWidgetIds(ComponentName(context, BotsWidgetProvider::class.java))) {
      manager.updateAppWidget(id, BotsWidget.render(context, snapshot, isWide(manager, id), now))
    }
    scheduleNextRefresh(context, snapshot, now)
  }

  /** Re-render when a cooldown turns ready, switches to a live timer, or bot data goes stale. */
  private fun scheduleNextRefresh(context: Context, snapshot: WidgetSnapshot?, now: Long) {
    val events = snapshot?.cooldowns.orEmpty().flatMap { listOf(it.dueAt, it.dueAt - DAY_MS) } +
      listOfNotNull(snapshot?.takeIf { it.live }?.let { it.updatedAt + WidgetSnapshot.STALE_MS })
    val next = events.filter { it > now }.minOrNull()
    val intent = PendingIntent.getBroadcast(
      context,
      0,
      Intent(context, CooldownsWidgetProvider::class.java).setAction(ACTION_REFRESH),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    val alarms = context.getSystemService(AlarmManager::class.java)
    // RTC (not wakeup): delivered once the screen is on, which is when the widget is visible.
    if (next == null) alarms.cancel(intent) else alarms.set(AlarmManager.RTC, next + 500, intent)
  }

  private fun isWide(manager: AppWidgetManager, id: Int) =
    manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH) >= WIDE_MIN_WIDTH_DP

  fun open(context: Context, uri: String): PendingIntent = PendingIntent.getActivity(
    context,
    uri.hashCode(),
    Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(context.packageName),
    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
  )

  /** Launchers reapply updates onto the existing views, so visibility and rows are reset on every render. */
  fun RemoteViews.applyChrome(snapshot: WidgetSnapshot, contentId: Int, textIds: IntArray, mutedIds: IntArray) {
    setViewVisibility(R.id.empty, View.GONE)
    setViewVisibility(contentId, View.VISIBLE)
    setInt(R.id.widget_bg, "setColorFilter", snapshot.color("bg"))
    textIds.forEach { setTextColor(it, snapshot.color("text")) }
    mutedIds.forEach { setTextColor(it, snapshot.color("muted")) }
  }

  fun RemoteViews.showEmpty(message: String, contentId: Int) {
    setTextViewText(R.id.empty, message)
    setViewVisibility(R.id.empty, View.VISIBLE)
    setViewVisibility(contentId, View.GONE)
  }

  /** Live countdown within a day, otherwise the local day and time it is ready. */
  fun RemoteViews.bindCountdown(timerId: Int, textId: Int, dueAt: Long, now: Long, snapshot: WidgetSnapshot) {
    val remaining = dueAt - now
    val live = remaining in 1 until DAY_MS
    setViewVisibility(timerId, if (live) View.VISIBLE else View.GONE)
    setViewVisibility(textId, if (live) View.GONE else View.VISIBLE)
    if (live) {
      setChronometer(timerId, SystemClock.elapsedRealtime() + remaining, null, true)
      setChronometerCountDown(timerId, true)
      setTextColor(timerId, snapshot.color("text"))
    } else if (remaining <= 0) {
      setTextViewText(textId, "Ready")
      setTextColor(textId, snapshot.color("success"))
    } else {
      val pattern = DateFormat.getBestDateTimePattern(Locale.getDefault(), "EEEjm")
      setTextViewText(textId, DateFormat.format(pattern, dueAt))
      setTextColor(textId, snapshot.color("text"))
    }
  }

  fun updatedLabel(context: Context, snapshot: WidgetSnapshot) =
    "Updated ${DateFormat.getTimeFormat(context).format(snapshot.updatedAt)}"
}
