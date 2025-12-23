let tg = window.Telegram.WebApp;
let currentUser = null;
let cart = [];
let currentProduct = null;
let selectedWeight = null;

// Инициализация приложения
tg.expand();
tg.ready();

// DOM элементы
const elements = {
    authScreen: document.getElementById('authScreen'),
    mainScreen: document.getElementById('mainScreen'),
    categoryScreen: document.getElementById('categoryScreen'),
    productsScreen: document.getElementById('productsScreen'),
    productScreen: document.getElementById('productScreen'),
    cartScreen: document.getElementById('cartScreen'),
    profileScreen: document.getElementById('profileScreen'),
    ordersScreen: document.getElementById('ordersScreen'),
    paymentScreen: document.getElementById('paymentScreen'),

    userInfo: document.getElementById('userInfo'),
    username: document.getElementById('username'),
    cartCount: document.getElementById('cartCount'),

    categoryTitle: document.getElementById('categoryTitle'),
    categoryContent: document.getElementById('categoryContent'),
    productsTitle: document.getElementById('productsTitle'),
    productsList: document.getElementById('productsList'),
    productDetails: document.getElementById('productDetails'),
    cartItems: document.getElementById('cartItems'),
    cartEmpty: document.getElementById('cartEmpty'),
    profileInfo: document.getElementById('profileInfo'),
    ordersList: document.getElementById('ordersList'),
    paymentInfo: document.getElementById('paymentInfo'),

    modalOverlay: document.getElementById('modalOverlay'),
    weightModal: document.getElementById('weightModal'),
    paymentModal: document.getElementById('paymentModal'),
    ticketModal: document.getElementById('ticketModal'),

    weightOptions: document.querySelector('.weight-options'),
    paymentOptions: document.querySelector('.payment-options'),

    loginUsername: document.getElementById('loginUsername'),
    loginPassword: document.getElementById('loginPassword'),
    registerUsername: document.getElementById('registerUsername'),
    registerPassword: document.getElementById('registerPassword'),
    registerConfirmPassword: document.getElementById('registerConfirmPassword'),
    ticketCategory: document.getElementById('ticketCategory'),
    ticketText: document.getElementById('ticketText')
};

// API URL (замените на ваш)
const API_URL = 'https://ваш-сервер.com/api';

