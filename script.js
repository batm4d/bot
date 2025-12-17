let tg = window.Telegram.WebApp;
let cart = JSON.parse(localStorage.getItem('cart')) || {};

tg.expand();
tg.MainButton.text = "Открыть в боте";
tg.MainButton.color = "#667eea";
tg.MainButton.show();

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    updateCartDisplay();

    // Показываем главную страницу
    showCategory('main');
});

// Загрузка данных пользователя
async function loadUserData() {
    const userInfo = document.getElementById('userInfo');
    const profileInfo = document.getElementById('profileInfo');

    try {
        const response = await fetch('/api/user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: tg.initDataUnsafe.user.id
            })
        });

        const data = await response.json();

        if (data.success) {
            const user = data.user;
            userInfo.innerHTML = `
                <p>👤 ${user.login || 'Гость'}</p>
                <p>🏙 ${user.city || 'Город не выбран'}</p>
            `;

            profileInfo.innerHTML = `
                <div class="profile-details">
                    <p><strong>Логин:</strong> ${user.login || 'Не установлен'}</p>
                    <p><strong>Город:</strong> ${user.city || 'Не выбран'}</p>
                    <p><strong>Способ получения:</strong> ${user.delivery_method || 'Не выбран'}</p>
                </div>
            `;
        } else {
            userInfo.innerHTML = '<p>Войдите через Telegram бота</p>';
            profileInfo.innerHTML = '<p>Войдите через Telegram бота для просмотра профиля</p>';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        userInfo.innerHTML = '<p>Ошибка загрузки данных</p>';
    }
}

// Навигация
function showCategory(category) {
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Показываем выбранную страницу
    document.getElementById(`${category}Page`).classList.add('active');

    // Обновляем заголовок кнопки
    tg.MainButton.text = getButtonText(category);
}

function getButtonText(category) {
    const texts = {
        'main': 'Открыть в боте',
        'products': 'Купить в боте',
        'cart': 'Оформить заказ',
        'profile': 'Открыть профиль'
    };
    return texts[category] || 'Открыть в боте';
}

// Загрузка товаров
async function loadProducts(category) {
    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '<p>Загрузка...</p>';

    try {
        let url = `/api/products?category=${category}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.products.length > 0) {
            productsList.innerHTML = '';
            data.products.forEach(product => {
                const productElement = createProductElement(product);
                productsList.appendChild(productElement);
            });
        } else {
            productsList.innerHTML = '<p>Товары не найдены</p>';
        }
    } catch (error) {
        console.error('Error loading products:', error);
        productsList.innerHTML = '<p>Ошибка загрузки товаров</p>';
    }

    showCategory('products');
}

// Создание элемента товара
function createProductElement(product) {
    const div = document.createElement('div');
    div.className = 'product-card';

    const inCart = cart[product.id] || 0;

    div.innerHTML = `
        <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.description || ''}</p>
        </div>
        <div class="product-price">
            ${product.price}₽
        </div>
        <div class="product-actions">
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="removeFromCart(${product.id})">-</button>
                <span>${inCart}</span>
                <button class="quantity-btn" onclick="addToCart(${product.id}, '${product.name}', ${product.price})">+</button>
            </div>
        </div>
    `;

    return div;
}

// Работа с корзиной
function addToCart(productId, productName, price) {
    if (!cart[productId]) {
        cart[productId] = {
            quantity: 0,
            name: productName,
            price: price
        };
    }
    cart[productId].quantity++;
    saveCart();
    updateCartDisplay();
}

function removeFromCart(productId) {
    if (cart[productId]) {
        cart[productId].quantity--;
        if (cart[productId].quantity <= 0) {
            delete cart[productId];
        }
        saveCart();
        updateCartDisplay();
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const totalAmount = document.getElementById('totalAmount');

    if (Object.keys(cart).length === 0) {
        cartItems.innerHTML = '<p>Корзина пуста</p>';
        totalAmount.textContent = '0';
        return;
    }

    let total = 0;
    cartItems.innerHTML = '';

    Object.keys(cart).forEach(productId => {
        const item = cart[productId];
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${item.price}₽ × ${item.quantity}</p>
            </div>
            <div class="cart-item-total">
                <strong>${itemTotal}₽</strong>
            </div>
        `;
        cartItems.appendChild(itemElement);
    });

    totalAmount.textContent = total;
}

function checkout() {
    // Здесь можно реализовать оформление заказа
    tg.showAlert('Для оформления заказа перейдите в Telegram бота');
    tg.openTelegramLink(`https://t.me/${tg.initDataUnsafe.user.username || 'santa_market_bot'}`);
}

function openTelegramBot() {
    tg.openTelegramLink(`https://t.me/${tg.initDataUnsafe.user.username || 'santa_market_bot'}`);
}

// Обработка основной кнопки
tg.MainButton.onClick(function() {
    const activePage = document.querySelector('.page.active').id;

    switch(activePage) {
        case 'cartPage':
            checkout();
            break;
        case 'profilePage':
            openTelegramBot();
            break;
        default:
            tg.openTelegramLink(`https://t.me/${tg.initDataUnsafe.user.username || 'santa_market_bot'}`);
    }
});