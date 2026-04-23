import React from 'react';
import { Link, useLocation } from 'react-router';
import { HomeIcon, CreateIcon, LibraryIcon, ProfileIcon } from '../icons';

const navItems = [
  { path: '/', label: 'Главная', Icon: HomeIcon },
  { path: '/create', label: 'Создать', Icon: CreateIcon },
  { path: '/library', label: 'Лента', Icon: LibraryIcon },
  { path: '/profile', label: 'Профиль', Icon: ProfileIcon },
];

export function BottomNav(): React.ReactElement {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 h-16 pb-2 z-50">
      <div className="flex items-center justify-around h-full max-w-md mx-auto">
        {navItems.map(({ path, label, Icon }) => {
          const isActive = location.pathname === path ||
            (path !== '/' && location.pathname.startsWith(path));

          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center justify-center flex-1 h-full min-w-0"
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? 'fill-[#5B5FC7]' : 'fill-gray-400'
                }`}
              />
              <span
                className={`text-[10px] font-medium mt-0.5 ${
                  isActive ? 'text-[#5B5FC7]' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
