package com.jnbot.app.background

import android.content.Context
import android.content.Intent
import android.content.ComponentName
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import java.util.Locale

class JNbotBackgroundModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private data class ManufacturerSettingsTarget(
        val packageName: String,
        val className: String,
    )

    override fun getName(): String = "JNbotBackgroundModule"

    @ReactMethod
    fun startService(title: String, message: String, details: String, promise: Promise) {
        try {
            val intent = Intent(reactContext, JNbotBackgroundService::class.java).apply {
                action = JNbotBackgroundService.ACTION_START
                putExtra(JNbotBackgroundService.EXTRA_TITLE, title)
                putExtra(JNbotBackgroundService.EXTRA_MESSAGE, message)
                putExtra(JNbotBackgroundService.EXTRA_DETAILS, details)
            }
            ContextCompat.startForegroundService(reactContext, intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_START_SERVICE", e.message, e)
        }
    }

    @ReactMethod
    fun updateNotification(title: String, message: String, details: String, promise: Promise) {
        try {
            val intent = Intent(reactContext, JNbotBackgroundService::class.java).apply {
                action = JNbotBackgroundService.ACTION_UPDATE
                putExtra(JNbotBackgroundService.EXTRA_TITLE, title)
                putExtra(JNbotBackgroundService.EXTRA_MESSAGE, message)
                putExtra(JNbotBackgroundService.EXTRA_DETAILS, details)
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_UPDATE_SERVICE", e.message, e)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val intent = Intent(reactContext, JNbotBackgroundService::class.java).apply {
                action = JNbotBackgroundService.ACTION_STOP
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_STOP_SERVICE", e.message, e)
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        try {
            promise.resolve(JNbotBackgroundService.isRunning)
        } catch (e: Exception) {
            promise.reject("ERR_CHECK_SERVICE", e.message, e)
        }
    }

    @ReactMethod
    fun isBatteryOptimizationIgnored(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                val isIgnored = powerManager?.isIgnoringBatteryOptimizations(reactContext.packageName) ?: false
                promise.resolve(isIgnored)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERR_BATTERY_CHECK", e.message, e)
        }
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimization(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                if (powerManager?.isIgnoringBatteryOptimizations(reactContext.packageName) == true) {
                    promise.resolve(true)
                    return
                }

                val intent = Intent().apply {
                    action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                    data = Uri.parse("package:${reactContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

                if (intent.resolveActivity(reactContext.packageManager) != null) {
                    reactContext.startActivity(intent)
                    promise.resolve(true)
                } else {
                    val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactContext.startActivity(fallbackIntent)
                    promise.resolve(true)
                }
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERR_REQUEST_BATTERY", e.message, e)
        }
    }

    @ReactMethod
    fun getBackgroundPowerStatus(promise: Promise) {
        try {
            promise.resolve(buildBackgroundPowerStatus())
        } catch (e: Exception) {
            promise.reject("ERR_BACKGROUND_POWER_STATUS", e.message, e)
        }
    }

    @ReactMethod
    fun openManufacturerPowerSettings(promise: Promise) {
        try {
            for (target in manufacturerSettingsTargets()) {
                val intent = Intent().apply {
                    component = ComponentName(target.packageName, target.className)
                    putExtra("packageName", reactContext.packageName)
                    putExtra("packagename", reactContext.packageName)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                if (startSettingsIntent(intent)) {
                    promise.resolve(settingsResult(opened = true, route = "vivo-power-manager"))
                    return
                }
            }

            val appDetailsIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${reactContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (startSettingsIntent(appDetailsIntent)) {
                promise.resolve(settingsResult(opened = true, route = "app-details"))
                return
            }

            val batteryOptimizationIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (startSettingsIntent(batteryOptimizationIntent)) {
                promise.resolve(settingsResult(opened = true, route = "battery-optimization-list"))
                return
            }

            promise.resolve(settingsResult(opened = false, route = "unavailable"))
        } catch (e: Exception) {
            promise.reject("ERR_MANUFACTURER_POWER_SETTINGS", e.message, e)
        }
    }

    private fun buildBackgroundPowerStatus(): WritableMap {
        val manufacturer = Build.MANUFACTURER.orEmpty().trim().lowercase(Locale.US)
        val isVivoFamily = manufacturer.contains("vivo") || manufacturer.contains("iqoo")
        val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val isIgnored = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            powerManager?.isIgnoringBatteryOptimizations(reactContext.packageName) ?: false
        } else {
            true
        }
        val hasRoute = manufacturerSettingsTargets().any { target ->
            Intent().setComponent(ComponentName(target.packageName, target.className))
                .resolveActivity(reactContext.packageManager) != null
        }

        return Arguments.createMap().apply {
            putBoolean("isBatteryOptimizationIgnored", isIgnored)
            putString("manufacturer", manufacturer)
            putString("model", Build.MODEL.orEmpty())
            putBoolean("requiresManufacturerSetup", isVivoFamily)
            putBoolean("hasManufacturerSettingsRoute", hasRoute)
        }
    }

    private fun manufacturerSettingsTargets(): List<ManufacturerSettingsTarget> {
        val manufacturer = Build.MANUFACTURER.orEmpty().lowercase(Locale.US)
        if (!manufacturer.contains("vivo") && !manufacturer.contains("iqoo")) {
            return emptyList()
        }
        return listOf(
            ManufacturerSettingsTarget(
                "com.vivo.abe",
                "com.vivo.applicationbehaviorengine.ui.ExcessivePowerManagerActivity",
            ),
            ManufacturerSettingsTarget(
                "com.iqoo.secure",
                "com.iqoo.secure.ui.powersaving.PowerSavingManagerActivity",
            ),
            ManufacturerSettingsTarget(
                "com.iqoo.secure",
                "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity",
            ),
            ManufacturerSettingsTarget(
                "com.vivo.permissionmanager",
                "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
            ),
        )
    }

    private fun startSettingsIntent(intent: Intent): Boolean {
        return try {
            reactContext.startActivity(intent)
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun settingsResult(opened: Boolean, route: String): WritableMap {
        return Arguments.createMap().apply {
            putBoolean("opened", opened)
            putString("route", route)
        }
    }
}
