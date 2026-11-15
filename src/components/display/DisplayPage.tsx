import {
  AlertTriangle,
  Atom,
  Calendar,
  Clock,
  MapPin,
  Megaphone,
  Settings,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BUILT_IN_FUN_FACTS } from '../../data/funFacts';
import {
  DEFAULT_SETTINGS,
  subscribeAnnouncements,
  subscribeEvents,
  subscribeFunFacts,
  subscribeSettings,
} from '../../services/dataStore';
import {
  fetchEarthquakes,
  fetchNobelLaureateOfDay,
  fetchProtectedAnimalOfDay,
  fetchSpaceWeather,
  fetchWeatherData,
} from '../../services/scienceFeeds';
import type {
  Announcement,
  CalendarEvent,
  CarouselSlideId,
  DisplaySettings,
  EarthquakeFeature,
  FunFact,
  NobelLaureate,
  ProtectedAnimal,
  SpaceWeatherData,
  WeatherData,
} from '../../types';
import { EarthquakeSlide } from './slides/EarthquakeSlide';
import { FunFactSlide } from './slides/FunFactSlide';
import { NobelLaureateSlide } from './slides/NobelLaureateSlide';
import { ProtectedAnimalSlide } from './slides/ProtectedAnimalSlide';
import { SpaceWeatherSlide } from './slides/SpaceWeatherSlide';
import { WeatherFrontSlide } from './slides/WeatherFrontSlide';

