import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  TimerScreen,
  HistoryScreen,
  StatsScreen,
  SettingsScreen,
} from './src/screens';
import { AuthProvider, useAuth } from './src/lib/auth/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import { colors } from './src/theme/colors';

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
              case '통계':
                iconName = focused ? 'stats-chart' : 'stats-chart-outline';
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
        <Tab.Screen name="통계" component={StatsScreen} />
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

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
