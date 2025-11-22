# i-witness
Proof of IRL

A TypeScript-based Express REST API with comprehensive middleware support.

## Features

- ✅ TypeScript with strict type checking
- ✅ Express.js REST API
- ✅ Request logging with Morgan
- ✅ Security middleware (Helmet)
- ✅ CORS support
- ✅ Error handling middleware
- ✅ Health check endpoint
- ✅ Graceful shutdown handling

## Getting Started

### Installation

```bash
yarn install
```

### Development

```bash
# Run in development mode with hot reload
yarn dev

# Build for production
yarn build

# Run production build
yarn start

# Type check without building
yarn type-check
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
```

## API Endpoints

### Health Check
- **GET** `/api/health` - Returns server health status

### Root
- **GET** `/` - Returns API information

## Project Structure

```
src/
├── app.ts                 # Express app configuration
├── index.ts               # Entry point
├── middlewares/
│   ├── errorHandler.ts    # Error handling middleware
│   └── logger.ts          # Logging middleware
├── routes/
│   ├── health.ts          # Health check route
│   └── index.ts           # Route aggregator
└── types/
    └── express.d.ts       # TypeScript type definitions
```

## Adding New Endpoints

To add new endpoints:

1. Create a new route file in `src/routes/` (e.g., `users.ts`)
2. Import and register it in `src/routes/index.ts`
3. The route will be available at `/api/your-route`

Example:
```typescript
// src/routes/users.ts
import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ users: [] });
});

export default router;

// src/routes/index.ts
import userRouter from './users';
router.use('/users', userRouter);
```

## License

ISC
