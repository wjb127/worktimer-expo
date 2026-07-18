import AsyncStorage from '@react-native-async-storage/async-storage';

// 수신 알림 인박스 — 발생한(도착한) 로컬 알림을 로컬에 누적해 알림탭에서 보여준다.
// (서버 공지 배너와 별개. 이건 기기에서 실제로 울린 알림들의 히스토리.)

export interface InboxItem {
  id: string; // 알림 identifier (중복 방지 키)
  title: string;
  body: string;
  receivedAt: number; // epoch ms
  read: boolean;
}

const KEY = 'filltime.notifInbox';
const MAX = 100; // 최근 100개만 보관

// 변경 구독(벨 배지·알림탭이 새 수신/읽음을 반영)
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribeInboxChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function notifyChange(): void {
  listeners.forEach((f) => {
    try {
      f();
    } catch {
      // 리스너 예외는 무시
    }
  });
}

async function load(): Promise<InboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as InboxItem[]) : [];
  } catch {
    return [];
  }
}

async function save(list: InboxItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // 저장 실패 무시
  }
}

// 최신순 정렬해 반환
export async function getInbox(): Promise<InboxItem[]> {
  const list = await load();
  return list.sort((a, b) => b.receivedAt - a.receivedAt);
}

// 중복 id면 무시(트레이 동기화·리스너 중복 대비)
export async function addToInbox(item: {
  id: string;
  title: string;
  body: string;
  receivedAt?: number;
}): Promise<void> {
  const list = await load();
  if (list.some((x) => x.id === item.id)) return;
  list.unshift({
    id: item.id,
    title: item.title || '알림',
    body: item.body || '',
    receivedAt: item.receivedAt ?? Date.now(),
    read: false,
  });
  await save(list);
  notifyChange();
}

export async function markInboxRead(): Promise<void> {
  const list = await load();
  await save(list.map((x) => ({ ...x, read: true })));
  notifyChange();
}

export async function getInboxUnreadCount(): Promise<number> {
  const list = await load();
  return list.filter((x) => !x.read).length;
}
