const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const certsDir = path.join(__dirname, '../certs');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir);
}

// Generate self-signed certificate
const command = `openssl req -x509 -newkey rsa:4096 -keyout ${path.join(certsDir, 'key.pem')} -out ${path.join(certsDir, 'cert.pem')} -days 365 -nodes -subj "/CN=localhost"`;

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error('Error generating certificates:', error);
        return;
    }
    console.log('Certificates generated successfully in certs directory');
}); 