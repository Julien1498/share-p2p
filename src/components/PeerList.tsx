import React from 'react';
import { Users, Wifi, ShieldCheck, Crown, User } from 'lucide-react';

interface ConnectedPeer {
  id: string;
  name: string;
  isHost?: boolean;
}

interface PeerListProps {
  myPeerId: string;
  myPeerName: string;
  peers: ConnectedPeer[];
}

export const PeerList: React.FC<PeerListProps> = ({
  myPeerId,
  myPeerName,
  peers,
}) => {
  return (
    <div className="w-full glass-panel rounded-2xl p-5 shadow-xl border border-slate-800/80">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800/60">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Users className="h-4 w-4 text-sky-400" />
          Pairs connectés ({peers.length + 1})
        </h3>
        <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
          <Wifi className="h-3 w-3" /> P2P En direct
        </span>
      </div>

      <div className="space-y-2">
        {/* Myself */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                {myPeerName} <span className="text-[10px] text-sky-400 font-normal">(Vous)</span>
              </p>
              <p className="text-[10px] text-slate-400 font-mono">ID: {myPeerId.substring(0, 8)}...</p>
            </div>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
        </div>

        {/* Remote Peers */}
        {peers.map((peer) => (
          <div
            key={peer.id}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                {peer.isHost ? <Crown className="h-4 w-4 text-amber-400" /> : <User className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">{peer.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">ID: {peer.id.substring(0, 8)}...</p>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
        ))}
      </div>
    </div>
  );
};
