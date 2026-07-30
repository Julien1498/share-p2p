import React, { useState } from 'react';
import { ReceivedFileItem } from '../hooks/useFileTransfer';
import { formatBytes, getFileTypeCategory } from '../core/formatters';
import { Download, Eye, ShieldCheck, Image, Video, Music, FileText, Code, Archive, File } from 'lucide-react';
import { FilePreview } from './FilePreview';

interface ReceivedFilesProps {
  files: ReceivedFileItem[];
}

export const ReceivedFiles: React.FC<ReceivedFilesProps> = ({ files }) => {
  const [previewFile, setPreviewFile] = useState<ReceivedFileItem | null>(null);

  if (files.length === 0) return null;

  return (
    <div className="w-full glass-panel rounded-2xl p-6 shadow-xl border border-slate-800/80">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Download className="h-5 w-5 text-emerald-400" />
          Fichiers reçus ({files.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {files.map((file) => {
          const category = getFileTypeCategory(file.name, file.type);

          return (
            <div
              key={file.id}
              className="glass-card rounded-xl p-4 flex flex-col justify-between gap-3 group transition-all duration-200 hover:scale-[1.01]"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
                  {category === 'image' && <Image className="h-5 w-5" />}
                  {category === 'video' && <Video className="h-5 w-5" />}
                  {category === 'audio' && <Music className="h-5 w-5" />}
                  {category === 'code' && <Code className="h-5 w-5" />}
                  {category === 'document' && <FileText className="h-5 w-5" />}
                  {category === 'archive' && <Archive className="h-5 w-5" />}
                  {category === 'other' && <File className="h-5 w-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-sky-300 transition-colors">
                    {file.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    De <span className="text-slate-300 font-medium">{file.senderName}</span> • {formatBytes(file.size)}
                  </p>
                  {file.checksumValidated && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium mt-1">
                      <ShieldCheck className="h-3 w-3" /> Intègre (SHA-256)
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                <button
                  onClick={() => setPreviewFile(file)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Aperçu
                </button>
                <a
                  href={file.blobUrl}
                  download={file.name}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Télécharger
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <FilePreview
          fileName={previewFile.name}
          fileSize={previewFile.size}
          fileType={previewFile.type}
          blobUrl={previewFile.blobUrl}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};
