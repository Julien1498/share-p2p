import React from 'react';
import { ActiveTransfer } from '../core/types';
import { formatBytes, formatETA, formatSpeed } from '../core/formatters';
import { ArrowUpRight, ArrowDownLeft, XCircle, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Zap, Ban } from 'lucide-react';

interface TransferListProps {
  transfers: ActiveTransfer[];
  onCancelTransfer: (fileId: string) => void;
}

export const TransferList: React.FC<TransferListProps> = ({
  transfers,
  onCancelTransfer,
}) => {
  if (transfers.length === 0) return null;

  return (
    <div className="w-full glass-panel rounded-2xl p-6 shadow-xl border border-slate-800/80">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-sky-400 animate-spin" />
          Transferts en cours ({transfers.length})
        </h3>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {transfers.map((t) => {
          const percent = t.totalBytes > 0 ? Math.min(100, Math.round((t.bytesTransferred / t.totalBytes) * 100)) : 0;
          const isSend = t.direction === 'send';

          return (
            <div
              key={t.fileId}
              className="glass-card rounded-xl p-4 transition-all duration-200 hover:border-slate-700"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg ${isSend ? 'bg-sky-500/20 text-sky-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    {isSend ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{t.metadata.name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{isSend ? `Vers ${t.peerName}` : `De ${t.peerName}`}</span>
                      <span>•</span>
                      <span>{formatBytes(t.metadata.size)}</span>
                    </p>
                  </div>
                </div>

                {/* Status Badge & Action */}
                <div className="flex items-center gap-2 shrink-0">
                  {t.status === 'completed' && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Terminé
                    </span>
                  )}
                  {t.status === 'failed' && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md">
                      <AlertCircle className="h-3.5 w-3.5" /> Échec
                    </span>
                  )}
                  {t.status === 'rejected' && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md">
                      <Ban className="h-3.5 w-3.5" /> Refusé par le destinataire
                    </span>
                  )}
                  {t.status === 'cancelled' && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                      <XCircle className="h-3.5 w-3.5" />
                      {t.cancelReason || 'Transfert annulé'}
                    </span>
                  )}
                  {t.status === 'transferring' && (
                    <button
                      onClick={() => onCancelTransfer(t.fileId)}
                      title="Annuler le transfert"
                      className="flex items-center gap-1 text-xs px-2.5 py-1 text-slate-300 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-md transition-colors font-medium"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Annuler
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar & Speed */}
              {t.status === 'transferring' && (
                <div className="space-y-2 mt-3">
                  {/* Primary Progress (Real network delivery to Client) */}
                  <div className="flex justify-between text-xs text-slate-300 font-mono">
                    <span className="font-medium text-sky-400">
                      {isSend ? `Reçu par ${t.peerName}: ${percent}%` : `Téléchargé: ${percent}%`} ({formatBytes(t.bytesTransferred)})
                    </span>
                    <span>{formatSpeed(t.speedBytesPerSec)} • ETA {formatETA(t.etaSeconds)}</span>
                  </div>

                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* WebRTC Socket Buffer Status (Byte Queue) */}
                  {isSend && t.bufferedBytes !== undefined && t.bufferedBytes > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/40">
                      <span className="flex items-center gap-1 text-indigo-300 font-medium">
                        <Zap className="h-3 w-3 text-amber-400 animate-pulse" /> File d'attente WebRTC (Carte réseau) :
                      </span>
                      <span className="text-amber-300 font-mono font-medium">
                        {formatBytes(t.bufferedBytes)} en cours d'envoi
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Checksum Badge for Completed Transfers */}
              {t.status === 'completed' && t.checksumValidated && (
                <div className="mt-2 text-[11px] text-emerald-400/90 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Empreinte SHA-256 validée
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