// Проверяем авторизацию при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    const savedUser = localStorage.getItem('santa_market_user');
    const savedCart = localStorage.getItem('santa_market_cart');

    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserInfo();
        showMainScreen();
    }

    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartCount();
    }

    // Пытаемся получить данные из Telegram
    if (tg.initDataUnsafe.user) {
        const telegramUser = tg.initDataUnsafe.user;
        try {
            const response = await fetch(`${API_URL}/check_user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    telegram_id: telegramUser.id,
                    username: telegramUser.username
                })
            });

            const data = await response.json();
            if (data.user && data.user.login) {
                currentUser = data.user;
                localStorage.setItem('santa_market_user', JSON.stringify(currentUser));
                updateUserInfo();
                showMainScreen();
            }
        } catch (error) {
            console.error('Ошибка при проверке пользователя:', error);
        }
    }
});

// Обновление информации о пользователе
function updateUserInfo() {
    if (currentUser) {
        elements.username.textContent = currentUser.login || 'Пользователь';
        if (currentUser.username) {
            elements.userInfo.innerHTML = `
                <i class="fas fa-user"></i>
                <span>@${currentUser.username}</span>
            `;
        }
    }
}

// Обновление счетчика корзины
function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    elements.cartCount.textContent = count;
    elements.cartCount.style.display = count > 0 ? 'block' : 'none';
}

// Сохранение корзины
function saveCart() {
    localStorage.setItem('santa_market_cart', JSON.stringify(cart));
    updateCartCount();
}

// Показать сообщение
function showMessage(text, type = 'success') {
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    document.body.appendChild(message);

    setTimeout(() => {
        message.remove();
    }, 3000);
}

// Переключение вкладок
function showTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    if (tabName === 'login') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('loginTab').classList.add('active');
    } else {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('registerTab').classList.add('active');
    }
}

// Авторизация
async function login() {
    const username = elements.loginUsername.value.trim();
    const password = elements.loginPassword.value.trim();

    if (!username || !password) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                login: username,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('santa_market_user', JSON.stringify(currentUser));
            updateUserInfo();
            showMainScreen();
            showMessage('Успешная авторизация!');

            // Синхронизируем корзину с сервером
            if (cart.length > 0) {
                await syncCartWithServer();
            }
        } else {
            showMessage(data.message || 'Неверный логин или пароль', 'error');
        }
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        showMessage('Ошибка соединения', 'error');
    }
}

// Регистрация
async function register() {
    const username = elements.registerUsername.value.trim();
    const password = elements.registerPassword.value.trim();
    const confirmPassword = elements.registerConfirmPassword.value.trim();

    if (!username || !password || !confirmPassword) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Пароли не совпадают', 'error');
        return;
    }

    if (password.length < 4) {
        showMessage('Пароль должен быть не менее 4 символов', 'error');
        return;
    }

    try {
        const telegramData = tg.initDataUnsafe.user ? {
            telegram_id: tg.initDataUnsafe.user.id,
            username: tg.initDataUnsafe.user.username
        } : {};

        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                login: username,
                password: password,
                ...telegramData
            })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('santa_market_user', JSON.stringify(currentUser));
            updateUserInfo();
            showMainScreen();
            showMessage('Регистрация успешна!');
        } else {
            showMessage(data.message || 'Ошибка регистрации', 'error');
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showMessage('Ошибка соединения', 'error');
    }
}

// Выход
function logout() {
    currentUser = null;
    localStorage.removeItem('santa_market_user');
    elements.authScreen.classList.add('active');
    elements.mainScreen.classList.remove('active');
    showMessage('Вы вышли из системы');
}

// Синхронизация корзины с сервером
async function syncCartWithServer() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_URL}/sync_cart`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                cart: cart
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log('Корзина синхронизирована');
        }
    } catch (error) {
        console.error('Ошибка синхронизации корзины:', error);
    }
}

// Показать главный экран
function showMainScreen() {
    hideAllScreens();
    elements.mainScreen.classList.add('active');
}

// Показать категорию
function showCategory(category) {
    if (!currentUser) {
        showMessage('Сначала авторизуйтесь', 'error');
        return;
    }

    hideAllScreens();
    elements.categoryScreen.classList.add('active');

    let categories = [];
    let title = '';

    switch (category) {
        case 'food':
            title = 'Питание';
            categories = [
                { id: 'canned', name: 'Консервы', icon: 'fas fa-can' },
                { id: 'dry', name: 'Сухпайки', icon: 'fas fa-box' },
                { id: 'production', name: 'Наше производство', icon: 'fas fa-industry' }
            ];
            break;
        case 'first_aid':
            title = 'Аптечки';
            categories = [
                { id: 'basic', name: 'Базовые', icon: 'fas fa-medkit' },
                { id: 'specialized', name: 'Специализированные', icon: 'fas fa-user-md' }
            ];
            break;
        case 'toys':
            title = 'Игрушки';
            categories = [
                { id: 'soft', name: 'Мягкие', icon: 'fas fa-stuffed-toy' },
                { id: 'educational', name: 'Развивающие', icon: 'fas fa-puzzle-piece' }
            ];
            break;
    }

    elements.categoryTitle.textContent = title;
    elements.categoryContent.innerHTML = '';

    categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.onclick = () => showProducts(category, cat.id);
        card.innerHTML = `
            <i class="${cat.icon}"></i>
            <span>${cat.name}</span>
        `;
        elements.categoryContent.appendChild(card);
    });
}

