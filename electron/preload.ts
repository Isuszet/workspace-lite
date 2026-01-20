import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../src/types';

const electronAPI: ElectronAPI = {
  createPage: (data) => ipcRenderer.invoke('create-page', data),
  getPage: (id) => ipcRenderer.invoke('get-page', id),
  getPages: (filters, sortBy) => ipcRenderer.invoke('get-pages', filters, sortBy),
  updatePage: (id, data) => ipcRenderer.invoke('update-page', id, data),
  deletePage: (id) => ipcRenderer.invoke('delete-page', id),
  
  searchPages: (query) => ipcRenderer.invoke('search-pages', query),
  
  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  
  exportPageToMarkdown: (id) => ipcRenderer.invoke('export-page-to-markdown', id),
  exportTasksToCsv: (filters) => ipcRenderer.invoke('export-tasks-to-csv', filters),
  
  createFromTemplate: (type, templateId) => ipcRenderer.invoke('create-from-template', type, templateId),
  getTemplates: (type) => ipcRenderer.invoke('get-templates', type),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);