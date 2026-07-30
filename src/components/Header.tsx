import React, { useState } from 'react';
import { Copy, QrCode, LogOut, Check, Zap } from 'lucide-react';
import { copyRoomUrlToClipboard } from 'p2play-core/url';

interface HeaderProps {
  roomCode: string;
  peerId: string;
  peerName: string;
  onOpenQRCode: () => void;
  onLeaveRoom: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  peerName,
  onOpenQRCode,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const success = await copyRoomUrlToClipboard(roomCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-2 shadow-lg shadow-sky-500/20 flex items-center justify-center animate-pulse-glow">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 via-indigo-300 to-white bg-clip-text text-transparent">
              ShareP2P
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Transfert WebRTC direct & sécurisé
            </p>
          </div>
        </div>

        {/* Room Code and share actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Room Pill */}
          <div className="flex items-center bg-slate-900/90 border border-sky-500/30 rounded-lg px-3 py-1.5 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Salon</span>
              <span className="text-sm font-mono font-bold text-white tracking-widest">{roomCode}</span>
            </div>

            <button
              onClick={handleCopyLink}
              title="Copier le lien d'invitation"
              className="ml-3 p-1.5 rounded-md hover:bg-sky-500/20 text-sky-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>

            <button
              onClick={onOpenQRCode}
              title="Afficher le QR Code"
              className="p-1.5 rounded-md hover:bg-sky-500/20 text-sky-400 hover:text-white transition-colors"
            >
              <QrCode className="h-4 w-4" />
            </button>
          </div>

          {/* User Name Pill */}
          <div className="hidden md:flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-200">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{peerName}</span>
          </div>

          {/* Leave Button */}
          <button
            onClick={onLeaveRoom}
            title="Quitter le salon"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Quitter</span>
          </button>
        </div>
      </div>
    </header>
  );
};
