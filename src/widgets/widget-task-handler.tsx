import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { FilltimeWidget } from './FilltimeWidget';
import { fetchWidgetData } from '../lib/widget';

// Android 위젯 태스크 핸들러 — OS가 위젯 추가/주기갱신(30분)/리사이즈 때 headless JS로 호출.
// 어떤 액션이든 최신 데이터로 렌더 (실패해도 fetchWidgetData가 안전값 반환).
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK': {
      const data = await fetchWidgetData();
      props.renderWidget(<FilltimeWidget {...data} />);
      break;
    }
    default:
      break;
  }
}
