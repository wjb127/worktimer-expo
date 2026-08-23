import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, AppState, Platform, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  TimerScreen,
  HistoryScreen,
  TodoScreen,
  AnalysisScreen,
  SettingsScreen,
  OnboardingScreen,
  NotificationsScreen,
  DashboardScreen,
} from "./src/screens";
import type { RootStackParamList } from "./src/navigation/types";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/lib/auth/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import AnnouncementBell from "./src/components/AnnouncementBell";
import WebShell from "./src/components/WebShell";
import { colors } from "./src/theme/colors";
import { initAnalytics, track } from "./src/lib/analytics";
import { initPurchases } from "./src/lib/purchases";
import { installWebAlert } from "./src/lib/webAlert";
import { installWebModalClamp } from "./src/lib/webModalClamp";
import { setupPwa } from "./src/lib/pwa";
import { getOnboardingSeen } from "./src/lib/onboarding";
import {
  registerForPushNotifications,
  setupNotificationInbox,
  syncPresentedToInbox,
} from "./src/lib/notifications";
import { checkAndApplyUpdate } from "./src/lib/otaUpdates";
import { publishWidgetData } from "./src/lib/widget";
import { initErrorTracking } from "./src/lib/errorTracking";
import * as Sentry from "@sentry/react-native";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // 하단 탭바 1.3배 확대 — 아이콘 24→30, 라벨 13, 높이 상향(+안전영역 인셋)
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case "타이머":
              iconName = focused ? "timer" : "timer-outline";
              break;
            case "기록":
              iconName = focused ? "calendar" : "calendar-outline";
              break;
            case "할일":
              iconName = focused ? "checkbox" : "checkbox-outline";
              break;
            case "AI분석":
              iconName = focused ? "sparkles" : "sparkles-outline";
              break;
            case "설정":
              iconName = focused ? "settings" : "settings-outline";
              break;
            default:
              iconName = "ellipse";
          }

          return <Ionicons name={iconName} size={30} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkSub,
        tabBarLabelStyle: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
        tabBarIconStyle: { marginTop: 4 },
        tabBarStyle: {
          // 웹에서는 64px 안에 아이콘(30+marginTop 4)과 라벨(13pt)이 다 들어가지 못해
          // 라벨이 높이 1px로 눌려 글자가 통째로 사라졌다. 웹만 높이를 키운다
          // (네이티브는 안전영역 인셋 덕에 여유가 있어 픽셀 그대로 둔다).
          height: (Platform.OS === "web" ? 80 : 64) + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          borderTopWidth: 1,
          borderTopColor: colors.line,
        },
        headerShown: true,
        // 모든 화면 헤더에 브랜드명 "필타임"을 좌측 정렬, 블루/볼드로 표시
        headerTitle: "필타임",
        headerTitleAlign: "left",
        headerTitleStyle: {
          color: colors.primary,
          fontWeight: "800",
          fontSize: 22,
        },
        // 헤더 우측 공지 종 아이콘
        headerRight: () => <AnnouncementBell />,
        headerStyle: {
          backgroundColor: colors.white,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        },
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen name="타이머" component={TimerScreen} />
      <Tab.Screen name="기록" component={HistoryScreen} />
      <Tab.Screen name="할일" component={TodoScreen} />
      <Tab.Screen name="AI분석" component={AnalysisScreen} />
      <Tab.Screen name="설정" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// 루트 스택: 탭(Main) 위에 알림 모음 페이지를 얹는다 (헤더 종 아이콘 → push 이동)
function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="알림"
          component={NotificationsScreen}
          options={{
            title: "알림",
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.ink, fontWeight: "700" },
            headerStyle: { backgroundColor: colors.white },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: "minimal",
          }}
        />
        <Stack.Screen
          name="대시보드"
          component={DashboardScreen}
          options={{
            title: "상세 분석",
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.ink, fontWeight: "700" },
            headerStyle: { backgroundColor: colors.white },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: "minimal",
          }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

function Root() {
  const { loading, signedIn } = useAuth();
  // 온보딩 노출 여부 (null = 저장값 로딩 중)
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    getOnboardingSeen().then(setOnboardingSeen);
  }, []);

  // 로그인 상태가 되면 이미 허용된 Expo 푸시 토큰만 백엔드에 등록한다.
  // 권한 팝업은 첫 타이머 시작 시점에만 요청한다.
  // + 홈화면 위젯 데이터 최신화. 둘 다 fire-and-forget 안전(실패 시 조용히 no-op).
  useEffect(() => {
    if (signedIn) {
      registerForPushNotifications();
      publishWidgetData();
    }
  }, [signedIn]);

  // 인증 로딩 또는 온보딩 플래그 로딩 중이면 스피너
  if (loading || onboardingSeen === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  // 미로그인: 온보딩을 아직 안 봤으면 온보딩 → 그 외엔 로그인
  if (!signedIn) {
    if (!onboardingSeen) {
      return <OnboardingScreen onDone={() => setOnboardingSeen(true)} />;
    }
    return <LoginScreen />;
  }
  return <AppNavigator />;
}

// 에러 트래킹은 렌더 이전(모듈 스코프)에 초기화해야 앱 시작·첫 렌더 단계의
// 크래시까지 잡힌다. useEffect는 첫 커밋 이후 실행돼 그 구간을 놓침. (DSN 없으면 no-op)
initErrorTracking();

function App() {
  // 애널리틱스는 마운트 시 초기화 + 앱 오픈 이벤트 (키 없으면 no-op)
  // RevenueCat도 함께 초기화 (키 없으면 no-op, 수익화 스위치 OFF 상태)
  useEffect(() => {
    // 웹(PWA)에서 Alert가 통째로 무반응인 걸 먼저 고쳐둔다 —
    // 아래 초기화들이 실패했을 때 그 알림조차 안 보이면 원인을 못 찾는다.
    installWebAlert();
    // Modal은 WebShell 트리 밖 포털로 렌더돼 480px 클램프가 안 걸린다 — 여기서 CSS로 잡는다
    installWebModalClamp();
    setupPwa();
    initAnalytics();
    initPurchases();
    track("app_open");
  }, []);

  // OTA 자동 적용 + 수신 알림 인박스 누적
  useEffect(() => {
    // 콜드런치: 최신 OTA 확인·적용 + 트레이 알림 인박스 반영
    checkAndApplyUpdate();
    syncPresentedToInbox();
    // 포그라운드 수신·탭 알림을 인박스에 누적
    const cleanupInbox = setupNotificationInbox();
    // 포그라운드 복귀마다 OTA 재확인 + 트레이 동기화
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkAndApplyUpdate();
        syncPresentedToInbox();
      }
    });
    return () => {
      cleanupInbox();
      sub.remove();
    };
  }, []);

  // SafeAreaProvider: edgeToEdge(안드 시스템바 뒤로 렌더) 하에서 탭바·헤더·모달이
  // 상/하단 시스템바(상태바·내비게이션바)와 겹치지 않도록 인셋 컨텍스트를 공급한다.
  // GestureHandlerRootView: 할일 드래그 정렬(reorderable-list) 제스처 루트.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* 웹에서만 폰 폭으로 가운데 고정 — 네이티브는 그대로 통과 */}
        <WebShell>
          <AuthProvider>
            <Root />
          </AuthProvider>
        </WebShell>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Sentry.wrap은 초기화 전에도 안전한 passthrough HOC (미초기화 시 no-op)
export default Sentry.wrap(App);
