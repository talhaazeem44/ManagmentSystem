# Honda Dealership Management System - Setup Instructions

## Prerequisites
- Docker Desktop (for PostgreSQL)
- Node.js 18+ and npm

## Quick Start

### 1. Start the Database
```bash
# Start PostgreSQL container
docker compose up -d

# Verify it's running
docker ps
```

### 2. Run Database Migrations
```bash
# Generate Prisma client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init
```

### 3. Start the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Features Implemented

### ✅ Inventory Management
- **Receive Stock**: Enter delivery orders with multiple bikes
- **View Inventory**: Filter bikes by availability status
- **DO Tracking**: Track bikes by delivery order number

### ✅ Sales Management
- **New Sale**: Select available bike and enter customer details
- **Customer Data**: CNIC, name, address, phone number
- **Receipt Generation**: Print-ready receipts matching your format
- **Sales History**: View all completed sales

### ✅ Reporting & Analytics
- **Daily Reports**: Sales and revenue for today
- **All-Time Stats**: Total sales, revenue, inventory
- **DO Status**: Track remaining bikes per delivery order
- **Progress Bars**: Visual representation of DO completion

### ✅ Premium UI/UX
- **Dark Theme**: Modern glassmorphism design
- **Animations**: Smooth transitions and hover effects
- **Responsive**: Works on desktop and mobile
- **Print-Ready**: Receipts and reports optimized for printing

## Database Schema

- **DeliveryOrder**: DO number, date, dealer info
- **Bike**: Model, color, engine/chassis numbers, status
- **Customer**: CNIC, name, contact details
- **Sale**: Links bike to customer with pricing

## Notes

### CNIC Scanning
Currently a placeholder - manual entry required. OCR integration can be added using libraries like Tesseract.js.

### Sticker Printing
Use browser print (Ctrl/Cmd+P) on the receive stock page to print bike stickers with DO information.

## Troubleshooting

### Database Connection Issues
If you see "Can't reach database server":
1. Ensure Docker Desktop is running
2. Run `docker compose up -d`
3. Check connection with `docker ps`

### Port Already in Use
If port 5432 is in use:
1. Stop other PostgreSQL instances
2. Or modify `docker-compose.yml` to use a different port

## Next Steps

1. **Start Docker** and run migrations
2. **Test the flow**: Receive stock → Make a sale → View reports
3. **Customize** colors, branding, or add features as needed
