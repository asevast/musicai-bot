import { describe, it, expect, beforeEach } from 'vitest';
import { useTracksStore, Track } from '../../store/tracks.store';

const mockTrack: Track = {
  id: 'track-1',
  title: 'Test Track',
  status: 'queued',
  type: 'full_song',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockTrack2: Track = {
  id: 'track-2',
  title: 'Another Track',
  status: 'done',
  type: 'clip',
  audioUrl: 'https://example.com/audio.mp3',
  duration: 180,
  createdAt: '2024-01-02T00:00:00Z',
};

describe('Tracks Store', () => {
  beforeEach(() => {
    useTracksStore.getState().setTracks([]);
    useTracksStore.getState().setCurrentTrack(null);
    useTracksStore.getState().setLoading(false);
  });

  it('should have correct initial state', () => {
    const state = useTracksStore.getState();
    expect(state.tracks).toEqual([]);
    expect(state.currentTrack).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('should set tracks', () => {
    useTracksStore.getState().setTracks([mockTrack, mockTrack2]);
    expect(useTracksStore.getState().tracks).toHaveLength(2);
  });

  it('should add track to beginning', () => {
    useTracksStore.getState().setTracks([mockTrack]);
    useTracksStore.getState().addTrack(mockTrack2);
    expect(useTracksStore.getState().tracks[0].id).toBe('track-2');
  });

  it('should set current track', () => {
    useTracksStore.getState().setCurrentTrack(mockTrack);
    expect(useTracksStore.getState().currentTrack?.id).toBe('track-1');
  });

  it('should set loading state', () => {
    useTracksStore.getState().setLoading(true);
    expect(useTracksStore.getState().isLoading).toBe(true);
  });

  it('should update track by id', () => {
    useTracksStore.getState().setTracks([mockTrack]);
    useTracksStore.getState().updateTrack('track-1', { status: 'done' });
    expect(useTracksStore.getState().tracks[0].status).toBe('done');
  });

  it('should update currentTrack when matching', () => {
    useTracksStore.getState().setCurrentTrack(mockTrack);
    useTracksStore.getState().updateTrack('track-1', { status: 'processing' });
    expect(useTracksStore.getState().currentTrack?.status).toBe('processing');
  });

  it('should not affect other tracks when updating', () => {
    useTracksStore.getState().setTracks([mockTrack, mockTrack2]);
    useTracksStore.getState().updateTrack('track-1', { status: 'done' });
    expect(useTracksStore.getState().tracks[1].status).toBe('done');
  });
});
