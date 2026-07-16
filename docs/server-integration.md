# 필타임 ↔ codeatlas API 계약 요약 (server-integration)

> 원본 헌장: codeatlas-platform-api/docs/architecture/tenancy.md (합의문 v1.2).
> 이 문서는 필타임(worktimer) 앱에 해당하는 계약 요약만 담는다 — 복사·확장 금지.

- 앱 식별: 서버가 검증된 OAuth audience로 판정. 앱은 로그인 body에 appId를 보내지
  않아도 되고, 보내도 권한에 영향 없다 (게스트만 예외적으로 선택값).
- access JWT에 appId가 포함된다 — 클라이언트는 JWT 내용을 해석·수정하지 않는다.
- 401 = 재로그인 필요 (토큰 만료·판정 불가). 403 = 이 앱의 라우트가 아님(버그).
  404 = 없는/남의 리소스 — 존재 여부를 구분할 수 없음(정상 설계).
- 필타임이 쓰는 라우트: /auth/* /me/* /worktimer/* /todos /ai/* /config/*
- OAuth 클라이언트(iOS/Android/web)는 필타임 전용 — 다른 앱과 공유 금지.
