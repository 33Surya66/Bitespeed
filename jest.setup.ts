import { prisma } from './src/index';

beforeEach(async () => {
  await prisma.contact.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});