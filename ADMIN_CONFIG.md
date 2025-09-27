# 🔐 Admin Configuration with Secret Keys

## 🔑 Secret Key Authentication

The admin system now uses **dual authentication** requiring both a password and a secret key for enhanced security.

### Default Credentials
- **Password**: `hangman_admin_2024`
- **Secret Key**: `hangman_secret_2024`

## 🛡️ Security Methods

### Method 1: Configuration File (Recommended)
**File**: `config/admin-config.js`

```javascript
const ADMIN_CONFIG = {
    SECRET_KEY: 'your_secret_key_here',
    PASSWORD: 'your_admin_password_here',
    // ... other settings
};
```

### Method 2: Secrets File (Most Secure)
**File**: `secrets/admin-secrets.js`

```javascript
const ADMIN_SECRETS = {
    SECRET_KEY: 'your_ultra_secure_secret_key_here',
    PASSWORD: 'your_admin_password_here',
    // ... additional security features
};
```

### Method 3: Environment Variables
**File**: `.env` (not committed to git)

```bash
ADMIN_SECRET_KEY=your_secret_key_here
ADMIN_PASSWORD=your_admin_password_here
```

## 🔧 How to Configure

### Option A: Use Configuration File
1. **Edit** `config/admin-config.js`
2. **Change** `SECRET_KEY` and `PASSWORD` values
3. **Save** the file
4. **Ensure** `config/admin-config.js` is loaded in `index.html`

### Option B: Use Secrets File (More Secure)
1. **Edit** `secrets/admin-secrets.js`
2. **Change** `SECRET_KEY` and `PASSWORD` values
3. **Uncomment** the secrets script in `index.html`
4. **Comment out** the config script
5. **Add** `secrets/` to `.gitignore`

### Option C: Environment Variables
1. **Create** `.env` file
2. **Add** your credentials
3. **Update** validation logic to read from environment

## 🚀 How It Works

1. **Click "Admin Panel"** (⚙️ button or Ctrl+Shift+A)
2. **Enter both** password and secret key
3. **Access admin functions** for that session
4. **Click "Logout Admin"** to end session
5. **Refresh page** to completely reset admin status

## 🔒 Security Features

- ✅ **Dual authentication** (password + secret key)
- ✅ **Multiple configuration methods**
- ✅ **Session-based** (resets on page refresh)
- ✅ **No persistent storage** of credentials
- ✅ **Easy to change** credentials anytime
- ✅ **Git-ignored** secret files
- ✅ **Fallback** to hardcoded values

## ⚠️ Important Security Notes

- **Keep credentials secure** - don't share them
- **Change default values** before making public
- **Use strong secret keys** (32+ characters recommended)
- **Add secret files to .gitignore**
- **Regularly rotate** credentials
- **Use different credentials** for different environments

## 🧪 Testing

1. **Test admin access**: Enter correct password + secret key
2. **Test wrong credentials**: Should be denied
3. **Test partial credentials**: Should be denied
4. **Test logout**: Should return to lobby
5. **Test refresh**: Should require credentials again

## 🔄 Switching Between Methods

### To use Secrets File instead of Config File:
1. **Uncomment** in `index.html`:
   ```html
   <script src="secrets/admin-secrets.js"></script>
   ```
2. **Comment out**:
   ```html
   <!-- <script src="config/admin-config.js"></script> -->
   ```

### To use Environment Variables:
1. **Create** `.env` file with your credentials
2. **Update** `validateAdminCredentials()` method to read from environment
3. **Load** environment variables in your application

## 🆘 Troubleshooting

- **"Invalid credentials"**: Check both password and secret key
- **"Configuration not loaded"**: Ensure script files are loaded in correct order
- **"Access denied"**: Verify credentials match exactly (case-sensitive)
- **"File not found"**: Check file paths and ensure files exist
