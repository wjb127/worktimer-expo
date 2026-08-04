#!/usr/bin/env bash
# 필타임 PWA(app.filltime.app) 빌드 + 배포.
#
# 이 스크립트가 존재하는 이유는 익스포트 뒤에 **반드시 해야 하는 후처리**가 있기 때문이다.
# 손으로 하면 반드시 빠뜨린다(실제로 빠뜨려서 아이콘이 전부 두부(☒)로 나갔다).
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="web-build"

echo "[1/4] expo export --platform web → $OUT"
npx expo export --platform web --output-dir "$OUT" --clear

# ── 핵심 후처리 ─────────────────────────────────────────────────────────────
# @expo/vector-icons의 폰트는 node_modules 안에 있어서 익스포트 산출물 경로가
#   assets/node_modules/@expo/vector-icons/.../Ionicons.<hash>.ttf
# 가 된다. Vercel 정적 배포는 **node_modules 경로를 기본 제외**하기 때문에
# 이 파일만 404가 되고, 앱의 모든 아이콘이 두부 글리프(☒)로 렌더된다.
# (실측: 같은 assets/ 아래 assets/assets/icon.png는 200, node_modules 쪽은 404)
#
# .vercelignore의 negation으로 그 기본 제외를 되돌린다.
echo "[2/4] .vercelignore 작성 (node_modules 제외 해제 — 아이콘 폰트 404 방지)"
printf '%s\n' '!node_modules' > "$OUT/.vercelignore"

echo "[3/4] 산출물 검증"
test -f "$OUT/index.html" || { echo "index.html 없음 — 익스포트 실패" >&2; exit 1; }
test -f "$OUT/manifest.webmanifest" || { echo "manifest 없음" >&2; exit 1; }
test -f "$OUT/sw.js" || { echo "sw.js 없음" >&2; exit 1; }
FONT=$(find "$OUT/assets" -name 'Ionicons.*.ttf' | head -1)
test -n "$FONT" || { echo "Ionicons 폰트가 산출물에 없음" >&2; exit 1; }
echo "     폰트: ${FONT#$OUT/}"

# vercel은 **배포 대상 디렉토리 기준**으로 프로젝트 링크를 찾는데, 위 익스포트가
# --clear로 $OUT을 통째로 비워서 매번 링크가 사라진다(실측: "프로젝트를 못 찾음" 실패).
# 그래서 정본 링크는 저장소 루트(.vercel/, gitignore)에 두고 배포 직전에 복사한다.
test -f .vercel/project.json || {
  echo "저장소 루트에 .vercel/project.json 이 없습니다." >&2
  echo "먼저: npx vercel link --yes --scope seungbeen-wis-projects --project filltime-pwa" >&2
  exit 1; }
mkdir -p "$OUT/.vercel"
cp .vercel/project.json "$OUT/.vercel/project.json"

echo "[4/4] vercel 배포 (prod)"
( cd "$OUT" && npx --yes vercel deploy --prod --yes )

# 배포 직후 실제로 서빙되는지 확인한다 — 여기서 폰트가 404면 위 후처리가 깨진 것이다.
BASE="https://app.filltime.app"
sleep 8
for p in "/" "/manifest.webmanifest" "/sw.js" "/${FONT#$OUT/}"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$BASE$p" || echo 000)
  printf '  %-22s %s\n' "$code" "$p"
  [ "$code" = "200" ] || { echo "배포 검증 실패: $p" >&2; exit 1; }
done
echo "배포 완료: $BASE"
