require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'expo-ios-alarm'
  s.version        = package['version']
  s.summary        = package['description'] || 'A local Expo module for iOS AlarmKit integration'
  s.description    = package['description'] || 'A local Expo module for iOS AlarmKit integration'
  s.license        = package['license'] || 'MIT'
  s.author         = package['author'] || 'Local User'
  s.homepage       = package['homepage'] || 'https://example.com'
  s.platforms      = { :ios => '16.1' }
  s.swift_version  = '5.4'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'AlarmKit'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
