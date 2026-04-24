import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { BuyCredits } from '../../pages/BuyCredits';

describe('BuyCredits', () => {
  it('should render balance header', () => {
    render(<BuyCredits />);
    expect(screen.getByText(/80/)).toBeInTheDocument();
  });

  it('should render pack options', () => {
    render(<BuyCredits />);
    expect(screen.getByText('Pack S')).toBeInTheDocument();
    expect(screen.getByText('Pack M')).toBeInTheDocument();
    expect(screen.getByText('Pack L')).toBeInTheDocument();
  });

  it('should render subscription options', () => {
    render(<BuyCredits />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });

  it('should show Popular badge on Pack M', () => {
    render(<BuyCredits />);
    expect(screen.getByText('Популярный')).toBeInTheDocument();
  });
});
