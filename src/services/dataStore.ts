import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import type {
  Announcement,
  CalendarEvent,
  DisplaySettings,
  FunFact,
} from '../types';

export const DEFAULT_SETTINGS: DisplaySettings = {
  carouselIntervalSeconds: 45,
  enabledSlides: ['earthquake', 'animal', 'weather', 'space', 'nobel', 'funfact'],
  weatherFrontMapUrl:
    'https://www.dwd.de/DWD/wetter/wv_spez/hobbymet/wetterkarten/bwk_bodendruck_na_ana.png',
  latitude: 47.4979,
  longitude: 19.0402,
  locationName: 'Budapest',
  schoolTitle: 'Természettudományi Tanári',
};

const STORAGE_KEYS = {
  announcements: 'ttd_announcements_v1',
  events: 'ttd_events_v1',
  funFacts: 'ttd_funfacts_v1',
  settings: 'ttd_settings_v1',
};

function todayOffsetDate(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function seedDemoDataIfEmpty() {
  if (!localStorage.getItem(STORAGE_KEYS.announcements)) {
    const demoAnnouncements: Announcement[] = [
      {
        id: 'demo-ann-1',
        title: 'Kémia szakkör – szerda 15:00',
        body: 'Ezen a héten lángfestés és redoxireakciók a 204-es laborban. Köpeny kötelező!',
        priority: 'normal',
        active: true,
        createdAt: Date.now() - 3600_000,
        updatedAt: Date.now() - 3600_000,
      },
      {
        id: 'demo-ann-2',
        title: 'Fizika OKTV konzultáció',
        body: 'Pénteken 14:15-től felkészítő foglalkozás az emelt szintű érettségizőknek és versenyzőknek.',
        priority: 'urgent',
        active: true,
        createdAt: Date.now() - 7200_000,
        updatedAt: Date.now() - 7200_000,
      },
      {
        id: 'demo-ann-3',
        title: 'Mikroszkópia gyakorlat',
        body: 'A biológia szertárban megtekinthetők az új preparátumok nagyszünetekben.',
        priority: 'normal',
        active: true,
        createdAt: Date.now() - 10800_000,
        updatedAt: Date.now() - 10800_000,
      },
    ];
    localStorage.setItem(STORAGE_KEYS.announcements, JSON.stringify(demoAnnouncements));
  }

  if (!localStorage.getItem(STORAGE_KEYS.events)) {
    const demoEvents: CalendarEvent[] = [
      {
        id: 'demo-ev-1',
        title: 'Biológia labor: Sejtosztódás vizsgálata',
        date: todayOffsetDate(0),
        time: '14:30',
        location: 'Biológia előadó',
        category: 'biologia',
        createdAt: Date.now(),
      },
      {
        id: 'demo-ev-2',
        title: 'Csillagászati szakkör – Távcsöves észlelés',
        date: todayOffsetDate(1),
        time: '18:00',
        location: 'Tetőterasz',
        category: 'fizika',
        createdAt: Date.now(),
      },
      {
        id: 'demo-ev-3',
        title: 'Kémia kísérleti délután',
        date: todayOffsetDate(2),
        time: '15:00',
        location: '204-es labor',
        category: 'kemia',
        createdAt: Date.now(),
      },
      {
        id: 'demo-ev-4',
        title: 'Földrajz verseny – Iskolai forduló',
        date: todayOffsetDate(4),
        time: '13:30',
        location: '112-es terem',
        category: 'verseny',
        createdAt: Date.now(),
      },
      {
        id: 'demo-ev-5',
        title: 'Robotika és szenzorika műhely',
        date: todayOffsetDate(6),
        time: '15:30',
        location: 'Fizika szertár',
        category: 'fizika',
        createdAt: Date.now(),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(demoEvents));
  }

  if (!localStorage.getItem(STORAGE_KEYS.funFacts)) {
    localStorage.setItem(STORAGE_KEYS.funFacts, JSON.stringify([]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.settings)) {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(DEFAULT_SETTINGS));
  }
}

function readLocal<T>(key: string, fallback: T): T {
  seedDemoDataIfEmpty();
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('ttd-local-update', { detail: { key } }));
}

function subscribeLocal<T>(
  key: string,
  fallback: T,
  onChange: (data: T) => void
): () => void {
  onChange(readLocal<T>(key, fallback));
  const onStorage = (e: StorageEvent) => {
    if (e.key === key) onChange(readLocal<T>(key, fallback));
  };
  const onCustom = (e: Event) => {
    const ce = e as CustomEvent<{ key: string }>;
    if (ce.detail?.key === key) onChange(readLocal<T>(key, fallback));
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('ttd-local-update', onCustom);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('ttd-local-update', onCustom);
  };
}

// ---------- Subscriptions ----------

export function subscribeAnnouncements(
  onChange: (items: Announcement[]) => void
): () => void {
  if (!isFirebaseConfigured || !db) {
    return subscribeLocal<Announcement[]>(STORAGE_KEYS.announcements, [], (items) =>
      onChange([...items].sort((a, b) => b.createdAt - a.createdAt))
    );
  }
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items: Announcement[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Announcement, 'id'>),
    }));
    onChange(items);
  });
}

