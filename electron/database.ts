import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { Page, CreatePageData, UpdatePageData, PageFilters, SortBy, SearchResult, TaskStatus, TaskPriority } from '../src/types';

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'workspace.db');

// Создаём директорию если её нет
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

let db: SqlJsDatabase;
let SQL: any;

// Инициализация sql.js
async function initSqlJsDb() {
  // В Electron используем локальный путь к WASM файлу
  // В development: node_modules/sql.js/dist/sql-wasm.wasm
  // В production: resources/sql-wasm.wasm (из extraResources)
  const appPath = app.getAppPath();
  const resourcesPath = process.resourcesPath || appPath;
  
  // Пробуем найти WASM файл в разных местах
  const possiblePaths = [
    path.join(resourcesPath, 'sql-wasm.wasm'), // Production (extraResources)
    path.join(appPath, 'resources', 'sql-wasm.wasm'), // Production альтернативный путь
    path.join(appPath, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'), // Development
  ];
  
  let wasmPath = possiblePaths.find(p => fs.existsSync(p));
  if (!wasmPath) {
    // Если не нашли, используем первый путь (будет ошибка, но попробуем)
    wasmPath = possiblePaths[0];
    console.warn('WASM file not found in expected locations, trying:', wasmPath);
  }
  
  SQL = await initSqlJs({
    locateFile: (file) => {
      if (file.endsWith('.wasm')) {
        return wasmPath!;
      }
      return `https://sql.js.org/dist/${file}`;
    }
  });

  // Загружаем существующую БД или создаём новую
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
}

// Сохранение БД на диск
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Инициализация базы данных
export async function initDatabase() {
  await initSqlJsDb();

  // Основная таблица страниц
  db.run(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('note', 'task', 'doc')),
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      pinned INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      
      taskStatus TEXT CHECK(taskStatus IS NULL OR taskStatus IN ('backlog', 'in_progress', 'done')),
      taskDueDate INTEGER,
      taskPriority TEXT CHECK(taskPriority IS NULL OR taskPriority IN ('low', 'med', 'high')),
      
      docOwner TEXT,
      docVersion TEXT,
      docApproved INTEGER
    )
  `);

  // Индексы для производительности
  db.run(`CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pages_pinned ON pages(pinned DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pages_updatedAt ON pages(updatedAt DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pages_createdAt ON pages(createdAt DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pages_taskStatus ON pages(taskStatus)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pages_taskDueDate ON pages(taskDueDate)`);

  saveDatabase();

  // Создаём примеры данных при первом запуске
  const result = db.exec('SELECT COUNT(*) as count FROM pages');
  const count = result[0]?.values[0]?.[0] || 0;
  
  if (count === 0) {
    createInitialData();
  }
}

function createInitialData() {
  const now = Date.now();
  
  // Приветственная инструкция
  db.run(`
    INSERT INTO pages (id, type, title, content, tags, pinned, createdAt, updatedAt, docOwner, docVersion, docApproved)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'welcome-doc',
    'doc',
    '👋 Добро пожаловать в Workspace Lite',
    `# Добро пожаловать в Workspace Lite!

Это ваше персональное офлайн-рабочее пространство для организации заметок, задач и документации.

## 🚀 Основные возможности

### Заметки
Создавайте и организуйте свои идеи, мысли и информацию. Поддержка Markdown-форматирования.

### Задачи
Управляйте своими задачами с:
- Статусами (Бэклог, В работе, Выполнено)
- Дедлайнами
- Приоритетами (Низкий, Средний, Высокий)

### Инструкции
Храните рабочую документацию с:
- Указанием ответственного
- Версионированием
- Статусом утверждения

## ⌨️ Горячие клавиши

- **Ctrl+N** — Создать новую страницу
- **Ctrl+K** — Открыть поиск
- **Ctrl+Enter** — Отметить задачу как выполненную

## 🏷️ Организация

Используйте **теги** для категоризации страниц и **закрепление** для быстрого доступа к важным документам.

## 📤 Экспорт

- Экспортируйте страницы в Markdown
- Экспортируйте списки задач в CSV

---

*Все данные хранятся локально на вашем компьютере. Никакой синхронизации с облаком.*`,
    JSON.stringify(['руководство', 'начало']),
    1,
    now,
    now,
    'Система',
    '1.0',
    1
  ]);

  // Пример задачи
  db.run(`
    INSERT INTO pages (id, type, title, content, tags, pinned, createdAt, updatedAt, taskStatus, taskPriority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    'example-task',
    'task',
    'Изучить возможности Workspace Lite',
    `## Описание

Познакомиться с основными функциями приложения:

- [ ] Создать новую заметку
- [ ] Добавить теги к странице
- [ ] Попробовать поиск (Ctrl+K)
- [ ] Экспортировать страницу в Markdown
- [ ] Изменить статус задачи

## Заметки

Workspace Lite — это полностью офлайн приложение. Все данные хранятся локально в SQLite базе данных.`,
    JSON.stringify(['пример', 'обучение']),
    0,
    now - 1000,
    now - 1000,
    'in_progress',
    'high'
  ]);

  saveDatabase();
}

// Вспомогательная функция для конвертации строки БД в объект Page
function rowToPage(row: any): Page {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    tags: JSON.parse(row.tags),
    pinned: Boolean(row.pinned),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    taskStatus: row.taskStatus,
    taskDueDate: row.taskDueDate,
    taskPriority: row.taskPriority,
    docOwner: row.docOwner,
    docVersion: row.docVersion,
    docApproved: row.docApproved ? Boolean(row.docApproved) : undefined,
  };
}

// CRUD операции

export function createPage(data: CreatePageData): Page {
  const id = `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  
  db.run(`
    INSERT INTO pages (
      id, type, title, content, tags, pinned, createdAt, updatedAt,
      taskStatus, taskDueDate, taskPriority,
      docOwner, docVersion, docApproved
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.type,
    data.title,
    data.content || '',
    JSON.stringify(data.tags || []),
    0,
    now,
    now,
    data.taskStatus || null,
    data.taskDueDate || null,
    data.taskPriority || null,
    data.docOwner || null,
    data.docVersion || null,
    data.docApproved ? 1 : null
  ]);
  
  saveDatabase();
  return getPage(id)!;
}

export function getPage(id: string): Page | null {
  const result = db.exec('SELECT * FROM pages WHERE id = ?', [id]);
  if (!result[0] || !result[0].values[0]) return null;
  
  const columns = result[0].columns;
  const values = result[0].values[0];
  const row: any = {};
  columns.forEach((col, idx) => {
    row[col] = values[idx];
  });
  
  return rowToPage(row);
}

export function getPages(filters?: PageFilters, sortBy: SortBy = 'updatedAt'): Page[] {
  let query = 'SELECT * FROM pages WHERE 1=1';
  const params: any[] = [];
  
  if (filters?.type) {
    query += ' AND type = ?';
    params.push(filters.type);
  }
  
  if (filters?.tags && filters.tags.length > 0) {
    const tagConditions = filters.tags.map(() => 'tags LIKE ?').join(' OR ');
    query += ` AND (${tagConditions})`;
    filters.tags.forEach(tag => params.push(`%"${tag}"%`));
  }
  
  if (filters?.taskStatus) {
    query += ' AND taskStatus = ?';
    params.push(filters.taskStatus);
  }
  
  // Сортировка
  const sortMap: Record<SortBy, string> = {
    updatedAt: 'pinned DESC, updatedAt DESC',
    createdAt: 'pinned DESC, createdAt DESC',
    dueDate: 'pinned DESC, taskDueDate ASC, updatedAt DESC',
    priority: `pinned DESC, CASE taskPriority WHEN 'high' THEN 1 WHEN 'med' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, updatedAt DESC`
  };
  
  query += ` ORDER BY ${sortMap[sortBy]}`;
  
  const result = db.exec(query, params);
  if (!result[0]) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(values => {
    const row: any = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx];
    });
    return rowToPage(row);
  });
}

export function updatePage(id: string, data: UpdatePageData): Page {
  const updates: string[] = [];
  const params: any[] = [];
  
  if (data.title !== undefined) {
    updates.push('title = ?');
    params.push(data.title);
  }
  
  if (data.content !== undefined) {
    updates.push('content = ?');
    params.push(data.content);
  }
  
  if (data.tags !== undefined) {
    updates.push('tags = ?');
    params.push(JSON.stringify(data.tags));
  }
  
  if (data.pinned !== undefined) {
    updates.push('pinned = ?');
    params.push(data.pinned ? 1 : 0);
  }
  
  if (data.taskStatus !== undefined) {
    updates.push('taskStatus = ?');
    // Нормализуем пустые строки и недопустимые значения в null
    const validStatuses: TaskStatus[] = ['backlog', 'in_progress', 'done'];
    const normalizedStatus = validStatuses.includes(data.taskStatus) ? data.taskStatus : null;
    params.push(normalizedStatus);
  }
  
  if (data.taskDueDate !== undefined) {
    updates.push('taskDueDate = ?');
    params.push(data.taskDueDate);
  }
  
  if (data.taskPriority !== undefined) {
    updates.push('taskPriority = ?');
    // Нормализуем пустые строки и недопустимые значения в null
    const validPriorities: TaskPriority[] = ['low', 'med', 'high'];
    const normalizedPriority = validPriorities.includes(data.taskPriority) ? data.taskPriority : null;
    params.push(normalizedPriority);
  }
  
  if (data.docOwner !== undefined) {
    updates.push('docOwner = ?');
    params.push(data.docOwner);
  }
  
  if (data.docVersion !== undefined) {
    updates.push('docVersion = ?');
    params.push(data.docVersion);
  }
  
  if (data.docApproved !== undefined) {
    updates.push('docApproved = ?');
    params.push(data.docApproved ? 1 : 0);
  }
  
  updates.push('updatedAt = ?');
  params.push(Date.now());
  
  params.push(id);
  
  db.run(`UPDATE pages SET ${updates.join(', ')} WHERE id = ?`, params);
  saveDatabase();
  
  return getPage(id)!;
}

export function deletePage(id: string): void {
  db.run('DELETE FROM pages WHERE id = ?', [id]);
  saveDatabase();
}

// Поиск (простой, без FTS5 в sql.js)
export function searchPages(query: string): SearchResult[] {
  if (!query.trim() || query.length < 2) return [];
  
  const searchQuery = `%${query.toLowerCase()}%`;
  const result = db.exec(`
    SELECT id, title, type, content
    FROM pages
    WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?
    ORDER BY 
      CASE 
        WHEN LOWER(title) LIKE ? THEN 1
        ELSE 2
      END,
      updatedAt DESC
    LIMIT 20
  `, [searchQuery, searchQuery, searchQuery]);
  
  if (!result[0]) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(values => {
    const row: any = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx];
    });
    
    // Создаём snippet с подсветкой
    const content = row.content as string;
    const lowerContent = content.toLowerCase();
    const index = lowerContent.indexOf(query.toLowerCase());
    
    let snippet = '';
    if (index !== -1) {
      const start = Math.max(0, index - 30);
      const end = Math.min(content.length, index + query.length + 30);
      snippet = (start > 0 ? '...' : '') + 
                content.substring(start, end) + 
                (end < content.length ? '...' : '');
      
      // Добавляем подсветку
      const regex = new RegExp(`(${query})`, 'gi');
      snippet = snippet.replace(regex, '<mark>$1</mark>');
    } else {
      snippet = content.substring(0, 100) + (content.length > 100 ? '...' : '');
    }
    
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      snippet
    };
  });
}

// Теги
export function getAllTags(): string[] {
  const result = db.exec('SELECT DISTINCT tags FROM pages');
  if (!result[0]) return [];
  
  const tagSet = new Set<string>();
  result[0].values.forEach((row) => {
    const tags = JSON.parse(row[0] as string) as string[];
    tags.forEach(tag => tagSet.add(tag));
  });
  
  return Array.from(tagSet).sort();
}