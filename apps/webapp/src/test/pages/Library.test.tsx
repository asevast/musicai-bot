import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { Library } from '../../pages/Library';

describe('Library', () => {
  it('should render tabs', () => {
    render(<Library />);
    expect(screen.getByText(/Мои треки/i)).toBeInTheDocument();
    expect(screen.getByText(/Все/i)).toBeInTheDocument();
  });

  it('should render header', () => {
    render(<Library />);
    expect(screen.getByText('Лента')).toBeInTheDocument();
  });
});
