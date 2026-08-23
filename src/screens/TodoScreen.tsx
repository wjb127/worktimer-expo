import { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import ReorderableList, {
  ReorderableListReorderEvent,
  reorderItems,
  useReorderableDrag,
} from "react-native-reorderable-list";
import {
  Todo,
  apiListTodos,
  apiCreateTodo,
  apiUpdateTodo,
  apiDeleteTodo,
  apiReorderTodos,
} from "../lib/api/todos";
import { colors } from "../theme/colors";
import TodoTrendGraph from "../components/TodoTrendGraph";

// 할일 탭 — 진행중(삭제 전까지 영구) / 완료(오늘) / 기록(과거 완료 전체) 3분류.
// 우선순위 높음은 상단 고정, 진행중은 길게 눌러 드래그 정렬, 목록 전체 복사 지원.

type Filter = "pending" | "doneToday" | "history";

// 진행중 탭 정렬. manual 만 순서를 서버에 저장한다(나머지는 보기 방식).
type SortMode = "manual" | "recent" | "time";

const SORT_LABEL: Record<SortMode, string> = {
  manual: "내 순서",
  recent: "최근 추가",
  time: "누적 시간",
};

// 기록 탭 세부 보기 — 원본 work-timer 의 calendar|graph 구조를 따른다
type HistoryView = "list" | "graph";

const FILTER_LABEL: Record<Filter, string> = {
  pending: "진행중",
  doneToday: "완료",
  history: "기록",
};

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return "";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0 && mins > 0) return `${hrs}시간 ${mins}분`;
  if (hrs > 0) return `${hrs}시간`;
  return `${mins}분`;
};

const isToday = (iso: string | null): boolean => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

// 높음(0) < 보통(1) — 높음 상단 고정
const priRank = (t: Todo) => (t.priority === "high" ? 0 : 1);

