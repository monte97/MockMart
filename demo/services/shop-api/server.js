const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const { Pool } = require('pg');

// Import authentication middleware
const { requireAuth, optionalAuth } = require('./middleware/auth');
const { getServiceToken } = require('./lib/service-token');

// Postgres connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://demo:demo123@localhost:5432/orders',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Database connected:', res.rows[0].now);
  }
});

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3009';

// Helper function for async delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Swagger definition
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'TechStore API',
      version: '1.0.0',
      description: 'API documentation for the TechStore e-commerce demo application.',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from Keycloak'
        }
      }
    }
  },
  apis: ['./server.js'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration (for anonymous cart only)
app.use(session({
  secret: process.env.SESSION_SECRET || 'demo-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CORS configuration for frontend
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Load products data
let products = JSON.parse(fs.readFileSync('./data/products.json', 'utf8'));

// In-memory storage for carts
const carts = {};

// ============================================
// API ROUTES
// ============================================

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with optional filters
 *     description: Returns a list of products, with optional filtering by category, search term, and sorting.
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or description.
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price-asc, price-desc, name]
 *         description: Sort order.
 *     responses:
 *       200:
 *         description: A list of products.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get('/api/products', (req, res) => {
  const { category, search, sort } = req.query;

  let filteredProducts = [...products];

  // Filter by category
  if (category) {
    filteredProducts = filteredProducts.filter(p => p.category === category);
  }

  // Search by name or description
  if (search) {
    const searchLower = search.toLowerCase();
    filteredProducts = filteredProducts.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower)
    );
  }

  // Sort products
  if (sort === 'price-asc') {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-desc') {
    filteredProducts.sort((a, b) => b.price - a.price);
  } else if (sort === 'name') {
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  }

  res.json(filteredProducts);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The product ID.
 *     responses:
 *       200:
 *         description: The product details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found.
 */
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all product categories
 *     responses:
 *       200:
 *         description: A list of unique category names.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
app.get('/api/categories', (req, res) => {
  const categories = [...new Set(products.map(p => p.category))];
  res.json(categories);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewProduct'
 *     responses:
 *       201:
 *         description: The created product.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Missing required fields.
 */
app.post('/api/products', async (req, res) => {
  // Introduce a random delay 70% of the time to simulate network latency
  if (Math.random() < 0.7) {
    const delaySeconds = 3;
    console.log(`[API DELAY] Adding a ${delaySeconds}s delay to POST /api/products`);
    await delay(delaySeconds * 1000);
  }

  const { name, description, price, category, image, stock } = req.body;

  // Enhanced validation
  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required fields.' });
  }

  // Check for duplicate product name (case-insensitive)
  const existingProduct = products.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existingProduct) {
    return res.status(409).json({ error: `Product name "${name}" is already in use.` });
  }

  // Generate new ID
  const newId = Math.max(...products.map(p => p.id), 0) + 1;

  const newProduct = {
    id: newId,
    name,
    description: description || '',
    price: parseFloat(price),
    category,
    image: image || 'https://via.placeholder.com/300x200?text=Product',
    stock: stock !== undefined ? parseInt(stock) : 0
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update an existing product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The product ID.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProduct'
 *     responses:
 *       200:
 *         description: The updated product.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found.
 */
app.put('/api/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const productIndex = products.findIndex(p => p.id === productId);

  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const { name, description, price, category, image, stock } = req.body;

  // Update only provided fields
  if (name !== undefined) products[productIndex].name = name;
  if (description !== undefined) products[productIndex].description = description;
  if (price !== undefined) products[productIndex].price = parseFloat(price);
  if (category !== undefined) products[productIndex].category = category;
  if (image !== undefined) products[productIndex].image = image;
  if (stock !== undefined) products[productIndex].stock = parseInt(stock);

  res.json(products[productIndex]);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The product ID.
 *     responses:
 *       200:
 *         description: Deletion successful.
 *       404:
 *         description: Product not found.
 */
app.delete('/api/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const productIndex = products.findIndex(p => p.id === productId);

  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const deletedProduct = products.splice(productIndex, 1)[0];
  res.json({ success: true, product: deletedProduct });
});

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get current authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 username:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 canCheckout:
 *                   type: boolean
 *                 role:
 *                   type: string
 *       401:
 *         description: Not authenticated.
 */
app.get('/api/user/profile', requireAuth, (req, res) => {
  const user = req.user;

  // Determine role from Keycloak roles
  const role = user.roles.includes('admin') ? 'admin' : 'user';

  res.json({
    id: user.id,
    email: user.email,
    username: user.username || user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    canCheckout: user.canCheckout,
    role: role,
    roles: user.roles
  });
});

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get the current user's cart
 *     responses:
 *       200:
 *         description: The user's cart.
 */
app.get('/api/cart', (req, res) => {
  const sessionId = req.session.id;
  const cart = carts[sessionId] || [];
  res.json(cart);
});

/**
 * @swagger
 * /api/cart:
 *   post:
 *     summary: Add an item to the cart
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Item added successfully.
 *       404:
 *         description: Product not found.
 */
app.post('/api/cart', (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const sessionId = req.session.id;

  const product = products.find(p => p.id === parseInt(productId));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (!carts[sessionId]) {
    carts[sessionId] = [];
  }

  const existingItem = carts[sessionId].find(item => item.productId === parseInt(productId));

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    carts[sessionId].push({
      productId: parseInt(productId),
      quantity,
      product
    });
  }

  res.json({ success: true, cart: carts[sessionId] });
});

/**
 * @swagger
 * /api/cart/{productId}:
 *   put:
 *     summary: Update cart item quantity
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Quantity updated.
 *       404:
 *         description: Cart or item not found.
 */
app.put('/api/cart/:productId', (req, res) => {
  const { quantity } = req.body;
  const sessionId = req.session.id;
  const productId = parseInt(req.params.productId);

  if (!carts[sessionId]) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  const item = carts[sessionId].find(item => item.productId === productId);

  if (item) {
    if (quantity <= 0) {
      carts[sessionId] = carts[sessionId].filter(item => item.productId !== productId);
    } else {
      item.quantity = quantity;
    }
    res.json({ success: true, cart: carts[sessionId] });
  } else {
    res.status(404).json({ error: 'Item not found in cart' });
  }
});

/**
 * @swagger
 * /api/cart/{productId}:
 *   delete:
 *     summary: Remove an item from the cart
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Item removed.
 *       404:
 *         description: Cart not found.
 */
app.delete('/api/cart/:productId', (req, res) => {
  const sessionId = req.session.id;
  const productId = parseInt(req.params.productId);

  if (!carts[sessionId]) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  carts[sessionId] = carts[sessionId].filter(item => item.productId !== productId);
  res.json({ success: true, cart: carts[sessionId] });
});

/**
 * @swagger
 * /api/checkout:
 *   post:
 *     summary: Process checkout
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Checkout'
 *     responses:
 *       200:
 *         description: Checkout successful.
 *       400:
 *         description: Cart is empty or missing fields.
 *       401:
 *         description: User not logged in.
 *       403:
 *         description: User not authorized to checkout.
 */
app.post('/api/checkout', requireAuth, async (req, res) => {
  const sessionId = req.session.id;
  const cart = carts[sessionId];

  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const user = req.user;

  // Check if user is authorized to checkout (from Keycloak canCheckout attribute)
  if (!user.canCheckout) {
    return res.status(403).json({ error: 'You are not authorized to checkout.' });
  }

  const { shippingAddress, paymentMethod } = req.body;

  if (!shippingAddress || !paymentMethod) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Calculate total
  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Start database transaction
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert order into database
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, user_email, user_name, total, shipping_address, payment_method, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [
        user.id,
        user.email,
        user.name,
        total,
        JSON.stringify(shippingAddress),
        paymentMethod,
        'pending'
      ]
    );

    const orderId = orderResult.rows[0].id;
    const createdAt = orderResult.rows[0].created_at;

    // Insert order items
    for (const item of cart) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.productId, item.product.name, item.quantity, item.product.price]
      );
    }

    await client.query('COMMIT');

    console.log(`Order ${orderId} saved to database`);

    // Clear cart
    delete carts[sessionId];

    // Prepare order object
    const order = {
      id: orderId,
      userId: user.id,
      items: cart.map(item => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      })),
      total,
      shippingAddress,
      paymentMethod,
      status: 'pending',
      createdAt: createdAt.toISOString()
    };

    // Send notification to notification service using service token (M2M)
    try {
      const token = await getServiceToken();

      await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/order`, {
        orderId: order.id,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        total: order.total,
        items: order.items,
        timestamp: order.createdAt
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      });

      console.log(`Notification sent for order #${order.id}`);
    } catch (error) {
      // Log the error but don't fail the checkout
      console.error('Failed to send notification:', error.message);
      // Checkout continues successfully even if notification fails
    }

    res.json({ success: true, order });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Checkout failed:', error);
    res.status(500).json({ error: 'Checkout failed', details: error.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get user's orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of the user's orders.
 *       401:
 *         description: Not authenticated.
 */
app.get('/api/orders', requireAuth, async (req, res) => {
  const user = req.user;

  try {
    const result = await pool.query(
      `SELECT
        o.id, o.user_id, o.total, o.shipping_address, o.payment_method, o.status, o.created_at,
        json_agg(json_build_object(
          'productId', oi.product_id,
          'productName', oi.product_name,
          'quantity', oi.quantity,
          'price', oi.price
        )) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC`,
      [user.id]
    );

    const orders = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      total: parseFloat(row.total),
      shippingAddress: row.shipping_address,
      paymentMethod: row.payment_method,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      items: row.items
    }));

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get a single order by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The order details.
 *       403:
 *         description: Unauthorized.
 *       404:
 *         description: Order not found.
 */
app.get('/api/orders/:id', requireAuth, async (req, res) => {
  const user = req.user;
  const orderId = parseInt(req.params.id);

  try {
    const result = await pool.query(
      `SELECT
        o.id, o.user_id, o.total, o.shipping_address, o.payment_method, o.status, o.created_at,
        json_agg(json_build_object(
          'productId', oi.product_id,
          'productName', oi.product_name,
          'quantity', oi.quantity,
          'price', oi.price
        )) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    // Check if the order belongs to the user
    if (order.user_id !== user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      id: order.id,
      userId: order.user_id,
      total: parseFloat(order.total),
      shippingAddress: order.shipping_address,
      paymentMethod: order.payment_method,
      status: order.status,
      createdAt: order.created_at.toISOString(),
      items: order.items
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ============================================
// HTML ROUTES
// ============================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

app.get('/orders', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'orders.html'));
});

app.get('/admin/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-products.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\nTechStore API running on http://localhost:${PORT}`);
  console.log(`\nAuthentication: Keycloak (realm: techstore)`);
  console.log(`  - Keycloak URL: ${process.env.KEYCLOAK_URL || 'http://keycloak:8080'}`);
  console.log(`\nTest credentials:`);
  console.log(`  - admin@techstore.com / admin123 (Admin)`);
  console.log(`  - mario.rossi@example.com / mario123 (User)`);
  console.log(`  - blocked@example.com / blocked123 (Blocked User)`);
  console.log(`\nAPI docs available at http://localhost:${PORT}/api-docs`);
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         category:
 *           type: string
 *         price:
 *           type: number
 *         stock:
 *           type: integer
 *         image:
 *           type: string
 *         description:
 *           type: string
 *     NewProduct:
 *       type: object
 *       required: [name, price, category]
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         category:
 *           type: string
 *         image:
 *           type: string
 *         stock:
 *           type: integer
 *     UpdateProduct:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         category:
 *           type: string
 *         image:
 *           type: string
 *         stock:
 *           type: integer
 *     Checkout:
 *       type: object
 *       required: [shippingAddress, paymentMethod]
 *       properties:
 *         shippingAddress:
 *           type: object
 *           properties:
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             address:
 *               type: string
 *             city:
 *               type: string
 *             zipCode:
 *               type: string
 *             phone:
 *               type: string
 *         paymentMethod:
 *           type: string
 *           enum: [credit-card, paypal, bank-transfer]
 */
