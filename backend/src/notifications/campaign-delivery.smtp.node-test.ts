import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:net';
import test from 'node:test';

import { NotificationsService } from './notifications.service';
import { verifyCampaignUnsubscribeToken } from './utils/campaign-unsubscribe-token';

interface FakeSmtpServer {
  port: number;
  messages: string[];
  close: () => Promise<void>;
}

async function startFakeSmtpServer(
  failureMode: 'disconnect-after-data' | 'temporary-rejection' | null = null,
): Promise<FakeSmtpServer> {
  const messages: string[] = [];
  const server: Server = createServer((socket) => {
    socket.setEncoding('utf8');
    socket.write('220 fake-smtp.test ESMTP\r\n');
    let input = '';
    let dataLines: string[] = [];
    let receivingData = false;

    socket.on('error', () => undefined);
    socket.on('data', (chunk: string) => {
      input += chunk;
      while (true) {
        const lineEnd = input.indexOf('\r\n');
        if (lineEnd < 0) break;
        const line = input.slice(0, lineEnd);
        input = input.slice(lineEnd + 2);

        if (receivingData) {
          if (line === '.') {
            receivingData = false;
            messages.push(dataLines.join('\r\n'));
            dataLines = [];
            if (
              messages.length === 1 &&
              failureMode === 'disconnect-after-data'
            ) {
              socket.destroy();
              return;
            }
            socket.write(
              messages.length === 1 && failureMode === 'temporary-rejection'
                ? '451 4.3.0 temporary fake-smtp failure\r\n'
                : '250 2.0.0 message queued\r\n',
            );
          } else {
            dataLines.push(line.startsWith('..') ? line.slice(1) : line);
          }
          continue;
        }

        const command = line.split(/\s+/, 1)[0]?.toUpperCase();
        if (command === 'EHLO' || command === 'HELO') {
          socket.write(
            '250-fake-smtp.test\r\n250-8BITMIME\r\n250-SMTPUTF8\r\n250 SIZE 10485760\r\n',
          );
        } else if (command === 'MAIL' || command === 'RCPT') {
          socket.write('250 2.1.0 accepted\r\n');
        } else if (command === 'DATA') {
          receivingData = true;
          socket.write('354 end with <CRLF>.<CRLF>\r\n');
        } else if (command === 'RSET' || command === 'NOOP') {
          socket.write('250 2.0.0 ok\r\n');
        } else if (command === 'QUIT') {
          socket.write('221 2.0.0 closing connection\r\n');
          socket.end();
        } else {
          socket.write('500 5.5.1 unsupported command\r\n');
        }
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  return {
    port: address.port,
    messages,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function makeService(port: number) {
  const settings = new Map<string, string | null>([
    ['system_email_host', '127.0.0.1'],
    ['system_email_port', String(port)],
    ['system_email_secure', 'false'],
    ['system_email_username', null],
    ['system_email_password', null],
    ['system_notif_email_from', 'campaign@example.test'],
    ['system_notif_email_name', 'Fake Salon'],
    ['system_email_reply_to', null],
    ['system_email_signature', 'Test only'],
    ['system_email_tls_reject_unauthorized', 'true'],
    ['system_email_require_tls', 'false'],
    ['system_email_ignore_tls', 'false'],
    ['system_email_connection_timeout_ms', '3000'],
    ['system_email_greeting_timeout_ms', '3000'],
    ['system_email_socket_timeout_ms', '3000'],
    ['system_email_pool', 'false'],
    ['system_email_max_connections', '1'],
    ['system_email_max_messages', '1'],
  ]);
  const config = {
    get: () => null,
    getOrThrow: () => 'fake-smtp-test-secret-at-least-32-bytes',
  };
  return new NotificationsService(
    {} as never,
    config as never,
    {} as never,
    { getValue: async (key: string) => settings.get(key) ?? null } as never,
  );
}

const consentId = 'f9b53da9-9bf3-4d02-a03e-18fd97ee8c10';
const consentedAt = new Date('2026-11-04T12:00:00.000Z');
const job = {
  id: 'smtp-test-job',
  templateId: 'smtp-test-template',
  subject: 'A local fake-SMTP test',
  templateHtml: '<p>A local campaign message.</p>',
  appUrl: 'https://salon.example.test',
  campaignName: 'Fake SMTP test',
  tags: ['marketing'],
  createInAppNotification: false,
  requestedByUserId: 'smtp-test-admin',
};
const recipient = {
  id: 'smtp-test-recipient',
  userId: 'smtp-test-user',
  email: 'client@example.test',
  username: 'client',
  firstName: 'Client',
  lastName: 'Example',
  consentId,
  consentedAt,
};

function extractUnsubscribeToken(message: string): string {
  const normalized = message
    .replace(/=\r?\n/g, '')
    .replace(/\r?\n[ \t]/g, '')
    .replace(/=3D/gi, '=');
  const match = normalized.match(/\/unsubscribe\?token=([A-Za-z0-9_.-]+)/i);
  assert.ok(match, 'fake SMTP captured no campaign unsubscribe URL');
  return match[1];
}

void test('delivers only to a local fake SMTP sink and includes a signed unsubscribe link', async (t) => {
  const smtp = await startFakeSmtpServer();
  t.after(() => smtp.close());
  const service = makeService(smtp.port);

  await service.deliverCampaignRecipient(job as never, recipient as never);

  assert.equal(smtp.messages.length, 1);
  const token = extractUnsubscribeToken(smtp.messages[0]);
  assert.deepEqual(
    verifyCampaignUnsubscribeToken(
      token,
      'fake-smtp-test-secret-at-least-32-bytes',
    ),
    {
      consentId,
      consentedAt,
    },
  );
  assert.match(smtp.messages[0], /Unsubscribe \/ Odjava/i);
});

void test('models the SMTP-accepted / lost-ack crash window and permits an explicit retry', async (t) => {
  const smtp = await startFakeSmtpServer('disconnect-after-data');
  t.after(() => smtp.close());
  const service = makeService(smtp.port);

  await assert.rejects(
    service.deliverCampaignRecipient(job as never, recipient as never),
  );
  assert.equal(
    smtp.messages.length,
    1,
    'SMTP received the first DATA payload before its reply was lost',
  );

  await service.deliverCampaignRecipient(job as never, recipient as never);

  assert.equal(smtp.messages.length, 2);
  assert.equal(
    extractUnsubscribeToken(smtp.messages[0]),
    extractUnsubscribeToken(smtp.messages[1]),
    'a retry of the same consent snapshot keeps a stable unsubscribe token',
  );
});

void test('propagates a temporary SMTP rejection so the queue can leave the recipient retryable', async (t) => {
  const smtp = await startFakeSmtpServer('temporary-rejection');
  t.after(() => smtp.close());
  const service = makeService(smtp.port);

  await assert.rejects(
    service.deliverCampaignRecipient(job as never, recipient as never),
  );
  assert.equal(smtp.messages.length, 1);

  await service.deliverCampaignRecipient(job as never, recipient as never);
  assert.equal(smtp.messages.length, 2);
});
