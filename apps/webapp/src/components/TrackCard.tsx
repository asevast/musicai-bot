import React from 'react';
import { Cell, Caption, Badge } from '@telegram-apps/telegram-ui';
import { Link } from 'react-router';
import type { Track } from '../store/tracks.store';
import type { TrackType } from '@musicai/shared-types';

interface TrackCardProps {
  track: Track;
}

const typeLabels: Record<TrackType, string> = {
  full_song: 'Full Song',
  clip: 'Clip',
  instrumental: 'Instrumental',
};

const statusColors: Record<Track['status'], string> = {
  queued: 'bg-gray-500',
  processing: 'bg-yellow-500',
  done: 'bg-green-500',
  failed: 'bg-red-500',
};

export function TrackCard({ track }: TrackCardProps): React.ReactElement {
  const createdDate = new Date(track.createdAt).toLocaleDateString();

  return (
    <Link to={`/track/${track.id}`} className="block no-underline">
      <Cell
        multiline
        subtitle={
          <div className="flex gap-2 items-center">
            <Caption className="text-gray-500">{createdDate}</Caption>
            <Badge
              type="number"
              className={`${statusColors[track.status]} text-white text-xs px-2 py-0.5 rounded`}
            >
              {track.status}
            </Badge>
          </div>
        }
      >
        <div className="font-medium line-clamp-2">{track.title}</div>
        <Caption className="text-gray-500">{typeLabels[track.type as TrackType]}</Caption>
      </Cell>
    </Link>
  );
}
