/* ══════════════════════════════════════════════
   TRUEQUE — app.js
   Estado local (sin backend aún)
   Cuando conectes FastAPI, sustituye las
   funciones marcadas con [API] por fetch()
══════════════════════════════════════════════ */

// ─────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────
const State = {
    currentUser: null,      // { id, name, email, avatar }
    products: [],           // todos los productos
    cart: [],               // { product, qty }
    likedProducts: new Set(),
    activeCategory: 'all',
    searchQuery: '',
    currentDetailProduct: null,
};

// ─────────────────────────────────────────────
// DATOS DE DEMO (se eliminan cuando conectes API)
// ─────────────────────────────────────────────
const DEMO_PRODUCTS = [
    {
        id: 'p1',
        title: 'Tenis Nike Air Max 90 Talla 27',
        description: 'En excelente estado, usados solo 3 veces. Talla 27 MX / 9 US. Color blanco con detalles grises. Sin caja original.',
        category: 'calzado',
        price: 10,
        address: 'Col. Las Quintas, Torreón',
        photos: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80'],
        seller: { id: 'u1', name: 'Carlos M.', avatar: 'C' },
        createdAt: new Date('2024-11-10'),
        likes: 12,
    },
    {
        id: 'p2',
        title: 'Chamarra de piel negra talla M',
        description: 'Chamarra de piel sintética negra, talla M. Muy buen estado, sin roturas ni manchas. La usé solo una temporada.',
        category: 'ropa',
        price: 10,
        address: 'Col. Centro, Torreón',
        photos: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80'],
        seller: { id: 'u2', name: 'Ana R.', avatar: 'A' },
        createdAt: new Date('2024-11-08'),
        likes: 7,
    },
    {
        id: 'p3',
        title: 'Perfume Paco Rabanne 1 Million 100ml',
        description: '70% de contenido restante. Original, no réplica. Se conservó en cajón lejos de la luz. Fragancia masculina.',
        category: 'perfume',
        price: 10,
        address: 'Col. Jardín, Torreón',
        photos: ['https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&q=80'],
        seller: { id: 'u3', name: 'Marco T.', avatar: 'M' },
        createdAt: new Date('2024-11-06'),
        likes: 23,
    },
    {
        id: 'p4',
        title: 'Jeans Levi\'s 501 Talla 32x30',
        description: 'Jeans originales Levi\'s 501, talla 32x30. Desgaste natural, sin roturas. Color azul medio clásico.',
        category: 'pantalones',
        price: 10,
        address: 'Col. Las Américas, Torreón',
        photos: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80'],
        seller: { id: 'u4', name: 'Diego L.', avatar: 'D' },
        createdAt: new Date('2024-11-05'),
        likes: 5,
    },
    {
        id: 'p5',
        title: 'iPhone 12 Pro 128GB Grafito',
        description: 'Libre de fábrica. Batería al 89%. Pantalla sin rayones. Se vende con cargador original. IMEI limpio.',
        category: 'electronico',
        price: 10,
        address: 'Col. Residencial, Torreón',
        photos: ['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&q=80'],
        seller: { id: 'u1', name: 'Carlos M.', avatar: 'C' },
        createdAt: new Date('2024-11-03'),
        likes: 41,
    },
    {
        id: 'p6',
        title: 'Bolsa Coach de piel color camel',
        description: 'Bolsa mediana Coach piel genuina, color camel. Interior limpio, sin manchas. Correa ajustable incluida.',
        category: 'accesorio',
        price: 10,
        address: 'Centro Histórico, Torreón',
        photos: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80'],
        seller: { id: 'u5', name: 'Laura P.', avatar: 'L' },
        createdAt: new Date('2024-11-01'),
        likes: 18,
    },
];

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    State.products = [...DEMO_PRODUCTS, ...State.products];
    renderProducts();
    updateHeroStats();
    updateCartBadge();
    setupSearch();

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => { });
    }
});

