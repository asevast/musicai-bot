import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Page,
  Title,
  Cell,
  Caption,
  Badge,
  Button,
  List,
} from '@telegram-apps/telegram-ui';
import { apiClient } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import { useTracksStore } from '../store/tracks.store';
import type { TrackType, TrackStatus, Intensity } from '@musicai/shared-types';

interface TrackDetail {
  id: string;
  title: string;
  prompt: string;
  type: TrackType;
  status: TrackStatus;
  audioUrl?: string;
  parameters?: {
    bpm?: number;
    intensity?: Intensity;
    language?: string;
  };
  createdAt: string;
  duration?: number;
}

const typeLabels: Record<TrackType, string> = {
  full_song: 'Full Song',
  clip: 'Clip',
  instrumental: 'Instrumental',
};

const statusColors: Record<TrackStatus, string> = {
  queued: 'bg-gray-500',
  processing: 'bg-yellow-500',
  done: 'bg-green-500',
  failed: 'bg-red-500',
};

const statusLabels: Record<TrackStatus, string> = {
  queued: 'Queued',
  processing: 'Processing',
  done: 'Done',
  failed: 'Failed',
};

export function Track(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useTelegram();
  const setCurrentTrack = useTracksStore((state) => state.setCurrentTrack);
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrack = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const response = await apiClient
        .get(`tracks/${id}`)
        .json<TrackDetail>();
      setTrack(response);
      setCurrentTrack({
        id: response.id,
        title: response.title,
        status: response.status,
        audioUrl: response.audioUrl,
        duration: response.duration,
        createdAt: response.createdAt,
      });
    } catch {
      setError('Failed to load track');
    } finally {
      setIsLoading(false);
    }
  }, [id, setCurrentTrack]);

  useEffect(() => {
    void fetchTrack();
  }, [fetchTrack]);

  if (isLoading) {
    return (
      <Page>
        <div className="p-4">
          <Cell>Loading...</Cell>
        </div>
      </Page>
    );
  }

  if (error || !track) {
    return (
      <Page>
        <div className="p-4">
          <Cell>Failed to load track</Cell>
          <Button
            stretched
            mode="primary"
            onClick={() => void fetchTrack()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </Page>
    );
  }

  const createdDate = new Date(track.createdAt).toLocaleString();

  return (
    <Page>
      <div className="p-4 pb-20">
        <div className="flex items-center gap-2 mb-4">
          <Button
            size="s"
            mode="outline"
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </div>

        <div className="mb-4">
          <Title level="2" weight="1" className="mb-2">
            {track.title}
          </Title>
          <div className="flex gap-2 items-center">
            <Badge
              className={`${statusColors[track.status]} text-white px-2 py-0.5 rounded`}
            >
              {statusLabels[track.status]}
            </Badge>
            <Caption className="text-gray-500">{typeLabels[track.type]}</Caption>
          </div>
        </div>

        <List className="mb-6">
          <Cell multiline>
            <Caption className="text-gray-500">Prompt</Caption>
            <div className="mt-1">{track.prompt}</div>
          </Cell>

          {track.parameters && (
            <>
              {track.parameters.bpm && (
                <Cell
                  subtitle={<Caption className="text-gray-500">BPM</Caption>}
                >
                  {track.parameters.bpm}
                </Cell>
              )}
              {track.parameters.intensity && (
                <Cell
                  subtitle={<Caption className="text-gray-500">Intensity</Caption>}
                >
                  {track.parameters.intensity}
                </Cell>
              )}
              {track.parameters.language && (
                <Cell
                  subtitle={<Caption className="text-gray-500">Language</Caption>}
                >
                  {track.parameters.language}
                </Cell>
              )}
            </>
          )}

          <Cell
            subtitle={<Caption className="text-gray-500">Created</Caption>}
          >
            {createdDate}
          </Cell>
        </List>

        {track.status === 'done' && track.audioUrl && (
          <div className="mt-4">
            <Caption className="text-gray-500 mb-2 block">Audio Preview</Caption>
            <audio
              controls
              className="w-full"
              src={track.audioUrl}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {track.status === 'queued' && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <Caption className="text-gray-600">
              Your track is queued for generation. You will receive a notification when it is ready.
            </Caption>
          </div>
        )}

        {track.status === 'processing' && (
          <div className="mt-4 p-4 bg-yellow-50 rounded">
            <Caption className="text-yellow-700">
              Your track is being generated. This usually takes 1-3 minutes.
            </Caption>
          </div>
        )}

        {track.status === 'failed' && (
          <div className="mt-4 p-4 bg-red-50 rounded">
            <Caption className="text-red-700">
              Generation failed. Please try again or contact support if the issue persists.
            </Caption>
            <Button
              stretched
              mode="primary"
              onClick={() => navigate('/create')}
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    </Page>
  );
}
