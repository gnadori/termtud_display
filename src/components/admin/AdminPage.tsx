import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  AlertTriangle,
  Atom,
  Calendar as CalendarIcon,
  CheckCircle2,
  Download,
  ExternalLink,
  Lightbulb,
  LogIn,
  LogOut,
  Megaphone,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { parseEventsCsv, SAMPLE_CSV_CONTENT } from '../../services/csvEvents';
import { AdminCalendar } from './AdminCalendar';
import {
  auth,
  createMicrosoftProvider,
  isAuthorizedAdminEmail,
  isFirebaseConfigured,
} from '../../firebase/config';
import {
  addAnnouncement,
  addEvent,
  addFunFact,
  DEFAULT_SETTINGS,
  deleteAnnouncement,
  deleteEvent,
  deleteFunFact,
  replaceAllEvents,
  saveSettings,
  subscribeAnnouncements,
  subscribeEvents,
  subscribeFunFacts,
  subscribeSettings,
  updateAnnouncement,
} from '../../services/dataStore';
import type {
  Announcement,
  AnnouncementPriority,
  CalendarEvent,
  CarouselSlideId,
  DisplaySettings,
  EventCategory,
  FunFact,
} from '../../types';

type TabId = 'announcements' | 'events' | 'funfacts' | 'settings';

