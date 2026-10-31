
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const dotenv = require('dotenv');
const applicationRoutes = require('./routes/applications');
const leaseRoutes = require('./routes/leases');
const billingRoutes = require('./routes/billing');
const maintenanceRoutes = require('./routes/maintenance');
const adminOverviewRoutes = require('./routes/adminOverview');
const { auditCapture, auditRouter } = require('./routes/audit');
const depositRoutes = require('./routes/deposits');
const depositSettlementRoutes =
  require('./routes/depositSettlements');
dotenv.config();

const pool = require('./db');

// Import authentication and property routes
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json({ limit: '3mb' })); // Profile images: max 2 MB binary (~2.8 MB base64)
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    name: 'rentease.sid',
    secret: process.env.SESSION_SECRET || 'rentease-development-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Basic route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'RentEase backend is running!'
    });
});

// Database health check
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT current_database() AS database'
        );

        res.status(200).json({
            success: true,
            message: 'Database connected successfully!',
            database: result.rows[0].database
        });
    } catch (error) {
        console.error(
            'Database health check failed:',
            error.message
        );

        res.status(500).json({
            success: false,
            message: 'Database connection failed.'
        });
    }
});

// Authentication and Admin routes
app.use('/api', auditCapture);
app.use('/api', authRoutes);

// Property and unit management routes
app.use('/api', propertyRoutes);
app.use('/api', applicationRoutes);
app.use('/api', leaseRoutes);
app.use('/api', billingRoutes);
app.use('/api', depositRoutes);
app.use('/api', depositSettlementRoutes);
app.use('/api', maintenanceRoutes);
app.use('/api', adminOverviewRoutes);
app.use('/api', auditRouter);

// Handle unknown API routes
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found.'
    });
});

// General error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);

    res.status(500).json({
        success: false,
        message: 'An internal server error occurred.'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(
        `RentEase backend running on port ${PORT}`
    );
});
