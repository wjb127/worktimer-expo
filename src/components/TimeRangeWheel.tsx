import { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';

// 시간 롤링(휠) 피커 — 순수 JS(ScrollView 스냅), 네이티브 의존 없음.
// 시작/종료를 세그먼트로 토글하고, 시·분 두 휠을 굴려 선택한다.
// 값은 'HH:MM' 문자열(부모의 editStartTime/editEndTime과 동일 포맷).

const ITEM_H = 40;
const VISIBLE = 5; // 홀수 — 가운데 강조 밴드
const PAD = (VISIBLE - 1) / 2;
const WHEEL_H = ITEM_H * VISIBLE;

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function parse(v: string): { h: number; m: number } {
  const [h, m] = v.split(':').map(Number);
  return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m };
}
const fmt = (h: number, m: number) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

// 단일 휠 — index를 controlled로 받고, 스크롤 종료 시 onIndexChange.
function Wheel({
  items,
  index,
  onIndexChange,
}: {
  items: string[];
  index: number;
  onIndexChange: (i: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const dragging = useRef(false);
  const [active, setActive] = useState(index);

  // 외부에서 index가 바뀌면(세그먼트 토글 등) 스크롤 동기화 — 사용자가 굴리는 중엔 skip
  useEffect(() => {
    setActive(index);
    if (!dragging.current) {
      ref.current?.scrollTo({ y: index * ITEM_H, animated: false });
    }
  }, [index]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    if (clamped !== active) setActive(clamped); // 스크롤 중 가운데 항목 실시간 강조
  };

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragging.current = false;
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    if (clamped !== index) onIndexChange(clamped);
    else ref.current?.scrollTo({ y: clamped * ITEM_H, animated: true });
  };

  return (
    <ScrollView
      ref={ref}
      style={{ height: WHEEL_H }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={onScroll}
      onScrollBeginDrag={() => {
        dragging.current = true;
      }}
      onMomentumScrollEnd={onEnd}
      contentContainerStyle={{ paddingVertical: ITEM_H * PAD }}
    >
      {items.map((it, i) => (
        <View key={it} style={styles.item}>
          <Text
            style={[
              styles.itemText,
              i === active && styles.itemTextActive,
              Math.abs(i - active) === 1 && styles.itemTextNear,
            ]}
          >
            {it}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export default function TimeRangeWheel({
  start,
  end,
  onChangeStart,
  onChangeEnd,
}: {
  start: string;
  end: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
}) {
  const [active, setActive] = useState<'start' | 'end'>('start');
  const cur = active === 'start' ? parse(start) : parse(end);
  const setCur = (h: number, m: number) => {
    const v = fmt(h, m);
    if (active === 'start') onChangeStart(v);
    else onChangeEnd(v);
  };

  return (
    <View style={styles.wrap}>
      {/* 시작 / 종료 세그먼트 (현재 값 표시 + 편집 대상 선택) */}
      <View style={styles.segment}>
        {(['start', 'end'] as const).map((k) => {
          const on = active === k;
          return (
            <TouchableOpacity
              key={k}
              style={[styles.segBtn, on && styles.segBtnOn]}
              onPress={() => setActive(k)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segLabel, on && styles.segLabelOn]}>
                {k === 'start' ? '시작' : '종료'}
              </Text>
              <Text style={[styles.segTime, on && styles.segTimeOn]}>
                {k === 'start' ? start : end}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 휠 (시 : 분) + 가운데 강조 밴드 */}
      <View style={styles.wheels}>
        <View pointerEvents="none" style={styles.centerBand} />
        <Wheel
          items={HOURS}
          index={cur.h}
          onIndexChange={(h) => setCur(h, cur.m)}
        />
        <Text style={styles.colon}>:</Text>
        <Wheel
          items={MINUTES}
          index={cur.m}
          onIndexChange={(m) => setCur(cur.h, m)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', gap: 12 },
  segment: {
    flexDirection: 'row',
    gap: 10,
  },
  segBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segBtnOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  segLabel: { fontSize: 12, fontWeight: '600', color: colors.inkSub },
  segLabelOn: { color: colors.primary },
  segTime: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  segTimeOn: { color: colors.primary },
  wheels: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    height: WHEEL_H,
  },
  centerBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_H * PAD,
    height: ITEM_H,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryFaint,
    borderRadius: 8,
  },
  item: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  itemText: {
    fontSize: 20,
    color: colors.line,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    width: 44,
    textAlign: 'center',
  },
  itemTextNear: { color: colors.inkSub },
  itemTextActive: { color: colors.ink, fontSize: 24, fontWeight: '800' },
  colon: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    marginHorizontal: 2,
  },
});
