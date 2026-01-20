#!/usr/bin/env node

/**
 * Скрипт сборки Workspace Lite
 * Упрощает процесс компиляции и упаковки приложения
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execute(command, description) {
  log(`\n📦 ${description}...`, colors.blue);
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} завершено`, colors.green);
    return true;
  } catch (error) {
    log(`❌ Ошибка: ${description}`, colors.red);
    return false;
  }
}

function clean() {
  log('\n🧹 Очистка предыдущих сборок...', colors.yellow);
  
  const dirsToClean = ['dist', 'dist-electron', 'release'];
  dirsToClean.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      log(`  Удалено: ${dir}`, colors.reset);
    }
  });
  
  log('✅ Очистка завершена', colors.green);
}

function checkDependencies() {
  log('\n🔍 Проверка зависимостей...', colors.blue);
  
  if (!fs.existsSync('node_modules')) {
    log('⚠️  node_modules не найден. Запуск npm install...', colors.yellow);
    execute('npm install', 'Установка зависимостей');
  } else {
    log('✅ Зависимости установлены', colors.green);
  }
}

function buildFrontend() {
  return execute('npx vite build', 'Сборка фронтенда (Vite)');
}

function buildElectron() {
  return execute('npx tsc -p tsconfig.electron.json', 'Компиляция Electron (TypeScript)');
}

function packageApp(platform = null) {
  let command = 'npx electron-builder';
  
  if (platform) {
    command += ` --${platform}`;
  }
  
  return execute(command, `Упаковка приложения${platform ? ` для ${platform}` : ''}`);
}

function showBuildInfo() {
  log('\n' + '='.repeat(60), colors.bright);
  log('  Workspace Lite - Build Script', colors.bright);
  log('='.repeat(60), colors.bright);
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  log(`\n  Версия: ${packageJson.version}`, colors.blue);
  log(`  Название: ${packageJson.name}`, colors.blue);
  log(`  Автор: ${packageJson.author || 'N/A'}`, colors.blue);
  log('\n' + '='.repeat(60), colors.bright);
}

function showSuccess() {
  log('\n' + '✨'.repeat(30), colors.green);
  log('  🎉 Сборка успешно завершена!', colors.bright + colors.green);
  log('✨'.repeat(30) + '\n', colors.green);
  
  log('📦 Результаты сборки находятся в папке release/', colors.blue);
  
  if (fs.existsSync('release')) {
    const files = fs.readdirSync('release');
    log('\nСозданные файлы:', colors.yellow);
    files.forEach(file => {
      const stats = fs.statSync(path.join('release', file));
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      log(`  • ${file} (${sizeMB} MB)`, colors.reset);
    });
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  showBuildInfo();
  
  switch (command) {
    case 'clean':
      clean();
      break;
      
    case 'frontend':
      checkDependencies();
      buildFrontend();
      break;
      
    case 'electron':
      checkDependencies();
      buildElectron();
      break;
      
    case 'dev':
      checkDependencies();
      log('\n🚀 Запуск в режиме разработки...', colors.blue);
      execute('npm run electron:dev', 'Development mode');
      break;
      
    case 'package':
      clean();
      checkDependencies();
      if (buildFrontend() && buildElectron()) {
        execute('npx electron-builder --dir', 'Упаковка без инсталлятора');
      }
      break;
      
    case 'win':
    case 'windows':
      clean();
      checkDependencies();
      if (buildFrontend() && buildElectron()) {
        packageApp('win');
        showSuccess();
      }
      break;
      
    case 'mac':
    case 'macos':
      clean();
      checkDependencies();
      if (buildFrontend() && buildElectron()) {
        packageApp('mac');
        showSuccess();
      }
      break;
      
    case 'linux':
      clean();
      checkDependencies();
      if (buildFrontend() && buildElectron()) {
        packageApp('linux');
        showSuccess();
      }
      break;
      
    case 'all':
    default:
      clean();
      checkDependencies();
      
      if (!buildFrontend()) {
        log('\n❌ Сборка остановлена из-за ошибки', colors.red);
        process.exit(1);
      }
      
      if (!buildElectron()) {
        log('\n❌ Сборка остановлена из-за ошибки', colors.red);
        process.exit(1);
      }
      
      if (packageApp()) {
        showSuccess();
      } else {
        log('\n❌ Упаковка не удалась', colors.red);
        process.exit(1);
      }
      break;
      
    case 'help':
    case '--help':
    case '-h':
      log('\n📖 Использование:', colors.bright);
      log('  node scripts/build.cjs [команда]\n', colors.reset);
      log('Доступные команды:', colors.yellow);
      log('  all (default)  - Полная сборка для текущей платформы', colors.reset);
      log('  clean          - Очистка папок сборки', colors.reset);
      log('  frontend       - Сборка только фронтенда', colors.reset);
      log('  electron       - Компиляция только Electron', colors.reset);
      log('  package        - Упаковка без инсталлятора', colors.reset);
      log('  win/windows    - Сборка для Windows', colors.reset);
      log('  mac/macos      - Сборка для macOS', colors.reset);
      log('  linux          - Сборка для Linux', colors.reset);
      log('  dev            - Запуск в режиме разработки', colors.reset);
      log('  help           - Показать эту справку', colors.reset);
      log('', colors.reset);
      break;
      
    default:
      log(`\n❌ Неизвестная команда: ${command}`, colors.red);
      log('Используйте "node scripts/build.cjs help" для справки\n', colors.yellow);
      process.exit(1);
  }
}

// Запуск
main();
