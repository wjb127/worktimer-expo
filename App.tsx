import { useEffect } from 'react';
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
} from './src/screens';
import { AuthProvider, useAuth } from './src/lib/auth/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import { colors } from './src/theme/colors';
import { initAnalytics, track } from './src/lib/analytics';
import { initErrorTracking } from './src/lib/errorTracking';
import * as Sentry from '@sentry/react-native';

const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
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

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.inkSub,
          headerShown: true,
          // 모든 화면 헤더에 브랜드명 "필타임"을 좌측 정렬, 블루/볼드로 표시
          headerTitle: '필타임',
          headerTitleAlign: 'left',
          headerTitleStyle: {
            color: colors.primary,
            fontWeight: '800',
            fontSize: 22,
          },
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
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!signedIn) return <LoginScreen />;
  return <MainTabs />;
}

// 에러 트래킹은 렌더 이전(모듈 스코프)에 초기화해야 앱 시작·첫 렌더 단계의
// 크래시까지 잡힌다. useEffect는 첫 커밋 이후 실행돼 그 구간을 놓침. (DSN 없으면 no-op)
initErrorTracking();

function App() {
  // 애널리틱스는 마운트 시 초기화 + 앱 오픈 이벤트 (키 없으면 no-op)
  useEffect(() => {
    initAnalytics();
    track('app_open');
  }, []);

  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

// Sentry.wrap은 초기화 전에도 안전한 passthrough HOC (미초기화 시 no-op)
export default Sentry.wrap(App);
