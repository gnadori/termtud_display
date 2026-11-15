import { Leaf, ShieldAlert } from 'lucide-react';
import type { ProtectedAnimal } from '../../../types';

interface Props {
  animal: ProtectedAnimal | null;
  loading: boolean;
}

export function ProtectedAnimalSlide({ animal, loading }: Props) {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Leaf className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">
              Magyarország fokozottan védett állatvilága • Wikipédia
            </p>
            <h2 className="text-2xl font-bold text-white lg:text-3xl">
              A nap veszélyeztetett állata
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-1.5 text-xs font-semibold text-emerald-300">
          <ShieldAlert className="h-4 w-4" />
          Fokozottan védett faj
        </div>
      </div>

      {loading && !animal ? (
        <div className="flex flex-1 items-center justify-center text-slate-400">
          Állatfaj betöltése a Wikipédiáról...
        </div>
      ) : animal ? (
        <div className="grid min-h-0 flex-1 grid-cols-12 gap-6">
          <div className="col-span-5 flex items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
            {animal.imageUrl ? (
              <img
                src={animal.imageUrl}
                alt={animal.title}
                className="h-full w-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 p-6 text-center text-slate-500">
                <Leaf className="h-14 w-14 text-emerald-500/40" />
                <span>Nincs elérhető fotó</span>
              </div>
            )}
          </div>

          <div className="col-span-7 flex flex-col justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="text-3xl font-extrabold tracking-tight text-emerald-300 lg:text-4xl">
              {animal.title}
            </h3>
            <p className="line-clamp-6 text-lg leading-relaxed text-slate-200 lg:text-xl">
              {animal.extract}
            </p>
            <div className="mt-auto border-t border-slate-800 pt-3 text-xs text-slate-400">
              Forrás: hu.wikipedia.org • Kategória: Magyarországon fokozottan védett állatok
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