function loadFromStorage() {
    try {
        const user = localStorage.getItem('trueque_user');
        if (user) State.currentUser = JSON.parse(user);

        const cart = localStorage.getItem('trueque_cart');
        if (cart) State.cart = JSON.parse(cart);

        const products = localStorage.getItem('trueque_products');
        if (products) State.products = JSON.parse(products);

        const liked = localStorage.getItem('trueque_liked');
        if (liked) State.likedProducts = new Set(JSON.parse(liked));
    } catch (e) { /* ignore */ }
}

function saveToStorage() {
    try {
        if (State.currentUser) localStorage.setItem('trueque_user', JSON.stringify(State.currentUser));
        localStorage.setItem('trueque_cart', JSON.stringify(State.cart));
        // Solo guarda productos del usuario (no los demo)
        const userProducts = State.products.filter(p => !DEMO_PRODUCTS.find(d => d.id === p.id));
        localStorage.setItem('trueque_products', JSON.stringify(userProducts));
        localStorage.setItem('trueque_liked', JSON.stringify([...State.likedProducts]));
    } catch (e) { /* ignore */ }
}

// ─────────────────────────────────────────────
// RENDER PRODUCTS
// ─────────────────────────────────────────────
function getFilteredProducts() {
    return State.products.filter(p => {
        const matchCat = State.activeCategory === 'all' || p.category === State.activeCategory;
        const q = State.searchQuery.toLowerCase();
        const matchSearch = !q ||
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.address.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q);
        return matchCat && matchSearch;
    });
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const filtered = getFilteredProducts();
    const empty = document.getElementById('emptyProducts');
    const count = document.getElementById('productsCount');

    count.textContent = `${filtered.length} artículo${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    grid.innerHTML = filtered.map(p => createCardHTML(p)).join('');

    // Actualiza el estado de likes
    document.querySelectorAll('.card-like').forEach(btn => {
        const id = btn.dataset.id;
        if (State.likedProducts.has(id)) btn.classList.add('liked');
    });
}

function createCardHTML(p) {
    const photo = p.photos && p.photos.length > 0 ? p.photos[0] : null;
    const price = formatPrice(p.price);
    const liked = State.likedProducts.has(p.id);
    const avatarContent = p.seller.avatar.startsWith('data:') || p.seller.avatar.startsWith('http')
        ? `<img src="${p.seller.avatar}" alt="">`
        : p.seller.avatar;

    return `
    <article class="product-card" onclick="openDetail('${p.id}')">
      <div class="card-photos">
        ${photo
            ? `<img src="${photo}" alt="${escHtml(p.title)}" loading="lazy">`
            : `<div class="card-no-photo"><svg viewBox="0 0 40 40" fill="none"><rect x="4" y="8" width="32" height="24" rx="2" stroke="currentColor" stroke-width="1.5" opacity=".4"/><circle cx="14" cy="18" r="3" stroke="currentColor" stroke-width="1.5" opacity=".4"/><path d="M4 28l8-8 6 6 4-4 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" opacity=".4"/></svg></div>`
        }
        <span class="card-cat">${p.category}</span>
        <button class="card-like ${liked ? 'liked' : ''}" data-id="${p.id}"
          onclick="event.stopPropagation(); toggleLikeCard('${p.id}', this)">
          <svg viewBox="0 0 20 20" fill="${liked ? 'currentColor' : 'none'}">
            <path d="M10 17s-7-4.5-7-9a5 5 0 0110 0" stroke="currentColor" stroke-width="1.4"/>
            <path d="M10 17s7-4.5 7-9a5 5 0 00-10 0" stroke="currentColor" stroke-width="1.4"/>
          </svg>
        </button>
        <div class="card-overlay">
          <button class="card-overlay-btn" onclick="event.stopPropagation(); addToCart('${p.id}')">+ Carrito</button>
          <button class="card-overlay-btn" onclick="event.stopPropagation(); openDetail('${p.id}')">Ver más</button>
        </div>
      </div>
      <div class="card-info">
        <div class="card-title">${escHtml(p.title)}</div>
        <div class="card-price">${price}</div>
        <div class="card-location">
          <svg viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5s4.5-4.75 4.5-8.5c0-2.485-2.015-4.5-4.5-4.5z" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.2"/></svg>
          ${escHtml(p.address)}
        </div>
      </div>
      <div class="card-seller">
        <div class="card-seller-avatar">${avatarContent}</div>
        <span>${escHtml(p.seller.name)}</span>
      </div>
    </article>
  `;
}

// ─────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────
function setupSearch() {
    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClear');

    input.addEventListener('input', () => {
        State.searchQuery = input.value.trim();
        clearBtn.classList.toggle('visible', State.searchQuery.length > 0);
        renderProducts();
        document.getElementById('hero').style.display = State.searchQuery ? 'none' : '';
    });
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    State.searchQuery = '';
    document.getElementById('searchClear').classList.remove('visible');
    document.getElementById('hero').style.display = '';
    renderProducts();
}

function filterCat(btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    State.activeCategory = btn.dataset.cat;
    const labels = {
        all: 'Todos los artículos', ropa: 'Ropa', calzado: 'Calzado',
        pantalones: 'Pantalones', perfume: 'Perfumes', accesorio: 'Accesorios',
        electronico: 'Electrónica', otro: 'Otros',
    };
    document.getElementById('sectionLabel').textContent = labels[State.activeCategory] || 'Artículos';
    renderProducts();
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─────────────────────────────────────────────
// USER PANEL
// ─────────────────────────────────────────────
function toggleUserPanel() {
    const panel = document.getElementById('userPanel');
    const overlay = document.getElementById('overlayUser');
    const isOpen = panel.classList.contains('open');
    if (isOpen) {
        closeUserPanel();
    } else {
        closeCart();
        panel.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        refreshProfilePanel();
    }
}

function closeUserPanel() {
    document.getElementById('userPanel').classList.remove('open');
    document.getElementById('overlayUser').classList.remove('active');
    document.body.style.overflow = '';
}

function refreshProfilePanel() {
    const authSec = document.getElementById('authSection');
    const profSec = document.getElementById('profileSection');
    if (State.currentUser) {
        authSec.classList.add('hidden');
        profSec.classList.remove('hidden');
        renderProfileInfo();
        renderMyProducts();
    } else {
        authSec.classList.remove('hidden');
        profSec.classList.add('hidden');
    }
}

function renderProfileInfo() {
    const u = State.currentUser;
    if (!u) return;
    const avatar = document.getElementById('avatarDisplay');
    if (u.avatar && u.avatar.startsWith('data:')) {
        avatar.innerHTML = `<img src="${u.avatar}" alt="">`;
    } else {
        avatar.textContent = u.name ? u.name[0].toUpperCase() : '?';
    }
    document.getElementById('profileName').textContent = u.name;
    document.getElementById('profileEmail').textContent = u.email;

    const myProds = State.products.filter(p => p.seller.id === u.id);
    document.getElementById('statProducts').textContent = myProds.length;
    document.getElementById('statSold').textContent = '0'; // conectar con API
}

function renderMyProducts() {
    const container = document.getElementById('myProductsList');
    if (!State.currentUser) return;
    const myProds = State.products.filter(p => p.seller.id === State.currentUser.id);
    if (myProds.length === 0) {
        container.innerHTML = '<div class="empty-state-small">Aún no tienes productos.</div>';
        return;
    }
    container.innerHTML = myProds.map(p => `
    <div class="my-product-row">
      <div class="my-product-thumb">
        ${p.photos && p.photos[0] ? `<img src="${p.photos[0]}" alt="">` : ''}
      </div>
      <div class="my-product-info">
        <div class="my-product-name">${escHtml(p.title)}</div>
        <div class="my-product-price">${formatPrice(p.price)}</div>
      </div>
      <button class="my-product-del" onclick="deleteProduct('${p.id}')" title="Eliminar">✕</button>
    </div>
  `).join('');
}

function switchTab(tab) {
    document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
    document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
    document.getElementById('formLogin').classList.toggle('hidden', tab !== 'login');
    document.getElementById('formRegister').classList.toggle('hidden', tab !== 'register');
}

// ─────────────────────────────────────────────
// AUTH — [API] conectar con /auth/login y /auth/register
// ─────────────────────────────────────────────
function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');

    errEl.textContent = '';
    if (!email || !password) { errEl.textContent = 'Completa todos los campos.'; return; }
    if (!isValidEmail(email)) { errEl.textContent = 'Correo inválido.'; return; }

    // === [API] POST /auth/login ===
    // Simulación local:
    const stored = localStorage.getItem('trueque_users');
    const users = stored ? JSON.parse(stored) : [];
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) { errEl.textContent = 'Correo o contraseña incorrectos.'; return; }

    State.currentUser = { id: user.id, name: user.name, email: user.email, avatar: user.avatar || '' };
    localStorage.setItem('trueque_user', JSON.stringify(State.currentUser));
    toast('¡Bienvenido de vuelta, ' + user.name + '!', 'success');
    refreshProfilePanel();
}

function doRegister() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const errEl = document.getElementById('registerError');

    errEl.textContent = '';
    if (!name || !email || !password) { errEl.textContent = 'Completa todos los campos.'; return; }
    if (!isValidEmail(email)) { errEl.textContent = 'Correo inválido.'; return; }
    if (password.length < 6) { errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }

    // === [API] POST /auth/register ===
    const stored = localStorage.getItem('trueque_users');
    const users = stored ? JSON.parse(stored) : [];

    if (users.find(u => u.email === email)) {
        errEl.textContent = 'Este correo ya está registrado.';
        return;
    }

    const newUser = {
        id: 'u_' + Date.now(),
        name,
        email,
        password: password,
        avatar: '',
    };
    users.push(newUser);
    localStorage.setItem('trueque_users', JSON.stringify(users));

    State.currentUser = { id: newUser.id, name, email, avatar: '' };
    localStorage.setItem('trueque_user', JSON.stringify(State.currentUser));
    toast('Cuenta creada. ¡Bienvenido, ' + name + '!', 'success');
    refreshProfilePanel();
}

function doLogout() {
    State.currentUser = null;
    localStorage.removeItem('trueque_user');
    closeUserPanel();
    toast('Sesión cerrada.');
}

function changeAvatar(input) {
    if (!input.files[0] || !State.currentUser) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        State.currentUser.avatar = e.target.result;
        saveToStorage();
        renderProfileInfo();
        toast('Foto actualizada.', 'success');
    };
    reader.readAsDataURL(input.files[0]);
}

// ─────────────────────────────────────────────
// VENDER / CREAR PRODUCTO
// ─────────────────────────────────────────────
let uploadedPhotos = []; // base64 strings

function openSell() {
    if (!State.currentUser) {
        closeCart();
        toggleUserPanel();
        toast('Inicia sesión para vender.');
        return;
    }
    document.getElementById('sellOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSell() {
    document.getElementById('sellOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

function closeSellIfOutside(e) {
    if (e.target === document.getElementById('sellOverlay')) closeSell();
}

function triggerPhotoInput() {
    document.getElementById('photoInput').click();
}

function handlePhotos(input) {
    const files = Array.from(input.files);
    const remaining = 10 - uploadedPhotos.length;
    const toAdd = files.slice(0, remaining);

    toAdd.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedPhotos.push(e.target.result);
            renderPhotoPreviews();
        };
        reader.readAsDataURL(file);
    });

    if (files.length > remaining) {
        toast(`Máximo 10 fotos. Se agregaron ${toAdd.length}.`);
    }
    input.value = '';
}

function renderPhotoPreviews() {
    const container = document.getElementById('photoPreviews');
    container.innerHTML = uploadedPhotos.map((src, i) => `
    <div class="photo-preview">
      <img src="${src}" alt="">
      <button class="photo-remove" onclick="removePhoto(${i})">✕</button>
    </div>
  `).join('');
}

function removePhoto(index) {
    uploadedPhotos.splice(index, 1);
    renderPhotoPreviews();
}

function publishProduct() {
    const title = document.getElementById('sellTitle').value.trim();
    const desc = document.getElementById('sellDesc').value.trim();
    const category = document.getElementById('sellCategory').value;
    const price = parseFloat(document.getElementById('sellPrice').value);
    const address = document.getElementById('sellAddress').value.trim();
    const errEl = document.getElementById('sellError');

    errEl.textContent = '';
    if (!title) { errEl.textContent = 'Escribe un título.'; return; }
    if (!category) { errEl.textContent = 'Selecciona una categoría.'; return; }
    if (!price || price <= 0) { errEl.textContent = 'Ingresa un precio válido.'; return; }
    if (!address) { errEl.textContent = 'Escribe la dirección o zona.'; return; }

    // === [API] POST /products ===
    const newProduct = {
        id: 'prod_' + Date.now(),
        title,
        description: desc,
        category,
        price,
        address,
        photos: [...uploadedPhotos],
        seller: {
            id: State.currentUser.id,
            name: State.currentUser.name,
            avatar: State.currentUser.avatar || State.currentUser.name[0].toUpperCase(),
        },
        createdAt: new Date().toISOString(),
        likes: 0,
    };

    State.products.unshift(newProduct);
    saveToStorage();
    renderProducts();
    updateHeroStats();

    // Limpiar form
    document.getElementById('sellTitle').value = '';
    document.getElementById('sellDesc').value = '';
    document.getElementById('sellCategory').value = '';
    document.getElementById('sellPrice').value = '';
    document.getElementById('sellAddress').value = '';
    uploadedPhotos = [];
    renderPhotoPreviews();

    closeSell();
    toast('¡Producto publicado!', 'success');
}

function deleteProduct(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    // === [API] DELETE /products/:id ===
    State.products = State.products.filter(p => p.id !== id);
    saveToStorage();
    renderProducts();
    renderMyProducts();
    renderProfileInfo();
    updateHeroStats();
    toast('Producto eliminado.');
}

// ─────────────────────────────────────────────
// CARRITO
// ─────────────────────────────────────────────
function openCart() {
    closeUserPanel();
    document.getElementById('cartPanel').classList.add('open');
    document.getElementById('overlayCart').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderCart();
}

function closeCart() {
    document.getElementById('cartPanel').classList.remove('open');
    document.getElementById('overlayCart').classList.remove('active');
    document.body.style.overflow = '';
}

function addToCart(productId) {
    const product = State.products.find(p => p.id === productId);
    if (!product) return;

    if (State.currentUser && product.seller.id === State.currentUser.id) {
        toast('No puedes comprar tu propio producto.');
        return;
    }

    const existing = State.cart.find(item => item.product.id === productId);
    if (existing) {
        toast('Ya está en tu carrito.');
        return;
    }

    State.cart.push({ product });
    saveToStorage();
    updateCartBadge();
    toast(`"${product.title.substring(0, 30)}..." agregado al carrito.`, 'success');
}

function removeFromCart(productId) {
    State.cart = State.cart.filter(item => item.product.id !== productId);
    saveToStorage();
    updateCartBadge();
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');

    if (State.cart.length === 0) {
        container.innerHTML = '<div class="empty-state-small">Tu carrito está vacío.</div>';
        footer.style.display = 'none';
        return;
    }

    footer.style.display = 'block';
    container.innerHTML = State.cart.map(item => {
        const p = item.product;
        const photo = p.photos && p.photos[0];
        return `
      <div class="cart-item">
        <div class="cart-item-img">
          ${photo ? `<img src="${photo}" alt="">` : ''}
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${escHtml(p.title)}</div>
          <div class="cart-item-price">${formatPrice(p.price)}</div>
          <div style="font-size:11px;color:var(--ink3);margin-top:2px">${escHtml(p.address)}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${p.id}')">✕</button>
      </div>
    `;
    }).join('');

    const total = State.cart.reduce((sum, item) => sum + item.product.price, 0);
    document.getElementById('cartTotal').textContent = formatPrice(total);
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    const count = State.cart.length;
    badge.textContent = count;
    badge.dataset.count = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

// ─────────────────────────────────────────────
// DETALLE DE PRODUCTO
// ─────────────────────────────────────────────
function openDetail(id) {
    const p = State.products.find(prod => prod.id === id);
    if (!p) return;
    State.currentDetailProduct = p;

    // Fotos
    const photosContainer = document.getElementById('detailPhotos');
    if (p.photos && p.photos.length > 0) {
        photosContainer.innerHTML = `
      <img class="detail-photo-main" id="detailMainImg" src="${p.photos[0]}" alt="${escHtml(p.title)}">
      ${p.photos.length > 1 ? `
        <div class="detail-photo-thumbs">
          ${p.photos.map((ph, i) => `
            <div class="detail-thumb ${i === 0 ? 'active' : ''}" onclick="changeDetailPhoto('${ph}', this)">
              <img src="${ph}" alt="">
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
    } else {
        photosContainer.innerHTML = `<div class="card-no-photo" style="height:300px"><svg viewBox="0 0 40 40" fill="none"><rect x="4" y="8" width="32" height="24" rx="2" stroke="currentColor" stroke-width="1.5" opacity=".4"/></svg></div>`;
    }

    document.getElementById('detailCat').textContent = p.category;
    document.getElementById('detailTitle').textContent = p.title;
    document.getElementById('detailPrice').textContent = formatPrice(p.price);
    document.getElementById('detailDesc').textContent = p.description;
    document.getElementById('detailAddress').textContent = p.address;
    document.getElementById('detailSellerName').textContent = p.seller.name;

    const sellerAvatar = document.getElementById('detailSellerAvatar');
    if (p.seller.avatar && (p.seller.avatar.startsWith('data:') || p.seller.avatar.startsWith('http'))) {
        sellerAvatar.innerHTML = `<img src="${p.seller.avatar}" alt="">`;
    } else {
        sellerAvatar.textContent = p.seller.avatar || p.seller.name[0];
    }

    const likeBtn = document.getElementById('detailLikeBtn');
    likeBtn.classList.toggle('liked', State.likedProducts.has(p.id));

    document.getElementById('detailOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function changeDetailPhoto(src, thumb) {
    document.getElementById('detailMainImg').src = src;
    document.querySelectorAll('.detail-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
}

function closeDetail() {
    document.getElementById('detailOverlay').classList.remove('active');
    document.body.style.overflow = '';
    State.currentDetailProduct = null;
}

function closeDetailIfOutside(e) {
    if (e.target === document.getElementById('detailOverlay')) closeDetail();
}

function addToCartFromDetail() {
    if (!State.currentDetailProduct) return;
    if (!State.currentUser) {
        closeDetail();
        toggleUserPanel();
        toast('Inicia sesión para comprar.');
        return;
    }
    addToCart(State.currentDetailProduct.id);
    closeDetail();
    openCart();
}

function toggleLike() {
    if (!State.currentDetailProduct) return;
    toggleLikeById(State.currentDetailProduct.id);
    const liked = State.likedProducts.has(State.currentDetailProduct.id);
    const btn = document.getElementById('detailLikeBtn');
    btn.classList.toggle('liked', liked);
}

// ─────────────────────────────────────────────
// LIKES
// ─────────────────────────────────────────────
function toggleLikeCard(id, btn) {
    toggleLikeById(id);
    const liked = State.likedProducts.has(id);
    btn.classList.toggle('liked', liked);
    const svg = btn.querySelector('path');
    if (svg) {
        btn.querySelectorAll('path').forEach(p => p.setAttribute('fill', liked ? 'currentColor' : 'none'));
    }
}

function toggleLikeById(id) {
    if (State.likedProducts.has(id)) {
        State.likedProducts.delete(id);
    } else {
        State.likedProducts.add(id);
    }
    saveToStorage();
}

// ─────────────────────────────────────────────
// CHECKOUT
// ─────────────────────────────────────────────
function openCheckout() {
    if (!State.currentUser) {
        closeCart();
        toggleUserPanel();
        toast('Inicia sesión para continuar.');
        return;
    }
    if (State.cart.length === 0) return;

    // Pre-fill nombre
    document.getElementById('ckName').value = State.currentUser.name || '';

    // Render resumen
    const summary = document.getElementById('checkoutSummary');
    const total = State.cart.reduce((s, i) => s + i.product.price, 0);
    summary.innerHTML = State.cart.map(item => `
    <div class="checkout-item-row">
      <span>${escHtml(item.product.title.substring(0, 40))}${item.product.title.length > 40 ? '...' : ''}</span>
      <span>${formatPrice(item.product.price)}</span>
    </div>
  `).join('') + `
    <div class="checkout-total-row">
      <span>Total</span>
      <span>${formatPrice(total)}</span>
    </div>
  `;

    const totalEl = document.getElementById('payBtnTotal');
    totalEl.textContent = formatPrice(total);

    closeCart();
    document.getElementById('checkoutOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCheckout() {
    document.getElementById('checkoutOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

function closeCheckoutIfOutside(e) {
    if (e.target === document.getElementById('checkoutOverlay')) closeCheckout();
}

// ── Flujo de pago real con MercadoPago ───────
async function processPayment() {
    const name = document.getElementById('ckName').value.trim();
    const email = document.getElementById('ckEmail').value.trim();
    const errEl = document.getElementById('checkoutError');
    const btn = document.getElementById('payBtn');

    errEl.textContent = '';

    if (!name) { errEl.textContent = 'Ingresa tu nombre completo.'; return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = 'Ingresa un correo válido.';
        return;
    }

    btn.disabled = true;
    document.getElementById('payBtnText').textContent = 'Procesando...';

    try {
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ buyer_name: name, buyer_email: email }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `Error ${response.status}`);
        }

        const data = await response.json();
        // Redirigir a MercadoPago (producción = cobra tarjeta real)
        window.location.href = data.init_point;

    } catch (err) {
        errEl.textContent = `Error: ${err.message}`;
        btn.disabled = false;
        document.getElementById('payBtnText').textContent = 'Pagar con MercadoPago';
    }
}

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────
function updateHeroStats() {
    animateNumber('heroProducts', State.products.length);
    const sellers = new Set(State.products.map(p => p.seller.id));
    animateNumber('heroSellers', sellers.size);
}

function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    const duration = 600;
    const startTime = performance.now();
    const update = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        el.textContent = Math.round(start + (target - start) * easeOut(progress));
        if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
function toast(message, type = '') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', '': '·' };
    el.innerHTML = `<span class="toast-icon">${icons[type] || icons['']}</span>${escHtml(message)}`;
    container.appendChild(el);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('show'));
    });
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 3500);
}

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
function formatPrice(amount) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(amount);
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Manejar resultado cuando MP redirige de vuelta a / ──
const _urlParams = new URLSearchParams(window.location.search);
const _payStatus = _urlParams.get('payment');
if (_payStatus === 'success') {
    toast('¡Pago confirmado! Gracias por tu compra.', 'success');
} else if (_payStatus === 'failure') {
    toast('El pago fue rechazado. Inténtalo de nuevo.', 'error');
}
