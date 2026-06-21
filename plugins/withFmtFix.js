// Xcode 26 clang에서 fmt 라이브러리 consteval 컴파일 에러 우회 (RN 0.81)
// Podfile post_install에 fmt/base.h를 강제로 FMT_USE_CONSTEVAL=0 패치하는 ruby를 주입.
// prebuild/pod install 때마다 자동 적용 → 수동 재패치 불필요 (EAS 빌드에도 적용됨).
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RUBY_PATCH = [
  '    # [withFmtFix] Xcode 26 fmt consteval 우회',
  "    fmt_base = File.join(__dir__, 'Pods', 'fmt', 'include', 'fmt', 'base.h')",
  '    if File.exist?(fmt_base)',
  '      c = File.read(fmt_base)',
  "      unless c.include?('withFmtFix')",
  '        c = c.sub(',
  '          "#if FMT_USE_CONSTEVAL\\n#  define FMT_CONSTEVAL consteval",',
  '          "#undef FMT_USE_CONSTEVAL // withFmtFix\\n#define FMT_USE_CONSTEVAL 0\\n#if FMT_USE_CONSTEVAL\\n#  define FMT_CONSTEVAL consteval")',
  '        File.write(fmt_base, c)',
  '      end',
  '    end',
].join('\n');

module.exports = function withFmtFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (!contents.includes('[withFmtFix]')) {
        contents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${RUBY_PATCH}\n`,
        );
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