interface RowActions {
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

// 공통 행 본문 — meta는 탭별로 다르게(진행중/완료: 누적시간, 기록: 완료날짜+시간)
function RowBody({
  item,
  meta,
  onToggle,
  onEdit,
  onDelete,
}: { item: Todo; meta: string } & RowActions) {
  const done = item.status === "done";
  return (
    <>
      <TouchableOpacity
        style={styles.checkArea}
        onPress={() => onToggle(item)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={done ? "checkmark-circle" : "ellipse-outline"}
          size={26}
          color={done ? colors.primary : colors.line}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.todoTextCol}
        onPress={() => onEdit(item)}
        activeOpacity={0.7}
      >
        <View style={styles.titleRow}>
          {item.priority === "high" && (
            <Ionicons name="flag" size={14} color={colors.danger} />
          )}
          <Text
            style={[styles.todoTitle, done && styles.todoTitleDone]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
        </View>
        {meta ? <Text style={styles.todoMeta}>{meta}</Text> : null}
      </TouchableOpacity>
      {/* 목록에서 바로 지우면 오조작이 곧 삭제가 된다. 여기는 수정으로 열고,
          삭제는 수정 모달 안에 둔다(원본 work-timer 구조와 동일). */}
      <TouchableOpacity
        onPress={() => onEdit(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={`${item.title} 수정`}
        style={styles.deleteBtn}
      >
        <Ionicons name="create-outline" size={18} color={colors.inkSub} />
      </TouchableOpacity>
    </>
  );
}

// 진행중 행 — 길게 누르면 드래그 정렬 (행 전체 + 핸들 아이콘 둘 다)
//
// ★ 웹에서는 이 방식이 성립하지 않는다.
// react-native-reorderable-list 는 RNGH 의 Pan 제스처로 끌기를 구현하는데,
// 마우스로는 롱프레스가 드래그로 승격되지 않고 그대로 클릭으로 처리돼
// (실측) 정렬 대신 '할 일 수정' 모달이 열려버렸다.
// 그래서 웹에서는 드래그 핸들 자리에 위/아래 이동 버튼을 놓는다.
function PendingRow({
  item,
  index,
  count,
  onMove,
  reorderEnabled,
  ...actions
}: {
  item: Todo;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  reorderEnabled: boolean;
} & RowActions) {
  const drag = useReorderableDrag();

  if (Platform.OS === "web") {
    const canUp = reorderEnabled && index > 0;
    const canDown = reorderEnabled && index < count - 1;
    return (
      <View style={styles.todoRow}>
        <RowBody
          item={item}
          meta={formatDuration(item.totalDuration ?? 0)}
          {...actions}
        />
        <View style={styles.moveGroup}>
          <TouchableOpacity
            onPress={() => onMove(index, index - 1)}
            disabled={!canUp}
            hitSlop={6}
            accessibilityLabel={`${item.title} 위로 이동`}
            style={styles.moveBtn}
          >
            <Ionicons
              name="chevron-up"
              size={18}
              color={canUp ? colors.inkSub : colors.line}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onMove(index, index + 1)}
            disabled={!canDown}
            hitSlop={6}
            accessibilityLabel={`${item.title} 아래로 이동`}
            style={styles.moveBtn}
          >
            <Ionicons
              name="chevron-down"
              size={18}
              color={canDown ? colors.inkSub : colors.line}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.todoRow}
      onLongPress={reorderEnabled ? drag : undefined}
      activeOpacity={0.9}
    >
      <RowBody
        item={item}
        meta={formatDuration(item.totalDuration ?? 0)}
        {...actions}
      />
      {reorderEnabled && (
        <TouchableOpacity
          onLongPress={drag}
          hitSlop={8}
          style={styles.dragHandle}
        >
          <Ionicons name="reorder-two-outline" size={20} color={colors.line} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// 완료/기록 행 — 드래그 없음
function DoneRow({
  item,
  showDate,
  ...actions
}: { item: Todo; showDate: boolean } & RowActions) {
  const dur = formatDuration(item.totalDuration ?? 0);
  const date = showDate && item.completedAt ? formatDate(item.completedAt) : "";
  const meta = [date, dur].filter(Boolean).join(" · ");
  return (
    <View style={styles.todoRow}>
      <RowBody item={item} meta={meta} {...actions} />
    </View>
  );
}

export default function TodoScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [historyView, setHistoryView] = useState<HistoryView>("list");
  // 수정 시트 상태
  const [editing, setEditing] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState<"high" | "normal">("normal");

  const load = useCallback(async () => {
    try {
      const list = await apiListTodos({ includeTime: true });
      setTodos(list);
    } catch (e) {
      console.error("load todos error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // 진행중 정렬. manual 이 기본이자 유일하게 순서를 '저장'하는 모드다 —
  // 다른 모드는 보기 방식일 뿐이라, 그 상태에서 순서를 옮기면 저장된 순서와
  // 화면이 어긋난다. 그래서 manual 이 아닐 땐 이동 컨트롤을 잠근다.
  const pending = useMemo(() => {
    const base = todos.filter((t) => t.status === "pending");
    if (sortMode === "recent") {
      return base.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    if (sortMode === "time") {
      return base.sort(
        (a, b) =>
          (b.totalDuration ?? 0) - (a.totalDuration ?? 0) ||
          a.createdAt.localeCompare(b.createdAt),
      );
    }
    // manual — 높음 우선 → 수동 정렬 순 (삭제 전까지 영구 유지)
    return base.sort(
      (a, b) =>
        priRank(a) - priRank(b) ||
        a.sortOrder - b.sortOrder ||
        a.createdAt.localeCompare(b.createdAt),
    );
  }, [todos, sortMode]);
  // 기록: 과거 완료 전체 (최근 완료 순)
  const history = useMemo(
    () =>
      todos
        .filter((t) => t.status === "done")
        .sort((a, b) =>
          (b.completedAt ?? "").localeCompare(a.completedAt ?? ""),
        ),
    [todos],
  );
  // 완료: 오늘 완료한 것만
  const doneToday = useMemo(
    () => history.filter((t) => isToday(t.completedAt)),
    [history],
  );

  const listByFilter: Record<Filter, Todo[]> = {
    pending,
    doneToday,
    history,
  };
  const current = listByFilter[filter];

  const handleAdd = async () => {
    const title = input.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const created = await apiCreateTodo(title);
      setTodos((prev) => [...prev, created]);
      setInput("");
      Keyboard.dismiss();
    } catch (e) {
      console.error("create todo error:", e);
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (todo: Todo) => {
    const next = todo.status === "done" ? "pending" : "done";
    // 낙관적 업데이트
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id
          ? {
              ...t,
              status: next,
              completedAt: next === "done" ? new Date().toISOString() : null,
            }
          : t,
      ),
    );
    try {
      await apiUpdateTodo(todo.id, { status: next });
    } catch (e) {
      console.error("toggle todo error:", e);
      load(); // 실패 시 서버 상태로 복구
    }
  };

  const handleDelete = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await apiDeleteTodo(id);
    } catch (e) {
      console.error("delete todo error:", e);
      load();
    }
  };

  // 수정 모달에서의 삭제 — 되돌릴 수 없으니 한 번 묻는다.
  const handleDeleteFromEdit = () => {
    const target = editing;
    if (!target) return;
    Alert.alert("할 일 삭제", `"${target.title}"을(를) 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          setEditing(null);
          handleDelete(target.id);
        },
      },
    ]);
  };

  // 드래그 정렬 (진행중 탭) — 높음 상단 고정 불변식: 그룹 경계를 넘긴 드롭은 경계로 스냅
  const handleReorder = ({ from, to }: ReorderableListReorderEvent) => {
    const moved = reorderItems(pending, from, to);
    const snapped = [
      ...moved.filter((t) => t.priority === "high"),
      ...moved.filter((t) => t.priority !== "high"),
    ];
    // 낙관적 반영: 화면 순서를 sortOrder로 박제
    const orderMap = new Map(snapped.map((t, i) => [t.id, i]));
    setTodos((prev) =>
      prev.map((t) =>
        orderMap.has(t.id) ? { ...t, sortOrder: orderMap.get(t.id)! } : t,
      ),
    );
    apiReorderTodos(snapped.map((t) => t.id)).catch(() => load());
  };

  // 수정 시트 열기/저장
  const openEdit = (todo: Todo) => {
    setEditing(todo);
    setEditTitle(todo.title);
    setEditPriority(todo.priority === "high" ? "high" : "normal");
  };

  const handleSaveEdit = async () => {
    const title = editTitle.trim();
    if (!editing || !title) return;
    const id = editing.id;
    const priority = editPriority;
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title, priority } : t)),
    );
    setEditing(null);
    try {
      await apiUpdateTodo(id, { title, priority });
    } catch (e) {
      console.error("edit todo error:", e);
      load();
    }
  };

  // 현재 탭 목록 전체 복사 (텍스트)
  const handleCopy = async () => {
    if (current.length === 0) return;
    const lines = current.map(
      (t) => `- ${t.priority === "high" ? "[높음] " : ""}${t.title}`,
    );
    await Clipboard.setStringAsync(
      `필타임 할일 — ${FILTER_LABEL[filter]} (${current.length})\n${lines.join("\n")}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const rowActions: RowActions = {
    onToggle: handleToggle,
    onEdit: openEdit,
    onDelete: handleDelete,
  };

  const renderEmpty = () => (
    <View style={styles.center}>
      <Ionicons
        name={
          filter === "pending"
            ? "checkbox-outline"
            : filter === "doneToday"
              ? "checkmark-done-outline"
              : "archive-outline"
        }
        size={48}
        color={colors.line}
      />
      <Text style={styles.emptyText}>
        {filter === "pending"
          ? "할 일이 없어요. 위에서 추가해보세요."
          : filter === "doneToday"
            ? "오늘 완료한 할 일이 여기 쌓여요."
            : "완료한 할 일의 전체 기록이 여기 남아요."}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 빠른 추가 */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="할 일을 입력하세요"
          placeholderTextColor={colors.inkSub}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addBtn, !input.trim() && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!input.trim() || adding}
        >
          <Ionicons name="add" size={26} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* 진행중 / 완료(오늘) / 기록 탭 + 전체 복사 */}
      <View style={styles.filterRow}>
        {(["pending", "doneToday", "history"] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {FILTER_LABEL[f]}
              <Text
                style={[
                  styles.filterCount,
                  filter === f && styles.filterCountActive,
                ]}
              >
                {" "}
                {listByFilter[f].length}
              </Text>
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.filterSpacer} />
        <TouchableOpacity
          style={styles.copyBtn}
          onPress={handleCopy}
          disabled={current.length === 0}
          hitSlop={8}
          accessibilityLabel="목록 전체 복사"
        >
          <Ionicons
            name={copied ? "checkmark" : "copy-outline"}
            size={20}
            color={
              copied
                ? colors.primary
                : current.length === 0
                  ? colors.line
                  : colors.inkSub
            }
          />
        </TouchableOpacity>
      </View>

      {/* 진행중: 정렬 선택. '내 순서'일 때만 직접 옮길 수 있다 */}
      {filter === "pending" && (
        <View style={styles.subRow}>
          {(["manual", "recent", "time"] as SortMode[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.subChip, sortMode === s && styles.subChipActive]}
              onPress={() => setSortMode(s)}
            >
              <Text
                style={[
                  styles.subChipText,
                  sortMode === s && styles.subChipTextActive,
                ]}
              >
                {SORT_LABEL[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 기록: 목록 / 그래프 세부 탭 (원본 work-timer 의 calendar|graph 구조) */}
      {filter === "history" && (
        <View style={styles.subRow}>
          {(
            [
              { v: "list", label: "목록" },
              { v: "graph", label: "그래프" },
            ] as const
          ).map((v) => (
            <TouchableOpacity
              key={v.v}
              style={[
                styles.subChip,
                historyView === v.v && styles.subChipActive,
              ]}
              onPress={() => setHistoryView(v.v)}
            >
              <Text
                style={[
                  styles.subChipText,
                  historyView === v.v && styles.subChipTextActive,
                ]}
              >
                {v.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filter === "history" && historyView === "graph" ? (
        <TodoTrendGraph todos={history} />
      ) : current.length === 0 ? (
        renderEmpty()
      ) : filter === "pending" ? (
        <ReorderableList
          data={pending}
          keyExtractor={(t) => t.id}
          onReorder={handleReorder}
          renderItem={({ item, index }) => (
            <PendingRow
              item={item}
              index={index}
              count={pending.length}
              onMove={(from, to) => handleReorder({ from, to })}
              reorderEnabled={sortMode === "manual"}
              {...rowActions}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={current}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <DoneRow
              item={item}
              showDate={filter === "history"}
              {...rowActions}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* 수정 시트 — 제목 + 우선순위(높음/보통) */}
      <Modal
        visible={editing !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <TouchableOpacity
          style={styles.editOverlay}
          activeOpacity={1}
          onPress={() => setEditing(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.editSheet}>
            <Text style={styles.editHeading}>할 일 수정</Text>
            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="할 일 제목"
              placeholderTextColor={colors.inkSub}
              autoFocus
            />
            <Text style={styles.editLabel}>우선순위</Text>
            <View style={styles.prioRow}>
              {(
                [
                  { v: "high", label: "높음", icon: "flag" },
                  { v: "normal", label: "보통", icon: "remove-outline" },
                ] as const
              ).map((p) => (
                <TouchableOpacity
                  key={p.v}
                  style={[
                    styles.prioBtn,
                    editPriority === p.v && styles.prioBtnActive,
                  ]}
                  onPress={() => setEditPriority(p.v)}
                >
                  <Ionicons
                    name={p.icon}
                    size={15}
                    color={
                      p.v === "high"
                        ? colors.danger
                        : editPriority === p.v
                          ? colors.primary
                          : colors.inkSub
                    }
                  />
                  <Text
                    style={[
                      styles.prioText,
                      editPriority === p.v && styles.prioTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                !editTitle.trim() && styles.addBtnDisabled,
              ]}
              onPress={handleSaveEdit}
              disabled={!editTitle.trim()}
            >
              <Text style={styles.saveBtnText}>저장</Text>
            </TouchableOpacity>
            <View style={styles.editFooter}>
              {/* 삭제는 목록이 아니라 여기 — 오조작이 곧 삭제가 되지 않게 한 단계 둔다 */}
              <TouchableOpacity
                style={styles.deleteTextBtn}
                onPress={handleDeleteFromEdit}
                accessibilityLabel="이 할 일 삭제"
              >
                <Ionicons
                  name="trash-outline"
                  size={15}
                  color={colors.danger}
                />
                <Text style={styles.deleteTextBtnText}>삭제</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditing(null)}
              >
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inputRow: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: { backgroundColor: colors.primaryLight },
  // 정렬 칩 / 기록 세부 탭 공용
  subRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  subChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  subChipActive: { borderColor: colors.primary, backgroundColor: colors.white },
  subChipText: { fontSize: 12, color: colors.inkSub },
  subChipTextActive: { color: colors.primary, fontWeight: "700" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.primaryFaint,
  },
  filterBtnActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 14, fontWeight: "600", color: colors.inkSub },
  filterTextActive: { color: colors.white },
  filterCount: { fontSize: 12, fontWeight: "500", color: colors.inkSub },
  filterCountActive: { color: colors.primaryFaint },
  filterSpacer: { flex: 1 },
  copyBtn: { padding: 6 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: colors.inkSub, textAlign: "center" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  todoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  checkArea: { marginRight: 12 },
  todoTextCol: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  todoTitle: {
    fontSize: 15,
    color: colors.ink,
    fontWeight: "500",
    flexShrink: 1,
  },
  todoTitleDone: {
    textDecorationLine: "line-through",
    color: colors.inkSub,
  },
  todoMeta: { fontSize: 12, color: colors.inkSub, marginTop: 4 },
  deleteBtn: { marginLeft: 8, padding: 4 },
  dragHandle: { marginLeft: 6, padding: 2 },
  // 웹 전용 순서 이동 버튼 (드래그 핸들 대체)
  moveGroup: { marginLeft: 6, justifyContent: "center" },
  moveBtn: { paddingHorizontal: 2, paddingVertical: 1 },
  // 수정 시트
  editOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    padding: 28,
  },
  editSheet: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 22,
  },
  editHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 14,
  },
  editInput: {
    height: 48,
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkSub,
    marginBottom: 8,
  },
  prioRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  prioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  prioBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  prioText: { fontSize: 14, fontWeight: "600", color: colors.inkSub },
  prioTextActive: { color: colors.primary },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  cancelBtn: { paddingVertical: 12, alignItems: "center", marginTop: 2 },
  cancelBtnText: { fontSize: 14, color: colors.inkSub },
  // 수정 모달 하단 — 삭제(좌) / 취소(우)
  editFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  deleteTextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    paddingRight: 12,
  },
  deleteTextBtnText: { fontSize: 14, color: colors.danger, fontWeight: "600" },
});
