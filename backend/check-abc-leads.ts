import { prisma } from './src/config/db';

async function checkUserLeads() {
  const user = await prisma.user.findFirst({
    where: { email: { contains: 'abc' } },
    include: { leads: true },
  });

  if (!user) {
    console.log('No user with email containing abc found');
    const allUsers = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
    console.log('All users:', allUsers);
    return;
  }

  console.log('Found user:', user.name, user.email, 'ID:', user.id);
  console.log('Leads count:', user.leads.length);
  console.log(
    JSON.stringify(
      user.leads.map((l) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        company: l.company,
      })),
      null,
      2
    )
  );
}

checkUserLeads()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
