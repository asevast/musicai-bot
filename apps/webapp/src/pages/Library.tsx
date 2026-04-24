import React, { useState, useEffect, useCallback } from 'react';
import { Title, Button } from '@telegram-apps/telegram-ui';
import { TrackGrid } from '../components/TrackGrid';
import { apiClient } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import type { Track } from '../store/tracks.store';

interface TracksResponse {
  tracks: Track[];
  total: number;
}

const LIMIT = 20;

export function Library(): React.ReactElement {
  const { user } = useTelegram();
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [publicTracks, setPublicTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [myOffset, setMyOffset] = useState(0);
  const [publicOffset, setPublicOffset] = useState(0);
  const [myTotal, setMyTotal] = useState(0);
  const [publicTotal, setPublicTotal] = useState(0);

  const fetchMyTracks = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const response = await apiClient
        .get(`tracks/user/${user.id}?limit=${LIMIT}&offset=${myOffset}`)
        .json<TracksResponse>();
      setMyTracks((prev) => (myOffset === 0 ? response.tracks : [...prev, ...response.tracks]));
      setMyTotal(response.total);
    } catch {
      setMyTracks([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, myOffset]);

  const fetchPublicTracks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient
        .get(`tracks/public?limit=${LIMIT}&offset=${publicOffset}`)
        .json<TracksResponse>();
      setPublicTracks((prev) =>
        publicOffset === 0 ? response.tracks : [...prev, ...response.tracks]
      );
      setPublicTotal(response.total);
    } catch {
      setPublicTracks([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicOffset]);

  useEffect(() => {
    void fetchMyTracks();
  }, [fetchMyTracks]);

  useEffect(() => {
    void fetchPublicTracks();
  }, [fetchPublicTracks]);

  const handleLoadMoreMy = useCallback(() => {
    setMyOffset((prev) => prev + LIMIT);
  }, []);

  const handleLoadMorePublic = useCallback(() => {
    setPublicOffset((prev) => prev + LIMIT);
  }, []);

  const tracks = activeTab === 'my' ? myTracks : publicTracks;
  const total = activeTab === 'my' ? myTotal : publicTotal;
  const offset = activeTab === 'my' ? myOffset : publicOffset;
  const hasMore = offset + tracks.length < total;
  const loadMore = activeTab === 'my' ? handleLoadMoreMy : handleLoadMorePublic;
  const emptyMessage = activeTab === 'my' ? 'No tracks yet' : 'No public tracks available';

  return (
    <div className="page">
      <div className="p-4 pb-20">
        <Title level="2" weight="1" className="mb-4">
          Library
        </Title>

        <div className="flex gap-2 mb-4">
          <Button
            size="s"
            mode={activeTab === 'my' ? 'filled' : 'outline'}
            onClick={() => setActiveTab('my')}
          >
            My Tracks
          </Button>
          <Button
            size="s"
            mode={activeTab === 'public' ? 'filled' : 'outline'}
            onClick={() => setActiveTab('public')}
          >
            Public
          </Button>
        </div>

        <TrackGrid
          tracks={tracks}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          emptyMessage={emptyMessage}
        />
      </div>
    </div>
  );
}
