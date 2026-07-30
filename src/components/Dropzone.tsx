import React, { useRef, useState } from 'react';
import { UploadCloud, File, Users, User, ShieldCheck } from 'lucide-react';
import { formatBytes } from '../core/formatters';

interface ConnectedPeerInfo {
  id: string;
  name: string;
}

interface DropzoneProps {
  connectedPeers: ConnectedPeerInfo[];
  onFilesSelected: (files: File[], targetPeerId?: string) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  connectedPeers,
  onFilesSelected,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const target = selectedTarget === 'ALL' ? undefined : selectedTarget;
      onFilesSelected(files, target);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const target = selectedTarget === 'ALL' ? undefined : selectedTarget;
      onFilesSelected(files, target);
    }
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-6 shadow-2xl border border-slate-800/80">
      {/* Target Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-sky-400" />
          <h2 className="text-base font-semibold text-slate-100">Envoyer un fichier</h2>
        </div>

        {/* Recipient Target dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Destinataire :</span>
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-medium text-slate-200 px-3 py-1.5 focus:outline-none focus:border-sky-500 transition-colors"
          >
            <option value="ALL">Tous les pairs ({connectedPeers.length})</option>
            {connectedPeers.map((peer) => (
              <option key={peer.id} value={peer.id}>
                Directement à {peer.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-sky-400 bg-sky-500/10 scale-[1.01] shadow-xl shadow-sky-500/10'
            : 'border-slate-700/80 hover:border-sky-400/60 bg-slate-900/40 hover:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
            isDragOver ? 'bg-sky-400 text-slate-950' : 'bg-sky-500/20 text-sky-400'
          }`}>
            <UploadCloud className="h-8 w-8" />
          </div>

          <div>
            <p className="text-base font-medium text-slate-200">
              Déposez vos fichiers ici, ou{' '}
              <span className="text-sky-400 font-semibold underline underline-offset-4">parcourir</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Tous types de fichiers • Aucune limite de taille • Chiffrement direct P2P (SHA-256)
            </p>
          </div>

          <div className="flex items-center gap-4 mt-2 text-[11px] font-medium text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> WebRTC Direct
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-sky-400" /> {connectedPeers.length} pair(s) prêt(s)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
