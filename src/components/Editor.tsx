import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Page, TaskStatus, TaskPriority } from '../types';
import MarkdownEditor from './MarkdownEditor';

interface EditorProps {
  page: Page | null;
  onUpdate: (id: string, updates: Partial<Page>) => void;
  onExportMarkdown: () => void;
  onDelete: (id: string) => void;
  onSaveAsTemplate?: (page: Page) => void;
  onUnsavedChanges?: (hasChanges: boolean) => void;
  onSaveRequest?: (saveFn: () => void) => void;
  allTags: string[];
}

export default function Editor({ page, onUpdate, onExportMarkdown, onDelete, onSaveAsTemplate, onUnsavedChanges, onSaveRequest, allTags }: EditorProps) {
  console.log('🏗️ Editor MOUNTED for page:', page?.id, page?.title);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [hasUnsavedChangesState, setHasUnsavedChangesState] = useState(false);
  
  // Ref для автофокуса на поле заголовка
  const titleInputRef = useRef<HTMLInputElement>(null);
  // Отслеживаем ID последней страницы для автофокуса только при смене страницы
  const lastPageIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    console.log('🎬 Editor component mounted/updated');
    
    // Устанавливаем фокус при монтировании с большей задержкой
    // чтобы все React рендеры успели завершиться
    const timeoutId = setTimeout(() => {
      if (titleInputRef.current) {
        console.log('🎯 Setting focus programmatically');
        // Сначала blur, потом focus - чтобы гарантировать что onFocus сработает
        titleInputRef.current.blur();
        setTimeout(() => {
          if (titleInputRef.current) {
            titleInputRef.current.focus();
            const len = titleInputRef.current.value.length;
            titleInputRef.current.setSelectionRange(len, len);
            console.log('🎯 Focus set after blur');
          }
        }, 10);
      }
    }, 300);
    
    return () => {
      console.log('💀 Editor component will unmount');
      clearTimeout(timeoutId);
    };
  }, []);
  
  // Поля задач
  const [taskStatus, setTaskStatus] = useState<string>('');
  const [taskPriority, setTaskPriority] = useState<string>('');
  const [taskDueDate, setTaskDueDate] = useState('');
  
  // Поля инструкций
  const [docOwner, setDocOwner] = useState('');
  const [docVersion, setDocVersion] = useState('');
  const [docApproved, setDocApproved] = useState(false);


  // Функция сохранения - должна быть объявлена до useEffect
  const handleSave = useCallback(() => {
    if (!page) return;
    const updates: any = { title, content, tags: localTags };
    
    if (page.type === 'task') {
      // Передаем taskStatus только если это валидное значение
      if (taskStatus && ['backlog', 'in_progress', 'done'].includes(taskStatus)) {
        updates.taskStatus = taskStatus;
      } else if (taskStatus === '') {
        updates.taskStatus = null;
      }
      // Передаем taskPriority только если это валидное значение
      if (taskPriority && ['low', 'med', 'high'].includes(taskPriority)) {
        updates.taskPriority = taskPriority;
      } else if (taskPriority === '') {
        updates.taskPriority = null;
      }
      updates.taskDueDate = taskDueDate ? new Date(taskDueDate).getTime() : undefined;
    }
    
    if (page.type === 'doc') {
      updates.docOwner = docOwner;
      updates.docVersion = docVersion;
      updates.docApproved = docApproved;
    }
    
    onUpdate(page.id, updates);
    // Сбрасываем флаг несохраненных изменений
    setTimeout(() => {
      setHasUnsavedChangesState(false);
    }, 100);
  }, [page, title, content, localTags, taskStatus, taskPriority, taskDueDate, docOwner, docVersion, docApproved, onUpdate]);

  const handleSaveAsTemplate = () => {
    if (!page || !onSaveAsTemplate) return;
    if (confirm('Сохранить текущую страницу как шаблон? Вы сможете использовать её для создания новых страниц.')) {
      // Проверяем и приводим типы для taskStatus и taskPriority
      const validTaskStatuses: TaskStatus[] = ['backlog', 'in_progress', 'done'];
      const validTaskPriorities: TaskPriority[] = ['low', 'med', 'high'];
      
      const finalTaskStatus: TaskStatus | undefined = page.type === 'task' 
        ? (validTaskStatuses.includes(taskStatus as TaskStatus) ? taskStatus as TaskStatus : undefined)
        : page.taskStatus;
      
      const finalTaskPriority: TaskPriority | undefined = page.type === 'task'
        ? (validTaskPriorities.includes(taskPriority as TaskPriority) ? taskPriority as TaskPriority : undefined)
        : page.taskPriority;
      
      onSaveAsTemplate({
        ...page,
        title,
        content,
        tags: localTags,
        taskStatus: finalTaskStatus,
        taskPriority: finalTaskPriority,
        taskDueDate: page.type === 'task' && taskDueDate ? new Date(taskDueDate).getTime() : page.taskDueDate,
        docOwner: page.type === 'doc' ? docOwner : page.docOwner,
        docVersion: page.type === 'doc' ? docVersion : page.docVersion,
        docApproved: page.type === 'doc' ? docApproved : page.docApproved,
      });
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !localTags.includes(tag)) {
      setLocalTags([...localTags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setLocalTags(localTags.filter((t) => t !== tag));
  };

  const handleTogglePin = () => {
    if (page) {
      onUpdate(page.id, { pinned: !page.pinned });
    }
  };

  // Загрузка данных страницы — только при смене страницы (по ID).
  // НЕ зависим от page?.updatedAt, чтобы не сбрасывать ввод пользователя при автосохранении!
  useEffect(() => {
    console.log('🔄 useEffect triggered, page.id:', page?.id, 'title:', page?.title);
    if (page) {
      setTitle(page.title);
      setContent(page.content);
      setLocalTags(page.tags || []);
      
      if (page.type === 'task') {
        setTaskStatus(page.taskStatus || 'backlog');
        setTaskPriority(page.taskPriority || 'med');
        setTaskDueDate(page.taskDueDate ? new Date(page.taskDueDate).toISOString().split('T')[0] : '');
      } else {
        // Сброс полей задачи, если это не задача
        setTaskStatus('');
        setTaskPriority('');
        setTaskDueDate('');
      }
      
      if (page.type === 'doc') {
        setDocOwner(page.docOwner || '');
        setDocVersion(page.docVersion || '');
        setDocApproved(page.docApproved || false);
      } else {
        // Сброс полей документа, если это не документ
        setDocOwner('');
        setDocVersion('');
        setDocApproved(false);
      }
      
      // Сбрасываем флаг несохраненных изменений
      setTimeout(() => {
        setHasUnsavedChangesState(false);
      }, 100);
    } else {
      // Сброс всех полей когда страница удалена (page === null)
      setTitle('');
      setContent('');
      setLocalTags([]);
      setTaskStatus('');
      setTaskPriority('');
      setTaskDueDate('');
      setDocOwner('');
      setDocVersion('');
      setDocApproved(false);
      setHasUnsavedChangesState(false);
    }
    
    // Сброс lastPageIdRef при размонтировании
    return () => {
      lastPageIdRef.current = null;
    };
  }, [page?.id]); // Убрали page?.updatedAt из зависимостей!

  // Мемоизируем сравнение для оптимизации
  const pageTagsString = useMemo(() => JSON.stringify(page?.tags || []), [page?.tags]);
  const localTagsString = useMemo(() => JSON.stringify(localTags), [localTags]);
  
  // Отслеживаем изменения и уведомляем родителя (с debounce для избежания мигания)
  useEffect(() => {
    if (!page) return;
    
    const timeoutId = setTimeout(() => {
      // Оптимизированное сравнение - проверяем только измененные поля
      let hasChanges = false;
      
      if (title !== page.title || content !== page.content) {
        hasChanges = true;
      } else if (localTagsString !== pageTagsString) {
        hasChanges = true;
      } else if (page.type === 'task') {
        if (taskStatus !== (page.taskStatus || 'backlog') || 
            taskPriority !== (page.taskPriority || 'med') ||
            taskDueDate !== (page.taskDueDate ? new Date(page.taskDueDate).toISOString().split('T')[0] : '')) {
          hasChanges = true;
        }
      } else if (page.type === 'doc') {
        if (docOwner !== (page.docOwner || '') ||
            docVersion !== (page.docVersion || '') ||
            docApproved !== (page.docApproved || false)) {
          hasChanges = true;
        }
      }
      
      setHasUnsavedChangesState(hasChanges);
      if (onUnsavedChanges) {
        onUnsavedChanges(hasChanges);
      }
    }, 500); // Увеличен debounce до 500ms для лучшей производительности
    
    return () => clearTimeout(timeoutId);
  }, [title, content, localTagsString, pageTagsString, taskStatus, taskPriority, taskDueDate, docOwner, docVersion, docApproved, page, onUnsavedChanges]);

  // Предоставляем функцию сохранения родителю
  useEffect(() => {
    if (onSaveRequest && page) {
      onSaveRequest(handleSave);
    }
  }, [onSaveRequest, handleSave, page]);

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg">Выберите страницу для редактирования</p>
          <p className="text-sm mt-2">или создайте новую (Ctrl+N)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePin}
            className={`px-3 py-1.5 rounded transition-colors ${
              page.pinned 
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title={page.pinned ? 'Открепить' : 'Закрепить'}
          >
            {page.pinned ? '📌 Закреплено' : '📌 Закрепить'}
          </button>
          
          <button
            onClick={onExportMarkdown}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Экспорт в Markdown"
          >
            📄 Экспорт
          </button>
          
          {onSaveAsTemplate && (
            <button
              onClick={handleSaveAsTemplate}
              className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
              title="Сохранить как шаблон"
            >
              📋 Шаблон
            </button>
          )}
          <button
            onClick={(e) => {
              if (confirm('Вы уверены, что хотите удалить эту страницу? Это действие нельзя отменить.')) {
                // Сбрасываем фокус с кнопки
                e.currentTarget.blur();
                onDelete(page.id);
              }
            }}
            className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            title="Удалить страницу"
          >
            🗑️ Удалить
          </button>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChangesState && (
            <span className="text-sm text-orange-600 dark:text-orange-400">● Несохраненные изменения</span>
          )}
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-lg transition-colors font-medium ${
              hasUnsavedChangesState
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed'
            }`}
            disabled={!hasUnsavedChangesState}
          >
            Сохранить
          </button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
        {/* Title */}
        <input
          ref={titleInputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={(e) => {
            // Принудительно устанавливаем курсор при получении фокуса
            const len = e.target.value.length;
            e.target.setSelectionRange(len, len);
          }}
          tabIndex={0}
          autoComplete="off"
          spellCheck={false}
          className="w-full text-3xl font-bold mb-6 border-none outline-none bg-transparent text-gray-900 dark:text-white"
          placeholder="Название страницы"
        />

        {/* Metadata */}
        <div className="mb-6 space-y-4">
          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Теги</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {localTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-blue-900 hover:text-blue-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Добавить тег..."
                list="tags-datalist"
              />
              <datalist id="tags-datalist">
                {allTags.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                Добавить
              </button>
            </div>
          </div>

          {/* Task metadata */}
          {page.type === 'task' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Статус</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="backlog">Бэклог</option>
                  <option value="in_progress">В работе</option>
                  <option value="done">Выполнено</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Приоритет</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="low">Низкий</option>
                  <option value="med">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Дедлайн</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Doc metadata */}
          {page.type === 'doc' && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ответственный</label>
                <input
                  type="text"
                  value={docOwner}
                  onChange={(e) => setDocOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Имя"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Версия</label>
                <input
                  type="text"
                  value={docVersion}
                  onChange={(e) => setDocVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="1.0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Утверждено</label>
                <label className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={docApproved}
                    onChange={(e) => setDocApproved(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {docApproved ? 'Утверждено' : 'Не утверждено'}
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Content editor */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <MarkdownEditor
            key={`content-${page.id}`}
            value={content}
            onChange={setContent}
          />
        </div>
      </div>
    </div>
  );
}