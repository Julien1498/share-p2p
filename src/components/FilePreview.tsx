import React, { useState, useEffect } from 'react';
import { X, Download, Eye, FileText, Image as ImageIcon, Video, Music, Code, Archive, File } from 'lucide-react';
import { formatBytes, getFileTypeCategory } from '../core/formatters';

interface FilePreviewProps {
  fileName: string;
  fileSize: number;
  fileType: string;
  blobUrl: string;
  onClose: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  fileName,
  fileSize,
  fileType,
  blobUrl,
  onClose,
}) => {
  const category = getFileTypeCategory(fileName, fileType);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (category === 'document' || category === 'code') {
      fetch(blobUrl)
        .then((res) => res.text())
        .then((text) => setTextContent(text.slice(0, 50000))) // Cap preview at 50KB
        .catch(console.error);
    }
  }, [blobUrl, category]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden border border-slate-700/80 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              {category === 'image' && <ImageIcon className="h-5 w-5" />}
              {category === 'video' && <Video className="h-5 w-5" />}
              {category === 'audio' && <Music className="h-5 w-5" />}
              {category === 'code' && <Code className="h-5 w-5" />}
              {category === 'document' && <FileText className="h-5 w-5" />}
              {category === 'archive' && <Archive className="h-5 w-5" />}
              {category === 'other' && <File className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-100 truncate">{fileName}</h3>
              <p className="text-xs text-slate-400">{formatBytes(fileSize)} • {fileType || 'Fichier'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={blobUrl}
              download={fileName}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors"
            >
              <Download className="h-4 w-4" />
              Télécharger
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-950/60">
          {category === 'image' && (
            <img src={blobUrl} alt={fileName} className="max-h-[70vh] object-contain rounded-lg shadow-xl" />
          )}

          {category === 'video' && (
            <video src={blobUrl} controls className="max-h-[70vh] w-full rounded-lg shadow-xl" />
          )}

          {category === 'audio' && (
            <div className="w-full max-w-md p-6 glass-card rounded-2xl text-center space-y-4">
              <div className="h-20 w-20 rounded-full bg-sky-500/20 text-sky-400 mx-auto flex items-center justify-center animate-pulse">
                <Music className="h-10 w-10" />
              </div>
              <audio src={blobUrl} controls className="w-full" />
            </div>
          )}

          {(category === 'document' || category === 'code') && textContent !== null && (
            <pre className="w-full h-full max-h-[65vh] overflow-auto p-4 bg-slate-900 font-mono text-xs text-slate-200 rounded-lg border border-slate-800 whitespace-pre-wrap">
              {textContent}
            </pre>
          )}

          {category === 'archive' || (category === 'other' && textContent === null) && (
            <div className="text-center p-8 text-slate-400 space-y-3">
              <File className="h-16 w-16 mx-auto text-slate-600" />
              <p className="text-sm">Aperçu direct non disponible pour ce type de fichier.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
