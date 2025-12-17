// Конфигурация
const API_URL = 'https://batm4d.github.io/bot/'; // Замените на ваш URL API
const APP_NAME = '8523504778:AAEPnizDn0w1Nf1lgb9v-be1G_lvDI-TTzo';
let currentUser = null;
let sessionToken = localStorage.getItem('session_token');
let cart = [];
let currentProduct = null;
let selectedPayment = null;

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Элементы DOM
const elements = {
    // Навигация
    userStatus: document.getElementById('userStatus'),
    cartBadge: document.getElementById('cartBadge'),

    // Секции
    sections: document.querySelectorAll('.content-section'),

    // Формы
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),

    // Поля ввода
    loginUsername: document.getElementById('loginUsername'),
    loginPassword: document.getElementById('loginPassword'),
    regUsername: document.getElementById('regUsername'),
    regPassword: document.getElementById('regPassword'),
    regConfirmPassword: document.getElementById('regConfirmPassword'),

    // Контейнеры
    categoriesList: document.getElementById('categoriesList'),
    subcategoriesList: document.getElementById('subcategoriesList'),
    productsList: document.getElementById('productsList'),
    cartItems: document.getElementById('cartItems'),
    cartTotal: document.getElementById('cartTotal'),
    profileContent: document.getElementById('profileContent'),

    // Модальное окно
    weightModal: document.getElementById('weightModal'),
    weightOptions: document.getElementById('weightOptions'),

    // Настройки
    settingCity: document.getElementById('settingCity'),
    settingDelivery: document.getElementById('settingDelivery'),
    settingPostalCode: document.getElementById('settingPostalCode'),
    settingAddress: document.getElementById('settingAddress'),
    settingDistrict: document.getElementById('settingDistrict'),
    postFields: document.getElementById('postFields'),
    homeFields: document.getElementById('homeFields'),
    courierFields: document.getElementById('courierFields'),

    // Реферальная ссылка
    referralLink: document.getElementById('referralLink')
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем сессию
    if (sessionToken) {
        await loadUserProfile();
        showSection('home');
    } else {
        showSection('auth');
    }

    // Загружаем категории
    await loadCategories();

    // Загружаем корзину
    await loadCart();

    // Обновляем бейдж корзины
    updateCartBadge();
});

// Показать секцию
function showSection(sectionId) {
    elements.sections.forEach(section => {
        section.classList.remove('active');
    });

    document.getElementById(sectionId).classList.add('active');

    // Обновляем активную кнопку навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Находим соответствующую кнопку навигации
    const navMap = {
        'home': 0,
        'menu': 1,
        'cart': 2,
        'profile': 3
    };

    if (navMap[sectionId] !== undefined) {
        document.querySelectorAll('.nav-btn')[navMap[sectionId]].classList.add('active');
    }
}

// Показать вкладку авторизации
function showAuthTab(tab) {
    elements.loginForm.style.display = tab === 'login' ? 'block' : 'none';
    elements.registerForm.style.display = tab === 'register' ? 'block' : 'none';

    document.querySelectorAll('.auth-tab').forEach(t => {
        t.classList.remove('active');
    });

    document.querySelector(`.auth-tab[onclick="showAuthTab('${tab}')"]`).classList.add('active');
}

