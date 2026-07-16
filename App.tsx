import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  TimerScreen,
  HistoryScreen,
  TodoScreen,
  AnalysisScreen,
  SettingsScreen,
  OnboardingScreen,
} from './src/screens';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/lib/auth/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import AnnouncementBell from './src/components/AnnouncementBell';
import { colors } from './src/theme/colors';
import { initAnalytics, track } from './src/lib/analytics';
import { initPurchases } from './src/lib/purchases';
import { getOnboardingSeen } from './src/lib/onboarding';
import { registerForPushNotifications } from './src/lib/notifications';
import { publishWidgetData } from './src/lib/widget';
import { initErrorTracking } from './src/lib/errorTracking';
import * as Sentry from '@sentry/react-native';

const Tab = createBottomTabNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          // 하단 탭바 1.3배 확대 — 아이콘 24→30, 라벨 13, 높이 상향(+안전영역 인셋)
          tabBarIcon: ({ focused, color }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            switch (route.name) {
              case '타이머':
                iconName = focused ? 'timer' : 'timer-outline';
                break;
              case '기록':
                iconName = focused ? 'calendar' : 'calendar-outline';
                break;
              case '할일':
                iconName = focused ? 'checkbox' : 'checkbox-outline';
                break;
              case 'AI분석':
                iconName = focused ? 'sparkles' : 'sparkles-outline';
                break;
              case '설정':
                iconName = focused ? 'settings' : 'settings-outline';
                break;
              default:
                iconName = 'ellipse';
            }

            return <Ionicons name={iconName} size={30} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.inkSub,
          tabBarLabelStyle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
          tabBarIconStyle: { marginTop: 4 },
          tabBarStyle: {
            height: 64 + insets.bottom,
            paddingTop: 8,
            paddingBottom: insets.bottom + 8,
            borderTopWidth: 1,
            borderTopColor: colors.line,
          },
          headerShown: true,
          // 모든 화면 헤더에 브랜드명 "필타임"을 좌측 정렬, 블루/볼드로 표시
          headerTitle: '필타임',
          headerTitleAlign: 'left',
          headerTitleStyle: {
            color: colors.primary,
            fontWeight: '800',
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

  // 로그인 상태가 되면 Expo 푸시 토큰을 백엔드에 등록(주간 리캡 등 원격 발송용)
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
  return <MainTabs />;
}

// 에러 트래킹은 렌더 이전(모듈 스코프)에 초기화해야 앱 시작·첫 렌더 단계의
// 크래시까지 잡힌다. useEffect는 첫 커밋 이후 실행돼 그 구간을 놓침. (DSN 없으면 no-op)
initErrorTracking();

function App() {
  // 애널리틱스는 마운트 시 초기화 + 앱 오픈 이벤트 (키 없으면 no-op)
  // RevenueCat도 함께 초기화 (키 없으면 no-op, 수익화 스위치 OFF 상태)
  useEffect(() => {
    initAnalytics();
    initPurchases();
    track('app_open');
  }, []);

  // SafeAreaProvider: edgeToEdge(안드 시스템바 뒤로 렌더) 하에서 탭바·헤더·모달이
  // 상/하단 시스템바(상태바·내비게이션바)와 겹치지 않도록 인셋 컨텍스트를 공급한다.
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// Sentry.wrap은 초기화 전에도 안전한 passthrough HOC (미초기화 시 no-op)
export default Sentry.wrap(App);
