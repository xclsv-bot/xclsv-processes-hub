import { PrismaClient, UserRole, ProcessArea } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default roles
  const defaultRoles = [
    {
      name: 'Admin',
      description: 'Full system access - can manage users, processes, and settings',
      permissions: {
        users: { create: true, read: true, update: true, delete: true },
        processes: { create: true, read: true, update: true, delete: true, publish: true },
        settings: { read: true, update: true },
      },
    },
    {
      name: 'Manager',
      description: 'Can manage processes in their operational areas',
      permissions: {
        users: { create: false, read: true, update: false, delete: false },
        processes: { create: true, read: true, update: true, delete: false, publish: true },
        settings: { read: true, update: false },
      },
    },
    {
      name: 'Editor',
      description: 'Can create and edit process documentation',
      permissions: {
        users: { create: false, read: true, update: false, delete: false },
        processes: { create: true, read: true, update: true, delete: false, publish: false },
        settings: { read: false, update: false },
      },
    },
    {
      name: 'Viewer',
      description: 'Read-only access to published processes',
      permissions: {
        users: { create: false, read: false, update: false, delete: false },
        processes: { create: false, read: true, update: false, delete: false, publish: false },
        settings: { read: false, update: false },
      },
    },
  ];

  for (const role of defaultRoles) {
    await prisma.defaultRole.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions, description: role.description },
      create: role,
    });
    console.log(`  ✓ Created/updated role: ${role.name}`);
  }

  // Create admin user (Z)
  const adminUser = await prisma.user.upsert({
    where: { email: 'zaire@xclsvmedia.com' },
    update: {},
    create: {
      email: 'zaire@xclsvmedia.com',
      name: 'Zaire Williams',
      role: UserRole.ADMIN,
    },
  });
  console.log(`  ✓ Created admin user: ${adminUser.name}`);

  // Create initial tags for each operational area
  const areaTags = Object.values(ProcessArea).map((area) => ({
    name: area.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()),
    slug: area.toLowerCase().replace(/_/g, '-'),
    color: getAreaColor(area),
    description: `Processes related to ${area.replace(/_/g, ' ').toLowerCase()}`,
  }));

  for (const tag of areaTags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { color: tag.color, description: tag.description },
      create: tag,
    });
    console.log(`  ✓ Created/updated tag: ${tag.name}`);
  }

  console.log('\n✅ Seeding complete!');
}

function getAreaColor(area: ProcessArea): string {
  const colors: Record<ProcessArea, string> = {
    PARTNERSHIPS: '#3B82F6',           // Blue
    EVENT_SCHEDULING: '#10B981',       // Emerald
    EVENT_MARKETPLACE: '#8B5CF6',      // Violet
    AMBASSADOR_RECRUITMENT: '#F59E0B', // Amber
    AMBASSADOR_MANAGEMENT: '#EF4444',  // Red
    OPERATIONS: '#6366F1',             // Indigo
    CLIENT_MANAGEMENT: '#EC4899',      // Pink
    FINANCES: '#14B8A6',               // Teal
    AFFILIATE_MANAGEMENT: '#F97316',   // Orange
    PRODUCT_DEVELOPMENT: '#84CC16',    // Lime
  };
  return colors[area];
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
