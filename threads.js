// Threads Module

let currentBoardId = null;
let currentBoardName = null;
let currentThreadId = null;

// Open a board and show its threads
async function openBoard(boardId, boardName) {
    currentBoardId = boardId;
    currentBoardName = boardName;
    currentThreadId = null;

    const content = `
        <div class="boards-header">
            <div>
                <button class="btn btn-secondary" onclick="loadPage('boards')" style="max-width: 150px;">← Back</button>
                <h2 class="page-title" style="display: inline-block; margin-left: 1rem;">${escapeHtml(boardName)}</h2>
            </div>
            <button class="btn" id="createThreadBtn" style="max-width: 250px;">Create New Thread</button>
        </div>
        <div id="threadsContent">
            <div class="loading">Loading threads...</div>
        </div>
    `;

    document.getElementById('mainContent').innerHTML = content;

    // Add event listener for create thread button
    const createBtn = document.getElementById('createThreadBtn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            if (!currentUser) {
                alert('Please login to create threads');
                loadPage('login');
                return;
            }
            openCreateThreadModal();
        });
    }

    // Load threads for this board
    await loadThreads(boardId);
}

// Load threads for a board
async function loadThreads(boardId) {
    try {
        const { data: threads, error } = await supabase
            .from('threads')
            .select(`
                *,
                profiles:created_by (username)
            `)
            .eq('board_id', boardId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        let html = '';

        if (threads.length === 0) {
            html = `
                <div class="empty-state">
                    <h3>No threads yet</h3>
                    <p style="color: var(--text-dim);">Be the first to start a discussion!</p>
                </div>
            `;
        } else {
            html = '<div class="thread-list">';
            threads.forEach(thread => {
                const createdDate = new Date(thread.created_at).toLocaleDateString();
                const username = thread.profiles?.username || 'Anonymous';
                
                html += `
                    <div class="thread-card" onclick="openThread('${thread.id}')">
                        <div class="thread-header">
                            <div>
                                <h3 class="thread-title">${escapeHtml(thread.title)}</h3>
                                <div class="thread-meta">
                                    Posted by ${escapeHtml(username)} on ${createdDate}
                                </div>
                            </div>
                        </div>
                        <div class="thread-content">
                            ${escapeHtml(thread.content.substring(0, 200))}${thread.content.length > 200 ? '...' : ''}
                        </div>
                        ${thread.image_url ? `<img src="${thread.image_url}" alt="Thread image" class="thread-image">` : ''}
                    </div>
                `;
            });
            html += '</div>';
        }

        document.getElementById('threadsContent').innerHTML = html;

    } catch (error) {
        console.error('Error loading threads:', error);
        document.getElementById('threadsContent').innerHTML = `
            <div class="alert alert-error">Failed to load threads: ${error.message}</div>
        `;
    }
}

// Open create thread modal
function openCreateThreadModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'createThreadModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Create New Thread</h3>
                <button class="modal-close" onclick="closeModal('createThreadModal')">&times;</button>
            </div>
            <div id="createThreadMessage"></div>
            <form id="createThreadForm">
                <div class="form-group">
                    <label class="form-label" for="threadTitle">Title</label>
                    <input type="text" id="threadTitle" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="threadContent">Content</label>
                    <textarea id="threadContent" class="form-textarea" required></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label" for="threadImage">Image URL (optional)</label>
                    <input type="url" id="threadImage" class="form-input" placeholder="https://example.com/image.jpg">
                </div>
                <button type="submit" class="btn">Create Thread</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('createThreadForm').addEventListener('submit', handleCreateThread);
}

// Handle create thread
async function handleCreateThread(e) {
    e.preventDefault();

    const title = document.getElementById('threadTitle').value;
    const content = document.getElementById('threadContent').value;
    const imageUrl = document.getElementById('threadImage').value;
    const messageDiv = document.getElementById('createThreadMessage');

    try {
        messageDiv.innerHTML = '<div class="alert">Creating thread...</div>';

        const { data, error } = await supabase
            .from('threads')
            .insert([
                {
                    board_id: currentBoardId,
                    title: title,
                    content: content,
                    image_url: imageUrl || null,
                    created_by: currentUser.id
                }
            ])
            .select();

        if (error) throw error;

        messageDiv.innerHTML = '<div class="alert alert-success">Thread created successfully!</div>';
        
        setTimeout(() => {
            closeModal('createThreadModal');
            loadThreads(currentBoardId);
        }, 1000);

    } catch (error) {
        console.error('Error creating thread:', error);
        messageDiv.innerHTML = `<div class="alert alert-error">Failed to create thread: ${error.message}</div>`;
    }
}

