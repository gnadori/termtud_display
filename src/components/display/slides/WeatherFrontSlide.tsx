import { CloudSun, Droplets, Gauge, Thermometer, Wind } from 'lucide-react';
import { useState } from 'react';
import { describeWeatherCode } from '../../../services/scienceFeeds';
import type { WeatherData } from '../../../types';

interface Props {
  weather: WeatherData | null;
  frontMapUrl: string;
  locationName: string;
}

export function WeatherFrontSlide({ weather, frontMapUrl, locationName }: Props) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
            <CloudSun className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-sky-400 uppercase">
              Szinoptikus meteorológia • DWD & Open-Meteo
            </p>
            <h2 className="text-2xl font-bold text-white lg:text-3xl">
              Aktuális időjárási térkép frontokkal
            </h2>
          </div>
        </div>
        {weather && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-right">
            <div className="text-xs text-sky-300">{locationName}</div>
            <div className="text-xl font-bold text-white">
              {weather.temperature} °C • {describeWeatherCode(weather.weatherCode)}
            </div>
          </div>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-5">
        {/* Fronttérkép */}
        <div className="col-span-8 flex items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-2">
          {!imgError ? (
            <img
              src={`${frontMapUrl}?t=${Math.floor(Date.now() / (30 * 60 * 1000))}`}
              alt="Európai időjárási fronttérkép"
              className="h-full w-full rounded-xl object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="p-6 text-center text-slate-400">
              A szinoptikus fronttérkép jelenleg nem tölthető be az adott forrásról.
              <br />
              <span className="text-xs text-slate-500">
                (Az admin felületen a térkép URL-je módosítható.)
              </span>
            </div>
          )}
        </div>

        {/* Helyi adatok */}
        <div className="col-span-4 flex flex-col justify-between gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              <Thermometer className="h-4 w-4 text-amber-400" />
              Hőmérséklet ({locationName})
            </div>
            <div className="mt-1 text-4xl font-extrabold text-white">
              {weather ? `${weather.temperature} °C` : '–'}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Hőérzet: {weather ? `${weather.apparentTemperature} °C` : '–'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              <Wind className="h-4 w-4 text-sky-400" />
              Szélsebesség
            </div>
            <div className="mt-1 text-3xl font-bold text-sky-300">
              {weather ? `${weather.windSpeed} km/h` : '–'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase">
                <Gauge className="h-4 w-4 text-violet-400" />
                Légnyomás
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-100">
                {weather ? `${weather.pressure}` : '–'}
                <span className="ml-1 text-xs font-normal text-slate-400">hPa</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase">
                <Droplets className="h-4 w-4 text-cyan-400" />
                Páratartalom
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-100">
                {weather ? `${weather.humidity}%` : '–'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
