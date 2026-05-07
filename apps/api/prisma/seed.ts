/**
 * Seed: a demo user with a partial collection + a demo group with friends.
 * Run with: pnpm --filter @cromos/api seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateInviteCode, TOTAL_STICKERS } from '@cromos/shared';

const prisma = new PrismaClient();

async function hash(p: string) {
  return bcrypt.hash(p, 10);
}

/** Deterministic-ish "owned" generator so each demo user has a different but reproducible collection. */
function fakeCollection(seed: number, density: number): Record<number, number> {
  const out: Record<number, number> = {};
  let x = seed;
  for (let n = 1; n <= TOTAL_STICKERS; n++) {
    // simple LCG
    x = (x * 1664525 + 1013904223) >>> 0;
    const r = (x % 1000) / 1000;
    if (r < density) {
      // 80% singles, 15% double, 5% triple
      const pick = (x >>> 16) % 100;
      out[n] = pick < 80 ? 1 : pick < 95 ? 2 : 3;
    }
  }
  return out;
}

async function ensureUser(email: string, name: string, password: string, seed: number, density: number) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }
  const user = await prisma.user.create({
    data: { email, name, passwordHash: await hash(password) },
  });
  const coll = fakeCollection(seed, density);
  if (Object.keys(coll).length > 0) {
    await prisma.userSticker.createMany({
      data: Object.entries(coll).map(([num, count]) => ({
        userId: user.id,
        stickerNumber: Number(num),
        count,
      })),
    });
  }
  return user;
}

async function main() {
  const joao = await ensureUser('joao@cromos.test', 'João', 'cromos2026', 12345, 0.47);
  const maria = await ensureUser('maria@cromos.test', 'Maria', 'cromos2026', 67890, 0.62);
  const pedro = await ensureUser('pedro@cromos.test', 'Pedro', 'cromos2026', 24680, 0.38);

  // Demo group with João as creator + Maria & Pedro joined.
  const groupName = 'Café Friends';
  let group = await prisma.group.findFirst({ where: { name: groupName, createdById: joao.id } });
  if (!group) {
    group = await prisma.group.create({
      data: {
        name: groupName,
        code: generateInviteCode(),
        createdById: joao.id,
        memberships: {
          create: [
            { userId: joao.id, colorIdx: 0 },
            { userId: maria.id, colorIdx: 1 },
            { userId: pedro.id, colorIdx: 2 },
          ],
        },
      },
    });
  }

  console.log('\nSeeded:');
  console.log(`  • João  (joao@cromos.test  / cromos2026)`);
  console.log(`  • Maria (maria@cromos.test / cromos2026)`);
  console.log(`  • Pedro (pedro@cromos.test / cromos2026)`);
  console.log(`  • Group "${groupName}" — invite code: ${group.code}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
