// script.js — Полная логика Telegram Mini App "Санта Маркет"

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// === НАСТРОЙКИ ===
const API_BASE = "https://your-flask-backend.onrender.com"; // ← ОБЯЗАТЕЛЬНО ЗАМЕНИТЕ НА СВОЙ БЭКЕНД!
const userId = tg.initDataUnsafe.user?.id || 0;

// Фото (замените на свои ссылки)
const PHOTOS = {
    welcome: "https://via.placeholder.com/800x400/111/fff?text=Добро+пожаловать",
    reviews: "https://via.placeholder.com/800x600/222/fff?text=Отзывы+проекта",
    referral: "https://via.placeholder.com/800x600/333/fff?text=Реферальная+программа",
    info: "https://via.placeholder.com/800x600/444/fff?text=Информация+о+проекте",
    toys: "https://via.placeholder.com/400/555/fff?text=Игрушки",
    pharm: "https://via.placeholder.com/400/666/fff?text=Аптечки",
    food: "https://via.placeholder.com/400/777/fff?text=Питание",
    "Плюшевый медведь": "https://via.placeholder.com/400?text=Плюшевый+медведь",
    "Большой медведь": "https://via.placeholder.com/400?text=Большой+медведь",
    "Конструктор": "https://via.placeholder.com/400?text=Конструктор",
    "Аптечка первой помощи": "https://via.placeholder.com/400?text=Аптечка+первой+помощи",
    "Аптечка автомобильная": "https://via.placeholder.com/400?text=Аптечка+автомобильная",
    "Энергетические батончики": "https://via.placeholder.com/400?text=Батончики",
    "Сухпаек туриста": "https://via.placeholder.com/400?text=Сухпаек",
    "Тушенка говяжья": "https://via.placeholder.com/400?text=Тушенка"
};

// Каталог товаров (цены в рублях)
const CATALOG = {
    "Игрушки": {
        "Мягкие": [
            { name: "Плюшевый медведь", price: 1500, hasWeight: true },
            { name: "Большой медведь", price: 3000, hasWeight: true }
        ],
        "Развивающие": [
            { name: "Конструктор", price: 2500, hasWeight: true }
        ]
    },
    "Аптечки": {
        "Базовые": [
            { name: "Аптечка первой помощи", price: 1200, hasWeight: false }
        ],
        "Специализированные": [
            { name: "Аптечка автомобильная", price: 1800, hasWeight: false }
        ]
    },
    "Питание": {
        "Консервы": [
            { name: "Тушенка говяжья", price: 800, hasWeight: true }
        ],
        "Сухпайки": [
            { name: "Сухпаек туриста", price: 2200, hasWeight: true }
        ],
        "Наше производство": [
            { name: "Энергетические батончики", price: 600, hasWeight: true }
        ]
    }
};

let userData = {};
let cart = [];
let currentCategory = "";
let currentSubcategory = "";

