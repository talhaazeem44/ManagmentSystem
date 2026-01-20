# Honda Dealership Management System

## Features

### 🔐 Authentication
- Secure login with NextAuth.js
- Password hashing with bcrypt
- JWT-based sessions
- Route protection middleware

### 📦 Inventory Management
- Receive stock with Delivery Order entry
- Filter by DO number, model, and status
- Search by engine number, chassis number, or model
- Real-time inventory stats

### 💰 Sales Management
- Complete sales with customer details
- Filter by DO number, payment mode, and date range
- Search by customer name, CNIC, or bike model
- Print-ready receipts

### 📊 Reports & Analytics
- Daily sales and revenue metrics
- All-time statistics
- DO-specific tracking with progress bars
- Bikes remaining per delivery order

### 🎨 Premium UI/UX
- Dark theme with glassmorphism
- Smooth animations and transitions
- Responsive design
- Print-optimized receipts

## Quick Start

### 1. Start MongoDB
```bash
docker compose up -d
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create First User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@naeem-autos.com",
    "password": "admin123",
    "name": "Admin User"
  }'
```

Or use the provided script:
```bash
node scripts/create-user.js
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Login
- Navigate to `http://localhost:3000`
- Login with: `admin@naeem-autos.com` / `admin123`

## Environment Variables

Create a `.env` file:
```
MONGODB_URI="mongodb://admin:password@localhost:27017/honda_dms?authSource=admin"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

## Database Schema (MongoDB)

- **User**: Authentication and authorization
- **DeliveryOrder**: DO details from company
- **Bike**: Individual bike records with engine/chassis numbers
- **Customer**: Customer information with CNIC
- **Sale**: Sale transactions linking bikes to customers

## Enhanced Filtering

### Inventory Page
- **DO Number**: Filter bikes by delivery order
- **Model**: Filter by bike model (CD70, PRIDOR, etc.)
- **Status**: Filter by AVAILABLE or SOLD
- **Search**: Find bikes by engine #, chassis #, or model

### Sales Page
- **DO Number**: View sales from specific delivery orders
- **Payment Mode**: Filter by CASH, CREDIT, or LEASE
- **Date Range**: Select start and end dates
- **Search**: Find by customer name, CNIC, or bike model

### Reports Page
- Daily and all-time statistics
- DO-specific breakdowns
- Progress bars showing completion percentage

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js
- **Styling**: Vanilla CSS with CSS variables
- **Container**: Docker (MongoDB)

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── dashboard/     # Dashboard page
│   ├── inventory/     # Inventory management
│   ├── sales/         # Sales management
│   ├── reports/       # Reports and analytics
│   └── login/         # Login page
├── components/        # Reusable components
├── lib/              # Utilities (MongoDB connection)
└── models/           # Mongoose schemas
```

## Notes

- **CNIC Scanning**: Placeholder for OCR integration (manual entry for now)
- **Sticker Printing**: Use browser print (Ctrl/Cmd+P) on receive page
- **Receipt Format**: Matches provided sample exactly
- **DO Tracking**: Shows remaining bikes per delivery order

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
docker ps

# Restart MongoDB
docker compose restart

# View logs
docker compose logs mongodb
```

### Authentication Issues
```bash
# Verify NEXTAUTH_SECRET is set in .env
# Clear browser cookies and try again
```

## License

© 2026 Naeem Autos
