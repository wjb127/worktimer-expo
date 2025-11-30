const { withXcodeProject, withInfoPlist, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const WIDGET_NAME = 'WorkTimerWidgetExtension';
const BUNDLE_ID_SUFFIX = '.WorkTimerWidget';

// Widget Extension Swift 파일 내용
const WIDGET_FILES = {
  'WorkTimerAttributes.swift': `import ActivityKit
import Foundation

struct WorkTimerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var elapsedSeconds: Int
        var todayTotal: Int
    }

    var startTime: Date
}
`,
  'WorkTimerLiveActivity.swift': `import ActivityKit
import WidgetKit
import SwiftUI

struct WorkTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkTimerAttributes.self) { context in
            LockScreenView(context: context)
                .activityBackgroundTint(Color.black.opacity(0.8))
                .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading) {
                        Text("업무 중")
                            .font(.caption2)
                            .foregroundColor(.gray)
                        Text(formatTime(context.state.elapsedSeconds))
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing) {
                        Text("오늘 총")
                            .font(.caption2)
                            .foregroundColor(.gray)
                        Text(formatTime(context.state.todayTotal + context.state.elapsedSeconds))
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Image(systemName: "clock.fill")
                            .foregroundColor(.green)
                        Text("시작: \\(formatStartTime(context.attributes.startTime))")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
            } compactLeading: {
                Image(systemName: "clock.fill")
                    .foregroundColor(.green)
            } compactTrailing: {
                Text(formatTime(context.state.elapsedSeconds))
                    .font(.caption)
                    .foregroundColor(.white)
            } minimal: {
                Image(systemName: "clock.fill")
                    .foregroundColor(.green)
            }
        }
    }

    private func formatTime(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        } else {
            return String(format: "%02d:%02d", minutes, secs)
        }
    }

    private func formatStartTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
}

struct LockScreenView: View {
    let context: ActivityViewContext<WorkTimerAttributes>

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: "clock.fill")
                        .foregroundColor(.green)
                    Text("업무 진행 중")
                        .font(.headline)
                        .foregroundColor(.white)
                }
                Text(formatTime(context.state.elapsedSeconds))
                    .font(.system(size: 36, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text("오늘 총")
                    .font(.caption)
                    .foregroundColor(.gray)
                Text(formatTime(context.state.todayTotal + context.state.elapsedSeconds))
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.green)
            }
        }
        .padding()
    }

    private func formatTime(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        } else {
            return String(format: "%02d:%02d", minutes, secs)
        }
    }
}
`,
  'WorkTimerWidgetBundle.swift': `import WidgetKit
import SwiftUI

@main
struct WorkTimerWidgetBundle: WidgetBundle {
    var body: some Widget {
        WorkTimerLiveActivity()
    }
}
`,
  'Info.plist': `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>NSExtension</key>
\t<dict>
\t\t<key>NSExtensionPointIdentifier</key>
\t\t<string>com.apple.widgetkit-extension</string>
\t</dict>
</dict>
</plist>
`
};

// Native Module 파일 내용
const NATIVE_MODULE_FILES = {
  'LiveActivityModule.swift': `import Foundation
import ActivityKit

struct WorkTimerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var elapsedSeconds: Int
        var todayTotal: Int
    }
    var startTime: Date
}

@objc(LiveActivityModule)
class LiveActivityModule: NSObject {
    private var currentActivity: Any?

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }

    @objc
    func startActivity(_ startTimeMs: Double, todayTotal: Int, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                rejecter("ERROR", "Live Activities are not enabled", nil)
                return
            }
            let startTime = Date(timeIntervalSince1970: startTimeMs / 1000)
            let attributes = WorkTimerAttributes(startTime: startTime)
            let initialState = WorkTimerAttributes.ContentState(elapsedSeconds: 0, todayTotal: todayTotal)
            do {
                let activity = try Activity<WorkTimerAttributes>.request(
                    attributes: attributes,
                    content: .init(state: initialState, staleDate: nil),
                    pushType: nil
                )
                currentActivity = activity
                resolver(activity.id)
            } catch {
                rejecter("ERROR", "Failed to start activity: \\(error.localizedDescription)", error)
            }
        } else {
            rejecter("ERROR", "Live Activities require iOS 16.2+", nil)
        }
    }

    @objc
    func updateActivity(_ elapsedSeconds: Int, todayTotal: Int, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            var activity = currentActivity as? Activity<WorkTimerAttributes>
            if activity == nil {
                let activities = Activity<WorkTimerAttributes>.activities
                if let existingActivity = activities.first {
                    currentActivity = existingActivity
                    activity = existingActivity
                } else {
                    rejecter("ERROR", "No active Live Activity found", nil)
                    return
                }
            }
            Task {
                let updatedState = WorkTimerAttributes.ContentState(elapsedSeconds: elapsedSeconds, todayTotal: todayTotal)
                let content = ActivityContent(state: updatedState, staleDate: nil)
                await activity?.update(content)
                resolver(true)
            }
        } else {
            rejecter("ERROR", "Live Activities require iOS 16.2+", nil)
        }
    }

    @objc
    func endActivity(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<WorkTimerAttributes>.activities {
                    await activity.end(using: nil, dismissalPolicy: .immediate)
                }
                currentActivity = nil
                resolver(true)
            }
        } else {
            rejecter("ERROR", "Live Activities require iOS 16.2+", nil)
        }
    }

    @objc
    func isActivityRunning(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            let isRunning = !Activity<WorkTimerAttributes>.activities.isEmpty
            resolver(isRunning)
        } else {
            resolver(false)
        }
    }

    @objc
    func areActivitiesEnabled(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            resolver(ActivityAuthorizationInfo().areActivitiesEnabled)
        } else {
            resolver(false)
        }
    }
}
`,
  'LiveActivityModule.m': `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LiveActivityModule, NSObject)

RCT_EXTERN_METHOD(startActivity:(double)startTimeMs
                  todayTotal:(int)todayTotal
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateActivity:(int)elapsedSeconds
                  todayTotal:(int)todayTotal
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endActivity:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isActivityRunning:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(areActivitiesEnabled:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
`
};

function withLiveActivity(config) {
  // Info.plist에 NSSupportsLiveActivities 추가
  config = withInfoPlist(config, (config) => {
    config.modResults.NSSupportsLiveActivities = true;
    return config;
  });

  // Widget Extension 파일 생성 및 Native Module 추가
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosPath = path.join(config.modRequest.projectRoot, 'ios');
      const widgetPath = path.join(iosPath, WIDGET_NAME);
      const appName = config.modRequest.projectName || 'worktimerexpo';
      const appPath = path.join(iosPath, appName);

      // Widget Extension 폴더 생성
      if (!fs.existsSync(widgetPath)) {
        fs.mkdirSync(widgetPath, { recursive: true });
      }

      // Widget Extension 파일들 생성
      for (const [filename, content] of Object.entries(WIDGET_FILES)) {
        const filePath = path.join(widgetPath, filename);
        fs.writeFileSync(filePath, content);
        console.log(`Created: ${filePath}`);
      }

      // Assets.xcassets 폴더 생성
      const assetsPath = path.join(widgetPath, 'Assets.xcassets');
      if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, { recursive: true });
        fs.writeFileSync(path.join(assetsPath, 'Contents.json'), '{"info":{"author":"xcode","version":1}}');

        // AccentColor
        const accentPath = path.join(assetsPath, 'AccentColor.colorset');
        fs.mkdirSync(accentPath, { recursive: true });
        fs.writeFileSync(path.join(accentPath, 'Contents.json'), '{"colors":[{"idiom":"universal"}],"info":{"author":"xcode","version":1}}');

        // WidgetBackground
        const bgPath = path.join(assetsPath, 'WidgetBackground.colorset');
        fs.mkdirSync(bgPath, { recursive: true });
        fs.writeFileSync(path.join(bgPath, 'Contents.json'), '{"colors":[{"idiom":"universal"}],"info":{"author":"xcode","version":1}}');

        // AppIcon
        const iconPath = path.join(assetsPath, 'AppIcon.appiconset');
        fs.mkdirSync(iconPath, { recursive: true });
        fs.writeFileSync(path.join(iconPath, 'Contents.json'), '{"images":[{"idiom":"universal","platform":"ios","size":"1024x1024"}],"info":{"author":"xcode","version":1}}');
      }

      // Native Module 파일들 생성
      for (const [filename, content] of Object.entries(NATIVE_MODULE_FILES)) {
        const filePath = path.join(appPath, filename);
        fs.writeFileSync(filePath, content);
        console.log(`Created: ${filePath}`);
      }

      // Bridging Header 수정
      const bridgingHeaderPath = path.join(appPath, `${appName}-Bridging-Header.h`);
      if (fs.existsSync(bridgingHeaderPath)) {
        let content = fs.readFileSync(bridgingHeaderPath, 'utf8');
        if (!content.includes('#import <React/RCTBridgeModule.h>')) {
          content += '\n#import <React/RCTBridgeModule.h>\n';
          fs.writeFileSync(bridgingHeaderPath, content);
          console.log(`Updated: ${bridgingHeaderPath}`);
        }
      }

      console.log('Live Activity files created successfully');
      return config;
    },
  ]);

  // Xcode 프로젝트 수정
  config = withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const mainBundleId = config.ios?.bundleIdentifier || 'com.gawall.worktimer';
    const widgetBundleId = mainBundleId + BUNDLE_ID_SUFFIX;
    const appName = config.modRequest.projectName || 'worktimerexpo';

    // Native Module 파일들을 프로젝트에 추가
    const appGroup = xcodeProject.pbxGroupByName(appName);
    if (appGroup) {
      // LiveActivityModule.swift 추가
      const swiftFileKey = xcodeProject.generateUuid();
      const swiftBuildFileKey = xcodeProject.generateUuid();

      xcodeProject.addToPbxFileReferenceSection({
        [swiftFileKey]: {
          isa: 'PBXFileReference',
          lastKnownFileType: 'sourcecode.swift',
          name: 'LiveActivityModule.swift',
          path: `${appName}/LiveActivityModule.swift`,
          sourceTree: '"<group>"'
        }
      });

      xcodeProject.addToPbxBuildFileSection({
        [swiftBuildFileKey]: {
          isa: 'PBXBuildFile',
          fileRef: swiftFileKey,
          fileRef_comment: 'LiveActivityModule.swift'
        }
      });

      // LiveActivityModule.m 추가
      const mFileKey = xcodeProject.generateUuid();
      const mBuildFileKey = xcodeProject.generateUuid();

      xcodeProject.addToPbxFileReferenceSection({
        [mFileKey]: {
          isa: 'PBXFileReference',
          lastKnownFileType: 'sourcecode.c.objc',
          name: 'LiveActivityModule.m',
          path: `${appName}/LiveActivityModule.m`,
          sourceTree: '"<group>"'
        }
      });

      xcodeProject.addToPbxBuildFileSection({
        [mBuildFileKey]: {
          isa: 'PBXBuildFile',
          fileRef: mFileKey,
          fileRef_comment: 'LiveActivityModule.m'
        }
      });

      // Sources build phase에 추가
      const mainTarget = xcodeProject.getFirstTarget();
      const sourcesBuildPhase = xcodeProject.pbxSourcesBuildPhaseObj(mainTarget.firstTarget.uuid);
      if (sourcesBuildPhase && sourcesBuildPhase.files) {
        sourcesBuildPhase.files.push({ value: swiftBuildFileKey, comment: 'LiveActivityModule.swift in Sources' });
        sourcesBuildPhase.files.push({ value: mBuildFileKey, comment: 'LiveActivityModule.m in Sources' });
      }

      // 그룹에 파일 추가
      const groupKey = appGroup.uuid || Object.keys(xcodeProject.hash.project.objects.PBXGroup).find(
        key => xcodeProject.hash.project.objects.PBXGroup[key].name === appName
      );
      if (groupKey) {
        const group = xcodeProject.hash.project.objects.PBXGroup[groupKey];
        if (group && group.children) {
          group.children.push({ value: swiftFileKey, comment: 'LiveActivityModule.swift' });
          group.children.push({ value: mFileKey, comment: 'LiveActivityModule.m' });
        }
      }
    }

    console.log('Added Native Module files to Xcode project');
    return config;
  });

  return config;
}

module.exports = withLiveActivity;
