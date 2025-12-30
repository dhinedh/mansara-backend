const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:8080', 'http://127.0.0.1:5173', 'https://mansarafoods-o9z6.vercel.app', 'https://mansarafoods-o9z6.vercel.app/', process.env.FRONTEND_URL].filter(url => url && url !== 'undefined'),
    credentials: true
}));
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/combos', require('./routes/comboRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/content', require('./routes/contentRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));

app.get('/', (req, res) => {
    res.send('Mansara Nourish Hub API is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS allowed for: http://localhost:5173, http://localhost:8080, ${process.env.FRONTEND_URL}`);
});
