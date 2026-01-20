import { memo, useMemo } from 'react';
import type { PageType } from '../types';

import type { Page } from '../types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: any) => void;
  onCreatePage: (type: PageType, templateId?: string) => void;
  allTags: string[];
  onTagSelect: (tag: string) => void;
  templates?: Page[];
}

function Sidebar({ currentView, onViewChange, onCreatePage, allTags, onTagSelect, templates = [] }: SidebarProps) {
  const menuItems = useMemo(() => [
    { id: 'inbox', label: 'Входящие', icon: '📥' },
    { id: 'note', label: 'Заметки', icon: '📝' },
    { id: 'task', label: 'Задачи', icon: '✓' },
    { id: 'doc', label: 'Инструкции', icon: '📄' },
    { id: 'tags', label: 'Теги', icon: '🏷️' },
    { id: 'templates', label: 'Шаблоны', icon: '📋' },
    { id: 'settings', label: 'Настройки', icon: '⚙️' },
  ], []);

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Workspace Lite</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                currentView === item.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {currentView === 'tags' && allTags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Все теги
            </h3>
            <div className="space-y-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    onViewChange('inbox');
                    onTagSelect(tag);
                  }}
                  className="w-full px-3 py-1.5 text-sm text-left text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentView === 'templates' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Сохраненные шаблоны
            </h3>
            {templates.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                Нет сохраненных шаблонов.<br />
                Сохраните страницу как шаблон, используя кнопку "📋 Шаблон" в редакторе.
              </div>
            ) : (
              <div className="space-y-1">
                {templates.map((template) => {
                  const typeLabels: Record<PageType, string> = {
                    note: '📝 Заметка',
                    task: '✓ Задача',
                    doc: '📄 Инструкция',
                  };
                  return (
                    <button
                      key={template.id}
                      onClick={() => onCreatePage(template.type, template.id)}
                      className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title={`Создать ${typeLabels[template.type].toLowerCase()} из шаблона "${template.title}"`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{typeLabels[template.type]}</span>
                        <span className="font-medium truncate">{template.title}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={() => onCreatePage('note')}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Создать заметку
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => onCreatePage('task')}
            className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            + Задача
          </button>
          <button
            onClick={() => onCreatePage('doc')}
            className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            + Инструкция
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(Sidebar);