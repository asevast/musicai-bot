import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { Home } from '../../pages/Home';

describe('Home', () => {
  it('should render hero card with gradient', () => {
    render(<Home />);
    expect(screen.getByText('Создать трек')).toBeInTheDocument();
    expect(screen.getByText('Google Lyria 3 · до 3 минут')).toBeInTheDocument();
  });

  it('should show credits pill', () => {
    render(<Home />);
    expect(screen.getByText('80 кредитов')).toBeInTheDocument();
  });

  it('should render recent tracks', () => {
    render(<Home />);
    expect(screen.getByText('Summer Drive')).toBeInTheDocument();
    expect(screen.getByText('Midnight Chill')).toBeInTheDocument();
    expect(screen.getByText('Epic Cinematic')).toBeInTheDocument();
  });

  it('should have CTA link to /create', () => {
    render(<Home />);
    const ctaButton = screen.getByText('+ Новый трек');
    expect(ctaButton.closest('a')).toHaveAttribute('href', '/create');
  });
});
