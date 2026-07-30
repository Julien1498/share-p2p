import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { PeerManagerLike } from 'p2play-core';
import App from './App';
import './index.css';

export function mount(
  element: HTMLElement,
  options: {
    peerId: string;
    playerName?: string;
    playerAvatar?: string;
    externalPeerManager?: PeerManagerLike;
    isEmbedded?: boolean;
    onExit?: () => void;
  }
) {
  const styleId = 'game-style-sharep2p';
  if (!document.getElementById(styleId)) {
    const link = document.createElement('link');
    link.id = styleId;
    link.rel = 'stylesheet';
    link.href = '/games/sharep2p/style.css';
    document.head.appendChild(link);
  }

  const root = createRoot(element);
  root.render(
    <StrictMode>
      <App
        isEmbedded={true}
        externalPeerManager={options.externalPeerManager}
        onExit={options.onExit}
        playerName={options.playerName}
        playerAvatar={options.playerAvatar}
      />
    </StrictMode>
  );
  return () => root.unmount();
}

(window as any).mountSharep2p = mount;
(window as any).mountShareP2P = mount;

const rootEl = document.getElementById('root');
if (import.meta.env.MODE !== 'lib' && rootEl && rootEl.children.length === 0) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
