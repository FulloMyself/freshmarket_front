const placeholderSVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0BveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNmMWY1ZjkiLz48dGV4dCB4PSI3NSIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+UHJvZHVjdCBJbWFnZTwvdGV4dD48L3N2Zz4=';

// Navigation function
function showSection(sectionId) {
    console.log('Showing section:', sectionId);

    // Hide all sections
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.classList.add('hidden');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    } else {
        console.error('Section not found:', sectionId);
    }
}

// Demo login functionality
function demoLogin(role) {
    const credentials = {
        'admin': { email: 'admin@freshmarket.com', password: 'admin123' },
        'shop': { email: 'john@fresh.com', password: 'shop123' },
        'customer': { email: 'sarah@email.com', password: 'customer123' }
    };

    const cred = credentials[role];
    if (cred) {
        document.getElementById('email').value = cred.email;
        document.getElementById('password').value = cred.password;

        // Auto-submit the form
        document.getElementById('login-form').dispatchEvent(new Event('submit'));
    }
}

// Update login handler to show role-specific content
document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    console.log('Login attempt:', email);

    try {
        const result = await api.login(email, password);
        console.log('Login successful:', result);

        alert('Login successful!');

        // Update UI based on user role
        if (api.user) {
            document.getElementById('user-role').textContent = `Logged in as: ${api.user.role}`;

            // Show appropriate dashboard based on role
            if (api.user.role === 'customer') {
                showSection('products-section');
                displayProducts();
            } else if (api.user.role === 'shop_owner') {
                showSection('dashboard-section');
                // For shop owners, show shop management dashboard
                document.getElementById('dashboard-content').innerHTML = `
                    <div class="dashboard-card">
                        <h3>Shop Owner Dashboard</h3>
                        <p>Manage your products and orders here.</p>
                        <button onclick="showSection('products-section'); displayProducts();">View Products</button>
                        <button onclick="alert('Orders feature coming soon')">View Orders</button>
                    </div>
                `;
            } else if (api.user.role === 'admin') {
                showSection('dashboard-section');
                // For admins, show admin dashboard
                document.getElementById('dashboard-content').innerHTML = `
                    <div class="dashboard-card">
                        <h3>Admin Dashboard</h3>
                        <p>Manage shops, users, and platform analytics.</p>
                        <button onclick="showSection('products-section'); displayProducts();">View Products</button>
                        <button onclick="alert('Admin features coming soon')">Manage Shops</button>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
});

// Display products with enhanced shop info
async function displayProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) {
        console.log('Product grid not found');
        return;
    }

    grid.innerHTML = '<p>Loading products...</p>';

    try {
        let productsData;

        productsData = await api.getProductsWithFallback();
        console.log('Products loaded from:', productsData.source, 'for role:', api.user.role);

        const products = productsData.products || [];
        grid.innerHTML = '';

        if (products.length === 0) {
            grid.innerHTML = '<p>No products available</p>';
            return;
        }

        // Show source and role indicator
        const indicator = document.createElement('div');
        indicator.className = 'source-indicator';

        let indicatorText = `<strong>Role:</strong> ${api.user.role} | <strong>Source:</strong> ${productsData.source} | <strong>Products:</strong> ${products.length}`;

        // Add shop count for customers
        if (api.user.role === 'customer') {
            const uniqueShops = [...new Set(products.map(p => p.shopName || p.shopId))];
            indicatorText += ` | <strong>Shops:</strong> ${uniqueShops.length}`;
        }

        indicator.innerHTML = `<small>${indicatorText}</small>`;
        grid.appendChild(indicator);

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';

            // Show shop info for customers and admins
            let shopInfo = '';
            if (api.user.role === 'customer' && product.shopName) {
                shopInfo = `<p class="product-shop">Shop: ${product.shopName}</p>`;
            } else if (api.user.role === 'admin' && product.shopId && product.shopId.name) {
                shopInfo = `<p class="product-shop">Shop: ${product.shopId.name}</p>`;
            }

            card.innerHTML = `
                <img src="${product.image || placeholderSVG}" 
                     alt="${product.name}" 
                     onerror="this.src='${placeholderSVG}'">
                <h3>${product.name}</h3>
                ${shopInfo}
                ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
                <p class="product-price">Price: R${product.price.toFixed(2)} per ${product.unit || 'unit'}</p>
                <p class="product-category">Category: ${product.category}</p>
                ${product.stock !== undefined ? `<p class="product-stock">Stock: ${product.stock} available</p>` : ''}
                <button onclick="addToCart('${product._id}')">Add to Cart</button>
            `;
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error displaying products:', error);
        grid.innerHTML = '<p>Error loading products. Please try again.</p>';
    }
}


// Add dashboard card styles
const style = document.createElement('style');
style.textContent = `
    .dashboard-card {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        margin: 1rem 0;
    }
    
    .dashboard-card h3 {
        color: var(--primary);
        margin-bottom: 1rem;
    }
    
    .dashboard-card button {
        padding: 0.75rem 1.5rem;
        margin: 0.5rem;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }
    
    .dashboard-card button:hover {
        background: var(--primary-dark);
    }
`;
document.head.appendChild(style);



// Enhanced addToCart function with real product data
async function addToCart(productId) {
    try {
        const result = await api.addToCart(productId, 1);
        await displayCart(); // Wait for cart to update
        alert(result.message || 'Product added to cart!');
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Failed to add product to cart: ' + error.message);
    }
}

// Enhanced displayCart function
async function displayCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    const cartTotalDiv = document.getElementById('cart-total');

    if (!cartItemsDiv || !cartTotalDiv) {
        console.log('Cart elements not found');
        return;
    }

    cartItemsDiv.innerHTML = '<p>Loading cart...</p>';

    try {
        const cartData = await api.getCart();
        const cart = cartData.cart;
        
        cartItemsDiv.innerHTML = '';
        
        if (!cart.items || cart.items.length === 0) {
            cartItemsDiv.innerHTML = '<p>Your cart is empty</p>';
            cartTotalDiv.textContent = 'Total: R0.00';
            return;
        }

        cart.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item';
            itemDiv.innerHTML = `
                <div class="cart-item-info">
                    <strong>${item.name}</strong>
                    <br><small>Shop: ${item.shopId?.name || 'Unknown'}</small>
                    <br>Price: R${item.price.toFixed(2)} x ${item.quantity}
                </div>
                <div class="cart-item-controls">
                    <button onclick="updateCartItem('${item._id}', ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateCartItem('${item._id}', ${item.quantity + 1})">+</button>
                    <button onclick="removeFromCart('${item._id}')" class="remove-btn">Remove</button>
                </div>
                <div class="cart-item-total">R${(item.price * item.quantity).toFixed(2)}</div>
            `;
            cartItemsDiv.appendChild(itemDiv);
        });

        cartTotalDiv.innerHTML = `
            <div class="cart-summary">
                <div>Subtotal: R${cart.total?.toFixed(2) || '0.00'}</div>
                <div>Delivery Fee: R${cart.total > 100 ? '0.00' : '15.00'}</div>
                <div><strong>Total: R${((cart.total || 0) + (cart.total > 100 ? 0 : 15)).toFixed(2)}</strong></div>
            </div>
        `;

    } catch (error) {
        console.error('Error displaying cart:', error);
        cartItemsDiv.innerHTML = '<p>Error loading cart. Please try again.</p>';
    }
}

// Cart management functions
async function updateCartItem(itemId, newQuantity) {
    try {
        if (newQuantity < 1) {
            await removeFromCart(itemId);
            return;
        }
        
        await api.updateCartItem(itemId, newQuantity);
        await displayCart();
    } catch (error) {
        console.error('Error updating cart item:', error);
        alert('Failed to update cart: ' + error.message);
    }
}
async function removeFromCart(itemId) {
    try {
        await api.removeFromCart(itemId);
        await displayCart();
    } catch (error) {
        console.error('Error removing from cart:', error);
        alert('Failed to remove item from cart: ' + error.message);
    }
}


// Enhanced displayCart function
async function displayCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    const cartTotalDiv = document.getElementById('cart-total');

    if (!cartItemsDiv || !cartTotalDiv) {
        console.log('Cart elements not found');
        return;
    }

    try {
        const cartData = await api.getCart();
        const cart = cartData.cart;

        cartItemsDiv.innerHTML = '';

        if (!cart.items || cart.items.length === 0) {
            cartItemsDiv.innerHTML = '<p>Your cart is empty</p>';
            cartTotalDiv.textContent = 'Total: R0.00';
            return;
        }

        cart.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item';
            itemDiv.innerHTML = `
                <div class="cart-item-info">
                    <strong>${item.name}</strong>
                    <br><small>Shop: ${item.shopId?.name || 'Unknown'}</small>
                    <br>Price: R${item.price.toFixed(2)} x ${item.quantity}
                </div>
                <div class="cart-item-controls">
                    <button onclick="updateCartItem('${item._id}', ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateCartItem('${item._id}', ${item.quantity + 1})">+</button>
                    <button onclick="removeFromCart('${item._id}')" class="remove-btn">Remove</button>
                </div>
                <div class="cart-item-total">R${(item.price * item.quantity).toFixed(2)}</div>
            `;
            cartItemsDiv.appendChild(itemDiv);
        });

        cartTotalDiv.textContent = `Total: R${cart.total.toFixed(2)}`;
    } catch (error) {
        console.error('Error displaying cart:', error);
        cartItemsDiv.innerHTML = '<p>Error loading cart</p>';
    }
}

// Cart management functions
async function updateCartItem(itemId, newQuantity) {
    if (newQuantity < 1) {
        await removeFromCart(itemId);
        return;
    }

    try {
        await api.updateCartItem(itemId, newQuantity);
        displayCart();
    } catch (error) {
        console.error('Error updating cart item:', error);
        alert('Failed to update cart');
    }
}

async function checkout() {
    try {
        const cartData = await api.getCart();
        if (!cartData.cart.items || cartData.cart.items.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        const deliveryAddress = prompt('Enter delivery address:');
        if (!deliveryAddress) {
            alert('Delivery address is required');
            return;
        }

        const result = await api.request('/customer/orders', {
            method: 'POST',
            body: JSON.stringify({
                deliveryAddress,
                paymentMethod: 'payfast' // Default payment method
            })
        });

        alert('Order placed successfully!');
        displayCart(); // Cart should be empty now

    } catch (error) {
        console.error('Checkout error:', error);
        alert('Failed to place order: ' + error.message);
    }
}

// Add search functionality
function setupSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search products...';
    searchInput.id = 'product-search';
    searchInput.style.cssText = 'width: 100%; padding: 0.5rem; margin: 1rem 0;';

    const productsSection = document.getElementById('products-section');
    if (productsSection) {
        productsSection.insertBefore(searchInput, document.getElementById('product-grid'));
    }

    searchInput.addEventListener('input', debounce(filterProducts, 300));
}

function filterProducts() {
    const searchTerm = document.getElementById('product-search').value.toLowerCase();
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        const productName = card.querySelector('h3').textContent.toLowerCase();
        const productDescription = card.querySelector('.product-description')?.textContent.toLowerCase() || '';

        if (productName.includes(searchTerm) || productDescription.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('FreshMarket app initialized');

    // Check if user is already logged in
    if (api.checkAuth()) {
        console.log('User already authenticated:', api.user);
        document.getElementById('user-role').textContent = `Logged in as: ${api.user.role}`;
        showSection('products-section');
        displayProducts('demo-shop-id');
    } else {
        showSection('login-section');
    }

    // Set up navigation
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionMap = {
                'Home': 'login-section',
                'Shops': 'products-section',
                'Cart': 'cart-section',
                'Account': 'dashboard-section'
            };

            const sectionId = sectionMap[link.textContent];
            if (sectionId) {
                showSection(sectionId);

                // Load data when navigating to specific sections
                if (sectionId === 'products-section') {
                    displayProducts(); // No parameter needed now
                }
                if (sectionId === 'cart-section') {
                    displayCart();
                }
            }
        });
    });

    // Load cart on startup
    displayCart();
    setupSearch();
});
