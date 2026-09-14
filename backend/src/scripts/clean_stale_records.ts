import { prisma } from '../config/db';

async function main() {
  // Delete all old CompanyResearch rows that have no leadId (orphaned contaminated rows)
  const deleted = await prisma.companyResearch.deleteMany({
    where: { leadId: null },
  });
  console.log(`Deleted ${deleted.count} stale/orphaned research rows without leadId.`);
}

main().finally(() => prisma.$disconnect());
