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

  # Removed weak_framework to avoid 'ld: framework not found' on CI if SDK is missing.
  # Swift's #if canImport and @available will handle auto-linking.

  s.source_files = '**/*.{h,m,swift}'
end
