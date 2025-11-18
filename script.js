// Funções de Autenticação
function isLoggedIn() {
    return localStorage.getItem('loggedIn') === 'true';
}

function login(username, password) {
    if (username === 'admin' && password === 'adm123') {
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('user', username);
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function register(username, password, email) {
    // Simples: salva em localStorage (não valida duplicatas)
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    users.push({ username, password, email });
    localStorage.setItem('users', JSON.stringify(users));
    showFlashMessage('Registro realizado com sucesso! Faça login.');
    setTimeout(() => window.location.href = 'login.html', 1000);
}

// Verifica login ao carregar qualquer página (exceto login/register)
if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
    }
}

// Funções para IndexedDB (livros - mantidas iguais)
const DB_NAME = 'LibraryDB';
const DB_VERSION = 1;
const STORE_NAME = 'books';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function addBook(book) {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.add(book);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

async function getBooks(search = '') {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            let books = request.result;
            if (search) {
                books = books.filter(book =>
                    book.title.toLowerCase().includes(search.toLowerCase()) ||
                    book.author.toLowerCase().includes(search.toLowerCase())
                );
            }
            resolve(books);
        };
        request.onerror = () => reject(request.error);
    });
}

async function updateBook(id, updates) {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const book = request.result;
            Object.assign(book, updates);
            store.put(book);
            resolve(book);
        };
        request.onerror = () => reject(request.error);
    });
}

function showFlashMessage(message, type = 'success') {
    const flashDiv = document.getElementById('flash-messages');
    if (flashDiv) {
        flashDiv.innerHTML = `<div class="flash flash-${type}">${message}</div>`;
        setTimeout(() => flashDiv.innerHTML = '', 3000);
    }
}

// Login
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (login(username, password)) {
            showFlashMessage('Login realizado com sucesso!');
            setTimeout(() => window.location.href = 'index.html', 1000);
        } else {
            showFlashMessage('Usuário ou senha incorretos.', 'error');
        }
    });
}

// Registro
if (document.getElementById('register-form')) {
    document.getElementById('register-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const email = document.getElementById('email').value;
        
        register(username, password, email);
    });
}

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

// Adicionar Livro (mantido)
if (document.getElementById('book-form')) {
    document.getElementById('book-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const book = {
            title: document.getElementById('title').value,
            author: document.getElementById('author').value,
            isbn: document.getElementById('isbn').value,
            available: document.getElementById('available').checked
        };
        
        try {
            await addBook(book);
            showFlashMessage('Livro adicionado com sucesso!');
            this.reset();
            setTimeout(() => window.location.href = 'books.html', 1000);
        } catch (error) {
            showFlashMessage('Erro ao adicionar livro.', 'error');
        }
    });
}

// Listar e Buscar Livros (mantido)
if (document.getElementById('books-list')) {
    async function loadBooks(search = '') {
        try {
            const books = await getBooks(search);
            renderBooks(books);
        } catch (error) {
            showFlashMessage('Erro ao carregar livros.', 'error');
        }
    }

    function renderBooks(books) {
        const listDiv = document.getElementById('books-list');
        if (books.length === 0) {
            listDiv.innerHTML = '<div class="empty-state"><p>Sem livros disponíveis. <a href="add_book.html">Adicionar seu próprio livro?</a></p></div>';
            return;
        }
        
        let html = '<div class="books-table-container"><table class="books-table"><thead><tr><th>Título</th><th>Autor</th><th>ISBN</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
        books.forEach(book => {
            const statusClass = book.available ? 'available' : 'unavailable';
            const statusText = book.available ? 'Disponível' : 'Indisponível';
            const buttonClass = book.available ? 'btn-secondary' : 'btn-primary';
            const buttonText = book.available ? 'Marcar como Indisponível' : 'Marcar como Disponível';
            html += `
                <tr>
                    <td class="book-title">${book.title}</td>
                    <td>${book.author}</td>
                    <td>${book.isbn}</td>
                    <td><span class="status-badge status-${statusClass}">${statusText}</span></td>
                    <td><button class="btn btn-small ${buttonClass}" onclick="toggleBook(${book.id})">${buttonText}</button></td>
                </tr>
            `;
        });
        html += '</tbody></table></div>';
        listDiv.innerHTML = html;
    }

    async function toggleBook(bookId) {
        try {
            const updatedBook = await updateBook(bookId, { available: !await getBookAvailability(bookId) });
            const status = updatedBook.available ? 'disponível' : 'indisponível';
            showFlashMessage(`Livro "${updatedBook.title}" marcado como ${status}!`);
            loadBooks();
        } catch (error) {
            showFlashMessage('Erro ao alterar status.', 'error');
        }
    }

    async function getBookAvailability(id) {
        const books = await getBooks();
        const book = books.find(b => b.id === id);
        return book ? book.available : true;
    }

    document.getElementById('search-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const search = document.getElementById('search').value;
        loadBooks(search);
    });

    document.getElementById('clear-search').addEventListener('click', function() {
        document.getElementById('search').value = '';
        loadBooks();
    });

    loadBooks();
}