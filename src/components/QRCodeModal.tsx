import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Smartphone } from 'lucide-react';
import { buildRoomUrl, copyRoomUrlToClipboard } from 'p2play-core/url';

interface QRCodeModalProps {
  roomCode: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ roomCode, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const shareUrl = buildRoomUrl(roomCode);

  const handleCopy = async () => {
    const success = await copyRoomUrlToClipboard(roomCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl border border-slate-700/80 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-400">
            <Smartphone className="h-5 w-5" />
            <h3 className="text-base font-semibold text-slate-100">Scanner pour rejoindre</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* QR Code Canvas Card */}
        <div className="bg-white p-4 rounded-xl inline-block shadow-inner mx-auto border-4 border-slate-800">
          <QRCodeSVG value={shareUrl} size={200} level="M" />
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-2">Code du salon :</p>
          <div className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono font-bold text-lg text-sky-400 tracking-widest">
            {roomCode}
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-sky-500/20"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-950" />
              Lien copié dans le presse-papier !
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copier le lien d'invitation
            </>
          )}
        </button>
      </div>
    </div>
  );
};