// Показать товары
async function showProducts(category, subcategory) {
    hideAllScreens();
    elements.productsScreen.classList.add('active');

    let title = '';
    switch (subcategory) {
        case 'canned': title = 'Консервы'; break;
        case 'dry': title = 'Сухпайки'; break;
        case 'production': title = 'Наше производство'; break;
        case 'basic': title = 'Базовые аптечки'; break;
        case 'specialized': title = 'Специализированные аптечки'; break;
        case 'soft': title = 'Мягкие игрушки'; break;
        case 'educational': title = 'Развивающие игрушки'; break;
    }

    elements.productsTitle.textContent = title;
    elements.productsList.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                category: category,
                subcategory: subcategory,
                delivery_method: currentUser.delivery_method
            })
        });

        const data = await response.json();

        if (data.success) {
            elements.productsList.innerHTML = '';

            data.products.forEach(product => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.onclick = () => showProductDetails(product);
                card.innerHTML = `
                    <h4>${product.name}</h4>
                    <p>${product.description}</p>
                    <div class="product-price">${product.price} руб.${product.weight_available ? '/кг' : ''}</div>
                `;
                elements.productsList.appendChild(card);
            });
        } else {
            elements.productsList.innerHTML = '<div class="empty-state"><p>Товары не найдены</p></div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        elements.productsList.innerHTML = '<div class="empty-state"><p>Ошибка загрузки</p></div>';
    }
}

// Показать детали товара
function showProductDetails(product) {
    currentProduct = product;
    hideAllScreens();
    elements.productScreen.classList.add('active');

    elements.productDetails.innerHTML = `
        <div class="product-image">
            <i class="fas fa-box-open"></i>
        </div>
        <div class="product-info">
            <h3>${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="product-price-large">${product.price} руб.${product.weight_available ? '/кг' : ''}</div>
            <button onclick="addToCart()" class="btn btn-primary">
                <i class="fas fa-cart-plus"></i> Добавить в корзину
            </button>
        </div>
    `;

    if (product.weight_available) {
        const addButton = elements.productDetails.querySelector('button');
        addButton.textContent = 'Выбрать вес';
        addButton.onclick = () => showWeightModal();
    }
}

// Показать модальное окно выбора веса
function showWeightModal() {
    elements.weightOptions.innerHTML = '';

    const weights = [0.2, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

    weights.forEach(weight => {
        const option = document.createElement('div');
        option.className = 'weight-option';
        option.textContent = `${weight} кг`;
        option.onclick = () => selectWeight(weight);
        elements.weightOptions.appendChild(option);
    });

    elements.modalOverlay.classList.add('active');
    elements.weightModal.classList.add('active');
}

// Выбрать вес
function selectWeight(weight) {
    selectedWeight = weight;
    closeModal();
    addToCart();
}

// Добавить в корзину
async function addToCart() {
    if (!currentProduct) return;

    const existingItem = cart.find(item =>
        item.id === currentProduct.id &&
        item.selectedWeight === selectedWeight
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            weight_available: currentProduct.weight_available,
            selectedWeight: selectedWeight,
            quantity: 1
        });
    }

    saveCart();

    // Синхронизируем с сервером
    if (currentUser) {
        await syncCartWithServer();
    }

    showMessage('Товар добавлен в корзину');
    selectedWeight = null;
    showMainScreen();
}

// Показать корзину
function showCart() {
    if (!currentUser) {
        showMessage('Сначала авторизуйтесь', 'error');
        return;
    }

    hideAllScreens();
    elements.cartScreen.classList.add('active');

    if (cart.length === 0) {
        elements.cartEmpty.style.display = 'block';
        elements.cartItems.style.display = 'none';
        return;
    }

    elements.cartEmpty.style.display = 'none';
    elements.cartItems.style.display = 'block';
    elements.cartItems.innerHTML = '';

    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * (item.selectedWeight || 1) * item.quantity;
        total += itemTotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${item.selectedWeight ? `${item.selectedWeight} кг × ` : ''}${item.quantity} шт.</p>
                <div class="cart-item-price">${itemTotal.toFixed(2)} руб.</div>
            </div>
            <div class="cart-item-actions">
                <button onclick="removeFromCart(${index})" class="btn btn-danger" style="padding: 5px 10px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        elements.cartItems.appendChild(cartItem);
    });

    const totalElement = document.createElement('div');
    totalElement.className = 'cart-total';
    totalElement.innerHTML = `
        <h4>Итого</h4>
        <div class="cart-total-price">${total.toFixed(2)} руб.</div>
        <button onclick="showPaymentOptions()" class="btn btn-primary">
            <i class="fas fa-credit-card"></i> Перейти к оплате
        </button>
    `;
    elements.cartItems.appendChild(totalElement);
}

