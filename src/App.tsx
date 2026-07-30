import React, { useState, useEffect, useCallback } from 'react';
import { usePeer, P2PlayLobby } from 'p2play-core';
import { TextChatPanel } from 'p2play-core/chat';
import { extractRoomCodeFromUrl, syncRoomUrlToAddressBar, clearRoomUrlFromAddressBar } from 'p2play-core/url';
import { useFileTransfer } from './hooks/useFileTransfer';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { TransferList } from './components/TransferList';
import { ReceivedFiles } from './components/ReceivedFiles';
import { PeerList } from './components/PeerList';
import { QRCodeModal } from './components/QRCodeModal';
import { OfferBanner } from './components/OfferBanner';
import { MessageSquare, Shield, Zap, Sparkles } from 'lucide-react';

export default function App() {
  const [showQRCode, setShowQRCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'transfers' | 'chat'>('transfers');
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string }>({
    name: 'Utilisateur P2P',
    avatar: '⚡',
  });

  const peer = usePeer({
    namespacePrefix: 'sharep2p',
    playerName: userProfile.name,
    playerAvatar: userProfile.avatar,
  });

  const isJoined = peer.status === 'CONNECTED';
  const roomCode = peer.hostPeerId || '';
  const myPeerId = peer.myPeerId || '';

  const {
    transfers,
    pendingOffers,
    receivedFiles,
    roomMembers,
    offerFile,
    acceptOffer,
    rejectOffer,
    cancelTransfer,
  } = useFileTransfer(
    peer.peerManager,
    myPeerId,
    userProfile.name,
    peer.isHost
  );

  // Synchronize room URL in address bar when room is joined
  useEffect(() => {
    if (isJoined && roomCode) {
      syncRoomUrlToAddressBar(roomCode);
    }
  }, [isJoined, roomCode]);

  const handleLeaveRoom = useCallback(() => {
    clearRoomUrlFromAddressBar();
    peer.disconnect();
  }, [peer]);

  const handleFilesSelected = (files: File[], targetPeerId?: string) => {
    files.forEach((file) => offerFile(file, targetPeerId));
  };

  const handleHost = async (username: string, avatar: string) => {
    setUserProfile({ name: username, avatar });
    await peer.hostGame(null, { username, avatar });
  };

  const handleJoin = async (username: string, avatar: string, code: string) => {
    setUserProfile({ name: username, avatar });
    await peer.joinGame(code, { username, avatar });
  };

  // Render Lobby screen if not yet in a room
  if (!isJoined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-3 shadow-xl shadow-sky-500/20 mx-auto flex items-center justify-center animate-pulse-glow">
              <Zap className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-sky-400 via-indigo-200 to-white bg-clip-text text-transparent">
              ShareP2P
            </h1>
            <p className="text-sm text-slate-400">
              Transfert de fichiers ultra-rapide entre navigateurs sans serveur intermédiaire.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl shadow-2xl border border-slate-800">
            <P2PlayLobby
              title="ShareP2P"
              subtitle="Transfert P2P Direct"
              status={peer.status}
              error={peer.error}
              showVoiceToggle={false}
              onHost={handleHost}
              onJoin={handleJoin}
            />
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-400" /> WebRTC Direct
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-sky-400" /> Illimité & Privé
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Filter out self for recipient dropdown and remote peer list
  const remoteMembers = roomMembers.filter((m) => m.id !== myPeerId);

  // Format chat messages for TextChatPanel
  const formattedChatMessages = (peer.chatMessages || []).map((msg: any) => ({
    sender: msg.sender || msg.senderName || 'Anonyme',
    text: msg.text || msg.message || '',
    time: msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        roomCode={roomCode}
        peerId={myPeerId}
        peerName={userProfile.name}
        onOpenQRCode={() => setShowQRCode(true)}
        onLeaveRoom={handleLeaveRoom}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Pending File Offer Notification Banners */}
        <OfferBanner
          pendingOffers={pendingOffers}
          onAccept={acceptOffer}
          onReject={rejectOffer}
        />

        {/* Mobile Tabs */}
        <div className="flex lg:hidden rounded-xl bg-slate-900/90 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('transfers')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'transfers' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400'
            }`}
          >
            Fichiers & Transferts
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'chat' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat & Journal
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Dropzone, Active Transfers & Received Gallery */}
          <div className={`lg:col-span-2 space-y-6 ${activeTab === 'chat' ? 'hidden lg:block' : 'block'}`}>
            <Dropzone
              connectedPeers={remoteMembers}
              onFilesSelected={handleFilesSelected}
            />

            <TransferList
              transfers={transfers}
              onCancelTransfer={cancelTransfer}
            />

            <ReceivedFiles files={receivedFiles} />
          </div>

          {/* Sidebar Column: Peer List & Text Chat */}
          <div className={`space-y-6 ${activeTab === 'transfers' ? 'hidden lg:block' : 'block'}`}>
            <PeerList
              myPeerId={myPeerId}
              myPeerName={userProfile.name}
              peers={remoteMembers}
            />

            <div className="glass-panel rounded-2xl p-4 shadow-xl border border-slate-800/80 h-96 flex flex-col">
              <TextChatPanel
                messages={formattedChatMessages}
                onSend={(text) => peer.sendChat(userProfile.name, text)}
                title="Chat Salon"
              />
            </div>
          </div>
        </div>
      </main>

      {/* QR Code Modal */}
      {showQRCode && (
        <QRCodeModal
          roomCode={roomCode}
          onClose={() => setShowQRCode(false)}
        />
      )}
    </div>
  );
}
