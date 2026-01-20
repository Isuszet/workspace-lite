# Порядок загрузки приложения Workspace Lite

## Общая схема

```
1. Electron Main Process запускается
   ↓
2. Инициализация базы данных
   ↓
3. Создание окна приложения
   ↓
4. Загрузка preload скрипта
   ↓
5. Загрузка HTML/React приложения
   ↓
6. Инициализация React компонентов
   ↓
7. Загрузка данных из базы
```

---

## Детальный порядок загрузки

### 1. Main Process (electron/main.ts)

**Событие: `app.whenReady()`**

```typescript
app.whenReady().then(async () => {
  await initializeDatabase();  // Шаг 2
  createWindow();              // Шаг 3
});
```

**Последовательность:**
1. ✅ Electron приложение готово к работе
2. ⏳ Ожидание инициализации базы данных
3. ⏳ Создание главного окна

---

### 2. Инициализация базы данных (electron/database.ts)

**Функция: `initDatabase()`**

```typescript
async function initDatabase() {
  await initSqlJsDb();           // 2.1 Загрузка sql.js WASM
  // 2.2 Создание таблиц и индексов
  // 2.3 Проверка наличия данных
  // 2.4 Создание начальных данных (если БД пустая)
}
```

**Детали:**

#### 2.1. Инициализация sql.js
- Загрузка WASM файла `sql-wasm.wasm`
- Создание или загрузка существующей БД из `workspace.db`
- Путь: `app.getPath('userData')/workspace.db`

#### 2.2. Создание схемы БД
- Таблица `pages` с полями и CHECK constraints
- Индексы для производительности:
  - `idx_pages_type`
  - `idx_pages_pinned`
  - `idx_pages_updatedAt`
  - `idx_pages_createdAt`
  - `idx_pages_taskStatus`
  - `idx_pages_taskDueDate`

#### 2.3. Проверка данных
```sql
SELECT COUNT(*) FROM pages
```

#### 2.4. Создание начальных данных (если count === 0)
- Приветственная инструкция (`welcome-doc`)
- Пример задачи (`example-task`)

---

### 3. Создание окна (electron/main.ts)

**Функция: `createWindow()`**

```typescript
function createWindow() {
  // 3.1 Создание BrowserWindow
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),  // Шаг 4
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,  // Окно скрыто до загрузки
  });
  
  // 3.2 Загрузка контента
  if (isDev) {
    mainWindow.loadURL(devUrl);  // http://127.0.0.1:5173
  } else {
    mainWindow.loadFile(indexPath);  // dist/index.html
  }
  
  // 3.3 Показ окна после загрузки
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow?.show();  // Шаг 5
  });
}
```

**Последовательность:**
1. ✅ Создание BrowserWindow (скрыто)
2. ⏳ Загрузка preload скрипта
3. ⏳ Загрузка HTML/React приложения
4. ✅ Событие `did-finish-load` → показ окна

---

### 4. Preload скрипт (electron/preload.ts)

**Загружается автоматически при создании окна**

