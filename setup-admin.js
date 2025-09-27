#!/usr/bin/env node

/**
 * Admin Setup Script
 * 
 * This script helps you set up admin credentials securely.
 * Run with: node setup-admin.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupAdmin() {
    console.log('🔐 Admin Setup Script');
    console.log('====================\n');
    
    console.log('This script will help you set up secure admin credentials.\n');
    
    // Get admin password
    const password = await question('Enter admin password: ');
    if (!password) {
        console.log('❌ Password is required!');
        process.exit(1);
    }
    
    // Get secret key
    const secretKey = await question('Enter secret key (32+ characters recommended): ');
    if (!secretKey || secretKey.length < 8) {
        console.log('❌ Secret key must be at least 8 characters!');
        process.exit(1);
    }
    
    // Choose method
    console.log('\nChoose configuration method:');
    console.log('1. Configuration file (config/admin-config.js)');
    console.log('2. Secrets file (secrets/admin-secrets.js) - More secure');
    console.log('3. Both files');
    
    const method = await question('Enter choice (1-3): ');
    
    try {
        // Create directories if they don't exist
        if (method === '1' || method === '3') {
            fs.mkdirSync('config', { recursive: true });
        }
        if (method === '2' || method === '3') {
            fs.mkdirSync('secrets', { recursive: true });
        }
        
        // Generate configuration files
        if (method === '1' || method === '3') {
            const configContent = `// Admin Configuration
// This file contains admin settings and should be kept secure
// DO NOT commit this file to version control

const ADMIN_CONFIG = {
    // Secret key for admin access
    SECRET_KEY: '${secretKey}',
    
    // Admin password
    PASSWORD: '${password}',
    
    // Optional: Additional security settings
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
    MAX_LOGIN_ATTEMPTS: 3,
    
    // Encryption settings (optional)
    USE_ENCRYPTION: false,
    ENCRYPTION_KEY: 'your_encryption_key_here'
};

// Simple obfuscation function (not real encryption, just makes it less obvious)
function obfuscatePassword(password, key) {
    let result = '';
    for (let i = 0; i < password.length; i++) {
        const charCode = password.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
    }
    return btoa(result); // Base64 encode
}

// Deobfuscate function
function deobfuscatePassword(obfuscated, key) {
    try {
        const decoded = atob(obfuscated);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    } catch (e) {
        return null;
    }
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = { ADMIN_CONFIG, obfuscatePassword, deobfuscatePassword };
} else {
    // Browser environment
    window.ADMIN_CONFIG = ADMIN_CONFIG;
    window.obfuscatePassword = obfuscatePassword;
    window.deobfuscatePassword = deobfuscatePassword;
}`;
            
            fs.writeFileSync('config/admin-config.js', configContent);
            console.log('✅ Created config/admin-config.js');
        }
        
        if (method === '2' || method === '3') {
            const secretsContent = `// Admin Secrets Configuration
// WARNING: This file contains sensitive information
// DO NOT commit this file to version control
// Add this file to .gitignore

const ADMIN_SECRETS = {
    // Generate a strong secret key (32+ characters recommended)
    SECRET_KEY: '${secretKey}',
    
    // Your admin password
    PASSWORD: '${password}',
    
    // Additional security tokens
    BACKUP_KEY: 'backup_admin_key_${Date.now()}',
    
    // Session security
    SESSION_SALT: 'session_salt_${Date.now()}_secure',
    
    // Rate limiting
    MAX_ATTEMPTS: 5,
    LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutes
};

// Simple hash function for additional security
function simpleHash(input) {
    let hash = 0;
    if (input.length === 0) return hash.toString();
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
}

// Generate a secure token
function generateSecureToken() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return simpleHash(timestamp + random + ADMIN_SECRETS.SECRET_KEY);
}

// Validate admin access with secret key
function validateAdminAccess(password, secretKey) {
    return password === ADMIN_SECRETS.PASSWORD && 
           secretKey === ADMIN_SECRETS.SECRET_KEY;
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ADMIN_SECRETS, 
        simpleHash, 
        generateSecureToken, 
        validateAdminAccess 
    };
} else {
    window.ADMIN_SECRETS = ADMIN_SECRETS;
    window.simpleHash = simpleHash;
    window.generateSecureToken = generateSecureToken;
    window.validateAdminAccess = validateAdminAccess;
}`;
            
            fs.writeFileSync('secrets/admin-secrets.js', secretsContent);
            console.log('✅ Created secrets/admin-secrets.js');
        }
        
        // Update .gitignore
        const gitignoreContent = `# Admin secrets and configuration files
secrets/
config/admin-config.js
.env
.env.local
.env.production

# Node modules
node_modules/

# Logs
*.log
npm-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db`;
        
        fs.writeFileSync('.gitignore', gitignoreContent);
        console.log('✅ Updated .gitignore');
        
        console.log('\n🎉 Admin setup complete!');
        console.log('\nNext steps:');
        console.log('1. Test admin access by clicking the ⚙️ button');
        console.log('2. Enter your password and secret key');
        console.log('3. If using secrets file, uncomment it in index.html');
        console.log('4. Keep your credentials secure!');
        
    } catch (error) {
        console.error('❌ Error setting up admin:', error.message);
        process.exit(1);
    }
    
    rl.close();
}

setupAdmin();
