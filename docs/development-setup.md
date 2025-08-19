# Development Setup Guide
## REC-Chain Marketplace

### Quick Start

This guide will help you set up the development environment for the Decentralized Marketplace for Trading Renewable Energy Credits.

## Prerequisites

### Required Software
- **Node.js** 18+ with npm/yarn
- **Clarinet** 2.0+ (Stacks development toolkit)
- **Docker** & Docker Compose
- **Git** version control
- **PostgreSQL** 14+ (for local development)
- **Redis** 7+ (for caching)

### Development Tools (Recommended)
- **VS Code** with Clarity extension
- **Postman** or **Insomnia** for API testing
- **MetaMask** or **Hiro Wallet** for Stacks interaction
- **TablePlus** or **pgAdmin** for database management

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/rec-marketplace.git
cd rec-marketplace
```

### 2. Install Clarinet

```bash
# macOS (Homebrew)
brew install clarinet

# Linux/Windows (from source)
curl -L https://github.com/hirosystems/clarinet/releases/latest/download/clarinet-linux-x64.tar.gz | tar xz
sudo mv clarinet /usr/local/bin

# Verify installation
clarinet --version
```

### 3. Project Structure

```
rec-marketplace/
├── contracts/                 # Clarity smart contracts
│   ├── rec-nft.clar
│   ├── rec-marketplace.clar
│   └── rec-verification.clar
├── tests/                     # Smart contract tests
│   ├── rec-nft_test.ts
│   ├── marketplace_test.ts
│   └── verification_test.ts
├── frontend/                  # React frontend application
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/                   # Node.js backend services
│   ├── src/
│   ├── tests/
│   └── package.json
├── docs/                      # Project documentation
├── scripts/                   # Deployment and utility scripts
├── docker-compose.yml         # Local development environment
├── Clarinet.toml             # Clarinet configuration
└── README.md
```

### 4. Smart Contract Development

#### Initialize Clarinet Project
```bash
# The project is already initialized, but for reference:
# clarinet new rec-marketplace
# cd rec-marketplace
```

#### Add Smart Contracts
```bash
# Contracts are already added, but for reference:
# clarinet contract new rec-nft
# clarinet contract new rec-marketplace
# clarinet contract new rec-verification
```

#### Configure Clarinet.toml
Update the `Clarinet.toml` file:

```toml
[project]
name = "rec-marketplace"
description = "Decentralized marketplace for trading renewable energy credits"
authors = ["Your Team <team@yourcompany.com>"]
telemetry = true
cache_dir = "./.cache"

[contracts.rec-nft]
path = "contracts/rec-nft.clar"
epoch = "latest"

[contracts.rec-marketplace]
path = "contracts/rec-marketplace.clar"
epoch = "latest"
depends_on = ["rec-nft"]

[contracts.rec-verification]
path = "contracts/rec-verification.clar"
epoch = "latest"
depends_on = ["rec-nft"]

[repl.analysis]
passes = ["check_checker"]

[repl.analysis.check_checker]
trusted_sender = false
trusted_caller = false
callee_filter = false
```

### 5. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install

# Or with yarn
yarn install
```

#### Environment Variables
Create a `.env` file in the backend directory:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/rec_marketplace
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=rec_user
DATABASE_PASSWORD=your_password
DATABASE_NAME=rec_marketplace

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Stacks Configuration
STACKS_NETWORK=testnet
STACKS_API_URL=https://stacks-node-api.testnet.stacks.co
BITCOIN_NETWORK=testnet

# API Configuration
PORT=3000
NODE_ENV=development
API_VERSION=v1

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=24h

# External APIs
ENERGY_DATA_API_KEY=your-energy-api-key
VERIFICATION_API_KEY=your-verification-api-key

# Security
CORS_ORIGIN=http://localhost:3001
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
LOG_LEVEL=debug
SENTRY_DSN=your-sentry-dsn
```

#### Database Setup
```bash
# Create database
createdb rec_marketplace

# Run migrations
npm run migrate

# Seed initial data
npm run seed
```

### 6. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install

# Or with yarn
yarn install
```

#### Environment Variables
Create a `.env` file in the frontend directory:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_WS_URL=ws://localhost:3000

# Stacks Configuration
REACT_APP_STACKS_NETWORK=testnet
REACT_APP_STACKS_API_URL=https://stacks-node-api.testnet.stacks.co

# Contract Addresses (will be set after deployment)
REACT_APP_REC_NFT_CONTRACT=
REACT_APP_MARKETPLACE_CONTRACT=
REACT_APP_VERIFICATION_CONTRACT=

# External Services
REACT_APP_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
REACT_APP_ANALYTICS_ID=your-analytics-id

# Feature Flags
REACT_APP_ENABLE_TESTNET=true
REACT_APP_ENABLE_DEBUG=true
```

### 7. Docker Development Environment

#### Start Services
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Docker Compose Configuration
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: rec_marketplace
      POSTGRES_USER: rec_user
      POSTGRES_PASSWORD: development_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://rec_user:development_password@postgres:5432/rec_marketplace
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build: ./frontend
    ports:
      - "3001:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3000/api/v1
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
```

