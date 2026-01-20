import { memo, useMemo } from 'react';
import type { Page, PageFilters, SortBy } from '../types';

interface PageListProps {
  pages: Page[];
  selectedPage: Page | null;
  onSelectPage: (page: Page) => void;
  onDeletePage: (id: string) => void;
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  filters: PageFilters;
  onFiltersChange: (filters: PageFilters) => void;
  currentView: string;
  onExportTasksCsv: () => void;
}

function PageList({
  pages,
  selectedPage,
  onSelectPage,
  onDeletePage,
  sortBy,
  onSortChange,
  filters,
  onFiltersChange,
  currentView,
  onExportTasksCsv,
}: PageListProps) {
  const getTypeIcon = useMemo(() => {
    const icons = { note: '📝', task: '✓', doc: '📄' };
    return (type: string) => icons[type as keyof typeof icons] || '📄';
  }, []);

  const getStatusBadge = useMemo(() => {
    return (page: Page) => {
    if (page.type === 'task' && page.taskStatus) {
      const statusStyles = {
        backlog: 'bg-gray-100 text-gray-700',
        in_progress: 'bg-blue-100 text-blue-700',
        done: 'bg-green-100 text-green-700',
      };
      const statusLabels = {
        backlog: 'Бэклог',
        in_progress: 'В работе',
        done: 'Выполнено',
      };
      return (
        <span className={`px-2 py-0.5 text-xs rounded ${statusStyles[page.taskStatus]}`}>
          {statusLabels[page.taskStatus]}
        </span>
      );
      }
      return null;
    };
  }, []);

  const getPriorityBadge = useMemo(() => {
    return (page: Page) => {
    if (page.type === 'task' && page.taskPriority) {
      const priorityStyles = {
        low: 'bg-gray-100 text-gray-600',
        med: 'bg-yellow-100 text-yellow-700',
        high: 'bg-red-100 text-red-700',
      };
      const priorityLabels = { low: '↓', med: '−', high: '↑' };
      return (
        <span className={`px-1.5 py-0.5 text-xs rounded font-bold ${priorityStyles[page.taskPriority]}`}>
          {priorityLabels[page.taskPriority]}
        </span>
      );
      }
      return null;
    };
  }, []);

  const formatDate = useMemo(() => {
    return (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
      if (diffDays < 7) return `${diffDays} дн. назад`;
      return date.toLocaleDateString('ru-RU');
    };
  }, []);

  return (
    <div className="w-96 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentView === 'inbox' && 'Входящие'}
            {currentView === 'note' && 'Заметки'}
            {currentView === 'task' && 'Задачи'}
            {currentView === 'doc' && 'Инструкции'}
            {currentView === 'tags' && 'По тегам'}
            {currentView === 'settings' && 'Настройки'}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">{pages.length}</span>
        </div>

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="updatedAt">По обновлению</option>
            <option value="createdAt">По созданию</option>
            {currentView === 'task' && <option value="dueDate">По дедлайну</option>}
            {currentView === 'task' && <option value="priority">По приоритету</option>}
          </select>

          {currentView === 'task' && (
            <button
              onClick={onExportTasksCsv}
              className="text-sm px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-gray-700 dark:text-gray-300"
              title="Экспорт в CSV"
            >
              📊
            </button>
          )}
        </div>

        {currentView === 'task' && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onFiltersChange({ ...filters, taskStatus: undefined })}
              className={`text-xs px-2 py-1 rounded ${!filters.taskStatus ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-150'}`}
            >
              Все
            </button>
            <button
              onClick={() => onFiltersChange({ ...filters, taskStatus: 'backlog' })}
              className={`text-xs px-2 py-1 rounded ${filters.taskStatus === 'backlog' ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-150'}`}
            >
              Бэклог
            </button>
            <button
              onClick={() => onFiltersChange({ ...filters, taskStatus: 'in_progress' })}
              className={`text-xs px-2 py-1 rounded ${filters.taskStatus === 'in_progress' ? 'bg-blue-200' : 'bg-gray-100 hover:bg-gray-150'}`}
            >
              В работе
            </button>
            <button
              onClick={() => onFiltersChange({ ...filters, taskStatus: 'done' })}
              className={`text-xs px-2 py-1 rounded ${filters.taskStatus === 'done' ? 'bg-green-200' : 'bg-gray-100 hover:bg-gray-150'}`}
            >
              Готово
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {pages.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>Нет страниц</p>
            <p className="text-sm mt-2">Создайте первую страницу</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pages.map((page) => (
              <div
                key={page.id}
                className={`group p-4 cursor-pointer transition-colors ${
                  selectedPage?.id === page.id 
                    ? 'bg-white dark:bg-gray-800 border-l-4 border-blue-500' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">{getTypeIcon(page.type)}</span>
                  <div 
                    className="flex-1 min-w-0"
                    onClick={() => onSelectPage(page)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {page.pinned && <span className="text-yellow-500">📌</span>}
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">{page.title}</h3>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Вы уверены, что хотите удалить эту страницу?')) {
                            onDeletePage(page.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                        title="Удалить"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(page)}
                      {getPriorityBadge(page)}
                      {page.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {page.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-xs text-gray-500">
                              #{tag}
                            </span>
                          ))}
                          {page.tags.length > 2 && (
                            <span className="text-xs text-gray-400">+{page.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatDate(page.updatedAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(PageList);