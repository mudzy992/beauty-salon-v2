import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

import { API_ERROR_CODES, apiError } from './api-error-codes';
import { HttpExceptionFilter } from '../filters/http-exception.filter';

const codes = Object.keys(API_ERROR_CODES) as (keyof typeof API_ERROR_CODES)[];

void test('registar ima >=100 kodova i svaki nosi nepraznu poruku', () => {
  // Pozitivna kontrola: prazan registar bi trivijalno prosao sve ostale provjere.
  assert.ok(codes.length >= 100, `očekivano >=100 kodova, dobijeno ${codes.length}`);
  for (const code of codes) {
    const message = API_ERROR_CODES[code];
    assert.equal(typeof message, 'string', `${code} nema string poruku`);
    assert.ok(message.trim().length > 0, `${code} ima praznu poruku`);
  }
});

void test('kod i poruka su 1:1 — nijedan tekst ne dijele dva koda', () => {
  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  for (const code of codes) {
    const message = API_ERROR_CODES[code];
    const previous = seen.get(message);
    if (previous) duplicates.push(`${code} == ${previous} ('${message}')`);
    else seen.set(message, code);
  }
  assert.deepEqual(duplicates, [], 'dvije poruke dijele tekst, pa prijevod po kodu gubi smisao');
});

void test('apiError() vraća tijelo s kodom i porukom iz registra', () => {
  const payload = apiError('USERS_NOT_FOUND');
  assert.deepEqual(payload, {
    code: 'USERS_NOT_FOUND',
    message: API_ERROR_CODES.USERS_NOT_FOUND,
  });
  assert.equal(payload.message, 'Korisnik nije pronađen.');
  // Drugi kod -> druga poruka: registar se zaista čita, nije fiksni string.
  assert.notEqual(apiError('USERS_EMAIL_TAKEN').message, payload.message);
  assert.equal(apiError('USERS_EMAIL_TAKEN').code, 'USERS_EMAIL_TAKEN');
});

/** Minimalan ArgumentsHost: samo ono što filter dira. */
const fakeHost = (sent: Record<string, unknown>) =>
  ({
    switchToHttp: () => ({
      getResponse: () => ({
        status(code: number) {
          sent.statusCode = code;
          return {
            json(body: unknown) {
              sent.body = body;
            },
          };
        },
      }),
      getRequest: () => ({ method: 'POST', url: '/api/users' }),
    }),
  }) as unknown as ArgumentsHost;

void test('HttpExceptionFilter propušta code u tijelo odgovora', () => {
  const sent: Record<string, unknown> = {};
  new HttpExceptionFilter().catch(
    new BadRequestException(apiError('USERS_EMAIL_TAKEN')),
    fakeHost(sent),
  );
  assert.equal(sent.statusCode, 400);
  assert.deepEqual(sent.body, {
    statusCode: 400,
    code: 'USERS_EMAIL_TAKEN',
    message: API_ERROR_CODES.USERS_EMAIL_TAKEN,
    error: undefined,
  });
});

void test('HttpExceptionFilter NE izmišlja code kad ga izuzetak nema', () => {
  const sent: Record<string, unknown> = {};
  new HttpExceptionFilter().catch(
    new NotFoundException('Nesto bez koda.'),
    fakeHost(sent),
  );
  const body = sent.body as Record<string, unknown>;
  assert.equal(body.message, 'Nesto bez koda.');
  assert.ok(!('code' in body), 'filter je dodao polje code iako izuzetak nije nosio kod');
});

const SRC = resolve(process.cwd(), 'src');
const API_CALL = /apiError\('([A-Z][A-Z0-9_]*)'\)/g;
const LITERAL = /\b([A-Za-z]*Exception)\(\s*(?:`[^`]*`|'[^']*'|"[^"]*")/g;

const scanSources = () => {
  // Brava protiv tihog pokretanja iz pogresnog direktorija (tada bi brojevi bili 0
  // i svaka asertacija bi trivijalno prolazila).
  assert.ok(existsSync(SRC), `backend/src nije pronađen na ${SRC} — pokrenite test iz backend/`);
  const rows: { file: string; api: string[]; literals: number }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('api-error-codes.ts') &&
        !entry.name.endsWith('api-error-codes.node-test.ts') &&
        !entry.name.includes('.spec.ts')
      ) {
        const src = readFileSync(full, 'utf8');
        rows.push({
          file: full.replace(SRC + '/', ''),
          api: [...src.matchAll(API_CALL)].map(([, code]) => code),
          literals: [...src.matchAll(LITERAL)].length,
        });
      }
    }
  };
  walk(SRC);
  return rows;
};

const rows = scanSources();
const totalApi = rows.reduce((n, r) => n + r.api.length, 0);
const totalLiterals = rows.reduce((n, r) => n + r.literals, 0);

void test('svaki apiError() poziv koristi kod iz registra', () => {
  assert.ok(totalApi >= 250, `očekivano >=250 poziva apiError(), dobijeno ${totalApi}`);
  const known = new Set<string>(codes);
  const unknown = rows.flatMap((r) =>
    r.api.filter((c) => !known.has(c)).map((c) => `${r.file}: ${c}`),
  );
  assert.deepEqual(unknown, [], 'apiError() pozvan s kodom koji nije u registru');
});

void test('broj hardkodiranih poruka bez koda se ne povećava (regresijska brava)', () => {
  // Opcija (c) preselila je 260 poziva na apiError(); 439 poziva i dalje baca bosanski
  // literal direktno (poruke koje frontend ne prevodi po mapi). Ova brava ne tvrdi da su
  // svi migrirani — tvrdi da ih nece tiho biti VISE. Smanjenje je dozvoljeno.
  assert.ok(
    totalLiterals <= 439,
    `hardkodiranih poruka bez koda: ${totalLiterals} (dozvoljeno <=439). ` +
      'Nove serverske poruke dodajte kroz apiError(KOD), ne kao literal.',
  );
  // Pozitivna kontrola: brojac zaista nesto broji.
  assert.ok(totalLiterals > 300, `brojac je nasao samo ${totalLiterals} literala — scan ne radi`);
});