const SLIDE_LABELS: Record<CarouselSlideId, string> = {
  earthquake: 'Földrengések',
  animal: 'Védett állat',
  weather: 'Időjárás',
  space: 'Űridőjárás',
  nobel: 'Nobel-díjas',
  funfact: 'Fun fact',
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function isWithinSleepWindow(now: Date, settings: DisplaySettings): boolean {
  if (!settings.sleepEnabled) return false;
  if (settings.sleepWeekends) {
    const day = now.getDay();
    if (day === 0 || day === 6) return true;
  }
  const curMin = now.getHours() * 60 + now.getMinutes();
  const startMin = parseMinutes(settings.sleepStart || '20:00');
  const endMin = parseMinutes(settings.sleepEnd || '06:30');
  if (startMin === endMin) return false;
  if (startMin < endMin) {
    return curMin >= startMin && curMin < endMin;
  }
  // Éjszakai átnyúlás (pl. 20:00 -> 06:30)
  return curMin >= startMin || curMin < endMin;
}

function formatEventDayLabel(dateStr: string): string {
  const today = new Date();
  const todayStr = toDateStr(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = toDateStr(tomorrow);

  if (dateStr === todayStr) return 'MA';
  if (dateStr === tomorrowStr) return 'HOLNAP';

  const parsed = new Date(`${dateStr}T12:00:00`);
  return parsed.toLocaleDateString('hu-HU', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

export function DisplayPage() {
  const [now, setNow] = useState(() => new Date());
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [customFacts, setCustomFacts] = useState<FunFact[]>([]);
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);

  // Live science feeds
  const [earthquakes, setEarthquakes] = useState<EarthquakeFeature[]>([]);
  const [quakesLoading, setQuakesLoading] = useState(true);
  const [animal, setAnimal] = useState<ProtectedAnimal | null>(null);
  const [animalLoading, setAnimalLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeatherData | null>(null);
  const [nobel, setNobel] = useState<NobelLaureate | null>(null);
  const [nobelLoading, setNobelLoading] = useState(true);

  // Carousel state
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Óra frissítése másodpercenként
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Firestore / localStorage feliratkozások
  useEffect(() => {
    const unsubAnn = subscribeAnnouncements(setAnnouncements);
    const unsubEv = subscribeEvents(setEvents);
    const unsubFacts = subscribeFunFacts(setCustomFacts);
    const unsubSet = subscribeSettings(setSettings);
    return () => {
      unsubAnn();
      unsubEv();
      unsubFacts();
      unsubSet();
    };
  }, []);

  // Élő tudományos feedek betöltése és 15 percenkénti frissítése
  useEffect(() => {
    let mounted = true;
    const loadAllFeeds = async () => {
      try {
        const [q, a, w, sw, nb] = await Promise.allSettled([
          fetchEarthquakes(),
          fetchProtectedAnimalOfDay(),
          fetchWeatherData(settings.latitude, settings.longitude),
          fetchSpaceWeather(),
          fetchNobelLaureateOfDay(),
        ]);

        if (!mounted) return;
        if (q.status === 'fulfilled') setEarthquakes(q.value);
        setQuakesLoading(false);

        if (a.status === 'fulfilled') setAnimal(a.value);
        setAnimalLoading(false);

        if (w.status === 'fulfilled') setWeather(w.value);
        if (sw.status === 'fulfilled') setSpaceWeather(sw.value);

        if (nb.status === 'fulfilled') setNobel(nb.value);
        setNobelLoading(false);
      } catch {
        // ignore
      }
    };

    loadAllFeeds();
    const interval = setInterval(loadAllFeeds, 15 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [settings.latitude, settings.longitude]);

  const activeSlides = useMemo<CarouselSlideId[]>(() => {
    return settings.enabledSlides.length > 0
      ? settings.enabledSlides
      : ['earthquake', 'animal', 'weather', 'space', 'nobel', 'funfact'];
  }, [settings.enabledSlides]);

  const intervalMs = Math.min(60, Math.max(30, settings.carouselIntervalSeconds)) * 1000;
  const isSleeping = isWithinSleepWindow(now, settings);

  // Carousel időzítő (alvó módban szünetel)
  useEffect(() => {
    if (isSleeping) return;
    setProgress(0);
    const startedAt = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(100, (elapsed / intervalMs) * 100);
      setProgress(pct);
      if (elapsed >= intervalMs) {
        setSlideIndex((prev) => (prev + 1) % activeSlides.length);
      }
    }, 250);

    return () => clearInterval(tick);
  }, [slideIndex, intervalMs, activeSlides.length, isSleeping]);

  // Biztonságos index clamp
  const currentSlideId = activeSlides[slideIndex % activeSlides.length] || 'earthquake';

  // Aktív hirdetmények (sürgősek előre)
  const visibleAnnouncements = useMemo(() => {
    return announcements
      .filter((a) => a.active)
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === 'urgent' ? -1 : 1;
        return b.createdAt - a.createdAt;
      });
  }, [announcements]);

  // Következő 7 nap eseményei
  const upcomingEvents = useMemo(() => {
    const start = toDateStr(now);
    const endD = new Date(now);
    endD.setDate(endD.getDate() + 7);
    const end = toDateStr(endD);

    return events
      .filter((ev) => ev.date >= start && ev.date <= end)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [events, now]);

  // Napi fun fact kiválasztása
  const dailyFunFact = useMemo(() => {
    const activeCustom = customFacts.filter((f) => f.active);
    const pool = [
      ...activeCustom.map((f) => ({
        text: f.text,
        category: f.category,
        source: f.source,
      })),
      ...BUILT_IN_FUN_FACTS,
    ];
    const seed =
      now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    return pool[seed % pool.length];
  }, [customFacts, now]);

  const timeFormatted = now.toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateFormatted = now.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  if (isSleeping) {
    return <div className="h-screen w-screen cursor-none bg-black" />;
  }

  return (
    <div className="kiosk-screen flex h-screen w-screen flex-col bg-slate-950 text-slate-100">
      {/* Fejléc */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
            <Atom className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white lg:text-xl">
              {settings.schoolTitle}
            </h1>
            <p className="text-xs text-slate-400">Természettudományos információs kijelző</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {weather && (
            <div className="hidden items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-1.5 text-sm sm:flex">
              <span className="text-slate-400">{settings.locationName}:</span>
              <span className="font-bold text-sky-300">{weather.temperature} °C</span>
            </div>
          )}

          <div className="text-right">
            <div className="flex items-center justify-end gap-2 text-2xl font-extrabold tabular-nums text-white">
              <Clock className="h-5 w-5 text-cyan-400" />
              {timeFormatted}
            </div>
            <div className="text-xs capitalize text-slate-400">{dateFormatted}</div>
          </div>

          <Link
            to="/admin"
            title="Admin felület"
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-500 transition hover:border-slate-700 hover:text-slate-200"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Fő tartalom */}
      <main className="grid min-h-0 flex-1 grid-cols-12 gap-5 p-5">
        {/* Bal oldal: Carousel */}
        <section className="col-span-8 flex min-h-0 flex-col rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="min-h-0 flex-1">
            {currentSlideId === 'earthquake' && (
              <EarthquakeSlide earthquakes={earthquakes} loading={quakesLoading} />
            )}
            {currentSlideId === 'animal' && (
              <ProtectedAnimalSlide animal={animal} loading={animalLoading} />
            )}
            {currentSlideId === 'weather' && (
              <WeatherFrontSlide
                weather={weather}
                frontMapUrl={settings.weatherFrontMapUrl}
                locationName={settings.locationName}
              />
            )}
            {currentSlideId === 'space' && (
              <SpaceWeatherSlide spaceWeather={spaceWeather} />
            )}
            {currentSlideId === 'nobel' && (
              <NobelLaureateSlide laureate={nobel} loading={nobelLoading} />
            )}
            {currentSlideId === 'funfact' && <FunFactSlide fact={dailyFunFact} />}
          </div>

          {/* Carousel jelző + progress */}
          <div className="mt-4 shrink-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {activeSlides.map((id, idx) => {
                  const isActive = id === currentSlideId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSlideIndex(idx);
                        setProgress(0);
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        isActive
                          ? 'bg-cyan-500/25 text-cyan-300 ring-1 ring-cyan-500/50'
                          : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {SLIDE_LABELS[id]}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs tabular-nums text-slate-500">
                Váltás: {Math.round(intervalMs / 1000)} mp
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-cyan-400 transition-[width] duration-200 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </section>

        {/* Jobb oldal: Folyamatosan látszó hirdetmények */}
        <aside className="col-span-4 flex min-h-0 flex-col rounded-3xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <Megaphone className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-white">Hirdetmények</h2>
            </div>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
              {visibleAnnouncements.length} aktív
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            {visibleAnnouncements.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
                Jelenleg nincs aktív hirdetmény.
              </div>
            ) : (
              visibleAnnouncements.slice(0, 5).map((item) => {
                const urgent = item.priority === 'urgent';
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 ${
                      urgent
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`text-base font-bold ${
                          urgent ? 'text-amber-300' : 'text-cyan-300'
                        }`}
                      >
                        {item.title}
                      </h3>
                      {urgent && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300 uppercase">
                          <AlertTriangle className="h-3 w-3" />
                          Fontos
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                      {item.body}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </main>

      {/* Alsó sáv: Következő 7 nap eseményei (scrollozó ticker) */}
      <footer className="flex h-14 shrink-0 items-center border-t border-slate-800/80 bg-slate-900/95">
        <div className="flex h-full shrink-0 items-center gap-2 border-r border-slate-800 bg-cyan-950/50 px-5 text-sm font-bold tracking-wide text-cyan-300 uppercase">
          <Calendar className="h-4 w-4" />
          <span>Következő 7 nap</span>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {upcomingEvents.length === 0 ? (
            <div className="px-6 text-sm text-slate-400">
              A következő 7 napra nincs rögzített esemény a naptárban.
            </div>
          ) : (
            <div className="animate-ticker items-center gap-8 px-4">
              {[...upcomingEvents, ...upcomingEvents].map((ev, idx) => (
                <div
                  key={`${ev.id}-${idx}`}
                  className="flex shrink-0 items-center gap-3 text-sm"
                >
                  <span className="rounded-md bg-cyan-500/20 px-2.5 py-0.5 text-xs font-bold text-cyan-300 uppercase">
                    {formatEventDayLabel(ev.date)} • {ev.time}
                  </span>
                  <span className="font-semibold text-white">{ev.title}</span>
                  {ev.location && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      {ev.location}
                    </span>
                  )}
                  <span className="text-slate-700">|</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
