#!/usr/bin/env node

/**
 * Переименовывает скомпилированные .js файлы Electron в .cjs
 * для совместимости с "type": "module" в package.json
 */

const fs = require('fs');
const path = require('path');

const electronDir = path.join(__dirname, '../dist-electron/electron');

if (!fs.existsSync(electronDir)) {
  console.log('dist-electron/electron не существует. Запустите компиляцию сначала.');
  process.exit(1);
}

const files = ['main.js', 'preload.js', 'database.js'];

files.forEach(file => {
  const jsPath = path.join(electronDir, file);
  const cjsPath = path.join(electronDir, file.replace('.js', '.cjs'));
  
  if (fs.existsSync(jsPath)) {
    fs.renameSync(jsPath, cjsPath);
    console.log(`✓ Переименован: ${file} → ${file.replace('.js', '.cjs')}`);
  }
});

// Обновляем пути к импортам внутри всех .cjs файлов
files.forEach(file => {
  const cjsFile = file.replace('.js', '.cjs');
  const cjsPath = path.join(electronDir, cjsFile);
  
  if (fs.existsSync(cjsPath)) {
    let content = fs.readFileSync(cjsPath, 'utf-8');
    
    // Заменяем require('./database') на require('./database.cjs')
    content = content.replace(/require\(['"]\.\/database['"]\)/g, "require('./database.cjs')");
    content = content.replace(/require\(['"]\.\/preload['"]\)/g, "require('./preload.cjs')");
    content = content.replace(/require\(['"]\.\/main['"]\)/g, "require('./main.cjs')");
    
    // Заменяем пути к preload.js в path.join (для Electron webPreferences)
    content = content.replace(/preload\.js/g, 'preload.cjs');
    
    fs.writeFileSync(cjsPath, content, 'utf-8');
  }
});

console.log('✓ Обновлены пути к импортам в .cjs файлах');
console.log('Готово!');
