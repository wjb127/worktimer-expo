import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Android 홈화면 위젯 UI — 다크 캔버스(#000214) + 브랜드 블루.
// react-native-android-widget이 이 JSX를 RemoteViews로 변환한다 (RN 컴포넌트 사용 금지).

export interface FilltimeWidgetProps {
  todayText: string; // 예: "2시간 41분"
  weekText: string; // 예: "이번 주 12시간 3분"
  streakText: string; // 예: "🔥 191일 연속" (없으면 '')
}

export function FilltimeWidget({ todayText, weekText, streakText }: FilltimeWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#000214',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}
      >
        <TextWidget
          text="필타임"
          style={{ fontSize: 13, color: '#007AFF', fontWeight: 'bold' }}
        />
        <TextWidget text={streakText} style={{ fontSize: 11, color: '#8E9BB5' }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
        <TextWidget
          text={todayText}
          style={{ fontSize: 28, color: '#FFFFFF', fontWeight: 'bold' }}
        />
        <TextWidget
          text={weekText}
          style={{ fontSize: 12, color: '#8E9BB5', marginTop: 4 }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
