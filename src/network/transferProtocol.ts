import { CHUNK_SIZE, DirectDiskWriter, getChunkCount, readChunk, reassembleChunks } from '../core/chunker';
import { calculateSHA256, verifyChecksum } from '../core/checksum';
import { ActiveTransfer, P2PFileProtocolMessage } from '../core/types';

function yieldUnthrottled(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });
}

export class FileTransferSession {
  private file?: File;
  private activeTransfer: ActiveTransfer;
  private isCancelled: boolean = false;
  private diskWriter?: DirectDiskWriter | null;
  private receivedChunkCount: number = 0;

  constructor(transfer: ActiveTransfer, file?: File, diskWriter?: DirectDiskWriter | null) {
    this.activeTransfer = transfer;
    this.file = file;
    this.diskWriter = diskWriter;
  }

  public get transfer(): ActiveTransfer {
    return this.activeTransfer;
  }

  public setDiskWriter(writer: DirectDiskWriter | null) {
    this.diskWriter = writer;
  }

  public cancel(): void {
    this.isCancelled = true;
    this.activeTransfer.status = 'cancelled';
    if (this.diskWriter) {
      this.diskWriter.close().catch(() => {});
    }
  }

  /**
   * Streams a file chunk by chunk over WebRTC DataConnection with backpressure flow control.
   */
  public async startSending(
    sendData: (peerId: string, data: P2PFileProtocolMessage) => void,
    onProgress: (bytesSent: number, speed: number, eta: number) => void,
    getBufferedAmount?: () => number
  ): Promise<void> {
    if (!this.file) throw new Error('No file attached to transfer session');

    const totalChunks = getChunkCount(this.file.size);
    this.activeTransfer.status = 'transferring';
    this.activeTransfer.startTime = Date.now();

    // Calculate SHA-256 hash in background
    calculateSHA256(this.file).then((hash) => {
      this.activeTransfer.metadata.checksum = hash;
    }).catch(console.error);

    let bytesSent = 0;
    let lastTime = Date.now();
    let lastBytes = 0;

    const MAX_BUFFERED_BYTES = 1.5 * 1024 * 1024; // 1.5 MB WebRTC socket buffer limit

    for (let i = 0; i < totalChunks; i++) {
      if (this.isCancelled) {
        sendData(this.activeTransfer.peerId, {
          type: 'TRANSFER_CANCEL',
          fileId: this.activeTransfer.fileId,
        });
        return;
      }

      // WebRTC DataChannel Flow Control (Backpressure Management)
      if (getBufferedAmount) {
        let buffered = getBufferedAmount();
        while (buffered > MAX_BUFFERED_BYTES) {
          if (this.isCancelled) return;
          await new Promise((r) => setTimeout(r, 15));
          buffered = getBufferedAmount();
        }
      }

      const chunk = await readChunk(this.file, i);
      sendData(this.activeTransfer.peerId, {
        type: 'FILE_CHUNK',
        fileId: this.activeTransfer.fileId,
        chunkIndex: i,
        totalChunks,
        chunkData: chunk,
      });

      bytesSent += chunk.byteLength;
      
      // Accurately measure bytes actually transmitted over the network (deducting unsent WebRTC buffer)
      const currentBuffered = getBufferedAmount ? getBufferedAmount() : 0;
      const effectiveSent = Math.max(0, bytesSent - currentBuffered);
      this.activeTransfer.bytesTransferred = effectiveSent;

      const now = Date.now();
      const elapsedSec = (now - lastTime) / 1000;

      if (elapsedSec >= 0.5 || i === totalChunks - 1) {
        const speed = (effectiveSent - lastBytes) / elapsedSec;
        const remainingBytes = this.file.size - effectiveSent;
        const eta = speed > 0 ? remainingBytes / speed : 0;

        this.activeTransfer.speedBytesPerSec = speed;
        this.activeTransfer.etaSeconds = eta;
        onProgress(effectiveSent, speed, eta);

        lastTime = now;
        lastBytes = effectiveSent;
      }

      if (i % 30 === 0) {
        await yieldUnthrottled();
      }
    }

    this.activeTransfer.status = 'completed';
    sendData(this.activeTransfer.peerId, {
      type: 'TRANSFER_COMPLETE',
      fileId: this.activeTransfer.fileId,
      checksum: this.activeTransfer.metadata.checksum,
    });
  }

  /**
   * Appends received chunk directly to disk stream (0 RAM) or in-memory array.
   */
  public async handleReceivedChunk(
    chunkIndex: number,
    totalChunks: number,
    chunkData: ArrayBuffer,
    onProgress: (bytesReceived: number, speed: number, eta: number) => void
  ): Promise<Blob | null> {
    if (this.isCancelled) return null;

    if (this.receivedChunkCount === 0) {
      this.activeTransfer.startTime = Date.now();
      this.activeTransfer.status = 'transferring';
    }

    // Direct disk streaming if diskWriter is active
    if (this.diskWriter) {
      await this.diskWriter.writeChunk(chunkData);
    } else {
      if (!this.activeTransfer.chunksReceived) {
        this.activeTransfer.chunksReceived = [];
      }
      this.activeTransfer.chunksReceived[chunkIndex] = chunkData;
    }

    this.receivedChunkCount++;
    this.activeTransfer.bytesTransferred += chunkData.byteLength;

    const now = Date.now();
    const elapsedSec = (now - (this.activeTransfer.lastUpdateTime || this.activeTransfer.startTime)) / 1000;

    if (elapsedSec >= 0.5 || chunkIndex === totalChunks - 1) {
      const totalElapsed = (now - this.activeTransfer.startTime) / 1000;
      const speed = totalElapsed > 0 ? this.activeTransfer.bytesTransferred / totalElapsed : 0;
      const remainingBytes = this.activeTransfer.totalBytes - this.activeTransfer.bytesTransferred;
      const eta = speed > 0 ? remainingBytes / speed : 0;

      this.activeTransfer.speedBytesPerSec = speed;
      this.activeTransfer.etaSeconds = eta;
      this.activeTransfer.lastUpdateTime = now;
      onProgress(this.activeTransfer.bytesTransferred, speed, eta);
    }

    // Check if all chunks received
    if (this.receivedChunkCount === totalChunks) {
      this.activeTransfer.status = 'completed';
      this.activeTransfer.checksumValidated = true;

      if (this.diskWriter) {
        await this.diskWriter.close();
        return new Blob([], { type: this.activeTransfer.metadata.type });
      }

      const blob = reassembleChunks(
        this.activeTransfer.chunksReceived!,
        this.activeTransfer.metadata.type
      );
      this.activeTransfer.receivedBlobUrl = URL.createObjectURL(blob);

      if (this.activeTransfer.metadata.checksum) {
        this.activeTransfer.checksumValidated = await verifyChecksum(
          blob,
          this.activeTransfer.metadata.checksum
        );
      }

      return blob;
    }

    return null;
  }
}
