import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { BottomNav } from '../../components/BottomNav';

describe('BottomNav', () => {
  it('should render 4 navigation items', () => {
    render(<BottomNav />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
  });

  it('should have correct navigation labels', () => {
    render(<BottomNav />);
    expect(screen.getByText('Главная')).toBeInTheDocument();
    expect(screen.getByText('Создать')).toBeInTheDocument();
    expect(screen.getByText('Лента')).toBeInTheDocument();
    expect(screen.getByText('Профиль')).toBeInTheDocument();
  });

  it('should have correct hrefs', () => {
    render(<BottomNav />);
    expect(screen.getByText('Главная').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Создать').closest('a')).toHaveAttribute('href', '/create');
    expect(screen.getByText('Лента').closest('a')).toHaveAttribute('href', '/library');
    expect(screen.getByText('Профиль').closest('a')).toHaveAttribute('href', '/profile');
  });

  it('should mark home as active on root path', () => {
    render(<BottomNav />, { initialEntries: ['/'] });
    const homeLabel = screen.getByText('Главная');
    expect(homeLabel.className).toContain('text-[#5B5FC7]');
  });

  it('should mark create as active on create/* paths', () => {
    render(<BottomNav />, { initialEntries: ['/create/prompt'] });
    const createLabel = screen.getByText('Создать');
    expect(createLabel.className).toContain('text-[#5B5FC7]');
  });
});
