# 🔐 Admin Configuration

## Current Admin Password
**Default Password**: `hangman_admin_2024`

## How to Change Admin Password

1. **Open** `scripts/app.js`
2. **Find line 1042** (around the admin password section)
3. **Replace** `'hangman_admin_2024'` with your new password
4. **Save** the file

### Example:
```javascript
// Change this line:
const adminPassword = 'hangman_admin_2024'; // CHANGE THIS PASSWORD!

// To your new password:
const adminPassword = 'your_secure_password_here';
```

## 🔒 Security Features

- ✅ **Password-based admin access** (no UID dependency)
- ✅ **Session-based** (admin status resets on page refresh)
- ✅ **No persistent storage** of admin credentials
- ✅ **Easy to change** password anytime

## 🚀 How It Works

1. **Click "Admin Panel"** in the lobby
2. **Enter password** when prompted
3. **Access admin functions** for that session
4. **Click "Logout Admin"** to end admin session
5. **Refresh page** to completely reset admin status

## ⚠️ Important Notes

- **Keep your password secure** - don't share it
- **Change the default password** before making public
- **Admin status is temporary** - resets on page refresh
- **No database storage** of admin credentials

## 🧪 Testing

1. **Test admin access**: Enter correct password
2. **Test wrong password**: Should be denied
3. **Test logout**: Should return to lobby
4. **Test refresh**: Should require password again
