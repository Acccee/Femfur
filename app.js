// Main Application File

// Render home page
async function renderHomePage() {
    const content = `
        <div>
            <h1 class="page-title">Welcome to Femfur</h1>
            <p style="font-size: 1.2rem; color: var(--text-dim); margin-bottom: 3rem; animation: fadeInUp 0.8s ease-out;">
                A vibrant image-based bulletin board community. Join discussions, share images, and connect with others.
            </p>
            <div id="homeCategories">
                <div class="loading">Loading categories...</div>
            </div>
        </div>
    `;

    document.getElementById('mainContent').innerHTML = content;
    await loadHomePage();
}

// Load home page content
async function loadHomePage() {
    try {
        // Fetch categories with boards count
        const { data: categories, error: catError } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (catError) throw catError;

        // Fetch all boards
        const { data: boards, error: boardError } = await supabase
            .from('boards')
            .select('*');

        if (boardError) throw boardError;

        // Group boards by category
        const boardsByCategory = {};
        boards.forEach(board => {
            if (!boardsByCategory[board.category_id]) {
                boardsByCategory[board.category_id] = [];
            }
            boardsByCategory[board.category_id].push(board);
        });

        let html = '';

        if (categories.length === 0) {
            html = `
                <div class="empty-state">
                    <h3>Welcome to Femfur!</h3>
                    <p style="color: var(--text-dim); margin-bottom: 2rem;">
                        This community is brand new. Get started by creating the first category and board!
                    </p>
                    <button class="btn" onclick="loadPage('boards')" style="max-width: 300px; margin: 0 auto;">Get Started</button>
                </div>
            `;
        } else {
            html = '<div class="categories-grid">';
            categories.forEach(category => {
                const categoryBoards = boardsByCategory[category.id] || [];
                html += `
                    <div class="category-card" onclick="loadPage('boards')">
                        <h3 class="category-title">${escapeHtml(category.name)}</h3>
                        <p style="color: var(--text-dim); margin-bottom: 1rem;">${escapeHtml(category.description || 'No description')}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; color: var(--text-dim); font-size: 0.9rem;">
                            <span>${categoryBoards.length} board${categoryBoards.length !== 1 ? 's' : ''}</span>
                            <span style="color: var(--primary); font-weight: 700;">Explore →</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            html += `
                <div style="text-align: center; margin-top: 3rem;">
                    <h3 style="font-size: 1.5rem; color: var(--text-dim); margin-bottom: 1rem;">Ready to join the conversation?</h3>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button class="btn" onclick="loadPage('boards')" style="max-width: 200px;">View All Boards</button>
                        ${!currentUser ? '<button class="btn btn-secondary" onclick="loadPage(\'register\')" style="max-width: 200px;">Register Now</button>' : ''}
                    </div>
                </div>
            `;
        }

        document.getElementById('homeCategories').innerHTML = html;

    } catch (error) {
        console.error('Error loading home page:', error);
        document.getElementById('homeCategories').innerHTML = `
            <div class="alert alert-error">Failed to load content: ${error.message}</div>
        `;
    }
}

// Page routing
function loadPage(pageName) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
            link.classList.add('active');
        }
    });

    // Clear current content
    document.getElementById('mainContent').innerHTML = '<div class="loading">Loading...</div>';

    // Load appropriate page
    switch(pageName) {
        case 'home':
            renderHomePage();
            break;
        case 'boards':
            renderBoardsPage();
            break;
        case 'register':
            renderRegisterPage();
            break;
        case 'login':
            renderLoginPage();
            break;
        default:
            renderHomePage();
    }

    // Scroll to top
    window.scrollTo(0, 0);
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Set up navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            if (page) {
                loadPage(page);
            }
        });
    });

    // Load home page by default
    loadPage('home');

    // Check authentication status
    checkAuth();
});

// Handle clicks on dynamically added links
document.addEventListener('click', (e) => {
    if (e.target.dataset.page) {
        e.preventDefault();
        loadPage(e.target.dataset.page);
    }
});

// Make loadPage globally accessible
window.loadPage = loadPage;
