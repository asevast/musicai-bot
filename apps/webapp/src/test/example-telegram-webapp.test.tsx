/**
 * Example: Testing Telegram WebApp with the new utilities
 *
 * This demonstrates how to use the telegram-webapp.tsx mocks
 * for testing Mini App components that depend on Telegram SDK.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoot } from '@telegram-apps/telegram-ui';
import {
  setupTelegramWebAppTest,
  defaultLaunchParams,
  mockTelegramWebApp,
  mockWindowTelegramWebApp,
  clickBackButton,
  clickMainButton,
  triggerViewportChange,
  triggerThemeChange,
} from './telegram-webapp';

// Example component that uses Telegram WebApp SDK
function ExampleTelegramComponent() {
  const { user } = { user: defaultLaunchParams.user }; // Would use useTelegram() hook
  const [count, setCount] = useState(0);

  return (
    <div data-testid="telegram-component">
      <h1>Welcome, {user?.first_name}</h1>
      <p data-testid="username">@{user?.username}</p>
      <button onClick={() => setCount(c => c + 1)} data-testid="counter">
        Count: {count}
      </button>
    </div>
  );
}

// Mock component for the example
import { useState } from 'react';

describe('Telegram WebApp Testing Utilities', () => {
  describe('setupTelegramWebAppTest', () => {
    let mocks: ReturnType<typeof setupTelegramWebAppTest>;

    beforeEach(() => {
      mocks = setupTelegramWebAppTest();
    });

    it('should provide Telegram SDK mocks', () => {
      expect(mocks.windowMock).toBeDefined();
      expect(mocks.windowMock.initDataUnsafe.user).toEqual(defaultLaunchParams.user);
    });

    it('should trigger viewport changes', () => {
      triggerViewportChange(600, 580);
      expect(mocks.windowMock.viewportHeight).toBe(600);
      expect(mocks.windowMock.viewportStableHeight).toBe(580);
    });

    it('should trigger theme changes', () => {
      triggerThemeChange('dark');
      expect(mocks.windowMock.colorScheme).toBe('dark');
    });
  });

  describe('Custom launch params', () => {
    it('should accept custom user data', () => {
      const customUser = {
        id: 999999,
        first_name: 'Custom',
        last_name: 'Test',
        username: 'customtest',
        is_premium: true,
      };

      const mocks = setupTelegramWebAppTest({
        user: customUser,
      });

      expect(mocks.windowMock.initDataUnsafe.user).toEqual(customUser);
    });
  });

  describe('BackButton interaction', () => {
    beforeEach(() => {
      setupTelegramWebAppTest();
    });

    it('should throw when clicking invisible back button', () => {
      expect(() => clickBackButton()).toThrow('BackButton is not visible');
    });

    it('should allow back button clicks when visible', () => {
      const { windowMock } = (global as unknown as { window: { Telegram: { WebApp: ReturnType<typeof mockWindowTelegramWebApp> } } }).window.Telegram;
      windowMock.BackButton.show();

      let clicked = false;
      windowMock.BackButton.onClick(() => { clicked = true; });
      clickBackButton();
      expect(clicked).toBe(true);
    });
  });

  describe('MainButton interaction', () => {
    beforeEach(() => {
      setupTelegramWebAppTest();
    });

    it('should throw when clicking invisible main button', () => {
      expect(() => clickMainButton()).toThrow('MainButton is not visible');
    });

    it('should throw when clicking disabled main button', () => {
      const { windowMock } = (global as unknown as { window: { Telegram: { WebApp: ReturnType<typeof mockWindowTelegramWebApp> } } }).window.Telegram;
      windowMock.MainButton.show();
      windowMock.MainButton.disable();
      expect(() => clickMainButton()).toThrow('MainButton is not active');
    });

    it('should allow main button clicks when visible and active', () => {
      const { windowMock } = (global as unknown as { window: { Telegram: { WebApp: ReturnType<typeof mockWindowTelegramWebApp> } } }).window.Telegram;
      windowMock.MainButton.show();

      let clicked = false;
      windowMock.MainButton.onClick(() => { clicked = true; });

      expect(windowMock.MainButton.isVisible).toBe(true);
      expect(windowMock.MainButton.isActive).toBe(true);

      clickMainButton();
      expect(clicked).toBe(true);
    });
  });
});

/**
 * Usage instructions for testing real components:
 *
 * 1. Import the setup function in your test file:
 *    import { setupTelegramWebAppTest } from './telegram-webapp';
 *
 * 2. Call it in beforeEach or at the top of your test:
 *    beforeEach(() => {
 *      setupTelegramWebAppTest();
 *    });
 *
 * 3. Or with custom params:
 *    beforeEach(() => {
 *      setupTelegramWebAppTest({
 *        user: {
 *          id: 123,
 *          first_name: 'Premium',
 *          username: 'premiumuser',
 *          is_premium: true,
 *        }
 *      });
 *    });
 *
 * 4. Use the helper functions to simulate interactions:
 *    - clickBackButton() - simulates back button tap
 *    - clickMainButton() - simulates main button tap
 *    - triggerViewportChange(600) - simulates keyboard opening
 *    - triggerThemeChange('dark') - simulates theme switch
 *
 * 5. Access mocked SDK properties:
 *    const { windowMock } = (global as any).window.Telegram.WebApp;
 *    console.log(windowMock.viewportHeight); // 800
 *    console.log(windowMock.colorScheme); // 'light'
 */
