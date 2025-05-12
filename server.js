require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const knex = require('knex');

const app = express();
const port = process.env.PORT || 3000;

// ✅ Updated CORS to allow 'null' origin for local file testing
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin === 'null') {
      callback(null, true);
    } else {
      callback(null, true); // You can restrict this in production
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Initialize Knex with PostgreSQL
const db = knex({
  client: 'pg',
  connection: {
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: process.env.PG_PORT,
  },
});

// JWT utility
const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
};

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Sign up
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db('users').insert({ email, password: hashedPassword });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Signup failed' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db('users').where({ email }).first();
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Get all products
app.get('/products', authenticateToken, async (req, res) => {
  try {
    const products = await db('products').select();
    res.json(products);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).send(err);
  }
});

// Get product by ID
app.get('/products/:id', authenticateToken, async (req, res) => {
  try {
    const product = await db('products').where({ productId: req.params.id }).first();
    if (!product) return res.status(404).send('Product not found');
    res.json(product);
  } catch (err) {
    console.error('Get product by ID error:', err);
    res.status(500).send(err);
  }
});

// Create product
app.post('/products', authenticateToken, async (req, res) => {
  const { productName, description, quantity, price } = req.body;

  try {
    const [product] = await db('products')
      .insert({ productName, description, quantity, price })
      .returning('*');
    res.status(201).json(product);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).send(err);
  }
});

// Update product
app.put('/products/:id', authenticateToken, async (req, res) => {
  const { productName, description, quantity, price } = req.body;

  try {
    const updated = await db('products')
      .where({ productId: req.params.id })
      .update({ productName, description, quantity, price });

    if (!updated) return res.status(404).send('Product not found');
    res.send('Product updated successfully');
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).send(err);
  }
});

// Delete product
app.delete('/products/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await db('products').where({ productId: req.params.id }).del();
    if (!deleted) return res.status(404).send('Product not found');
    res.send('Product deleted successfully');
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).send(err);
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('✅ API is running');
});

// Run migrations and start server
db.migrate.latest()
  .then(() => {
    console.log('✅ Database migrated');
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`🌐 Live at: https://work-b42l.onrender.com/`);
      } else {
        console.log(`🔧 Local: http://localhost:${port}`);
      }
    });
  })
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
