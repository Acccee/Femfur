# Femfur Imageboard - Setup Guide

Пошаговая инструкция по установке и настройке имиджборда Femfur.

## 📋 Требования

- Аккаунт на [Supabase](https://supabase.com) (бесплатный)
- Аккаунт на [GitHub](https://github.com) (бесплатный)
- Базовые знания Git

## 🚀 Шаг 1: Создание проекта Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Нажмите "Start your project"
3. Войдите через GitHub
4. Создайте новую организацию (если нужно)
5. Нажмите "New project"
6. Заполните форму:
   - **Name**: `femfur` (или любое другое имя)
   - **Database Password**: создайте надёжный пароль (сохраните его!)
   - **Region**: выберите ближайший к вашим пользователям регион
   - **Pricing Plan**: Free (бесплатный)
7. Нажмите "Create new project"
8. Дождитесь завершения создания проекта (~2 минуты)

## 🗄️ Шаг 2: Настройка базы данных

1. В левом меню выберите **SQL Editor**
2. Нажмите "+ New query"
3. Скопируйте весь содержимое файла `database_schema.sql`
4. Вставьте в редактор SQL
5. Нажмите "Run" (или Ctrl/Cmd + Enter)
6. Убедитесь, что все таблицы созданы успешно (проверьте в Table Editor)

### Проверка таблиц

В меню Table Editor должны появиться три таблицы:
- ✅ `users`
- ✅ `threads`
- ✅ `replies`

## 📦 Шаг 3: Настройка Storage (хранилища изображений)

1. В левом меню выберите **Storage**
2. Нажмите "Create a new bucket"
3. Заполните форму:
   - **Name**: `image` (обязательно именно это имя!)
   - **Public bucket**: ✅ Включите эту опцию
4. Нажмите "Create bucket"

### Настройка политик доступа

1. Выберите созданный bucket `image`
2. Перейдите на вкладку **Policies**
3. Нажмите "New policy"

**Политика 1: Public Read (чтение)**
- Template: Custom
- Policy name: `Public read access`
- Allowed operation: `SELECT`
- Target roles: `public`
- USING expression: `(bucket_id = 'image'::text)`
- Нажмите "Review" → "Save policy"

**Политика 2: Public Upload (загрузка)**
- Снова нажмите "New policy"
- Template: Custom
- Policy name: `Public upload access`
- Allowed operation: `INSERT`
- Target roles: `public`
- WITH CHECK expression: `(bucket_id = 'image'::text)`
- Нажмите "Review" → "Save policy"

## 🔑 Шаг 4: Получение ключей API

1. В левом меню выберите **Settings** (значок шестерёнки)
2. Выберите **API**
3. Найдите и скопируйте:
   - **Project URL** (например: `https://abcdefgh.supabase.co`)
   - **anon public** ключ (длинная строка, начинающаяся с `eyJ...`)

⚠️ **Важно**: Сохраните эти данные, они понадобятся в следующем шаге!

## 💻 Шаг 5: Настройка кода

1. Откройте файл `js/supabaseClient.js`
2. Найдите строки:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

3. Замените на ваши данные из предыдущего шага:
```javascript
const SUPABASE_URL = 'https://abcdefgh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

4. Сохраните файл

## 🌐 Шаг 6: Создание favicon (иконки сайта)

Создайте файл `assets/fav.png` - это иконка вашего сайта, которая будет отображаться во вкладке браузера.

Размер: 32x32 пикселя или 64x64 пикселя
Формат: PNG

Если у вас нет своей иконки, можете использовать любой онлайн-генератор favicon или оставить пустым файл.

## 📤 Шаг 7: Загрузка на GitHub

### Создание репозитория

1. Перейдите на [github.com](https://github.com)
2. Нажмите "+" в правом верхнем углу → "New repository"
3. Заполните форму:
   - **Repository name**: `femfur` (или любое другое имя)
   - **Public**: ✅ Выберите public
   - НЕ создавайте README, .gitignore или license (они уже есть в проекте)
4. Нажмите "Create repository"

### Загрузка файлов

**Вариант A: Через GitHub Web Interface (проще)**

1. На странице созданного репозитория нажмите "uploading an existing file"
2. Перетащите все файлы проекта в окно браузера
3. Напишите commit message: "Initial commit"
4. Нажмите "Commit changes"

**Вариант B: Через Git CLI**

```bash
# В папке с проектом выполните:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ваш-username/femfur.git
git push -u origin main
```

## 🌍 Шаг 8: Активация GitHub Pages

1. В репозитории перейдите в **Settings**
2. В левом меню выберите **Pages**
3. В разделе "Build and deployment":
   - **Source**: Deploy from a branch
   - **Branch**: main
   - **Folder**: / (root)
4. Нажмите "Save"
5. Подождите 1-2 минуты
6. Обновите страницу
7. Вверху появится ссылка на ваш сайт: `https://ваш-username.github.io/femfur/`

## ✅ Шаг 9: Проверка работы

1. Откройте ваш сайт (ссылка из предыдущего шага)
2. Проверьте:
   - ✅ Главная страница загружается
   - ✅ Переключение языков работает
   - ✅ Можно открыть любую борду
   - ✅ Можно зарегистрироваться
   - ✅ Можно создать тред
   - ✅ Можно ответить в треде
   - ✅ Изображения загружаются

### Если что-то не работает

**Проблема**: Ошибки подключения к Supabase

**Решение**: 
1. Проверьте URL и ключ API в `supabaseClient.js`
2. Убедитесь, что bucket `image` создан и публичный
3. Проверьте политики доступа в Storage

**Проблема**: "Failed to load"

**Решение**:
1. Откройте Console в браузере (F12)
2. Проверьте ошибки
3. Убедитесь, что все таблицы созданы в Supabase

## 🎨 Шаг 10: Кастомизация (опционально)

### Изменение названия

В `index.html` найдите:
```html
<h1><a href="/" id="logo">Femfur</a></h1>
```

Замените `Femfur` на своё название.

### Изменение цветовой схемы

В `css/style.css` найдите переменные цветов:
```css
#eef2ff  /* Фон страницы */
#d6daf0  /* Фон блоков */
#af0a0f  /* Красный акцент */
#34345c  /* Тёмно-синий */
```

Замените на свои цвета.

### Добавление/удаление бордов

В `js/boards.js` найдите объект `BOARDS` и добавьте/удалите нужные борды.

Не забудьте также обновить список в `index.html` в разделе board-categories!

## 🔧 Дополнительные настройки

### Модерация

Для модерации контента вам нужно будет:

1. Создать таблицу `moderators` в Supabase
2. Добавить флаги `is_deleted` в таблицы threads и replies
3. Создать админ-панель

Это выходит за рамки базовой установки.

### Аналитика

Добавьте Google Analytics или другой трекер в `index.html` перед закрывающим тегом `</head>`.

### Кастомный домен

1. Купите домен (например, на Namecheap)
2. В настройках домена добавьте CNAME запись:
   - Name: `@` или `www`
   - Value: `ваш-username.github.io`
3. В репозитории Settings → Pages → Custom domain добавьте свой домен
4. Включите "Enforce HTTPS"

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте Console в браузере (F12)
2. Проверьте логи в Supabase (Logs)
3. Создайте Issue в GitHub репозитории

## 🎉 Готово!

Ваш имиджборд готов к использованию! 

Не забудьте:
- 📢 Поделиться ссылкой с друзьями
- 🛡️ Следить за контентом
- 🔄 Регулярно делать бэкапы базы данных
- 📊 Мониторить использование ресурсов Supabase

Удачи! 🚀
