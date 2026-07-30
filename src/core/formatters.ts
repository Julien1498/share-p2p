/**
 * Formats a byte count into a human-readable string (B, KB, MB, GB, TB).
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${val} ${sizes[i] || 'B'}`;
}

/**
 * Formats a speed in bytes per second to Mo/s or Ko/s.
 */
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '0 Mo/s';
  return `${formatBytes(bytesPerSec)}/s`;
}

/**
 * Formats estimated time remaining in seconds into formatted string (ex: "1m 24s").
 */
export function formatETA(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return 'Calcul...';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

/**
 * Determines file icon type category from MIME type / extension.
 */
export function getFileTypeCategory(name: string, type: string): 'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'other' {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (type.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return 'video';
  if (type.startsWith('audio/') || ['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) return 'audio';
  if (type.startsWith('text/') || ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'txt', 'csv'].includes(ext)) return 'document';
  if (['zip', 'tar', 'gz', '7z', 'rar', 'iso'].includes(ext)) return 'archive';
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'cpp', 'rs', 'go'].includes(ext)) return 'code';
  return 'other';
}
