# Bitespeed Identity Reconciliation

This is a backend service for the Bitespeed Identity Reconciliation task. It provides an `/identify` endpoint to consolidate customer contact information based on email and phone number, using a PostgreSQL database managed with Prisma. The service is deployed on Render, includes self-pinging to prevent free-tier spin-down, and supports comprehensive testing and documentation.

## Features

- **Identity Reconciliation**: Consolidates contacts based on email and phone number, creating primary and secondary contacts.
- **REST API**: Exposes `/identify` for contact management and `/health` for service status.
- **Swagger Documentation**: Interactive API docs at `/api-docs`.
- **Self-Pinging**: Keeps the Render service active by pinging `/health` every 10 minutes.
- **Logging**: Uses Winston for structured logging (`logs/error.log`, `logs/combined.log`).
- **Testing**: Unit tests with Jest and integration tests with Postman/Newman.
- **CI/CD**: Automated via GitHub Actions for linting, testing, and deployment.
- **Docker Support**: Containerized for local and production environments.

## Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/33Surya66/Bitespeed.git
   cd Bitespeed
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up PostgreSQL**:
   - **Option 1: Local PostgreSQL**:
     - Install PostgreSQL: https://www.postgresql.org/download/
     - Create a database named `bitespeed`:
       ```sql
       CREATE DATABASE bitespeed;
       ```
     - Update `.env` with:
       ```plaintext
       DATABASE_URL=postgresql://postgres:your_password@localhost:5432/bitespeed?schema=public
       ```
   - **Option 2: Neon.tech (Recommended)**:
     - Sign up at https://neon.tech and create a project.
     - Copy the connection string to `.env`:
       ```plaintext
       DATABASE_URL=postgresql://username:password@ep-weathered-scene-a8vaboer-pooler.eastus2.azure.neon.tech/neondb?sslmode=require
       ```

4. **Configure self-pinging**:
   - Add to `.env`:
     ```plaintext
     RENDER_URL=https://bitespeed-identity.onrender.com
     ```

5. **Run database migrations**:
   ```bash
   npx prisma migrate dev --name init
   ```

6. **Start the server**:
   ```bash
   npm run dev
   ```

## API Endpoints

- **Identify Contact**:
  - **URL**: `/identify`
  - **Method**: POST
  - **Content-Type**: `application/json`
  - **Request Body**:
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
        "primaryContatctId": number,
        "emails": string[],
        "phoneNumbers": string[],
        "secondaryContactIds": number[]
      }
    }
    ```

- **Health Check**:
  - **URL**: `/health`
  - **Method**: GET
  - **Response**:
    ```json
    {
      "status": "OK"
    }
    ```

- **API Documentation**:
  - **URL**: `/api-docs`
  - **Description**: Swagger UI for interactive API documentation.

## Testing

**Unit Tests**:
```bash
npm run test
```

**Integration Tests with Postman**:
1. Import `bitespeed_tests.postman_collection.json` and `bitespeed_api.postman_environment.json` into Postman.
2. Set the `baseUrl` environment variable to `http://localhost:3000` (local) or `https://bitespeed-identity.onrender.com` (deployed).
3. Run the `Bitespeed Identity Reconciliation Tests` collection to test:
   - Create New Primary Contact
   - Link Secondary Contact
   - Merge Primary Contacts
   - Only Email
   - Only PhoneNumber
   - Invalid Request
4. Check **Test Results** in the Tests tab.

**Using Newman (CLI)**:
```bash
npm install -g newman
newman run bitespeed_tests.postman_collection.json -e bitespeed_api.postman_environment.json
```

**Example cURL**:
```bash
curl -X POST https://bitespeed-identity.onrender.com/identify \
-H "Content-Type: application/json" \
-d '{"email":"lorraine@hillvalley.edu","phoneNumber":"123456"}'
```

## Development

- **Linting**: `npm run lint`
- **Fix Linting Errors**: `npm run lint:fix`
- **Formatting**: `npm run format`
- **Generate Swagger Docs**: `npm run docs`
- **Build**: `npm run build`
- **Contributing**: See `CONTRIBUTING.md`
- **License**: See `LICENSE`
- **Code of Conduct**: See `CODE_OF_CONDUCT.md`

## Deployment

The service is deployed on Render as a Web Service at: `https://bitespeed-identity.onrender.com/identify`

- **CI/CD**: Automated via GitHub Actions (see `.github/workflows/deploy.yml` and `.github/workflows/test.yml`).
- **Database**: Neon.tech PostgreSQL (`ep-weathered-scene-a8vaboer-pooler.eastus2.azure.neon.tech`).
- **Build Command**: `npm run deploy` (runs `npm install && npx prisma migrate deploy && npm run build`).
- **Start Command**: `npm start` (runs `node dist/index.js`).
- **Environment Variables**:
  - `DATABASE_URL`: Neon.tech connection string (set in Render Dashboard).
  - `PORT`: `10000` (Render default).
  - `RENDER_URL`: `https://bitespeed-identity.onrender.com` (for self-pinging).
  - `NODE_VERSION`: `20` (ensures dependency compatibility).
- **Secrets**: `RENDER_API_KEY` and `RENDER_SERVICE_ID` in GitHub Actions.
- **Self-Pinging**: Pings `/health` every 10 minutes to prevent Render free-tier spin-down.
- **Render Optimization**: `.renderignore` excludes non-essential files to speed up builds.
- **Troubleshooting**:
  - **Build Failure (e.g., `TS6059`)**: Ensure `tsconfig.json` excludes `jest.config.ts`. Run `npm run build` locally to debug.
  - **Node Version Issues**: Set `NODE_VERSION=20` in Render’s Environment settings.
  - **Database Errors**: Verify `DATABASE_URL` and run `npx prisma migrate deploy` locally to test migrations.
  - **Redeploy**: Use **Manual Deploy** > **Deploy latest commit** (clear cache if needed) in Render Dashboard.
  - **Logs**: Check Render logs for build, runtime, or self-pinging errors.

## Docker

Build and run locally:
```bash
docker build -t bitespeed-identity .
docker run -p 3000:10000 --env-file .env bitespeed-identity
```

## Logging

Logs are managed with Winston and stored in:
- `logs/error.log` (error logs)
- `logs/combined.log` (all logs, including self-pinging)

## Project Structure

```
├── src/
│   ├── controllers/        # API route handlers
│   ├── middlewares/        # Custom middleware (e.g., errorHandler)
│   ├── utils/              # Utilities (e.g., logger)
│   ├── __tests__/          # Jest unit tests
│   └── index.ts            # Express server setup
├── prisma/                 # Prisma schema and migrations
├── logs/                   # Winston log files
├── docs/                   # Swagger output
├── .github/workflows/      # GitHub Actions for CI/CD
├── jest.config.ts          # Jest configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
├── .env.example            # Environment variable template
├── .gitignore              # Git ignore patterns
├── .renderignore           # Render build ignore patterns
├── Dockerfile              # Docker configuration
├── swagger.json            # Swagger API definition
├── bitespeed_tests.postman_collection.json  # Postman tests
├── bitespeed_api.postman_environment.json   # Postman environment
├── CONTRIBUTING.md         # Contribution guidelines
├── LICENSE                 # MIT License
├── CODE_OF_CONDUCT.md      # Community standards
└── README.md               # Project documentation
```

## Requirements

- **Node.js**: v20
- **TypeScript**: v5.3.3
- **PostgreSQL**: v12 or higher (local or Neon.tech)
- **Render**: Free-tier Web Service
- **GitHub**: For CI/CD integration
- **Postman**: For API testing