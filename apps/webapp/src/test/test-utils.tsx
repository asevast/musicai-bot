import { ReactNode } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
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
    <AppRoot platform="ios">
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </AppRoot>
  );
}

export function render(ui: ReactNode, { initialEntries, ...options }: CustomRenderOptions = {}) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders initialEntries={initialEntries}>{children}</AllTheProviders>
    ),
    ...options,
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
