# Backend

## Installation

```bash
cd backend
npm install
```

## Environment Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

## Database Setup

```bash
# Generate Prisma client
npm run generate

# Run migrations
npm run migrate
```

## Development

```bash
npm run dev
```

Server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP and login
- `POST /api/auth/profile` - Complete user profile

### Assignments
- `POST /api/assignments/generate` - Generate assignment from text/image
- `GET /api/assignments` - List user's assignments
- `GET /api/assignments/:id` - Get specific assignment

### Exports
- `POST /api/exports/pdf` - Export as PDF
- `POST /api/exports/docx` - Export as Word document
- `POST /api/exports/pptx` - Export as PowerPoint
- `GET /api/exports/download/:id` - Download exported file

### Admin Dashboard
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:userId` - Get user details
- `GET /api/admin/analytics` - Platform analytics
- `PUT /api/admin/users/:userId/status` - Change user status
- `GET /api/admin/activity-logs` - Admin activity audit trail
