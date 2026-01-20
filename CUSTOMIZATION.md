# 🎨 Руководство по кастомизации Workspace Lite

## Общие принципы

Workspace Lite спроектирован с учетом расширяемости. Все основные компоненты можно легко кастомизировать под свои нужды.

## Изменение внешнего вида

### 1. Цветовая схема

**Tailwind конфигурация** (`tailwind.config.js`):

```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Добавьте свои цвета
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',  // Основной голубой
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // Тёмная тема
        dark: {
          bg: '#1a1a1a',
          surface: '#2d2d2d',
          text: '#e5e5e5',
        }
      }
    }
  }
}
```

**Применение:**
```tsx
// В компонентах замените
className="bg-blue-600" 
// на
className="bg-primary-600"
```

### 2. Тёмная тема

**Добавьте в App.tsx:**

```tsx
const [darkMode, setDarkMode] = useState(false);

useEffect(() => {
  if (darkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}, [darkMode]);
```

**Обновите стили:**
```tsx
// Sidebar
className="bg-white dark:bg-dark-surface border-gray-200 dark:border-gray-700"

// Кнопки
className="text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-800"
```

**Добавьте переключатель в Sidebar:**
```tsx
<button
  onClick={() => setDarkMode(!darkMode)}
  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
>
  {darkMode ? '☀️' : '🌙'}
</button>
```

### 3. Шрифты

**Добавьте в index.css:**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Моноширинный для кода */
code, pre, textarea.font-mono {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
}
```

## Добавление новых функций

### 1. Закладки (Bookmarks)

**Обновите types/index.ts:**
```typescript
export interface Page {
  // ... existing fields
  bookmarked?: boolean;
}
```

**Обновите database.ts:**
```sql
ALTER TABLE pages ADD COLUMN bookmarked INTEGER DEFAULT 0;
```

**Добавьте в Editor.tsx:**
```tsx
const handleToggleBookmark = () => {
  onUpdate(page.id, { bookmarked: !page.bookmarked });
};

// В toolbar
<button onClick={handleToggleBookmark}>
  {page.bookmarked ? '⭐ В закладках' : '☆ Добавить'}
</button>
```

### 2. История версий

**Создайте таблицу:**
```typescript
// database.ts
db.exec(`
  CREATE TABLE IF NOT EXISTS page_history (
    id TEXT PRIMARY KEY,
    pageId TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (pageId) REFERENCES pages(id) ON DELETE CASCADE
  )
`);
```

**Функция сохранения:**
```typescript
export function saveVersion(pageId: string, content: string) {
  const id = `version_${Date.now()}`;
  db.prepare(`
    INSERT INTO page_history (id, pageId, content, createdAt)
    VALUES (?, ?, ?, ?)
  `).run(id, pageId, content, Date.now());
}
```

**Вызов при сохранении:**
```typescript
// main.ts в update-page handler
saveVersion(id, data.content);
```

### 3. Связи между страницами (Backlinks)

**Добавьте таблицу:**
```sql
CREATE TABLE IF NOT EXISTS page_links (
  sourceId TEXT NOT NULL,
  targetId TEXT NOT NULL,
  PRIMARY KEY (sourceId, targetId)
);
```

**Парсинг ссылок:**
```typescript
function extractLinks(content: string): string[] {
  // Найти все [[page-id]] в контенте
  const regex = /\[\[(.*?)\]\]/g;
  const matches = content.matchAll(regex);
  return Array.from(matches, m => m[1]);
}
```

**При сохранении:**
```typescript
export function updatePage(id: string, data: UpdatePageData): Page {
  // ... existing code
  
  if (data.content) {
    // Обновить связи
    db.prepare('DELETE FROM page_links WHERE sourceId = ?').run(id);
    const links = extractLinks(data.content);
    const stmt = db.prepare('INSERT INTO page_links VALUES (?, ?)');
    links.forEach(targetId => stmt.run(id, targetId));
  }
  
  return getPage(id)!;
}
```

### 4. Вложения (файлы)

**Таблица:**
```sql
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  pageId TEXT NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  size INTEGER NOT NULL,
  createdAt INTEGER NOT NULL
);
```

**IPC Handler:**
```typescript
// main.ts
ipcMain.handle('attach-file', async (_, pageId: string) => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
  });
  
  if (filePaths[0]) {
    const filename = path.basename(filePaths[0]);
    const destPath = path.join(app.getPath('userData'), 'attachments', filename);
    fs.copyFileSync(filePaths[0], destPath);
    
    // Сохранить в БД
    saveAttachment(pageId, filename, destPath);
  }
});
```

## Расширенный Markdown

### Поддержка таблиц

**В MarkdownEditor.tsx:**
```typescript
// renderMarkdown()
html = html.replace(
  /\|(.+?)\|(.+?)\|/g,
  '<table class="table-auto border-collapse border border-gray-300 my-4">' +
  '<tr>$1</tr></table>'
);
```

### Синтаксис подсветки кода

**Установите highlight.js:**
```bash
npm install highlight.js
```

**Используйте:**
```typescript
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

