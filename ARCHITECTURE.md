# Technical Architecture & Implementation Details

## 🏛️ Architecture Overview

### Client-Side Only Architecture

Femfur is built as a **100% client-side application** that communicates directly with Supabase as the backend. This approach:

✅ **Pros:**
- Zero server costs
- Easy deployment (GitHub Pages)
- Scales automatically with Supabase
- Fast development
- No server maintenance

⚠️ **Cons:**
- Limited security (no server-side validation)
- API keys visible in client code
- Cannot implement complex server logic
- Vulnerable to spam without rate limiting

### Technology Stack

```
┌─────────────────────────────────────┐
│         Client (Browser)            │
├─────────────────────────────────────┤
│  • Vanilla JavaScript (ES6 Modules) │
│  • HTML5                            │
│  • CSS3                             │
│  • No frameworks/libraries          │
└─────────────────────────────────────┘
              ↕ HTTPS
┌─────────────────────────────────────┐
│       Supabase (Backend)            │
├─────────────────────────────────────┤
│  • PostgreSQL Database              │
│  • Storage (S3-compatible)          │
│  • Real-time subscriptions          │
│  • Row Level Security (RLS)         │
└─────────────────────────────────────┘
```

## 🔐 Security Model

### Hash-Based Profile URLs

User profile URLs use a **stable hash** instead of sequential IDs:

```javascript
// User ID: 12345
// Profile URL: /u/3k7j2

function generateUserHash(userId) {
    const str = `user_${userId}_salt`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}
```

**Benefits:**
- Same user always gets same hash
- Cannot reverse to get user ID
- Harder to enumerate users
- More privacy-friendly

### Password Security

⚠️ **Current Implementation (Development Only):**
```javascript
// Simple SHA-256 hash - DO NOT USE IN PRODUCTION
const hash = await crypto.subtle.digest('SHA-256', data);
```

**Production Recommendations:**
1. Implement server-side authentication
2. Use Argon2id or bcrypt for password hashing
3. Add salt to each password
4. Implement rate limiting on login attempts
5. Add 2FA support

### Anonymous Posting Logic

```javascript
// Thread/Reply Creation
if (user && !isAnonymousCheckbox) {
    // Show username
    post.user_id = user.id;
    post.is_anonymous = false;
} else {
    // Anonymous post
    post.user_id = user ? user.id : null;
    post.is_anonymous = true;
}
```

This allows:
- Unregistered users to post (completely anonymous)
- Registered users to track their posts privately
- Public display is always based on `is_anonymous` flag

## 📊 Database Design

### Tables Relationship

```
┌─────────┐
│  users  │
└────┬────┘
     │ 1
     │
     │ *
┌────▼────┐      1    *  ┌─────────┐
│ threads ├─────────────►│ replies │
└─────────┘              └─────────┘
```

### Key Design Decisions

**1. Soft Delete Pattern:**
- `user_id` uses `ON DELETE SET NULL`
- Deleted users don't remove threads/replies
- Maintains content integrity

**2. Bumping System:**
```sql
-- Trigger auto-updates bumped_at
CREATE TRIGGER trigger_bump_thread
    AFTER INSERT ON replies
    EXECUTE FUNCTION bump_thread();
```

**3. View Counter:**
- Uses `sessionStorage` to track unique views
- Prevents multiple counts from same session
- Simple IP-less tracking

## 🎨 UI/UX Design Philosophy

### Classic Imageboard Aesthetics

Colors inspired by 4chan/2ch:
```css
--bg-primary: #eef2ff;    /* Light blue-grey */
--bg-secondary: #d6daf0;  /* Slightly darker */
--accent-red: #af0a0f;    /* Bold red for headers */
--text-dark: #34345c;     /* Dark blue-grey */
```

### No Social Media Elements

Deliberately excluded:
- ❌ Like/upvote buttons
- ❌ Follow/friend system
- ❌ Notification system
- ❌ Algorithmic feed
- ❌ User profiles as "identities"

### Minimalist JavaScript

Only use JavaScript for:
- ✅ API calls to Supabase
- ✅ Dynamic content rendering
- ✅ Route handling
- ✅ Form validation

Avoid unnecessary frameworks to keep it fast and simple.

## 🌍 Internationalization (i18n)

### Implementation

```javascript
// 1. Load language file
const translations = await fetch(`locales/${lang}.json`);

// 2. Apply to DOM
document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = translations[el.dataset.i18n];
});

// 3. Store preference
localStorage.setItem('preferred_language', lang);
```

### Adding New Languages

1. Create `locales/XX.json` (XX = language code)
2. Copy structure from `en.json`
3. Translate all keys
4. Add option to `<select id="langSelect">`

**Supported:**
- English (en)
- Ukrainian (uk)
- Russian (ru)

**Easy to add:**
- German (de)
- Spanish (es)
- French (fr)
- Japanese (ja)
- Any other language!

## 📈 Performance Optimizations

### Database Indexes

