
### Firebase Setup
The game uses Firebase for:
- **Real-time database**: Game state synchronization
- **Anonymous authentication**: User identification
- **Security rules**: Data protection

## 🔒 Security Features

- **Anonymous authentication**: No personal data required
- **Database rules**: Secure read/write permissions
- **Admin protection**: Dual authentication (password + secret key)
- **Auto-cleanup**: Prevents database bloat
- **Rate limiting**: Prevents abuse

## 🌙 Dark Mode

Toggle between light and dark themes:
- **Click the theme button** in the top-right corner
- **Keyboard shortcut**: `Ctrl+Shift+D`
- **Persistent**: Your preference is saved locally

## 📱 Mobile Support

Fully responsive design that works on:
- 📱 Smartphones
- 📱 Tablets
- 💻 Laptops
- 🖥️ Desktop computers

## 🎨 Customization

### Styling
Edit `styles/main.css` to customize:
- Colors and themes
- Fonts and typography
- Animations and transitions

### Game Logic
Modify `scripts/app.js` to:
- Add new word categories
- Change game rules
- Add new features

### Admin Features
Customize admin functionality in:
- `config/admin-config.js` - Basic configuration
- `secrets/admin-secrets.js` - Secure settings

## 🐛 Troubleshooting

### Common Issues

**Game won't load**
- Check internet connection
- Ensure Firebase is properly configured
- Check browser console for errors

**Can't join multiplayer games**
- Verify Game ID is correct
- Check if game is still active
- Try refreshing the page

**Admin panel not working**
- Verify credentials are correct
- Check if secret files are loaded
- Ensure proper file permissions

### Getting Help
1. Check the browser console for error messages
2. Verify all files are in the correct locations
3. Ensure Firebase configuration is correct
4. Check network connectivity

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Deploy automatically on every push
3. Custom domain support available

### Other Platforms
- **Netlify**: Drag and drop deployment
- **GitHub Pages**: Free hosting for static sites
- **Firebase Hosting**: Integrated with your database

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **Tailwind CSS** for the beautiful styling framework
- **Firebase** for real-time database functionality
- **Vercel** for analytics and deployment
- **Open source community** for inspiration and tools

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Review the browser console for errors
3. Ensure all dependencies are properly loaded
4. Verify Firebase configuration

---

**Enjoy playing Hangman! 🎮**

*Built with ❤️ using vanilla JavaScript and modern web technologies.*
