Pod::Spec.new do |s|
  s.name = 'MasjidAppleBridge'
  s.version = '1.0.0'
  s.summary = 'Shares a compact Masjid Bilal prayer snapshot with Apple extensions.'
  s.description = 'App Group storage, WidgetKit reloads, and WatchConnectivity synchronization.'
  s.license = { :type => 'MIT' }
  s.author = 'Masjid Bilal'
  s.homepage = 'https://hbic.ca'
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.0'
  s.source = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'WidgetKit', 'WatchConnectivity', 'StoreKit'
  s.source_files = '**/*.{h,m,swift}'
end
