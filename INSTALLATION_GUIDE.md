# Femfur Imageboard - Полная инструкция по установке

## 🚨 ВАЖНО: Исправление текущих проблем

### Проблема 1: Content не сохраняется в треды
**Причина**: Поле заполняется, но что-то не так с формой или обработкой.

**Решение:**
1. Откройте браузер → F12 → Console
2. Создайте тред
3. Посмотрите что выводится в консоль
4. Если видите ошибку Supabase - проверьте credentials в `js/supabaseClient.js`

**Проверка что content передается:**
```javascript
// В js/app.js, в функции handleNewThreadSubmit добавьте временно:
console.log('Creating thread:', {
    board: currentBoard,
    title: title,
    content: content,
    imageFile: imageFile
});
```

### Проблема 2: Ошибка "Could not find table 'public.reactions'"
**Причина**: Таблица reactions не создана в Supabase.

**Решение:**
1. Откройте Supabase Dashboard
2. SQL Editor
3. Скопируйте и выполните весь код из файла `SETUP_REACTIONS.sql`
4. Нажмите RUN
5. Готово!

---

## 📦 Полная установка с нуля

### Шаг 1: Настройка Supabase

#### 1.1 Создайте проект
1. Зайдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Запомните:
   - URL проекта: `https://xxx.supabase.co`
   - anon/public key: `eyJhbGc...`

#### 1.2 Выполните SQL схему
1. SQL Editor → New Query
2. Откройте файл `database_schema.sql`
3. Скопируйте и вставьте весь код
4. RUN
5. Откройте файл `SETUP_REACTIONS.sql`
6. Скопируйте и вставьте
7. RUN

#### 1.3 Создайте Storage Buckets
1. Storage → New Bucket
2. Создайте следующие buckets (все PUBLIC):
   - `avatars` (для аватаров пользователей)
   - `threads` (для изображений в тредах)
   - `replies` (для изображений в ответах)

**Настройка Public Access:**
```
Bucket → Policies → New Policy:
- Policy Name: Public read
- Allowed operation: SELECT
- Policy definition: USING (true)
```

#### 1.4 Проверьте таблицы
Должны быть созданы:
- ✅ users
- ✅ threads  
- ✅ replies
- ✅ reactions

### Шаг 2: Настройка кода

#### 2.1 Обновите credentials
Откройте `js/supabaseClient.js`:

```javascript
const SUPABASE_URL = 'https://ВАШ_ПРОЕКТ.supabase.co'
const SUPABASE_KEY = 'ВАШ_ANON_KEY'
```

Найдите их в: Supabase Dashboard → Project Settings → API

#### 2.2 Проверьте структуру файлов
```
femfur-final/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── auth.js
│   ├── boards.js
│   ├── threads.js
│   ├── search.js
│   ├── reactions.js
│   ├── thread-actions.js
│   ├── text-formatting.js
│   ├── widgets.js
│   ├── profile.js
│   ├── i18n.js
│   └── supabaseClient.js
├── locales/
│   ├── en.json
│   ├── ru.json
│   └── uk.json
├── assets/
│   └── fav.png
├── database_schema.sql
├── SETUP_REACTIONS.sql
└── CLOUDFLARE_DDOS_PROTECTION.md
```

### Шаг 3: Деплой

#### Вариант A: GitHub Pages
1. Создайте репозиторий на GitHub
2. Загрузите все файлы
3. Settings → Pages
4. Source: main branch
5. Сайт будет доступен по адресу: `https://username.github.io/repo-name`

