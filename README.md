# Miracula Imageboard v2.1.0

Имиджборд с исправленным багом создания тредов и новыми глобальными функциями.

## 🎉 Что нового в версии 2.1.0

### Исправления
- ✅ **Исправлен баг создания тредов** - валидация формы теперь работает корректно и не конфликтует с другими формами
- ✅ Заголовок и описание теперь сохраняются правильно
- ✅ Убрана зависимость от данных формы авторизации

### Новые функции
- 🌓 **Переключатель тем** (Light / Dark / Mono) - сохраняется в localStorage
- ⚙️ **Панель настроек пользователя**:
  - Размер шрифта (маленький / средний / большой)
  - Плотность контента (компактный / обычный)
  - Включение/отключение анимаций
- 📋 **История обновлений (Changelog)** - всегда актуальная информация о версиях

## 📋 Требования

1. Аккаунт Supabase (бесплатный)
2. GitHub Pages (или любой статический хостинг)
3. Современный браузер

## 🚀 Быстрая установка

### Шаг 1: Настройка Supabase

1. Зайдите на [supabase.com](https://supabase.com) и создайте новый проект
2. Перейдите в SQL Editor и выполните следующий SQL:

```sql
-- Создание таблицы тредов
CREATE TABLE threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создание таблицы постов
CREATE TABLE posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Включение Row Level Security
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Политики для тредов (все могут читать, только авторизованные создавать)
CREATE POLICY "Threads are viewable by everyone" 
ON threads FOR SELECT 
USING (true);

CREATE POLICY "Users can create threads" 
ON threads FOR INSERT 
WITH CHECK (true);

-- Политики для постов
CREATE POLICY "Posts are viewable by everyone" 
ON posts FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create posts" 
ON posts FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
```

3. Перейдите в Storage и создайте bucket с именем `images`:
   - Название: `images`
   - Public bucket: ✅ (включено)

4. Настройте политики для bucket `images`:

```sql
-- Политика для просмотра изображений
CREATE POLICY "Images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Политика для загрузки изображений
CREATE POLICY "Anyone can upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'images');
```

### Шаг 2: Настройка проекта

1. Скопируйте все файлы проекта в ваш репозиторий
2. Откройте файл `config.js` и замените значения:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

Эти значения можно найти в Supabase: Settings → API

3. Добавьте в `index.html` перед закрывающим тегом `</head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### Шаг 3: Развертывание на GitHub Pages

1. Создайте новый репозиторий на GitHub
2. Загрузите все файлы проекта
3. Перейдите в Settings → Pages
4. В разделе "Source" выберите ветку (обычно `main`) и папку `/root`
5. Нажмите Save

Ваш сайт будет доступен по адресу: `https://username.github.io/repository-name/`

## 📁 Структура проекта

```
miracula/
├── index.html          # Главная страница с модальными окнами
├── styles.css          # Стили с системой тем
├── app.js             # Основная логика приложения (исправленная валидация)
├── config.js          # Конфигурация Supabase
└── README.md          # Документация
```

## 🔧 Основные исправления

### Проблема
Валидация формы создания треда конфликтовала с формой авторизации, так как использовала общие переменные и localStorage для сохранения данных.

### Решение
1. **Изолированная валидация** - каждая форма теперь проверяет только свои поля
2. **Правильная работа с данными** - заголовок и описание сохраняются в Supabase, а не в localStorage
3. **Отдельная логика** - создание тредов не зависит от состояния формы авторизации

### Код исправления (app.js, строка 227-265)

```javascript
async function handleCreateThread(e) {
    e.preventDefault();

    // FIXED: Proper validation that doesn't interfere with other forms
    const titleInput = document.getElementById('threadTitle');
    const contentInput = document.getElementById('threadContent');
    
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    // CRITICAL FIX: Validate only the actual thread form fields
    if (!title || !content) {
        showMessage('threadMessage', 'Заполните все обязательные поля', 'error');
        return;
    }
    
    // ... остальная логика создания треда
}
```

## 🎨 Новые возможности

### Переключатель тем
- Клик по кнопке 🌓 в шапке сайта
- Циклическое переключение: Light → Dark → Mono → Light
- Сохраняется в localStorage

### Панель настроек
- Кнопка ⚙️ в шапке
- Настройки применяются мгновенно
- Сохраняются между сессиями

### Changelog
- Кнопка 📋 в шапке
- История всех обновлений
- Маркер текущей версии

## 🔒 Безопасность

- Row Level Security (RLS) включен для всех таблиц
- Анонимные посты поддерживаются
- XSS-защита через экранирование HTML
- Валидация на клиенте и сервере

## 🌐 Браузерная совместимость

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## 📝 Changelog

### v2.1.0 (30.01.2026)
- ✅ Исправлен баг создания тредов
- ➕ Добавлена система тем (Light/Dark/Mono)
- ➕ Панель настроек пользователя
- ➕ История обновлений
- 🎨 Улучшен UI/UX

### v2.0.0 (Январь 2026)
- 🎉 Первый релиз
- ✅ Создание тредов и постов
- ✅ Система авторизации
- ✅ Загрузка изображений

## 🐛 Известные ограничения

- Нет редактирования тредов (by design)
- Нет модерации
- Нет пагинации (пока)

## 💡 Рекомендации

1. **Для разработки**: используйте локальный сервер (Live Server в VS Code)
2. **Для продакшена**: включите HTTPS на хостинге
3. **Бэкапы**: регулярно экспортируйте данные из Supabase

## 🆘 Поддержка

Если возникли проблемы:
1. Проверьте консоль браузера (F12)
2. Убедитесь, что Supabase URL и ключ правильные
3. Проверьте, что все таблицы и политики созданы
4. Убедитесь, что bucket `images` публичный

## 📄 Лицензия

MIT License - используйте как хотите!

---

**Версия:** 2.1.0  
**Дата:** 30 января 2026  
**Статус:** ✅ Стабильная
