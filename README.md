# Bitespeed Identity Reconciliation API (TEST)

**TEST IT ON**- https://bitespeed-identity-b1dq.onrender.com/identify

A robust identity reconciliation API for consolidating customer contact information. This API provides an `/identify` endpoint to reconcile contacts using email and phone number, with a PostgreSQL database managed via Prisma. Deployed on Render with self-pinging to prevent free-tier spin-down.

## Features

- **Identity Reconciliation**: Links contacts by email/phone, managing primary and secondary contacts
- **REST API**: `/identify` for contact consolidation, `/health` for status checks
- **Swagger Docs**: Interactive API documentation at `/api-docs`
- **Self-Pinging**: Pings `/health` every 10 minutes to keep Render active
- **Logging**: Winston logs in `logs/error.log` and `logs/combined.log`
- **Testing**: Jest unit tests and Postman/Newman integration tests

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/33Surya66/Bitespeed.git
cd Bitespeed
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment
Create a `.env` file with the following configuration:
```plaintext
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name
RENDER_URL=https://bitespeed-identity-f3d4.onrender.com
PORT=3000
```

### 4. Run migrations
```bash
npx prisma migrate deploy
```

### 5. Start the server
```bash
npm start
```

## API Endpoints

### Identify Contact
- **URL**: `/identify`
- **Method**: `POST`
- **Body**:
```json
{
  "email": "string",
  "phoneNumber": "string"
}
```
- **Response**:
```json
{
  "contact": {
    "primaryContatctId": "number",
    "emails": ["string"],
    "phoneNumbers": ["string"],
    "secondaryContactIds": ["number"]
  }
}
```

### Health Check
- **URL**: `/health`
- **Method**: `GET`
- **Response**:
```json
{
  "status": "OK"
}
```

### API Documentation
- **URL**: `/api-docs`
- Interactive Swagger documentation

## Project Structure

```
bitespeed-identity-reconciliation/
├── src/
│   ├── controllers/
│   │   └── identifyController.ts     # Logic for /identify endpoint
│   ├── middlewares/
│   │   └── errorHandler.ts           # Error handling middleware
│   ├── utils/
│   │   └── logger.ts                 # Winston logger setup
│   └── index.ts                      # Main Express server setup
├── prisma/
│   └── schema.prisma                 # Prisma schema for Contact model
├── tests/
│   └── identifyController.test.ts    # Jest tests for /identify endpoint
├── logs/                             # Winston logs (error.log, combined.log)
├── bitespeed_tests.postman_collection.json    # Postman test collection
├── bitespeed_api.postman_environment.json     # Postman environment
├── package.json                      # Dependencies and scripts
└── README.md                         # Project documentation
```

## Testing

### Unit Tests
Run Jest unit tests:
```bash
npm test
```

### Postman/Newman Integration Tests
1. Import `bitespeed_tests.postman_collection.json` and `bitespeed_api.postman_environment.json`
2. Run Newman tests:
```bash
npm run test:postman
```

## Deployment

- **Hosting**: Render - https://bitespeed-identity-b1dq.onrender.com
- **Runtime**: Node.js 20.19.x
- **Database**: PostgreSQL

## Links

- **GitHub Repository**: https://github.com/33Surya66/Bitespeed
- **Live API**: https://bitespeed-identity-b1dq.onrender.com
- **API Documentation**: https://bitespeed-identity-b1dq.onrender.com/api-docs

