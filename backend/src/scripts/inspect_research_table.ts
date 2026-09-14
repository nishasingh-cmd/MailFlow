import { prisma } from '../config/db';

async function main() {
  const allResearch = await prisma.companyResearch.findMany();
  console.log('CompanyResearch count:', allResearch.length);
  for (const r of allResearch) {
    console.log({
      id: r.id,
      leadId: r.leadId,
      companyId: r.companyId,
      status: r.status,
      summary: r.summary?.slice(0, 50),
    });
  }
}

main().finally(() => prisma.$disconnect());
