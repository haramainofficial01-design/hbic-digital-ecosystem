const fs = require("fs");
const path = require("path");
const { IOSConfig, withAppDelegate, withInfoPlist, withPodfile, withXcodeProject } = require("@expo/config-plugins");

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
  config = withPodfile(config, (mod) => {
    const marker = "# HBIC minimum iOS pod target for current SDK";
    if (!mod.modResults.contents.includes(marker)) {
      const hook = "  post_install do |installer|";
      if (!mod.modResults.contents.includes(hook)) throw new Error("HBIC iOS pod target requires the existing post_install hook.");
      mod.modResults.contents = mod.modResults.contents.replace(hook, `${hook}\n    ${marker}\n    installer.pods_project.targets.each do |target|\n      target.build_configurations.each do |build_config|\n        deployment = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']\n        if deployment && Gem::Version.new(deployment) < Gem::Version.new('15.1')\n          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'\n        end\n      end\n    end`);
    }
    return mod;
  });
  return config;
};
