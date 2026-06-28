import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Todo,
  apiListTodos,
  apiUpdateTodo,
  apiSetSessionTodos,
  apiUpdateSessionMeta,
} from '../lib/api/todos';
import { colors } from '../theme/colors';

// 타이머 종료 직후 "무슨 업무를 했는지" 기록 + 할일 연결 모달.
// sessionId 가 null 이면 닫힌 상태.
export default function SessionEndModal({
  sessionId,
  elapsedLabel,
  onClose,
}: {
  sessionId: string | null;
  elapsedLabel?: string;
  onClose: () => void;
}) {
  const [description, setDescription] = useState('');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [markDone, setMarkDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 모달이 열릴 때마다 초기화 + 진행중 할일 로드
  useEffect(() => {
    if (!sessionId) return;
    setDescription('');
    setSelected(new Set());
    setMarkDone(false);
    setLoading(true);
    apiListTodos({ status: 'pending' })
      .then((list) => setTodos(list))
      .catch(() => setTodos([]))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const toggleTodo = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!sessionId || saving) return;
    setSaving(true);
    try {
      const desc = description.trim();
      if (desc) {
        await apiUpdateSessionMeta(sessionId, { description: desc });
      }
      const ids = [...selected];
      if (ids.length > 0) {
        await apiSetSessionTodos(sessionId, ids);
        if (markDone) {
          await Promise.all(
            ids.map((id) => apiUpdateTodo(id, { status: 'done' }))
          );
        }
      }
    } catch (e) {
      console.error('save session meta error:', e);
    } finally {
      setSaving(false);
      onClose();
    }
  };

  const visible = !!sessionId;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* 핸들 + 헤더 */}
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>업무 기록</Text>
              {elapsedLabel ? (
                <Text style={styles.subtitle}>이번 세션 {elapsedLabel}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color={colors.inkSub} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 업무 내용 */}
            <Text style={styles.label}>무슨 업무를 했나요?</Text>
            <TextInput
              style={styles.textArea}
              placeholder="예: 백엔드 API 설계, 디자인 리뷰..."
              placeholderTextColor={colors.inkSub}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />

            {/* 할일 연결 */}
            <Text style={[styles.label, { marginTop: 18 }]}>할 일 연결 (선택)</Text>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : todos.length === 0 ? (
              <Text style={styles.emptyTodo}>진행 중인 할 일이 없어요.</Text>
            ) : (
              <View style={styles.todoList}>
                {todos.map((t) => {
                  const on = selected.has(t.id);
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.todoItem, on && styles.todoItemOn]}
                      onPress={() => toggleTodo(t.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={on ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={on ? colors.primary : colors.line}
                      />
                      <Text style={styles.todoItemText} numberOfLines={1}>
                        {t.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* 완료 처리 토글 (할일 선택 시에만) */}
            {selected.size > 0 && (
              <TouchableOpacity
                style={styles.markDoneRow}
                onPress={() => setMarkDone((v) => !v)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={markDone ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={markDone ? colors.primary : colors.line}
                />
                <Text style={styles.markDoneText}>
                  연결한 할 일을 완료로 처리
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* 버튼 */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.skipBtn} onPress={onClose}>
              <Text style={styles.skipText}>건너뛰기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveText}>저장</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 19, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 13, color: colors.inkSub, marginTop: 2 },
  body: { flexGrow: 0 },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 8 },
  textArea: {
    minHeight: 80,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyTodo: {
    fontSize: 14,
    color: colors.inkSub,
    paddingVertical: 12,
  },
  todoList: { gap: 8 },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  todoItemOn: {
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primary,
  },
  todoItemText: { flex: 1, fontSize: 15, color: colors.ink },
  markDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingVertical: 4,
  },
  markDoneText: { fontSize: 14, color: colors.ink },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  skipBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  skipText: { fontSize: 15, fontWeight: '600', color: colors.inkSub },
  saveBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
