import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import PageList from './components/PageList';
import Editor from './components/Editor';
import SearchModal from './components/SearchModal';
import Settings from './components/Settings';
import UnsavedChangesDialog from './components/UnsavedChangesDialog';
import type { Page, PageType, PageFilters, SortBy } from './types';

function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [currentView, setCurrentView] = useState<'inbox' | PageType | 'tags' | 'templates' | 'settings'>('inbox');
  const [templates, setTemplates] = useState<Page[]>([]);
  const [filters, setFilters] = useState<PageFilters>({});
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt');
  const [searchOpen, setSearchOpen] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const saveFunctionRef = useRef<(() => void) | null>(null);

  // Загрузка страниц
  const loadPages = useCallback(async () => {
    const loadedPages = await window.electronAPI.getPages(filters, sortBy);
    setPages(loadedPages);
  }, [filters, sortBy]);

  // Загрузка тегов
  const loadTags = useCallback(async () => {
    const tags = await window.electronAPI.getAllTags();
    setAllTags(tags);
  }, []);

  // Загрузка шаблонов
  const loadTemplates = useCallback(async () => {
    const loadedTemplates = await window.electronAPI.getTemplates();
    setTemplates(loadedTemplates);
  }, []);

  useEffect(() => {
    loadPages();
    loadTags();
    if (currentView === 'templates') {
      loadTemplates();
    }
  }, [loadPages, loadTags, currentView, loadTemplates]);

  // Обработка изменения вида
  useEffect(() => {
    if (currentView === 'inbox') {
      setFilters({});
    } else if (currentView === 'tags' || currentView === 'settings' || currentView === 'templates') {
      // Специальные виды
    } else {
      setFilters({ type: currentView as PageType });
    }
  }, [currentView]);

  // Проверка несохраненных изменений перед сменой страницы
  const checkUnsavedChanges = (callback: () => void) => {
    if (hasUnsavedChanges && selectedPage) {
      setPendingAction(() => callback);
      setShowUnsavedDialog(true);
    } else {
      callback();
    }
  };

  const handleSaveAndContinue = () => {
    const saveFn = saveFunctionRef.current;
    if (saveFn) {
      saveFn();
      setShowUnsavedDialog(false);
      setHasUnsavedChanges(false);
      if (pendingAction) {
        setTimeout(pendingAction, 100);
        setPendingAction(null);
      }
    }
  };

  const handleSaveAsTemplateAndContinue = async () => {
    if (selectedPage) {
      const templateTags = [...(selectedPage.tags || []), '_template'];
      await handleUpdatePage(selectedPage.id, { tags: templateTags });
      alert('Страница сохранена как шаблон!');
      setShowUnsavedDialog(false);
      setHasUnsavedChanges(false);
      if (pendingAction) {
        setTimeout(pendingAction, 100);
        setPendingAction(null);
      }
    }
  };

  const handleDiscardAndContinue = () => {
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // Создание новой страницы: не вызываем loadPages(), чтобы избежать лишних
  // ре-рендеров и сброса ввода в Editor; добавляем newPage в список вручную.
  const handleCreatePage = async (type: PageType, templateId?: string) => {
    checkUnsavedChanges(async () => {
      const newPage = await window.electronAPI.createFromTemplate(type, templateId);
      setSelectedPage(newPage);
      setPages((prev) => [newPage, ...prev]);
      setHasUnsavedChanges(false);
      
    });
  };

  // Обновление страницы
  const handleUpdatePage = async (id: string, updates: Partial<Page>) => {
    try {
      const updated = await window.electronAPI.updatePage(id, updates);
      // Оптимизация: обновляем только конкретную страницу в списке вместо перезагрузки всех
      setPages(prevPages => 
        prevPages.map(p => p.id === id ? updated : p)
      );
      if (selectedPage?.id === id) {
        setSelectedPage(updated);
      }
    } catch (error) {
      console.error('Error updating page:', error);
      // В случае ошибки перезагружаем все страницы
      await loadPages();
    }
  };

  // Удаление страницы
  const handleDeletePage = async (id: string) => {
    // Подтверждение уже есть в Editor.tsx, поэтому здесь не дублируем
    await window.electronAPI.deletePage(id);
    
    // Оптимизация: удаляем страницу из локального состояния вместо полной перезагрузки
    setPages(prevPages => prevPages.filter(p => p.id !== id));
    
    if (selectedPage?.id === id) {
      setSelectedPage(null);
    }
    
    // Сбрасываем флаг несохраненных изменений
    setHasUnsavedChanges(false);
    
    // Восстанавливаем фокус окна сразу после удаления
    setTimeout(async () => {
      await window.electronAPI.restoreWindowFocus();
    }, 100);
  };

  // Экспорт
  const handleExportMarkdown = async () => {
    if (selectedPage) {
      await window.electronAPI.exportPageToMarkdown(selectedPage.id);
    }
  };

  const handleExportTasksCsv = async () => {
    await window.electronAPI.exportTasksToCsv(filters);
  };

  // Горячие клавиши
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K - поиск
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      
      // Ctrl+N - новая страница
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        const type = currentView === 'note' || currentView === 'task' || currentView === 'doc' 
          ? currentView 
          : 'note';
        handleCreatePage(type);
      }
      
      // Ctrl+Enter - отметить задачу выполненной
      if (e.ctrlKey && e.key === 'Enter' && selectedPage?.type === 'task') {
        e.preventDefault();
        handleUpdatePage(selectedPage.id, { taskStatus: 'done' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, selectedPage]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {currentView === 'settings' ? (
        <Settings onClose={() => setCurrentView('inbox')} />
      ) : (
        <>
          <Sidebar
            currentView={currentView}
            onViewChange={(view) => {
              checkUnsavedChanges(() => {
                setCurrentView(view);
                setHasUnsavedChanges(false);
              });
            }}
            onCreatePage={handleCreatePage}
            allTags={allTags}
            onTagSelect={(tag) => {
              checkUnsavedChanges(() => {
                setFilters({ ...filters, tags: [tag] });
                setHasUnsavedChanges(false);
              });
            }}
            templates={templates}
          />
          
          <PageList
            pages={pages}
            selectedPage={selectedPage}
            onSelectPage={(page) => {
              checkUnsavedChanges(() => {
                setSelectedPage(page);
                setHasUnsavedChanges(false);
              });
            }}
            onDeletePage={handleDeletePage}
            sortBy={sortBy}
            onSortChange={setSortBy}
            filters={filters}
            onFiltersChange={setFilters}
            currentView={currentView}
            onExportTasksCsv={handleExportTasksCsv}
          />
          
          {selectedPage ? (
            <Editor
              key={selectedPage.id}
              page={selectedPage}
              onUpdate={handleUpdatePage}
              onExportMarkdown={handleExportMarkdown}
              onDelete={handleDeletePage}
              onSaveAsTemplate={async (page) => {
                // Сохраняем как шаблон - добавляем специальный тег
                const templateTags = [...(page.tags || []), '_template'];
                await handleUpdatePage(page.id, { tags: templateTags });
                alert('Страница сохранена как шаблон! Вы можете использовать её для создания новых страниц.');
              }}
              onUnsavedChanges={setHasUnsavedChanges}
              onSaveRequest={(fn) => { saveFunctionRef.current = fn; }}
              allTags={allTags}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p className="text-lg">Выберите страницу для редактирования</p>
                <p className="text-sm mt-2">или создайте новую (Ctrl+N)</p>
              </div>
            </div>
          )}
          
          <SearchModal
            isOpen={searchOpen}
            onClose={() => setSearchOpen(false)}
            onSelectPage={(page) => {
              checkUnsavedChanges(() => {
                setSelectedPage(page);
                setSearchOpen(false);
                setHasUnsavedChanges(false);
              });
            }}
          />
          
          <UnsavedChangesDialog
            isOpen={showUnsavedDialog}
            onSave={handleSaveAndContinue}
            onDiscard={handleDiscardAndContinue}
            onSaveAsTemplate={handleSaveAsTemplateAndContinue}
            onCancel={() => {
              setShowUnsavedDialog(false);
              setPendingAction(null);
            }}
          />
        </>
      )}
    </div>
  );
}

export default App;