// Вход в систему
async function login() {
    const username = elements.loginUsername.value.trim();
    const password = elements.loginPassword.value;

    if (!username || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                login: username,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            sessionToken = data.session_token;
            currentUser = data.user;

            // Сохраняем сессию
            localStorage.setItem('session_token', sessionToken);
            localStorage.setItem('user', JSON.stringify(currentUser));

            // Обновляем статус пользователя
            updateUserStatus();

            // Показываем главную страницу
            showSection('home');

            // Загружаем корзину
            await loadCart();

            showNotification('Успешный вход в систему!', 'success');
        } else {
            showNotification('Неверный логин или пароль', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

// Регистрация
async function register() {
    const username = elements.regUsername.value.trim();
    const password = elements.regPassword.value;
    const confirmPassword = elements.regConfirmPassword.value;

    if (!username || !password || !confirmPassword) {
        showNotification('Заполните все поля', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Пароль должен быть не менее 6 символов', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                login: username,
                password: password,
                telegram_id: tg.initDataUnsafe?.user?.id,
                username: tg.initDataUnsafe?.user?.username
            })
        });

        const data = await response.json();

        if (data.success) {
            sessionToken = data.session_token;
            currentUser = data.user;

            // Сохраняем сессию
            localStorage.setItem('session_token', sessionToken);
            localStorage.setItem('user', JSON.stringify(currentUser));

            // Обновляем статус пользователя
            updateUserStatus();

            // Показываем главную страницу
            showSection('home');

            showNotification('Регистрация успешна!', 'success');
        } else {
            showNotification(data.detail || 'Ошибка регистрации', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

// Загрузить профиль пользователя
async function loadUserProfile() {
    if (!sessionToken) return;

    try {
        const response = await fetch(`${API_URL}/api/profile`, {
            headers: {
                'X-Session-Token': sessionToken
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateUserStatus();
            updateProfileDisplay();
        }
    } catch (error) {
        console.error('Load profile error:', error);
    }
}

// Обновить статус пользователя
function updateUserStatus() {
    if (currentUser) {
        elements.userStatus.innerHTML = `
            <i class="fas fa-user-check"></i>
            <span>${currentUser.login}</span>
        `;
    }
}

// Обновить отображение профиля
function updateProfileDisplay() {
    if (!currentUser) return;

    elements.profileContent.innerHTML = `
        <div class="profile-field">
            <span>Логин:</span>
            <span><strong>${currentUser.login}</strong></span>
        </div>
        <div class="profile-field">
            <span>Город:</span>
            <span>${currentUser.city || 'Не указан'}</span>
        </div>
        <div class="profile-field">
            <span>Способ получения:</span>
            <span>${getDeliveryMethodText(currentUser.delivery_method)}</span>
        </div>
        ${currentUser.delivery_method === 'post' ? `
        <div class="profile-field">
            <span>Почтовый индекс:</span>
            <span>${currentUser.postal_code || 'Не указан'}</span>
        </div>
        ` : ''}
        ${currentUser.delivery_method === 'home' ? `
        <div class="profile-field">
            <span>Адрес:</span>
            <span>${currentUser.address || 'Не указан'}</span>
        </div>
        ` : ''}
        ${currentUser.delivery_method === 'courier' ? `
        <div class="profile-field">
            <span>Район:</span>
            <span>${currentUser.district || 'Не указан'}</span>
        </div>
        ` : ''}
    `;

    // Заполняем поля настроек
    if (currentUser.city) {
        elements.settingCity.value = currentUser.city;
    }

    if (currentUser.delivery_method) {
        elements.settingDelivery.value = currentUser.delivery_method;
        toggleDeliveryFields();
    }

    if (currentUser.postal_code) {
        elements.settingPostalCode.value = currentUser.postal_code;
    }

    if (currentUser.address) {
        elements.settingAddress.value = currentUser.address;
    }

    if (currentUser.district) {
        elements.settingDistrict.value = currentUser.district;
    }
}

// Получить текст способа доставки
function getDeliveryMethodText(method) {
    switch (method) {
        case 'post': return '📮 Почтой';
        case 'courier': return '📥 Курьером';
        case 'home': return '🏠 Доставка до дома';
        default: return 'Не указан';
    }
}

// Загрузить категории
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/api/products/categories`);
        const data = await response.json();

        elements.categoriesList.innerHTML = data.categories.map(category => `
            <div class="category-card" onclick="loadSubcategories('${category}')">
                <img src="https://images.unsplash.com/photo-1575425186775-b8de9a427e34?w=400&h=300&fit=crop" alt="${category}">
                <div class="category-info">
                    <h3>${category}</h3>
                    <p>${getCategoryDescription(category)}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Load categories error:', error);
    }
}

// Получить описание категории
function getCategoryDescription(category) {
    switch (category) {
        case 'Игрушки': return 'Мягкие и развивающие игрушки';
        case 'Аптечки': return 'Базовые и специализированные аптечки';
        case 'Питание': return 'Консервы, сухпайки и батончики';
        default: return 'Качественные товары';
    }
}

// Загрузить подкатегории
async function loadSubcategories(category) {
    try {
        const response = await fetch(`${API_URL}/api/products/${category}/subcategories`);
        const data = await response.json();

        elements.categoriesList.style.display = 'none';
        elements.subcategoriesList.style.display = 'block';

        elements.subcategoriesList.innerHTML = `
            <div class="section-header">
                <button class="btn-back" onclick="backToCategories()">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>${category}</h2>
            </div>
            ${data.subcategories.map(subcategory => `
                <div class="subcategory-card" onclick="loadProducts('${category}', '${subcategory}')">
                    <div class="subcategory-icon">${getSubcategoryIcon(subcategory)}</div>
                    <div>
                        <h4>${subcategory}</h4>
                        <p>${getSubcategoryDescription(subcategory)}</p>
                    </div>
                </div>
            `).join('')}
        `;
    } catch (error) {
        console.error('Load subcategories error:', error);
    }
}

// Получить иконку подкатегории
function getSubcategoryIcon(subcategory) {
    switch (subcategory) {
        case 'Мягкие': return '🧸';
        case 'Развивающие': return '🧩';
        case 'Базовые': return '🩹';
        case 'Специализированные': return '🏕️';
        case 'Консервы': return '🥫';
        case 'Сухпайки': return '🎒';
        case 'Наше производство': return '🏭';
        default: return '📦';
    }
}

// Получить описание подкатегории
function getSubcategoryDescription(subcategory) {
    switch (subcategory) {
        case 'Мягкие': return 'Мягкие игрушки для детей';
        case 'Развивающие': return 'Развивающие игры и конструкторы';
        case 'Базовые': return 'Базовые аптечки для дома и авто';
        case 'Специализированные': return 'Специализированные аптечки для походов';
        case 'Консервы': return 'Консервированные продукты';
        case 'Сухпайки': return 'Сухие пайки для туристов';
        case 'Наше производство': return 'Продукция собственного производства';
        default: return 'Качественные товары';
    }
}

// Загрузить товары
async function loadProducts(category, subcategory) {
    try {
        const response = await fetch(`${API_URL}/api/products?category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(subcategory)}`);
        const data = await response.json();

        elements.subcategoriesList.style.display = 'none';
        elements.productsList.style.display = 'grid';

        elements.productsList.innerHTML = `
            <div class="section-header">
                <button class="btn-back" onclick="backToSubcategories('${category}')">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>${subcategory}</h2>
            </div>
            ${data.products.map(product => `
                <div class="product-card">
                    <img src="${product.photo_url}" alt="${product.name}">
                    <div class="product-info">
                        <h3 class="product-title">${product.name}</h3>
                        <p class="product-description">${product.description}</p>
                        <div class="product-price">${product.price} ₽</div>
                        <div class="product-actions">
                            <button class="btn btn-primary" onclick="showProductDetail(${product.id})">
                                <i class="fas fa-info-circle"></i>
                                Подробнее
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
    } catch (error) {
        console.error('Load products error:', error);
    }
}

// Показать детали товара
async function showProductDetail(productId) {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        const data = await response.json();

        const product = data.products.find(p => p.id === productId);
        if (!product) return;

        elements.productsList.style.display = 'none';

        const productDetail = document.createElement('div');
        productDetail.className = 'product-detail';
        productDetail.style.display = 'block';

        productDetail.innerHTML = `
            <div class="section-header">
                <button class="btn-back" onclick="backToProducts('${product.category}', '${product.subcategory}')">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <h2>${product.name}</h2>
            </div>

            <div class="product-detail-content">
                <img src="${product.photo_url}" alt="${product.name}" class="product-detail-image">

                <div class="product-detail-info">
                    <h3>${product.name}</h3>
                    <p class="product-detail-description">${product.description}</p>
                    <div class="product-detail-price">${product.price} ₽</div>

                    ${product.weight_available ? `
                        <div class="product-detail-weight">
                            <h4>Выберите вес:</h4>
                            <button class="btn btn-outline" onclick="openWeightModal(${product.id}, '${product.name}', ${product.price})">
                                <i class="fas fa-weight"></i>
                                Выбрать вес
                            </button>
                        </div>
                    ` : `
                        <button class="btn btn-primary btn-lg" onclick="addToCartDirect(${product.id}, '${product.name}', ${product.price})">
                            <i class="fas fa-cart-plus"></i>
                            Добавить в корзину
                        </button>
                    `}
                </div>
            </div>
        `;

        elements.productsList.parentNode.insertBefore(productDetail, elements.productsList.nextSibling);
    } catch (error) {
        console.error('Show product detail error:', error);
    }
}

// Назад к категориям
function backToCategories() {
    elements.subcategoriesList.style.display = 'none';
    elements.categoriesList.style.display = 'grid';
    elements.subcategoriesList.innerHTML = '';
}

// Назад к подкатегориям
function backToSubcategories(category) {
    elements.productsList.style.display = 'none';
    elements.subcategoriesList.style.display = 'block';
    elements.productsList.innerHTML = '';

    // Удаляем детали товара если они есть
    const productDetail = document.querySelector('.product-detail');
    if (productDetail) {
        productDetail.remove();
    }
}

// Назад к товарам
function backToProducts(category, subcategory) {
    const productDetail = document.querySelector('.product-detail');
    if (productDetail) {
        productDetail.remove();
    }
    elements.productsList.style.display = 'grid';
}

// Открыть модальное окно выбора веса
function openWeightModal(productId, productName, basePrice) {
    currentProduct = { id: productId, name: productName, basePrice };

    const weights = [0.2, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

    elements.weightOptions.innerHTML = weights.map(weight => `
        <div class="weight-option" onclick="selectWeight(${weight})">
            ${weight} кг<br>
            <small>${(basePrice * weight).toFixed(2)} ₽</small>
        </div>
    `).join('');

    elements.weightModal.classList.add('active');
}

// Закрыть модальное окно выбора веса
function closeWeightModal() {
    elements.weightModal.classList.remove('active');
}

// Выбрать вес
function selectWeight(weight) {
    if (!currentProduct) return;

    const totalPrice = currentProduct.basePrice * weight;

    addToCartDirect(
        currentProduct.id,
        `${currentProduct.name} (${weight} кг)`,
        totalPrice,
        weight
    );

    closeWeightModal();
}

// Добавить в корзину напрямую
async function addToCartDirect(productId, productName, price, weight = null) {
    try {
        const response = await fetch(`${API_URL}/api/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': sessionToken
            },
            body: JSON.stringify({
                product_id: productId,
                product_name: productName,
                quantity: 1,
                weight: weight,
                price: price
            })
        });

        if (response.ok) {
            await loadCart();
            showNotification('Товар добавлен в корзину!', 'success');
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        showNotification('Ошибка добавления в корзину', 'error');
    }
}

// Загрузить корзину
async function loadCart() {
    if (!sessionToken) return;

    try {
        const response = await fetch(`${API_URL}/api/cart`, {
            headers: {
                'X-Session-Token': sessionToken
            }
        });

        if (response.ok) {
            const data = await response.json();
            cart = data.items;

            updateCartDisplay();
            updateCartBadge();
        }
    } catch (error) {
        console.error('Load cart error:', error);
    }
}

// Обновить отображение корзины
function updateCartDisplay() {
    if (cart.length === 0) {
        elements.cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart fa-3x"></i>
                <h3>Корзина пуста</h3>
                <p>Добавьте товары из меню</p>
            </div>
        `;
        elements.cartTotal.textContent = '0 ₽';
        return;
    }

    let total = 0;

    elements.cartItems.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.product_name}</h4>
                    <p>${item.weight ? `${item.weight} кг • ` : ''}${item.quantity} шт.</p>
                    <div class="cart-item-price">${itemTotal} ₽</div>
                </div>
                <button class="btn btn-danger" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');

    elements.cartTotal.textContent = `${total} ₽`;
}

// Удалить из корзины
async function removeFromCart(itemId) {
    try {
        const response = await fetch(`${API_URL}/api/cart/${itemId}`, {
            method: 'DELETE',
            headers: {
                'X-Session-Token': sessionToken
            }
        });

        if (response.ok) {
            await loadCart();
            showNotification('Товар удален из корзины', 'success');
        }
    } catch (error) {
        console.error('Remove from cart error:', error);
        showNotification('Ошибка удаления товара', 'error');
    }
}

// Обновить бейдж корзины
function updateCartBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    elements.cartBadge.textContent = totalItems;

    if (totalItems === 0) {
        elements.cartBadge.style.display = 'none';
    } else {
        elements.cartBadge.style.display = 'flex';
    }
}

// Выбрать способ оплаты
function selectPayment(method) {
    selectedPayment = method;

    // Обновляем визуальный выбор
    document.querySelectorAll('.method-card').forEach(card => {
        card.classList.remove('selected');
    });

    event.currentTarget.classList.add('selected');

    // Показываем детали оплаты
    showPaymentDetails(method);
}

// Показать детали оплаты
async function showPaymentDetails(method) {
    try {
        // Получаем курсы валют
        const ratesResponse = await fetch(`${API_URL}/api/payment/rates`);
        const rates = await ratesResponse.json();

        // Получаем сумму заказа
        const cartResponse = await fetch(`${API_URL}/api/cart`, {
            headers: {
                'X-Session-Token': sessionToken
            }
        });
        const cartData = await cartResponse.json();

        const totalRub = cartData.total;
        let paymentInfo = '';

        switch (method) {
            case 'cryptobot':
                paymentInfo = `
                    <h4>Оплата через CryptoBot (USDT)</h4>
                    <p>Сумма к оплате: ${totalRub} ₽</p>
                    <p>Курс: 1 USDT = ${rates.USDT} ₽</p>
                    <p><strong>К оплате: ${(totalRub / rates.USDT).toFixed(6)} USDT</strong></p>
                    <p class="payment-note">После нажатия "Я оплатил" будет создан счет в CryptoBot</p>
                `;
                break;

            case 'btc':
                paymentInfo = `
                    <h4>Оплата Bitcoin (BTC)</h4>
                    <p>Сумма к оплате: ${totalRub} ₽</p>
                    <p>Курс: 1 BTC = ${rates.BTC.toLocaleString()} ₽</p>
                    <p><strong>К оплате: ${(totalRub / rates.BTC).toFixed(8)} BTC</strong></p>
                    <p>Адрес: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</p>
                    <p class="payment-note">Отправьте указанную сумму на указанный адрес</p>
                `;
                break;

            case 'usdt':
                paymentInfo = `
                    <h4>Оплата USDT (TRC20)</h4>
                    <p>Сумма к оплате: ${totalRub} ₽</p>
                    <p>Курс: 1 USDT = ${rates.USDT} ₽</p>
                    <p><strong>К оплате: ${(totalRub / rates.USDT).toFixed(6)} USDT</strong></p>
                    <p>Адрес: TPyTGyLsD8A6rGqBQnLwAEV7Jh9Rk2hFzK</p>
                    <p class="payment-note">Отправьте USDT в сети TRC20 на указанный адрес</p>
                `;
                break;

            case 'trx':
                paymentInfo = `
                    <h4>Оплата TRON (TRX)</h4>
                    <p>Сумма к оплате: ${totalRub} ₽</p>
                    <p>Курс: 1 TRX = ${rates.TRX} ₽</p>
                    <p><strong>К оплате: ${(totalRub / rates.TRX).toFixed(2)} TRX</strong></p>
                    <p>Адрес: TPyTGyLsD8A6rGqBQnLwAEV7Jh9Rk2hFzK</p>
                    <p class="payment-note">Отправьте TRX на указанный адрес</p>
                `;
                break;

            case 'xlm':
                paymentInfo = `
                    <h4>Оплата Stellar (XLM)</h4>
                    <p>Сумма к оплате: ${totalRub} ₽</p>
                    <p>Курс: 1 XLM = ${rates.XLM} ₽</p>
                    <p><strong>К оплате: ${(totalRub / rates.XLM).toFixed(2)} XLM</strong></p>
                    <p>Адрес: GABC1234567890XYZ</p>
                    <p class="payment-note">Отправьте XLM на указанный адрес</p>
                `;
                break;

            case 'sol':
                paymentInfo = `
                    <h4>Оплата Solana (SOL)</h4>
                    <p>Сумма к оплате: ${totalRub} ₽</p>
                    <p>Курс: 1 SOL = ${rates.SOL.toLocaleString()} ₽</p>
                    <p><strong>К оплате: ${(totalRub / rates.SOL).toFixed(6)} SOL</strong></p>
                    <p>Адрес: So11111111111111111111111111111111111111112</p>
                    <p class="payment-note">Отправьте SOL на указанный адрес</p>
                `;
                break;
        }

        document.getElementById('paymentInfo').innerHTML = paymentInfo;
        document.getElementById('paymentDetails').style.display = 'block';

    } catch (error) {
        console.error('Show payment details error:', error);
        showNotification('Ошибка загрузки данных оплаты', 'error');
    }
}

// Подтвердить оплату
async function confirmPayment() {
    if (!selectedPayment) {
        showNotification('Выберите способ оплаты', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/order/create?payment_method=${selectedPayment}`, {
            method: 'POST',
            headers: {
                'X-Session-Token': sessionToken
            }
        });

        if (response.ok) {
            const data = await response.json();

            showNotification(`Заказ #${data.order_id} создан! Сумма: ${data.total} ₽`, 'success');

            // Очищаем корзину
            await loadCart();

            // Показываем главную страницу
            showSection('home');

            // Сбрасываем выбранный способ оплаты
            selectedPayment = null;
        }
    } catch (error) {
        console.error('Confirm payment error:', error);
        showNotification('Ошибка создания заказа', 'error');
    }
}

// Переключить поля доставки
function toggleDeliveryFields() {
    const method = elements.settingDelivery.value;

    // Скрываем все поля
    elements.postFields.style.display = 'none';
    elements.homeFields.style.display = 'none';
    elements.courierFields.style.display = 'none';

    // Показываем нужные поля
    switch (method) {
        case 'post':
            elements.postFields.style.display = 'block';
            break;
        case 'home':
            elements.homeFields.style.display = 'block';
            break;
        case 'courier':
            elements.courierFields.style.display = 'block';
            break;
    }
}

// Сохранить настройки
async function saveSettings() {
    const updates = {};

    const city = elements.settingCity.value;
    const deliveryMethod = elements.settingDelivery.value;

    if (city) updates.city = city;
    if (deliveryMethod) updates.delivery_method = deliveryMethod;

    if (deliveryMethod === 'post') {
        const postalCode = elements.settingPostalCode.value;
        if (postalCode) updates.postal_code = postalCode;
    }

    if (deliveryMethod === 'home') {
        const address = elements.settingAddress.value;
        if (address) updates.address = address;
    }

    if (deliveryMethod === 'courier') {
        const district = elements.settingDistrict.value;
        if (district) updates.district = district;
    }

    try {
        const response = await fetch(`${API_URL}/api/profile/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': sessionToken
            },
            body: JSON.stringify(updates)
        });

        if (response.ok) {
            // Обновляем профиль
            await loadUserProfile();

            showNotification('Настройки сохранены!', 'success');

            // Показываем профиль
            showSection('profile');
        }
    } catch (error) {
        console.error('Save settings error:', error);
        showNotification('Ошибка сохранения настроек', 'error');
    }
}

// Копировать реферальную ссылку
function copyReferralLink() {
    const link = `https://t.me/santamarket_bot?start=ref${currentUser?.id || 'user'}`;

    navigator.clipboard.writeText(link).then(() => {
        showNotification('Ссылка скопирована в буфер обмена!', 'success');
    }).catch(() => {
        // Fallback для старых браузеров
        elements.referralLink.select();
        document.execCommand('copy');
        showNotification('Ссылка скопирована!', 'success');
    });
}

// Показать уведомление
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');

    notification.textContent = message;
    notification.className = 'notification';
    notification.classList.add('active');

    // Устанавливаем цвет в зависимости от типа
    if (type === 'success') {
        notification.style.background = '#48bb78';
    } else if (type === 'error') {
        notification.style.background = '#f56565';
    } else {
        notification.style.background = '#4299e1';
    }

    // Скрываем уведомление через 3 секунды
    setTimeout(() => {
        notification.classList.remove('active');
    }, 3000);
}

// Выход из системы
function logout() {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user');
    sessionToken = null;
    currentUser = null;
    cart = [];

    updateUserStatus();
    updateCartBadge();

    showSection('auth');
    showNotification('Вы вышли из системы', 'info');
}

// Обновить основной бот через API
async function updateMainBotProfile(updates) {
    // Здесь нужно отправить обновления в основной бот
    // В реальном приложении это делается через Webhook или прямой вызов API бота
    console.log('Обновление профиля в основном боте:', updates);

    // Пример: отправка данных через Telegram Web App
    if (tg.sendData) {
        tg.sendData(JSON.stringify({
            type: 'update_profile',
            data: updates
        }));
    }
}