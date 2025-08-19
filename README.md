# Decentralized Marketplace for Trading Renewable Energy Credits

A blockchain-based marketplace built on Stacks that enables direct trading of Renewable Energy Credits (RECs) between producers and corporate buyers, eliminating intermediaries and improving transparency.

## Overview

This project implements a decentralized marketplace where renewable energy producers can tokenize their RECs as NFTs and sell them directly to corporations seeking to meet sustainability goals. The platform leverages Stacks blockchain for smart contracts, Bitcoin for security, and sBTC for settlements.

### Key Features

- **Direct Trading**: Peer-to-peer trading between energy producers and corporate buyers
- **NFT-based RECs**: Each REC is minted as a unique NFT with verifiable provenance data
- **Multiple Trading Mechanisms**: Direct sales, auctions, and bulk trading options
- **Automated Settlement**: Smart contract-based settlement using sBTC
- **Verification Integration**: Third-party verification body support
- **Compliance Support**: Compatible with major REC standards (Green-e, I-REC, TIGR)
- **Real-time Analytics**: Market data, pricing trends, and portfolio management

## Architecture

The platform consists of three main components:

1. **Smart Contracts** (Clarity) - Core blockchain logic for NFTs, marketplace, and verification
2. **Backend Services** (Node.js) - API services, user management, and external integrations
3. **Frontend Application** (React) - Web interface for producers, buyers, and administrators

### Technology Stack

- **Blockchain**: Stacks 2.1+ with Clarity smart contracts
- **Security Layer**: Bitcoin network with sBTC integration
- **Storage**: IPFS for NFT metadata and documentation
- **Backend**: Node.js with TypeScript, Express.js, PostgreSQL
- **Frontend**: React with TypeScript, Redux Toolkit, Tailwind CSS
- **Development**: Clarinet for smart contract development and testing

## Project Structure

```
├── contracts/              # Clarity smart contracts
│   ├── rec-nft.clar
│   ├── rec-marketplace.clar
│   └── rec-verification.clar
├── tests/                  # Smart contract tests
├── frontend/               # React frontend application
├── backend/                # Node.js backend services
├── docs/                   # Project documentation
│   ├── requirements.md
│   ├── technical-architecture.md
│   └── development-setup.md
├── scripts/                # Deployment and utility scripts
├── docker-compose.yml      # Local development environment
├── Clarinet.toml          # Clarinet configuration
└── README.md
```

## Smart Contracts

### REC NFT Contract (`rec-nft.clar`)
- Implements SIP-009 NFT standard
- Manages facility registration and REC minting
- Stores comprehensive metadata for each REC
- Handles ownership transfers and verification status

### Marketplace Contract (`rec-marketplace.clar`)
- Facilitates direct sales and auction trading
- Manages listings, bidding, and escrow
- Calculates and distributes trading fees
- Integrates with payment processing

### Verification Contract (`rec-verification.clar`)
- Manages authorized verification bodies
- Handles verification workflow and status
- Maintains audit trails for compliance
- Supports dispute resolution processes

## Getting Started

### Prerequisites

- Node.js 18+ with npm or yarn
- Clarinet 2.0+ (Stacks development toolkit)
- Docker and Docker Compose
- PostgreSQL 14+ and Redis 7+
- Git version control

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/rec-marketplace.git
   cd rec-marketplace
   ```

2. **Install Clarinet**
   ```bash
   # macOS
   brew install clarinet
   
   # Linux/Windows
   curl -L https://github.com/hirosystems/clarinet/releases/latest/download/clarinet-linux-x64.tar.gz | tar xz
   sudo mv clarinet /usr/local/bin
   ```

3. **Start development environment**
   ```bash
   docker-compose up -d
   ```

4. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd frontend && npm install
   ```

5. **Run tests**
   ```bash
   # Smart contracts
   clarinet test
   
   # Backend
   cd backend && npm test
   
   # Frontend
   cd frontend && npm test
   ```

6. **Start development servers**
   ```bash
   # Backend (Terminal 1)
   cd backend && npm run dev
   
   # Frontend (Terminal 2)
   cd frontend && npm start
   ```

The application will be available at:
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/docs

### Detailed Setup

For comprehensive setup instructions including environment configuration, database setup, and debugging guides, see the [Development Setup Guide](docs/development-setup.md).

## Documentation

- **[Requirements Document](docs/requirements.md)** - Comprehensive project requirements and specifications
- **[Technical Architecture](docs/technical-architecture.md)** - System architecture and design patterns
- **[Development Setup](docs/development-setup.md)** - Detailed development environment setup

## Development Workflow

### Smart Contract Development

```bash
# Test contracts
clarinet test

# Check syntax and types
clarinet check

# Interactive console
clarinet console

# Deploy to devnet
clarinet integrate
```

### Backend Development

```bash
# Run development server
npm run dev

# Run tests with coverage
npm run test:coverage

# Lint and format code
npm run lint
npm run format

# Generate API documentation
npm run docs
```

