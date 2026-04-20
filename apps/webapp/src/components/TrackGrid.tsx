import { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Caption } from '@telegram-apps/telegram-ui';
import { TrackCard } from './TrackCard';
import type { Track } from '../store/tracks.store';

interface TrackGridProps {
  tracks: Track[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  emptyMessage?: string;
}

export function TrackGrid({
  tracks,
  isLoading,
  hasMore,
  onLoadMore,
  emptyMessage = 'No tracks yet',
}: TrackGridProps): JSX.Element {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasMore && !isLoading) {
        void onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });
    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersect]);

  if (tracks.length === 0 && !isLoading) {
    return (
      <div className="text-center py-8">
        <Caption className="text-gray-500">{emptyMessage}</Caption>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2">
        {tracks.map((track) => (
          <TrackCard key={track.id} track={track} />
        ))}
      </div>

      {hasMore && (
        <div ref={loadMoreRef} className="py-4 text-center">
          <Button
            size="s"
            mode="outline"
            onClick={onLoadMore}
            disabled={isLoading}
            loading={isLoading}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
