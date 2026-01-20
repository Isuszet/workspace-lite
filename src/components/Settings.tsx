import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    // Загружаем сохраненную тему
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('system');
    }
  }, []);

  const applyTheme = (selectedTheme: Theme) => {
    const root = document.documentElement;
    
    // Удаляем класс dark сначала
    root.classList.remove('dark');
    
    if (selectedTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      }
    } else if (selectedTheme === 'dark') {
      root.classList.add('dark');
    }
    
    localStorage.setItem('theme', selectedTheme);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-2xl p-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Настройки</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Выбор темы */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Внешний вид</h3>
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={theme === 'light'}
                    onChange={() => handleThemeChange('light')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">Светлая тема</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Классический светлый интерфейс</div>
                  </div>
                  <div className="ml-4 w-8 h-8 bg-white border-2 border-gray-300 rounded"></div>
                </label>

                <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={theme === 'dark'}
                    onChange={() => handleThemeChange('dark')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">Тёмная тема</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Удобная для работы в темноте</div>
                  </div>
                  <div className="ml-4 w-8 h-8 bg-gray-800 border-2 border-gray-600 rounded"></div>
                </label>

                <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="radio"
                    name="theme"
                    value="system"
                    checked={theme === 'system'}
                    onChange={() => handleThemeChange('system')}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">Системная</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Следует настройкам вашей системы</div>
                  </div>
                  <div className="ml-4 flex gap-1">
                    <div className="w-4 h-8 bg-white border border-gray-300 rounded-l"></div>
                    <div className="w-4 h-8 bg-gray-800 border border-gray-600 rounded-r"></div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
