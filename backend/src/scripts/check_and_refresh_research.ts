import { prisma } from '../config/db';
import { ResearchService } from '../modules/research/research.service';

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log('Users found:', users);

  for (const user of users) {
    const leads = await prisma.lead.findMany({
      where: { userId: user.id },
      include: {
        research: true,
        companyRef: true,
      },
    });

    console.log(`\n========================================`);
    console.log(`User: ${user.email} (Total leads: ${leads.length})`);
    console.log(`========================================`);

    for (const lead of leads) {
      const research = lead.research;
      console.log(
        `\nLead [${lead.id}]: "${lead.name}" (${lead.email}) | Company: "${lead.company}" | Website: "${lead.website}"`
      );
      console.log(`  Current Status: ${research?.status || 'NO_RESEARCH'}`);
      if (research?.summary) {
        console.log(`  Current Summary: ${research.summary.slice(0, 100)}...`);
      }

      // Re-research with live evidence and true per-lead isolation
      console.log(`  -> Triggering fresh isolated research for lead ${lead.id}...`);
      try {
        const result = await ResearchService.researchCompany(user.id, lead.id, true);
        console.log(`  -> New Status: ${result.status}`);
        console.log(`  -> Company: ${result.companyName}`);
        const r = result.research as Record<string, unknown>;
        console.log(`  -> Summary: ${r?.summary?.slice(0, 120)}...`);
        console.log(`  -> Products:`, r?.productsServices);
        console.log(
          `  -> Sources:`,
          r?.sources?.map((s: { url?: string; name?: string }) => s.url || s.name)
        );
      } catch (err) {
        console.error(`  -> Failed:`, err);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
