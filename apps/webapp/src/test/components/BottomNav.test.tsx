import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { BottomNav } from '../../components/BottomNav';

describe('BottomNav', () => {
  it('should render 4 navigation items', () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
  });

  it('should have correct navigation labels', () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText('Главная')).toBeInTheDocument();
    expect(screen.getByText('Создать')).toBeInTheDocument();
    expect(screen.getByText('Лента')).toBeInTheDocument();
    expect(screen.getByText('Профиль')).toBeInTheDocument();
  });

  it('should have correct hrefs', () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText('Главная').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Создать').closest('a')).toHaveAttribute('href', '/create');
    expect(screen.getByText('Лента').closest('a')).toHaveAttribute('href', '/library');
    expect(screen.getByText('Профиль').closest('a')).toHaveAttribute('href', '/profile');
  });

  it('should mark home as active on root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );
    const homeLink = screen.getByText('Главная').closest('a');
    expect(homeLink?.className).toContain('text-[#5B5FC7]');
  });

  it('should mark create as active on create/* paths', () => {
    render(
      <MemoryRouter initialEntries={['/create/prompt']}>
        <BottomNav />
      </MemoryRouter>
    );
    const createLink = screen.getByText('Создать').closest('a');
    expect(createLink?.className).toContain('text-[#5B5FC7]');
  });
});
