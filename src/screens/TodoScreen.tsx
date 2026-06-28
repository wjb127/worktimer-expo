import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  Todo,
  apiListTodos,
  apiCreateTodo,
  apiUpdateTodo,
  apiDeleteTodo,
} from '../lib/api/todos';
import { colors } from '../theme/colors';

type Filter = 'pending' | 'done';

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0 && mins > 0) return `${hrs}시간 ${mins}분`;
  if (hrs > 0) return `${hrs}시간`;
  return `${mins}분`;
};

export default function TodoScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await apiListTodos({ includeTime: true });
      setTodos(list);
    } catch (e) {
      console.error('load todos error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAdd = async () => {
    const title = input.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const created = await apiCreateTodo(title);
      setTodos((prev) => [...prev, created]);
      setInput('');
      Keyboard.dismiss();
    } catch (e) {
      console.error('create todo error:', e);
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (todo: Todo) => {
    const next = todo.status === 'done' ? 'pending' : 'done';
    // 낙관적 업데이트
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todo.id
          ? { ...t, status: next, completedAt: next === 'done' ? new Date().toISOString() : null }
          : t
      )
    );
    try {
      await apiUpdateTodo(todo.id, { status: next });
    } catch (e) {
      console.error('toggle todo error:', e);
      load(); // 실패 시 서버 상태로 복구
    }
  };

  const handleDelete = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await apiDeleteTodo(id);
    } catch (e) {
      console.error('delete todo error:', e);
      load();
    }
  };

  const filtered = todos.filter((t) => t.status === filter);
  const pendingCount = todos.filter((t) => t.status === 'pending').length;
  const doneCount = todos.filter((t) => t.status === 'done').length;

  const renderItem = ({ item }: { item: Todo }) => {
    const done = item.status === 'done';
    const dur = formatDuration(item.totalDuration ?? 0);
    return (
      <View style={styles.todoRow}>
        <TouchableOpacity
          style={styles.checkArea}
          onPress={() => handleToggle(item)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={done ? 'checkmark-circle' : 'ellipse-outline'}
            size={26}
            color={done ? colors.primary : colors.line}
          />
        </TouchableOpacity>
        <View style={styles.todoTextCol}>
          <Text
            style={[styles.todoTitle, done && styles.todoTitleDone]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {dur ? (
            <Text style={styles.todoMeta}>
              <Ionicons name="time-outline" size={12} color={colors.inkSub} /> {dur}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color={colors.inkSub} />
        </TouchableOpacity>
      </View>
    );
  };

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

      {/* 진행중 / 완료 탭 */}
      <View style={styles.filterRow}>
        {(['pending', 'done'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'pending' ? `진행 중 ${pendingCount}` : `완료 ${doneCount}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name={filter === 'pending' ? 'checkbox-outline' : 'checkmark-done-outline'}
            size={48}
            color={colors.line}
          />
          <Text style={styles.emptyText}>
            {filter === 'pending'
              ? '할 일이 없어요. 위에서 추가해보세요.'
              : '완료한 할 일이 여기 쌓여요.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inputRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: colors.primaryLight },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.primaryFaint,
  },
  filterBtnActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 14, fontWeight: '600', color: colors.inkSub },
  filterTextActive: { color: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyText: { fontSize: 14, color: colors.inkSub, textAlign: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  checkArea: { marginRight: 12 },
  todoTextCol: { flex: 1 },
  todoTitle: { fontSize: 15, color: colors.ink, fontWeight: '500' },
  todoTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.inkSub,
  },
  todoMeta: { fontSize: 12, color: colors.inkSub, marginTop: 4 },
  deleteBtn: { marginLeft: 8, padding: 4 },
});
