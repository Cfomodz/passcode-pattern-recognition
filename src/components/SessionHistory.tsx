import React from 'react';
import { PinCandidate } from '../types';

interface SessionEntry {
  id: number;
  timestamp: Date;
  topCandidate: PinCandidate;
}

interface SessionHistoryProps {
  history: SessionEntry[];
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ history }) => {
  if (history.length === 0) return null;

  return (
    <div className="mt-8 border-t border-slate-700 pt-6">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Session History</h3>
      <div className="space-y-2">
        {history.map(entry => (
          <div key={entry.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded border border-slate-700/50 text-sm">
            <span className="text-slate-500 font-mono">
              {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">Top Result:</span>
              <span className="font-mono font-bold text-cyan-300 text-lg tracking-widest">
                {entry.topCandidate.pin}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
