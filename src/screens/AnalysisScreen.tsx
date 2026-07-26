import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { track } from '../lib/analytics';
import { usePremium } from '../lib/premium';
import { stripMarkdown } from '../lib/markdown';
import PaywallModal from '../components/PaywallModal';
import AiConsentModal from '../components/AiConsentModal';
import { apiGetMe } from '../lib/api/profile';
import {
  AnalyzeRange,
  ChatMessage,
  ChatMessageBody,
  ChatSessionSummary,
  apiCreateChatSession,
  apiDeleteChatSession,
  apiGetChatMessages,
  apiListChatSessions,
  apiPostChatMessage,
  streamChatMessage,
} from '../lib/api/ai';

// AI 업무 분석 — GPT식 채팅 (프리미엄).
// 분석 칩(오늘/이번 주/이번 달) 선택 → 분석이 채팅으로 도착 → 이어서 자유 대화.
// 세션은 서버 저장 (목록 ↔ 채팅 전환).

const RANGES: { key: AnalyzeRange; label: string }[] = [
  { key: 'day', label: '오늘 분석' },
  { key: 'week', label: '이번 주 분석' },
  { key: 'month', label: '이번 달 분석' },
];

const RANGE_USER_TEXT: Record<AnalyzeRange, string> = {
  day: '오늘 업무 분석해줘',
  week: '이번 주 업무 분석해줘',
  month: '이번 달 업무 분석해줘',
};

const makeClientMessageId = () =>
  `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// ── 프리미엄 잠금 화면 ──────────────────────────────────────────────────────
const FEATURES: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}[] = [
  {
    icon: 'chatbubbles',
    title: 'AI 채팅 분석',
    desc: '오늘·이번 주·이번 달 기록을 AI가 채팅으로 분석해줘요.',
  },
  {
    icon: 'bulb',
    title: '맞춤 코칭',
    desc: '잘한 점과 개선점을 짚고, 실천 제안을 받아요.',
  },
  {
    icon: 'albums',
    title: '대화 저장',
    desc: '분석 대화가 세션으로 저장돼 언제든 다시 볼 수 있어요.',
  },
];

function LockedView({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.lockContent}>
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="sparkles" size={34} color={colors.primary} />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>프리미엄</Text>
        </View>
        <Text style={styles.heroTitle}>AI 업무 분석</Text>
        <Text style={styles.heroDesc}>
          쌓인 기록을 바탕으로 AI와 대화하며{'\n'}나의 업무 패턴을 분석해요.
        </Text>
      </View>
      <View style={styles.featureList}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
            <Ionicons name="lock-closed" size={16} color={colors.line} />
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.ctaButton} onPress={onUpgrade} activeOpacity={0.85}>
        <Text style={styles.ctaButtonText}>무료로 시작하기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── 세션 목록 뷰 ───────────────────────────────────────────────────────────
function SessionList({
  onOpen,
  onNew,
}: {
  onOpen: (s: ChatSessionSummary) => void;
  onNew: () => void;
}) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    apiListChatSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const handleDelete = (s: ChatSessionSummary) => {
    Alert.alert('대화 삭제', `"${s.title}" 대화를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          apiDeleteChatSession(s.id)
            .then(load)
            .catch(() => {});
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.newChatBtn} onPress={onNew} activeOpacity={0.85}>
        <Ionicons name="add" size={20} color={colors.white} />
        <Text style={styles.newChatText}>새 분석 대화</Text>
      </TouchableOpacity>
      {sessions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={40} color={colors.line} />
          <Text style={styles.emptyText}>
            첫 분석을 시작해보세요.{'\n'}대화는 여기 저장돼요.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.sessionRow}
              onPress={() => onOpen(item)}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.sessionDate}>
                  {new Date(item.updatedAt).toLocaleDateString('ko-KR')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.inkSub} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ── 채팅 뷰 ────────────────────────────────────────────────────────────────
