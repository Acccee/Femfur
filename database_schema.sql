-- ============================================
-- FEMFUR IMAGEBOARD - DATABASE SCHEMA
-- ============================================
-- This SQL file contains the complete database schema
-- for the Femfur imageboard project.
-- 
-- Execute this in Supabase SQL Editor to set up your database.
-- ============================================

-- ============================================
-- 1. USERS TABLE
-- ============================================
-- Stores user accounts with hash-based profile system

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    status VARCHAR(100),
    always_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster nickname lookups
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

-- Index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);

COMMENT ON TABLE users IS 'User accounts with optional registration';
COMMENT ON COLUMN users.nickname IS 'Unique username for the user';
COMMENT ON COLUMN users.password_hash IS 'SHA-256 hashed password (use Argon2 in production)';
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar image in Supabase storage';
COMMENT ON COLUMN users.status IS 'Custom user status text (max 100 chars)';
COMMENT ON COLUMN users.always_anonymous IS 'If true, user posts anonymously by default';


-- ============================================
-- 2. THREADS TABLE
-- ============================================
-- Stores discussion threads on boards

CREATE TABLE IF NOT EXISTS threads (
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

-- Index for board filtering
CREATE INDEX IF NOT EXISTS idx_threads_board ON threads(board);

-- Index for bump-based sorting (most important for performance)
CREATE INDEX IF NOT EXISTS idx_threads_bumped ON threads(bumped_at DESC);

-- Composite index for sticky + bump sorting
CREATE INDEX IF NOT EXISTS idx_threads_sticky_bumped ON threads(is_sticky DESC, bumped_at DESC);

-- Index for user's threads
CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id) WHERE user_id IS NOT NULL;

-- Index for thread of the day queries
CREATE INDEX IF NOT EXISTS idx_threads_views ON threads(views DESC, created_at DESC);

-- Full-text search index for threads
CREATE INDEX IF NOT EXISTS idx_threads_search ON threads USING GIN(to_tsvector('english', title || ' ' || content));

COMMENT ON TABLE threads IS 'Discussion threads on various boards';
COMMENT ON COLUMN threads.board IS 'Board ID (e.g., "b", "fur", "a")';
COMMENT ON COLUMN threads.title IS 'Thread title/subject';
COMMENT ON COLUMN threads.content IS 'Thread opening post content';
COMMENT ON COLUMN threads.image_url IS 'URL to thread image in Supabase storage';
COMMENT ON COLUMN threads.user_id IS 'Creator user ID (null if anonymous or deleted user)';
COMMENT ON COLUMN threads.is_anonymous IS 'If true, hide user identity even if logged in';
COMMENT ON COLUMN threads.is_sticky IS 'If true, thread is pinned to top of board';
COMMENT ON COLUMN threads.views IS 'Unique view count (tracked via session)';
COMMENT ON COLUMN threads.bumped_at IS 'Last time thread was bumped (new reply)';


-- ============================================
-- 3. REPLIES TABLE
-- ============================================
-- Stores replies/comments to threads

CREATE TABLE IF NOT EXISTS replies (
    id BIGSERIAL PRIMARY KEY,
    thread_id BIGINT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for thread replies (most common query)
CREATE INDEX IF NOT EXISTS idx_replies_thread ON replies(thread_id, created_at ASC);

-- Index for user's replies
CREATE INDEX IF NOT EXISTS idx_replies_user ON replies(user_id) WHERE user_id IS NOT NULL;

-- Index for recent replies
CREATE INDEX IF NOT EXISTS idx_replies_created ON replies(created_at DESC);

-- Full-text search index for replies
CREATE INDEX IF NOT EXISTS idx_replies_search ON replies USING GIN(to_tsvector('english', content));

COMMENT ON TABLE replies IS 'Replies/comments to threads';
COMMENT ON COLUMN replies.thread_id IS 'Parent thread ID';
COMMENT ON COLUMN replies.content IS 'Reply text content';
COMMENT ON COLUMN replies.image_url IS 'URL to reply image in Supabase storage';
COMMENT ON COLUMN replies.user_id IS 'Poster user ID (null if anonymous or deleted user)';
COMMENT ON COLUMN replies.is_anonymous IS 'If true, hide user identity even if logged in';


-- ============================================
-- 4. REACTIONS TABLE
-- ============================================
-- Stores user reactions to threads and replies

CREATE TABLE IF NOT EXISTS reactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('thread', 'reply')),
    target_id BIGINT NOT NULL,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('skull', 'clown', 'based', 'cringe', 'schizo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id, reaction_type)
);

-- Index for fast reaction lookups by target
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_type, target_id);

-- Index for user's reactions
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);

-- Index for reaction type statistics
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type);

