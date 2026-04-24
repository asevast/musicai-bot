import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test-utils';
import { CreateType } from '../../pages/CreateType';
import { useWizardStore } from '../../store/wizard.store';

describe('CreateType', () => {
  beforeEach(() => {
    useWizardStore.getState().resetWizard();
  });

  it('should render 4 type options', () => {
    render(<CreateType />);
    expect(screen.getByText('Полная песня')).toBeInTheDocument();
    expect(screen.getByText('Клип 30с')).toBeInTheDocument();
    expect(screen.getByText('Инструментал')).toBeInTheDocument();
    expect(screen.getByText('3 варианта')).toBeInTheDocument();
  });

  it('should show cost for each type', () => {
    render(<CreateType />);
    expect(screen.getByText('5 кредита')).toBeInTheDocument();
    expect(screen.getByText('1 кредит')).toBeInTheDocument();
  });

  it('should update wizard store on selection', () => {
    render(<CreateType />);
    const clipButton = screen.getByText('Клип 30с').closest('button');
    fireEvent.click(clipButton!);
    expect(useWizardStore.getState().trackType).toBe('clip');
  });
});