// === Авторизация ===
async function login() {
    const login = document.getElementById("login-input").value.trim();
    const password = document.getElementById("password-input").value;

    if (!login || !password) {
        tg.showAlert("Заполните логин и пароль");
        return;
    }

    const res = await fetch(`${API_BASE}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, login, password })
    });
    const data = await res.json();

    if (data.success) {
        userData = data.user;
        localStorage.setItem("santa_auth", JSON.stringify({ user_id: userId, login, password }));
        initApp();
    } else {
        tg.showAlert("Неверный логин или пароль");
    }
}

// Автологин при повторном открытии
if (localStorage.getItem("santa_auth")) {
    const auth = JSON.parse(localStorage.getItem("santa_auth"));
    if (auth.user_id === userId) {
        document.getElementById("login-input").value = auth.login;
        document.getElementById("password-input").value = auth.password;
        login();
    }
}

// === Инициализация после авторизации ===
async function initApp() {
    document.getElementById("auth-screen").classList.remove("active");
    document.getElementById("main-screen").classList.add("active");

    document.getElementById("city-display").innerText = userData.city || "Не выбран";
    document.getElementById("profile-login").innerText = localStorage.getItem("santa_auth") ? JSON.parse(localStorage.getItem("santa_auth")).login : "";
    document.getElementById("profile-city").innerText = userData.city || "Не выбран";
    document.getElementById("profile-method").innerText = userData.delivery_method || "Не выбран";
    document.getElementById("profile-data").innerText = userData.delivery_data || "Не указаны";

    await loadCart();
}

// === Загрузка корзины ===
async function loadCart() {
    const res = await fetch(`${API_BASE}/cart?user_id=${userId}`);
    const data = await res.json();
    cart = data.cart || [];
    updateCartCount();
    if (document.getElementById("cart-screen").classList.contains("active")) renderCart();
}

function updateCartCount() {
    document.getElementById("cart-count").innerText = cart.length;
}

// === Навигация ===
function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");

    if (id === "cart-screen") renderCart();
    if (id === "main-screen") updateCartCount();
}

function backToMain() {
    showScreen("main-screen");
}

// === Меню товаров ===
function openMenu() {
    const allowedCats = userData.delivery_method === "Почта"
        ? ["Игрушки", "Аптечки"]
        : ["Игрушки", "Аптечки", "Питание"];

    const container = document.getElementById("categories");
    container.innerHTML = "";
    allowedCats.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.innerHTML = `<img src="${PHOTOS[cat.toLowerCase()] || PHOTOS.toys}" style="width:100%;border-radius:12px;margin-bottom:8px"><br>${cat}`;
        btn.onclick = () => openSubcategory(cat);
        container.appendChild(btn);
    });
    showScreen("menu-screen");
}

function openSubcategory(category) {
    currentCategory = category;
    const subcats = Object.keys(CATALOG[category]);
    const container = document.getElementById("categories");
    container.innerHTML = `<button class="back-btn" onclick="openMenu()">🔙 Назад</button><h2>${category}</h2>`;
    const grid = document.createElement("div");
    grid.className = "grid";
    subcats.forEach(sub => {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.innerText = sub;
        btn.onclick = () => openProducts(sub);
        grid.appendChild(btn);
    });
    container.appendChild(grid);
}

function openProducts(subcategory) {
    currentSubcategory = subcategory;
    const products = CATALOG[currentCategory][subcategory];
    const container = document.getElementById("categories");
    container.innerHTML = `<button class="back-btn" onclick="openSubcategory('${currentCategory}')">🔙</button><h2>${subcategory}</h2>`;
    const grid = document.createElement("div");
    grid.className = "grid";

    products.forEach(product => {
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
            <img src="${PHOTOS[product.name]}" style="width:100%;border-radius:12px">
            <h3>${product.name}</h3>
            <p>${product.price}₽</p>
        `;

        if (product.hasWeight) {
            const weights = [0.2, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
            const weightRow = document.createElement("div");
            weightRow.style.display = "grid";
            weightRow.style.gridTemplateColumns = "repeat(4,1fr)";
            weightRow.style.gap = "8px";
            weightRow.style.marginTop = "10px";

            weights.forEach(w => {
                const wbtn = document.createElement("button");
                wbtn.style.padding = "8px";
                wbtn.style.fontSize = "14px";
                wbtn.innerText = `${w}г`;
                wbtn.onclick = () => addToCart(product, w);
                weightRow.appendChild(wbtn);
            });
            div.appendChild(weightRow);
        } else {
            const addBtn = document.createElement("button");
            addBtn.className = "btn-primary";
            addBtn.innerText = "Добавить в корзину";
            addBtn.onclick = () => addToCart(product, 1);
            div.appendChild(addBtn);
        }

        grid.appendChild(div);
    });
    container.appendChild(grid);
}

function addToCart(product, weight = 1) {
    cart.push({ ...product, weight });
    saveCart();
    tg.showAlert(`${product.name} (${weight}г) добавлен в корзину!`);
}

// === Корзина ===
function openCart() {
    renderCart();
    showScreen("cart-screen");
}

