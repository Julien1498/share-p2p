import React from 'react';
import { ActiveTransfer } from '../core/types';
import { formatBytes, getFileTypeCategory } from '../core/formatters';
import { Check, X, File, Image, Video, Music, FileText, Code, Archive, ShieldCheck } from 'lucide-react';

interface OfferBannerProps {
  pendingOffers: ActiveTransfer[];
  onAccept: (fileId: string) => void;
  onReject: (fileId: string) => void;
}

export const OfferBanner: React.FC<OfferBannerProps> = ({
  pendingOffers,
  onAccept,
  onReject,
}) => {
  if (pendingOffers.length === 0) return null;

  return (
    <div className="w-full space-y-3 mb-6">
      {pendingOffers.map((offer) => {
        const category = getFileTypeCategory(offer.metadata.name, offer.metadata.type);

        return (
          <div
            key={offer.fileId}
            className="glass-panel border-2 border-sky-400/80 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-sky-500/20 bg-sky-950/40 animate-pulse-glow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
                {category === 'image' && <Image className="h-6 w-6" />}
                {category === 'video' && <Video className="h-6 w-6" />}
                {category === 'audio' && <Music className="h-6 w-6" />}
                {category === 'code' && <Code className="h-6 w-6" />}
                {category === 'document' && <FileText className="h-6 w-6" />}
                {category === 'archive' && <Archive className="h-6 w-6" />}
                {category === 'other' && <File className="h-6 w-6" />}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-300 uppercase tracking-wider bg-sky-500/20 px-2 py-0.5 rounded-md">
                    Offre de fichier
                  </span>
                  <span className="text-xs text-slate-400">De <strong className="text-slate-200">{offer.peerName}</strong></span>
                </div>
                <h4 className="text-base font-semibold text-slate-100 truncate mt-0.5">
                  {offer.metadata.name}
                </h4>
                <p className="text-xs text-slate-400">
                  {formatBytes(offer.metadata.size)} • P2P Direct
                </p>
              </div>
            </div>

            {/* Accept & Reject Actions */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
              <button
                onClick={() => onReject(offer.fileId)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-bold transition-all"
              >
                <X className="h-4 w-4" />
                Refuser
              </button>
              <button
                onClick={() => onAccept(offer.fileId)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-lg shadow-sky-500/25 transition-all hover:scale-105 active:scale-95"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                Accepter le fichier
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
