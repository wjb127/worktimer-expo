/** @type {import('@bacons/apple-targets/app.plugin').Config} */
// iOS 홈화면 위젯 타겟 — @bacons/apple-targets가 prebuild 시 Xcode 타겟으로 생성.
// 데이터는 App Group(shared UserDefaults)으로 앱→위젯 단방향 전달 (src/lib/widget.ts).
module.exports = {
  type: 'widget',
  name: 'FilltimeWidget',
  // containerBackground(iOS17 API) 사용 — 위젯만 17+, 본앱 배포타겟과 무관
  deploymentTarget: '17.0',
  entitlements: {
    'com.apple.security.application-groups': ['group.kr.codeatlas.worktimer'],
  },
};
