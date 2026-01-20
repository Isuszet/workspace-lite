# 🏗️ Архитектура Workspace Lite

## Обзор

Workspace Lite построен на основе классической Electron архитектуры с чётким разделением между процессами и максимальной безопасностью.

## Диаграмма архитектуры

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  main.ts   │  │ database.ts  │  │   preload.ts     │    │
│  │            │  │              │  │                  │    │
│  │ • Window   │  │ • SQLite     │  │ • IPC Bridge     │    │
│  │ • IPC      │  │ • CRUD       │  │ • Context        │    │
│  │ • Handlers │  │ • FTS        │  │   Isolation      │    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↕ IPC
┌─────────────────────────────────────────────────────────────┐
│                   Renderer Process (React)                   │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  App.tsx   │  │ Components   │  │   Types          │    │
│  │            │  │              │  │                  │    │
│  │ • State    │  │ • Sidebar    │  │ • Interfaces     │    │
│  │ • Logic    │  │ • PageList   │  │ • Type Safety    │    │
│  │ • Keyboard │  │ • Editor     │  │                  │    │
│  │   Handlers │  │ • Search     │  │                  │    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      SQLite Database                         │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   pages    │  │  pages_fts   │  │    Indices       │    │
│  │  (main)    │  │   (FTS5)     │  │                  │    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Основные компоненты

### 1. Main Process (electron/)

#### main.ts
**Ответственность:**
- Создание и управление окном приложения
- Регистрация IPC handlers
- Обработка событий жизненного цикла
- Диалоги экспорта файлов

**Ключевые функции:**
- `createWindow()` - создание главного окна
- IPC handlers для всех операций с данными
- Экспорт в Markdown/CSV

#### database.ts
**Ответственность:**
- Все операции с SQLite базой данных
- Инициализация схемы и индексов
- CRUD операции
- Полнотекстовый поиск (FTS5)

**Ключевые функции:**
- `initDatabase()` - создание таблиц и индексов
- `createPage()`, `getPage()`, `updatePage()`, `deletePage()`
- `searchPages()` - FTS5 поиск
- `getAllTags()` - получение всех уникальных тегов

#### preload.ts
**Ответственность:**
- Безопасный мост между main и renderer процессами
- Экспозиция минимального API через contextBridge
- Обеспечение contextIsolation

**API:**
```typescript
window.electronAPI = {
  createPage, getPage, getPages, updatePage, deletePage,
  searchPages, getAllTags,
  exportPageToMarkdown, exportTasksToCsv,
  createFromTemplate, getTemplates
}
```

### 2. Renderer Process (src/)

#### App.tsx
**Ответственность:**
- Главная точка входа приложения
- Управление глобальным состоянием
- Координация между компонентами
- Обработка горячих клавиш

**State Management:**
- `pages` - все загруженные страницы
- `selectedPage` - текущая редактируемая страница
- `currentView` - текущий раздел навигации (inbox | note | task | doc | tags | templates | settings)
- `filters` - активные фильтры
- `sortBy` - текущая сортировка
- `templates` - загруженные шаблоны (страницы с тегом _template)

#### Components

**Sidebar.tsx**
- Навигация по разделам
- Кнопки создания страниц
- Список тегов
- Раздел "Шаблоны" с отображением сохраненных шаблонов

**PageList.tsx**
- Отображение списка страниц
- Фильтры по статусам (для задач)
- Сортировка
- Экспорт задач в CSV

**Editor.tsx**
- Редактирование заголовка
- Управление тегами
- Метаданные (зависят от типа)
- Toolbar (закрепление, экспорт, сохранение как шаблон)

**MarkdownEditor.tsx**
- Textarea для ввода Markdown
- Toolbar форматирования
- Предпросмотр с рендерингом
- Подсказки по синтаксису

**SearchModal.tsx**
- Модальное окно поиска
- Debounced поиск
- Keyboard navigation
- Подсветка результатов

## Потоки данных

### 1. Создание страницы

**Создание из стандартного шаблона:**
```
User clicks "Создать заметку"
    ↓
Sidebar.tsx: onCreatePage('note')
    ↓
App.tsx: handleCreatePage('note')
    ↓
window.electronAPI.createFromTemplate('note')
    ↓
IPC → main.ts: create-from-template handler
    ↓
main.ts: Ищет сохраненные шаблоны с тегом _template
    ↓
Если найден → использует его, иначе → стандартный шаблон
    ↓
database.ts: createPage(template)
    ↓
SQLite: INSERT INTO pages
    ↓
Return new Page object
    ↓
App.tsx: setSelectedPage(newPage) + setPages([newPage, ...prev])
    ↓
Re-render: PageList + Editor
```

**Создание из сохраненного шаблона:**
```
User clicks на шаблон в разделе "Шаблоны"
    ↓
Sidebar.tsx: onCreatePage('note', templateId)
    ↓
App.tsx: handleCreatePage('note', templateId)
    ↓
window.electronAPI.createFromTemplate('note', templateId)
    ↓
IPC → main.ts: create-from-template handler
    ↓
main.ts: getPage(templateId) → создает копию без тега _template
    ↓
database.ts: createPage(templateData)
    ↓
SQLite: INSERT INTO pages
    ↓
Return new Page object
    ↓
App.tsx: setSelectedPage(newPage) + setPages([newPage, ...prev])
    ↓
Re-render: PageList + Editor
```

### 2. Поиск

