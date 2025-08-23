# Project Structure 📁

## Overview
LookMatch is organized as a **monorepo** with clear separation between frontend and backend services.

## Directory Tree
```
lookmatch/
├── 📁 api/                          # Backend API Server
│   ├── 📁 src/                      # TypeScript source code
│   │   └── 📄 index.ts              # Main API server entry point
│   ├── 📁 node_modules/             # API dependencies (auto-generated)
│   ├── 📄 package.json              # API package configuration
│   ├── 📄 package-lock.json         # API dependency lock file
│   ├── 📄 tsconfig.json             # API TypeScript configuration
│   └── 📄 google-credentials.json   # Google Cloud service account (⚠️ SECRET)
├── 📁 web/                          # Frontend Next.js Application
│   ├── 📁 src/                      # Source code
│   │   ├── 📁 app/                  # Next.js app router
│   │   │   ├── 📄 layout.tsx        # Root layout component
│   │   │   ├── 📄 page.tsx          # Home page component
│   │   │   ├── 📄 globals.css       # Global styles
│   │   │   └── 📄 favicon.ico       # Site favicon
│   │   ├── 📁 components/           # Reusable React components
│   │   │   ├── 📁 ui/               # shadcn/ui components
│   │   │   │   ├── 📄 button.tsx    # Button component
│   │   │   │   ├── 📄 card.tsx      # Card component
│   │   │   │   ├── 📄 input.tsx     # Input component
│   │   │   │   ├── 📄 label.tsx     # Label component
│   │   │   │   ├── 📄 separator.tsx # Separator component
│   │   │   │   └── 📄 skeleton.tsx  # Loading skeleton
│   │   │   └── 📄 upload-analyze.tsx # Main image upload component
│   │   └── 📁 lib/                  # Utility functions
│   │       └── 📄 utils.ts          # Common utility functions
│   ├── 📁 public/                   # Static assets
│   │   ├── 📄 file.svg              # File icon
│   │   ├── 📄 globe.svg             # Globe icon
│   │   ├── 📄 next.svg              # Next.js logo
│   │   ├── 📄 vercel.svg            # Vercel logo
│   │   └── 📄 window.svg            # Window icon
│   ├── 📁 node_modules/             # Web dependencies (auto-generated)
│   ├── 📄 .env.local                # Environment variables (⚠️ LOCAL ONLY)
│   ├── 📄 .gitignore                # Git ignore rules
│   ├── 📄 components.json           # shadcn/ui configuration
│   ├── 📄 eslint.config.mjs         # ESLint configuration
│   ├── 📄 next-env.d.ts             # Next.js type definitions
│   ├── 📄 next.config.ts            # Next.js configuration
│   ├── 📄 package.json              # Web package configuration
│   ├── 📄 postcss.config.mjs        # PostCSS configuration
│   ├── 📄 README.md                 # Web app documentation
│   └── 📄 tsconfig.json             # Web TypeScript configuration
├── 📁 docs/                         # Project documentation
│   ├── 📄 DEVELOPMENT.md            # Development guide
│   └── 📄 PROJECT_STRUCTURE.md      # This file
├── 📁 scripts/                      # Build and utility scripts
│   └── 📄 quick-start.sh            # Automated setup script
├── 📄 .gitignore                    # Root git ignore rules
├── 📄 package.json                  # Root package configuration
└── 📄 README.md                     # Main project documentation
```

## File Purposes

### Root Level
- **`package.json`** - Monorepo configuration with workspace scripts
- **`.gitignore`** - Git ignore rules for the entire project
- **`README.md`** - Main project overview and quick start guide

### API Server (`/api`)
- **`src/index.ts`** - Express server with Google Vision API integration
- **`google-credentials.json`** - Google Cloud service account credentials
- **`tsconfig.json`** - TypeScript configuration for Node.js backend
- **`package.json`** - Backend dependencies (Express, Google Vision, etc.)

### Web Application (`/web`)
- **`src/app/`** - Next.js 15 app router pages and layouts
- **`src/components/`** - Reusable React components and UI library
- **`src/lib/`** - Utility functions and helpers
- **`.env.local`** - Environment variables (API URL, etc.)
- **`tsconfig.json`** - TypeScript configuration for Next.js frontend
- **`package.json`** - Frontend dependencies (Next.js, React, Tailwind, etc.)

### Documentation (`/docs`)
- **`DEVELOPMENT.md`** - Comprehensive development guide
- **`PROJECT_STRUCTURE.md`** - This detailed structure overview

### Scripts (`/scripts`)
- **`quick-start.sh`** - Automated setup and dependency installation

## Key Features

### 🏗️ **Monorepo Structure**
- Single repository for both frontend and backend
- Shared configuration and scripts
- Easy development workflow

### 🔧 **Development Experience**
- Hot reloading for both services
- TypeScript for type safety
- ESLint for code quality
- Concurrent development servers

### 📱 **Modern Tech Stack**
- **Backend:** Express.js + Google Vision API
- **Frontend:** Next.js 15 + React 19 + Tailwind CSS
- **UI Components:** shadcn/ui component library

### 🚀 **Easy Commands**
```bash
npm run dev          # Start both servers
npm run build        # Build both projects
npm run install:all  # Install all dependencies
```

## Security Notes

⚠️ **Never commit these files:**
- `api/google-credentials.json` - Contains sensitive API keys
- `.env.local` - Contains environment-specific configuration
- `node_modules/` - Auto-generated dependency folders

## Development Workflow

1. **Setup:** Run `./scripts/quick-start.sh`
2. **Development:** Use `npm run dev` for both services
3. **Building:** Use `npm run build` for production builds
4. **Testing:** Test API with curl, frontend in browser

This structure provides a clean, organized, and maintainable codebase that's easy to understand and extend.
