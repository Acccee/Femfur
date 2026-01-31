# Защита от DDoS атак через Cloudflare

## 🛡️ Cloudflare - лучшая защита для вашего имиджборда

Cloudflare предоставляет мощную защиту от DDoS атак бесплатно!

---

## 📋 Шаг 1: Настройка Cloudflare

### 1.1 Добавьте свой домен
1. Зайдите на [cloudflare.com](https://cloudflare.com)
2. Нажмите "Add a Site"
3. Введите ваш домен (например, `femfur.space`)
4. Выберите FREE план
5. Cloudflare просканирует DNS записи

### 1.2 Обновите NS записи
1. Cloudflare покажет 2 nameserver адреса
2. Зайдите к вашему регистратору домена
3. Замените nameservers на cloudflare nameservers
4. Подождите 24-48 часов (обычно быстрее)

---

## 🔒 Шаг 2: Базовая защита (FREE план)

### 2.1 Включите "Under Attack Mode"
При атаке:
1. Зайдите в Cloudflare Dashboard
2. Выберите ваш домен
3. Overview → Quick Actions
4. Переключите "Under Attack Mode" в ON

Это покажет challenge page всем посетителям на 5 секунд перед доступом к сайту.

### 2.2 Настройте Security Level
**Рекомендация: Medium**

1. Security → Settings
2. Security Level → Medium или High
3. Это блокирует известные угрозы автоматически

### 2.3 Включите Bot Fight Mode
**Бесплатно и эффективно!**

1. Security → Bots
2. Bot Fight Mode → Enable
3. Блокирует автоматические боты

---

## 🚀 Шаг 3: Firewall Rules (Продвинутая защита)

### 3.1 Rate Limiting (Ограничение запросов)

Cloudflare FREE план имеет ограничения, но вы можете использовать:

**Workers (бесплатно 100,000 requests/day):**

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const RATE_LIMIT = 60 // requests per minute
  const ip = request.headers.get('CF-Connecting-IP')
  
  // Проверка rate limit через KV storage
  const count = await getRequestCount(ip)
  
  if (count > RATE_LIMIT) {
    return new Response('Too many requests', { 
      status: 429,
      headers: { 'Retry-After': '60' }
    })
  }
  
  await incrementRequestCount(ip)
  return fetch(request)
}
```

### 3.2 Firewall Rules (платные, но можно обойтись)

На FREE плане доступно 5 правил:

**Пример 1: Блокировка по странам**
```
(ip.geoip.country ne "US" and ip.geoip.country ne "UA")
```

**Пример 2: Блокировка по User-Agent**
```
(http.user_agent contains "bot" or http.user_agent contains "scraper")
```

**Пример 3: Разрешить только определенные пути**
```
(not http.request.uri.path starts_with "/api/" and http.request.method eq "POST")
```

---

## 🎯 Шаг 4: Оптимизация производительности

### 4.1 Кэширование
1. Caching → Configuration
2. Caching Level: Standard
3. Browser Cache TTL: 4 hours
4. Always Online: ON

### 4.2 Auto Minify
1. Speed → Optimization
2. Auto Minify: включите JavaScript, CSS, HTML

### 4.3 Brotli компрессия
1. Speed → Optimization  
2. Brotli: ON (лучше чем gzip)

---

## 🔧 Шаг 5: Supabase + Cloudflare

### 5.1 Rate Limiting на уровне Supabase

В Supabase включите RLS policies с ограничениями:

```sql
-- Ограничение создания тредов: 5 в час
CREATE OR REPLACE FUNCTION check_thread_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO recent_count
    FROM threads
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 hour';
    
    IF recent_count >= 5 THEN
        RAISE EXCEPTION 'Rate limit exceeded: max 5 threads per hour';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_thread_rate_limit
    BEFORE INSERT ON threads
    FOR EACH ROW
    EXECUTE FUNCTION check_thread_rate_limit();
