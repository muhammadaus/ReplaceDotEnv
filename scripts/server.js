const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const localtunnel = require('localtunnel');

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

// Catch-all route for serving index.html
app.get('*', (req, res) => {
    console.log('Fallback: serving index.html');
    res.set('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = 3000;

// Start server and create tunnel with retry logic
async function startServer(retries = 3) {
    return new Promise(async (resolve, reject) => {
        try {
            // Start local server
            const server = app.listen(PORT, '0.0.0.0', () => {
                console.log(`Local server running at http://localhost:${PORT}`);
            });

            // Try to create tunnel with retries
            let tunnel;
            let attempt = 0;
            
            while (attempt < retries) {
                try {
                    console.log(`Attempting to create tunnel (attempt ${attempt + 1}/${retries})`);
                    tunnel = await localtunnel({ 
                        port: PORT,
                        subdomain: `deploy-${Math.random().toString(36).substring(2, 8)}`
                    });
                    
                    tunnel.on('close', () => {
                        console.log('Tunnel closed');
                    });

                    tunnel.on('error', (err) => {
                        console.log('Tunnel error:', err);
                    });

                    console.log('Tunnel created successfully at:', tunnel.url);
                    
                    // Verify the tunnel works
                    console.log('Verifying tunnel connection...');
                    const testUrl = `${tunnel.url}/`;
                    console.log('Test URL:', testUrl);

                    return resolve(tunnel.url);
                } catch (err) {
                    attempt++;
                    console.log(`Tunnel attempt ${attempt} failed:`, err.message);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            reject(new Error('Failed to create tunnel after multiple attempts'));
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { startServer, setTransaction: (tx) => { 
    console.log('Setting transaction data:', tx);
    transactionData = tx; 
}}; 