export type PageType = 'note' | 'task' | 'doc';

export type TaskStatus = 'backlog' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'med' | 'high';

export interface Page {
  id: string;
  type: PageType;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  
  // Поля для задач
  taskStatus?: TaskStatus;
  taskDueDate?: number;
  taskPriority?: TaskPriority;
  
  // Поля для инструкций
  docOwner?: string;
  docVersion?: string;
  docApproved?: boolean;
}

export interface PageFilters {
  type?: PageType;
  tags?: string[];
  taskStatus?: TaskStatus;
  searchQuery?: string;
}

export type SortBy = 'updatedAt' | 'createdAt' | 'dueDate' | 'priority';

export interface CreatePageData {
  type: PageType;
  title: string;
  content?: string;
  tags?: string[];
  taskStatus?: TaskStatus;
  taskDueDate?: number;
  taskPriority?: TaskPriority;
  docOwner?: string;
  docVersion?: string;
  docApproved?: boolean;
}

export interface UpdatePageData {
  title?: string;
  content?: string;
  tags?: string[];
  pinned?: boolean;
  taskStatus?: TaskStatus;
  taskDueDate?: number;
  taskPriority?: TaskPriority;
  docOwner?: string;
  docVersion?: string;
  docApproved?: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  type: PageType;
  snippet: string;
}

// API для preload
export interface ElectronAPI {
  // CRUD операции
  createPage: (data: CreatePageData) => Promise<Page>;
  getPage: (id: string) => Promise<Page | null>;
  getPages: (filters?: PageFilters, sortBy?: SortBy) => Promise<Page[]>;
  updatePage: (id: string, data: UpdatePageData) => Promise<Page>;
  deletePage: (id: string) => Promise<void>;
  
  // Поиск
  searchPages: (query: string) => Promise<SearchResult[]>;
  
  // Теги
  getAllTags: () => Promise<string[]>;
  
  // Экспорт
  exportPageToMarkdown: (id: string) => Promise<void>;
  exportTasksToCsv: (filters?: PageFilters) => Promise<void>;
  
  // Шаблоны
  createFromTemplate: (type: PageType, templateId?: string) => Promise<Page>;
  getTemplates: (type?: PageType) => Promise<Page[]>;
  
  // Утилиты окна
  restoreWindowFocus: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}