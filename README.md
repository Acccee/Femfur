# Femfur - Anonymous Imageboard

**Femfur** is a modern, minimalist anonymous imageboard built with vanilla JavaScript and Supabase. It follows the philosophy of classic imageboards like 4chan and 2ch while providing modern features.

## 🎯 Features

### Core Features
- ✅ **Anonymous posting** - Post without registration
- ✅ **User accounts** - Optional registration with hash-based profile URLs
- ✅ **Multiple boards** - 40+ boards across different categories
- ✅ **Thread creation** - Create discussions with text and images
- ✅ **Image uploads** - Upload images to threads and replies
- ✅ **View counter** - Track unique views per thread
- ✅ **Reply system** - Comment on threads with quote support
- ✅ **Quote linking** - Click >>number to quote posts
- ✅ **Auto-bump** - New replies bump threads to top

### Advanced Features
- 🌍 **Multi-language support** (i18n) - English, Ukrainian, Russian
- 👤 **Hash-based profiles** - Public profile URLs like `/u/<hash>`
- 📌 **Sticky threads** - Pin important threads to top
- 🏆 **Thread of the Day/Week** - Automated popular thread widgets
- 📊 **Recent threads widget** - Homepage activity feed
- 🔒 **Anonymous mode** - Post anonymously even when logged in
- 🎨 **Classic imageboard design** - Minimal, clean interface
- 📱 **Responsive design** - Works on mobile and desktop

## 🏗️ Project Structure

```
femfur/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # All styles
├── js/
│   ├── app.js             # Main application logic
│   ├── auth.js            # Authentication & user management
│   ├── boards.js          # Board management
│   ├── threads.js         # Thread & reply logic
│   ├── widgets.js         # Homepage widgets
│   ├── profile.js         # User profile system
│   ├── i18n.js            # Internationalization
│   └── supabaseClient.js  # Supabase configuration
├── locales/
│   ├── en.json            # English translations
│   ├── uk.json            # Ukrainian translations
│   └── ru.json            # Russian translations
├── assets/
│   └── fav.png            # Favicon
└── README.md              # This file
```

## 🗄️ Database Schema

### Required Tables in Supabase

#### 1. `users` table
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    status VARCHAR(100),
    always_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_users_nickname ON users(nickname);
```

#### 2. `threads` table
```sql
CREATE TABLE threads (
    id BIGSERIAL PRIMARY KEY,
    board VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN DEFAULT false,
    is_sticky BOOLEAN DEFAULT false,
    views INTEGER DEFAULT 0,
    bumped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_threads_board ON threads(board);
CREATE INDEX idx_threads_bumped ON threads(bumped_at DESC);
CREATE INDEX idx_threads_sticky ON threads(is_sticky, bumped_at DESC);
CREATE INDEX idx_threads_user ON threads(user_id) WHERE user_id IS NOT NULL;
```

#### 3. `replies` table
```sql
CREATE TABLE replies (
    id BIGSERIAL PRIMARY KEY,
    thread_id BIGINT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_replies_thread ON replies(thread_id);
CREATE INDEX idx_replies_created ON replies(created_at DESC);
CREATE INDEX idx_replies_user ON replies(user_id) WHERE user_id IS NOT NULL;
```

### Storage Bucket

Create a bucket named `image` with the following policies:

**SELECT Policy (Public Read):**
```sql
(bucket_id = 'image'::text)
```

**INSERT Policy (Public Upload):**
```sql
(bucket_id = 'image'::text)
```

## ⚙️ Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key

### 2. Set Up Database

Run the SQL commands above in Supabase SQL Editor to create all tables.

### 3. Configure Storage

1. Go to Storage in Supabase dashboard
2. Create a new bucket named `image`
3. Make it public
4. Add the policies mentioned above

### 4. Configure the App

Edit `js/supabaseClient.js`:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace with your actual Supabase credentials.

### 5. Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push all files to the repository
3. Go to Settings > Pages
4. Select your branch (usually `main`)
5. Save and wait for deployment

Your imageboard will be live at `https://yourusername.github.io/repository-name/`

## 🌍 Internationalization (i18n)

The app supports multiple languages out of the box:

- **English** (default)
- **Ukrainian** (Українська)
- **Russian** (Русский)

Users can switch languages using the dropdown in the header. The preference is saved in `localStorage`.

To add a new language:

1. Create a new JSON file in `locales/` (e.g., `locales/de.json`)
2. Copy the structure from `en.json`
3. Translate all values
4. Add the language option to the select in `index.html`

## 👤 User System

### Hash-Based Profiles

User profiles use a hash-based system for privacy:

- Profile URLs: `/u/<hash>` (e.g., `/u/3k7j2`)
- Hash is generated from user ID using a one-way function
- Same user always gets the same hash
- Cannot reverse-engineer user ID from hash

### Anonymous Posting

Users can:
- Post without registration (fully anonymous)
- Register but post anonymously (checkbox option)
- Set "always anonymous" in profile settings

## 🎨 Boards

The imageboard includes 40+ boards across 8 categories:

- **Art**: Art, Literature, Poetry, Music, DIY, Photography
- **Chat**: Random, Social, Chat, News, International, Robot9000
- **Furry/Anime**: Furry, Anime, Visual Novels, Cute Male, Cute
- **Games**: Video Games, Board Games, VR, Retro, TV & Movies, Comics
- **IT**: Technology, Programming, Science, Help, 3D Printing
- **About Life**: Fitness, Cooking, Fashion, Advice, Travel, Outdoors
- **Hobby**: Sports, Automobiles, Animals, History, Photography
- **Adult (18+)**: Ecchi, Hentai, Adult GIF

## 🔧 Development

### Local Development

Simply open `index.html` in a browser. For best results, use a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js (with http-server)
npx http-server
```

### Code Style

- Use ES6 modules
- No external dependencies (except Supabase SDK)
- Keep functions small and focused
- Comment complex logic
- Use semantic HTML

## 🚀 Performance Optimization

- Lazy load images
- Use indexes on database queries
- Minimize DOM manipulation
- Cache user session in localStorage
- Use sessionStorage for view tracking

## 🔒 Security Considerations

⚠️ **IMPORTANT**: This is a client-side only implementation. For production:

1. **Password Hashing**: Implement proper server-side hashing (Argon2, bcrypt)
2. **Rate Limiting**: Add server-side rate limiting to prevent spam
3. **Input Validation**: Add comprehensive server-side validation
4. **File Upload**: Validate file types and sizes on server
5. **Shadow Banning**: Implement server-side shadow ban logic
6. **Moderation**: Add admin panel for content moderation

## 📝 License

This project is open source and available for educational purposes.

## 🤝 Contributing

Feel free to fork, modify, and improve this project!

## 📧 Support

For issues or questions, create an issue in the GitHub repository.

---

**Built with ❤️ for the imageboard community**
