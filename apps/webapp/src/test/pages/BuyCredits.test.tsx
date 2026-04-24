import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { BuyCredits } from '../../pages/BuyCredits';

describe('BuyCredits', () => {
  it('should render balance header', () => {
    render(<BuyCredits />);
    expect(screen.getByText(/80/)).toBeInTheDocument();
    expect(screen.getByText(/кредитов/)).toBeInTheDocument();
  });

  it('should render pack options', () => {
    render(<BuyCredits />);
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
  });

  it('should render subscription options', () => {
    render(<BuyCredits />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });

  it('should show Popular badge on Pack M', () => {
    render(<BuyCredits />);
    expect(screen.getByText('Popular')).toBeInTheDocument();
  });
});
