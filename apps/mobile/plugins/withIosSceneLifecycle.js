const fs = require("fs");
const path = require("path");
const { IOSConfig, withAppDelegate, withInfoPlist, withXcodeProject } = require("@expo/config-plugins");

const sceneFile = "SceneDelegate.swift";

function withSceneManifest(config) {
  return withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate"
          }
        ]
      }
    };
    return mod;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== "swift") {
      throw new Error("HBIC iOS scene lifecycle requires a Swift AppDelegate.");
    }
    let source = mod.modResults.contents;
    if (!source.includes("var sceneLaunchOptions:")) {
      source = source.replace(
        "  var window: UIWindow?\n",
        "  var window: UIWindow?\n  var sceneLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?\n"
      );
    }
    source = source.replace(
      /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif/,
      "#if os(iOS) || os(tvOS)\n    sceneLaunchOptions = launchOptions\n#endif"
    );
    mod.modResults.contents = source;
    return mod;
  });
}

function withSceneSource(config) {
  return withXcodeProject(config, (mod) => {
    const projectName = mod.modRequest.projectName;
    const sourcePath = path.join(__dirname, sceneFile);
    const destinationPath = path.join(mod.modRequest.platformProjectRoot, projectName, sceneFile);
    fs.copyFileSync(sourcePath, destinationPath);

    const project = mod.modResults;
    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: path.join(projectName, sceneFile),
      groupName: projectName,
      project,
      targetUuid: project.getFirstTarget().uuid
    });
    return mod;
  });
}

module.exports = function withIosSceneLifecycle(config) {
  config = withSceneManifest(config);
  config = withSceneAppDelegate(config);
  config = withSceneSource(config);
  return config;
};
