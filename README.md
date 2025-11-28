# WorkTimer - Expo + Supabase

React Native 모바일 앱 (Expo + Supabase)

## 기술 스택

- **Frontend**: React Native + Expo
- **Backend**: Supabase (SDK + Edge Functions)
- **Language**: TypeScript

## 설정 완료 항목

- ✅ Expo 프로젝트 생성 (TypeScript)
- ✅ Supabase SDK 설치 및 설정
- ✅ 환경 변수 설정 (.env)
- ✅ Supabase 클라이언트 구성
- ✅ 기본 프로젝트 구조

## 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 프로젝트 구조

```
worktimer-expo/
├── src/
│   ├── components/    # 재사용 가능한 컴포넌트
│   ├── screens/       # 화면 컴포넌트
│   ├── hooks/         # 커스텀 훅
│   ├── types/         # TypeScript 타입 정의
│   └── utils/         # 유틸리티 함수
├── lib/
│   └── supabase.ts    # Supabase 클라이언트 설정
├── App.tsx            # 앱 진입점
└── .env               # 환경 변수 (gitignore됨)
```

## Supabase 설정

Supabase 클라이언트는 `lib/supabase.ts`에 설정되어 있습니다.

### 사용 예시

```typescript
import { supabase } from './lib/supabase';

// 데이터 조회
const { data, error } = await supabase
  .from('table_name')
  .select('*');

// 데이터 삽입
const { data, error } = await supabase
  .from('table_name')
  .insert({ column: 'value' });

// 실시간 구독
const subscription = supabase
  .channel('table_changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'table_name' },
    (payload) => console.log(payload)
  )
  .subscribe();
```

## 환경 변수

`.env` 파일에 다음 변수들이 설정되어 있습니다:

- `EXPO_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public 키

## Edge Functions

필요시 Supabase Edge Functions를 사용할 수 있습니다.

```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* payload */ }
});
```