const SLIDE_OPTIONS: Array<{ id: CarouselSlideId; label: string }> = [
  { id: 'earthquake', label: 'Aktuális földrengés térkép' },
  { id: 'animal', label: 'A nap veszélyeztetett állata' },
  { id: 'weather', label: 'Időjárási térkép frontokkal' },
  { id: 'space', label: 'Napfolt- és napszél-tevékenység' },
  { id: 'nobel', label: 'A nap természettudományi Nobel-díjasa' },
  { id: 'funfact', label: 'Napi Fun Fact' },
];

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function plusDaysStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [demoSignedIn, setDemoSignedIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [funFacts, setFunFacts] = useState<FunFact[]>([]);
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Hirdetmény űrlap
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPriority, setAnnPriority] = useState<AnnouncementPriority>('normal');

  // Esemény űrlap
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState(todayStr());
  const [evTime, setEvTime] = useState('14:30');
  const [evLocation, setEvLocation] = useState('');
  const [evCategory, setEvCategory] = useState<EventCategory>('termeszettudomany');
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvOverwrite, setCsvOverwrite] = useState(true);

  // Fun fact űrlap
  const [ffText, setFfText] = useState('');
  const [ffCategory, setFfCategory] = useState('Fizika');
  const [ffSource, setFfSource] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && !isAuthorizedAdminEmail(u.email)) {
        setAuthError(
          `A(z) ${u.email ?? 'ismeretlen'} fiók nincs engedélyezve az admin felülethez.`
        );
        signOut(auth!);
        setUser(null);
      } else {
        setAuthError(null);
        setUser(u);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const isAuthenticated = isFirebaseConfigured ? Boolean(user) : demoSignedIn;

  useEffect(() => {
    if (!isAuthenticated) return;
    const u1 = subscribeAnnouncements(setAnnouncements);
    const u2 = subscribeEvents(setEvents);
    const u3 = subscribeFunFacts(setFunFacts);
    const u4 = subscribeSettings(setSettings);
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [isAuthenticated]);

  const handleMicrosoftLogin = async () => {
    if (!auth) return;
    setAuthError(null);
    try {
      await signInWithPopup(auth, createMicrosoftProvider());
    } catch (err: any) {
      setAuthError(err?.message || 'Sikertelen Microsoft bejelentkezés.');
    }
  };

  const handleLogout = async () => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    } else {
      setDemoSignedIn(false);
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    await addAnnouncement({
      title: annTitle.trim(),
      body: annBody.trim(),
      priority: annPriority,
      active: true,
    });
    setAnnTitle('');
    setAnnBody('');
    setAnnPriority('normal');
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim() || !evDate) return;
    await addEvent({
      title: evTitle.trim(),
      date: evDate,
      time: evTime || '08:00',
      location: evLocation.trim(),
      category: evCategory,
    });
    setEvTitle('');
    setEvLocation('');
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'minta_esemenyek.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvImporting(true);
    setCsvStatus(null);
    try {
      const text = await file.text();
      const { events: parsed, skippedRows } = parseEventsCsv(text);
      if (parsed.length === 0) {
        setCsvStatus('Nem található érvényes esemény a CSV fájlban.');
      } else {
        if (csvOverwrite) {
          await replaceAllEvents(parsed);
        } else {
          for (const ev of parsed) {
            await addEvent(ev);
          }
        }
        setCsvStatus(
          `${parsed.length} esemény sikeresen ${
            csvOverwrite ? 'felülírva' : 'hozzáadva'
          }.` + (skippedRows > 0 ? ` (${skippedRows} hibás sor kihagyva)` : '')
        );
      }
    } catch {
      setCsvStatus('Hiba történt a CSV fájl feldolgozása közben.');
    } finally {
      setCsvImporting(false);
      e.target.value = '';
    }
  };

  const handleAddFunFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ffText.trim()) return;
    await addFunFact({
      text: ffText.trim(),
      category: ffCategory,
      source: ffSource.trim() || undefined,
      active: true,
    });
    setFfText('');
    setFfSource('');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings(settings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const toggleSlide = (id: CarouselSlideId) => {
    setSettings((prev) => {
      const exists = prev.enabledSlides.includes(id);
      const next = exists
        ? prev.enabledSlides.filter((s) => s !== id)
        : [...prev.enabledSlides, id];
      return { ...prev, enabledSlides: next.length > 0 ? next : [id] };
    });
  };

  const next7End = useMemo(() => plusDaysStr(7), []);
  const today = useMemo(() => todayStr(), []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Hitelesítés ellenőrzése...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400">
              <Atom className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Természettudományi Admin</h1>
              <p className="text-xs text-slate-400">
                Hirdetmények, naptár és kijelző kezelése
              </p>
            </div>
          </div>

          {!isFirebaseConfigured && (
            <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
              <strong>Helyi Demó Mód:</strong> A Firebase környezeti változók még nincsenek
              beállítva (<code>.env</code>). A módosítások a böngészőben mentődnek, hogy
              helyben ki tudd próbálni a felületet.
            </div>
          )}

          {authError && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {authError}
            </div>
          )}

          {isFirebaseConfigured ? (
            <button
              type="button"
              onClick={handleMicrosoftLogin}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-cyan-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
            >
              <ShieldCheck className="h-5 w-5" />
              Belépés iskolai Microsoft fiókkal
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDemoSignedIn(true)}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-cyan-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
            >
              <LogIn className="h-5 w-5" />
              Belépés Demó Adminként
            </button>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Vissza a kijelző nézethez
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Felső sáv */}
      <header className="border-b border-slate-800 bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <Atom className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Kijelző Admin Felület</h1>
              <p className="text-xs text-slate-400">
                {user?.email ? `Bejelentkezve: ${user.email}` : 'Helyi Demó Mód'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
            >
              <ExternalLink className="h-4 w-4" />
              Kijelző megnyitása
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:border-red-500/40 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Kilépés
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Tabok */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { id: 'announcements' as const, label: 'Hirdetmények', icon: Megaphone },
            { id: 'events' as const, label: 'Naptár (7 napos sáv)', icon: CalendarIcon },
            { id: 'funfacts' as const, label: 'Egyéni Fun Factek', icon: Lightbulb },
            { id: 'settings' as const, label: 'Kijelző beállítások', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'bg-cyan-600 text-white'
                    : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 1. Hirdetmények */}
        {activeTab === 'announcements' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleAddAnnouncement}
              className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-5"
            >
              <h2 className="text-base font-bold text-white">Új hirdetmény</h2>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Cím</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="pl. Kémia szakkör elmarad"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Szöveg</label>
                <textarea
                  required
                  rows={3}
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  placeholder="Részletek a diákoknak..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Fontosság</label>
                <select
                  value={annPriority}
                  onChange={(e) => setAnnPriority(e.target.value as AnnouncementPriority)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="normal">Normál</option>
                  <option value="urgent">Fontos / Sürgős (kiemelt)</option>
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                <Plus className="h-4 w-4" />
                Hirdetmény közzététele
              </button>
            </form>

            <div className="space-y-3 lg:col-span-7">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start justify-between gap-4 rounded-2xl border p-4 ${
                    item.active
                      ? 'border-slate-800 bg-slate-900/70'
                      : 'border-slate-900 bg-slate-950/50 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{item.title}</h3>
                      {item.priority === 'urgent' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                          <AlertTriangle className="h-3 w-3" /> Fontos
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{item.body}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateAnnouncement(item.id, { active: !item.active })}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        item.active
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.active ? 'Aktív' : 'Rejtett'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAnnouncement(item.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Naptár / Események */}
        {activeTab === 'events' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <AdminCalendar
                events={events}
                selectedDate={evDate}
                onSelectDate={(d) => setEvDate(d)}
                onDeleteEvent={deleteEvent}
                todayStr={today}
                next7EndStr={next7End}
              />
            </div>

            <div className="space-y-6 lg:col-span-6">
              <form
                onSubmit={handleAddEvent}
                className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">Új naptári esemény</h2>
                  <span className="rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs font-mono font-semibold text-cyan-300">
                    {evDate}
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Esemény neve</label>
                  <input
                    type="text"
                    required
                    value={evTitle}
                    onChange={(e) => setEvTitle(e.target.value)}
                    placeholder="pl. Fizika OKTV 1. forduló"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Dátum</label>
                    <input
                      type="date"
                      required
                      value={evDate}
                      onChange={(e) => setEvDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Időpont</label>
                    <input
                      type="time"
                      required
                      value={evTime}
                      onChange={(e) => setEvTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Helyszín</label>
                    <input
                      type="text"
                      value={evLocation}
                      onChange={(e) => setEvLocation(e.target.value)}
                      placeholder="pl. 204-es labor"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Tantárgy / Típus</label>
                    <select
                      value={evCategory}
                      onChange={(e) => setEvCategory(e.target.value as EventCategory)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="termeszettudomany">Természettudomány</option>
                      <option value="fizika">Fizika</option>
                      <option value="kemia">Kémia</option>
                      <option value="biologia">Biológia</option>
                      <option value="foldrajz">Földrajz</option>
                      <option value="verseny">Verseny</option>
                      <option value="egyeb">Egyéb</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
                >
                  <Plus className="h-4 w-4" />
                  Hozzáadás a naptárhoz
                </button>
              </form>

              {/* CSV tömeges feltöltés */}
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Események feltöltése CSV fájlból
                  </h3>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-slate-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Minta CSV letöltése
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Oszlopok: <code>datum;ido;esemeny;helyszin;tantargy</code> (vesszővel és
                  pontosvesszővel is működik, pl. Excelből mentve).
                </p>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-300">
                  <input
                    type="checkbox"
                    checked={csvOverwrite}
                    onChange={(e) => setCsvOverwrite(e.target.checked)}
                    className="accent-cyan-500"
                  />
                  <span>Meglévő naptári események felülírása (törli a korábbiakat)</span>
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-500/60 hover:text-cyan-300">
                  <Upload className="h-4 w-4" />
                  <span>{csvImporting ? 'Importálás folyamatban...' : 'CSV fájl kiválasztása'}</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    disabled={csvImporting}
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                </label>
                {csvStatus && (
                  <p className="text-xs font-medium text-emerald-300">{csvStatus}</p>
                )}
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Összes jövőbeli esemény ({events.filter((e) => e.date >= today).length})
                </h3>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {events
                    .filter((ev) => ev.date >= today)
                    .map((ev) => {
                      const inNext7Days = ev.date >= today && ev.date <= next7End;
                      return (
                        <div
                          key={ev.id}
                          className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                            inNext7Days
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : 'border-slate-800 bg-slate-900/60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-cyan-300">
                                {ev.date} {ev.time}
                              </span>
                              {inNext7Days && (
                                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-semibold text-emerald-300">
                                  Kijelzőn látszik
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm font-bold text-white">{ev.title}</div>
                            {ev.location && (
                              <div className="text-xs text-slate-400">{ev.location}</div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteEvent(ev.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Egyéni Fun Factek */}
        {activeTab === 'funfacts' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleAddFunFact}
              className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-5"
            >
              <h2 className="text-base font-bold text-white">Saját Fun Fact hozzáadása</h2>
              <p className="text-xs text-slate-400">
                A rendszer alapból tartalmaz 24+ tudományos érdekességet, de itt saját
                iskolai vagy tananyaghoz kapcsolódó tényeket is felvehetsz.
              </p>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Kategória</label>
                <input
                  type="text"
                  value={ffCategory}
                  onChange={(e) => setFfCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Érdekesség szövege</label>
                <textarea
                  required
                  rows={3}
                  value={ffText}
                  onChange={(e) => setFfText(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Forrás (opcionális)
                </label>
                <input
                  type="text"
                  value={ffSource}
                  onChange={(e) => setFfSource(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                <Plus className="h-4 w-4" />
                Mentés
              </button>
            </form>

            <div className="space-y-3 lg:col-span-7">
              {funFacts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-sm text-slate-400">
                  Még nincs saját hozzáadott fun fact. Jelenleg a beépített tudományos
                  gyűjtemény jelenik meg a kijelzőn.
                </div>
              ) : (
                funFacts.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                  >
                    <div>
                      <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
                        {f.category}
                      </span>
                      <p className="mt-2 text-sm text-slate-200">{f.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteFunFact(f.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. Kijelző beállítások */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveSettings}
            className="max-w-2xl space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
          >
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Kijelző címe (fejléc)
              </label>
              <input
                type="text"
                value={settings.schoolTitle}
                onChange={(e) => setSettings({ ...settings, schoolTitle: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Carousel váltási idő (30–60 másodperc)</span>
                <span className="text-cyan-400">{settings.carouselIntervalSeconds} mp</span>
              </div>
              <input
                type="range"
                min={30}
                max={60}
                step={5}
                value={settings.carouselIntervalSeconds}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    carouselIntervalSeconds: Number(e.target.value),
                  })
                }
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-300">
                Aktív Carousel panelek
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {SLIDE_OPTIONS.map((opt) => {
                  const checked = settings.enabledSlides.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSlide(opt.id)}
                        className="accent-cyan-500"
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Időjárási fronttérkép kép URL
              </label>
              <input
                type="url"
                value={settings.weatherFrontMapUrl}
                onChange={(e) =>
                  setSettings({ ...settings, weatherFrontMapUrl: e.target.value })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Helység neve</label>
                <input
                  type="text"
                  value={settings.locationName}
                  onChange={(e) =>
                    setSettings({ ...settings, locationName: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Szélesség (lat)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={settings.latitude}
                  onChange={(e) =>
                    setSettings({ ...settings, latitude: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Hosszúság (lon)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={settings.longitude}
                  onChange={(e) =>
                    setSettings({ ...settings, longitude: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            {/* Éjszakai / képernyő kikapcs idősáv */}
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm font-bold text-white">
                    Képernyő kikapcsolási idősáv (fekete képernyő)
                  </span>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.sleepEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, sleepEnabled: e.target.checked })
                    }
                    className="accent-cyan-500"
                  />
                  Bekapcsolva
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Kikapcsolás (este)
                  </label>
                  <input
                    type="time"
                    value={settings.sleepStart}
                    onChange={(e) =>
                      setSettings({ ...settings, sleepStart: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Visszakapcsolás (reggel)
                  </label>
                  <input
                    type="time"
                    value={settings.sleepEnd}
                    onChange={(e) =>
                      setSettings({ ...settings, sleepEnd: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.sleepWeekends}
                  onChange={(e) =>
                    setSettings({ ...settings, sleepWeekends: e.target.checked })
                  }
                  className="accent-cyan-500"
                />
                <span>Hétvégén (szombat–vasárnap) egész nap fekete képernyő</span>
              </label>

              <p className="text-xs text-slate-400">
                A megadott idősávban a kijelző teljesen fekete képernyőre vált, majd a
                reggeli időpontban automatikusan visszakapcsol és folytatja a carouselt.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                Beállítások mentése
              </button>
              {settingsSaved && (
                <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Elmentve!
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