```

### 5.2 Защита API endpoints

Добавьте проверку Cloudflare headers:

```javascript
// В вашем backend (если используете)
app.use((req, res, next) => {
  const cfRay = req.headers['cf-ray']
  const cfConnectingIP = req.headers['cf-connecting-ip']
  
  if (!cfRay || !cfConnectingIP) {
    return res.status(403).json({ error: 'Direct access forbidden' })
  }
  
  next()
})
```

---

## 🚨 Шаг 6: Мониторинг атак

### 6.1 Cloudflare Analytics
1. Analytics → Traffic
2. Смотрите графики трафика
3. Проверяйте "Threats" для блокированных атак

### 6.2 Email уведомления
1. Notifications → Add
2. Выберите "DDoS Attack"
3. Получайте алерты на email

### 6.3 Page Rules (3 бесплатно)

**Защита API:**
```
femfur.space/api/*
Security Level: High
Cache Level: Bypass
```

**Кэширование статики:**
```
femfur.space/assets/*
Cache Level: Cache Everything
Edge Cache TTL: 1 month
```

---

## 💡 Дополнительные советы

### 1. Используйте CDN
Cloudflare автоматически кэширует статические файлы на 200+ серверах по всему миру.

### 2. Включите IPv6
Cloudflare → Network → IPv6 Compatibility: ON

### 3. HTTP/2 & HTTP/3
Cloudflare → Network → HTTP/2 & HTTP/3: ON (уже включено по умолчанию)

### 4. WAF (Web Application Firewall)
Cloudflare FREE план включает базовый WAF:
- Блокирует SQL injection
- Блокирует XSS
- Блокирует известные эксплоиты

### 5. Cloudflare Turnstile (замена reCAPTCHA)
**Бесплатно и privacy-friendly!**

```html
<!-- На странице регистрации/создания треда -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<div class="cf-turnstile" 
     data-sitekey="YOUR_SITE_KEY" 
     data-callback="onTurnstileSuccess">
</div>
```

---

## 📊 Что блокирует Cloudflare FREE план:

✅ **Layer 3/4 DDoS** (network layer) - Автоматически
✅ **Layer 7 DDoS** (application layer) - С ограничениями
✅ **Malicious bots** - Автоматически
✅ **Known threats** - Автоматически
✅ **SQL injection, XSS** - Через WAF
✅ **Bandwidth exhaustion** - Через CDN

❌ **НЕ блокирует на FREE:**
- Очень сложные distributed атаки (нужен Pro план)
- Targeted attacks с ротацией IP (нужен Business план)

---

## 🎯 Рекомендуемые настройки для Femfur

```yaml
Security Level: Medium
Bot Fight Mode: ON
Browser Integrity Check: ON
Challenge Passage: 30 minutes
Caching Level: Standard
Auto Minify: JS, CSS, HTML
Brotli: ON
Always Use HTTPS: ON
SSL/TLS: Full (strict)
```

---

## 🆘 При атаке

### 1. Немедленно:
- Включите "Under Attack Mode"
- Проверьте Analytics → Security
- Определите источник атаки

### 2. Через 15 минут:
- Добавьте Firewall Rule для блокировки
- Например: блокировать страну источника

### 3. После атаки:
- Выключите "Under Attack Mode"
- Оставьте Firewall Rules активными
- Мониторьте Analytics

---

## 📈 Производительность после Cloudflare

**До Cloudflare:**
- Скорость загрузки: ~2-3 секунды
- Доступность: зависит от хостинга
- Защита: никакая

**После Cloudflare:**
- Скорость загрузки: ~0.5-1 секунда (благодаря CDN)
- Доступность: 99.9%+ (даже при атаке)
- Защита: enterprise-уровень бесплатно!

---

## 🎉 Заключение

Cloudflare FREE план дает:
- ✅ Защита от большинства DDoS атак
- ✅ CDN для ускорения загрузки
- ✅ SSL сертификат бесплатно
- ✅ Analytics и мониторинг
- ✅ Bot protection
- ✅ WAF (базовый)

Это более чем достаточно для имиджборда!

Для максимальной защиты:
1. Используйте Cloudflare (FREE)
2. Добавьте rate limiting в Supabase
3. Мониторьте трафик
4. При атаке - включайте "Under Attack Mode"

**Ваш имиджборд будет защищен! 🛡️**
