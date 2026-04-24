import { create } from 'zustand';

export interface Track {
  id: string;
  title: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  type: string;
  audioUrl?: string;
  duration?: number;
  createdAt: string;
}

interface TracksState {
  tracks: Track[];
  currentTrack: Track | null;
  isLoading: boolean;
}

interface TracksActions {
  setTracks: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  setCurrentTrack: (track: Track | null) => void;
  setLoading: (isLoading: boolean) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
}

type TracksStore = TracksState & TracksActions;

export const useTracksStore = create<TracksStore>((set) => ({
  tracks: [],
  currentTrack: null,
  isLoading: false,

  setTracks: (tracks) => set({ tracks }),

  addTrack: (track) =>
    set((state) => ({
      tracks: [track, ...state.tracks],
    })),

  setCurrentTrack: (currentTrack) => set({ currentTrack }),

  setLoading: (isLoading) => set({ isLoading }),

  updateTrack: (id, updates) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      currentTrack:
        state.currentTrack?.id === id ? { ...state.currentTrack, ...updates } : state.currentTrack,
    })),
}));
