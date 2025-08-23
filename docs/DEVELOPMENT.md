# Development Guide 🚀

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm 8+
- Google Cloud account with Vision API enabled

### Initial Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd lookmatch

# Install all dependencies
npm run install:all

# Set up environment variables
cp web/.env.local.example web/.env.local
# Edit web/.env.local with your API URL
```

## Project Structure

```
lookmatch/
├── 📁 api/                 # Backend API server
│   ├── src/               # TypeScript source code
│   │   └── index.ts       # Main API server
│   ├── package.json       # API dependencies
│   ├── tsconfig.json      # API TypeScript config
│   └── google-credentials.json  # Google Cloud credentials
├── 📁 web/                # Frontend Next.js app
│   ├── src/               # React components & pages
│   │   ├── app/           # Next.js app router
│   │   ├── components/    # Reusable components
│   │   └── lib/           # Utility functions
│   ├── package.json       # Web dependencies
│   ├── tsconfig.json      # Web TypeScript config
│   └── .env.local         # Environment variables
├── 📁 docs/               # Documentation
├── 📁 scripts/            # Build & deployment scripts
└── README.md              # Project overview
```

## Development Workflow

### 1. Start Development Servers
```bash
# Start both API and web app simultaneously
npm run dev

# Or start them separately:
npm run dev:api    # Backend on port 4000
npm run dev:web    # Frontend on port 3000
```

### 2. Development URLs
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000
- **API Health Check:** http://localhost:4000/health

### 3. File Changes
- **Backend:** Auto-restarts with nodemon
- **Frontend:** Hot reloads with Next.js

## Code Organization

### Backend (API)
- **`src/index.ts`** - Main server entry point
- **API endpoints** - RESTful routes for image analysis
- **Google Vision integration** - AI image processing

### Frontend (Web)
- **`src/app/`** - Next.js app router pages
- **`src/components/`** - Reusable React components
- **`src/lib/`** - Utility functions and helpers

## Environment Variables

### Web App (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### API (google-credentials.json)
- Place your Google Cloud service account credentials here
- **Never commit this file to git!**

## Common Commands

```bash
# Development
npm run dev              # Start both servers
npm run dev:api          # Start API only
npm run dev:web          # Start web only

# Building
npm run build            # Build both projects
npm run build:api        # Build API only
npm run build:web        # Build web only

# Production
npm run start            # Start both in production
npm run start:api        # Start API in production
npm run start:web        # Start web in production

# Maintenance
npm run clean            # Clean all build artifacts
npm run install:all      # Install all dependencies
npm run lint             # Run ESLint on web app
```

## Adding New Features

### Backend API
1. Add new endpoints in `api/src/index.ts`
2. Update API documentation in README.md
3. Test with curl or Postman

### Frontend
1. Create new components in `web/src/components/`
2. Add new pages in `web/src/app/`
3. Update routing and navigation

## Testing

### API Testing
```bash
# Health check
curl http://localhost:4000/health

# Test image analysis
curl -X POST http://localhost:4000/analyze \
  -F "image=@path/to/test-image.jpg"
```

### Frontend Testing
```bash
cd web
npm run lint    # ESLint
npm run build   # Build check
```

## Deployment

### Backend
1. Build: `npm run build:api`
2. Deploy `api/dist/` folder
3. Set environment variables

### Frontend
1. Build: `npm run build:web`
2. Deploy `web/.next/` folder
3. Set `NEXT_PUBLIC_API_URL` to production API

## Troubleshooting

### Common Issues
1. **Port conflicts** - Check if ports 3000/4000 are free
2. **Google credentials** - Ensure billing is enabled
3. **Dependencies** - Run `npm run install:all`
4. **Build errors** - Check TypeScript configs

### Getting Help
- Check the main README.md
- Review API logs in terminal
- Check browser console for frontend errors
