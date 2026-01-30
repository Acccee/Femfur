# Imageboard - Полнофункциональный имиджборд для GitHub Pages

Это полностью рабочий имиджборд с использованием Supabase в качестве базы данных. Все треды и ответы видны всем пользователям в реальном времени.

## 🚀 Возможности

- ✅ 40+ бордов по разным категориям
- ✅ Создание тредов
- ✅ Ответы в тредах
- ✅ Все данные хранятся в Supabase (НЕ localStorage)
- ✅ Работает на GitHub Pages (только frontend)
- ✅ Навигация через hash (#b, #art и т.д.)
- ✅ Адаптивный дизайн

## 📋 Структура проекта

```
imageboard/
├── index.html              # Главная страница
├── css/
│   └── style.css          # Стили
└── js/
    ├── supabaseClient.js  # Клиент Supabase (НАСТРОИТЬ!)
    ├── boards.js          # Логика бордов
    ├── threads.js         # Логика тредов и ответов
    └── app.js             # Главный файл приложения
```

## ⚙️ Настройка Supabase

### Шаг 1: Создание проекта в Supabase

1. Зайдите на https://supabase.com
2. Создайте новый проект
3. Запомните URL и Anon Key вашего проекта

### Шаг 2: Создание таблиц

Выполните следующий SQL в SQL Editor вашего Supabase проекта:

```sql
-- Таблица для тредов
CREATE TABLE threads (
    id BIGSERIAL PRIMARY KEY,
    board TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для ответов
CREATE TABLE replies (
    id BIGSERIAL PRIMARY KEY,
    thread_id BIGINT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_threads_board ON threads(board);
CREATE INDEX idx_threads_created_at ON threads(created_at DESC);
CREATE INDEX idx_replies_thread_id ON replies(thread_id);
CREATE INDEX idx_replies_created_at ON replies(created_at);

-- Включаем Row Level Security
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

-- Политики доступа (все могут читать и писать)
CREATE POLICY "Все могут читать треды"
    ON threads FOR SELECT
    USING (true);

CREATE POLICY "Все могут создавать треды"
    ON threads FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Все могут читать ответы"
    ON replies FOR SELECT
    USING (true);

CREATE POLICY "Все могут создавать ответы"
    ON replies FOR INSERT
    WITH CHECK (true);
```

### Шаг 3: Настройка клиента

Откройте файл `js/supabaseClient.js` и замените:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

На ваши реальные данные из Supabase (Settings → API).

Пример:
```javascript
const SUPABASE_URL = 'https://abcdefgh12345678.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## 🌐 Деплой на GitHub Pages

### Вариант 1: Через интерфейс GitHub

1. Создайте новый репозиторий на GitHub
2. Загрузите все файлы проекта
3. Зайдите в Settings → Pages
4. Source: выберите "Deploy from a branch"
5. Branch: выберите `main` и папку `/ (root)`
6. Нажмите Save
7. Через несколько минут сайт будет доступен по адресу: `https://username.github.io/repository-name/`

### Вариант 2: Через Git командную строку

```bash
# Инициализируйте репозиторий
git init

# Добавьте все файлы
git add .

# Сделайте первый коммит
git commit -m "Initial commit"

# Подключите удалённый репозиторий
git remote add origin https://github.com/username/repository-name.git

# Отправьте на GitHub
git push -u origin main
```

Затем включите GitHub Pages в настройках репозитория.

## 📝 Список бордов

### Art
- `/art/` - Искусство
- `/lit/` - Литература
- `/po/` - Поэзия
- `/mu/` - Музыка
- `/diy/` - DIY
- `/ph/` - Фотография

### Chat
- `/b/` - Random
- `/soc/` - Общение
- `/chat/` - Чат
- `/news/` - Новости
- `/int/` - Международное
- `/r9k/` - Robot9000

### Furry/Anime
- `/fur/` - Furry
- `/a/` - Аниме
- `/vn/` - Визуальные новеллы
- `/cm/` - Cute Male
- `/c/` - Cute

### Games
- `/vg/` - Видеоигры
- `/tg/` - Настольные игры
- `/vr/` - VR
- `/vm/` - Ретро игры
- `/tv/` - ТВ и фильмы
- `/co/` - Комиксы

### IT
- `/g/` - Технологии
- `/pr/` - Программирование
- `/sci/` - Наука
- `/wsr/` - Помощь
- `/3/` - 3D печать

### About live
- `/fit/` - Фитнес
- `/ck/` - Кулинария
- `/fa/` - Мода
- `/adv/` - Советы
- `/trv/` - Путешествия
- `/out/` - Природа

### Hobby
- `/sp/` - Спорт
- `/auto/` - Автомобили
- `/an/` - Животные
- `/his/` - История
- `/p/` - Фотография

### Adult (18+)
- `/e/` - Ecchi
- `/h/` - Hentai
- `/gif/` - Adult GIF

## 🔧 Как это работает

1. **Supabase Client** - Единственный экземпляр клиента создаётся в `supabaseClient.js` и импортируется во всех остальных файлах
2. **Роутинг** - Навигация работает через hash (#), без перезагрузки страницы
3. **Борды** - При выборе борды загружаются её треды из Supabase
4. **Треды** - При клике на тред загружается его содержимое и все ответы
5. **Создание контента** - Все новые треды и ответы сохраняются в Supabase и видны всем пользователям

## 🐛 Устранение проблем

### Ошибка "Identifier 'supabase' has already been declared"
- **Причина**: Дублирование создания клиента Supabase
- **Решение**: Клиент создаётся только один раз в `supabaseClient.js`

### Ошибка "showBoard is not defined"
- **Причина**: Неправильные импорты модулей
- **Решение**: Все функции правильно экспортированы/импортированы через ES6 модули

### Треды не загружаются
- **Проверьте**: Правильно ли указаны SUPABASE_URL и SUPABASE_ANON_KEY
- **Проверьте**: Созданы ли таблицы в Supabase
- **Проверьте**: Включены ли Row Level Security политики

### Не работает на локальном компьютере
- **Причина**: ES6 модули требуют HTTP сервер
- **Решение**: Используйте локальный сервер (например, Live Server в VS Code) или сразу деплойте на GitHub Pages

## 📱 Использование

1. Откройте сайт
2. Выберите борду из списка или верхнего меню
3. Создайте новый тред или откройте существующий
4. Пишите ответы в тредах
5. Все данные видны всем пользователям в реальном времени!

## 🔒 Безопасность

В текущей версии:
- Любой может создавать треды и ответы (анонимно)
- Нет модерации
- Нет удаления контента через интерфейс

Для продакшн использования рекомендуется добавить:
- Капчу
- Модерацию
- Бан пользователей
- Ограничение частоты постинга

## 📄 Лицензия

Свободное использование

## 🤝 Поддержка

При возникновении проблем проверьте:
1. Консоль браузера на наличие ошибок
2. Настройки Supabase
3. Правильность URL и ключей

---

Успешного деплоя! 🚀
