import express from 'express';
import { PrismaClient } from '@prisma/client';
import { identifyContact } from './controllers/identifyController';

const app = express();
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

app.use(express.json());

app.post('/identify', (req, res) => identifyContact(req, res, prisma));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
