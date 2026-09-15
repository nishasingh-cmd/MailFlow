/**
 * Research Isolation Integration Test
 * Verifies:
 * 1. Company Distinctness: Different leads with different companies get distinct research.
 * 2. Strict Per-Lead Isolation: Each lead has its own independent CompanyResearch row.
 * 3. Concurrent Research Safety: Concurrent calls complete without race conditions.
 * 4. Multi-Tenant Isolation: Another user cannot read or mutate lead research.
 */
import { prisma } from '../config/db';
import { ResearchService } from '../modules/research/research.service';

async function runTests() {
  console.log('🧪 [TEST SUITE] Starting AI Company Research Isolation & Accuracy Tests...\n');
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, description: string) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      throw new Error(`Assertion failed: ${description}`);
    }
  }

  // 1. Setup Test Users
  const userA = await prisma.user.upsert({
    where: { email: 'tenant_a_research_test@example.com' },
    update: {},
    create: {
      email: 'tenant_a_research_test@example.com',
      name: 'Tenant A',
      password: 'testhash',
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: 'tenant_b_research_test@example.com' },
    update: {},
    create: {
      email: 'tenant_b_research_test@example.com',
      name: 'Tenant B',
      password: 'testhash',
    },
  });

  // 2. Setup Distinct Test Leads for User A
  const leadAdobe = await prisma.lead.create({
    data: {
      userId: userA.id,
      name: 'John Adobe',
      email: 'john@adobe.com',
      company: 'Adobe',
      website: 'https://www.adobe.com',
    },
  });

  const leadElite = await prisma.lead.create({
    data: {
      userId: userA.id,
      name: 'Mukesh Elite',
      email: 'mukesh@eliteeventure.com',
      company: 'Elite Eventure',
      website: 'https://www.eliteeventure.com/',
    },
  });

  const leadGoogle = await prisma.lead.create({
    data: {
      userId: userA.id,
      name: 'Sundar Google',
      email: 'sundar@google.com',
      company: 'Google',
      website: 'https://www.google.com',
    },
  });

  try {
    console.log('--- TEST 1: Run Research on Distinct Leads ---');
    const [resAdobe, resElite, resGoogle] = await Promise.all([
      ResearchService.researchCompany(userA.id, leadAdobe.id, true),
      ResearchService.researchCompany(userA.id, leadElite.id, true),
      ResearchService.researchCompany(userA.id, leadGoogle.id, true),
    ]);

    assert(resAdobe.status === 'COMPLETED', 'Adobe research status is COMPLETED');
    assert(resElite.status === 'COMPLETED', 'Elite Eventure research status is COMPLETED');
    assert(resGoogle.status === 'COMPLETED', 'Google research status is COMPLETED');

    console.log('\n--- TEST 2: Company-Specific Accuracy & Distinction ---');
    const summaryAdobe = (resAdobe.research as { summary?: string })?.summary || '';
    const summaryElite = (resElite.research as { summary?: string })?.summary || '';
    const summaryGoogle = (resGoogle.research as { summary?: string })?.summary || '';

    assert(summaryAdobe !== summaryElite, 'Adobe summary must NOT match Elite Eventure summary');
    assert(summaryElite !== summaryGoogle, 'Elite Eventure summary must NOT match Google summary');
    assert(summaryAdobe !== summaryGoogle, 'Adobe summary must NOT match Google summary');

    assert(
      !summaryAdobe.includes('domain-focused business capabilities') &&
        !summaryElite.includes('domain-focused business capabilities') &&
        !summaryGoogle.includes('domain-focused business capabilities'),
      'None of the summaries contain the old fake boilerplate'
    );

    assert(
      summaryAdobe.toLowerCase().includes('adobe') ||
        summaryAdobe.toLowerCase().includes('digital') ||
        summaryAdobe.toLowerCase().includes('creative'),
      'Adobe research contains Adobe-specific creative/digital terms'
    );

    assert(
      summaryElite.toLowerCase().includes('exhibition') ||
        summaryElite.toLowerCase().includes('stall') ||
        summaryElite.toLowerCase().includes('elite'),
      'Elite Eventure research contains exhibition/stall terms'
    );

    console.log('\n--- TEST 3: Strict Per-Lead Database Isolation ---');
    const dbResearchAdobe = await prisma.companyResearch.findUnique({
      where: { leadId: leadAdobe.id },
    });
    const dbResearchElite = await prisma.companyResearch.findUnique({
      where: { leadId: leadElite.id },
    });

    assert(dbResearchAdobe !== null, 'Lead Adobe has its own CompanyResearch row');
    assert(dbResearchElite !== null, 'Lead Elite has its own CompanyResearch row');
    assert(dbResearchAdobe?.id !== dbResearchElite?.id, 'Each lead has a distinct Research ID');
    assert(dbResearchAdobe?.leadId === leadAdobe.id, 'dbResearchAdobe leadId matches leadAdobe.id');
    assert(dbResearchElite?.leadId === leadElite.id, 'dbResearchElite leadId matches leadElite.id');

    console.log('\n--- TEST 4: Multi-Tenant Access Isolation ---');
    let tenantViolationBlocked = false;
    try {
      await ResearchService.getResearchByLead(userB.id, leadAdobe.id);
    } catch (err: unknown) {
      if ((err as Error).message.includes('LEAD_NOT_FOUND')) {
        tenantViolationBlocked = true;
      }
    }
    assert(
      tenantViolationBlocked,
      'Tenant B cannot read Tenant A lead research (LEAD_NOT_FOUND thrown)'
    );

    const unauthorizedRes = await ResearchService.researchCompany(userB.id, leadAdobe.id, true);
    assert(
      Boolean(
        unauthorizedRes.status === 'FAILED' && unauthorizedRes.error?.includes('Lead not found')
      ),
      'Tenant B cannot re-research Tenant A lead (returns FAILED status and error)'
    );

    console.log(`\n🎉 ALL ${passedCount}/${totalCount} TESTS PASSED SUCCESSFULLY!`);
  } finally {
    // Cleanup test data
    console.log('\n🧹 Cleaning up test leads and users...');
    await prisma.companyResearch.deleteMany({
      where: { leadId: { in: [leadAdobe.id, leadElite.id, leadGoogle.id] } },
    });
    await prisma.lead.deleteMany({
      where: { id: { in: [leadAdobe.id, leadElite.id, leadGoogle.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
    console.log('Cleanup completed.');
  }
}

runTests()
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
