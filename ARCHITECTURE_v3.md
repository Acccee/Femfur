# 🏗️ FEMFUR.SPACE - ПОЛНАЯ АРХИТЕКТУРА v3.0

## 📋 СОДЕРЖАНИЕ

1. [Обзор системы](#обзор-системы)
2. [Исправленные баги](#исправленные-баги)
3. [Новый функционал](#новый-функционал)
4. [Структура базы данных](#структура-базы-данных)
5. [Модули системы](#модули-системы)
6. [API эндпоинты](#api-эндпоинты)
7. [Безопасность](#безопасность)
8. [Производительность](#производительность)

---

## 🎯 ОБЗОР СИСТЕМЫ

### Что такое Femfur.space

**Контролируемый имиджборд** с:
- Глобальными бордами (/b/, /fur/, /a/, etc.)
- Пользовательскими группами (закрытые сообщества)
- Системой кармы (скрытой от пользователя)
- Умной модерацией (shadowban, антибот)
- Защитой от злоупотреблений

**Философия:**
- НЕ демократия (окончательное слово за админами)
- НЕ соцсеть (нет лайков/апвоутов)
- Высокая цена злоупотреблений
- Комфорт для нормальных пользователей

---

## ✅ ИСПРАВЛЕННЫЕ БАГИ

### 1. Content треда EMPTY → Исправлено

**Проблема:**
```html
<!-- Конфликт ID в HTML -->
<div id="threadContent"></div>          <!-- Для отображения -->
<textarea id="threadContent"></textarea> <!-- Для создания -->
```

**Решение:**
- Переименовано: `<textarea id="newThreadContent">`
- Обновлён JavaScript: `getElementById('newThreadContent')`

**Файлы:**
- `index.html` (строка 230)
- `js/app.js` (строки 602, 622, 586)

### 2. Удаление треда не работает → Исправлено

**Проблема:**
- Нет RLS политики для DELETE в Supabase

**Решение:**
- Создана RPC функция `delete_thread_by_user()`
- Проверка владельца + глобальных прав

**Файлы:**
- `database_bug_fixes.sql`
- `database_extended_schema.sql`
- `js/thread-actions.js`

### 3. Фавикон не отображается → Требует файла

**Проблема:**
- Файл `assets/fav.png` не существует

**Решение:**
- Создать PNG 32x32px
- Поместить в `assets/fav.png`

---

## 🚀 НОВЫЙ ФУНКЦИОНАЛ

### 1. Публичные профили

**URL:** `/u/{user_hash}`

**Отображается:**
```
┌─────────────────────────────────────┐
│  [Avatar] Nickname                  │
│  Status: trusted                    │
│  Member since: Jan 2026             │
│  Bio: "Furry artist & developer"    │
│                                     │
│  Created Threads: 15                │
│  Owns Groups: 2                     │
│  ────────────────────────────────  │
│  Recent threads:                    │
│  • Thread 1                         │
│  • Thread 2                         │
└─────────────────────────────────────┘
```

**НЕ отображается:**
- Точное значение кармы (только статус)
- IP адрес
- Email
- Баны/предупреждения
- Shadowban статус

### 2. Группы (пользовательские сообщества)

**Создание группы:**
- Требования:
  - Карма > 0
  - Аккаунт старше 7 дней
  - Лимит 3 группы на пользователя
  - Уникальное имя (латиница, цифры, -, _)

**Структура группы:**
```
/g/{group_name}/
├── /b/           # Борды группы
├── /art/
├── /chat/
└── members/      # Участники
```

**Роли в группе:**
1. **Owner** - создатель, полный контроль
2. **Admin** - управление модерацией
3. **Moderator** - удаление постов, баны
4. **Trusted** - повышенные права
5. **Member** - обычный участник
6. **Observer** - только чтение

### 3. Система кармы

**Карма скрыта от пользователя!**

Пользователь видит только статус:
- 🟢 **trusted** (karma ≥ 100)
- ⚪ **neutral** (karma 0-99)
- 🟡 **unstable** (karma -1 до -50)
- 🔴 **restricted** (karma < -50)

**Влияние кармы:**

| Статус | Кулдауны | Создание групп | Функции |
|--------|----------|----------------|---------|
| trusted | 5 сек | ✅ Да | Полный доступ |
| neutral | 30 сек | ✅ Да | Стандартный |
| unstable | 120 сек | ❌ Нет | Ограничен |
| restricted | 300 сек | ❌ Нет | Минимум |

**Карма изменяется за:**
- ➕ Нормальная активность (+1 раз в день)
- ➕ Полезный контент (+5 от модератора)
- ➖ Репорты (-5 за каждый подтверждённый)
- ➖ Удалённые посты (-10)
- ➖ Спам-поведение (-20)

### 4. Shadowban (теневой бан)

**Что видит пользователь:**
- ✅ Свои посты нормально отображаются
- ✅ Может создавать треды
- ✅ Может отвечать

**Что происходит на самом деле:**
- ❌ Никто кроме него не видит посты
- ❌ Реакции не работают
- ❌ Не влияет на карму

**Типы shadowban:**
- Временный (7 дней)
- Частичный (только на бордах)
- IP-based (на весь IP)

**Применение:**
```sql
UPDATE users 
SET is_shadowbanned = TRUE, shadowban_expires_at = NOW() + INTERVAL '7 days'
WHERE id = user_id;
```

### 5. Антибот система

**Анализируемые параметры:**

```javascript
{
  action_type: 'create_thread',
  interval_since_last: 5,    // секунд с последнего действия
  user_agent_hash: 'abc123',
  ip_hash: 'def456',
  text_similarity: 0.95,     // похожесть текста на предыдущие
  spam_score: 0.7            // итоговая оценка (0-1)
}
```

**Подозрительное поведение:**
- Действия каждые < 2 секунды
- Одинаковый текст в разных постах (>90% similarity)
- Один user-agent с разных IP
- Много IP с одним user-agent
- Повторяющиеся интервалы действий

**Меры:**
1. **spam_score < 0.3** → ничего
2. **spam_score 0.3-0.6** → увеличить кулдаун x2
3. **spam_score 0.6-0.8** → тихое игнорирование действия
4. **spam_score > 0.8** → автоматический shadowban

### 6. Динамические кулдауны

**Формула:**
```
base_cooldown = действие_type.default_cooldown
karma_multiplier = karma_status.multiplier
spam_multiplier = (spam_score > 0.5) ? 2 : 1

final_cooldown = base_cooldown * karma_multiplier * spam_multiplier
```

**Примеры:**

| Действие | trusted | neutral | unstable | restricted |
|----------|---------|---------|----------|------------|
| create_thread | 5 сек | 30 сек | 120 сек | 300 сек |
| create_reply | 2 сек | 10 сек | 60 сек | 180 сек |
| add_reaction | 1 сек | 3 сек | 15 сек | 60 сек |
| join_group | 10 сек | 60 сек | 300 сек | 600 сек |

### 7. Мультиязычность

**Поддерживаемые языки:**
- 🇺🇦 Українська (uk)
- 🇷🇺 Русский (ru)
- 🇬🇧 English (en)

**Переключение:**
```html
<select id="langSelect">
  <option value="en">English</option>
  <option value="uk">Українська</option>
  <option value="ru">Русский</option>
</select>
```

**Использование:**
```javascript
import { t } from './i18n.js';

// Простой текст
const greeting = t('welcome', 'Welcome to Femfur');

// С параметрами
const message = t('karma_changed', 'Your karma: {karma}', { karma: 50 });
```

**Файлы локализации:**
- `locales/en.json` - английский (базовый)
- `locales/uk.json` - украинский
- `locales/ru.json` - русский

---

## 🗄️ СТРУКТУРА БАЗЫ ДАННЫХ

### Основные таблицы

```
users (расширенная)
├── id, nickname, password_hash
├── avatar_url, bio
├── karma, karma_status
├── global_role (user, helper, moderator, admin)
├── is_shadowbanned, shadowban_expires_at
├── spam_score, action_count
└── created_at, updated_at

threads
├── id, board, title, content
├── image_url, user_id
├── is_anonymous, is_sticky
├── views, bumped_at
└── created_at

replies
├── id, thread_id, content
├── image_url, user_id
├── is_anonymous
└── created_at

groups (НОВОЕ)
├── id, name, display_name
├── description, icon_url, rules
├── owner_id, karma, karma_status
├── is_frozen, is_private
├── member_count
└── created_at, updated_at

group_members (НОВОЕ)
├── id, group_id, user_id
├── role (owner, admin, moderator, trusted, member, observer)
└── joined_at

group_boards (НОВОЕ)
├── id, group_id, name
├── display_name, description
├── is_archived, is_hidden
└── created_at

group_reactions (НОВОЕ)
├── id, group_id, name
├── emoji, icon_url
├── min_role
└── created_at

reports (НОВОЕ)
├── id, reporter_id
├── target_type, target_id
├── reason, status, priority
└── created_at, reviewed_at

mod_logs (НОВОЕ)
├── id, moderator_id
├── action_type, target_type, target_id
├── details (JSONB), ip_address
└── created_at

cooldowns (НОВОЕ)
├── id, user_id
├── action_type
└── cooldown_until

user_actions (НОВОЕ - антибот)
├── id, user_id, action_type
├── ip_hash, user_agent_hash
├── interval_since_last, is_suspicious
└── created_at
```

### Связи

```
users 1──N threads
users 1──N replies
users 1──N groups (owner)
users 1──N group_members
groups 1──N group_members
groups 1──N group_boards
groups 1──N group_reactions
```

---

## 🧩 МОДУЛИ СИСТЕМЫ

### Frontend модули (js/)

```
js/
├── app.js                  # Main app, routing
├── auth.js                 # Authentication
├── boards.js               # Board management
├── threads.js              # Thread operations
├── groups.js               # 🆕 Group management
├── profiles.js             # 🆕 User profiles
├── karma.js                # 🆕 Karma system
├── antibot.js              # 🆕 Antibot detection
├── cooldowns.js            # 🆕 Cooldown management
├── moderation.js           # 🆕 Mod tools
├── reactions.js            # Reactions
├── i18n.js                 # 🔄 Extended localization
├── search.js               # Search
└── supabaseClient.js       # Database client
```

### Новые модули (подробно)

#### groups.js
```javascript
// Создание группы
async function createGroup(name, displayName, description)

// Вступление в группу
async function joinGroup(groupId, message)

// Управление ролями
async function setUserRole(groupId, userId, role)

// Создание борда
async function createGroupBoard(groupId, name, displayName)

// Кастомные реакции
async function addGroupReaction(groupId, name, emoji)
```

#### profiles.js
```javascript
// Получение публичного профиля
async function getPublicProfile(userId)

// Обновление профиля
async function updateProfile(bio, avatarFile)

// Получение тредов пользователя
async function getUserThreads(userId, limit)

// Получение групп пользователя
async function getUserGroups(userId)
```

#### karma.js
```javascript
// Получение статуса кармы (без числа!)
async function getKarmaStatus()

// Изменение кармы (только для модераторов)
async function changeKarma(userId, delta, reason)

// Расчёт кулдауна на основе кармы
function calculateCooldown(actionType, karmaStatus)
```

#### antibot.js
```javascript
// Логирование действия
async function logAction(actionType)

// Анализ подозрительности
async function analyzeSpamScore()

// Проверка перед действием
async function checkBeforeAction(actionType)
```

#### cooldowns.js
```javascript
// Проверка кулдауна
async function checkCooldown(actionType)

// Установка кулдауна
async function setCooldown(actionType, seconds)

// Получение оставшегося времени
async function getRemainingCooldown(actionType)
```

---

## 🔌 API ЭНДПОИНТЫ

### Supabase RPC Functions

```sql
-- Профили
get_public_profile(user_id)
update_user_profile(bio, avatar_url)

-- Группы
create_group(name, display_name, description)
join_group_request(group_id, message)
approve_group_request(request_id)
set_group_role(group_id, user_id, role)

-- Карма
change_karma(user_id, delta, reason)
get_karma_status(user_id)

-- Модерация
shadowban_user(user_id, duration_days)
delete_thread_by_user(thread_id, user_id)
ban_user(user_id, reason, is_permanent)

-- Кулдауны
check_cooldown(user_id, action_type)
set_cooldown(user_id, action_type, seconds)

-- Антибот
log_user_action(action_type, ip_hash, user_agent_hash)
analyze_spam_score(user_id)
```

---

## 🔒 БЕЗОПАСНОСТЬ

### 1. Row Level Security (RLS)

Все таблицы защищены RLS политиками:

```sql
-- Пример: только модераторы видят репорты
CREATE POLICY "Moderators can view reports"
ON reports FOR SELECT
USING (is_moderator() OR reporter_id = current_user_id());
```

### 2. Валидация на уровне БД

```sql
-- Проверка формата имени группы
CONSTRAINT check_group_name_format 
CHECK (name ~ '^[a-z0-9_-]+$')

-- Проверка роли
CONSTRAINT check_group_member_role 
CHECK (role IN ('owner', 'admin', 'moderator', ...))
```

### 3. Sanitization

```javascript
// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Валидация никнейма
function validateNickname(nickname) {
    if (!/^[a-zA-Z0-9]+$/.test(nickname)) {
        throw new Error('Only latin and numbers allowed');
    }
    const forbidden = ['admin', 'mod', 'system', 'femfur', 'anon'];
    if (forbidden.includes(nickname.toLowerCase())) {
        throw new Error('Reserved name');
    }
}
```

### 4. Rate Limiting

```javascript
// Проверка кулдауна перед действием
const canAct = await checkCooldown('create_thread');
if (!canAct) {
    const remaining = await getRemainingCooldown('create_thread');
    throw new Error(`Please wait ${remaining} seconds`);
}
```

---

## ⚡ ПРОИЗВОДИТЕЛЬНОСТЬ

### 1. Индексы

```sql
-- Критичные индексы
CREATE INDEX idx_users_karma ON users(karma DESC);
CREATE INDEX idx_threads_bumped ON threads(bumped_at DESC);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_user_actions_user ON user_actions(user_id, created_at DESC);
```

### 2. Кеширование

```javascript
// Кеш статуса кармы (обновляется раз в минуту)
let karmaStatusCache = null;
let karmaStatusCacheTime = 0;

async function getKarmaStatus() {
    const now = Date.now();
    if (karmaStatusCache && now - karmaStatusCacheTime < 60000) {
        return karmaStatusCache;
    }
    
    karmaStatusCache = await fetchKarmaStatus();
    karmaStatusCacheTime = now;
    return karmaStatusCache;
}
```

### 3. Lazy Loading

```javascript
// Подгрузка тредов при скролле
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        loadMoreThreads();
    }
});
observer.observe(document.getElementById('load-more-trigger'));
```

### 4. Skeleton Loading

```javascript
function renderSkeletonThreads(count) {
    return `
        ${Array(count).fill().map(() => `
            <div class="thread-item skeleton">
                <div class="skeleton-title"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-meta"></div>
            </div>
        `).join('')}
    `;
}
```

---

## 📁 СТРУКТУРА ПРОЕКТА

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
│   ├── groups.js           # 🆕
│   ├── profiles.js         # 🆕
│   ├── karma.js            # 🆕
│   ├── antibot.js          # 🆕
│   ├── cooldowns.js        # 🆕
│   ├── moderation.js       # 🆕
│   └── i18n.js
├── locales/
│   ├── en.json
│   ├── uk.json
│   └── ru.json
├── assets/
│   └── fav.png             # СОЗДАТЬ!
├── database_schema.sql
├── database_extended_schema.sql  # 🆕
├── database_bug_fixes.sql
└── README.md
```

---

## 🚀 УСТАНОВКА

### Шаг 1: База данных

```bash
# 1. Выполните базовую схему
psql < database_schema.sql

# 2. Выполните исправления багов
psql < database_bug_fixes.sql

# 3. Выполните расширенную схему
psql < database_extended_schema.sql
```

### Шаг 2: Файлы проекта

Замените файлы:
- `index.html`
- `js/app.js`
- `js/thread-actions.js`

Добавьте новые:
- `js/groups.js`
- `js/profiles.js`
- `js/karma.js`
- `js/antibot.js`
- `js/cooldowns.js`
- `js/moderation.js`

### Шаг 3: Создать favicon

```bash
# Создайте assets/fav.png (32x32px)
```

---

## 📝 ЧЕКЛИСТ ФУНКЦИЙ

### Базовый функционал ✅
- [x] Регистрация/логин
- [x] Создание тредов
- [x] Ответы на треды
- [x] Реакции
- [x] Поиск
- [x] Борды

### Исправленные баги ✅
- [x] Content EMPTY → исправлено
- [x] Удаление тредов → исправлено
- [x] Фавикон → требует файла

### Новый функционал 🆕
- [ ] Публичные профили
- [ ] Группы (создание, управление)
- [ ] Борды в группах
- [ ] Роли в группах
- [ ] Система кармы
- [ ] Shadowban
- [ ] Антибот система
- [ ] Динамические кулдауны
- [ ] Расширенная мультиязычность
- [ ] Репорты
- [ ] Логи модерации
- [ ] IP баны
- [ ] Кастомные реакции групп

---

## 🎯 ПРИОРИТЕТЫ РЕАЛИЗАЦИИ

### Фаза 1: Критические исправления ✅
1. Исправить content EMPTY
2. Исправить удаление тредов
3. Создать favicon

### Фаза 2: Базовая инфраструктура
1. Применить расширенную SQL схему
2. Создать модули groups.js, profiles.js
3. Расширить локализацию

### Фаза 3: Карма и модерация
1. Реализовать систему кармы
2. Реализовать shadowban
3. Создать moderation.js

### Фаза 4: Антибот
1. Реализовать логирование действий
2. Создать анализатор spam_score
3. Интегрировать с кулдаунами

### Фаза 5: Группы
1. Создание групп
2. Управление участниками
3. Борды в группах
4. Кастомные реакции

---

**Версия:** 3.0  
**Дата:** 31 января 2026  
**Статус:** В разработке  
**Покрытие:** Полная архитектура + критические исправления
