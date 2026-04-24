import type { ReactNode } from 'react';
import type { RenderOptions } from '@testing-library/react';
import { render as rtlRender } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoot } from '@telegram-apps/telegram-ui';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
}

function AllTheProviders({
  children,
  initialEntries = ['/'],
}: {
  children: ReactNode;
  initialEntries?: string[];
}) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoot platform="ios">{children}</AppRoot>
    </MemoryRouter>
  );
}

export function render(ui: ReactNode, { initialEntries = ['/'], ...options }: CustomRenderOptions = {}) {
  return rtlRender(ui as React.ReactElement, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={initialEntries}>
        <AppRoot platform="ios">{children}</AppRoot>
      </MemoryRouter>
    ),
    ...options,
  });
}

// Re-export everything from testing-library EXCEPT render
export { screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