### Frontend Development

```bash
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build

# Run end-to-end tests
npm run test:e2e
```

## API Documentation

The backend provides RESTful APIs for:

- **Authentication**: User registration, login, and session management
- **User Management**: Profile management and role-based access
- **Facility Management**: Renewable energy facility registration and verification
- **REC Operations**: Minting, listing, and trading RECs
- **Market Data**: Real-time pricing, analytics, and historical data
- **Verification**: Third-party verification workflows
- **Compliance**: Reporting and audit trail access

API documentation is automatically generated and available at `/docs` when running the development server.

## Testing

### Test Coverage

- **Smart Contracts**: Unit tests with Clarinet testing framework
- **Backend**: Unit and integration tests with Jest
- **Frontend**: Component tests with React Testing Library
- **End-to-End**: Full workflow tests with Cypress

### Running Tests

```bash
# All tests
npm run test:all

# Smart contracts only
clarinet test

# Backend only
cd backend && npm test

# Frontend only
cd frontend && npm test

# E2E tests
npm run test:e2e
```

## Deployment

### Testnet Deployment

```bash
# Deploy smart contracts to testnet
clarinet deploy --testnet

# Deploy backend services
docker build -t rec-marketplace-backend ./backend
docker run -p 3000:3000 rec-marketplace-backend

# Deploy frontend
npm run build
# Deploy build/ directory to hosting service
```

### Production Deployment

For production deployment, the application supports:

- **Kubernetes**: Container orchestration with Helm charts
- **Docker**: Containerized deployment with Docker Compose
- **Cloud Platforms**: AWS, GCP, Azure deployment configurations
- **CDN Integration**: CloudFlare, AWS CloudFront for frontend assets

See deployment scripts in the `scripts/` directory for specific platform configurations.

## Security

### Smart Contract Security

- Formal verification with mathematical proofs
- Multi-signature controls for administrative functions
- Access control modifiers for all public functions
- Comprehensive audit logging and event emission

### Platform Security

- Multi-factor authentication for high-value accounts
- Role-based access control (RBAC)
- End-to-end encryption for sensitive data
- Regular security audits and penetration testing

### Wallet Integration

- Hardware wallet support (Ledger, Trezor)
- Secure transaction signing with clear transaction details
- Phishing protection and domain verification
- Private key management best practices

## Contributing

### Development Process

1. Fork the repository
2. Create a feature branch from `main`
3. Make changes and add tests
4. Ensure all tests pass and code is properly formatted
5. Submit a pull request with detailed description

### Code Standards

- **Smart Contracts**: Follow Clarity best practices and style guide
- **TypeScript**: Use ESLint and Prettier with strict TypeScript configuration
- **Documentation**: Update relevant documentation for any changes
- **Testing**: Maintain test coverage above 80% for all components

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/marketplace-enhancements

# Make commits with conventional format
git commit -m "feat(marketplace): add auction bidding functionality"

# Push and create pull request
git push origin feature/marketplace-enhancements
```

## Monitoring and Maintenance

### Health Monitoring

The platform includes comprehensive monitoring for:

- **Application Health**: Service uptime and response times
- **Blockchain Integration**: Stacks node connectivity and transaction status
- **Database Performance**: Query performance and connection pooling
- **External APIs**: Third-party service availability and response times

### Metrics and Logging

- **Prometheus**: Metrics collection and monitoring
- **Grafana**: Dashboards and visualization
- **ELK Stack**: Centralized logging and analysis
- **Sentry**: Error tracking and performance monitoring

## Compliance and Regulations

The platform is designed to comply with:

- **REC Standards**: Green-e, I-REC, TIGR certification requirements
- **Financial Regulations**: AML/KYC procedures for high-value transactions
- **Data Protection**: GDPR and CCPA compliance for user data
- **Environmental Standards**: Carbon accounting and additionality verification

## Roadmap

### Phase 1: Foundation (Months 1-3)
- Core smart contracts and basic marketplace functionality
- User authentication and facility registration
- NFT minting and basic trading capabilities

### Phase 2: Enhanced Trading (Months 4-6)
- Auction system and advanced trading mechanisms
- Market analytics and price discovery
- Mobile application development

### Phase 3: Verification and Compliance (Months 7-9)
- Third-party verifier integration
- Compliance reporting and audit tools
- Enhanced security features

### Phase 4: Scale and Optimize (Months 10-12)
- Production deployment and scaling
- Enterprise integrations and APIs
- Global expansion and multi-jurisdiction support

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- **Documentation**: Check the `docs/` directory for detailed guides
- **Issues**: Report bugs and request features via GitHub Issues
- **Community**: Join the Stacks Discord for community support
- **Enterprise**: Contact the development team for enterprise support

## Acknowledgments

- **Stacks Foundation** for blockchain infrastructure and development tools
- **Clarinet Team** for smart contract development framework
- **Renewable Energy Community** for domain expertise and validation
- **Open Source Contributors** for libraries and tools used in this project