function ChatView({
  session,
  onBack,
}: {
  session: ChatSessionSummary;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingAssistantId, setStreamingAssistantId] = useState<
    string | null
  >(null);
  const [failedAssistantId, setFailedAssistantId] = useState<string | null>(
    null,
  );
  const listRef = useRef<FlatList<ChatMessage>>(null);
  // AI 국외 전송 동의 — 서버가 SSOT. null=아직 모름(조회 전), false=미동의.
  const [aiConsent, setAiConsent] = useState<boolean | null>(null);
  // 동의 후 원래 하려던 전송을 이어가기 위해 보류한 요청.
  const [pendingBody, setPendingBody] = useState<ChatMessageBody | null>(null);

  useEffect(() => {
    apiGetMe()
      .then((me) => setAiConsent(me.settings.aiConsent))
      .catch(() => {});
  }, []);

  useEffect(() => {
    apiGetChatMessages(session.id)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session.id]);

  const scrollToEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

  // consentJustGranted: 동의 직후 재호출용. setState는 다음 렌더에 반영되므로
  // 같은 틱에서 aiConsent를 다시 읽으면 여전히 false라 모달이 무한히 다시 열린다.
  const send = async (
    body: ChatMessageBody,
    consentJustGranted = false,
  ) => {
    if (sending) return;
    // 미동의면 전송하지 않고 동의 시트를 띄운다. 서버도 403으로 막지만,
    // 여기서 먼저 잡아야 실패한 말풍선이 대화에 남지 않는다.
    if (!consentJustGranted && aiConsent === false) {
      setPendingBody(body);
      return;
    }
    setSending(true);
    setFailedAssistantId(null);
    const clientMessageId = makeClientMessageId();
    const assistantTempId = `${clientMessageId}:pending`;
    const createdAt = new Date().toISOString();
    const userText = body.analyze
      ? RANGE_USER_TEXT[body.analyze]
      : (body.content ?? '').trim();
    const requestBody = { ...body, clientMessageId };
    setStreamingAssistantId(assistantTempId);
    setMessages((prev) => [
      ...prev,
      {
        id: clientMessageId,
        role: 'user',
        content: userText,
        createdAt,
      },
      {
        id: assistantTempId,
        role: 'assistant',
        content: '',
        createdAt,
      },
    ]);
    scrollToEnd();

    try {
      await streamChatMessage(session.id, requestBody, {
        onToken: (text, replace) => {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantTempId
                ? {
                    ...message,
                    content: replace ? text : message.content + text,
                  }
                : message,
            ),
          );
          scrollToEnd();
        },
        onDone: ({ userMessageId, assistantMessageId }) => {
          setMessages((prev) =>
            prev.map((message) => {
              if (message.id === clientMessageId)
                return { ...message, id: userMessageId };
              if (message.id === assistantTempId)
                return { ...message, id: assistantMessageId };
              return message;
            }),
          );
          setStreamingAssistantId(null);
        },
        onError: () => {},
      });
    } catch {
      // 동일 clientMessageId를 보내므로 서버에서 user/assistant가 중복 저장되지 않는다.
      try {
        const res = await apiPostChatMessage(session.id, requestBody);
        setMessages((prev) =>
          prev.map((message) => {
            if (message.id === clientMessageId) return res.userMessage;
            if (message.id === assistantTempId) return res.assistantMessage;
            return message;
          }),
        );
      } catch {
        setFailedAssistantId(assistantTempId);
        Alert.alert('전송 실패', '네트워크를 확인하고 다시 시도해 주세요.');
      }
    } finally {
      setStreamingAssistantId(null);
      setSending(false);
    }
  };

  const handleSendText = () => {
    const t = input.trim();
    if (!t) return;
    setInput('');
    void send({ content: t });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* 헤더 */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.chatTitle} numberOfLines={1}>
          {session.title}
        </Text>
      </View>

      {/* 메시지 */}
      {loading ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="sparkles" size={32} color={colors.primaryFaint} />
              <Text style={styles.emptyText}>
                아래 분석 버튼을 누르거나{'\n'}자유롭게 질문해보세요.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.messageGroup}>
              <View
                style={[
                  styles.bubble,
                  item.role === 'user' ? styles.bubbleUser : styles.bubbleAi,
                ]}
              >
                {item.role === 'assistant' &&
                item.id === streamingAssistantId &&
                !item.content ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text
                    style={
                      item.role === 'user'
                        ? styles.bubbleUserText
                        : styles.bubbleAiText
                    }
                  >
                    {item.role === 'assistant'
                      ? stripMarkdown(item.content)
                      : item.content}
                  </Text>
                )}
              </View>
              {item.id === failedAssistantId ? (
                <Text style={styles.streamErrorText}>
                  응답이 중단됐어요. 다시 전송해 주세요.
                </Text>
              ) : null}
            </View>
          )}
        />
      )}

      {/* 분석 칩 */}
      <View style={styles.chipRow}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.chip, sending && styles.chipDisabled]}
            onPress={() => void send({ analyze: r.key })}
            disabled={sending}
            activeOpacity={0.8}
          >
            <Ionicons name="analytics" size={14} color={colors.primary} />
            <Text style={styles.chipText}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 입력바 */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="AI에게 질문하기…"
          placeholderTextColor={colors.inkSub}
          multiline
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (sending || !input.trim()) && styles.sendBtnDisabled]}
          onPress={handleSendText}
          disabled={sending || !input.trim()}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="arrow-up" size={18} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>

      {/* AI 국외 전송 동의 (5.1.2(i)) — 미동의 상태의 첫 전송 시도에서 뜬다 */}
      <AiConsentModal
        visible={pendingBody !== null}
        onClose={() => setPendingBody(null)}
        onAgreed={() => {
          const body = pendingBody;
          setPendingBody(null);
          setAiConsent(true);
          // 동의 직후 원래 하려던 전송을 이어간다(사용자가 다시 누르지 않게).
          if (body) void send(body, true);
        }}
      />
    </KeyboardAvoidingView>
  );
}

