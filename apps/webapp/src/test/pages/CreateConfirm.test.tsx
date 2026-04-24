import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../test-utils';
import { CreateConfirm } from '../../pages/CreateConfirm';
import { useWizardStore } from '../../store/wizard.store';

describe('CreateConfirm', () => {
  beforeEach(() => {
    useWizardStore.getState().resetWizard();
    useWizardStore.getState().updateField('prompt', 'A test song');
    useWizardStore.getState().updateField('trackType', 'clip');
  });

  it('should render summary', () => {
    render(<CreateConfirm />);
    expect(screen.getByText(/A test song/)).toBeInTheDocument();
  });

  it('should show cost', () => {
    render(<CreateConfirm />);
    expect(screen.getByText(/1 кредит/)).toBeInTheDocument();
  });

  it('should have create button', () => {
    render(<CreateConfirm />);
    expect(screen.getByText(/Создать/i)).toBeInTheDocument();
  });
});
