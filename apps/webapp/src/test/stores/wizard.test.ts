import { describe, it, expect, beforeEach } from 'vitest';
import { useWizardStore } from '../../store/wizard.store';

describe('Wizard Store', () => {
  beforeEach(() => {
    useWizardStore.getState().resetWizard();
  });

  it('should have correct initial state', () => {
    const state = useWizardStore.getState();
    expect(state.step).toBe(1);
    expect(state.trackType).toBe('full_song');
    expect(state.prompt).toBe('');
    expect(state.intensity).toBe('medium');
    expect(state.duration).toBe(120);
    expect(state.language).toBe('EN');
    expect(state.customLyrics).toBe('');
  });

  it('should update step', () => {
    useWizardStore.getState().setStep(3);
    expect(useWizardStore.getState().step).toBe(3);
  });

  it('should update any field', () => {
    useWizardStore.getState().updateField('prompt', 'test prompt');
    expect(useWizardStore.getState().prompt).toBe('test prompt');

    useWizardStore.getState().updateField('duration', 60);
    expect(useWizardStore.getState().duration).toBe(60);

    useWizardStore.getState().updateField('trackType', 'clip');
    expect(useWizardStore.getState().trackType).toBe('clip');
  });

  it('should reset to initial state', () => {
    useWizardStore.getState().setStep(4);
    useWizardStore.getState().updateField('prompt', 'test');
    useWizardStore.getState().resetWizard();

    const state = useWizardStore.getState();
    expect(state.step).toBe(1);
    expect(state.prompt).toBe('');
  });
});