```
User presses Ctrl+K
    ↓
App.tsx: keyboard handler → setSearchOpen(true)
    ↓
SearchModal.tsx: renders
    ↓
User types query (debounced 300ms)
    ↓
window.electronAPI.searchPages(query)
    ↓
IPC → main.ts: search-pages handler
    ↓
database.ts: searchPages()
    ↓
SQLite FTS5: SELECT ... FROM pages_fts WHERE MATCH
    ↓
Return SearchResult[]
    ↓
SearchModal: setResults() + render
    ↓
User selects → onSelectPage() → close modal
```

### 3. Обновление страницы

```
User edits title in Editor
    ↓
Editor.tsx: onChange → setTitle()
    ↓
Editor.tsx: onBlur → handleSave()
    ↓
window.electronAPI.updatePage(id, { title })
    ↓
IPC → main.ts: update-page handler
    ↓
database.ts: updatePage()
    ↓
SQLite: UPDATE pages SET title=?, updatedAt=? WHERE id=?
SQLite FTS Trigger: UPDATE pages_fts
    ↓
Return updated Page object
    ↓
App.tsx: loadPages() + update selectedPage
    ↓
Re-render: PageList shows updated title
```

## База данных

### Схема

```sql
CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  type TEXT CHECK(type IN ('note','task','doc')),
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  pinned INTEGER DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  
  taskStatus TEXT,
  taskDueDate INTEGER,
  taskPriority TEXT,
  
  docOwner TEXT,
  docVersion TEXT,
  docApproved INTEGER
);

CREATE VIRTUAL TABLE pages_fts USING fts5(
  id UNINDEXED,
  title,
  content,
  content='pages'
);
```

### Индексы

```sql
CREATE INDEX idx_pages_type ON pages(type);
CREATE INDEX idx_pages_pinned ON pages(pinned DESC);
CREATE INDEX idx_pages_updatedAt ON pages(updatedAt DESC);
CREATE INDEX idx_pages_taskStatus ON pages(taskStatus);
CREATE INDEX idx_pages_taskDueDate ON pages(taskDueDate);
```

### Триггеры FTS

Автоматическая синхронизация между `pages` и `pages_fts`:
- `pages_ai` - AFTER INSERT
- `pages_ad` - AFTER DELETE  
- `pages_au` - AFTER UPDATE

## Безопасность

### Context Isolation

```javascript
// main.ts
webPreferences: {
  contextIsolation: true,    // ✅ Изолированный контекст
  nodeIntegration: false,    // ✅ Нет доступа к Node.js
  preload: path.join(__dirname, 'preload.js')
}
```

### Preload Whitelist

Только явно разрешенные операции доступны в renderer:
- ✅ CRUD страниц
- ✅ Поиск
- ✅ Экспорт
- ❌ Прямой доступ к файловой системе
- ❌ Выполнение произвольного кода
- ❌ Доступ к нативным модулям

## Производительность

### SQLite оптимизации

1. **WAL режим** - лучшая параллельность
   ```javascript
   db.pragma('journal_mode = WAL');
   ```

2. **FTS5** - виртуальные таблицы для поиска
   - Индексация в реальном времени
   - Быстрый поиск по токенам
   - Подсветка фрагментов

3. **Индексы** - быстрая фильтрация и сортировка
   - По типу страницы
   - По статусу задачи
   - По дате обновления

### React оптимизации

1. **useCallback** - мемоизация функций загрузки
2. **Debounce** - для поисковых запросов (300ms)
3. **Controlled inputs** - минимум re-renders

## Расширяемость

### Добавление нового типа страницы

1. Обновите `PageType` в `types/index.ts`
2. Добавьте поля в интерфейс `Page`
3. Обновите схему БД в `database.ts`
4. Добавьте шаблон в `main.ts`
5. Обновите UI в `Editor.tsx`

### Добавление нового фильтра

1. Обновите `PageFilters` в `types/index.ts`
2. Обновите логику в `database.ts: getPages()`
3. Добавьте UI в `PageList.tsx`

### Интеграция с внешними сервисами

Для сохранения offline-first подхода:
- ❌ НЕ делать синхронные сетевые запросы
- ✅ Экспорт/импорт через файлы
- ✅ Опциональная синхронизация в фоне

## Тестирование

### Unit тесты (рекомендуется добавить)

```bash
# Установить
npm install -D vitest @testing-library/react

# Тесты для database.ts
- createPage()
- updatePage()
- searchPages()
- FTS синхронизация

# Тесты для компонентов
- Sidebar navigation
- Editor state management
- Search debouncing
```

### E2E тесты (рекомендуется)

```bash
# Установить
npm install -D playwright @playwright/test

# Сценарии
- Create → Edit → Save workflow
- Search functionality
- Export to Markdown
- Keyboard shortcuts
```

## Производственные соображения

### Логирование

Добавьте логирование ошибок:
```javascript
// main.ts
import log from 'electron-log';
log.info('Application started');
log.error('Database error:', err);
```

### Crash reporting

```javascript
// main.ts
import { crashReporter } from 'electron';
crashReporter.start({ submitURL: 'https://...' });
```

### Автообновления

```javascript
// main.ts
import { autoUpdater } from 'electron-updater';
autoUpdater.checkForUpdatesAndNotify();
```

## Заключение

Архитектура Workspace Lite обеспечивает:
- ✅ Безопасность через context isolation
- ✅ Производительность через SQLite + индексы
- ✅ Надёжность через типизацию TypeScript
- ✅ Расширяемость через модульную структуру
- ✅ Offline-first подход