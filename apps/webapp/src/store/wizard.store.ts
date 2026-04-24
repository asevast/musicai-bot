import { create } from 'zustand';

export type TrackType = 'full_song' | 'clip' | 'instrumental' | 'variants';
export type Intensity = 'low' | 'medium' | 'high' | 'epic';

interface WizardState {
  step: number;
  trackType: TrackType;
  prompt: string;
  intensity: Intensity;
  duration: number;
  language: string;
  customLyrics: string;
}

interface WizardActions {
  setStep: (step: number) => void;
  updateField: <K extends keyof WizardState>(field: K, value: WizardState[K]) => void;
  resetWizard: () => void;
}

type WizardStore = WizardState & WizardActions;

const initialState: WizardState = {
  step: 1,
  trackType: 'full_song',
  prompt: '',
  intensity: 'medium',
  duration: 120,
  language: 'EN',
  customLyrics: '',
};

export const useWizardStore = create<WizardStore>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  updateField: (field, value) => set({ [field]: value }),
  resetWizard: () => set(initialState),
}));
