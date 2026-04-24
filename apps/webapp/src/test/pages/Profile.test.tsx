import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { Profile } from '../../pages/Profile';

describe('Profile', () => {
  it('should render profile content', async () => {
    render(<Profile />);
    // TUI components wrap text, so use findByText for async rendering
    expect(await screen.findByText(/Credits Balance/)).toBeInTheDocument();
  });
});
