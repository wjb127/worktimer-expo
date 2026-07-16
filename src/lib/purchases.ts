import { Platform } from 'react-native';
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
} from 'react-native-purchases';
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

// RevenueCat 얇은 래퍼 — analytics.ts와 동일한 fail-safe 지연 싱글턴 패턴.
// 핵심 원칙: API 키가 없거나 초기화/네트워크가 실패해도 앱을 절대 크래시/블로킹하지 않는다.
// 키를 넣기 전까지는 완전 no-op → 수익화 "스위치 OFF" 상태(로드맵 Phase 3 전까지).

// entitlement 식별자 — RevenueCat 대시보드에서 동일하게 생성할 것.
export const PREMIUM_ENTITLEMENT = 'premium';

let initialized = false; // initPurchases 멱등 보장
let disabled = false; // 키 없음/초기화 실패 → 완전 no-op

// 플랫폼별 공개 SDK 키. env는 런타임에 읽는다(테스트에서 주입 가능하도록 함수 내부 접근).
function readKey(): string {
  const key =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  return (key ?? '').trim();
}

// 여러 번 호출해도 안전(멱등). 키가 없으면 조용히 비활성(no-op).
export function initPurchases(): void {
  if (initialized) return;
  initialized = true;

  const key = readKey();
  if (!key) {
    disabled = true;
    // 스팸 로그 방지 — 초기화 시 최대 1회만.
    console.log('[purchases] disabled (no RevenueCat key)');
    return;
  }

  try {
    // __DEV__는 RN 전역 — 테스트(node) 환경엔 없을 수 있어 typeof 가드.
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey: key });
  } catch {
    // 초기화 실패해도 앱은 계속 동작(이후 모든 호출 no-op).
    disabled = true;
  }
}

function isReady(): boolean {
  if (!initialized) initPurchases();
  return !disabled;
}

// 로그인 시 호출 — RC appUserID를 우리 백엔드 user id로 통일(크로스디바이스 구독 복원).
// analytics.identifyUser(me.id)와 짝.
export async function logInPurchases(userId: string): Promise<void> {
  if (!isReady() || !userId) return;
  try {
    await Purchases.logIn(userId);
  } catch {
    // 무시 — 구독 식별 실패가 앱 흐름을 막지 않는다.
  }
}

// 로그아웃 시 호출 — 익명 appUserID로 리셋. analytics.resetAnalytics()와 짝.
export async function logOutPurchases(): Promise<void> {
  if (!isReady()) return;
  try {
    await Purchases.logOut();
  } catch {
    // 무시
  }
}

// 프리미엄 여부. 비활성/실패 시 항상 false(무료 취급) — 절대 프리미엄을 오검출하지 않는다.
export async function hasPremium(): Promise<boolean> {
  if (!isReady()) return false;
  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo();
    return typeof info.entitlements.active[PREMIUM_ENTITLEMENT] !== 'undefined';
  } catch {
    return false;
  }
}

// 페이월용 오퍼링 조회(Phase 3에서 사용). 없으면 null.
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!isReady()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

// 연간 패키지의 무료체험 자격 판정 (codex — 비대상자에게 "7일 무료 체험" 표기 방지).
// 판정 불가/실패 시 false(체험 문구 숨김 = 과금 서프라이즈 없음이 안전한 기본값).
export async function hasTrialEligibility(
  pkg: PurchasesPackage,
): Promise<boolean> {
  if (!isReady()) return false;
  try {
    if (Platform.OS === 'android') {
      // Play: RC가 자격에 맞는 오퍼를 defaultOption으로 골라줌 — freePhase 존재 = 체험 대상
      return Boolean(pkg.product.defaultOption?.freePhase);
    }
    const res = await Purchases.checkTrialOrIntroductoryPriceEligibility([
      pkg.product.identifier,
    ]);
    return (
      res[pkg.product.identifier]?.status ===
      INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
    );
  } catch {
    return false;
  }
}

// 특정 패키지 구매 시도 → premium entitlement 활성 여부 반환.
// 유저 취소/실패 전부 false (throw 없음). 페이월 2플랜(월간/연간) 선택 구매용.
export async function purchasePremiumPackage(
  pkg: PurchasesPackage,
): Promise<boolean> {
  if (!isReady()) return false;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return (
      typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !==
      'undefined'
    );
  } catch {
    // 유저 취소 포함 — 조용히 실패
    return false;
  }
}

// 오퍼링의 첫 패키지 구매 시도 → premium entitlement 활성 여부 반환.
// 유저 취소/실패/오퍼링 없음 전부 false (throw 없음). 스토어 상품+오퍼링이
// 구성되는 순간 페이월이 자동으로 실결제 플로우가 된다.
export async function purchasePremium(): Promise<boolean> {
  if (!isReady()) return false;
  try {
    const offering = await getCurrentOffering();
    const pkg = offering?.availablePackages?.[0];
    if (!pkg) return false;
    return purchasePremiumPackage(pkg);
  } catch {
    // 유저 취소 포함 — 조용히 실패
    return false;
  }
}
