# i-witness

**Proof of IRL** - Cryptographic proof of physical reality

i-witness is a decentralized system for capturing, storing, and verifying authentic images and depth data secured by hardware-attested signatures. The system uses stereo cameras to capture synchronized frames, generates depth maps, cryptographically signs the data, and stores it on Filecoin for permanent, verifiable proof of physical reality.

## Features

- ✅ **Stereo Capture** - Dual-camera setup captures synchronized frames to generate depth maps
- ✅ **Hardware Signed** - Raw data is signed using EIP-191 cryptographic signatures for tamper-proof evidence
- ✅ **Filecoin Storage** - Data is stored on Filecoin via Synapse SDK for decentralized, permanent storage
- ✅ **Verifiable** - Anyone can verify the signature and depth consistency using IPFS CIDs
- ✅ **Device Registration** - Register devices with ENS subnames (e.g., `camera-01.iwitness.eth`)
- ✅ **MongoDB Metadata** - Capture metadata indexed in MongoDB for fast retrieval
- ✅ **Web Interface** - Modern Next.js frontend for verification and browsing captures

## Architecture

The project consists of three main components:

### 1. Device (Raspberry Pi) - `device-pi/`

Python-based capture system that:
- Captures synchronized stereo images from dual cameras
- Generates depth maps using OpenCV stereo vision algorithms
- Cryptographically signs capture data using EIP-191 signatures
- Uploads signed payloads to the file server

**Key Files:**
- `depthmap.py` - Main capture script with stereo depth computation
- `depthfinal4.py` - Enhanced capture with signing capabilities
- `callibration/` - Stereo camera calibration scripts

**Dependencies:**
- OpenCV (stereo vision)
- NumPy (image processing)
- eth-account (cryptographic signing)

### 2. File Server - `file-server/`

Express.js/TypeScript backend that:
- Receives signed capture payloads from devices
- Uploads data to Filecoin storage via Synapse SDK
- Stores metadata in MongoDB
- Provides API endpoints for upload/download

**Key Features:**
- RESTful API with Express.js
- Filecoin integration via Synapse SDK
- MongoDB for metadata storage
- Payment setup for Filecoin storage
- Error handling and logging middleware

**API Endpoints:**
- `POST /api/upload` - Upload signed capture data (returns PieceCID)
- `GET /api/upload/:pieceCid` - Download capture data by PieceCID
- `GET /api/synapse/payment-status` - Check Filecoin payment status
- `POST /api/synapse/setup-payment` - Setup payment for storage
- `GET /api/health` - Health check endpoint

### 3. Web Frontend - `web/`

Next.js frontend that:
- Provides verification interface for IPFS CIDs
- Displays recent captures and posts
- Manages device registration via ENS subnames
- Shows verification results and metadata

**Key Features:**
- Next.js 16 with React 19
- Tailwind CSS for styling
- Wagmi/RainbowKit for wallet integration
- Namestone SDK for ENS subname management
- MongoDB integration for fetching posts

**Pages:**
- `/` - Home page with verification form and recent captures
- `/register-device` - Device registration with ENS subnames
- `/verify/[cid]` - Verification page for specific captures

## Getting Started

### Prerequisites

- Node.js 20+ and Yarn
- Python 3.8+ (for device-pi)
- MongoDB instance
- Ethereum wallet with USDFC for Filecoin storage
- Raspberry Pi with dual cameras (for device capture)

### Installation

#### File Server

```bash
cd file-server
yarn install
```

Create a `.env` file:
```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
MONGO_URI=mongodb://localhost:27017/iwitness
PRIVATE_KEY=0x...
```

#### Web Frontend

```bash
cd web
yarn install
```

Create a `.env.local` file:
```env
MONGODB_URI=mongodb://localhost:27017/iwitness
NEXT_PUBLIC_FILE_SERVER_URL=http://localhost:3000
```

#### Device (Raspberry Pi)

```bash
cd device-pi
pip install -r requirements.txt
```

