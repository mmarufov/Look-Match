# LookMatch - AI-Powered Fashion Discovery Platform

## 🚀 What's New (Latest Update)

### ✨ **Fixed Color Detection & Product Naming**
- **Smart Color Detection**: Now correctly identifies shirt colors instead of picking up colors from other clothing items
- **Context-Aware AI**: Uses intelligent scoring to prioritize colors from shirts over pants/trousers
- **Clean Product Names**: Generates professional product descriptions like "Hugo Boss White T-Shirt"

### 📱 **Mobile-First Design**
- **iPhone 16/16 Pro Max Optimized**: Perfect display on modern mobile devices
- **Responsive Breakpoints**: Custom Tailwind CSS breakpoints for all device sizes
- **Touch-Optimized**: Large touch targets and mobile-specific interactions
- **Safe Area Support**: Proper handling of notches and dynamic islands

### 🎯 **Enhanced Store Integration**
- **Minimalistic Display**: Clean store listings without verbose search information
- **Smart Action Buttons**: "Buy Now" for official stores, "Shop Now" for others
- **Accurate Search Links**: Store-specific URLs that lead to actual products

## 🏗️ Project Structure

```
lookmatch/
├── web/                 # Next.js Frontend (Port 3000)
│   ├── src/
│   │   ├── app/        # App Router pages
│   │   ├── components/ # React components
│   │   └── lib/        # Utility functions
│   ├── tailwind.config.js
│   └── package.json
├── api/                 # Node.js Backend (Port 5000)
│   ├── src/
│   │   └── index.ts    # Express server + Google Vision API
│   └── package.json
├── scripts/
│   └── start-all.sh    # Start both servers
└── README.md
```

## 🚀 Quick Start

### Option 1: Use the Start Script (Recommended)
```bash
./scripts/start-all.sh
```

### Option 2: Manual Start
```bash
# Terminal 1 - Frontend
cd web
npm run dev

# Terminal 2 - Backend  
cd api
npm start
```

## 🌐 Access Your App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 📱 Test Mobile Responsiveness

1. **Open Chrome DevTools** (F12)
2. **Toggle Device Toolbar** (Ctrl+Shift+M)
3. **Select iPhone 16 Pro Max** from device dropdown
4. **Test the upload functionality** with your white Hugo Boss shirt photo

## 🔧 Key Features Fixed

### 1. **Color Detection Logic**
```typescript
// Before: Picked up wrong colors
"Hugo Boss Black T-Shirt" // ❌ Wrong color

// After: Smart context-aware detection  
"Hugo Boss White T-Shirt" // ✅ Correct color
```

### 2. **Mobile Responsiveness**
- Custom breakpoints: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `iphone-16-pro-max`
- Mobile-first CSS classes: `.btn-mobile`, `.input-mobile`, `.card-mobile`
- Touch-optimized interactions and safe area handling

### 3. **Store Display**
- Removed verbose "Searching for:" text
- Clean action buttons: "Buy Now" / "Shop Now"
- Fixed store link accuracy for better product discovery

## 🛠️ Development

### Frontend Dependencies
```bash
cd web
npm install
npm run dev
```

### Backend Dependencies
```bash
cd api
npm install
npm start
```

### Environment Variables
Create `.env.local` in the `web/` folder:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## 📊 API Endpoints

- `POST /api/analyze` - Image analysis with Google Vision API
- `GET /api/health` - Health check endpoint

## 🎨 Customization

### Adding New Colors
Edit `web/src/components/upload-analyze.tsx`:
```typescript
const allColors = [
  'white', 'black', 'blue', 'red', 'green',
  'yellow', 'pink', 'purple', 'orange', 'brown',
  'gray', 'grey', 'navy', 'beige', 'cream',
  'tan', 'maroon'
  // Add your custom colors here
];
```

### Adding New Brands
```typescript
const brandTerms = uniqueTags.filter(tag => 
  tag.includes('boss') || tag.includes('hugo') ||
  tag.includes('burberry') || tag.includes('gucci') ||
  // Add your brand keywords here
);
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
```

### Dependencies Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Git Issues
```bash
# The web/ folder has its own git repo
cd web
git status
git add .
git commit -m "Your commit message"
```

## 📈 Performance

- **Frontend**: Optimized with Next.js 15, React 19, Tailwind CSS
- **Backend**: Node.js with Express and Google Cloud Vision API
- **Mobile**: Touch-optimized with 60fps animations and smooth interactions

## 🔮 Future Enhancements

- [ ] Multi-language support
- [ ] Advanced filtering options
- [ ] User accounts and favorites
- [ ] Social sharing features
- [ ] Mobile app (React Native)

## 📞 Support

- **Email**: hello@lookmatch.com
- **Documentation**: Check the `/docs` folder
- **Issues**: Create a GitHub issue or contact the development team

---

**Built with ❤️ using Next.js, React, Node.js, and Google Cloud Vision API**
