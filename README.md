# LookMatch 🎯

**Find the exact clothes from any photo using AI-powered image analysis.**

## 🏗️ Project Structure

```
lookmatch/
├── 📁 api/                 # Backend API server
│   ├── src/               # TypeScript source code
│   ├── package.json       # API dependencies
│   └── tsconfig.json      # API TypeScript config
├── 📁 web/                # Frontend Next.js app
│   ├── src/               # React components & pages
│   ├── package.json       # Web dependencies
│   └── tsconfig.json      # Web TypeScript config
├── 📁 docs/               # Documentation & guides
├── 📁 scripts/            # Build & deployment scripts
└── README.md              # This file
```

## 🚀 Quick Start

### 1. Start the Backend API
```bash
cd api
npm install
npm run dev
# API runs on http://localhost:4000
```

### 2. Start the Frontend
```bash
cd web
npm install
npm run dev
# Web app runs on http://localhost:3000
```

### 3. Test the App
- Open http://localhost:3000
- Upload a clothing photo
- See AI analysis results

## 🔧 Prerequisites

- **Node.js 18+**
- **Google Cloud Vision API** with billing enabled
- **Google credentials** in `api/google-credentials.json`

## 📱 Features

- **AI Image Analysis** - Google Vision API integration
- **Modern UI** - Built with Next.js 15 + Tailwind CSS
- **Responsive Design** - Works on all devices
- **Real-time Processing** - Instant image analysis results

## 🛠️ Tech Stack

**Backend:**
- Express.js + TypeScript
- Google Cloud Vision API
- Multer for file uploads
- CORS enabled

**Frontend:**
- Next.js 15 + React 19
- Tailwind CSS 4
- shadcn/ui components
- TypeScript

## 📁 Directory Details

### `/api` - Backend Server
- **`src/index.ts`** - Main API server
- **`google-credentials.json`** - Google Cloud credentials
- **`package.json`** - Backend dependencies

### `/web` - Frontend Application
- **`src/app/`** - Next.js app router pages
- **`src/components/`** - Reusable React components
- **`src/lib/`** - Utility functions
- **`.env.local`** - Environment variables

## 🔑 Environment Variables

**Web App (`.env.local`):**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 🚀 Development Commands

```bash
# Backend
cd api
npm run dev      # Start dev server
npm run build    # Build for production
npm start        # Start production server

# Frontend
cd web
npm run dev      # Start dev server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## 📚 API Endpoints

- **`GET /health`** - API health check
- **`POST /analyze`** - Analyze uploaded image

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

ISC License

---

**Built with ❤️ using Next.js, Express, and Google Vision API**
