'use client';

import React from 'react';
import { BookOpen, X, Sparkles, Feather, Compass, AlertCircle } from 'lucide-react';
import { useGameStore, JournalEntry } from '@/lib/store';

export function JournalModal() {
  const isJournalOpen = useGameStore((s) => s.isJournalOpen);
  const setJournalOpen = useGameStore((s) => s.setJournalOpen);
  const journal = useGameStore((s) => s.journal);

  if (!isJournalOpen) return null;

  const typeIcon = (type: JournalEntry['type']) => {
    switch (type) {
      case 'milestone':
        return <Sparkles className="h-4 w-4 text-amber-400" />;
      case 'discovery':
        return <Compass className="h-4 w-4 text-sky-400" />;
      case 'survival':
        return <AlertCircle className="h-4 w-4 text-rose-400" />;
      default:
        return <Feather className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <div className="relative flex h-[580px] w-full max-w-2xl flex-col rounded-2xl border border-white/15 bg-neutral-950/90 shadow-2xl backdrop-blur-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-semibold tracking-wider text-neutral-200 uppercase">
              Island Chronicles & Field Log
            </h2>
          </div>
          <button
            onClick={() => setJournalOpen(false)}
            className="rounded-lg p-1 text-neutral-400 hover:bg-white/10 hover:text-neutral-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Chronicle Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans scrollbar-thin scrollbar-thumb-white/10">
          {journal.map((entry) => (
            <article
              key={entry.id}
              className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:border-white/10 hover:bg-white/[0.05]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {typeIcon(entry.type)}
                  <h3 className="text-sm font-semibold text-neutral-200">{entry.title}</h3>
                </div>
                <span className="font-mono text-[11px] text-neutral-400">
                  Day {entry.day} • {entry.timeOfDay} • {entry.weather}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-neutral-300 italic font-serif">
                &ldquo;{entry.entry}&rdquo;
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}