import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { CreateLanguage } from '../../pages/CreateLanguage';
import { useWizardStore } from '../../store/wizard.store';

describe('CreateLanguage', () => {
  beforeEach(() => {
    useWizardStore.getState().resetWizard();
  });

  it('should render language options', () => {
    render(<CreateLanguage />);
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Deutsch')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
    expect(screen.getByText('Français')).toBeInTheDocument();
  });

  it('should update wizard store on language selection', () => {
    render(<CreateLanguage />);
    const spanishOption = screen.getByText('Español').closest('button');
    fireEvent.click(spanishOption!);
    expect(useWizardStore.getState().language).toBe('ES');
  });
});
