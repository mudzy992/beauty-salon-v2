import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Kreira (ili osvježava) DVA testna naloga za rendered a11y (axe) testove:
 *
 *   admin   → uloge `SYSTEM_ADMIN` + `OWNER`
 *   stylist → uloga `STYLIST` + `StylistProfile(status: ACTIVE)`
 *
 * Zašto ovaj skript uopće postoji
 * ───────────────────────────────
 * `prisma/seed.ts` kreira **samo 4 uloge, nijednog korisnika**. Bez naloga
 * `e2e/auth.setup.ts` nema čime da se prijavi, pa se admin/stylist axe testovi
 * preskoče — a jedini nalozi koji postoje su na **produkcijskoj** bazi. Ovaj skript je
 * zamjena za to: pokreće se nad **jednokratnom lokalnom** bazom i pravi naloge s
 * lozinkama iz okruženja.
 *
 * Zašto admin dobija i `OWNER`: `pages/Dashboard.tsx:19-20` gate-uje outbox dijagnostiku s
 * `role === 'SYSTEM_ADMIN' || role === 'OWNER'`. Bez toga axe ne bi vidio taj panel.
 *
 * Zašto stilisti treba profil: `/stylist/**` stranice čitaju `StylistProfile`, a default
 * status je `PENDING` (`schema.prisma`, `enum StylistProfileStatus { PENDING ACTIVE }`).
 *
 * 🔑 Kredencijali se NIKAD ne hardkoduju — isti env varovi koje čita `e2e/auth.setup.ts`:
 *   E2E_ADMIN_USER / E2E_ADMIN_PASS / E2E_STYLIST_USER / E2E_STYLIST_PASS
 *
 * 🔴 Sigurnosna kočnica: skript **odbija** raditi ako `DATABASE_URL` ne pokazuje na
 * localhost, osim uz izričiti `E2E_ALLOW_REMOTE_DB=1`. Razlog je upravo taj što je jedina
 * baza s pravim nalozima produkcijska — ovo ne smije slučajno pisati po njoj.
 *
 * Upotreba:
 *   cd backend && npm run e2e:users
 */

const SALT_ROUNDS = 10; // isto kao `src/auth/auth.service.ts:24`

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Baca ako `DATABASE_URL` ne izgleda kao lokalna baza.
 *
 * Namjerno strogo: heuristika po imenu baze ("dev", "test") je nepouzdana, pa se gleda
 * samo host. `E2E_ALLOW_REMOTE_DB=1` je svjesni izuzetak (npr. staging), uz glasno
 * upozorenje — a ne nešto što prolazi slučajno.
 */
function assertNijeUdaljenaBaza(url: string): string {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^\[|\]$/g, '');
  } catch {
    host = '';
  }

  if (!host) {
    throw new Error('DATABASE_URL nije ispravan URL — ne mogu pročitati host.');
  }

  if (LOCAL_HOSTS.has(host)) return host;

  if (process.env.E2E_ALLOW_REMOTE_DB === '1') {
    console.warn('');
    console.warn(
      `⚠️  E2E_ALLOW_REMOTE_DB=1 — pišem po UDALJENOJ bazi (host: ${host}).`,
    );
    console.warn('   Ovo mijenja stvarne podatke i kreira/oversjuje naloge.');
    console.warn('');
    return host;
  }

  throw new Error(
    [
      `DATABASE_URL pokazuje na "${host}", a ne na localhost.`,
      '',
      'Ovaj skript kreira i oversjuje naloge, pa se ne smije pokretati nad',
      'produkcijskom (ili bilo kojom dijeljenom) bazom.',
      '',
      'Podigni jednokratnu lokalnu bazu, pa usmjeri DATABASE_URL na nju:',
      '  docker run -d --name bs-a11y-db -e POSTGRES_PASSWORD=dev \\',
      '    -e POSTGRES_DB=beauty_salon_dev -p 5432:5432 postgres:16',
      '  # backend/.env: DATABASE_URL="postgresql://postgres:dev@localhost:5432/beauty_salon_dev?schema=public"',
      '',
      'Ako ZAISTA želiš pisati po udaljenoj bazi: E2E_ALLOW_REMOTE_DB=1 npm run e2e:users',
    ].join('\n'),
  );
}