// Удалить из корзины
function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();

    if (currentUser) {
        syncCartWithServer();
    }

    showCart();
    showMessage('Товар удален из корзины');
}

// Показать профиль
async function showProfile() {
    if (!currentUser) {
        showMessage('Сначала авторизуйтесь', 'error');
        return;
    }

    hideAllScreens();
    elements.profileScreen.classList.add('active');

    try {
        const response = await fetch(`${API_URL}/user_profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: currentUser.id })
        });

        const data = await response.json();

        if (data.success) {
            const user = data.user;
            elements.profileInfo.innerHTML = `
                <div class="profile-field">
                    <label>Логин</label>
                    <span>${user.login}</span>
                </div>
                <div class="profile-field">
                    <label>Город</label>
                    <span>${user.city || 'Не указан'}</span>
                </div>
                <div class="profile-field">
                    <label>Способ получения</label>
                    <span>${user.delivery_method || 'Не указан'}</span>
                </div>
                ${user.delivery_method === '📮Почтой' ? `
                <div class="profile-field">
                    <label>Почтовый индекс</label>
                    <span>${user.postal_code || 'Не указан'}</span>
                </div>
                ` : ''}
                ${user.delivery_method === '📥Курьером' ? `
                <div class="profile-field">
                    <label>Район</label>
                    <span>${user.district || 'Не указан'}</span>
                </div>
                ` : ''}
                ${user.delivery_method === '🏠Доставка до дома' ? `
                <div class="profile-field">
                    <label>Адрес</label>
                    <span>${user.street || ''} ${user.house || ''}</span>
                </div>
                ${user.district ? `
                <div class="profile-field">
                    <label>Район</label>
                    <span>${user.district}</span>
                </div>
                ` : ''}
                ` : ''}
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        elements.profileInfo.innerHTML = '<p>Ошибка загрузки профиля</p>';
    }
}

// Показать заказы
async function showOrders() {
    if (!currentUser) return;

    hideAllScreens();
    elements.ordersScreen.classList.add('active');
    elements.ordersList.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: currentUser.id })
        });

        const data = await response.json();

        if (data.success) {
            elements.ordersList.innerHTML = '';

            if (data.orders.length === 0) {
                elements.ordersList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-box"></i>
                        <p>У вас нет заказов</p>
                    </div>
                `;
                return;
            }

            data.orders.forEach(order => {
                const orderCard = document.createElement('div');
                orderCard.className = 'order-card';

                let statusClass = 'status-pending';
                if (order.status === 'processing') statusClass = 'status-processing';
                if (order.status === 'completed') statusClass = 'status-completed';

                orderCard.innerHTML = `
                    <div class="order-header">
                        <div class="order-id">Заказ #${order.id}</div>
                        <div class="order-status ${statusClass}">${order.status}</div>
                    </div>
                    <div class="order-details">
                        <p><strong>Сумма:</strong> ${order.total_amount} руб.</p>
                        <p><strong>Метод оплаты:</strong> ${order.payment_method}</p>
                        <p><strong>Город:</strong> ${order.city}</p>
                        <p><strong>Доставка:</strong> ${order.delivery_method}</p>
                        <p><strong>Дата:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                `;
                elements.ordersList.appendChild(orderCard);
            });
        } else {
            elements.ordersList.innerHTML = '<div class="empty-state"><p>Ошибка загрузки заказов</p></div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        elements.ordersList.innerHTML = '<div class="empty-state"><p>Ошибка соединения</p></div>';
    }
}

// Показать отзывы
function showReviews() {
    tg.openLink('https://t.me/ваш_канал_отзывов');
}

// Создать тикет
function createTicket() {
    elements.modalOverlay.classList.add('active');
    elements.ticketModal.classList.add('active');
}

// Отправить тикет
async function submitTicket() {
    const category = elements.ticketCategory.value;
    const text = elements.ticketText.value.trim();

    if (!category || !text) {
        showMessage('Заполните все поля', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/create_ticket`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                category: category,
                text: text
            })
        });

        const data = await response.json();

        if (data.success) {
            closeModal();
            showMessage('Тикет успешно создан');
            elements.ticketCategory.value = '';
            elements.ticketText.value = '';
        } else {
            showMessage('Ошибка создания тикета', 'error');
        }
    } catch (error) {
        console.error('Ошибка создания тикета:', error);
        showMessage('Ошибка соединения', 'error');
    }
}