Critical indexes for performance:
```sql
-- Most important: board + bump sorting
CREATE INDEX idx_threads_sticky_bumped 
    ON threads(is_sticky DESC, bumped_at DESC);

-- Thread replies lookup
CREATE INDEX idx_replies_thread 
    ON replies(thread_id, created_at ASC);

-- Popular threads calculation
CREATE INDEX idx_threads_views 
    ON threads(views DESC, created_at DESC);
```

### Client-Side Optimizations

**1. Lazy Loading:**
```javascript
// Load only visible content first
// Load images on scroll
```

**2. Minimize DOM Operations:**
```javascript
// Build HTML string, insert once
const html = items.map(item => `...`).join('');
container.innerHTML = html;

// Instead of multiple insertions
```

**3. Use sessionStorage for Temporary Data:**
```javascript
// View tracking doesn't need localStorage
sessionStorage.setItem(`viewed_thread_${id}`, 'true');
```

## 🔧 Extension Points

### Adding Features

**1. Real-time Updates:**
```javascript
// Subscribe to new replies
supabase
    .channel('replies')
    .on('INSERT', payload => {
        // Add new reply to DOM without reload
    })
    .subscribe();
```

**2. File Upload Validation:**
```javascript
// Client-side validation
const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
const maxSize = 5 * 1024 * 1024; // 5MB

if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type');
}
if (file.size > maxSize) {
    throw new Error('File too large');
}
```

**3. Search Functionality:**
```javascript
// Full-text search in Supabase
const { data } = await supabase
    .from('threads')
    .select('*')
    .textSearch('title', query);
```

**4. Admin Panel:**
```javascript
// Check if user is admin
const isAdmin = user.role === 'admin';

if (isAdmin) {
    // Show delete buttons
    // Show sticky toggle
    // Show ban options
}
```

## 🚨 Known Limitations

### Security Limitations

1. **No Server-Side Validation**
   - All validation happens in browser
   - Can be bypassed with dev tools
   - Need server middleware for production

2. **API Keys in Code**
   - Supabase keys are visible
   - Use Row Level Security (RLS) to protect data
   - Consider Supabase Edge Functions for sensitive operations

3. **No Rate Limiting**
   - Users can spam without restriction
   - Need Supabase Edge Functions or Cloudflare

4. **Simple Password Hashing**
   - SHA-256 is not designed for passwords
   - Need server-side Argon2/bcrypt

### Functional Limitations

1. **No Advanced Moderation**
   - Cannot implement shadow banning properly (client-side)
   - Need admin interface
   - Need reporting system

2. **Limited Search**
   - Only basic text search available
   - No full-text search index

3. **No Email Verification**
   - Users can register with any nickname
   - No email confirmation

## 🎯 Future Enhancements

### Short Term (Easy)

- [ ] Image thumbnails
- [ ] Thread search
- [ ] Board-specific rules
- [ ] User settings page
- [ ] Dark mode theme

### Medium Term (Moderate)

- [ ] Real-time updates
- [ ] Rich text editor
- [ ] Emoji picker
- [ ] File size limits UI
- [ ] Report system

### Long Term (Complex)

- [ ] Server-side validation
- [ ] Advanced moderation tools
- [ ] Admin dashboard
- [ ] Rate limiting
- [ ] Email notifications

## 📚 Code Organization

### Module Structure

```
js/
├── app.js           # Main entry point, routing, init
├── auth.js          # User authentication & profiles
├── boards.js        # Board management & threads
├── threads.js       # Thread & reply logic
├── widgets.js       # Homepage widgets
├── profile.js       # User profile pages
├── i18n.js          # Internationalization
└── supabaseClient.js # Supabase configuration
```

### Naming Conventions

- **Functions**: `camelCase` (e.g., `getUserByHash`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `SUPABASE_URL`)
- **Variables**: `camelCase` (e.g., `currentUser`)
- **CSS Classes**: `kebab-case` (e.g., `thread-item`)
- **Data Attributes**: `data-*` (e.g., `data-reply-id`)

## 💡 Best Practices

### When Adding Features

1. **Keep it Simple**
   - Imageboards should be minimal
   - Don't add unnecessary complexity

2. **Respect Anonymity**
   - Don't track users excessively
   - Give users control over privacy

3. **Performance First**
   - Test with 1000+ threads
   - Optimize database queries
   - Use indexes properly

4. **Security Mindset**
   - Validate all inputs
   - Sanitize all outputs
   - Use prepared statements (Supabase does this)

5. **Mobile Support**
   - Test on mobile devices
   - Use responsive design
   - Touch-friendly UI

## 🐛 Debugging

### Common Issues

**Issue**: Threads not loading
```javascript
// Check console for errors
// Verify Supabase connection
// Check browser network tab
```

**Issue**: Images not uploading
```javascript
// Verify storage bucket exists
// Check storage policies
// Verify file size limits
```

**Issue**: Login not working
```javascript
// Check password hash matches
// Verify users table has data
// Check browser localStorage
```

## 📄 License & Credits

This project is open source and free to use, modify, and distribute.

**Built with:**
- Supabase for backend
- GitHub Pages for hosting
- Vanilla JavaScript (no frameworks!)
- Love for imageboards ❤️

---

**Remember**: This is a learning project. For production use, implement proper security, server-side validation, and moderation tools!
