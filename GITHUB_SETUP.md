# 🚀 Загрузка проекта на GitHub и настройка распространения

## Шаг 1: Создание репозитория на GitHub

1. Перейдите на [GitHub.com](https://github.com) и войдите в аккаунт
2. Нажмите кнопку **"New repository"** (или **"+"** → **"New repository"**)
3. Заполните форму:
   - **Repository name**: `workspace-lite` (или любое другое имя)
   - **Description**: "Офлайн рабочее пространство для заметок, задач и инструкций"
   - **Visibility**: Public (или Private, если не хотите открытый доступ)
   - **НЕ** добавляйте README, .gitignore или лицензию (они уже есть)
4. Нажмите **"Create repository"**

---

## Шаг 2: Инициализация Git и загрузка кода

### Если Git еще не инициализирован:

```bash
# Инициализация Git репозитория
git init

# Добавление всех файлов (кроме тех, что в .gitignore)
git add .

# Первый коммит
git commit -m "Initial commit: Workspace Lite v1.0.0"

# Добавление remote репозитория (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/workspace-lite.git

# Переименование основной ветки в main (если нужно)
git branch -M main

# Загрузка кода на GitHub
git push -u origin main
```

### Если Git уже инициализирован:

```bash
# Проверьте текущий remote
git remote -v

# Если remote нет, добавьте:
git remote add origin https://github.com/YOUR_USERNAME/workspace-lite.git

# Если remote уже есть, обновите URL:
git remote set-url origin https://github.com/YOUR_USERNAME/workspace-lite.git

# Загрузите код
git add .
git commit -m "Update: Add installer configuration and documentation"
git push -u origin main
```

---

## Шаг 3: Настройка GitHub Actions (автоматическая сборка)

GitHub Actions автоматически соберет установщики при каждом релизе.

### Создайте файл `.github/workflows/build.yml`:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Build installers
        run: npm run dist
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: installers-${{ matrix.os }}
          path: release/*
          retention-days: 30
      
      - name: Create Release
        if: startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v1
        with:
          files: release/*
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Создайте папку и файл:**

```bash
# Создайте папку для workflows
mkdir -p .github/workflows

# Скопируйте содержимое выше в файл .github/workflows/build.yml
```

Или я могу создать этот файл автоматически.

---

## Шаг 4: Создание первого релиза

### Вариант 1: Через GitHub веб-интерфейс (рекомендуется для первого раза)

1. Перейдите на страницу репозитория на GitHub
2. Нажмите **"Releases"** → **"Create a new release"**
3. Заполните форму:
   - **Tag version**: `v1.0.0` (или другая версия)
   - **Release title**: `Workspace Lite v1.0.0`
   - **Description**: 
     ```markdown
     ## 🎉 Первый релиз Workspace Lite
     
     ### Что нового:
     - ✅ Установщики для Windows, macOS и Linux
     - ✅ Автоматическое создание ярлыков
     - ✅ Полная функциональность заметок, задач и инструкций
     - ✅ Шаблоны и поиск
     
     ### Установка:
     1. Скачайте установщик для вашей ОС
     2. Запустите установщик
     3. Готово! Запустите через ярлык на рабочем столе
     ```
   - **Attach binaries**: Пока оставьте пустым (добавите после ручной сборки)
4. Нажмите **"Publish release"**

### Вариант 2: Через Git теги (для автоматической сборки)

```bash
# Создайте тег
git tag -a v1.0.0 -m "Release v1.0.0"

# Загрузите тег на GitHub
git push origin v1.0.0
```

GitHub Actions автоматически соберет установщики и прикрепит их к релизу.

---

## Шаг 5: Ручная сборка и загрузка установщиков (если нужно)

Если GitHub Actions еще не настроен или нужно быстро загрузить установщики:

### Соберите установщики локально:

```bash
# Соберите для вашей платформы
npm run dist
```

### Загрузите установщики в релиз:

1. Перейдите на страницу релиза на GitHub
2. Нажмите **"Edit release"**
3. В разделе **"Attach binaries"** перетащите файлы из папки `release/`:
   - Windows: `Workspace Lite Setup 1.0.0.exe`
   - macOS: `Workspace Lite-1.0.0.dmg`
   - Linux: `Workspace Lite-1.0.0-x64.AppImage`
4. Нажмите **"Update release"**

---

## Шаг 6: Обновление README с ссылками на релизы

Добавьте в начало `README.md`:

```markdown
## 📥 Скачать

[![Latest Release](https://img.shields.io/github/v/release/YOUR_USERNAME/workspace-lite)](https://github.com/YOUR_USERNAME/workspace-lite/releases/latest)

**Скачайте установщик для вашей ОС:**
- 🪟 [Windows](https://github.com/YOUR_USERNAME/workspace-lite/releases/latest/download/Workspace-Lite-Setup-1.0.0.exe)
- 🍎 [macOS](https://github.com/YOUR_USERNAME/workspace-lite/releases/latest/download/Workspace-Lite-1.0.0.dmg)
- 🐧 [Linux AppImage](https://github.com/YOUR_USERNAME/workspace-lite/releases/latest/download/Workspace-Lite-1.0.0-x64.AppImage)

📖 **Подробные инструкции по установке:** [INSTALLATION.md](INSTALLATION.md)
```

---

## 🎯 Быстрая инструкция для пользователей

После загрузки на GitHub, пользователи смогут:

1. **Перейти на страницу репозитория**
2. **Найти раздел "Releases"** (справа на странице)
3. **Скачать установщик** для своей ОС
4. **Установить и запустить** через ярлык

---

## ✅ Чек-лист перед публикацией

- [ ] Код загружен на GitHub
- [ ] README.md обновлен с информацией о проекте
- [ ] .gitignore настроен правильно
- [ ] GitHub Actions workflow создан (опционально, но рекомендуется)
- [ ] Первый релиз создан
- [ ] Установщики загружены в релиз
- [ ] README содержит ссылки на скачивание

---

## 🔄 Обновление релизов

### При выпуске новой версии:

1. Обновите версию в `package.json`:
   ```json
   "version": "1.0.1"
   ```

2. Закоммитьте изменения:
   ```bash
   git add package.json
   git commit -m "Bump version to 1.0.1"
   git push
   ```

3. Создайте новый тег:
   ```bash
   git tag -a v1.0.1 -m "Release v1.0.1"
   git push origin v1.0.1
   ```

4. GitHub Actions автоматически соберет и загрузит установщики

---

**Готово! Теперь пользователи смогут скачать и установить ваше приложение прямо с GitHub!** 🚀
