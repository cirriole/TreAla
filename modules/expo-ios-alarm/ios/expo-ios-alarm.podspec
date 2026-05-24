Pod::Spec.new do |s|
  s.name           = 'expo-ios-alarm'
  s.version        = '1.0.0'
  s.summary        = 'Expo module for iOS AlarmKit'
  s.description    = 'Expo module for scheduling native alarms using Apple AlarmKit'
  s.author         = 'ui'
  s.homepage       = 'https://github.com/cirriole/TreAla'
  s.platforms      = { :ios => '16.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # We weak-link native AlarmKit framework so we do not fetch third-party CocoaPods
  s.weak_framework = 'AlarmKit'

  s.source_files = '**/*.{h,m,swift}'
end