function renderCart() {
    const container = document.getElementById("cart-items");
    const totalEl = document.getElementById("cart-total");
    const emptyEl = document.getElementById("empty-cart");
    const payBtn = document.getElementById("pay-btn");

    if (cart.length === 0) {
        container.innerHTML = "";
        totalEl.innerText = "";
        emptyEl.style.display = "block";
        payBtn.style.display = "none";
        return;
    }

    emptyEl.style.display = "none";
    container.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
        const price = item.price * item.weight;
        total += price;

        const div = document.createElement("div");
        div.className = "card";
        div.style.marginBottom = "16px";
        div.innerHTML = `
            <h3>${item.name}</h3>
            <p>Вес: ${item.weight}г | Цена: ${price}₽</p>
            <button class="small-btn" style="background:#f44" onclick="removeFromCart(${index})">Удалить</button>
        `;
        container.appendChild(div);
    });

    totalEl.innerText = `Итого: ${total}₽ (+20% = ${Math.round(total * 1.2)}₽ к оплате)`;
    payBtn.style.display = "block";
    payBtn.onclick = proceedToPayment;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
    updateCartCount();
}

async function saveCart() {
    await fetch(`${API_BASE}/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, cart })
    });
    updateCartCount();
}

// === Оплата ===
async function proceedToPayment() {
    const total = cart.reduce((sum, i) => sum + i.price * (i.weight || 1), 0);
    const totalWithMargin = Math.round(total * 1.2);

    // Получаем актуальные курсы
    const ratesRes = await fetch(`${API_BASE}/get_rates`);
    const ratesData = await ratesRes.json();
    const usdtRate = ratesData.rates.USDT;
    const amountUsdt = (totalWithMargin / usdtRate).toFixed(2);

    tg.showPopup({
        title: "Оплата заказа",
        message: `Сумма: ${total}₽\n+20% комиссия = ${totalWithMargin}₽\n\nТекущий курс: 1 USDT ≈ ${usdtRate.toFixed(2)}₽\nК оплате: ${amountUsdt} USDT`,
        buttons: [
            { id: "cryptobot", text: "🔄 CryptoBot (USDT)" },
            { id: "manual", text: "🌐 Ручная оплата" },
            { id: "cancel", text: "❌ Отмена", type: "cancel" }
        ]
    }, async (buttonId) => {
        if (buttonId === "cryptobot") {
            const res = await fetch(`${API_BASE}/create_invoice`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, amount_rub: totalWithMargin })
            });
            const data = await res.json();

            if (data.success) {
                tg.openLink(data.bot_invoice_url);  // Открывает CryptoBot с готовым счётом
            } else {
                tg.showAlert("Ошибка: " + data.error);
            }
        } else if (buttonId === "manual") {
            const manualText = `
💳 Ручная оплата (+20%)

Сумма к оплате: ${totalWithMargin} ₽

🌐 BTC (~${(totalWithMargin / ratesData.rates.BTC).toFixed(6)} BTC)
Адрес: bc1q...

🌐 USDT (TRC20) (${amountUsdt} USDT)
Адрес: TR7NHqje...

После оплаты пришлите чек в бот @santamarketbot
            `.trim();

            tg.showPopup({
                title: "Ручная оплата",
                message: manualText,
                buttons: [{ text: "Понятно", type: "close" }]
            });
        }
    });
}

// === Профиль ===
function openProfile() {
    document.getElementById("profile-city").innerText = userData.city || "Не выбран";
    document.getElementById("profile-method").innerText = userData.delivery_method || "Не выбран";
    document.getElementById("profile-data").innerText = userData.delivery_data || "Не указаны";
    showScreen("profile-screen");
}

// Здесь можно добавить функции изменения города и способа доставки через prompt + fetch к /profile/update

// === Остальные экраны ===
function showReviews() {
    document.querySelector("#reviews-screen img").src = PHOTOS.reviews;
    showScreen("reviews-screen");
}

function showReferral() {
    const link = `https://t.me/${tg.initDataUnsafe.start_param ? tg.initDataUnsafe.user.username : "santamarketbot"}?start=ref_${userId}`;
    document.getElementById("ref-link-text").innerText = `Ваша ссылка: ${link}`;
    document.querySelector("#referral-screen img").src = PHOTOS.referral;
    showScreen("referral-screen");
}

function copyRefLink() {
    navigator.clipboard.writeText(document.getElementById("ref-link-text").innerText);
    tg.showAlert("Ссылка скопирована!");
}

function showInfo() {
    document.querySelector("#info-screen img").src = PHOTOS.info;
    showScreen("info-screen");
}