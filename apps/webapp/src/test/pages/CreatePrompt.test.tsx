import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { CreatePrompt } from '../../pages/CreatePrompt';
import { useWizardStore } from '../../store/wizard.store';

describe('CreatePrompt', () => {
  beforeEach(() => {
    useWizardStore.getState().resetWizard();
  });

  it('should render textarea', () => {
    render(<CreatePrompt />);
    expect(screen.getByPlaceholderText(/опишите/i)).toBeInTheDocument();
  });

  it('should update wizard store on prompt change', () => {
    render(<CreatePrompt />);
    const textarea = screen.getByPlaceholderText(/опишите/i);
    fireEvent.change(textarea, { target: { value: 'A happy summer song' } });
    expect(useWizardStore.getState().prompt).toBe('A happy summer song');
  });
});
