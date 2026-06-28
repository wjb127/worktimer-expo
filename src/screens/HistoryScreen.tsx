import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import CalendarView from './history/CalendarView';
import HeatmapView from './history/HeatmapView';
import { colors } from '../theme/colors';

const TopTab = createMaterialTopTabNavigator();

export default function HistoryScreen() {
  return (
    <TopTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkSub,
        tabBarIndicatorStyle: {
          backgroundColor: colors.primary,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: colors.white,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        },
      }}
    >
      <TopTab.Screen name="달력" component={CalendarView} />
      <TopTab.Screen name="히트맵" component={HeatmapView} />
    </TopTab.Navigator>
  );
}