#### Вариант B: Netlify
1. Зайдите на [netlify.com](https://netlify.com)
2. Drag and Drop папку `femfur-final`
3. Сайт будет доступен сразу

#### Вариант C: Vercel
1. Зайдите на [vercel.com](https://vercel.com)
2. Import project
3. Выберите папку
4. Deploy

#### Вариант D: Свой хостинг
1. Загрузите все файлы через FTP
2. Убедитесь что сервер поддерживает HTTPS
3. Настройте Cloudflare (см. CLOUDFLARE_DDOS_PROTECTION.md)

### Шаг 4: Подключение домена

#### 4.1 Если используете Cloudflare
1. Добавьте домен в Cloudflare
2. Обновите DNS записи:
```
Type: CNAME
Name: @
Content: ваш-хостинг.com
Proxy: ON (оранжевое облако)
```

#### 4.2 SSL сертификат
Cloudflare дает бесплатный SSL автоматически!

Если не используете Cloudflare:
- GitHub Pages: SSL автоматически
- Netlify: SSL автоматически
- Vercel: SSL автоматически
- Свой хостинг: используйте Let's Encrypt

---

## 🐛 Решение проблем

### Проблема: "Failed to load data"
**Причины:**
1. Неправильные credentials в `supabaseClient.js`
2. RLS policies не настроены
3. Таблицы не созданы

**Решение:**
1. Проверьте Console (F12) на ошибки
2. Проверьте Supabase → API Settings
3. Проверьте Authentication → Policies

### Проблема: "Cannot upload images"
**Причины:**
1. Storage buckets не созданы
2. Buckets не public
3. Неправильные policies

**Решение:**
1. Storage → Создайте buckets
2. Bucket → Configuration → Public: ON
3. Bucket → Policies → Allow all

### Проблема: Форматирование не работает
**Причины:**
1. Модуль text-formatting.js не загружен
2. Toolbar не инициализирован

**Решение:**
1. Проверьте что файл `js/text-formatting.js` существует
2. Проверьте Console на ошибки import
3. Проверьте что `addFormattingToolbar()` вызывается в `init()`

### Проблема: Реакции не работают
**Причины:**
1. Таблица reactions не создана
2. Пользователь не авторизован

**Решение:**
1. Выполните `SETUP_REACTIONS.sql` в Supabase
2. Проверьте что пользователь залогинен
3. Проверьте Console на ошибки

### Проблема: Поиск ничего не находит
**Причины:**
1. GIN индексы не созданы
2. Нет тредов/ответов в базе

**Решение:**
1. Выполните SQL для создания индексов (в `SETUP_REACTIONS.sql`)
2. Создайте несколько тредов для тестирования

---

## 🧪 Тестирование

### 1. Тест создания треда
1. Откройте сайт
2. Выберите борд (например /b/)
3. Нажмите "Create Thread"
4. Заполните Title и Content (минимум 1 символ)
5. Опционально: прикрепите изображение
6. Нажмите "Create"
7. Тред должен появиться в списке

### 2. Тест поиска
1. Создайте несколько тредов с разным текстом
2. Нажмите 🔍 в header
3. Введите поисковый запрос
4. Должны появиться результаты с подсветкой

### 3. Тест реакций
1. Зарегистрируйтесь
2. Войдите в аккаунт
3. Откройте тред
4. Нажмите на реакцию (💀 🤡 based cringe schizo)
5. Счетчик должен увеличиться
6. Кнопка должна подсветиться

### 4. Тест форматирования
1. Создайте тред или ответ
2. Используйте форматирование:
   - **жирный**: `**текст**`
   - *курсив*: `*текст*`
   - `код`: `` `текст` ``
3. Отправьте
4. Текст должен быть отформатирован

### 5. Тест редактирования/удаления
1. Создайте тред (будучи залогиненным)
2. Откройте этот тред
3. Должны появиться кнопки ✏️ Edit и 🗑️ Delete
4. Нажмите Edit → измените → Save
5. Изменения должны сохраниться

---

## 📊 Мониторинг

### Supabase Dashboard
- Table Editor: смотрите данные
- API Logs: смотрите запросы
- Database: смотрите производительность

### Browser Console (F12)
- Смотрите ошибки JavaScript
- Смотрите network requests
- Дебажьте проблемы

### Cloudflare Analytics
- Смотрите трафик
- Смотрите заблокированные атаки
- Мониторьте производительность

---

## 🎯 Чеклист после установки

- [ ] Supabase проект создан
- [ ] Все таблицы созданы (users, threads, replies, reactions)
- [ ] Storage buckets созданы (avatars, threads, replies)
- [ ] RLS policies настроены
- [ ] Credentials обновлены в supabaseClient.js
- [ ] Сайт задеплоен
- [ ] Домен подключен (опционально)
- [ ] Cloudflare настроен (опционально, но рекомендуется)
- [ ] SSL сертификат работает
- [ ] Тестовый тред создается
- [ ] Поиск работает
- [ ] Реакции работают
- [ ] Форматирование работает

---

## 🆘 Получение помощи

### 1. Проверьте Console
99% проблем видно в Browser Console (F12).

### 2. Проверьте Supabase Logs
API logs показывают все запросы и ошибки.

### 3. Проверьте Network Tab
Смотрите какие requests failed и почему.

### 4. Типичные ошибки:

**"Invalid API key"**
→ Проверьте SUPABASE_KEY в supabaseClient.js

**"Table does not exist"**
→ Выполните database_schema.sql и SETUP_REACTIONS.sql

**"Permission denied"**
→ Проверьте RLS policies в Supabase

**"CORS error"**
→ Supabase должен быть настроен на ваш домен

---

## 🎉 Готово!

После выполнения всех шагов у вас будет:
- ✅ Полнофункциональный имиджборд
- ✅ Поиск по всему контенту
- ✅ Система реакций
- ✅ Форматирование текста
- ✅ Редактирование/удаление тредов
- ✅ Защита от DDoS (через Cloudflare)
- ✅ Красивый modern UI
- ✅ Темная тема
- ✅ Мультиязычность

**Удачи с вашим имиджбордом! 🚀**
