import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  initDatabase,
  createPage,
  getPage,
  getPages,
  updatePage,
  deletePage,
  searchPages,
  getAllTags,
} from './database';
import type { CreatePageData, UpdatePageData, PageFilters, SortBy, PageType } from '../src/types';

let mainWindow: BrowserWindow | null = null;
let dbInitialized = false;

// Инициализация базы данных при старте
async function initializeDatabase() {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
}

function createWindow() {
  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: true, // Оставляем рамку для кнопок закрытия
    titleBarStyle: 'default',
    autoHideMenuBar: true, // Скрываем меню бар (File, Edit и т.д.)
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Workspace Lite',
    backgroundColor: '#ffffff',
    show: false, // Не показываем окно до полной загрузки
  });

  // В режиме разработки загружаем с Vite dev server
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL!;
    console.log('Loading dev server:', devUrl);
    mainWindow.loadURL(devUrl).catch((err) => {
      console.error('Failed to load dev server:', err);
    });
    // DevTools только в режиме разработки
    mainWindow.webContents.openDevTools();
  } else {
    // В production загружаем собранные файлы
    // В asar: __dirname = app.asar/dist-electron/electron
    // Поднимаемся на два уровня вверх и заходим в dist/
    const indexPath = path.join(__dirname, '../../dist/index.html');
    console.log('Loading production file:', indexPath);
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load production file:', err);
    });
  }

  // Обработка ошибок загрузки
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL, errorCode, errorDescription);
  });

  // Показываем окно после загрузки контента
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('Page loaded successfully');
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await initializeDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// CRUD операции
ipcMain.handle('create-page', async (_, data: CreatePageData) => {
  try {
    return createPage(data);
  } catch (error) {
    console.error('Error occurred in handler for \'create-page\':', error);
    throw error;
  }
});

ipcMain.handle('get-page', async (_, id: string) => {
  try {
    return getPage(id);
  } catch (error) {
    console.error('Error occurred in handler for \'get-page\':', error);
    throw error;
  }
});

ipcMain.handle('get-pages', async (_, filters?: PageFilters, sortBy?: SortBy) => {
  try {
    return getPages(filters, sortBy);
  } catch (error) {
    console.error('Error occurred in handler for \'get-pages\':', error);
    throw error;
  }
});

ipcMain.handle('update-page', async (_, id: string, data: UpdatePageData) => {
  try {
    return updatePage(id, data);
  } catch (error) {
    console.error('Error occurred in handler for \'update-page\':', error);
    throw error;
  }
});

ipcMain.handle('delete-page', async (_, id: string) => {
  try {
    return deletePage(id);
  } catch (error) {
    console.error('Error occurred in handler for \'delete-page\':', error);
    throw error;
  }
});

// Поиск
ipcMain.handle('search-pages', async (_, query: string) => {
  return searchPages(query);
});

// Теги
ipcMain.handle('get-all-tags', async () => {
  return getAllTags();
});

// Получение шаблонов
ipcMain.handle('get-templates', async (_, type?: PageType) => {
  try {
    const filters: PageFilters = { tags: ['_template'] };
    if (type) {
      filters.type = type;
    }
    return getPages(filters, 'updatedAt');
  } catch (error) {
    console.error('Error occurred in handler for \'get-templates\':', error);
    throw error;
  }
});

// Шаблоны
ipcMain.handle('create-from-template', async (_, type: PageType, templateId?: string) => {
  // Если указан ID шаблона, используем его
  if (templateId) {
    const template = getPage(templateId);
    if (template && template.tags?.includes('_template') && template.type === type) {
      // Создаем новую страницу на основе шаблона, убирая тег _template
      const templateData: CreatePageData = {
        type: template.type,
        title: template.title,
        content: template.content,
        tags: template.tags.filter(t => t !== '_template'),
        taskStatus: template.taskStatus,
        taskPriority: template.taskPriority,
        taskDueDate: template.taskDueDate,
        docOwner: template.docOwner,
        docVersion: template.docVersion,
        docApproved: template.docApproved,
      };
      return createPage(templateData);
    }
  }
  
  // Ищем сохраненные шаблоны с нужным типом
  const savedTemplates = getPages({ type, tags: ['_template'] }, 'updatedAt');
  if (savedTemplates.length > 0) {
    // Используем первый найденный шаблон
    const template = savedTemplates[0];
    const templateData: CreatePageData = {
      type: template.type,
      title: template.title,
      content: template.content,
      tags: template.tags.filter(t => t !== '_template'),
      taskStatus: template.taskStatus,
      taskPriority: template.taskPriority,
      taskDueDate: template.taskDueDate,
      docOwner: template.docOwner,
      docVersion: template.docVersion,
      docApproved: template.docApproved,
    };
    return createPage(templateData);
  }
  
  // Если сохраненных шаблонов нет, используем стандартные
  const defaultTemplates: Record<PageType, CreatePageData> = {
    note: {
      type: 'note',
      title: 'Новая заметка',
      content: '# Заголовок\n\nНачните писать...',
      tags: [],
    },
    task: {
      type: 'task',
      title: 'Новая задача',
      content: '## Описание\n\n...\n\n## Чеклист\n\n- [ ] Пункт 1\n- [ ] Пункт 2',
      tags: [],
      taskStatus: 'backlog',
      taskPriority: 'med',
    },
    doc: {
      type: 'doc',
      title: 'Новая инструкция',
      content: '# Название инструкции\n\n## Описание\n\n...\n\n## Процедура\n\n1. Шаг 1\n2. Шаг 2',
      tags: [],
      docVersion: '1.0',
      docApproved: false,
    },
  };
  
  return createPage(defaultTemplates[type]);
});