// Показать варианты оплаты
function showPaymentOptions() {
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => {
        return sum + (item.price * (item.selectedWeight || 1) * item.quantity);
    }, 0);

    elements.paymentOptions.innerHTML = '';

    const paymentMethods = [
        { id: 'btc', name: 'BTC', icon: 'fab fa-bitcoin' },
        { id: 'cryptobot', name: 'CryptoBot', icon: 'fas fa-robot' },
        { id: 'usdt', name: 'USDT', icon: 'fas fa-coins' },
        { id: 'trx', name: 'TRX', icon: 'fas fa-bolt' },
        { id: 'xlm', name: 'XLM', icon: 'fas fa-star' },
        { id: 'sol', name: 'SOL', icon: 'fas fa-sun' }
    ];

    paymentMethods.forEach(method => {
        const option = document.createElement('div');
        option.className = 'payment-option';
        option.innerHTML = `
            <i class="${method.icon}"></i>
            <span>${method.name}</span>
        `;
        option.onclick = () => processPayment(method.id, total);
        elements.paymentOptions.appendChild(option);
    });

    elements.modalOverlay.classList.add('active');
    elements.paymentModal.classList.add('active');
}

// Обработка оплаты
async function processPayment(method, amount) {
    closeModal();

    if (method === 'cryptobot') {
        await processCryptoBotPayment(amount);
    } else {
        showCryptoPaymentInstructions(method, amount);
    }
}

