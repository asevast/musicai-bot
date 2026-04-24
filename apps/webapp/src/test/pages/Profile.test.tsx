import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { Profile } from '../../pages/Profile';

describe('Profile', () => {
  it('should render profile header', () => {
    render(<Profile />);
    expect(screen.getByText('Профиль')).toBeInTheDocument();
  });

  it('should render menu items', () => {
    render(<Profile />);
    expect(screen.getByText(/История/i)).toBeInTheDocument();
    expect(screen.getByText(/Настройки/i)).toBeInTheDocument();
  });
});
