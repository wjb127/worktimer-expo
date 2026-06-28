// Google Sign-In 의존성(AppCheckCore/GoogleUtilities/RecaptchaInterop)을 static library로
// 통합할 때 "do not define modules" 에러 우회. 해당 pod들에 modular_headers를 켠다.
// EAS 빌더(엄격한 CocoaPods)에서 pod install이 깨지는 걸 막음 — 로컬은 관대해서 통과하지만 CI는 실패.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PODS = [
  '  # [withGoogleModularHeaders] static lib + Swift module 통합 우회',
  "  pod 'GoogleUtilities', :modular_headers => true",
  "  pod 'RecaptchaInterop', :modular_headers => true",
  "  pod 'AppCheckCore', :modular_headers => true",
].join('\n');

module.exports = function withGoogleModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (!contents.includes('[withGoogleModularHeaders]')) {
        // target 블록 안의 post_install 앞에 pod 선언 삽입
        contents = contents.replace(
          /^(\s*)post_install do \|installer\|/m,
          `${PODS}\n\n$1post_install do |installer|`,
        );
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