Create a `.env` file:
```env
PRIVATE_KEY=0x...
FILE_SERVER_URL=http://your-file-server:3000
```

### Development

#### File Server

```bash
cd file-server
yarn dev      # Run in development mode with hot reload
yarn build    # Build for production
yarn start    # Run production build
```

#### Web Frontend

```bash
cd web
yarn dev      # Run development server (http://localhost:3001)
yarn build    # Build for production
yarn start    # Run production build
```

#### Device Capture

```bash
cd device-pi
python depthfinal4.py  # Run stereo capture with signing
```

## Project Structure

```
i-witness/
├── device-pi/              # Raspberry Pi capture system
│   ├── callibration/       # Stereo camera calibration
│   ├── depthmap/           # Depth map generation scripts
│   ├── depthfinal4.py      # Main capture script
│   └── requirements.txt    # Python dependencies
│
├── file-server/            # Express.js backend
│   ├── src/
│   │   ├── app.ts          # Express app configuration
│   │   ├── index.ts        # Entry point
│   │   ├── routes/         # API routes
│   │   │   ├── upload.ts   # Upload/download endpoints
│   │   │   ├── synapse.ts  # Filecoin payment endpoints
│   │   │   └── health.ts   # Health check
│   │   ├── services/       # Business logic
│   │   │   ├── synapse.ts  # Filecoin storage service
│   │   │   └── mongodb.ts  # MongoDB service
│   │   └── middlewares/    # Express middlewares
│   └── package.json
│
├── web/                    # Next.js frontend
│   ├── src/
│   │   ├── app/            # Next.js app router
│   │   │   ├── api/       # API routes
│   │   │   │   ├── posts/ # Posts API
│   │   │   │   └── namestone/ # ENS subname API
│   │   │   ├── page.tsx   # Home page
│   │   │   ├── register-device/ # Device registration
│   │   │   └── verify/[cid]/    # Verification page
│   │   ├── components/     # React components
│   │   │   ├── verification-form.tsx
│   │   │   ├── verification-results.tsx
│   │   │   ├── posts-list.tsx
│   │   │   └── recent-pirls.tsx
│   │   └── lib/           # Utilities
│   │       ├── mongodb.ts  # MongoDB client
│   │       ├── synapse.ts  # Synapse SDK wrapper
│   │       └── namestone.ts # ENS subname client
│   └── package.json
│
└── README.md
```

## Workflow

1. **Device Registration**
   - Generate a private key for the device
   - Register an ENS subname (e.g., `camera-01.iwitness.eth`)
   - Store the private key securely on the device

2. **Capture**
   - Device captures synchronized stereo images
   - Generates depth map from stereo pair
   - Creates signed payload with EIP-191 signature
   - Uploads to file server

3. **Storage**
   - File server receives signed payload
   - Uploads to Filecoin via Synapse SDK
   - Stores metadata (PieceCID, timestamp, signature) in MongoDB
   - Returns PieceCID to device

4. **Verification**
   - User enters IPFS CID in web interface
   - System fetches data from Filecoin
   - Verifies cryptographic signature
   - Displays verification results and metadata

## Environment Variables

### File Server
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - CORS allowed origin
- `MONGO_URI` - MongoDB connection string
- `PRIVATE_KEY` - Ethereum private key for Filecoin operations

### Web Frontend
- `MONGODB_URI` - MongoDB connection string
- `NEXT_PUBLIC_FILE_SERVER_URL` - File server API URL

### Device
- `PRIVATE_KEY` - Device private key for signing captures
- `FILE_SERVER_URL` - File server API URL

## Technologies

- **Backend**: Express.js, TypeScript, MongoDB
- **Frontend**: Next.js, React, Tailwind CSS, Wagmi, RainbowKit
- **Storage**: Filecoin (via Synapse SDK)
- **Blockchain**: Ethereum (ENS subnames via Namestone)
- **Device**: Python, OpenCV, NumPy, eth-account
- **Cryptography**: EIP-191 message signing

## License

ISC
