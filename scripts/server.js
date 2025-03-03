const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ip = require('ip');
const http = require('http');
const https = require('https');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

// Get local IP address and hostname
const localIP = ip.address();
const hostname = os.hostname();

// Define base paths for different access types
const DEV_PATH = '/dev-wallet';
const SECURE_PATH = '/secure-wallet';

// Read mkcert certificates
const certPath = path.join(__dirname, '../certs');
console.log('Looking for certificates in:', certPath);
console.log('Available files:', fs.readdirSync(certPath));

// Verify certificate files exist
const keyPath = path.join(certPath, 'key.pem');
const certFilePath = path.join(certPath, 'cert.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certFilePath)) {
    console.error('\nCertificate files not found!');
    console.log('\nPlease run these commands to create new certificates:');
    console.log('mkdir -p certs');
    console.log(`mkcert -key-file ./certs/key.pem -cert-file ./certs/cert.pem "${hostname}" localhost 127.0.0.1 ${localIP}`);
    console.log('\nThen install the root certificate on your phone.');
    process.exit(1);
}

const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certFilePath)
};

// Store transaction data globally
let transactionData = null;

// Log all requests with more detail
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// Serve index.html for the root routes
app.get([DEV_PATH, SECURE_PATH, '/'], (req, res) => {
    console.log('Serving index.html for path:', req.path);
    const indexPath = path.join(__dirname, '../public/index.html');
    console.log('Index.html path:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(indexPath);
});

// API endpoints with base paths
app.get([`${DEV_PATH}/transaction`, `${SECURE_PATH}/transaction`], (req, res) => {
    console.log('Transaction data requested:', transactionData ? 'Available' : 'Not available');
    if (transactionData) {
        res.json(transactionData);
    } else {
        res.status(404).json({ error: 'No transaction available' });
    }
});

app.post([`${DEV_PATH}/signed`, `${SECURE_PATH}/signed`], (req, res) => {
    console.log('Received signed transaction');
    const signedTx = req.body;
    fs.writeFileSync('signed-transaction.json', JSON.stringify(signedTx));
    res.json({ success: true });
});

app.get([`${DEV_PATH}/qr`, `${SECURE_PATH}/qr`], (req, res) => {
    const qrPath = path.join(__dirname, '../public/server-qr.png');
    if (fs.existsSync(qrPath)) {
        res.sendFile(qrPath);
    } else {
        res.status(404).send('QR code not found');
    }
});

// Serve static files under both paths
app.use(DEV_PATH, express.static(path.join(__dirname, '../public')));
app.use(SECURE_PATH, express.static(path.join(__dirname, '../public')));

// Catch-all route for both paths
app.get([`${DEV_PATH}/*`, `${SECURE_PATH}/*`], (req, res) => {
    console.log('Fallback: serving index.html');
    res.set('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const DEVELOPMENT_PORT = 3000;
const WALLET_PORT = 3001;

async function startServer() {
    return new Promise((resolve, reject) => {
        try {
            // Start HTTP server for local development
            const httpServer = http.createServer(app);
            httpServer.listen(DEVELOPMENT_PORT, '0.0.0.0', () => {
                console.log('\n=== Development Server ===');
                console.log(`Local access:     http://localhost:${DEVELOPMENT_PORT}${DEV_PATH}`);
                console.log(`Network access:   http://${localIP}:${DEVELOPMENT_PORT}${DEV_PATH}`);
                console.log(`Hostname access:  http://${hostname}:${DEVELOPMENT_PORT}${DEV_PATH}`);
            });

            // Start HTTPS server with mkcert certificates
            const httpsServer = https.createServer(httpsOptions, app);
            httpsServer.listen(WALLET_PORT, '0.0.0.0', () => {
                console.log('\n=== Wallet Server (HTTPS) ===');
                console.log(`Secure IP access:      https://${localIP}:${WALLET_PORT}${SECURE_PATH}`);
                console.log(`Secure hostname:       https://${hostname}:${WALLET_PORT}${SECURE_PATH}`);
                console.log('\nTry these steps if you still see security warnings:');
                console.log('1. Use the hostname URL instead of IP address');
                console.log('2. Make sure the mkcert root certificate is installed on your phone');
                console.log('3. The certificate should match one of these names:');
                console.log(`   - ${hostname}`);
                console.log('   - localhost');
                console.log(`   - ${localIP}`);
                resolve(`https://${hostname}:${WALLET_PORT}${SECURE_PATH}`);
            });
        } catch (error) {
            console.error('Server startup error:', error);
            reject(error);
        }
    });
}

module.exports = { startServer, setTransaction: (tx) => { 
    console.log('Setting transaction data:', tx);
    transactionData = tx; 
}}; 