```typescript
// 4.1 Создание API объекта
const electronAPI: ElectronAPI = {
  createPage: (data) => ipcRenderer.invoke('create-page', data),
  getPage: (id) => ipcRenderer.invoke('get-page', id),
  getPages: (filters, sortBy) => ipcRenderer.invoke('get-pages', filters, sortBy),
  // ... остальные методы
};

// 4.2 Экспозиция в renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

**Результат:**
- `window.electronAPI` доступен в renderer process
- Безопасный мост между main и renderer процессами

---

### 5. React приложение (src/main.tsx)

**Точка входа: `main.tsx`**

```typescript
// 5.1 Проверка наличия electronAPI
if (!window.electronAPI) {
  // Показ ошибки
} else {
  // 5.2 Применение темы из localStorage
  const savedTheme = localStorage.getItem('theme') || 'system';
  
  // 5.3 Рендеринг React приложения
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
```

**Последовательность:**
1. ✅ Проверка `window.electronAPI`
2. ✅ Применение темы (light/dark/system)
3. ✅ Рендеринг `<App />`

---

### 6. React компонент App (src/App.tsx)

**Инициализация состояния:**

```typescript
function App() {
  // 6.1 Инициализация state
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [currentView, setCurrentView] = useState('inbox');
  // ... остальные состояния
  
  // 6.2 Загрузка данных (useEffect)
  useEffect(() => {
    loadPages();   // Шаг 7.1
    loadTags();    // Шаг 7.2
  }, [loadPages, loadTags]);
}
```

**Последовательность:**
1. ✅ Инициализация всех state переменных
2. ✅ Рендеринг компонентов (Sidebar, PageList, Editor)
3. ⏳ Вызов `useEffect` → загрузка данных

---

### 7. Загрузка данных из базы

#### 7.1. Загрузка страниц

```typescript
const loadPages = useCallback(async () => {
  const loadedPages = await window.electronAPI.getPages(filters, sortBy);
  setPages(loadedPages);
}, [filters, sortBy]);
```

**Поток:**
```
App.tsx: loadPages()
  ↓
window.electronAPI.getPages()
  ↓
IPC: 'get-pages' handler (main.ts)
  ↓
database.ts: getPages()
  ↓
SQL: SELECT * FROM pages WHERE ... ORDER BY ...
  ↓
Возврат Page[]
  ↓
App.tsx: setPages(loadedPages)
  ↓
Рендеринг PageList с данными
```

#### 7.2. Загрузка тегов

```typescript
const loadTags = useCallback(async () => {
  const tags = await window.electronAPI.getAllTags();
  setAllTags(tags);
}, []);
```

**Поток:**
```
App.tsx: loadTags()
  ↓
window.electronAPI.getAllTags()
  ↓
IPC: 'get-all-tags' handler (main.ts)
  ↓
database.ts: getAllTags()
  ↓
SQL: SELECT DISTINCT tags FROM pages
  ↓
Парсинг JSON и извлечение уникальных тегов
  ↓
Возврат string[]
  ↓
App.tsx: setAllTags(tags)
  ↓
Передача в Sidebar для отображения
```

---

## Временная диаграмма

```
Время →
│
├─ 0ms:    Electron app.whenReady()
│
├─ 10ms:   initDatabase() начинается
│   ├─ 20ms:   initSqlJsDb() - загрузка WASM
│   ├─ 100ms:  Создание таблиц и индексов
│   ├─ 120ms:  Проверка COUNT(*)
│   └─ 150ms:  createInitialData() (если нужно)
│
├─ 200ms:  createWindow() начинается
│   ├─ 210ms:  BrowserWindow создан (скрыт)
│   ├─ 220ms:  preload.cjs загружен
│   ├─ 230ms:  HTML начинает загружаться
│   └─ 300ms:  did-finish-load → окно показано
│
├─ 310ms:  main.tsx выполняется
│   ├─ 320ms:  Проверка window.electronAPI ✅
│   ├─ 330ms:  Применение темы
│   └─ 340ms:  ReactDOM.render(<App />)
│
├─ 350ms:  App.tsx монтируется
│   ├─ 360ms:  Инициализация state
│   ├─ 370ms:  Рендеринг компонентов (пустые)
│   └─ 380ms:  useEffect → loadPages() + loadTags()
│
├─ 400ms:  IPC запросы к базе
│   ├─ 410ms:  get-pages → SQL запрос
│   ├─ 420ms:  get-all-tags → SQL запрос
│   └─ 430ms:  Данные возвращены
│
└─ 450ms:  setPages() + setAllTags() → UI обновлен
```

---

## Критические зависимости

### ⚠️ Блокирующие операции

1. **Инициализация БД** (блокирует создание окна)
   - Загрузка WASM файла
   - Создание схемы БД
   - Первый запуск: создание начальных данных

2. **Загрузка preload скрипта** (блокирует загрузку HTML)
   - Должен загрузиться до загрузки HTML
   - Создает `window.electronAPI`

3. **Загрузка данных** (блокирует отображение контента)
   - `getPages()` - получение списка страниц
   - `getAllTags()` - получение тегов

### ✅ Неблокирующие операции

- Рендеринг React компонентов (может быть пустым)
- Применение темы
- Регистрация IPC handlers (происходит синхронно)

---

## Оптимизации

### Текущие оптимизации:

1. **Окно скрыто до загрузки**
   ```typescript
   show: false  // Показывается только после did-finish-load
   ```

2. **Параллельная загрузка данных**
   ```typescript
   useEffect(() => {
     loadPages();   // Параллельно
     loadTags();    // Параллельно
   }, []);
   ```

3. **Локальное обновление состояния**
   ```typescript
   // Вместо перезагрузки всех страниц
   setPages(prevPages => 
     prevPages.map(p => p.id === id ? updated : p)
   );
   ```

### Возможные улучшения:

1. **Ленивая загрузка тегов** (загружать только при открытии вкладки Tags)
2. **Кэширование данных** (не перезагружать при каждом изменении фильтров)
3. **Виртуализация списка** (для больших объемов данных)

---

## Обработка ошибок

### На каждом этапе:

1. **Инициализация БД**
   ```typescript
   try {
     await initDatabase();
   } catch (error) {
     console.error('Database initialization failed:', error);
     // Приложение не запустится
   }
   ```

2. **Загрузка окна**
   ```typescript
   mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
     console.error('Failed to load:', errorDescription);
   });
   ```

3. **Проверка electronAPI**
   ```typescript
   if (!window.electronAPI) {
     // Показ ошибки в UI
   }
   ```

4. **IPC handlers**
   ```typescript
   ipcMain.handle('update-page', async (_, id, data) => {
     try {
       return updatePage(id, data);
     } catch (error) {
       console.error('Error occurred in handler:', error);
       throw error;  // Пробрасывается в renderer
     }
   });
   ```

---

## Резюме

**Порядок загрузки:**
1. Main Process → инициализация БД
2. Main Process → создание окна
3. Preload → экспозиция API
4. Renderer → загрузка HTML/React
5. React → монтирование App
6. React → загрузка данных через IPC
7. UI → отображение данных

**Ключевые моменты:**
- БД инициализируется **до** создания окна
- Preload загружается **до** HTML
- Данные загружаются **после** монтирования React
- Все операции с БД асинхронные через IPC
