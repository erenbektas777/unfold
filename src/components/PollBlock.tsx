'use client';

import { BarChart3, CheckCircle2 } from 'lucide-react';
import { PollData } from '@/lib/types';

interface PollBlockProps {
  postId: string;
  poll: PollData;
  onVote: (postId: string, optionId: string) => void;
}

export function PollBlock({ postId, poll, onVote }: PollBlockProps) {
  return (
    <div className="mt-3.5 rounded-xl border border-violet-500/20 bg-[#090d18]/90 p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-200">
          <BarChart3 className="h-3.5 w-3.5 text-violet-400" />
          {poll.question}
        </span>
        <span className="font-mono text-[10px] text-slate-500">{poll.total_votes} oy</span>
      </div>

      <div className="space-y-2">
        {poll.options.map((opt) => {
          const pct = poll.total_votes > 0 ? Math.round((opt.vote_count / poll.total_votes) * 100) : 0;
          const isSelected = poll.user_voted_option_id === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onVote(postId, opt.id)}
              className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-xs transition ${
                isSelected
                  ? 'border-violet-400/50 bg-violet-500/10 text-violet-100'
                  : 'border-white/10 bg-[#101624] text-slate-300 hover:border-violet-400/30'
              }`}
            >
              <div
                className="pointer-events-none absolute inset-y-0 left-0 bg-violet-500/15 transition-all"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium">
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-violet-300" />}
                  {opt.label}
                </span>
                <span className="font-mono text-[11px] text-slate-400">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
