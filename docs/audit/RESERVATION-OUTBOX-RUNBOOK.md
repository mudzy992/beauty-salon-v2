# Reservation outbox — operator runbook

## Scope and guarantees

Ovaj runbook pokriva `reservation.created`, `reservation.appointment_reminder`, `reservation.daily_log_pending_reminder` i `reservation.delay_warning` evente, read-only dijagnostiku, retry/DLQ i audited admin replay.

- Booking/reminder producer transakcije prvo upisuju durable outbox evente; notification/push/socket I/O radi nakon DB commita.
- Worker obrađuje najviše 25 due događaja po pollu. Istekli `PROCESSING` lease (stariji od 5 minuta) vraća se za retry; backoff je eksponencijalan do 1 sata; nakon 10 pokušaja događaj prelazi u `DEAD_LETTER`.
- Appointment reminders revalidiraju reservation status/datum/vrijeme i koriste vlasnički potvrđen salonski wall-clock broj sati. Pending daily-log reminder provjerava PENDING/undeleted/awaiting state i starost unosa kao proteklo vrijeme; queueing ne pomjera sent marker, pa neuspjeli outbox insert ostavlja stavku eligible za naredni cron pass. Delay-warning payload snapshotuje primaoca i sadržaj pri threshold-crossingu; prag je proteklo vrijeme od lokalno razriješenog scheduled end-a. CAS marker `delayNotifiedAt` i per-recipient outbox inserti su jedna DB transakcija; insert failure rollbacka claim pa naredni cron pass može ponoviti queueing.
- Notification DB upsert je idempotentan po izvornom događaju/korisniku. Push/email provider side-effect ostaje **at-least-once**: ako provider prihvati dostavu, a proces ili marker-upis zakaže, retry može ponoviti vanjsku dostavu. Exactly-once nije obećan.
- Dijagnostika ne vraća payload ni aggregate ID; nepoznat tekst greške se rediguje. To nije zamjena za providerov dashboard/logove.

## Readiness i read-only dijagnostika

Koristi API origin (ne frontend/web domen koji može vratiti SPA HTML):

```sh
curl -i "$API_BASE/health"
curl -i "$API_BASE/health/ready"
```

`/health` potvrđuje da proces odgovara. `/health/ready` provjerava DB konekciju i da su image-om isporučene Prisma migracije primijenjene; očekuje se HTTP `200` i JSON `{ "ok": true, "service": "beauty-salon-v2-backend" }`. `503` je generički i može značiti pending/neuspjelu migraciju ili drugu DB/readiness grešku. API startup sam ne pokreće migracije: prati [OPS-03 migration runbook](OPS-03-MIGRATION-RUNBOOK.md).

Outbox GET je read-only i zahtijeva `OWNER` ili `SYSTEM_ADMIN`:

```sh
curl -i \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/api/reservations/ops/outbox"
```

Token uzmi iz odobrenog lokalnog secrets managera; nemoj ga stavljati u tiket, chat, shell transcript ili repo. Admin dashboard također ima read-only Outbox diagnostics panel.

Response sadrži:

- `counts`: broj događaja po statusu (`PENDING`, `PROCESSING`, `DELIVERED`, `DEAD_LETTER`);
- `duePending`: pending događaji kojima je `nextAttemptAt` dospio;
- `staleProcessing`: processing lease stariji od 5 minuta;
- `recentEvents`: do 50 nedovršenih/dead-letter redova s attemptima i ograničenim/redigovanim error summary-jem.

Zabilježi vrijeme, deployed revision i vrijednosti brojača. Poredi snapshot-e; jedan uzorak ne dokazuje da cron radi.

## Controlled staging smoke (nikad produkcija)

Prije testa potvrdi da je `API_BASE` staging/izolovani API, da su testni nalozi/rezervacije synthetic ili odobreni, i da push/email vode na sandbox provider ili namjenski test recipient. Push/email su at-least-once pa i staging smoke može duplirati notifikaciju. Ne koristi realne klijente i ne kopiraj event IDs, payload, recipient ili credentials u izvještaj.

