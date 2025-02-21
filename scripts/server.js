const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ip = require('ip'); // We'll use this to get local IP

const app = express();
app.use(cors());
app.use(express.json());

// Store transaction data globally
let transactionData = null;

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve index.html for the root route specifically
app.get('/', (req, res) => {
    console.log('Serving index.html for root path');
    const indexPath = path.join(__dirname, '../public/index.html');
    console.log('Index.html path:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(indexPath);
});

// Serve static files with explicit content types
app.use(express.static(path.join(__dirname, '../public'), {
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.html')) {
            res.set('Content-Type', 'text/html');
        }
    }
}));

// API endpoints
app.get('/transaction', (req, res) => {
    console.log('Transaction data requested:', transactionData ? 'Available' : 'Not available');
    if (transactionData) {
        res.json(transactionData);
    } else {
        res.status(404).json({ error: 'No transaction available' });
    }
});

app.post('/signed', (req, res) => {
    console.log('Received signed transaction');
    const signedTx = req.body;
    fs.writeFileSync('signed-transaction.json', JSON.stringify(signedTx));
    res.json({ success: true });
});

// Serve QR code at root for easy access
app.get('/qr', (req, res) => {
    const qrPath = path.join(__dirname, '../public/server-qr.png');
    if (fs.existsSync(qrPath)) {
        res.sendFile(qrPath);
    } else {
        res.status(404).send('QR code not found');
    }
});

// Catch-all route for serving index.html
app.get('*', (req, res) => {
    console.log('Fallback: serving index.html');
    res.set('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = 8000;

// Start server and return local URL
async function startServer() {
    return new Promise((resolve, reject) => {
        try {
            const server = app.listen(PORT, '0.0.0.0', () => {
                const localIP = ip.address();
                const url = `http://${localIP}:${PORT}`;
                console.log(`Server running at ${url}`);
                resolve(url);
            });
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { startServer, setTransaction: (tx) => { 
    console.log('Setting transaction data:', tx);
    transactionData = tx; 
}}; 