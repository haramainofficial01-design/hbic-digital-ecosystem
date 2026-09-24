import ExpoModulesCore
import Foundation
import WatchConnectivity
import WidgetKit

private enum MasjidAppleConstants {
  static let appGroup = "group.ca.hbic.calgary.app"
  static let snapshotKey = "masjid_prayer_snapshot_v1"
  static let widgetKind = "MasjidPrayerWidgets"
}

private struct BridgePrayerEntry: Decodable {
  let key: String
  let adhanDate: String
}

private struct BridgePrayerSnapshot: Decodable {
  let schemaVersion: Int
  let masjidID: String
  let timezone: String
  let masjidTimeZoneIdentifier: String?
  let nextPrayerName: String
  let nextPrayerDate: String
  let prayers: [BridgePrayerEntry]
  let generatedAt: String
  let expiresAt: String

  var generatedAtValue: Date? { Self.date(generatedAt) }

  var isValid: Bool {
    (1...2).contains(schemaVersion) &&
      masjidID == "masjid-bilal-calgary" &&
      (masjidTimeZoneIdentifier ?? timezone) == "America/Edmonton" &&
      !nextPrayerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
      !prayers.isEmpty &&
      Self.date(nextPrayerDate) != nil &&
      Self.date(generatedAt) != nil &&
      Self.date(expiresAt) != nil &&
      prayers.allSatisfy { !$0.key.isEmpty && Self.date($0.adhanDate) != nil }
  }

  private static let fractionalDateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()

  private static let standardDateFormatter = ISO8601DateFormatter()

  private static func date(_ value: String) -> Date? {
    fractionalDateFormatter.date(from: value) ?? standardDateFormatter.date(from: value)
  }
}

public final class MasjidAppleBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MasjidAppleBridge")

    Function("updatePrayerSnapshot") { (json: String) -> Bool in
      guard
        let data = json.data(using: .utf8),
        let snapshot = try? JSONDecoder().decode(BridgePrayerSnapshot.self, from: data),
        snapshot.isValid
      else {
        return false
      }

      let defaults = UserDefaults(suiteName: MasjidAppleConstants.appGroup)
      if
        let existingData = defaults?.data(forKey: MasjidAppleConstants.snapshotKey),
        let existing = try? JSONDecoder().decode(BridgePrayerSnapshot.self, from: existingData),
        let existingDate = existing.generatedAtValue,
        let incomingDate = snapshot.generatedAtValue,
        incomingDate < existingDate
      {
        return false
      }

      if defaults?.data(forKey: MasjidAppleConstants.snapshotKey) == data {
        MasjidWatchSession.shared.update(with: json, schemaVersion: snapshot.schemaVersion)
        return true
      }

      defaults?.set(data, forKey: MasjidAppleConstants.snapshotKey)
      WidgetCenter.shared.reloadTimelines(ofKind: MasjidAppleConstants.widgetKind)
      MasjidWatchSession.shared.update(with: json, schemaVersion: snapshot.schemaVersion)
      return true
    }

    Function("readPrayerSnapshot") { () -> String? in
      guard
        let data = UserDefaults(suiteName: MasjidAppleConstants.appGroup)?.data(forKey: MasjidAppleConstants.snapshotKey)
      else {
        return nil
      }
      return String(data: data, encoding: .utf8)
    }

    Function("isWatchSupported") { () -> Bool in
      WCSession.isSupported()
    }
  }
}

private final class MasjidWatchSession: NSObject, WCSessionDelegate {
  static let shared = MasjidWatchSession()

  private let queue = DispatchQueue(label: "ca.hbic.masjid-bilal.watch-sync")
  private var pendingContext: [String: Any]?

  func update(with json: String, schemaVersion: Int) {
    guard WCSession.isSupported() else { return }
    let context: [String: Any] = [
      "schemaVersion": schemaVersion,
      "prayerSnapshot": json,
      "sentAt": ISO8601DateFormatter().string(from: Date())
    ]

    queue.async {
      let session = WCSession.default
      session.delegate = self
      self.pendingContext = context
      if session.activationState == .activated {
        self.flushPendingContext(using: session)
      } else {
        session.activate()
      }
    }
  }

  private func flushPendingContext(using session: WCSession) {
    guard let context = pendingContext else { return }
    do {
      try session.updateApplicationContext(context)
      pendingContext = nil
    } catch {
      // Keep the latest context queued for the next activation or app refresh.
    }
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    guard activationState == .activated, error == nil else { return }
    queue.async { self.flushPendingContext(using: session) }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    guard message["request"] as? String == "prayerSnapshot",
          let data = UserDefaults(suiteName: MasjidAppleConstants.appGroup)?.data(forKey: MasjidAppleConstants.snapshotKey),
          let json = String(data: data, encoding: .utf8) else {
      replyHandler(["available": false])
      return
    }
    replyHandler([
      "available": true,
      "prayerSnapshot": json
    ])
  }
}
