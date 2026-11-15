import { Award, Quote } from 'lucide-react';
import type { NobelLaureate } from '../../../types';

interface Props {
  laureate: NobelLaureate | null;
  loading: boolean;
}

export function NobelLaureateSlide({ laureate, loading }: Props) {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/20 text-yellow-400">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-yellow-400 uppercase">
              Tudománytörténet • Nobel-díj archívum
            </p>
            <h2 className="text-2xl font-bold text-white lg:text-3xl">
              A nap természettudományi Nobel-díjasa
            </h2>
          </div>
        </div>
        {laureate && (
          <div className="rounded-full border border-yellow-500/30 bg-yellow-500/15 px-4 py-1.5 text-sm font-bold text-yellow-300">
            {laureate.category} • {laureate.year}
          </div>
        )}
      </div>

      {loading && !laureate ? (
        <div className="flex flex-1 items-center justify-center text-slate-400">
          Nobel-díjas adatok betöltése...
        </div>
      ) : laureate ? (
        <div className="grid min-h-0 flex-1 grid-cols-12 gap-6">
          <div className="col-span-4 flex items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
            {laureate.imageUrl ? (
              <img
                src={laureate.imageUrl}
                alt={laureate.name}
                className="h-full w-full object-cover object-top"
                loading="eager"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 p-6 text-slate-500">
                <Award className="h-16 w-16 text-yellow-500/40" />
                <span className="text-sm">Portré nem elérhető</span>
              </div>
            )}
          </div>

          <div className="col-span-8 flex flex-col justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="text-3xl font-extrabold tracking-tight text-yellow-300 lg:text-4xl">
              {laureate.name}
            </h3>

            {laureate.motivation && (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-yellow-400 uppercase">
                  <Quote className="h-3.5 w-3.5" />
                  Indoklás
                </div>
                <p className="text-base italic leading-relaxed text-slate-200 lg:text-lg">
                  „{laureate.motivation}”
                </p>
              </div>
            )}

            {laureate.extract && (
              <p className="line-clamp-4 text-base leading-relaxed text-slate-300 lg:text-lg">
                {laureate.extract}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
