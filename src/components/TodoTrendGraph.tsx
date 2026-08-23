import { useMemo, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Todo } from "../lib/api/todos";
import { colors } from "../theme/colors";

// 할일 기록 탭의 '그래프' 세부 보기 — 한 달간 완료 개수의 누적 추이.
//
// 원본 work-timer 의 HistoryGraph 구조를 따랐다:
//  - 월 단위로 보고 좌우로 이동
//  - 미래 날짜는 값이 없으니 선을 끊는다(0으로 그리면 '그날 아무것도 안 함'처럼 보인다)
//  - 그래프 위에 총계·활동일·일평균 요약
// 원본은 '일별 개수'였고 여기서는 요청대로 '누적'으로 그린다 — 누적은 우상향이라
// 한 달 동안 얼마나 쌓았는지가 한눈에 보이고, 정체 구간이 평평한 선으로 드러난다.

const W = 320;
const H = 190;
const PAD_L = 30;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 26;
const innerW = W - PAD_L - PAD_R;
const innerH = H - PAD_T - PAD_B;

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function TodoTrendGraph({ todos }: { todos: Todo[] }) {
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const model = useMemo(() => {
    const today = new Date();
    const year = month.getFullYear();
    const mon = month.getMonth();
    const lastDay = new Date(year, mon + 1, 0).getDate();

    // 날짜별 완료 개수
    const perDay = new Map<string, number>();
    for (const t of todos) {
      if (!t.completedAt) continue;
      const d = new Date(t.completedAt);
      if (d.getFullYear() !== year || d.getMonth() !== mon) continue;
      const k = ymd(d);
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
    }

    // 누적 — 미래 날짜는 null 로 두어 선을 끊는다
    let running = 0;
    const points: { day: number; cumulative: number | null; daily: number }[] =
      [];
    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(year, mon, day);
      const future = d > today && !isSameDay(d, today);
      const daily = perDay.get(ymd(d)) ?? 0;
      if (future) {
        points.push({ day, cumulative: null, daily: 0 });
      } else {
        running += daily;
        points.push({ day, cumulative: running, daily });
      }
    }

    const valid = points.filter((p) => p.cumulative !== null);
    const total = running;
    const activeDays = points.filter((p) => p.daily > 0).length;
    const avg = activeDays > 0 ? (total / activeDays).toFixed(1) : "0";
    const maxY = Math.max(1, total);

    const getX = (i: number) =>
      PAD_L + (points.length > 1 ? (i * innerW) / (points.length - 1) : 0);
    const getY = (v: number) => PAD_T + innerH - (v / maxY) * innerH;

    // 값이 있는 구간만 이어서 path
    let path = "";
    valid.forEach((p, idx) => {
      const i = points.indexOf(p);
      const cmd = idx === 0 ? "M" : "L";
      path += `${cmd}${getX(i).toFixed(1)},${getY(p.cumulative as number).toFixed(1)} `;
    });

    const lastPoint = valid.length
      ? {
          x: getX(points.indexOf(valid[valid.length - 1])),
          y: getY(valid[valid.length - 1].cumulative as number),
        }
      : null;

    return {
      points,
      total,
      activeDays,
      avg,
      maxY,
      path: path.trim(),
      lastPoint,
      lastDay,
      getX,
      getY,
      empty: total === 0,
    };
  }, [todos, month]);

  const shiftMonth = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const now = new Date();
  const isCurrentMonth =
    month.getFullYear() === now.getFullYear() &&
    month.getMonth() === now.getMonth();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => shiftMonth(-1)}
          hitSlop={10}
          accessibilityLabel="이전 달"
        >
          <Ionicons name="chevron-back" size={20} color={colors.inkSub} />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {month.getFullYear()}년 {month.getMonth() + 1}월
        </Text>
        <TouchableOpacity
          onPress={() => shiftMonth(1)}
          hitSlop={10}
          disabled={isCurrentMonth}
          accessibilityLabel="다음 달"
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isCurrentMonth ? colors.line : colors.inkSub}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{model.total}</Text>
          <Text style={styles.statLabel}>완료</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{model.activeDays}일</Text>
          <Text style={styles.statLabel}>완료한 날</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{model.avg}</Text>
          <Text style={styles.statLabel}>하루 평균</Text>
        </View>
      </View>

      {model.empty ? (
        <View style={styles.emptyBox}>
          <Ionicons name="trending-up" size={30} color={colors.line} />
          <Text style={styles.emptyText}>이 달에 완료한 할 일이 없어요.</Text>
        </View>
      ) : (
        <Svg width={W} height={H} style={styles.svg}>
          {/* 가로 기준선 3개 + y축 라벨 */}
          {[0, 0.5, 1].map((r) => {
            const v = Math.round(model.maxY * r);
            const y = model.getY(v);
            return (
              <G key={r}>
                <Line
                  x1={PAD_L}
                  y1={y}
                  x2={W - PAD_R}
                  y2={y}
                  stroke={colors.line}
                  strokeWidth={1}
                />
                <SvgText
                  x={PAD_L - 6}
                  y={y + 4}
                  fontSize={10}
                  fill={colors.inkSub}
                  textAnchor="end"
                >
                  {v}
                </SvgText>
              </G>
            );
          })}

          <Path
            d={model.path}
            stroke={colors.primary}
            strokeWidth={2.5}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* 마지막 값 강조 */}
          {model.lastPoint && (
            <Circle
              cx={model.lastPoint.x}
              cy={model.lastPoint.y}
              r={4}
              fill={colors.primary}
            />
          )}

          {/* x축 — 1일 / 중간 / 말일 */}
          {[
            0,
            Math.floor(model.points.length / 2),
            model.points.length - 1,
          ].map((i) => (
            <SvgText
              key={i}
              x={model.getX(i)}
              y={H - 8}
              fontSize={10}
              fill={colors.inkSub}
              textAnchor="middle"
            >
              {model.points[i]?.day}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 4 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 10,
  },
  monthText: { fontSize: 15, fontWeight: "700", color: colors.ink },
  statRow: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statCell: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.primary },
  statLabel: { fontSize: 11, color: colors.inkSub, marginTop: 2 },
  svg: { alignSelf: "center" },
  emptyBox: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 13, color: colors.inkSub },
});
