import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CalendarEvent } from '../../types';

interface Props {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onDeleteEvent: (id: string) => void;
  todayStr: string;
  next7EndStr: string;
}

const WEEKDAYS = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

function formatYMD(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function AdminCalendar({
  events,
  selectedDate,
  onSelectDate,
  onDeleteEvent,
  todayStr,
  next7EndStr,
}: Props) {
  const initialDate = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // JS getDay(): 0 = Vasárnap, 1 = Hétfő ... -> átalakítás 0 = Hétfő .. 6 = Vasárnap
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: Array<{ day: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, dateStr: formatYMD(viewYear, viewMonth, d) });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, dateStr: null });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onSelectDate(todayStr);
  };

  const monthTitle = new Date(viewYear, viewMonth, 1).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
  });

  const selectedDayEvents = eventsByDate.get(selectedDate) || [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        {/* Hónap fejléc */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold capitalize text-white">{monthTitle}</h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={goPrevMonth}
              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
              title="Előző hónap"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              Ma
            </button>
            <button
              type="button"
              onClick={goNextMonth}
              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
              title="Következő hónap"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Hét napjai */}
        <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Napok rács */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, idx) => {
            if (!cell.day || !cell.dateStr) {
              return <div key={idx} className="h-12 rounded-xl bg-slate-950/30" />;
            }

            const dayEvents = eventsByDate.get(cell.dateStr) || [];
            const isSelected = cell.dateStr === selectedDate;
            const isToday = cell.dateStr === todayStr;
            const inNext7 = cell.dateStr >= todayStr && cell.dateStr <= next7EndStr;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => onSelectDate(cell.dateStr!)}
                className={`relative flex h-12 flex-col items-center justify-center rounded-xl border text-sm font-medium transition ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-600 text-white'
                    : inNext7
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-slate-100 hover:bg-emerald-500/20'
                    : 'border-slate-800/80 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                } ${isToday && !isSelected ? 'ring-1 ring-cyan-400' : ''}`}
              >
                <span>{cell.day}</span>
                {dayEvents.length > 0 && (
                  <div className="mt-0.5 flex items-center gap-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? 'bg-white' : 'bg-cyan-400'
                        }`}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] leading-none font-bold">+</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded border border-emerald-500/50 bg-emerald-500/20" />
            Következő 7 nap (kijelzőn látszik)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Van esemény
          </span>
        </div>
      </div>

      {/* Kiválasztott nap eseményei */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h4 className="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
          Események ezen a napon: {selectedDate}
        </h4>
        {selectedDayEvents.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nincs rögzített esemény erre a napra. Jobb oldalon tudsz újat felvenni.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5"
              >
                <div>
                  <div className="text-xs font-mono text-cyan-300">{ev.time}</div>
                  <div className="text-sm font-bold text-white">{ev.title}</div>
                  {ev.location && (
                    <div className="text-xs text-slate-400">{ev.location}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteEvent(ev.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
