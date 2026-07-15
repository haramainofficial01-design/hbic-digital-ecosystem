const fs = require("fs");
const path = require("path");
const { IOSConfig, withFinalizedMod } = require("@expo/config-plugins");

const targetProducts = {
  MasjidPrayerWidgets: "MasjidPrayerWidgets.appex",
  MasjidBilalWatch: "MasjidBilalWatch.app",
  MasjidPrayerComplications: "MasjidPrayerComplications.appex"
};

function schemeXml({ blueprintIdentifier, buildableName, projectName, targetName }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2600" version="1.7">
  <BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES">
    <BuildActionEntries>
      <BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">
        <BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${blueprintIdentifier}" BuildableName="${buildableName}" BlueprintName="${targetName}" ReferencedContainer="container:${projectName}.xcodeproj"/>
      </BuildActionEntry>
    </BuildActionEntries>
  </BuildAction>
  <TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.DebuggerFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"/>
  <LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.DebuggerFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"/>
  <ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"/>
  <AnalyzeAction buildConfiguration="Debug"/>
  <ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
`;
}

module.exports = function withAppleTargetSchemes(config) {
  return withFinalizedMod(config, ["ios", async (mod) => {
    const projectFile = IOSConfig.Paths.getPBXProjectPath(mod.modRequest.projectRoot);
    const projectPath = path.dirname(projectFile);
    const projectName = path.basename(projectPath, ".xcodeproj");
    const project = fs.readFileSync(projectFile, "utf8");
    const schemesDirectory = path.join(
      projectPath,
      "xcshareddata",
      "xcschemes"
    );
    fs.mkdirSync(schemesDirectory, { recursive: true });

    for (const [targetName, buildableName] of Object.entries(targetProducts)) {
      const escapedName = targetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = project.match(new RegExp(`([A-Z0-9]+) /\\* ${escapedName} \\*/ = \\{\\s*isa = PBXNativeTarget;`));
      if (!match) throw new Error(`Cannot create shared scheme: target ${targetName} was not generated.`);
      fs.writeFileSync(
        path.join(schemesDirectory, `${targetName}.xcscheme`),
        schemeXml({ blueprintIdentifier: match[1], buildableName, projectName, targetName })
      );
    }

    return mod;
  }]);
};