// Open a thread and show its posts
async function openThread(threadId) {
    currentThreadId = threadId;

    try {
        // Fetch thread details
        const { data: thread, error: threadError } = await supabase
            .from('threads')
            .select(`
                *,
                profiles:created_by (username)
            `)
            .eq('id', threadId)
            .single();

        if (threadError) throw threadError;

        const createdDate = new Date(thread.created_at).toLocaleDateString();
        const username = thread.profiles?.username || 'Anonymous';

        let content = `
            <div class="boards-header">
                <button class="btn btn-secondary" onclick="openBoard('${currentBoardId}', '${escapeHtml(currentBoardName)}')" style="max-width: 150px;">← Back to Board</button>
            </div>
            <div class="thread-card" style="cursor: default;">
                <div class="thread-header">
                    <div>
                        <h2 class="thread-title" style="font-size: 2rem;">${escapeHtml(thread.title)}</h2>
                        <div class="thread-meta">Posted by ${escapeHtml(username)} on ${createdDate}</div>
                    </div>
                </div>
                <div class="thread-content" style="font-size: 1.1rem; margin-top: 1rem;">
                    ${escapeHtml(thread.content)}
                </div>
                ${thread.image_url ? `<img src="${thread.image_url}" alt="Thread image" class="thread-image" style="max-width: 400px; margin-top: 1rem;">` : ''}
            </div>
            
            <div style="margin-top: 2rem;">
                <div class="boards-header">
                    <h3 style="font-size: 1.8rem; color: var(--primary);">Replies</h3>
                    <button class="btn" onclick="openCreatePostModal()" style="max-width: 200px;">Reply</button>
                </div>
                <div id="postsContent">
                    <div class="loading">Loading replies...</div>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = content;

        // Load posts for this thread
        await loadPosts(threadId);

    } catch (error) {
        console.error('Error loading thread:', error);
        document.getElementById('mainContent').innerHTML = `
            <div class="alert alert-error">Failed to load thread: ${error.message}</div>
        `;
    }
}

// Load posts for a thread
async function loadPosts(threadId) {
    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles:created_by (username)
            `)
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        let html = '';

        if (posts.length === 0) {
            html = `
                <div class="empty-state" style="padding: 2rem;">
                    <p style="color: var(--text-dim);">No replies yet. Be the first to reply!</p>
                </div>
            `;
        } else {
            html = '<div class="post-list">';
            posts.forEach(post => {
                const createdDate = new Date(post.created_at).toLocaleString();
                const username = post.profiles?.username || 'Anonymous';
                
                html += `
                    <div class="post-card">
                        <div class="post-header">
                            <span>${escapeHtml(username)}</span>
                            <span>${createdDate}</span>
                        </div>
                        <div class="post-content">${escapeHtml(post.content)}</div>
                        ${post.image_url ? `<img src="${post.image_url}" alt="Post image" class="thread-image" style="margin-top: 0.5rem; max-width: 300px;">` : ''}
                    </div>
                `;
            });
            html += '</div>';
        }

        document.getElementById('postsContent').innerHTML = html;

    } catch (error) {
        console.error('Error loading posts:', error);
        document.getElementById('postsContent').innerHTML = `
            <div class="alert alert-error">Failed to load posts: ${error.message}</div>
        `;
    }
}

// Open create post modal
function openCreatePostModal() {
    if (!currentUser) {
        alert('Please login to reply');
        loadPage('login');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'createPostModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Reply to Thread</h3>
                <button class="modal-close" onclick="closeModal('createPostModal')">&times;</button>
            </div>
            <div id="createPostMessage"></div>
            <form id="createPostForm">
                <div class="form-group">
                    <label class="form-label" for="postContent">Your Reply</label>
                    <textarea id="postContent" class="form-textarea" required></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label" for="postImage">Image URL (optional)</label>
                    <input type="url" id="postImage" class="form-input" placeholder="https://example.com/image.jpg">
                </div>
                <button type="submit" class="btn">Post Reply</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('createPostForm').addEventListener('submit', handleCreatePost);
}

// Handle create post
async function handleCreatePost(e) {
    e.preventDefault();

    const content = document.getElementById('postContent').value;
    const imageUrl = document.getElementById('postImage').value;
    const messageDiv = document.getElementById('createPostMessage');

    try {
        messageDiv.innerHTML = '<div class="alert">Posting reply...</div>';

        const { data, error } = await supabase
            .from('posts')
            .insert([
                {
                    thread_id: currentThreadId,
                    content: content,
                    image_url: imageUrl || null,
                    created_by: currentUser.id
                }
            ])
            .select();

        if (error) throw error;

        messageDiv.innerHTML = '<div class="alert alert-success">Reply posted successfully!</div>';
        
        setTimeout(() => {
            closeModal('createPostModal');
            loadPosts(currentThreadId);
        }, 1000);

    } catch (error) {
        console.error('Error creating post:', error);
        messageDiv.innerHTML = `<div class="alert alert-error">Failed to post reply: ${error.message}</div>`;
    }
}

// Make functions globally accessible
window.openBoard = openBoard;
window.openThread = openThread;
window.openCreateThreadModal = openCreateThreadModal;
window.openCreatePostModal = openCreatePostModal;
