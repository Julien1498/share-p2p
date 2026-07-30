export type TransferDirection = 'send' | 'receive';
export type TransferStatus = 'offered' | 'transferring' | 'completed' | 'failed' | 'cancelled' | 'rejected';

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  checksum?: string;
  senderId: string;
  senderName: string;
  targetId?: string;
}

export interface ActiveTransfer {
  fileId: string;
  metadata: FileMetadata;
  direction: TransferDirection;
  peerId: string;
  peerName: string;
  bytesTransferred: number; // Effective bytes delivered over network to client
  rawBytesSent?: number;    // Raw bytes loaded into local buffer
  bufferedBytes?: number;   // Current bytes waiting in local WebRTC socket buffer
  totalBytes: number;
  status: TransferStatus;
  speedBytesPerSec: number;
  etaSeconds: number;
  startTime: number;
  lastUpdateTime: number;
  chunksReceived?: ArrayBuffer[];
  receivedBlobUrl?: string;
  error?: string;
  cancelReason?: string;
  checksumValidated?: boolean;
}

export interface P2PFileProtocolMessage {
  type: 'FILE_OFFER' | 'FILE_ACCEPT' | 'FILE_REJECT' | 'FILE_CHUNK' | 'TRANSFER_COMPLETE' | 'TRANSFER_CANCEL' | 'FILE_PROGRESS';
  fileId: string;
  metadata?: FileMetadata;
  chunkIndex?: number;
  totalChunks?: number;
  chunkData?: ArrayBuffer;
  bytesReceived?: number;
  checksum?: string;
  reason?: string;
}

export interface RoomMember {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
}
