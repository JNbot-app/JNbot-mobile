Pod::Spec.new do |s|
  s.name           = 'JNbotWidgets'
  s.version        = '1.0.0'
  s.summary        = 'Shares JNbot state with the home screen widgets.'
  s.license        = 'UNLICENSED'
  s.author         = 'JNbot'
  s.homepage       = 'https://github.com/usserwout/JNbot-updater'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.frameworks     = 'WidgetKit'
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files   = '**/*.swift'
end
