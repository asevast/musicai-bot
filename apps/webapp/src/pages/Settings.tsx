import { useNavigate } from 'react-router';
import {
  List,
  Section,
  Cell,
  Button,
  Text,
  Avatar,
  Modal,
  Snackbar,
} from '@telegram-apps/telegram-ui';
import { Icon24ChevronRight } from '@telegram-apps/telegram-ui/dist/icons/24/chevron_right';
import { Icon24Notifications } from '@telegram-apps/telegram-ui/dist/icons/24/notifications';
import { useState, useEffect } from 'react';
import { initData, useSignal } from '@telegram-apps/sdk-react';

/**
 * Settings Page for MusicAI Webapp
 * SPEC §15.3: Webapp settings page
 */
export function Settings() {
  const navigate = useNavigate();
  const initDataState = useSignal(initData.state);
  const user = initDataState?.user;

  const [language, setLanguage] = useState<string>('en');
  const [notifications, setNotifications] = useState<boolean>(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string } | null>(null);

  // Load user settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/users/me/settings', {
          headers: { 'X-Telegram-Id': user?.id?.toString() || '' },
        });
        if (response.ok) {
          const data = await response.json();
          setLanguage(data.language || 'en');
          setNotifications(data.notifications !== false);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  const handleLanguageChange = async (lang: string) => {
    setLanguage(lang);
    try {
      await fetch('/api/users/me/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': user?.id?.toString() || '',
        },
        body: JSON.stringify({ language: lang }),
      });
      setSnackbar({ message: 'Language updated' });
    } catch (error) {
      console.error('Failed to update language:', error);
    }
  };

  const handleNotificationsToggle = async () => {
    const newValue = !notifications;
    setNotifications(newValue);
    try {
      await fetch('/api/users/me/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': user?.id?.toString() || '',
        },
        body: JSON.stringify({ notifications: newValue }),
      });
      setSnackbar({ message: newValue ? 'Notifications enabled' : 'Notifications disabled' });
    } catch (error) {
      console.error('Failed to update notifications:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: { 'X-Telegram-Id': user?.id?.toString() || '' },
      });
      if (response.ok) {
        setSnackbar({ message: 'Account deleted. Goodbye!' });
        setTimeout(() => navigate('/'), 2000);
      } else {
        const error = await response.text();
        setSnackbar({ message: `Error: ${error}` });
      }
    } catch (error) {
      setSnackbar({ message: 'Failed to delete account' });
    }
    setShowDeleteModal(false);
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
  ];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar src={user?.photo_url} />
        <div>
          <Text weight="1" size={6}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text color="textSecondary">@{user?.username}</Text>
        </div>
      </div>

      {/* Account Section */}
      <Section header="Account">
        <List>
          <Cell
            before={<Icon24Language />}
            after={
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-transparent text-right appearance-none cursor-pointer"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            }
          >
            Language
          </Cell>
          <Cell
            before={<Icon24Notifications />}
            after={
              <div
                className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${
                  notifications ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                onClick={handleNotificationsToggle}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform m-0.5 ${
                    notifications ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </div>
            }
          >
            Notifications
          </Cell>
          <Cell
            before={<span style={{ fontSize: 24 }}>👤</span>}
            after={<Icon24ChevronRight />}
            onClick={() => navigate('/profile')}
          >
            Profile
          </Cell>
        </List>
      </Section>

      {/* Support Section */}
      <Section header="Support" className="mt-4">
        <List>
          <Cell
            before={<span style={{ fontSize: 24 }}>❓</span>}
            after={<Icon24ChevronRight />}
            onClick={() => window.open('https://t.me/musicai_support', '_blank')}
          >
            Help & Support
          </Cell>
          <Cell
            before={<span style={{ fontSize: 24 }}>ℹ️</span>}
            after={<Icon24ChevronRight />}
            onClick={() => navigate('/about')}
          >
            About
          </Cell>
        </List>
      </Section>

      {/* Danger Zone */}
      <Section header="Danger Zone" className="mt-4">
        <List>
          <Cell
            before={<span style={{ fontSize: 24 }}>🗑️</span>}
            className="text-red-500"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Account
          </Cell>
        </List>
      </Section>

      {/* Delete Confirmation Modal */}
      <Modal header="Delete Account?" open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <div className="p-4">
          <Text className="mb-4">
            This action cannot be undone. All your tracks, credits, and data will be permanently
            deleted.
          </Text>
          <div className="flex gap-2 mt-4">
            <Button mode="bezeled" stretched onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button mode="outline" stretched className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white" onClick={handleDeleteAccount}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Snackbar */}
      {snackbar && <Snackbar onClose={() => setSnackbar(null)} description={snackbar.message} />}
    </div>
  );
}
