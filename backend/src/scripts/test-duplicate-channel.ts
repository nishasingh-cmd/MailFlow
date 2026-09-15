import { PrismaClient } from '@prisma/client';
import { CampaignsService } from '../modules/campaigns/campaigns.service';

const prisma = new PrismaClient();

async function runTests() {
  console.log('=== STARTING CAMPAIGN DUPLICATION TEST SUITE ===');

  // Find or use an existing user
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error('No user found in database to run tests against');
  }
  const userId = user.id;
  console.log(`Using test userId: ${userId}`);

  const createdCampaignIds: string[] = [];

  try {
    // ----------------------------------------------------
    // TEST 1: EMAIL campaign -> duplicate -> EMAIL
    // ----------------------------------------------------
    console.log('\n--- TEST 1: EMAIL -> EMAIL ---');
    const emailCampaign = await prisma.campaign.create({
      data: {
        userId,
        name: 'Test Email Source Campaign',
        channel: 'EMAIL',
        templateId: 'Cold Outreach',
        status: 'READY',
      },
    });
    createdCampaignIds.push(emailCampaign.id);

    const emailCopy = await CampaignsService.duplicateCampaign(userId, emailCampaign.id);
    createdCampaignIds.push(emailCopy.id);

    console.log(
      `Original Channel: ${emailCampaign.channel}, Duplicate Channel: ${emailCopy.channel}`
    );
    if (emailCopy.channel !== 'EMAIL') {
      throw new Error(`TEST 1 FAILED: Expected EMAIL, got ${emailCopy.channel}`);
    }
    console.log('✓ TEST 1 PASSED: EMAIL duplicated to EMAIL');

    // ----------------------------------------------------
    // TEST 2: WHATSAPP campaign -> duplicate -> WHATSAPP
    // ----------------------------------------------------
    console.log('\n--- TEST 2: WHATSAPP -> WHATSAPP ---');
    const waCampaign = await prisma.campaign.create({
      data: {
        userId,
        name: 'Test WhatsApp Source Campaign',
        channel: 'WHATSAPP',
        templateId: 'cold_outreach',
        status: 'READY',
      },
    });
    createdCampaignIds.push(waCampaign.id);

    const waCopy = await CampaignsService.duplicateCampaign(userId, waCampaign.id);
    createdCampaignIds.push(waCopy.id);

    console.log(`Original Channel: ${waCampaign.channel}, Duplicate Channel: ${waCopy.channel}`);
    if (waCopy.channel !== 'WHATSAPP') {
      throw new Error(`TEST 2 FAILED: Expected WHATSAPP, got ${waCopy.channel}`);
    }
    console.log('✓ TEST 2 PASSED: WHATSAPP duplicated to WHATSAPP');

    // ----------------------------------------------------
    // TEST 3 & 4: MULTI_CHANNEL -> duplicate -> MULTI_CHANNEL
    // ----------------------------------------------------
    console.log('\n--- TEST 3 & 4: MULTI_CHANNEL (EMAIL_AND_WHATSAPP) -> MULTI_CHANNEL ---');
    const multiCampaign = await prisma.campaign.create({
      data: {
        userId,
        name: 'Test Multi Channel Campaign',
        channel: 'EMAIL_AND_WHATSAPP',
        templateId: 'Follow-up',
        status: 'COMPLETED',
        sendingSpeed: 'FAST',
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
    createdCampaignIds.push(multiCampaign.id);

    const multiCopy = await CampaignsService.duplicateCampaign(userId, multiCampaign.id);
    createdCampaignIds.push(multiCopy.id);

    console.log(
      `Original Channel: ${multiCampaign.channel}, Duplicate Channel: ${multiCopy.channel}`
    );
    if (multiCopy.channel !== 'EMAIL_AND_WHATSAPP') {
      throw new Error(`TEST 3 FAILED: Expected EMAIL_AND_WHATSAPP, got ${multiCopy.channel}`);
    }
    if ((multiCopy.channel as string) === 'EMAIL') {
      throw new Error('TEST 3 REGRESSION FAILED: Channel silently became EMAIL!');
    }
    if (multiCopy.templateId !== 'Follow-up') {
      throw new Error(
        `TEST 4 FAILED: Expected templateId 'Follow-up', got ${multiCopy.templateId}`
      );
    }
    if (multiCopy.sendingSpeed !== 'FAST') {
      throw new Error(`TEST 4 FAILED: Expected sendingSpeed 'FAST', got ${multiCopy.sendingSpeed}`);
    }
    console.log('✓ TEST 3 & 4 PASSED: MULTI_CHANNEL and configuration preserved');

    // ----------------------------------------------------
    // TEST 5: Verify new campaign ID is different
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Verify new campaign ID is unique ---');
    if (multiCopy.id === multiCampaign.id) {
      throw new Error('TEST 5 FAILED: Duplicate ID matches source ID');
    }
    console.log(`✓ TEST 5 PASSED: Unique ID generated (${multiCopy.id} != ${multiCampaign.id})`);

    // ----------------------------------------------------
    // TEST 6: Verify original campaign remains unchanged
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Verify original campaign unchanged ---');
    const reloadedOriginal = await prisma.campaign.findUnique({ where: { id: multiCampaign.id } });
    if (reloadedOriginal?.channel !== 'EMAIL_AND_WHATSAPP') {
      throw new Error('TEST 6 FAILED: Original campaign channel changed!');
    }
    if (reloadedOriginal?.status !== 'COMPLETED') {
      throw new Error('TEST 6 FAILED: Original campaign status changed!');
    }
    console.log('✓ TEST 6 PASSED: Original campaign completely intact');

    // ----------------------------------------------------
    // TEST 7: Verify clean runtime state (status=DRAFT, no queues, no startedAt)
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Verify clean runtime state ---');
    if (multiCopy.status !== 'DRAFT') {
      throw new Error(`TEST 7 FAILED: Duplicate status is ${multiCopy.status}, expected DRAFT`);
    }
    const freshCopyFromDb = await prisma.campaign.findUnique({
      where: { id: multiCopy.id },
      include: {
        emailQueues: true,
        emailLogs: true,
        whatsappQueues: true,
        whatsappLogs: true,
      },
    });
    if (freshCopyFromDb?.startedAt !== null || freshCopyFromDb?.completedAt !== null) {
      throw new Error('TEST 7 FAILED: Duplicate retained runtime startedAt/completedAt');
    }
    if (
      freshCopyFromDb.emailQueues.length > 0 ||
      freshCopyFromDb.emailLogs.length > 0 ||
      freshCopyFromDb.whatsappQueues.length > 0 ||
      freshCopyFromDb.whatsappLogs.length > 0
    ) {
      throw new Error('TEST 7 FAILED: Runtime queues or logs were copied!');
    }
    console.log('✓ TEST 7 PASSED: Clean runtime state (status=DRAFT, no logs/queues)');

    // ----------------------------------------------------
    // TEST 8: Duplicate multiple times sequentially
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Sequential multiple duplications ---');
    const copyA = await CampaignsService.duplicateCampaign(userId, multiCampaign.id);
    createdCampaignIds.push(copyA.id);
    const copyB = await CampaignsService.duplicateCampaign(userId, multiCampaign.id);
    createdCampaignIds.push(copyB.id);

    if (copyA.channel !== 'EMAIL_AND_WHATSAPP' || copyB.channel !== 'EMAIL_AND_WHATSAPP') {
      throw new Error('TEST 8 FAILED: Subsequent duplicates did not retain EMAIL_AND_WHATSAPP');
    }
    console.log('✓ TEST 8 PASSED: Both sequential copies retain EMAIL_AND_WHATSAPP');

    console.log('\n=============================================');
    console.log('ALL 8 CAMPAIGN DUPLICATION TESTS PASSED SUCCESSFULLY! ✓');
    console.log('=============================================\n');
  } finally {
    // Cleanup created test campaigns
    console.log(`Cleaning up ${createdCampaignIds.length} test campaigns...`);
    await prisma.campaign.deleteMany({
      where: { id: { in: createdCampaignIds } },
    });
    await prisma.$disconnect();
    console.log('Cleanup completed.');
  }
}

runTests().catch((err) => {
  console.error('TEST RUN FAILED:', err);
  process.exit(1);
});
