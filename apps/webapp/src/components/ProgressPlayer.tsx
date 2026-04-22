import React, { useEffect } from 'react';
import { Caption, Progress } from '@telegram-apps/telegram-ui';
import { useTrackGeneration } from '../hooks/useTrackGeneration';

type TrackStatus = 'queued' | 'processing' | 'done' | 'failed';

interface ProgressPlayerProps {
  trackId: string;
  onComplete?: (gcsUrl: string) => void;
  onError?: () => void;
}

const statusLabels: Record<TrackStatus, string> = {
  queued: 'In Queue',
  processing: 'Generating...',
  done: 'Ready!',
  failed: 'Failed',
};

const statusColors: Record<TrackStatus, string> = {
  queued: 'bg-gray-500',
  processing: 'bg-yellow-500',
  done: 'bg-green-500',
  failed: 'bg-red-500',
};

export function ProgressPlayer({
  trackId,
  onComplete,
  onError,
}: ProgressPlayerProps): React.ReactElement {
  const { progress, isConnected, subscribe, unsubscribe } = useTrackGeneration();

  useEffect(() => {
    subscribe(trackId);
    return () => {
      unsubscribe();
    };
  }, [trackId, subscribe, unsubscribe]);

  useEffect(() => {
    if (progress?.status === 'done' && progress.gcsUrl) {
      onComplete?.(progress.gcsUrl);
    } else if (progress?.status === 'failed') {
      onError?.();
    }
  }, [progress, onComplete, onError]);

  if (!isConnected) {
    return (
      <div className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          <Caption>Connecting to server...</Caption>
        </div>
      </div>
    );
  }

  const currentStatus = progress?.status ?? 'queued';
  const progressValue = currentStatus === 'done' ? 100 : currentStatus === 'processing' ? 60 : 10;

  return (
    <div className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusColors[currentStatus]}`} />
          <Caption className="font-medium">{statusLabels[currentStatus]}</Caption>
        </div>
        {progress?.queuePos !== undefined && progress.queuePos > 0 && (
          <Caption className="text-gray-500">Queue position: {progress.queuePos}</Caption>
        )}
      </div>

      <Progress value={progressValue} />

      <div className="mt-2 flex items-center justify-between">
        {progress?.etaSec !== undefined && progress.etaSec > 0 && (
          <Caption className="text-gray-500">
            Estimated time: ~{Math.ceil(progress.etaSec / 60)} min
          </Caption>
        )}
        {currentStatus === 'done' && (
          <Caption className="text-green-600">Track ready!</Caption>
        )}
        {currentStatus === 'failed' && (
          <Caption className="text-red-500">Generation failed. Please try again.</Caption>
        )}
      </div>
    </div>
  );
}