type Persona = {
  key: 'admin' | 'stylist';
  userVar: string;
  passVar: string;
  roles: Array<{ name: string; description: string }>;
  /** Samo stilisti treba profil, inače `/stylist/**` stranice nemaju šta čitati. */
  saStylistProfilom: boolean;
};

const PERSONAS: Persona[] = [
  {
    key: 'admin',
    userVar: 'E2E_ADMIN_USER',
    passVar: 'E2E_ADMIN_PASS',
    roles: [
      { name: 'SYSTEM_ADMIN', description: 'Sistemski administrator' },
      { name: 'OWNER', description: 'Vlasnik salona' },
    ],
    saStylistProfilom: false,
  },
  {
    key: 'stylist',
    userVar: 'E2E_STYLIST_USER',
    passVar: 'E2E_STYLIST_PASS',
    roles: [{ name: 'STYLIST', description: 'Frizer/stilist' }],
    saStylistProfilom: true,
  },
];

async function main() {
  const provider = process.env.DATABASE_PROVIDER?.toLowerCase() ?? 'postgres';
  const url = process.env.DATABASE_URL;

  if (provider !== 'postgres') {
    throw new Error(
      `Nepodržan DATABASE_PROVIDER: ${provider}. Skript koristi PostgreSQL.`,
    );
  }
  if (!url) throw new Error('DATABASE_URL nije postavljen.');

  const host = assertNijeUdaljenaBaza(url);
  console.log(`Ciljana baza: ${host} (provider: ${provider})`);

  // Nedostaju li kredencijali — glasno, jer tihi izlaz izgleda kao uspjeh.
  const missing = PERSONAS.flatMap((p) =>
    [p.userVar, p.passVar].filter((v) => !process.env[v]),
  );
  if (missing.length > 0) {
    throw new Error(
      `Nedostaju env varovi: ${[...new Set(missing)].join(', ')}.\n` +
        '  E2E_ADMIN_USER=... E2E_ADMIN_PASS=... E2E_STYLIST_USER=... E2E_STYLIST_PASS=... npm run e2e:users',
    );
  }

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  try {
    const kreirani: string[] = [];

    for (const persona of PERSONAS) {
      const username = process.env[persona.userVar] as string;
      const password = process.env[persona.passVar] as string;

      // Uloge moraju postojati prije `userRole.upsert` (FK). `seed.ts` ih kreira, ali
      // ne oslanjamo se na redoslijed — upsert je idempotentan.
      const roles = [];
      for (const role of persona.roles) {
        roles.push(
          await prisma.role.upsert({
            where: { name: role.name },
            create: { name: role.name, description: role.description },
            update: { description: role.description },
          }),
        );
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // `username` je jedinstven, pa je upsert po njemu siguran i ponovljiv.
      // `isEmailVerified: true` nije potreban za login (`auth.service.ts:112-131` ne
      // provjerava ga), ali izbjegava banere o neverificiranom mejlu u UI-ju koji axe snima.
      const user = await prisma.user.upsert({
        where: { username },
        create: {
          username,
          firstName: persona.key === 'admin' ? 'E2E' : 'E2E',
          lastName: persona.key === 'admin' ? 'Admin' : 'Stilist',
          passwordHash,
          isActive: true,
          isEmailVerified: true,
        },
        update: { passwordHash, isActive: true },
      });

      for (const role of roles) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: role.id } },
          create: { userId: user.id, roleId: role.id },
          update: {},
        });
      }

      if (persona.saStylistProfilom) {
        await prisma.stylistProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, status: 'ACTIVE', isActive: true },
          update: { status: 'ACTIVE', isActive: true },
        });
      }

      kreirani.push(
        `${persona.key} → username "${username}" (${roles.map((r) => r.name).join('+')})`,
      );
    }

    console.log('');
    console.log('✔ Testni nalozi spremni:');
    for (const line of kreirani) console.log(`   ${line}`);
    console.log('');
    console.log('Dalje (backend mora raditi na portu 10001):');
    console.log('  cd backend && PORT=10001 npm run start:dev');
    console.log('  cd frontend && npm run build && npm run test:a11y-routes');
    console.log('');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('');
  console.error(`✖ ${e instanceof Error ? e.message : String(e)}`);
  console.error('');
  process.exit(1);
});
