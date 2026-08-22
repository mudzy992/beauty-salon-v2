import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const provider = process.env.DATABASE_PROVIDER?.toLowerCase() ?? 'postgres';
const url = process.env.DATABASE_URL;

if (provider !== 'postgres') {
  throw new Error(
    `Nepodržan DATABASE_PROVIDER: ${provider}. Seed koristi PostgreSQL.`,
  );
}

if (!url) throw new Error('DATABASE_URL nije postavljen.');

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const ROLES = [
  { name: 'SYSTEM_ADMIN', description: 'Sistemski administrator' },
  { name: 'OWNER', description: 'Vlasnik salona' },
  { name: 'STYLIST', description: 'Frizer/stilist' },
  { name: 'CLIENT', description: 'Klijent' },
];

async function main() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      create: role,
      update: { description: role.description },
    });
  }
  console.log('Seed: roleovi kreirani.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
