import Expo
import React
import UIKit

/// UIKit scene lifecycle entry point required by the iOS 27 SDK.
///
/// Expo SDK 54 predates Expo's built-in scene delegate. This delegate keeps
/// the current Expo/React Native factory, while moving window ownership out of
/// `application(_:didFinishLaunchingWithOptions:)` as required by UIKit.
@objc(SceneDelegate)
final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let appDelegate,
      let factory = appDelegate.reactNativeFactory
    else { return }

    let window = MasjidSceneWindow(windowScene: windowScene)
    // A folding/multi-display scene can differ from UIScreen.main. Size the
    // React Native host to its own scene, including after a display transition.
    window.frame = windowScene.coordinateSpace.bounds
    self.window = window
    appDelegate.window = window
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: appDelegate.sceneLaunchOptions
    )
    window.rootViewController?.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
  }

  func windowScene(
    _ windowScene: UIWindowScene,
    didUpdate previousCoordinateSpace: UICoordinateSpace,
    interfaceOrientation previousInterfaceOrientation: UIInterfaceOrientation,
    traitCollection previousTraitCollection: UITraitCollection
  ) {
    window?.frame = windowScene.coordinateSpace.bounds
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = appDelegate?.application(
        UIApplication.shared,
        open: context.url,
        options: [.openInPlace: context.options.openInPlace]
      )
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}

/// Desktop commands are active only while the Quran workspace is mounted.
/// Phone, tablet, prayer, Academy and embedded web screens keep their commands.
private final class MasjidSceneWindow: UIWindow {
  private var quranCommandsEnabled = false
  private var commandObserver: NSObjectProtocol?

  override init(windowScene: UIWindowScene) {
    super.init(windowScene: windowScene)
    guard ProcessInfo.processInfo.isiOSAppOnMac || ProcessInfo.processInfo.isMacCatalystApp else { return }
    commandObserver = NotificationCenter.default.addObserver(
      forName: Notification.Name("ca.hbic.quran.commands.enabled"), object: nil, queue: .main
    ) { [weak self] notification in
      self?.quranCommandsEnabled = notification.userInfo?["enabled"] as? Bool ?? false
    }
  }

  required init?(coder: NSCoder) { super.init(coder: coder) }
  deinit { if let commandObserver { NotificationCenter.default.removeObserver(commandObserver) } }

  override var keyCommands: [UIKeyCommand]? {
    guard quranCommandsEnabled else { return super.keyCommands }
    let commands: [(String, String, String)] = [
      ("1", "Read", "read"), ("2", "Listen", "listen"),
      ("3", "Practise", "practice"), ("4", "Library", "review"),
      ("f", "Search Quran", "search"), (",", "Quran Preferences", "preferences"),
      ("\\", "Toggle Sidebar", "sidebar")
    ]
    return commands.map { input, title, command in
      UIKeyCommand(title: title, action: #selector(quranCommand(_:)), input: input, modifierFlags: .command, propertyList: command)
    }
  }

  @objc private func quranCommand(_ sender: UIKeyCommand) {
    guard quranCommandsEnabled, let command = sender.propertyList as? String else { return }
    NotificationCenter.default.post(name: Notification.Name("ca.hbic.quran.command"), object: nil, userInfo: ["command": command])
  }
}
