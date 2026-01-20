import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Проверка наличия electronAPI
if (!window.electronAPI) {
  console.error('window.electronAPI is not defined! Make sure preload script is loaded.');
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; color: #dc2626;">
      <div style="text-align: center; padding: 2rem;">
        <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">⚠️ Ошибка загрузки</h1>
        <p>Не удалось загрузить Electron API. Проверьте консоль для деталей.</p>
        <p style="margin-top: 1rem; font-size: 0.875rem; color: #6b7280;">window.electronAPI is undefined</p>
      </div>
    </div>
  `;
} else {
  // Применяем сохраненную тему при загрузке
  const savedTheme = localStorage.getItem('theme') || 'system';
  const root = document.documentElement;
  
  // Удаляем класс dark сначала
  root.classList.remove('dark');
  
  if (savedTheme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    }
    
    // Слушаем изменения системной темы
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    });
  } else if (savedTheme === 'dark') {
    root.classList.add('dark');
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}