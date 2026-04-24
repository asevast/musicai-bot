import React from 'react';
import { Link } from 'react-router';
import { PlayIcon } from '../components/icons';

interface TrackItem {
  id: string;
  emoji: string;
  name: string;
  genre: string;
  duration: string;
  timeAgo: string;
}

const recentTracks: TrackItem[] = [
  {
    id: '1',
    emoji: '🎸',
    name: 'Summer Drive',
    genre: 'Pop',
    duration: '3:02',
    timeAgo: 'только что',
  },
  {
    id: '2',
    emoji: '🌙',
    name: 'Midnight Chill',
    genre: 'Lo-fi',
    duration: '2:30',
    timeAgo: 'вчера',
  },
  {
    id: '3',
    emoji: '🔥',
    name: 'Epic Cinematic',
    genre: 'Orchestral',
    duration: '3:04',
    timeAgo: '2 дня назад',
  },
];

export function Home(): React.ReactElement {
  return (
    <div className="min-h-screen pb-20">
      <div className="p-4 max-w-md mx-auto">
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-[#5B5FC7] to-[#8B5CF6] rounded-2xl p-4 text-white mb-4">
          <h1 className="text-lg font-medium mb-1">Создать трек</h1>
          <p className="text-xs text-white/80 mb-3">Google Lyria 3 · до 3 минут</p>

          {/* Credits Pill */}
          <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
            <span className="text-xs font-medium">80 кредитов</span>
          </div>

          {/* CTA Button */}
          <Link
            to="/create"
            className="block w-full bg-white text-[#5B5FC7] rounded-xl py-2.5 text-sm font-medium text-center mt-3 transition-transform active:scale-[0.98]"
          >
            + Новый трек
          </Link>
        </div>

        {/* Recent Tracks Section */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-900">Недавние</h2>
            <Link to="/library" className="text-xs text-[#5B5FC7] font-medium">
              Все
            </Link>
          </div>

          {/* Track List */}
          <div className="space-y-1">
            {recentTracks.map((track) => (
              <Link
                key={track.id}
                to={`/track/${track.id}`}
                className="flex items-center gap-3 py-2 transition-colors"
              >
                {/* Emoji Cover */}
                <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center text-lg flex-shrink-0">
                  {track.emoji}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{track.name}</p>
                  <p className="text-xs text-gray-400">
                    {track.genre} · {track.duration} · {track.timeAgo}
                  </p>
                </div>

                {/* Play Button */}
                <button
                  type="button"
                  className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 transition-transform active:scale-95"
                >
                  <PlayIcon className="w-2.5 h-2.5 fill-gray-600 ml-0.5" />
                </button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
