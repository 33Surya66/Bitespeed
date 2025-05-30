import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { identifyContact } from './controllers/identifyController';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.post('/identify', identifyContact);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});