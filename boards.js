// Boards Module

// Render boards page with categories
async function renderBoardsPage() {
    const content = `
        <div class="boards-header">
            <h2 class="page-title">Boards</h2>
            <button class="btn" id="createBoardBtn" style="max-width: 250px;">Create New Board</button>
        </div>
        <div id="boardsContent">
            <div class="loading">Loading boards...</div>
        </div>
    `;

    document.getElementById('mainContent').innerHTML = content;

    // Add event listener for create board button
    const createBtn = document.getElementById('createBoardBtn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            if (!currentUser) {
                alert('Please login to create boards');
                loadPage('login');
                return;
            }
            openCreateBoardModal();
        });
    }

    // Load categories and boards
    await loadCategoriesWithBoards();
}

// Load all categories with their boards
async function loadCategoriesWithBoards() {
    try {
        // Fetch categories
        const { data: categories, error: catError } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (catError) throw catError;

        // Fetch all boards
        const { data: boards, error: boardError } = await supabase
            .from('boards')
            .select('*')
            .order('name');

        if (boardError) throw boardError;

        // Group boards by category
        const boardsByCategory = {};
        boards.forEach(board => {
            if (!boardsByCategory[board.category_id]) {
                boardsByCategory[board.category_id] = [];
            }
            boardsByCategory[board.category_id].push(board);
        });

        // Render categories with boards
        let html = '<div class="categories-grid">';

        if (categories.length === 0) {
            html = `
                <div class="empty-state">
                    <h3>No categories yet</h3>
                    <p style="color: var(--text-dim);">Be the first to create a category!</p>
                    <button class="btn" onclick="openCreateCategoryModal()" style="max-width: 300px; margin: 1rem auto;">Create Category</button>
                </div>
            `;
        } else {
            categories.forEach(category => {
                const categoryBoards = boardsByCategory[category.id] || [];
                html += `
                    <div class="category-card">
                        <h3 class="category-title">${escapeHtml(category.name)}</h3>
                        <p style="color: var(--text-dim); margin-bottom: 1rem;">${escapeHtml(category.description || '')}</p>
                        <ul class="boards-list">
                            ${categoryBoards.length > 0 
                                ? categoryBoards.map(board => `
                                    <li class="board-item" onclick="openBoard('${board.id}', '${escapeHtml(board.name)}')">
                                        <div class="board-name">/${escapeHtml(board.slug)}/ - ${escapeHtml(board.name)}</div>
                                        <div class="board-description">${escapeHtml(board.description || '')}</div>
                                    </li>
                                `).join('')
                                : '<li style="color: var(--text-dim); padding: 1rem;">No boards in this category</li>'
                            }
                        </ul>
                    </div>
                `;
            });
        }

        html += '</div>';

        // Add create category button
        if (categories.length > 0) {
            html += `
                <div style="text-align: center; margin-top: 2rem;">
                    <button class="btn btn-secondary" onclick="openCreateCategoryModal()" style="max-width: 300px;">Create New Category</button>
                </div>
            `;
        }

        document.getElementById('boardsContent').innerHTML = html;

    } catch (error) {
        console.error('Error loading boards:', error);
        document.getElementById('boardsContent').innerHTML = `
            <div class="alert alert-error">Failed to load boards: ${error.message}</div>
        `;
    }
}

// Open create board modal
function openCreateBoardModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'createBoardModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Create New Board</h3>
                <button class="modal-close" onclick="closeModal('createBoardModal')">&times;</button>
            </div>
            <div id="createBoardMessage"></div>
            <form id="createBoardForm">
                <div class="form-group">
                    <label class="form-label" for="boardName">Board Name</label>
                    <input type="text" id="boardName" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="boardSlug">Board Slug</label>
                    <input type="text" id="boardSlug" class="form-input" placeholder="e.g., a, b, vg" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="boardDescription">Description</label>
                    <textarea id="boardDescription" class="form-textarea"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label" for="boardCategory">Category</label>
                    <select id="boardCategory" class="form-input" required>
                        <option value="">Loading categories...</option>
                    </select>
                </div>
                <button type="submit" class="btn">Create Board</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Load categories for dropdown
    loadCategoriesForDropdown();

    // Add form submit handler
    document.getElementById('createBoardForm').addEventListener('submit', handleCreateBoard);
}

// Load categories for dropdown
async function loadCategoriesForDropdown() {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;

        const select = document.getElementById('boardCategory');
        if (select) {
            if (categories.length === 0) {
                select.innerHTML = '<option value="">No categories available</option>';
            } else {
                select.innerHTML = '<option value="">Select a category</option>' +
                    categories.map(cat => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Handle create board
async function handleCreateBoard(e) {
    e.preventDefault();

    const name = document.getElementById('boardName').value;
    const slug = document.getElementById('boardSlug').value;
    const description = document.getElementById('boardDescription').value;
    const categoryId = document.getElementById('boardCategory').value;
    const messageDiv = document.getElementById('createBoardMessage');

    if (!categoryId) {
        messageDiv.innerHTML = '<div class="alert alert-error">Please select a category</div>';
        return;
    }

    try {
        messageDiv.innerHTML = '<div class="alert">Creating board...</div>';

        const { data, error } = await supabase
            .from('boards')
            .insert([
                {
                    name: name,
                    slug: slug,
                    description: description,
                    category_id: categoryId,
                    created_by: currentUser.id
                }
            ])
            .select();

        if (error) throw error;

        messageDiv.innerHTML = '<div class="alert alert-success">Board created successfully!</div>';
        
        setTimeout(() => {
            closeModal('createBoardModal');
            loadCategoriesWithBoards();
        }, 1000);

    } catch (error) {
        console.error('Error creating board:', error);
        messageDiv.innerHTML = `<div class="alert alert-error">Failed to create board: ${error.message}</div>`;
    }
}

// Open create category modal
function openCreateCategoryModal() {
    if (!currentUser) {
        alert('Please login to create categories');
        loadPage('login');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'createCategoryModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Create New Category</h3>
                <button class="modal-close" onclick="closeModal('createCategoryModal')">&times;</button>
            </div>
            <div id="createCategoryMessage"></div>
            <form id="createCategoryForm">
                <div class="form-group">
                    <label class="form-label" for="categoryName">Category Name</label>
                    <input type="text" id="categoryName" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="categoryDescription">Description</label>
                    <textarea id="categoryDescription" class="form-textarea"></textarea>
                </div>
                <button type="submit" class="btn">Create Category</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('createCategoryForm').addEventListener('submit', handleCreateCategory);
}

// Handle create category
async function handleCreateCategory(e) {
    e.preventDefault();

    const name = document.getElementById('categoryName').value;
    const description = document.getElementById('categoryDescription').value;
    const messageDiv = document.getElementById('createCategoryMessage');

    try {
        messageDiv.innerHTML = '<div class="alert">Creating category...</div>';

        const { data, error } = await supabase
            .from('categories')
            .insert([
                {
                    name: name,
                    description: description
                }
            ])
            .select();

        if (error) throw error;

        messageDiv.innerHTML = '<div class="alert alert-success">Category created successfully!</div>';
        
        setTimeout(() => {
            closeModal('createCategoryModal');
            loadCategoriesWithBoards();
        }, 1000);

    } catch (error) {
        console.error('Error creating category:', error);
        messageDiv.innerHTML = `<div class="alert alert-error">Failed to create category: ${error.message}</div>`;
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally accessible
window.openCreateBoardModal = openCreateBoardModal;
window.openCreateCategoryModal = openCreateCategoryModal;
window.closeModal = closeModal;
