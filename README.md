# MonPetitBiz Admin Portal

Admin dashboard web application for MonPetitBiz business management. This is a separate Next.js application that communicates with the MonPetitBiz API backend.

## Features

- User authentication via OTP (One-Time Password)
- Business registration and onboarding
- Dashboard with business metrics and statistics
- Transaction history and management
- Stock level monitoring and alerts
- Responsive design for mobile and desktop

## Prerequisites

- Node.js 18+ and npm
- Access to the MonPetitBiz API backend
- A valid business account (created via WhatsApp or API)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd monpetitbiz-admin-portal
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp env.example .env.local
```

Edit `.env.local` and set:
```bash
NEXT_PUBLIC_API_URL=http://localhost:9000
BACKEND_SERVICE_TOKEN=your_service_token_here
```

**Important**: 
- `BACKEND_SERVICE_TOKEN` must match the `SERVICE_TOKEN` configured in the backend
- The backend runs on port 9000 by default

For production, use your production API URL:
```bash
NEXT_PUBLIC_API_URL=https://api.monpetitbiz.com
BACKEND_SERVICE_TOKEN=your_production_service_token
```

## Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:9000](http://localhost:9000) in your browser.

## Building for Production

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | URL of the MonPetitBiz API backend (default: http://localhost:9000) |
| `BACKEND_SERVICE_TOKEN` | ✅ | Service token for authenticating requests to the backend. Must match `SERVICE_TOKEN` in the backend configuration |

### Development
```bash
NEXT_PUBLIC_API_URL=http://localhost:9000
BACKEND_SERVICE_TOKEN=your_service_token_here
```

### Production
```bash
NEXT_PUBLIC_API_URL=https://api.monpetitbiz.com
BACKEND_SERVICE_TOKEN=your_production_service_token
```

## Authentication Flow

1. **Send OTP**: User enters phone number, receives OTP via WhatsApp
2. **Verify OTP**: User enters 6-digit OTP code
3. **Registration** (if new user): User completes business registration
4. **Dashboard Access**: Authenticated users can access their business dashboard

## API Integration

The admin portal communicates with the MonPetitBiz API using:

- **Authentication endpoints**:
  - `POST /auth/send-otp` - Request OTP code
  - `POST /auth/verify-otp` - Verify OTP and get JWT token
  - `POST /auth/complete-registration` - Complete user registration

- **Dashboard endpoints**:
  - `GET /dashboard/:businessId` - Get dashboard data
  - `GET /dashboard/:businessId/summary` - Get summary statistics
  - `GET /dashboard/:businessId/metrics` - Get metrics for a period
  - `GET /dashboard/:businessId/export` - Export transaction data

All dashboard endpoints require JWT authentication via Bearer token in the Authorization header.

## Project Structure

```
monpetitbiz-admin-portal/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── login/        # Login page
│   │   ├── dashboard/    # Dashboard pages
│   │   └── layout.tsx    # Root layout
│   └── lib/              # Utilities and services
│       ├── api.ts        # API client
│       └── auth.ts       # Authentication service
├── public/               # Static assets
├── package.json
├── tsconfig.json
└── next.config.js
```

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` - Your API backend URL
3. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- Self-hosted with Node.js

## Backend Configuration

Ensure the backend API is configured to accept requests from your admin portal:

1. Set `FRONTEND_URL` environment variable in the backend:
```bash
FRONTEND_URL=https://admin.monpetitbiz.com
```

2. The backend CORS configuration will automatically allow requests from this URL in production.

For development, CORS allows all origins by default.

## Troubleshooting

### CORS Errors

If you see CORS errors, ensure:
1. `FRONTEND_URL` is set correctly in the backend
2. The admin portal URL matches `FRONTEND_URL` exactly
3. In development, CORS should allow all origins

### Authentication Issues

- Verify the API backend is running and accessible
- Check that `NEXT_PUBLIC_API_URL` is correct
- Ensure OTP codes are being sent (check WhatsApp)
- Verify JWT token is being stored in cookies

### API Connection Errors

- Check network connectivity
- Verify API backend URL is correct
- Ensure API backend is running
- Check browser console for detailed error messages

## Support

For issues or questions:
1. Check the [MonPetitBiz API documentation](../MonPetitBiz/README.md)
2. Review the [Admin Portal Setup Guide](../MonPetitBiz/docs/admin-portal-setup.md)
3. Contact support: support@monpetitbiz.com

## License

ISC

