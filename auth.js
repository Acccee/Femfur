// Authentication Module

let currentUser = null;

// Check if user is already logged in
async function checkAuth() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            currentUser = user;
            updateUIForLoggedInUser(user);
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser(user) {
    const userInfo = document.getElementById('userInfo');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginLink = document.querySelector('[data-page="login"]');
    const registerLink = document.querySelector('[data-page="register"]');

    if (userInfo && logoutBtn) {
        userInfo.textContent = user.email;
        userInfo.style.display = 'block';
        logoutBtn.style.display = 'block';
    }

    if (loginLink) loginLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';
}

// Render registration page
function renderRegisterPage() {
    const content = `
        <div class="form-container">
            <h2 class="form-title">Join Femfur</h2>
            <div id="registerMessage"></div>
            <form id="registerForm">
                <div class="form-group">
                    <label class="form-label" for="registerEmail">Email</label>
                    <input type="email" id="registerEmail" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="registerPassword">Password</label>
                    <input type="password" id="registerPassword" class="form-input" required minlength="6">
                </div>
                <div class="form-group">
                    <label class="form-label" for="registerUsername">Username</label>
                    <input type="text" id="registerUsername" class="form-input" required>
                </div>
                <button type="submit" class="btn">Register</button>
            </form>
            <p style="text-align: center; margin-top: 1.5rem; color: var(--text-dim);">
                Already have an account? <a href="#" data-page="login" style="color: var(--primary); text-decoration: none; font-weight: 700;">Login here</a>
            </p>
        </div>
    `;

    document.getElementById('mainContent').innerHTML = content;

    // Add event listener for register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const username = document.getElementById('registerUsername').value;
    const messageDiv = document.getElementById('registerMessage');

    try {
        messageDiv.innerHTML = '<div class="alert">Processing registration...</div>';

        // Register user with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) throw authError;

        // Create profile in profiles table
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                {
                    id: authData.user.id,
                    username: username,
                    email: email,
                }
            ]);

        if (profileError) {
            console.error('Profile creation error:', profileError);
        }

        messageDiv.innerHTML = '<div class="alert alert-success">Registration successful! Please check your email to verify your account.</div>';
        
        setTimeout(() => {
            loadPage('login');
        }, 2000);

    } catch (error) {
        console.error('Registration error:', error);
        messageDiv.innerHTML = `<div class="alert alert-error">Registration failed: ${error.message}</div>`;
    }
}

// Render login page
function renderLoginPage() {
    const content = `
        <div class="form-container">
            <h2 class="form-title">Welcome Back</h2>
            <div id="loginMessage"></div>
            <form id="loginForm">
                <div class="form-group">
                    <label class="form-label" for="loginEmail">Email</label>
                    <input type="email" id="loginEmail" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="loginPassword">Password</label>
                    <input type="password" id="loginPassword" class="form-input" required>
                </div>
                <button type="submit" class="btn">Login</button>
            </form>
            <p style="text-align: center; margin-top: 1.5rem; color: var(--text-dim);">
                Don't have an account? <a href="#" data-page="register" style="color: var(--primary); text-decoration: none; font-weight: 700;">Register here</a>
            </p>
        </div>
    `;

    document.getElementById('mainContent').innerHTML = content;

    // Add event listener for login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const messageDiv = document.getElementById('loginMessage');

    try {
        messageDiv.innerHTML = '<div class="alert">Logging in...</div>';

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        currentUser = data.user;
        updateUIForLoggedInUser(data.user);

        messageDiv.innerHTML = '<div class="alert alert-success">Login successful!</div>';
        
        setTimeout(() => {
            loadPage('home');
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        messageDiv.innerHTML = `<div class="alert alert-error">Login failed: ${error.message}</div>`;
    }
}

// Handle logout
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        currentUser = null;
        
        // Reset UI
        const userInfo = document.getElementById('userInfo');
        const logoutBtn = document.getElementById('logoutBtn');
        const loginLink = document.querySelector('[data-page="login"]');
        const registerLink = document.querySelector('[data-page="register"]');

        if (userInfo) userInfo.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginLink) loginLink.style.display = 'block';
        if (registerLink) registerLink.style.display = 'block';

        loadPage('home');

    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed: ' + error.message);
    }
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});
