import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import CalendarView from './history/CalendarView';
import HeatmapView from './history/HeatmapView';

const TopTab = createMaterialTopTabNavigator();

export default function HistoryScreen() {
  return (
    <TopTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarIndicatorStyle: {
          backgroundColor: '#007AFF',
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5E5',
        },
      }}
    >
      <TopTab.Screen name="달력" component={CalendarView} />
      <TopTab.Screen name="히트맵" component={HeatmapView} />
    </TopTab.Navigator>
  );
}
