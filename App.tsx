import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  TimerScreen,
  HistoryScreen,
  StatsScreen,
  SettingsScreen,
} from './src/screens';

const Tab = createBottomTabNavigator();

export default function App() {
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
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          headerShown: true,
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