const renderMarkdown = (text: string) => {
  // ... existing code
  
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const highlighted = lang 
      ? hljs.highlight(code, { language: lang }).value
      : code;
    return `<pre><code class="hljs">${highlighted}</code></pre>`;
  });
};
```

### Математические формулы (LaTeX)

**Установите KaTeX:**
```bash
npm install katex
```

**Рендеринг:**
```typescript
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Inline: $x^2$
html = html.replace(/\$(.+?)\$/g, (_, formula) => {
  return katex.renderToString(formula, { throwOnError: false });
});

// Block: $$...$$
html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
  return katex.renderToString(formula, { 
    displayMode: true,
    throwOnError: false 
  });
});
```

## UI/UX улучшения

### 1. Drag & Drop для файлов

```tsx
// Editor.tsx
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      // Прикрепить изображение
      window.electronAPI.attachFile(page.id, file);
    }
  });
};

<div 
  onDrop={handleDrop}
  onDragOver={(e) => e.preventDefault()}
  className="..."
>
  {/* editor content */}
</div>
```

### 2. Автосохранение

```tsx
// Editor.tsx
useEffect(() => {
  const timer = setTimeout(() => {
    if (hasChanges) {
      handleSave();
    }
  }, 2000); // 2 секунды после последнего изменения
  
  return () => clearTimeout(timer);
}, [title, content, /* other fields */]);
```

### 3. Уведомления

**Установите:**
```bash
npm install react-hot-toast
```

**Используйте:**
```tsx
import toast from 'react-hot-toast';

const handleSave = async () => {
  try {
    await onUpdate(page.id, updates);
    toast.success('Сохранено');
  } catch (err) {
    toast.error('Ошибка сохранения');
  }
};
```

### 4. Командная палитра (Command Palette)

```tsx
// CommandPalette.tsx
const commands = [
  { id: 'new-note', label: 'Создать заметку', icon: '📝', action: () => ... },
  { id: 'new-task', label: 'Создать задачу', icon: '✓', action: () => ... },
  { id: 'search', label: 'Поиск', icon: '🔍', action: () => ... },
  { id: 'export', label: 'Экспорт', icon: '📤', action: () => ... },
];

// Открытие на Ctrl+P
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      setOpen(true);
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

## Интеграция с облаком (опционально)

### Синхронизация с Google Drive

```typescript
// Не рекомендуется для offline-first приложения
// Но если нужно:

// 1. Установите Google Drive API client
npm install googleapis

// 2. Экспорт БД в Drive
ipcMain.handle('backup-to-drive', async () => {
  const dbPath = path.join(app.getPath('userData'), 'workspace.db');
  // Upload to Google Drive
  // ... implementation
});

// 3. Импорт из Drive
ipcMain.handle('restore-from-drive', async () => {
  // Download from Google Drive
  // Replace local DB
});
```

## Производительность

### Виртуализация списка страниц

**Для больших списков (1000+ страниц):**

```bash
npm install react-window
```

```tsx
// PageList.tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={pages.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <PageItem page={pages[index]} />
    </div>
  )}
</FixedSizeList>
```

### Ленивая загрузка изображений

```tsx
<img 
  src={imageSrc} 
  loading="lazy"
  alt="..."
/>
```

## Локализация

### Добавление английского языка

**Создайте i18n.ts:**
```typescript
const translations = {
  ru: {
    'sidebar.inbox': 'Входящие',
    'sidebar.notes': 'Заметки',
    'sidebar.tasks': 'Задачи',
    // ...
  },
  en: {
    'sidebar.inbox': 'Inbox',
    'sidebar.notes': 'Notes',
    'sidebar.tasks': 'Tasks',
    // ...
  }
};

export const t = (key: string, lang: string = 'ru') => {
  return translations[lang]?.[key] || key;
};
```

**Используйте:**
```tsx
import { t } from './i18n';

<button>{t('sidebar.notes', currentLang)}</button>
```

## Безопасность

### Шифрование базы данных

**SQLite шифрование:**
```bash
npm install @journeyapps/sqlcipher
```

```typescript
// database.ts
import Database from '@journeyapps/sqlcipher';

const db = new Database(dbPath);
db.pragma('key = "your-secret-key"');
```

**Запрос пароля при запуске:**
```typescript
// main.ts
const { response } = await dialog.showMessageBox({
  type: 'question',
  buttons: ['OK'],
  defaultId: 0,
  title: 'Пароль',
  message: 'Введите пароль для базы данных',
  // Use custom dialog with input
});
```

## Экспорт и импорт

### Экспорт всей базы в JSON

```typescript
ipcMain.handle('export-all-json', async () => {
  const pages = getPages();
  const json = JSON.stringify(pages, null, 2);
  
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: 'workspace-backup.json',
  });
  
  if (filePath) {
    fs.writeFileSync(filePath, json);
  }
});
```

### Импорт из JSON

```typescript
ipcMain.handle('import-json', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  
  if (filePaths[0]) {
    const json = fs.readFileSync(filePaths[0], 'utf-8');
    const pages = JSON.parse(json);
    
    pages.forEach(page => createPage(page));
  }
});
```

## Заключение

Workspace Lite легко расширяется благодаря модульной архитектуре. Основные точки расширения:

- 🎨 **UI** - Tailwind конфигурация
- 📊 **База данных** - SQLite схема
- 🔧 **Функции** - IPC handlers
- ⌨️ **Горячие клавиши** - App.tsx keyboard handlers
- 🎯 **Типы** - TypeScript interfaces

Экспериментируйте и создавайте идеальное рабочее пространство под свои нужды!