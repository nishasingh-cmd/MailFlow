/**
 * MailFlow — Email AI Research Grounding & Regression Test Suite
 *
 * Verifies:
 * 1. Specific Regression Test: Elite Eventure (Mukesh Sharma)
 *    - MUST use Exhibition/Stall/Brand Activation context
 *    - MUST NOT contain "Healthcare Tech"
 *    - MUST NOT contain "15+ hours weekly"
 *    - MUST NOT contain "next Tuesday"
 *    - MUST NOT contain "at your scale"
 * 2. Pre-Send Validation Layer Enforcement (catches hallucinated industries, claims, dates, scale)
 * 3. Multi-Lead Grounding & Isolation (Elite Eventure, Adobe, Google, Instagram)
 * 4. Factual Integrity & Rejection of Missing/Mismatched Research
 */
import { prisma } from '../config/db';
import { EmailGenerationService } from '../modules/email-generation/email-generation.service';
import { EmailValidationService } from '../modules/email-generation/email-validation.service';

async function runGroundingTests() {
  console.log('🧪 [TEST SUITE] Starting Email AI Research Grounding & Regression Tests...\n');
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

  // 1. Setup Test User
  const testUser = await prisma.user.upsert({
    where: { email: 'email_grounding_test@example.com' },
    update: {},
    create: {
      email: 'email_grounding_test@example.com',
      name: 'Grounding Tester',
      password: 'testhash12345',
    },
  });

  const tenantB = await prisma.user.upsert({
    where: { email: 'tenant_b_grounding_test@example.com' },
    update: {},
    create: {
      email: 'tenant_b_grounding_test@example.com',
      name: 'Tenant B Tester',
      password: 'testhash12345',
    },
  });

  // Setup Test Leads with Completed Research
  const leadElite = await prisma.lead.create({
    data: {
      userId: testUser.id,
      name: 'Mukesh Sharma',
      email: 'mukesh@eliteeventure.test',
      company: 'Elite Eventure',
      website: 'https://www.eliteeventure.com/',
      industry: '', // Intentionally empty to test fallback to research
    },
  });

  await prisma.companyResearch.create({
    data: {
      leadId: leadElite.id,
      userId: testUser.id,
      companyNameAtResearchTime: 'Elite Eventure',
      status: 'COMPLETED',
      industry: 'Exhibition Stalls & Event Management',
      productsServices: [
        'Custom Exhibition Stalls',
        'Modular Expo Booths',
        'Brand Activation Displays',
      ],
      summary:
        'Elite Eventure is a premier exhibition stall design, fabrication, and brand activation agency.',
      painPoints: ['[Hypothesis] Meeting tight stall fabrication deadlines for trade expos'],
      opportunities: ['Engage corporate exhibitors with tailored stall presentations'],
      companySize: 'Not verified',
    },
  });

  const leadAdobe = await prisma.lead.create({
    data: {
      userId: testUser.id,
      name: 'Prashkal Jain',
      email: 'prashkal@adobe.test',
      company: 'Adobe',
      website: 'https://www.adobe.com',
    },
  });

  await prisma.companyResearch.create({
    data: {
      leadId: leadAdobe.id,
      userId: testUser.id,
      companyNameAtResearchTime: 'Adobe',
      status: 'COMPLETED',
      industry: 'Creative Software & Digital Experience',
      productsServices: ['Creative Cloud', 'Photoshop', 'Document Cloud'],
      summary:
        'Adobe is changing the world through digital experiences and creative software solutions.',
      companySize: '10,000+ employees',
    },
  });

  const leadGoogle = await prisma.lead.create({
    data: {
      userId: testUser.id,
      name: 'Pushpa Jain',
      email: 'pushpa@google.test',
      company: 'Google',
      website: 'https://www.google.com',
    },
  });

  await prisma.companyResearch.create({
    data: {
      leadId: leadGoogle.id,
      userId: testUser.id,
      companyNameAtResearchTime: 'Google',
      status: 'COMPLETED',
      industry: 'Search, Cloud Computing & Digital Advertising',
      productsServices: ['Google Search', 'Google Cloud Platform', 'Google Workspace'],
      summary:
        'Google provides search, cloud computing, online advertising technologies, and software.',
      companySize: '100,000+ employees',
    },
  });

  const leadInsta = await prisma.lead.create({
    data: {
      userId: testUser.id,
      name: 'Nisha Singh',
      email: 'nisha@instagram.test',
      company: 'Instagram',
      website: 'https://www.instagram.com',
    },
  });

  await prisma.companyResearch.create({
    data: {
      leadId: leadInsta.id,
      userId: testUser.id,
      companyNameAtResearchTime: 'Instagram',
      status: 'COMPLETED',
      industry: 'Social Media & Digital Content Creation',
      productsServices: ['Photo and Video Sharing', 'Reels', 'Direct Messaging'],
      summary: 'Instagram is a social media and photo/video sharing platform.',
      companySize: 'Not verified',
    },
  });

  try {
    console.log('--- TEST 1: Specific Regression Test for Elite Eventure (Mukesh Sharma) ---');
    const eliteEmail = await EmailGenerationService.generateEmailForLead(testUser.id, {
      leadId: leadElite.id,
      template: 'Cold Outreach',
    });

    const eliteFullText = `${eliteEmail.selectedSubject}\n${eliteEmail.body}`.toLowerCase();
    console.log(`Generated Elite Eventure Email Preview:\n${eliteEmail.body}\n`);

    assert(!eliteFullText.includes('healthcare tech'), 'Does NOT contain "Healthcare Tech"');
    assert(!eliteFullText.includes('healthcare'), 'Does NOT contain "healthcare"');
    assert(!eliteFullText.includes('15+ hours weekly'), 'Does NOT contain "15+ hours weekly"');
    assert(!eliteFullText.includes('15+ hours'), 'Does NOT contain "15+ hours"');
    assert(
      !eliteFullText.includes('next tuesday'),
      'Does NOT contain invented date "next Tuesday"'
    );
    assert(
      !eliteFullText.includes('at your scale'),
      'Does NOT contain unsupported claim "at your scale"'
    );
    assert(
      !eliteFullText.includes("at elite eventure's scale"),
      'Does NOT contain "at Elite Eventure\'s scale"'
    );

    const hasExhibitionContext =
      eliteFullText.includes('exhibition') ||
      eliteFullText.includes('stall') ||
      eliteFullText.includes('booth') ||
      eliteFullText.includes('brand activation');
    assert(
      hasExhibitionContext,
      'Email body contains verified Exhibition / Stall / Brand Activation context'
    );

    const hasCorrectGreeting =
      eliteEmail.body.startsWith('Hi Mukesh,') || eliteEmail.body.startsWith('Hi mukesh,');
    assert(
      hasCorrectGreeting,
      'Greeting addresses lead by first name without inventing a job title'
    );

    console.log('\n--- TEST 2: EmailValidationService Direct Enforcement ---');
    const invalidEmailContent = {
      subject: 'Quick idea for Elite Eventure Healthcare Tech',
      body: `Hi Mukesh,\n\nI noticed Elite Eventure's work in Healthcare Tech. Many teams at your scale struggle with outreach.\n\nAt MailFlow, our engine saves teams 15+ hours weekly.\n\nAre you open to a brief 10-minute chat next Tuesday?\n\nBest regards,\nNisha`,
    };

    const validation = EmailValidationService.validateEmailContent(
      invalidEmailContent.subject,
      invalidEmailContent.body,
      {
        leadId: leadElite.id,
        leadName: 'Mukesh Sharma',
        companyName: 'Elite Eventure',
        verifiedIndustry: 'Exhibition Stalls & Event Management',
        verifiedProductsServices: ['Custom Exhibition Stalls'],
        verifiedSummary: 'Premier exhibition stall design and fabrication',
        jobTitle: null,
      }
    );

    assert(!validation.isValid, 'Validation correctly flags invalid email');
    assert(
      validation.violations.some((v) => v.toLowerCase().includes('healthcare')),
      'Flags hallucinated healthcare industry'
    );
    assert(
      validation.violations.some((v) => v.includes('15+ hours')),
      'Flags unsupported 15+ hours weekly claim'
    );
    assert(
      validation.violations.some((v) => v.toLowerCase().includes('tuesday')),
      'Flags invented meeting date "next Tuesday"'
    );
    assert(
      validation.violations.some((v) => v.toLowerCase().includes('scale')),
      'Flags unsupported scale claim'
    );
    assert(
      validation.repairedBody !== undefined && !validation.repairedBody.includes('next Tuesday'),
      'Repaired body eliminates "next Tuesday"'
    );

    console.log('\n--- TEST 3: Multi-Lead Grounding & Cross-Contamination Isolation ---');
    const [adobeEmail, googleEmail, instaEmail] = await Promise.all([
      EmailGenerationService.generateEmailForLead(testUser.id, {
        leadId: leadAdobe.id,
        template: 'Cold Outreach',
      }),
      EmailGenerationService.generateEmailForLead(testUser.id, {
        leadId: leadGoogle.id,
        template: 'Cold Outreach',
      }),
      EmailGenerationService.generateEmailForLead(testUser.id, {
        leadId: leadInsta.id,
        template: 'Cold Outreach',
      }),
    ]);

    const adobeText = `${adobeEmail.selectedSubject}\n${adobeEmail.body}`.toLowerCase();
    const googleText = `${googleEmail.selectedSubject}\n${googleEmail.body}`.toLowerCase();
    const instaText = `${instaEmail.selectedSubject}\n${instaEmail.body}`.toLowerCase();

    // Adobe check
    assert(adobeText.includes('adobe'), 'Adobe email contains "Adobe"');
    assert(
      adobeText.includes('creative') ||
        adobeText.includes('photoshop') ||
        adobeText.includes('digital experience'),
      'Adobe email contains Adobe-specific creative/digital software context'
    );
    assert(
      !adobeText.includes('exhibition stall'),
      'Adobe email does NOT leak Elite Eventure context'
    );

    // Google check
    assert(googleText.includes('google'), 'Google email contains "Google"');
    assert(
      googleText.includes('cloud') ||
        googleText.includes('search') ||
        googleText.includes('advertising') ||
        googleText.includes('workspace'),
      'Google email contains Google-specific cloud/search context'
    );
    assert(!googleText.includes('creative cloud'), 'Google email does NOT leak Adobe context');

    // Instagram check
    assert(instaText.includes('instagram'), 'Instagram email contains "Instagram"');
    assert(
      instaText.includes('social media') ||
        instaText.includes('photo') ||
        instaText.includes('video') ||
        instaText.includes('content'),
      'Instagram email contains Instagram-specific social/media context'
    );
    assert(
      !instaText.includes('stall fabrication'),
      'Instagram email does NOT leak Elite Eventure context'
    );

    console.log('\n--- TEST 4: Lead/Research Integrity & Mismatch Blocking ---');
    // Test 4a: Missing research lead
    const leadNoResearch = await prisma.lead.create({
      data: {
        userId: testUser.id,
        name: 'No Research Lead',
        email: 'noresearch@example.test',
        company: 'Unresearched Corp',
      },
    });

    let missingResearchBlocked = false;
    try {
      await EmailGenerationService.generateEmailForLead(testUser.id, { leadId: leadNoResearch.id });
    } catch (err: unknown) {
      if ((err as Error).message.includes('RESEARCH_MISSING')) {
        missingResearchBlocked = true;
      }
    }
    assert(missingResearchBlocked, 'Generation is BLOCKED when company research is missing');

    // Test 4b: Multi-tenant access violation
    let tenantViolationBlocked = false;
    try {
      await EmailGenerationService.generateEmailForLead(tenantB.id, { leadId: leadElite.id });
    } catch (err: unknown) {
      if ((err as Error).message.includes('LEAD_NOT_FOUND')) {
        tenantViolationBlocked = true;
      }
    }
    assert(tenantViolationBlocked, 'Tenant B is BLOCKED from generating email for Tenant A lead');

    console.log(`\n🎉 ALL ${passedCount}/${totalCount} GROUNDING & REGRESSION TESTS PASSED!`);
  } finally {
    console.log('\n🧹 Cleaning up test leads and users...');
    await prisma.companyResearch.deleteMany({
      where: { leadId: { in: [leadElite.id, leadAdobe.id, leadGoogle.id, leadInsta.id] } },
    });
    await prisma.lead.deleteMany({
      where: { userId: { in: [testUser.id, tenantB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUser.id, tenantB.id] } },
    });
    console.log('Cleanup completed.');
  }
}

runGroundingTests()
  .catch((err) => {
    console.error('Grounding Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
