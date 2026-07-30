import { useState, useCallback, useRef, useEffect } from 'react';
import { ActiveTransfer, FileMetadata, P2PFileProtocolMessage, RoomMember } from '../core/types';
import { FileTransferSession } from '../network/transferProtocol';
import { createDirectDiskWriter, createNativeChromeDownloadWriter } from '../core/chunker';

export interface ReceivedFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  blobUrl: string;
  senderName: string;
  receivedAt: number;
  checksumValidated: boolean;
}

export function useFileTransfer(
  peerManager: any,
  myPeerId: string,
  myPeerName: string,
  isHost: boolean
) {
  const [transfers, setTransfers] = useState<ActiveTransfer[]>([]);
  const [pendingOffers, setPendingOffers] = useState<ActiveTransfer[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFileItem[]>([]);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);

  const sessionsRef = useRef<Map<string, { session: FileTransferSession; file?: File }>>(new Map());
  const membersMapRef = useRef<Map<string, RoomMember>>(new Map());

  // Prevent browser tab and screen from sleeping during active file transfers
  useEffect(() => {
    const hasActiveTransfers = transfers.some((t) => t.status === 'transferring');
    let wakeLockSentinel: any = null;

    if (hasActiveTransfers && typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').then((lock: any) => {
        wakeLockSentinel = lock;
      }).catch(() => {});
    }

    return () => {
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [transfers]);

  // Targeted packet routing across PeerJS connections
  const sendP2PData = useCallback(
    (targetPeerId: string | undefined, data: P2PFileProtocolMessage) => {
      if (!peerManager) return;
      const packet = {
        type: 'FILE_TRANSFER_PACKET',
        senderPeerId: myPeerId,
        targetPeerId: targetPeerId || 'ALL',
        data,
      };

      if (isHost) {
        if (targetPeerId && targetPeerId !== 'ALL') {
          const conn = peerManager.connections?.get(targetPeerId);
          if (conn && conn.open) {
            conn.send(packet);
          } else {
            peerManager.broadcast(packet);
          }
        } else {
          peerManager.broadcast(packet);
        }
      } else {
        peerManager.sendToHost('FILE_TRANSFER_PACKET', packet);
      }
    },
    [peerManager, myPeerId, isHost]
  );

  const updateTransferState = useCallback((fileId: string, patch: Partial<ActiveTransfer>) => {
    setTransfers((prev) =>
      prev.map((t) => (t.fileId === fileId ? { ...t, ...patch } : t))
    );
  }, []);

  // Handle incoming protocol messages
  const handleP2PMessage = useCallback(
    async (fromPeerId: string, msg: P2PFileProtocolMessage) => {
      if (!msg || !msg.type || !msg.fileId) return;
      const { type, fileId, metadata, chunkIndex, totalChunks, chunkData, reason } = msg;

      if (type === 'FILE_OFFER' && metadata) {
        const activeTransfer: ActiveTransfer = {
          fileId,
          metadata,
          direction: 'receive',
          peerId: fromPeerId,
          peerName: metadata.senderName || fromPeerId.substring(0, 6),
          bytesTransferred: 0,
          totalBytes: metadata.size,
          status: 'offered',
          speedBytesPerSec: 0,
          etaSeconds: 0,
          startTime: Date.now(),
          lastUpdateTime: Date.now(),
        };

        const session = new FileTransferSession(activeTransfer);
        sessionsRef.current.set(fileId, { session });
        setPendingOffers((prev) => [activeTransfer, ...prev]);
      } else if (type === 'FILE_ACCEPT') {
        const item = sessionsRef.current.get(fileId);
        if (item && item.session) {
          updateTransferState(fileId, { status: 'transferring' });

          const getBufferedAmount = () => {
            const targetPeer = item.session.transfer.peerId;
            const conn = peerManager?.connections?.get(targetPeer);
            const dc = conn?.dataChannel || conn?._dc;
            return dc?.bufferedAmount || 0;
          };

          item.session
            .startSending(
              (targetId, data) => sendP2PData(targetId, data),
              (bytesSent, speed, eta, rawSent, buffered) => {
                updateTransferState(fileId, {
                  bytesTransferred: bytesSent,
                  rawBytesSent: rawSent,
                  bufferedBytes: buffered,
                  speedBytesPerSec: speed,
                  etaSeconds: eta,
                  status: 'transferring',
                });
              },
              getBufferedAmount
            )
            .then(() => {
              updateTransferState(fileId, { status: 'completed' });
            })
            .catch((err) => {
              updateTransferState(fileId, { status: 'failed', error: err.message });
            });
        }
      } else if (type === 'FILE_REJECT') {
        const item = sessionsRef.current.get(fileId);
        if (item) {
          item.session.cancel();
          updateTransferState(fileId, { status: 'rejected', error: reason || 'Transfert refusé par le destinataire' });
        }
      } else if (type === 'FILE_CHUNK' && chunkData && chunkIndex !== undefined && totalChunks !== undefined) {
        const item = sessionsRef.current.get(fileId);
        if (item && item.session) {
          const blob = await item.session.handleReceivedChunk(
            chunkIndex,
            totalChunks,
            chunkData,
            (bytesReceived, speed, eta) => {
              updateTransferState(fileId, {
                bytesTransferred: bytesReceived,
                speedBytesPerSec: speed,
                etaSeconds: eta,
              });
            }
          );

          if (blob) {
            updateTransferState(fileId, {
              status: 'completed',
              checksumValidated: item.session.transfer.checksumValidated,
            });

            if (item.session.transfer.receivedBlobUrl) {
              const newReceivedFile: ReceivedFileItem = {
                id: fileId,
                name: item.session.transfer.metadata.name,
                size: item.session.transfer.metadata.size,
                type: item.session.transfer.metadata.type,
                blobUrl: item.session.transfer.receivedBlobUrl,
                senderName: item.session.transfer.peerName,
                receivedAt: Date.now(),
                checksumValidated: !!item.session.transfer.checksumValidated,
              };

              setReceivedFiles((prev) => [newReceivedFile, ...prev]);
            }
          }
        }
      } else if (type === 'TRANSFER_CANCEL') {
        const item = sessionsRef.current.get(fileId);
        if (item) {
          item.session.cancel();
          updateTransferState(fileId, {
            status: 'cancelled',
            cancelReason: reason || 'Annulé par l\'autre utilisateur',
          });
        }
      }
    },
    [sendP2PData, updateTransferState, peerManager]
  );

  // Accept a pending file offer (triggers Chrome Native Download Bar Stream Bridge or Firefox Blob Accumulator)
  const acceptOffer = useCallback(
    async (fileId: string) => {
      const offer = pendingOffers.find((o) => o.fileId === fileId);
      if (!offer) return;

      const item = sessionsRef.current.get(fileId);
      if (item && item.session) {
        let writer = await createNativeChromeDownloadWriter(
          offer.metadata.name,
          offer.metadata.size,
          offer.metadata.type
        );

        if (!writer) {
          writer = await createDirectDiskWriter(offer.metadata.name);
        }

        if (writer) {
          item.session.setDiskWriter(writer);
        }
      }

      setPendingOffers((prev) => prev.filter((o) => o.fileId !== fileId));
      setTransfers((prev) => [{ ...offer, status: 'transferring' }, ...prev]);

      sendP2PData(offer.peerId, {
        type: 'FILE_ACCEPT',
        fileId,
      });
    },
    [pendingOffers, sendP2PData]
  );

  // Reject a pending file offer
  const rejectOffer = useCallback(
    (fileId: string) => {
      const offer = pendingOffers.find((o) => o.fileId === fileId);
      if (!offer) return;

      setPendingOffers((prev) => prev.filter((o) => o.fileId !== fileId));

      sendP2PData(offer.peerId, {
        type: 'FILE_REJECT',
        fileId,
        reason: 'Refusé par l\'utilisateur',
      });
    },
    [pendingOffers, sendP2PData]
  );

  // Register PeerJS network handlers
  useEffect(() => {
    if (!peerManager || !myPeerId) return;

    const processPacket = (packet: any) => {
      if (!packet) return;

      if (packet.type === 'PEER_INFO_ANNOUNCE' && isHost) {
        membersMapRef.current.set(packet.peerId, {
          id: packet.peerId,
          name: packet.name,
          avatar: '👤',
          isHost: false,
        });
        const currentList = Array.from(membersMapRef.current.values());
        setRoomMembers(currentList);
        peerManager.broadcast({ type: 'ROOM_MEMBERS_SYNC', members: currentList });
        return;
      }

      if (packet.type === 'ROOM_MEMBERS_SYNC') {
        setRoomMembers(packet.members || []);
        return;
      }

      if (packet.type === 'FILE_TRANSFER_PACKET' && packet.data) {
        const { senderPeerId, targetPeerId, data } = packet;
        if (senderPeerId === myPeerId) return;

        if (targetPeerId === 'ALL' || targetPeerId === myPeerId) {
          handleP2PMessage(senderPeerId, data);
        }

        if (isHost && targetPeerId !== 'ALL' && targetPeerId !== myPeerId) {
          const conn = peerManager.connections?.get(targetPeerId);
          if (conn && conn.open) {
            conn.send(packet);
          } else {
            peerManager.broadcast(packet, senderPeerId);
          }
        }
      }
    };

    if (isHost) {
      const prevHostHandler = peerManager.hostActionHandler;
      peerManager.hostActionHandler = (fromPeerId: string, msg: any) => {
        if (prevHostHandler) prevHostHandler(fromPeerId, msg);
        processPacket(msg);
      };
    } else {
      const prevCustomHandler = peerManager.onCustomMessage;
      peerManager.onCustomMessage = (msg: any) => {
        if (prevCustomHandler) prevCustomHandler(msg);
        processPacket(msg);
      };
      peerManager.sendToHost('PEER_INFO_ANNOUNCE', { peerId: myPeerId, name: myPeerName });
    }
  }, [peerManager, myPeerId, myPeerName, isHost, handleP2PMessage]);

  // Host member management
  useEffect(() => {
    if (!peerManager || !isHost || !myPeerId) return;

    membersMapRef.current.set(myPeerId, {
      id: myPeerId,
      name: myPeerName,
      avatar: '👑',
      isHost: true,
    });
    setRoomMembers(Array.from(membersMapRef.current.values()));

    const prevPeerStatus = peerManager.onPeerStatusChange;
    peerManager.onPeerStatusChange = (peerId: string, status: 'CONNECTED' | 'DISCONNECTED') => {
      if (prevPeerStatus) prevPeerStatus(peerId, status);
      if (status === 'DISCONNECTED') {
        membersMapRef.current.delete(peerId);
        const updated = Array.from(membersMapRef.current.values());
        setRoomMembers(updated);
        peerManager.broadcast({ type: 'ROOM_MEMBERS_SYNC', members: updated });
      }
    };

    return () => {
      peerManager.onPeerStatusChange = prevPeerStatus;
    };
  }, [peerManager, isHost, myPeerId, myPeerName]);

  // Offer file to peer(s)
  const offerFile = useCallback(
    async (file: File, targetPeerId?: string) => {
      const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const metadata: FileMetadata = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        lastModified: file.lastModified,
        senderId: myPeerId,
        senderName: myPeerName,
        targetId: targetPeerId,
      };

      const targetPeers = targetPeerId
        ? [targetPeerId]
        : roomMembers.filter((m) => m.id !== myPeerId).map((m) => m.id);

      if (targetPeers.length === 0) {
        alert('Aucun autre pair connecté dans le salon pour recevoir le fichier.');
        return;
      }

      targetPeers.forEach((peerId: string) => {
        const transferKey = `${fileId}_${peerId}`;
        const targetMember = roomMembers.find((m) => m.id === peerId);
        const activeTransfer: ActiveTransfer = {
          fileId: transferKey,
          metadata,
          direction: 'send',
          peerId,
          peerName: targetMember?.name || peerId.substring(0, 6),
          bytesTransferred: 0,
          totalBytes: file.size,
          status: 'offered',
          speedBytesPerSec: 0,
          etaSeconds: 0,
          startTime: Date.now(),
          lastUpdateTime: Date.now(),
        };

        const session = new FileTransferSession(activeTransfer, file);
        sessionsRef.current.set(transferKey, { session, file });
        setTransfers((prev) => [activeTransfer, ...prev]);

        sendP2PData(peerId, {
          type: 'FILE_OFFER',
          fileId: transferKey,
          metadata,
        });
      });
    },
    [myPeerId, myPeerName, roomMembers, sendP2PData]
  );

  const cancelTransfer = useCallback(
    (fileId: string) => {
      const item = sessionsRef.current.get(fileId);
      if (item) {
        item.session.cancel();
        const isSend = item.session.transfer.direction === 'send';
        const selfReason = isSend ? "Annulé par vous (Expéditeur)" : "Annulé par vous (Destinataire)";
        const remoteReason = isSend
          ? `Annulé par l'expéditeur (${myPeerName})`
          : `Annulé par le destinataire (${myPeerName})`;

        updateTransferState(fileId, { status: 'cancelled', cancelReason: selfReason });
        sendP2PData(item.session.transfer.peerId, {
          type: 'TRANSFER_CANCEL',
          fileId,
          reason: remoteReason,
        });
      }
    },
    [myPeerName, sendP2PData, updateTransferState]
  );

  return {
    transfers,
    pendingOffers,
    receivedFiles,
    roomMembers,
    offerFile,
    acceptOffer,
    rejectOffer,
    cancelTransfer,
  };
}
