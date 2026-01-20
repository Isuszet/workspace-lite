// Скрипт для исправления проблемы с winCodeSign на Windows
// Скачивает rcedit напрямую из репозитория

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const cacheDir = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign', 'winCodeSign-2.6.0');
const rceditPath = path.join(cacheDir, 'rcedit-x64.exe');

// URL для скачивания rcedit
const RCEDIT_URL = 'https://github.com/electron/rcedit/releases/download/v1.1.1/rcedit-x64.exe';

console.log('Fixing winCodeSign issue...');
console.log('Cache directory:', cacheDir);

// Создаем папку если её нет
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
  console.log('Created cache directory');
}

// Проверяем, есть ли уже rcedit
if (fs.existsSync(rceditPath)) {
  console.log('rcedit-x64.exe already exists, skipping download');
  process.exit(0);
}

console.log('Downloading rcedit-x64.exe...');

// Скачиваем файл
const file = fs.createWriteStream(rceditPath);
https.get(RCEDIT_URL, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Следуем редиректу
    https.get(response.headers.location, (redirectResponse) => {
      redirectResponse.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Downloaded successfully!');
        console.log('You can now run: npm run dist');
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Downloaded successfully!');
      console.log('You can now run: npm run dist');
    });
  }
}).on('error', (err) => {
  fs.unlink(rceditPath, () => {});
  console.error('Download failed:', err.message);
  console.log('\nManual fix:');
  console.log('1. Download rcedit from: ' + RCEDIT_URL);
  console.log('2. Save to: ' + rceditPath);
  process.exit(1);
});
