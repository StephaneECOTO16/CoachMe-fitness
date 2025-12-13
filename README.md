# Mandara Fitness

A full-stack fitness platform connecting coaches with clients. Built with Next.js 16, TypeScript, Prisma, and PostgreSQL.

## Features

- 🔐 JWT-based authentication with role-based access control
- 💬 Real-time chat between coaches and clients (Pusher)
- 📸 Media uploads (certificates, photos, videos) to AWS S3/MinIO
- 👨‍🏫 Coach onboarding and admin approval workflow
- 🛡️ Input validation with Zod
- 📊 Structured logging with Pino
- 🧪 Unit tests with Vitest
- ⚡ Rate limiting and request tracking
- 🐳 Docker Compose for local development

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose (for MinIO and local dev)
- pnpm (recommended) or npm

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd mandara-fitness
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   # IMPORTANT: Set JWT_SECRET to a secure random value!
   ```

3. **Setup database:**
   ```bash
   # Start PostgreSQL (via Docker Compose if using it)
   docker-compose up -d postgres minio nginx

   # Run migrations
   pnpm prisma:migrate

   # Generate Prisma Client
   pnpm prisma:generate
   ```

4. **Start development server:**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Development

### Available Scripts

```bash
# Development server with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage

# Prisma database operations
pnpm prisma:migrate      # Create and apply migrations
pnpm prisma:generate     # Generate Prisma Client
```

### Database Migrations

```bash
# Create a new migration after schema changes
pnpm prisma:migrate

# View Prisma Studio (interactive database browser)
npx prisma studio
```

### Testing

```bash
# Run all tests
pnpm test

# Watch mode (re-run on file changes)
pnpm test --watch

# Run specific test file
pnpm test auth.test.ts

# Generate coverage report
pnpm test:coverage
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── lib/
│   ├── auth.ts           # JWT utilities
│   ├── prisma.ts         # Prisma client singleton
│   ├── aws-s3.ts         # S3/MinIO operations
│   ├── validation.ts     # Input validation
│   ├── schemas.ts        # Zod validation schemas
│   ├── logger.ts         # Structured logging
│   └── rate-limit.ts     # Rate limiting
├── middleware.ts          # Next.js middleware
└── __tests__/            # Test files

docker-compose.yml         # Local development services
API.md                     # API documentation
.env.example               # Environment variables template
```

## Documentation

- **[API.md](./API.md)** - Complete API documentation with examples
- **[Architecture Decisions](./ARCHITECTURE.md)** - System design and choices
- **[Testing Guide](./TESTING.md)** - How to write and run tests

## Database

See `prisma/schema.prisma` for the complete database schema.

### Key Models

- **User** - Authentication and user profile
- **CoachProfile** - Coach-specific information
- **ClientProfile** - Client measurements and preferences
- **Chat** - Conversations between coaches and clients
- **Message** - Chat messages
- **Media** - Uploaded files (certificates, photos, videos)
- **AdminReview** - Coach approval/rejection decisions

## Security

- ✅ JWT tokens (7-day expiration)
- ✅ Password hashing with bcrypt
- ✅ Rate limiting (5 req/15min auth, 100 req/15min API)
- ✅ Input validation with Zod
- ✅ File type and size validation
- ✅ CORS protection
- ✅ SQL injection prevention (Prisma ORM)

## Environment Setup

```bash
# Generate secure JWT secret
openssl rand -hex 32

# Copy template and configure
cp .env.example .env
```

See `.env.example` for all available configuration options.

### Storage: Cloudflare R2

This project uses the AWS S3 SDK and supports S3-compatible backends. To migrate from AWS S3 to Cloudflare R2 (low effort), update endpoint and credentials:

Required env vars:

```
# Bucket configuration
AWS_S3_BUCKET=<your_bucket_name>

# Cloudflare R2 S3-compatible endpoint and region
AWS_S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
AWS_S3_REGION=auto
AWS_S3_FORCE_PATH_STYLE=true

# R2 Access Keys
AWS_ACCESS_KEY_ID=<r2_access_key_id>
AWS_SECRET_ACCESS_KEY=<r2_secret_access_key>

# Optional: Public base URL/CDN for serving media
# If you enabled public access, set to your bucket public domain
# e.g. https://<bucket>.r2.dev or a custom domain via Cloudflare
AWS_S3_CDN_URL=https://<bucket>.r2.dev
```

Notes:
- Presigned uploads and object operations continue to work via the S3 SDK.
- With `AWS_S3_ENDPOINT` set, path-style addressing is used automatically, so public URLs resolve to `https://<account_id>.r2.cloudflarestorage.com/<bucket>/<key>` unless `AWS_S3_CDN_URL` is provided.
- For public access, prefer setting `AWS_S3_CDN_URL` (e.g., `https://<bucket>.r2.dev`) or a Cloudflare proxied custom domain.

## Deployment

### Docker

```bash
docker build -t mandara-fitness .
docker run -p 3000:3000 -e DATABASE_URL=... mandara-fitness
```

### Kubernetes

Deploy using Kubernetes manifests in `k8s/` directory.

## Contributing

1. Create a feature branch
2. Make changes and add tests
3. Run `pnpm test` and `pnpm lint`
4. Submit a pull request

## License

MIT

## Support

For issues or questions: `support@mandara-fitness.com`
