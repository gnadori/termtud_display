import { Activity, MapPin } from 'lucide-react';
import type { EarthquakeFeature } from '../../../types';

interface Props {
  earthquakes: EarthquakeFeature[];
  loading: boolean;
}

// Egyszerűsített kontinens poligonok equirectangular vetületben (lon: -180..180 -> 0..360, lat: 90..-90 -> 0..180)
const CONTINENT_PATHS = [
  // Észak-Amerika
  'M 12 32 L 45 20 L 95 20 L 122 35 L 118 55 L 98 68 L 86 78 L 76 74 L 68 62 L 42 54 L 22 45 Z',
  // Dél-Amerika
  'M 98 86 L 122 86 L 142 104 L 136 132 L 118 158 L 106 162 L 100 138 L 94 108 Z',
  // Európa
  'M 168 24 L 208 20 L 224 32 L 216 48 L 195 52 L 174 48 L 166 36 Z',
  // Afrika
  'M 168 56 L 204 54 L 228 74 L 224 106 L 206 138 L 190 140 L 182 110 L 164 84 Z',
  // Ázsia
  'M 214 22 L 295 18 L 344 26 L 338 56 L 310 74 L 284 82 L 254 78 L 232 64 L 218 46 Z',
  // Ausztrália
  'M 294 114 L 332 112 L 342 134 L 326 146 L 298 140 Z',
];

function projectPoint(lon: number, lat: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * 360;
  const y = ((90 - lat) / 180) * 180;
  return { x, y };
}

function magColor(mag: number): string {
  if (mag >= 6) return '#ef4444'; // red-500
  if (mag >= 5) return '#f97316'; // orange-500
  if (mag >= 4) return '#eab308'; // yellow-500
  return '#22d3ee'; // cyan-400
}

function formatTimeAgo(ts: number): string {
  const diffMin = Math.max(1, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 60) return `${diffMin} perce`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} órája`;
  return `${Math.floor(diffH / 24)} napja`;
}

export function EarthquakeSlide({ earthquakes, loading }: Props) {
  const topFive = earthquakes.slice(0, 5);
  const strongest = earthquakes.reduce<EarthquakeFeature | null>(
    (best, cur) => (!best || cur.mag > best.mag ? cur : best),
    null
  );

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-rose-400 uppercase">
              Élő szeizmológiai térkép • USGS
            </p>
            <h2 className="text-2xl font-bold text-white lg:text-3xl">
              Aktuális földrengések a világban
            </h2>
          </div>
        </div>
        {strongest && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-right">
            <div className="text-xs text-rose-300">Legerősebb (24ó / hét)</div>
            <div className="text-xl font-bold text-rose-400">
              M {strongest.mag.toFixed(1)}
            </div>
          </div>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-5">
        {/* Térkép */}
        <div className="col-span-8 flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          {loading && earthquakes.length === 0 ? (
            <div className="text-slate-400">Földrengés-adatok betöltése...</div>
          ) : (
            <svg
              viewBox="0 0 360 180"
              className="h-full w-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Rács */}
              <g stroke="#1e293b" strokeWidth="0.4">
                <line x1="0" y1="90" x2="360" y2="90" strokeDasharray="2 2" />
                <line x1="180" y1="0" x2="180" y2="180" strokeDasharray="2 2" />
                <line x1="0" y1="45" x2="360" y2="45" />
                <line x1="0" y1="135" x2="360" y2="135" />
                <line x1="90" y1="0" x2="90" y2="180" />
                <line x1="270" y1="0" x2="270" y2="180" />
              </g>

              {/* Kontinensek */}
              <g fill="#1e293b" stroke="#334155" strokeWidth="0.6">
                {CONTINENT_PATHS.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>

              {/* Magyarország jelölése (19.04E, 47.5N) */}
              {(() => {
                const hu = projectPoint(19.04, 47.5);
                return (
                  <circle
                    cx={hu.x}
                    cy={hu.y}
                    r={2.2}
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth={0.5}
                  />
                );
              })()}

              {/* Földrengések */}
              {earthquakes.map((eq) => {
                const { x, y } = projectPoint(eq.lon, eq.lat);
                const r = Math.max(1.8, Math.min(7, (eq.mag - 1.5) * 1.3));
                const color = magColor(eq.mag);
                const isStrongest = strongest?.id === eq.id;
                return (
                  <g key={eq.id}>
                    {isStrongest && (
                      <circle
                        cx={x}
                        cy={y}
                        r={r + 3}
                        fill="none"
                        stroke={color}
                        strokeWidth="0.8"
                        opacity="0.7"
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={r}
                      fill={color}
                      fillOpacity={0.75}
                      stroke="#0f172a"
                      strokeWidth="0.4"
                    />
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Lista */}
        <div className="col-span-4 flex flex-col justify-between gap-2.5">
          {topFive.map((eq) => (
            <div
              key={eq.id}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-bold text-slate-950"
                style={{ backgroundColor: magColor(eq.mag) }}
              >
                {eq.mag.toFixed(1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-100">
                  {eq.place}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>Mélység: {Math.round(eq.depth)} km</span>
                  <span>•</span>
                  <span>{formatTimeAgo(eq.time)}</span>
                </div>
              </div>
            </div>
          ))}
          {topFive.length === 0 && !loading && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
              Jelenleg nem érhető el friss földrengés-adat.
            </div>
          )}
        </div>
      </div>

      {/* Jelmagyarázat */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> M &lt; 4.0
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> M 4.0–4.9
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> M 5.0–5.9
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> M 6.0+
          </span>
        </div>
        <span>Összesen {earthquakes.length} esemény megjelenítve</span>
      </div>
    </div>
  );
}
