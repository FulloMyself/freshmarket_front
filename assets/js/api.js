// API Base URL - change this to your backend URL
const API_BASE_URL = 'http://localhost:5000/api';

// Global api object
const api = {
    token: localStorage.getItem('authToken'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    isAuthenticated: false,
    currentShopId: null,

    // Helper method for API requests
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        // Add auth token if available
        if (this.token) {
            config.headers['x-auth-token'] = this.token;
        }

        try {
            const response = await fetch(url, config);

            // Handle unauthorized/forbidden responses
            if (response.status === 401 || response.status === 403) {
                console.log('Auth error, status:', response.status);
                // Don't logout immediately, just throw error
                throw new Error(`Access denied: ${response.statusText}`);
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error.message);
            throw error;
        }
    },

    // Auth methods
    async login(email, password) {
        try {
            const data = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            if (data.token) {
                this.token = data.token;
                this.user = data.user;
                this.isAuthenticated = true;
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                console.log('Login successful:', this.user.role);
            }

            return data;
        } catch (error) {
            this.logout();
            throw new Error('Login failed: ' + error.message);
        }
    },

    logout() {
        this.token = null;
        this.user = null;
        this.isAuthenticated = false;
        this.currentShopId = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    },

    // Check if user is authenticated
    checkAuth() {
        return this.isAuthenticated && this.token !== null;
    },

    // Get all active shops (for customers)
    async getShops() {
        if (!this.checkAuth()) {
            throw new Error('Authentication required');
        }
        try {
            return await this.request('/customer/shops');
        } catch (error) {
            console.error('Error fetching shops:', error.message);
            return { shops: [] };
        }
    },

    // Get products based on user role
    async getProducts() {
        if (!this.checkAuth()) {
            throw new Error('Authentication required');
        }

        try {
            // Use different endpoints based on user role
            if (this.user.role === 'customer') {
                return await this.getCustomerProducts();
            } else if (this.user.role === 'shop_owner') {
                return await this.getShopOwnerProducts();
            } else if (this.user.role === 'admin') {
                return await this.getAdminProducts();
            }

            throw new Error('Unknown user role');
        } catch (error) {
            console.error('Error fetching products:', error.message);
            throw error;
        }
    },

    // Customer: Get products from ALL active shops
    async getCustomerProducts() {
        try {
            // First, get all active shops
            const shopsData = await this.getShops();
            console.log('Customer shops found:', shopsData.shops.length);

            if (!shopsData.shops || shopsData.shops.length === 0) {
                throw new Error('No active shops available');
            }

            // Get products from ALL shops
            let allProducts = [];
            for (const shop of shopsData.shops) {
                try {
                    const productsData = await this.request(`/customer/shops/${shop._id}/products`);
                    if (productsData.products && productsData.products.length > 0) {
                        // Add shop info to each product
                        const productsWithShopInfo = productsData.products.map(product => ({
                            ...product,
                            shopName: shop.name,
                            shopId: shop._id
                        }));
                        allProducts = allProducts.concat(productsWithShopInfo);
                    }
                } catch (error) {
                    console.log(`Error fetching products from shop ${shop.name}:`, error.message);
                }
            }

            console.log(`Customer sees ${allProducts.length} products from ${shopsData.shops.length} shops`);
            return { products: allProducts };
        } catch (error) {
            console.error('Error fetching customer products:', error);
            throw error;
        }
    },


    // Shop Owner: Get their own products
    async getShopOwnerProducts() {
        return await this.request('/shop/products');
    },

    // Admin: Get all products
    async getAdminProducts() {
        try {
            const response = await this.request('/admin/products');
            console.log('Admin products response:', response);
            return response;
        } catch (error) {
            console.error('Admin products error:', error);
            throw error;
        }
    },

    // Add cart methods to api object
    async addToCart(productId, quantity = 1) {
        try {
            return await this.request('/customer/cart', {
                method: 'POST',
                body: JSON.stringify({ productId, quantity })
            });
        } catch (error) {
            console.error('Error adding to cart:', error);
            throw error;
        }
    },

    async getCart() {
        try {
            return await this.request('/customer/cart');
        } catch (error) {
            console.error('Error fetching cart:', error);
            throw error;
        }
    },

    async updateCartItem(itemId, quantity) {
        try {
            return await this.request(`/customer/cart/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity })
            });
        } catch (error) {
            console.error('Error updating cart:', error);
            throw error;
        }
    },

    async removeFromCart(itemId) {
        try {
            return await this.request(`/customer/cart/${itemId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Error removing from cart:', error);
            throw error;
        }
    },

    // Enhanced getProductsWithFallback
    async getProductsWithFallback() {
        try {
            // Try to get real products based on user role
            const productsData = await this.getProducts();
            return { ...productsData, source: 'database' };
        } catch (error) {
            console.log('Falling back to demo data:', error.message);
            return { ...this.getDemoProducts(), source: 'demo' };
        }
    },


    // Get first available shop ID
    async getFirstShopId() {
        try {
            const shopsData = await this.getShops();
            console.log('Available shops:', shopsData);

            if (shopsData.shops && shopsData.shops.length > 0) {
                this.currentShopId = shopsData.shops[0]._id;
                console.log('Using shop ID:', this.currentShopId);
                return this.currentShopId;
            }
            console.log('No shops found in database');
            return null;
        } catch (error) {
            console.log('Error getting shops:', error.message);
            return null;
        }
    },

    // Fallback demo data
    getDemoProducts() {
        const placeholderSVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0BveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNmMWY1ZjkiLz48dGV4dCB4PSI3NSIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+UHJvZHVjdCBJbWFnZTwvdGV4dD48L3N2Zz4=';

        return {
            products: [
                {
                    _id: '1',
                    name: 'Organic Apples',
                    price: 15.99,
                    category: 'Fruits',
                    unit: 'kg',
                    stock: 50,
                    image: placeholderSVG
                },
                {
                    _id: '2',
                    name: 'Fresh Milk',
                    price: 8.99,
                    category: 'Dairy',
                    unit: 'l',
                    stock: 30,
                    image: placeholderSVG
                },
                {
                    _id: '3',
                    name: 'Whole Wheat Bread',
                    price: 7.49,
                    category: 'Bakery',
                    unit: 'pc',
                    stock: 20,
                    image: placeholderSVG
                }
            ]
        };
    }
};
