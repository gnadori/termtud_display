import { Lightbulb, Sparkles } from 'lucide-react';

interface Props {
  fact: {
    text: string;
    category: string;
    source?: string;
  };
}

export function FunFactSlide({ fact }: Props) {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
            <Lightbulb className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-violet-400 uppercase">
              Tudtad-e? • Napi tudományos érdekesség
            </p>
            <h2 className="text-2xl font-bold text-white lg:text-3xl">Napi fun fact</h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/15 px-4 py-1.5 text-sm font-semibold text-violet-300">
          <Sparkles className="h-4 w-4" />
          {fact.category}
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 p-10 text-center">
        <Lightbulb className="mb-6 h-16 w-16 text-violet-400/80" />
        <p className="max-w-3xl text-2xl font-semibold leading-relaxed text-slate-100 lg:text-3xl lg:leading-relaxed">
          {fact.text}
        </p>
        {fact.source && (
          <p className="mt-6 text-sm text-slate-400">Forrás: {fact.source}</p>
        )}
      </div>
    </div>
  );
}
