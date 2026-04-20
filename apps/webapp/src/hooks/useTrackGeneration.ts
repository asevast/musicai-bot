import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useTelegram } from './useTelegram';

type TrackStatus = 'queued' | 'processing' | 'done' | 'failed';

interface TrackProgressEvent {
  userId: string;
  trackId: string;
  status: TrackStatus;
  queuePos?: number;
  etaSec?: number;
  gcsUrl?: string;
}

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ProgressState {
  trackId: string;
  status: TrackStatus;
  queuePos?: number;
  etaSec?: number;
  gcsUrl?: string;
}

interface UseTrackGenerationReturn {
  progress: ProgressState | null;
  isConnected: boolean;
  subscribe: (trackId: string) => void;
  unsubscribe: () => void;
}

export function useTrackGeneration(): UseTrackGenerationReturn {
  const { initDataRaw } = useTelegram();
  const socketRef = useRef<Socket | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!initDataRaw) return;

    const socket = io(`${VITE_API_URL}/tracks`, {
      extraHeaders: {
        'X-Telegram-Init-Data': initDataRaw,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[useTrackGeneration] Connected to WebSocket');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[useTrackGeneration] Disconnected from WebSocket');
      setIsConnected(false);
    });

    socket.on('track:progress', (event: TrackProgressEvent) => {
      console.log('[useTrackGeneration] Progress event:', event);
      setProgress({
        trackId: event.trackId,
        status: event.status,
        queuePos: event.queuePos,
        etaSec: event.etaSec,
        gcsUrl: event.gcsUrl,
      });
    });

    socket.on('error', (error: { message: string }) => {
      console.error('[useTrackGeneration] Socket error:', error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [initDataRaw]);

  const subscribe = useCallback((trackId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', { trackId });
    }
  }, []);

  const unsubscribe = useCallback(() => {
    setProgress(null);
  }, []);

  return {
    progress,
    isConnected,
    subscribe,
    unsubscribe,
  };
}
