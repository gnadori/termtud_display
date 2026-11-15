import { Compass, Flame, Sun, Zap } from 'lucide-react';
import { useState } from 'react';
import type { SpaceWeatherData } from '../../../types';

interface Props {
  spaceWeather: SpaceWeatherData | null;
}

function getKpDescription(kp: number | null): {
  label: string;
  colorClass: string;
} {
  if (kp === null) return { label: 'Nincs adat', colorClass: 'text-slate-400' };
  if (kp < 4) return { label: 'Nyugodt geomágneses tér', colorClass: 'text-emerald-400' };
  if (kp === 4) return { label: 'Mérsékelten aktív', colorClass: 'text-yellow-400' };
  if (kp === 5) return { label: 'Kisebb geomágneses vihar (G1)', colorClass: 'text-orange-400' };
  if (kp === 6) return { label: 'Mérsékelt geomágneses vihar (G2)', colorClass: 'text-orange-500' };
  return { label: 'Erős geomágneses vihar (G3+)', colorClass: 'text-red-400' };
}

export function SpaceWeatherSlide({ spaceWeather }: Props) {
  const [imgFallback, setImgFallback] = useState(false);
  const kpInfo = getKpDescription(spaceWeather?.kpIndex ?? null);
  const kpVal = spaceWeather?.kpIndex ?? 0;

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <Sun className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase">
              Űridőjárás • NASA SDO & NOAA SWPC
            </p>
            <h2 className="text-2xl font-bold text-white lg:text-3xl">
              Aktuális napfolt- és napszél-tevékenység
            </h2>
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-right">
          <div className="text-xs text-amber-300">Geomágneses állapot</div>
          <div className={`text-lg font-bold ${kpInfo.colorClass}`}>{kpInfo.label}</div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-6">
        {/* Napkorong kép (SDO HMI) */}
        <div className="col-span-5 flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-black p-3">
          {spaceWeather && !imgFallback ? (
            <img
              src={spaceWeather.solarImageUrl}
              alt="NASA SDO napfolt felvétel"
              className="h-full max-h-[380px] w-auto rounded-full object-contain"
              onError={() => setImgFallback(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Sun className="h-20 w-20 text-amber-500/40" />
              <span className="text-sm">Élő napkorong kép nem elérhető</span>
            </div>
          )}
          <div className="mt-2 text-xs text-slate-400">
            NASA SDO HMI Continuum (napfoltok látható fényben)
          </div>
        </div>

        {/* Mutatók */}
        <div className="col-span-7 flex flex-col justify-between gap-4">
          {/* Kp index */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold tracking-wider text-slate-300 uppercase">
                <Compass className="h-5 w-5 text-amber-400" />
                Planetáris Kp-index (0–9)
              </div>
              <span className="text-3xl font-extrabold text-amber-400">
                {spaceWeather?.kpIndex !== null && spaceWeather?.kpIndex !== undefined
                  ? spaceWeather.kpIndex.toFixed(1)
                  : '–'}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-9 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
                const active = kpVal >= level - 0.3;
                const barColor =
                  level <= 3
                    ? 'bg-emerald-500'
                    : level === 4
                    ? 'bg-yellow-500'
                    : level <= 6
                    ? 'bg-orange-500'
                    : 'bg-red-500';
                return (
                  <div
                    key={level}
                    className={`h-4 rounded ${
                      active ? barColor : 'bg-slate-800'
                    }`}
                  />
                );
              })}
            </div>
            <p className="mt-2.5 text-xs text-slate-400">
              Kp ≥ 5 esetén sarki fény (aurora) is megjelenhet alacsonyabb szélességeken.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                <Zap className="h-4 w-4 text-cyan-400" />
                Napszél sebessége
              </div>
              <div className="mt-2 text-4xl font-extrabold text-cyan-300">
                {spaceWeather?.solarWindSpeed ?? '–'}
                <span className="ml-1.5 text-base font-normal text-slate-400">km/s</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Átlagos: 300–450 km/s • Gyors: 600+ km/s
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                <Flame className="h-4 w-4 text-rose-400" />
                Bolygóközi mágneses tér
              </div>
              <div className="mt-2 flex items-baseline gap-4">
                <div>
                  <span className="text-xs text-slate-400">Bt </span>
                  <span className="text-3xl font-bold text-white">
                    {spaceWeather?.bt ?? '–'}
                  </span>
                  <span className="ml-1 text-xs text-slate-400">nT</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Bz </span>
                  <span
                    className={`text-3xl font-bold ${
                      (spaceWeather?.bz ?? 0) < -5 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {spaceWeather?.bz ?? '–'}
                  </span>
                  <span className="ml-1 text-xs text-slate-400">nT</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Negatív Bz esetén könnyebben kapcsolódik a Föld mágneses terével.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
