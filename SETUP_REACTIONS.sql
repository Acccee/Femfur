-- ============================================
-- FEMFUR IMAGEBOARD - QUICK SETUP SQL
-- ============================================
-- Выполните этот SQL код в Supabase SQL Editor
-- Это создаст ВСЕ необходимые таблицы и индексы
-- ============================================

-- Создание таблицы reactions если её нет
CREATE TABLE IF NOT EXISTS reactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('thread', 'reply')),
    target_id BIGINT NOT NULL,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('skull', 'clown', 'based', 'cringe', 'schizo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id, reaction_type)
);

-- Индексы для reactions
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type);

-- Полнотекстовые индексы для поиска
CREATE INDEX IF NOT EXISTS idx_threads_search ON threads USING GIN(to_tsvector('english', title || ' ' || coalesce(content, '')));
CREATE INDEX IF NOT EXISTS idx_replies_search ON replies USING GIN(to_tsvector('english', content));

-- RLS для reactions
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Политики для reactions
DROP POLICY IF EXISTS "Public read access on reactions" ON reactions;
CREATE POLICY "Public read access on reactions"
    ON reactions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert reactions" ON reactions;
CREATE POLICY "Users can insert reactions"
    ON reactions FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own reactions" ON reactions;
CREATE POLICY "Users can delete own reactions"
    ON reactions FOR DELETE
    USING (true);

-- Добавление колонки для владельца треда (если её нет)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'threads' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE threads ADD COLUMN created_by BIGINT REFERENCES users(id);
        UPDATE threads SET created_by = user_id WHERE user_id IS NOT NULL;
    END IF;
END $$;

-- Комментарии
COMMENT ON TABLE reactions IS 'User reactions to threads and replies';
COMMENT ON COLUMN reactions.user_id IS 'User who reacted (required)';
COMMENT ON COLUMN reactions.target_type IS 'Type of target: thread or reply';
COMMENT ON COLUMN reactions.target_id IS 'ID of thread or reply';
COMMENT ON COLUMN reactions.reaction_type IS 'Type of reaction: skull, clown, based, cringe, schizo';

-- Готово!
-- Теперь можете использовать все функции: поиск, реакции, и т.д.