export function subscribeEvents(onChange: (items: CalendarEvent[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    return subscribeLocal<CalendarEvent[]>(STORAGE_KEYS.events, [], (items) =>
      onChange(
        [...items].sort((a, b) =>
          `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
        )
      )
    );
  }
  const q = query(collection(db, 'events'), orderBy('date', 'asc'));
  return onSnapshot(q, (snap) => {
    const items: CalendarEvent[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CalendarEvent, 'id'>),
    }));
    items.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    onChange(items);
  });
}

export function subscribeFunFacts(onChange: (items: FunFact[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    return subscribeLocal<FunFact[]>(STORAGE_KEYS.funFacts, [], (items) =>
      onChange([...items].sort((a, b) => b.createdAt - a.createdAt))
    );
  }
  const q = query(collection(db, 'funFacts'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items: FunFact[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FunFact, 'id'>),
    }));
    onChange(items);
  });
}

export function subscribeSettings(onChange: (s: DisplaySettings) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    return subscribeLocal<DisplaySettings>(
      STORAGE_KEYS.settings,
      DEFAULT_SETTINGS,
      (s) => onChange({ ...DEFAULT_SETTINGS, ...s })
    );
  }
  return onSnapshot(doc(db, 'settings', 'display'), (snap) => {
    if (snap.exists()) {
      onChange({ ...DEFAULT_SETTINGS, ...(snap.data() as Partial<DisplaySettings>) });
    } else {
      onChange(DEFAULT_SETTINGS);
    }
  });
}

// ---------- Mutations ----------

export async function addAnnouncement(
  data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const now = Date.now();
  if (!isFirebaseConfigured || !db) {
    const items = readLocal<Announcement[]>(STORAGE_KEYS.announcements, []);
    const next: Announcement = {
      ...data,
      id: `local-${now}`,
      createdAt: now,
      updatedAt: now,
    };
    writeLocal(STORAGE_KEYS.announcements, [next, ...items]);
    return;
  }
  await addDoc(collection(db, 'announcements'), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateAnnouncement(
  id: string,
  patch: Partial<Omit<Announcement, 'id' | 'createdAt'>>
): Promise<void> {
  const now = Date.now();
  if (!isFirebaseConfigured || !db) {
    const items = readLocal<Announcement[]>(STORAGE_KEYS.announcements, []);
    writeLocal(
      STORAGE_KEYS.announcements,
      items.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: now } : item))
    );
    return;
  }
  await updateDoc(doc(db, 'announcements', id), { ...patch, updatedAt: now });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const items = readLocal<Announcement[]>(STORAGE_KEYS.announcements, []);
    writeLocal(
      STORAGE_KEYS.announcements,
      items.filter((item) => item.id !== id)
    );
    return;
  }
  await deleteDoc(doc(db, 'announcements', id));
}

export async function addEvent(
  data: Omit<CalendarEvent, 'id' | 'createdAt'>
): Promise<void> {
  const now = Date.now();
  if (!isFirebaseConfigured || !db) {
    const items = readLocal<CalendarEvent[]>(STORAGE_KEYS.events, []);
    writeLocal(STORAGE_KEYS.events, [...items, { ...data, id: `local-${now}`, createdAt: now }]);
    return;
  }
  await addDoc(collection(db, 'events'), { ...data, createdAt: now });
}

export async function deleteEvent(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const items = readLocal<CalendarEvent[]>(STORAGE_KEYS.events, []);
    writeLocal(
      STORAGE_KEYS.events,
      items.filter((item) => item.id !== id)
    );
    return;
  }
  await deleteDoc(doc(db, 'events', id));
}

export async function addFunFact(
  data: Omit<FunFact, 'id' | 'createdAt'>
): Promise<void> {
  const now = Date.now();
  if (!isFirebaseConfigured || !db) {
    const items = readLocal<FunFact[]>(STORAGE_KEYS.funFacts, []);
    writeLocal(STORAGE_KEYS.funFacts, [{ ...data, id: `local-${now}`, createdAt: now }, ...items]);
    return;
  }
  await addDoc(collection(db, 'funFacts'), { ...data, createdAt: now });
}

export async function deleteFunFact(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const items = readLocal<FunFact[]>(STORAGE_KEYS.funFacts, []);
    writeLocal(
      STORAGE_KEYS.funFacts,
      items.filter((item) => item.id !== id)
    );
    return;
  }
  await deleteDoc(doc(db, 'funFacts', id));
}

export async function saveSettings(settings: DisplaySettings): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    writeLocal(STORAGE_KEYS.settings, settings);
    return;
  }
  await setDoc(doc(db, 'settings', 'display'), settings, { merge: true });
}
