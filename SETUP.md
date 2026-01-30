# 🚀 Быстрая установка Miracula v2.1.0

## Шаг 1: Supabase SQL (5 минут)

Зайдите в SQL Editor вашего Supabase проекта и выполните:

```sql
-- Таблицы
CREATE TABLE threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Политики
CREATE POLICY "Threads viewable by everyone" ON threads FOR SELECT USING (true);
CREATE POLICY "Users can create threads" ON threads FOR INSERT WITH CHECK (true);
CREATE POLICY "Posts viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (true);
```

## Шаг 2: Storage (2 минуты)

1. Перейдите в Storage
2. Создайте bucket: `images`
3. Сделайте его Public ✅

Выполните в SQL Editor:

```sql
CREATE POLICY "Images publicly accessible" ON storage.objects 
FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Anyone can upload images" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'images');
```

## Шаг 3: Конфигурация (1 минута)

Откройте `config.js` и вставьте ваши данные:

```javascript
const SUPABASE_URL = 'https://ВАШ-ПРОЕКТ.supabase.co';
const SUPABASE_ANON_KEY = 'ВАШ-КЛЮЧ';
```

Найти в Supabase: **Settings → API**

## Шаг 4: Деплой (3 минуты)

### GitHub Pages:
1. Создайте репозиторий
2. Загрузите все файлы
3. Settings → Pages → Source: main branch
4. Готово! 🎉

### Или локально:
```bash
# В VS Code установите расширение "Live Server"
# Правый клик на index.html → Open with Live Server
```

## ✅ Проверка

1. Откройте сайт
2. Нажмите "Регистрация"
3. Создайте аккаунт
4. Создайте тестовый тред
5. Проверьте новые функции:
   - 🌓 Переключатель тем
   - ⚙️ Настройки
   - 📋 Changelog

## 🐛 Если что-то не работает

1. **Проверьте консоль** (F12 → Console)
2. **Проверьте Supabase URL** в config.js
3. **Убедитесь в bucket images** (публичный)
4. **Проверьте политики RLS**

## 📞 Тест после установки

```javascript
// Откройте консоль (F12) и выполните:
supabase.from('threads').select('*').then(console.log)
// Должно вернуть: { data: [], error: null }
```

---

**Время установки:** ~10 минут  
**Сложность:** Легко  
**Поддержка:** Проверьте README.md для деталей
