# 🔐 Secret Key Setup Guide

This guide explains how to use secret keys to hide your admin password in the Hangman game.

## 🚀 Quick Start

### Option 1: Use the Setup Script (Recommended)
```bash
node setup-admin.js
```

### Option 2: Manual Setup
1. Edit `config/admin-config.js`
2. Change `SECRET_KEY` and `PASSWORD` values
3. Save the file

## 🔑 How Secret Keys Work

Instead of just a password, the admin system now requires:
- **Password**: Your admin password
- **Secret Key**: A separate secret key for additional security

Both must be correct to access the admin panel.

## 📁 File Structure

```
Hangman/
├── config/
│   └── admin-config.js          # Configuration file (recommended)
├── secrets/
│   └── admin-secrets.js         # Secrets file (more secure)
├── scripts/
│   └── app.js                   # Main application
├── setup-admin.js              # Setup script
└── .gitignore                  # Protects secret files
```

## 🛡️ Security Methods

### Method 1: Configuration File
- **File**: `config/admin-config.js`
- **Security**: Medium
- **Use case**: Development and testing

### Method 2: Secrets File
- **File**: `secrets/admin-secrets.js`
- **Security**: High
- **Use case**: Production (not committed to git)

### Method 3: Environment Variables
- **File**: `.env`
- **Security**: High
- **Use case**: Production with environment management

## 🔧 Configuration

### Using Configuration File
1. Edit `config/admin-config.js`:
```javascript
const ADMIN_CONFIG = {
    SECRET_KEY: 'your_secret_key_here',
    PASSWORD: 'your_admin_password_here',
};
```

2. Ensure it's loaded in `index.html`:
```html
<script src="config/admin-config.js"></script>
```

### Using Secrets File
1. Edit `secrets/admin-secrets.js`:
```javascript
const ADMIN_SECRETS = {
    SECRET_KEY: 'your_ultra_secure_secret_key_here',
    PASSWORD: 'your_admin_password_here',
};
```

2. Uncomment in `index.html`:
```html
<script src="secrets/admin-secrets.js"></script>
```

3. Comment out config file:
```html
<!-- <script src="config/admin-config.js"></script> -->
```

## 🧪 Testing

1. **Open** your Hangman game
2. **Click** the ⚙️ button (admin access)
3. **Enter** both password and secret key
4. **Verify** admin panel loads correctly

## 🔒 Security Best Practices

- **Use strong secret keys** (32+ characters)
- **Use different credentials** for different environments
- **Regularly rotate** your credentials
- **Keep secret files** out of version control
- **Use HTTPS** in production
- **Monitor** admin access logs

## 🆘 Troubleshooting

### "Invalid credentials" error
- Check both password and secret key are correct
- Ensure they match exactly (case-sensitive)
- Verify the configuration file is loaded

### "Configuration not loaded" error
- Check file paths in `index.html`
- Ensure script files exist
- Check browser console for errors

### Admin panel not showing
- Verify you're using the correct credentials
- Check if the configuration file is properly loaded
- Try refreshing the page

## 🔄 Switching Between Methods

### From Config to Secrets
1. Uncomment secrets script in `index.html`
2. Comment out config script
3. Update credentials in `secrets/admin-secrets.js`

### From Secrets to Config
1. Comment out secrets script in `index.html`
2. Uncomment config script
3. Update credentials in `config/admin-config.js`

## 📝 Example Credentials

### Development
- **Password**: `dev_admin_2024`
- **Secret Key**: `dev_secret_key_12345`

### Production
- **Password**: `prod_admin_ultra_secure_2024`
- **Secret Key**: `prod_secret_key_xyz789_ultra_secure_32_chars`

## 🎯 Benefits

- **Enhanced Security**: Dual authentication
- **Flexible Configuration**: Multiple methods
- **Easy Management**: Simple setup and changes
- **Version Control Safe**: Secret files are git-ignored
- **Environment Specific**: Different credentials per environment
