Pod::Spec.new do |s|
  s.name = 'QuranVoiceSearch'
  s.version = '1.0.0'
  s.summary = 'Explicit on-device voice navigation for the HBIC Quran reader.'
  s.license = { :type => 'MIT' }
  s.author = 'HBIC'
  s.homepage = 'https://hbic.ca'
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.0'
  s.source = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Speech', 'AVFoundation'
  s.source_files = '**/*.{h,m,swift}'
end