// Экспорт в Markdown
ipcMain.handle('export-page-to-markdown', async (_, id: string) => {
  const page = getPage(id);
  if (!page) throw new Error('Страница не найдена');
  
  const { filePath } = await dialog.showSaveDialog(mainWindow!, {
    title: 'Экспорт в Markdown',
    defaultPath: `${page.title}.md`,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
  });
  
  if (!filePath) return;
  
  let content = `# ${page.title}\n\n`;
  
  // Метаданные
  content += `**Тип:** ${getTypeLabel(page.type)}\n`;
  content += `**Создано:** ${new Date(page.createdAt).toLocaleString('ru-RU')}\n`;
  content += `**Обновлено:** ${new Date(page.updatedAt).toLocaleString('ru-RU')}\n`;
  
  if (page.tags.length > 0) {
    content += `**Теги:** ${page.tags.join(', ')}\n`;
  }
  
  if (page.type === 'task') {
    content += `**Статус:** ${getTaskStatusLabel(page.taskStatus)}\n`;
    if (page.taskPriority) {
      content += `**Приоритет:** ${getTaskPriorityLabel(page.taskPriority)}\n`;
    }
    if (page.taskDueDate) {
      content += `**Срок:** ${new Date(page.taskDueDate).toLocaleDateString('ru-RU')}\n`;
    }
  }
  
  if (page.type === 'doc') {
    if (page.docOwner) content += `**Ответственный:** ${page.docOwner}\n`;
    if (page.docVersion) content += `**Версия:** ${page.docVersion}\n`;
    content += `**Утверждено:** ${page.docApproved ? 'Да' : 'Нет'}\n`;
  }
  
  content += `\n---\n\n${page.content}`;
  
  fs.writeFileSync(filePath, content, 'utf-8');
});

// Экспорт задач в CSV
ipcMain.handle('export-tasks-to-csv', async (_, filters?: PageFilters) => {
  const pages = getPages({ ...filters, type: 'task' });
  
  const { filePath } = await dialog.showSaveDialog(mainWindow!, {
    title: 'Экспорт задач в CSV',
    defaultPath: 'tasks.csv',
    filters: [
      { name: 'CSV', extensions: ['csv'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
  });
  
  if (!filePath) return;
  
  let csv = 'Название,Статус,Приоритет,Срок,Теги,Создано,Обновлено\n';
  
  pages.forEach(page => {
    const row = [
      escapeCSV(page.title),
      escapeCSV(getTaskStatusLabel(page.taskStatus)),
      escapeCSV(getTaskPriorityLabel(page.taskPriority)),
      page.taskDueDate ? new Date(page.taskDueDate).toLocaleDateString('ru-RU') : '',
      escapeCSV(page.tags.join(', ')),
      new Date(page.createdAt).toLocaleString('ru-RU'),
      new Date(page.updatedAt).toLocaleString('ru-RU'),
    ];
    csv += row.join(',') + '\n';
  });
  
  fs.writeFileSync(filePath, '\uFEFF' + csv, 'utf-8'); // BOM для правильного отображения в Excel
});

// Восстановление фокуса окна (для исправления проблем с вводом после dialogs)
ipcMain.handle('restore-window-focus', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Быстрый blur/focus окна - минимально заметный
    mainWindow.blur();
    mainWindow.focus();
    mainWindow.webContents.focus();
  }
});

// Вспомогательные функции

function getTypeLabel(type: PageType): string {
  const labels = { note: 'Заметка', task: 'Задача', doc: 'Инструкция' };
  return labels[type];
}

function getTaskStatusLabel(status?: string): string {
  if (!status) return '';
  const labels = { backlog: 'Бэклог', in_progress: 'В работе', done: 'Выполнено' };
  return labels[status as keyof typeof labels] || status;
}

function getTaskPriorityLabel(priority?: string): string {
  if (!priority) return '';
  const labels = { low: 'Низкий', med: 'Средний', high: 'Высокий' };
  return labels[priority as keyof typeof labels] || priority;
}

function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}