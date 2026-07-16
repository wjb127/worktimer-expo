// app.json을 기반으로 동적 오버라이드 (app.json은 그대로 유지 — 이 파일이 위에 merge됨)
// google-services.json: public repo라 gitignore — EAS 빌드에선 file-type env
// GOOGLE_SERVICES_JSON이 임시 경로로 주입되고, 로컬 prebuild에선 리포 루트 파일 사용.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
  },
});