// ── 루트: 프리미엄 게이트 + 목록/채팅 전환 ──────────────────────────────────
export default function AnalysisScreen() {
  const { isPremium, loading, refresh } = usePremium();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [active, setActive] = useState<ChatSessionSummary | null>(null);
  const [creating, setCreating] = useState(false);

  const handleNew = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const s = await apiCreateChatSession();
      setActive(s);
    } catch {
      Alert.alert('오류', '대화를 시작하지 못했어요. 네트워크를 확인해 주세요.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isPremium) {
    return (
      <>
        <LockedView
          onUpgrade={() => {
            track('premium_interest_click', { feature: 'AI 분석' });
            setPaywallOpen(true);
          }}
        />
        <PaywallModal
          visible={paywallOpen}
          featureName="AI 분석"
          onClose={() => setPaywallOpen(false)}
          onUnlocked={() => {
            setPaywallOpen(false);
            refresh();
          }}
        />
      </>
    );
  }

  return active ? (
    <ChatView session={active} onBack={() => setActive(null)} />
  ) : (
    <SessionList onOpen={setActive} onNew={() => void handleNew()} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  lockContent: { padding: 20, paddingBottom: 40 },
  // 잠금
  hero: { alignItems: 'center', paddingVertical: 24 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  heroDesc: { fontSize: 14, color: colors.inkSub, textAlign: 'center', lineHeight: 21 },
  featureList: { gap: 10, marginTop: 8 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  featureDesc: { fontSize: 13, color: colors.inkSub, marginTop: 3, lineHeight: 18 },
  ctaButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  // 세션 목록
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    margin: 16,
    marginBottom: 4,
  },
  newChatText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  emptyText: {
    fontSize: 14,
    color: colors.inkSub,
    textAlign: 'center',
    lineHeight: 21,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  sessionTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  sessionDate: { fontSize: 12, color: colors.inkSub, marginTop: 2 },
  // 채팅
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.white,
    gap: 4,
  },
  backBtn: { padding: 6 },
  chatTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  msgList: { padding: 16, gap: 10, flexGrow: 1 },
  bubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  messageGroup: { gap: 4 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bubbleUserText: { color: colors.white, fontSize: 14, lineHeight: 20 },
  bubbleAiText: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  streamErrorText: { color: colors.danger, fontSize: 11 },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryFaint,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipDisabled: { opacity: 0.5 },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    color: colors.ink,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
