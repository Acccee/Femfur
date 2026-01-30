# Femfur Imageboard

A fully functional imageboard similar to 4chan, built for GitHub Pages with Supabase backend. All threads and replies are visible to all users globally in real-time.

## 🎯 Features

- ✅ 40+ boards across different categories
- ✅ Image upload support (PNG, JPG, GIF, WEBP)
- ✅ Create threads with subject, comment, and image
- ✅ Reply to threads with comments and images
- ✅ All data stored in Supabase (NO localStorage)
- ✅ Hash-based navigation (#b, #art, etc.)
- ✅ 4chan-style design and layout
- ✅ Works on GitHub Pages (frontend only)
- ✅ Responsive design
- ✅ Real-time data visible to all users

## 📁 Project Structure

```
femfur/
├── index.html              # Main HTML page
├── css/
│   └── style.css          # 4chan-inspired styles
└── js/
    ├── supabaseClient.js  # Supabase client (CONFIGURE THIS!)
    ├── boards.js          # Board management
    ├── threads.js         # Thread and reply management
    └── app.js             # Main application logic
```

## 🚀 Setup Instructions

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Wait for the project to be ready
4. Note your project URL and anon key from Settings → API

### Step 2: Create Database Tables

Go to your Supabase project → SQL Editor and run this SQL:

```sql
-- Create threads table
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board TEXT NOT NULL,
    subject TEXT,
    comment TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create replies table
CREATE TABLE replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_threads_board ON threads(board);
CREATE INDEX idx_threads_created_at ON threads(created_at DESC);
CREATE INDEX idx_replies_thread_id ON replies(thread_id);
CREATE INDEX idx_replies_created_at ON replies(created_at);

-- Enable Row Level Security
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

-- Create policies (allow everyone to read and write)
CREATE POLICY "Anyone can read threads"
    ON threads FOR SELECT
    USING (true);

CREATE POLICY "Anyone can create threads"
    ON threads FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can read replies"
    ON replies FOR SELECT
    USING (true);

CREATE POLICY "Anyone can create replies"
    ON replies FOR INSERT
    WITH CHECK (true);
```

### Step 3: Create Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `images`
3. Make it **public** (toggle the public option)
4. Set the following policies for the bucket:

**SELECT policy:**
```sql
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');
```

**INSERT policy:**
```sql
CREATE POLICY "Anyone can upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'images');
```

Or simply click "New Policy" → "Custom policy" → Select "Allow all" for both SELECT and INSERT.

### Step 4: Configure Supabase Client

Open `js/supabaseClient.js` and replace:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

With your actual credentials:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

You can find these in: Supabase Dashboard → Settings → API

### Step 5: Deploy to GitHub Pages

#### Option A: GitHub Web Interface

1. Create a new repository on GitHub
2. Upload all files from the `femfur` folder
3. Go to Settings → Pages
4. Source: Deploy from a branch
5. Branch: Select `main` and `/ (root)` folder
6. Click Save
7. Your site will be available at: `https://yourusername.github.io/repository-name/`

#### Option B: Git Command Line

```bash
# Initialize repository
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit - Femfur Imageboard"

# Add remote repository
git remote add origin https://github.com/yourusername/repository-name.git

# Push to GitHub
git push -u origin main
```

Then enable GitHub Pages in repository settings.

### Step 6: Custom Domain (Optional)

If you want to use your custom domain (femfur.space):

1. Go to your repository Settings → Pages
2. Enter your custom domain in "Custom domain" field
3. Add a CNAME file to your repository with your domain name
4. Configure your DNS settings:
   - Add a CNAME record pointing to `yourusername.github.io`
   - Or add A records pointing to GitHub's IPs:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```

## 📋 Board List

### Art & Creative
- `/art/` - Artwork & Drawings
- `/lit/` - Literature & Stories
- `/po/` - Poetry
- `/mu/` - Music
- `/diy/` - DIY & Crafts
- `/ph/` - Photography

### Discussion
- `/b/` - Random
- `/soc/` - Social
- `/chat/` - General Chat
- `/news/` - News & Current Events
- `/int/` - International
- `/r9k/` - Robot9000

### Furry & Anime
- `/fur/` - Furry
- `/a/` - Anime & Manga
- `/vn/` - Visual Novels
- `/cm/` - Cute Male
- `/c/` - Cute

### Games & Entertainment
- `/vg/` - Video Games
- `/tg/` - Tabletop Games
- `/vr/` - Virtual Reality
- `/vm/` - Retro Games
- `/tv/` - TV & Film
- `/co/` - Comics & Cartoons

### Technology
- `/g/` - Technology
- `/pr/` - Programming
- `/sci/` - Science
- `/wsr/` - Tech Support
- `/3/` - 3D Printing

### Lifestyle
- `/fit/` - Fitness & Health
- `/ck/` - Food & Cooking
- `/fa/` - Fashion
- `/adv/` - Advice
- `/trv/` - Travel
- `/out/` - Outdoors

### Hobbies
- `/sp/` - Sports
- `/auto/` - Automobiles
- `/an/` - Animals & Nature
- `/his/` - History
- `/p/` - Photography

### Adult (18+)
- `/e/` - Ecchi
- `/h/` - Hentai
- `/gif/` - Adult GIF

## 🔧 How It Works

1. **Supabase Client**: Single instance created in `supabaseClient.js` and imported everywhere
2. **Hash Navigation**: Uses URL hash (#) for routing without page reloads
3. **Boards**: Clicking a board loads its threads from Supabase `threads` table filtered by `board` field
4. **Threads**: Clicking a thread loads the original post and all replies from `replies` table
5. **Image Upload**: Images are uploaded to Supabase Storage and URLs are stored in database
6. **Global Visibility**: All posts are immediately visible to all users worldwide

## 🐛 Troubleshooting

### "Error loading threads"
- Check if SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Verify tables are created in Supabase
- Check if Row Level Security policies are set up

### "Error uploading image"
- Make sure the `images` bucket exists in Supabase Storage
- Verify the bucket is set to **public**
- Check storage policies allow INSERT and SELECT

### Hash navigation not working
- Make sure you're not clicking regular links
- All board links should use hash format: `#b`, `#art`, etc.
- Thread links should be: `#b-uuid`, `#art-uuid`, etc.

### Doesn't work locally
- ES6 modules require an HTTP server
- Use a local server (VS Code Live Server extension)
- Or deploy directly to GitHub Pages

### Images not showing
- Check if Supabase Storage bucket is public
- Verify the image URL in database is valid
- Check browser console for CORS errors

## 📱 Usage

1. Open the site (femfur.space or your GitHub Pages URL)
2. Select a board from the homepage or top navigation
3. Click "[Start a New Thread]" to create a thread
4. Fill in optional subject, required comment, and optional image
5. Click "Post" to publish
6. Click on any thread to view and reply
7. All posts are visible to everyone globally in real-time!

## 🔒 Security Notes

Current implementation:
- Anonymous posting (no authentication)
- No moderation system
- No post deletion from UI
- Anyone can post threads and replies

For production use, consider adding:
- User authentication
- CAPTCHA to prevent spam
- Moderation tools
- Rate limiting
- Content filtering
- Ability to delete/report posts

## 💾 Database Schema

### threads table
- `id` (UUID, primary key)
- `board` (TEXT) - Board identifier (b, art, fur, etc.)
- `subject` (TEXT, optional) - Thread subject
- `comment` (TEXT, required) - Thread content
- `image_url` (TEXT, optional) - URL to uploaded image
- `created_at` (TIMESTAMP) - Creation timestamp

### replies table
- `id` (UUID, primary key)
- `thread_id` (UUID, foreign key) - References threads.id
- `comment` (TEXT, required) - Reply content
- `image_url` (TEXT, optional) - URL to uploaded image
- `created_at` (TIMESTAMP) - Creation timestamp

## 📄 License

Free to use and modify

## 🤝 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Supabase configuration
3. Check if all tables and policies are set up correctly
4. Make sure storage bucket is public and has proper policies

---

Enjoy your imageboard! 🎉

**Important**: This is a basic implementation. For a production site, implement proper moderation, spam protection, and content policies.