- Testiraj `appointment_reminder` samo s budućom, potvrđenom staging rezervacijom koja prolazi reminder window; promijeni ili otkaži test reservation prije worker delivery radi stale-suppression smoke-a.
- Testiraj `daily_log_pending_reminder` samo s test entryjem koji je PENDING, nije obrisan i čija parent reservation čeka daily log; zasebno potvrdi da completed/deleted test entry ne šalje.
- Testiraj `delay_warning` s test IN_PROGRESS reservation i najmanje tri kasnija staging termina; provjeri da snapshot recipient count ostaje isti kroz retry/failure test. Ne pokreći stvarni provider failure bez sandbox/fake providera.
- Počni read-only outbox snapshotom; pokreni jedan kontrolisani producer/worker tick kroz staging UI/API workflow; nakon poll intervala provjeri `counts`, `duePending`, `staleProcessing` i test sink/provider dashboard. Zabilježi samo redigovane counts, HTTP status, deployed revision i vrijeme. Ne radi ručni SQL event insert/status edit.
- Smoke nije audited replay test. Dead-letter replay radi se samo nakon root-cause popravke, eksplicitnog at-least-once odobrenja i provjere da provider nije već prihvatio prethodni pokušaj.

## Triage

1. **Readiness nije 200:** provjeri da li API i migration job koriste istu namjensku bazu. Za Compose setup, read-only status provjera je `docker compose --profile migrations run --rm migrate ./node_modules/.bin/prisma migrate status`. Ne ponavljaj migraciju naslijepo; prije `migrate deploy` provjeri tačan target, release i odobreni backup/rollback postupak.
2. **`duePending > 0`:** worker kasni ili retry dospijeva nakon provider/DB greške. Zabilježi početni snapshot, sačekaj barem jedan poll interval, pa ponovo provjeri. Ako stanje ostaje, pregledaj backend logove oko `ReservationOutboxService` i provider status kroz odobrene operativne alate. Ne mijenjaj redove direktno u bazi.
3. **`staleProcessing > 0`:** lease stariji je od 5 minuta. Worker bi ga u narednom pollu trebao vratiti za retry ili poslati u `DEAD_LETTER` ako je dosegnut limit. Ako ostane stale nakon dodatnog poll perioda, sačuvaj snapshot i provjeri backend proces/redeploy, cron runtime i DB pristup.
4. **`DEAD_LETTER` se povećava:** sačuvaj event ID/attempt/error summary iz admin dijagnostike i provjeri providerovo prihvatanje/odbacivanje kroz providerov dashboard. Payload i customer data ne stavljaj u incident poruku.
5. **Pogrešan health host:** HTML frontend odgovor nije backend readiness. Provjeri API hostname; očekivani readiness payload je JSON. Docker healthcheck `healthy` potvrđuje samo njegov interni probe u kontejneru, ne vanjsko DNS/proxy rutiranje.

## Audited manual replay

Manual replay nije uobičajeni smoke test ni prvi korak incidenta. Koristi ga samo kada je osnovni uzrok riješen i ovlaštena osoba svjesno prihvata mogućnost duplicate push/email dostave.

- U dashboardu osvježi dijagnostiku i izaberi samo konkretan `DEAD_LETTER` događaj.
- Provjeri attempts i redigovani error; koristi provider alate da utvrdiš može li originalni pokušaj već biti prihvaćen.
- Označi obaveznu at-least-once/duplicate-delivery potvrdu i pokreni audited replay. Backend atomarno postavlja `DEAD_LETTER -> PENDING`, čuva attempts i zapisuje event, administratora i vrijeme u audit tabelu.
- Replay request ne šalje poruku sinhrono; normalni worker obrađuje queue. Nakon toga prati dijagnostiku. Ne radi SQL status reset niti ponavljaj replay bez ponovne procjene rizika.

## Šta još mora potvrditi vlasnik/operater

Ovaj dokument ne postavlja organizacione politike niti potvrđuje live deployment. Prije zatvaranja OPS-R2 potrebno je evidentirati:

- API origin i uspješan vanjski `/health/ready` JSON probe;
- read-only outbox snapshot poslije redeploya (barem dva uzorka razmaknuta jednim poll intervalom); controlled worker delivery smoke samo u stagingu/izolovanom test setupu s nedostavljajućim providerom;
- broj backend replika i kako su cron polleri raspoređeni; DB claim je atomski, ali `waitForCompletion` je process-local. **Vlasnik je 2026-11-04 prijavio jednu backend instancu s reminder cron/outbox workerom u istom procesu; to je owner-reported, nije nezavisno provjereno za deployed revision/staging.**
- imenovanog alert/on-call vlasnika, kanal i odobrene pragove za due/stale/dead-letter stanje;
- ko odobrava ručni replay i recovery/incident komunikaciju.

Agent nije pokrenuo live replay, produkcijsku rezervaciju, migraciju nad korisničkom bazom niti provider delivery.
