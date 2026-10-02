import React from 'react';
import { Bell, X, Info, CheckCircle2, AlertTriangle, Zap, Trash2 } from 'lucide-react';
import { OSNotification } from '../types/os';
import { soundFX } from '../audio/soundEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notifications: OSNotification[];
  onClear: () => void;
  onDismiss: (id: string) => void;
}

const getNotifIcon = (type: OSNotification['type']) => {
  switch (type) {
    case 'cyber': return <Zap className="w-4 h-4 text-cyan-400" />;
    case 'success': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    case 'alert': return <AlertTriangle className="w-4 h-4 text-rose-400" />;
    default: return <Info className="w-4 h-4 text-cyan-400" />;
  }
};

export const NotificationCenter: React.FC<Props> = ({
  isOpen,
  onClose,
  notifications,
  onClear,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="absolute bottom-14 right-4 w-80 bg-[#0a0f22]/95 backdrop-blur-2xl rounded-2xl border-2 border-cyan-500/40 shadow-2xl p-4 flex flex-col gap-3 z-50 text-slate-100 font-sans shadow-glass animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan-400">
          <Bell className="w-4 h-4" />
          NEURAL DISPATCHES ({notifications.length})
        </div>

        {notifications.length > 0 && (
          <button
            onClick={() => {
              soundFX.playClick(400);
              onClear();
            }}
            className="text-[11px] font-mono text-slate-400 hover:text-rose-400 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono text-slate-500">
            No active dispatches in queue.
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col gap-1 relative group hover:border-cyan-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-200">
                  {getNotifIcon(n.type)}
                  <span className="truncate max-w-[180px]">{n.title}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500">{n.timestamp}</span>
              </div>

              <div className="text-[11px] font-mono text-slate-400 leading-relaxed pl-5">
                {n.message}
              </div>

              <button
                onClick={() => {
                  soundFX.playClick(400);
                  onDismiss(n.id);
                }}
                className="absolute top-2 right-2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
