import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { Profile } from '../../pages/Profile';

describe('Profile', () => {
  it('should render profile header', () => {
    render(<Profile />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('should render credits balance', () => {
    render(<Profile />);
    expect(screen.getByText('Credits Balance')).toBeInTheDocument();
  });
});