// Оплата через CryptoBot
async function processCryptoBotPayment(amount) {
    try {
        const response = await fetch(`${API_URL}/create_cryptobot_invoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                user_id: currentUser.id
            })
        });

        const data = await response.json();

        if (data.success && data.invoice_url) {
            tg.openLink(data.invoice_url);

            // Показываем подтверждение оплаты
            elements.paymentInfo.innerHTML = `
                <div class="payment-amount">
                    <h4>Сумма к оплате</h4>
                    <div class="payment-total">${amount} руб.</div>
                </div>
                <p>Откройте ссылку выше для оплаты через CryptoBot.</p>
                <p>После оплаты нажмите кнопку ниже.</p>
                <button onclick="confirmPayment('cryptobot', ${amount})" class="btn btn-primary">
                    <i class="fas fa-check"></i> Я оплатил
                </button>
            `;

            hideAllScreens();
            elements.paymentScreen.classList.add('active');
        } else {
            showMessage('Ошибка создания платежа', 'error');
        }
    } catch (error) {
        console.error('Ошибка CryptoBot:', error);
        showMessage('Ошибка соединения', 'error');
    }
}

// Показать инструкции для крипто-оплаты
function showCryptoPaymentInstructions(method, amount) {
    const rates = {
        'btc': 3500000,
        'usdt': 90,
        'trx': 8,
        'xlm': 10,
        'sol': 5000
    };

    const addresses = {
        'btc': 'ВАШ_BTC_АДРЕС',
        'usdt': 'ВАШ_USDT_АДРЕС',
        'trx': 'ВАШ_TRX_АДРЕС',
        'xlm': 'ВАШ_XLM_АДРЕС',
        'sol': 'ВАШ_SOL_АДРЕС'
    };

    const rate = rates[method] || 1;
    const cryptoAmount = amount / rate;
    const address = addresses[method] || 'ВАШ_АДРЕС';

    elements.paymentInfo.innerHTML = `
        <div class="payment-amount">
            <h4>Оплата через ${method.toUpperCase()}</h4>
            <div class="payment-total">${amount} руб.</div>
        </div>
        <div style="text-align: left; margin: 20px 0;">
            <p><strong>Курс:</strong> ${rate} руб./${method.toUpperCase()}</p>
            <p><strong>К оплате:</strong> ${cryptoAmount.toFixed(8)} ${method.toUpperCase()}</p>
            <p><strong>Сумма к получению:</strong> ${(amount * 1.2).toFixed(2)} руб.</p>
            <p style="margin-top: 20px; font-size: 14px; color: #666;">
                <i class="fas fa-info-circle"></i> Неизрасходованный остаток сохраняется на вашем балансе.
            </p>
            <div style="margin: 25px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <p style="font-size: 12px; color: #666; margin-bottom: 10px;">Отправьте на адрес:</p>
                <p style="word-break: break-all; font-family: monospace; background: white; padding: 10px; border-radius: 5px; border: 1px solid #eee;">
                    ${address}
                </p>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                    <strong>Сумма:</strong> ${cryptoAmount.toFixed(8)} ${method.toUpperCase()}
                </p>
            </div>
        </div>
        <button onclick="confirmPayment('${method}', ${amount})" class="btn btn-primary">
            <i class="fas fa-check"></i> Я оплатил
        </button>
    `;

    hideAllScreens();
    elements.paymentScreen.classList.add('active');
}

// Подтвердить оплату
async function confirmPayment(method, amount) {
    try {
        const response = await fetch(`${API_URL}/confirm_payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                method: method,
                amount: amount,
                cart: cart
            })
        });

        const data = await response.json();

        if (data.success) {
            // Очищаем корзину
            cart = [];
            saveCart();

            showMessage('Платеж подтвержден и отправлен на проверку');
            showMainScreen();
        } else {
            showMessage('Ошибка подтверждения платежа', 'error');
        }
    } catch (error) {
        console.error('Ошибка подтверждения платежа:', error);
        showMessage('Ошибка соединения', 'error');
    }
}

// Изменить город
async function changeCity() {
    // Здесь можно реализовать выбор города
    showMessage('Функция в разработке', 'warning');
}

// Изменить способ доставки
async function changeDeliveryMethod() {
    // Здесь можно реализовать изменение способа доставки
    showMessage('Функция в разработке', 'warning');
}

// Закрыть модальное окно
function closeModal() {
    elements.modalOverlay.classList.remove('active');
    elements.weightModal.classList.remove('active');
    elements.paymentModal.classList.remove('active');
    elements.ticketModal.classList.remove('active');
}

// Назад
function goBack() {
    if (elements.productScreen.classList.contains('active')) {
        showProducts(currentProduct.category, currentProduct.subcategory);
    } else if (elements.productsScreen.classList.contains('active')) {
        showCategory(currentProduct.category);
    } else if (elements.categoryScreen.classList.contains('active')) {
        showMainScreen();
    } else if (elements.cartScreen.classList.contains('active') ||
               elements.profileScreen.classList.contains('active') ||
               elements.ordersScreen.classList.contains('active') ||
               elements.paymentScreen.classList.contains('active')) {
        showMainScreen();
    }
}

// Скрыть все экраны
function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
}

// Обработчик нажатия на оверлей
elements.modalOverlay.onclick = closeModal;

// Предотвращаем закрытие при клике на модальное окно
document.querySelectorAll('.modal').forEach(modal => {
    modal.onclick = (e) => e.stopPropagation();
});