## Development Workflow

### 1. Smart Contract Development

#### Testing Contracts
```bash
# Run all tests
clarinet test

# Run specific test
clarinet test tests/rec-nft_test.ts

# Check contracts
clarinet check

# Console REPL
clarinet console
```

#### Contract Deployment
```bash
# Deploy to devnet
clarinet integrate

# Deploy to testnet (requires setup)
clarinet deploy --testnet

# Deploy to mainnet (production)
clarinet deploy --mainnet
```

### 2. Backend Development

#### Running Development Server
```bash
cd backend

# Start with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run type-check
```

#### API Documentation
```bash
# Generate API docs
npm run docs

# Serve docs locally
npm run docs:serve
```

### 3. Frontend Development

#### Running Development Server
```bash
cd frontend

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint
```

#### Stacks Integration Testing
```bash
# Test wallet connection
npm run test:wallet

# Test contract interactions
npm run test:contracts

# End-to-end tests
npm run test:e2e
```

## Testing Strategy

### Unit Tests
```bash
# Smart contracts
clarinet test

# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

### Integration Tests
```bash
# Full stack integration
npm run test:integration

# API integration
npm run test:api

# Blockchain integration
npm run test:blockchain
```

### End-to-End Tests
```bash
# Using Cypress
npm run test:e2e

# Using Playwright
npm run test:playwright
```

## Debugging

### Smart Contract Debugging
```bash
# Launch Clarinet console
clarinet console

# Execute contract calls
(contract-call? .rec-nft mint-rec 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM "facility-1" "solar" u1234567890 u1000 "California, USA" 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM "green-e")

# Check contract state
(contract-call? .rec-nft get-last-token-id)
```

### Backend Debugging
```bash
# Debug mode
DEBUG=* npm run dev

# Specific namespace debugging
DEBUG=rec:* npm run dev

# Using VS Code debugger
# Add breakpoints and run "Debug: Start Debugging"
```

### Frontend Debugging
```bash
# React DevTools
# Install browser extension

# Redux DevTools
# Install browser extension

# Stacks debugging
# Use browser developer tools + Stacks Connect
```

## Code Style and Standards

### Smart Contracts (Clarity)
- Use descriptive function and variable names
- Include comprehensive documentation
- Follow Clarity best practices
- Use consistent indentation (2 spaces)

### TypeScript/JavaScript
- Use ESLint with recommended rules
- Follow Prettier formatting
- Use TypeScript strict mode
- Write comprehensive JSDoc comments

### Git Workflow
```bash
# Feature branch workflow
git checkout -b feature/new-marketplace-feature
git commit -m "feat: add auction functionality"
git push origin feature/new-marketplace-feature

# Create pull request
# Code review required
# Merge to main after approval
```

### Commit Message Format
```
type(scope): subject

body

footer
```

Types: feat, fix, docs, style, refactor, test, chore

## Production Deployment

### Environment Preparation
1. Set up production infrastructure
2. Configure domain and SSL certificates
3. Set up monitoring and logging
4. Configure backup systems

### Smart Contract Deployment
```bash
# Deploy to mainnet
clarinet deploy --mainnet --cost-estimation

# Verify deployment
clarinet contracts verify --mainnet
```

### Application Deployment
```bash
# Build production images
docker build -t rec-marketplace-backend ./backend
docker build -t rec-marketplace-frontend ./frontend

# Deploy to Kubernetes
kubectl apply -f k8s/

# Monitor deployment
kubectl get pods -w
```

## Monitoring and Maintenance

### Health Checks
- Database connectivity
- Redis connectivity
- Stacks node connectivity
- External API connectivity

### Metrics to Monitor
- Transaction throughput
- Response times
- Error rates
- User adoption
- Gas costs

### Log Management
- Centralized logging with ELK stack
- Error tracking with Sentry
- Performance monitoring with APM tools

## Troubleshooting

### Common Issues

#### Smart Contract Issues
```bash
# Contract not found
clarinet check contracts/

# Gas estimation errors
clarinet test --cost-estimation

# Deployment failures
clarinet deploy --dry-run
```

#### Backend Issues
```bash
# Database connection
npm run db:test

# Redis connection
npm run redis:test

# API health check
curl http://localhost:3000/health
```

#### Frontend Issues
```bash
# Build errors
npm run build

# Wallet connection
# Check browser console for errors
# Verify network configuration
```

### Getting Help
- Check the documentation in `/docs`
- Review GitHub issues
- Join the Stacks Discord community
- Consult Clarity documentation

## Contributing

### Setup for Contributors
1. Fork the repository
2. Follow the setup guide above
3. Create a feature branch
4. Make changes and add tests
5. Submit a pull request

### Code Review Process
1. Automated tests must pass
2. Code coverage requirements
3. Security review for smart contracts
4. Manual testing verification
5. Documentation updates

This development setup guide provides everything needed to start building on the REC marketplace platform. For additional help, refer to the project documentation or reach out to the development team.