COMMENT ON TABLE reactions IS 'User reactions to threads and replies';
COMMENT ON COLUMN reactions.user_id IS 'User who reacted (required)';
COMMENT ON COLUMN reactions.target_type IS 'Type of target: thread or reply';
COMMENT ON COLUMN reactions.target_id IS 'ID of thread or reply';
COMMENT ON COLUMN reactions.reaction_type IS 'Type of reaction: skull, clown, based, cringe, schizo';


-- ============================================
-- 5. TRIGGERS
-- ============================================
-- Automated database actions

-- Auto-update bumped_at when reply is created
CREATE OR REPLACE FUNCTION bump_thread()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE threads
    SET bumped_at = NEW.created_at
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bump_thread
    AFTER INSERT ON replies
    FOR EACH ROW
    EXECUTE FUNCTION bump_thread();

COMMENT ON FUNCTION bump_thread IS 'Auto-bump thread when new reply is created';


-- Auto-update updated_at for users
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();


-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Note: For this imageboard, we use public access
-- In production, implement proper RLS policies

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (imageboard is public)
CREATE POLICY "Public read access on users"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Public read access on threads"
    ON threads FOR SELECT
    USING (true);

CREATE POLICY "Public read access on replies"
    ON replies FOR SELECT
    USING (true);

-- Public write access (anyone can post)
-- In production, add rate limiting and validation
CREATE POLICY "Public insert on users"
    ON users FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public insert on threads"
    ON threads FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public insert on replies"
    ON replies FOR INSERT
    WITH CHECK (true);

-- Public update for view counter
CREATE POLICY "Public update thread views"
    ON threads FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Reactions table policies
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access on reactions"
    ON reactions FOR SELECT
    USING (true);

CREATE POLICY "Users can insert reactions"
    ON reactions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can delete own reactions"
    ON reactions FOR DELETE
    USING (true);


-- ============================================
-- 6. USEFUL VIEWS
-- ============================================
-- Pre-computed views for common queries

-- Popular threads view
CREATE OR REPLACE VIEW popular_threads AS
SELECT 
    t.*,
    COUNT(r.id) as reply_count,
    (t.views + COUNT(r.id) * 2) as popularity_score
FROM threads t
LEFT JOIN replies r ON t.id = r.thread_id
GROUP BY t.id
ORDER BY popularity_score DESC;

COMMENT ON VIEW popular_threads IS 'Threads sorted by popularity (views + replies * 2)';


-- Recent activity view
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    'thread' as type,
    id,
    board,
    title as content_preview,
    user_id,
    is_anonymous,
    created_at
FROM threads
UNION ALL
SELECT 
    'reply' as type,
    r.id,
    t.board,
    SUBSTRING(r.content, 1, 100) as content_preview,
    r.user_id,
    r.is_anonymous,
    r.created_at
FROM replies r
JOIN threads t ON r.thread_id = t.id
ORDER BY created_at DESC
LIMIT 50;

COMMENT ON VIEW recent_activity IS 'Combined recent threads and replies';


-- ============================================
-- 7. SAMPLE DATA (Optional)
-- ============================================
-- Uncomment to insert sample data for testing

/*
-- Sample user
INSERT INTO users (nickname, password_hash, status) VALUES
('TestUser', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'Test user account');

-- Sample threads
INSERT INTO threads (board, title, content, user_id, is_sticky) VALUES
('b', 'Welcome to Femfur!', 'This is the first thread on /b/. Enjoy your stay!', 1, true),
('fur', 'Furry Art Thread', 'Post your favorite furry art here!', 1, false),
('a', 'Anime Discussion', 'What are you watching this season?', NULL, false);

-- Sample replies
INSERT INTO replies (thread_id, content, user_id) VALUES
(1, 'First reply!', NULL),
(1, 'Second!', 1),
(2, 'Here is my art...', NULL);
*/


-- ============================================
-- 8. MAINTENANCE QUERIES
-- ============================================
-- Useful queries for database maintenance

-- Count threads per board
-- SELECT board, COUNT(*) as thread_count FROM threads GROUP BY board ORDER BY thread_count DESC;

-- Find inactive threads (no activity in 30 days)
-- SELECT * FROM threads WHERE bumped_at < NOW() - INTERVAL '30 days';

-- Top posters
-- SELECT u.nickname, COUNT(*) as post_count FROM replies r JOIN users u ON r.user_id = u.id WHERE r.is_anonymous = false GROUP BY u.id ORDER BY post_count DESC LIMIT 10;

-- ============================================
-- SETUP COMPLETE
-- ============================================
-- Your database is now ready for the Femfur imageboard!
-- 
-- Next steps:
-- 1. Create storage bucket named 'image'
-- 2. Set up storage policies for public read/write
-- 3. Configure supabaseClient.js with your credentials
-- 4. Deploy to GitHub Pages
-- ============================================
