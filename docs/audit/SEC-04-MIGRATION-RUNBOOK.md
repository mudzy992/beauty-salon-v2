# SEC-04 / PRIV-01 — runbook za buduću migraciju medija

**Stanje:** nacrt, nije odobren za produkcijski/shared volumen ili bazu. Nije izvršen nad stvarnim podacima. Retention rok, restore rehearsal, klasifikacijski izvještaj i vlasnički cutover potpis ostaju obavezni gate-ovi.

Ovaj dokument opisuje operativni postupak za budući `media:storage:migrate` runner. `--ack-backup-and-rollback` je samo eksplicitna potvrda operatora na komandnoj liniji; runner ne provjerava da backup postoji, da se može vratiti ili da je rollback siguran.

## 1. Izvorna politika i ciljni layout

- `UPLOAD_ROOT/public/` je jedini statički javni root i servira se pod `/uploads/`. Putanje u postojećim DB poljima ostaju relativne na taj prefix, npr. `service/hero.jpg` se kopira u `public/service/hero.jpg` bez prepisivanja URL-a.
- `UPLOAD_ROOT/private/` sadrži privatne originalne/legacy kopije, uključujući avatar upload varijante, finance dokumente, unklasifikovane medije i fotografije bez eksplicitne saglasnosti. Avatar ostaje u ovom privatnom layoutu čak i kada je vlasnik uključio javni prikaz; jedini javni avatar tok je dinamički `/api/users/:id/avatar` koji provjerava opt-in, vlasništvo i validnu privatnu varijantu pri svakom zahtjevu. Ostali privatni sadržaj ide kroz autentifikovani endpoint i provjeru resursa/uloge.
- Saglasnost klijenta kreira zasebni, metadata-free WEBP derivat pod `private/consented/`. Javna ruta provjerava važeći consent zapis pri svakom pristupu; opoziv blokira budući pristup kroz salonov sistem. Original ostaje privatan i ne briše se automatski.
- Javno statički se mapiraju branding, odobreni service/blog mediji, objavljeni APK-ovi i novi category-bound Gallery uploadovi za neklijentski salon/proizvod sadržaj. Gallery upload ostaje allowlisted samo ako je vezan za `GalleryImage`, klase `PUBLIC`, i `pathOriginal` počinje sa `gallery/`; ovo je provenance iz namjenskog endpointa i eksplicitne owner/admin potvrde, ne automatsko prepoznavanje osoba. Stari/legacy Gallery-only i unlinked fajlovi se ne promovišu samo zato što su ranije bili prikazani ili označeni `PUBLIC`; klijentske fotografije dolaze samo kroz aktivni consent derivative. Avatar nije statički javni asset: `isAvatarPublic` (default false) dozvoljava samo poseban no-store avatar route uz validaciju private owner-bound varijante. Avatar-public izbor ne znači saglasnost za Gallery, oglase ili društvene mreže.
- Runner prvo kopira i provjerava planirane destinacije, zatim u jednoj DB transakciji mapira postojeće upload/direct-reference putanje. Prije mappinga skenira `UPLOAD_ROOT/public/`: ostaju samo eksplicitno allowlistovane javne destinacije iz plana. Svaki drugi postojeći fajl ispod tog budućeg static root-a (uključujući legacy `entity=public` upload i orphan fajlove) kopira se i checksum-verifikuje pod `private/legacy/public-root/<relative-path>`, pa se uklanja samo njegova stara putanja iz `public/`; sadržaj ostaje sačuvan privatno, nije automatski obrisan. Ako DB transakcija ne uspije, runner pokušava vratiti quarantined putanje i ukloniti samo kopije kreirane u tom runu. Legacy izvori izvan `public/` se ne pomjeraju. Konflikti, nevažeće reference, neusklađenost veličine/checksuma, symlink ili nepodržan javni format prekidaju run.
- Javni legacy raster copy trenutno prihvata samo JPEG/PNG/WebP koji odgovaraju ekstenziji; fotografija se ponovo kodira uz uklanjanje EXIF/IPTC/XMP metapodataka. SVG/GIF nisu automatski migrirani kao javni mediji. Objavljeni APK mora imati `.apk`, ZIP local-file signature `PK\x03\x04` i odgovarati evidentiranom SHA-256/veličini.

## 2. Cutover gate-ovi — svi moraju biti zatvoreni prije produkcije

1. **Klasifikacija i izvještaj:** vlasnik odobri pregled dry-run brojeva, uključujući `legacyPublicFilesToQuarantine`, i posebno razriješi svaki konflikt/nevažeću referencu. Nema fajla iz starog `public/` koji se izlaže samo zbog putanje ili legacy `PUBLIC` oznake; unmapped/orphan sadržaj se čuva u privatnom quarantine-u. Nepovezane/vanjske avatar URL-ove i svaku neprepoznatu DB putanju riješiti ručno; ne zaobilaziti plan sa force flagom.
2. **Retention i consent:** odrediti retention rok za privatne originale, način postupanja po isteku, pravila revokacije/zahtjeva za brisanje i vlasničku odgovornost. Dok to nije definisano, ne brišu se automatski originali. Potvrditi da objava i tekst saglasnosti odgovaraju primjenjivim pravnim zahtjevima.
3. **Backup/restore rehearsal:** napraviti konzistentan, šifriran backup baze i kompletnog `UPLOAD_ROOT`-a, uključujući ACL/owner/mode i sve public/private/legacy putanje. Backup čuvati van istog volumena; provjeriti SHA-256 i uraditi potpuni restore u disposable okruženje. Evidentirati backup identifikator/vrijeme i restore dokaz u internom change recordu, ne u ovom repozitoriju.
4. **Rollback release:** unaprijed potvrditi rollback koji i dalje servira isključivo `UPLOAD_ROOT/public/`; ne vraćati raniju aplikaciju koja je statički izlagala cijeli root. Uskladiti DB i filesystem snapshot kao par. Ako se vrati pre-migration snapshot, javni/private URL map može privremeno biti nedostupan; ostati u maintenance modu ili ponoviti migraciju prije otvaranja prometa, ali ne otkrivati legacy root radi kompatibilnosti.
5. **Šema i build:** primijeniti additive Prisma migraciju i izgraditi release sa generisanim Prisma Clientom prije pokretanja runnera. Runner očekuje PostgreSQL `DATABASE_URL` i koristi `UPLOAD_ROOT`; agent nije validirao kompatibilnost sa stvarnom produkcijskom šemom.
6. **Filesystem/kapacitet:** potvrditi da `UPLOAD_ROOT` pokazuje na očekivani mount, da root i putanje nemaju symlink komponente, da public/private direktoriji imaju potrebna prava, da postoji slobodan prostor i da `private/` i `public/` podržavaju hard-link unutar istog filesystema. Runner nema fallback za `EXDEV`; copy bi se zaustavio i cleanup bi pokušao ukloniti nove kopije.
7. **Maintenance window:** zaustaviti app instance/workere koji mogu pisati upload/reference podatke. Izbjegavati konkurentni upload, consent, release publish i promjene service/blog/settings dok se plan i transakcija izvršavaju.
8. **Operational signoff:** vlasnik sistema, DB/storage operator i privacy/data owner potvrđuju plan, backup ID, rollback release, maintenance window, expected counts i post-run smoke checks. Sam CLI acknowledgement nije odobrenje.

## 3. Priprema i dry-run

Komande su predložak za buduće kontrolisano okruženje, ne uputa da se sada izvrše nad produkcijom. `DATABASE_URL` treba ubaciti putem runtime secret managera, a `UPLOAD_ROOT` kroz odobrenu runtime konfiguraciju; ne unositi vjerodajnice u shell history, CI logove, repo ili chat.

```sh
cd backend
npm ci
npm run db:generate
npm run build
npm run media:storage:migrate -- --dry-run
```

Prije `--dry-run`, operator potvrđuje da su DB i volume disposable/staging ili da su navedeni produkcijski cutover gate-ovi formalno zatvoreni. Dry-run čita inventory i media fajlove i izvršava preflight, skenira budući public root te broji fajlove koje bi apply premjestio u privatni quarantine; ne mijenja bazu, ne kreira destinacije i ne premješta fajlove. Ispisuje samo agregatne countove (uključujući `legacyPublicFilesToQuarantine`) i SHA-256 fingerprint konfliktnih putanja, ne sirove filename/path vrijednosti.

Nastaviti samo ako:

- `pathConflicts === 0` i `invalidReferences === 0`;
- svi očekivani brojevi upload/direct fields/standalone-private-row kreacija odgovaraju owner-reviewed inventaru;
- svaki javni cilj je dio odobrene allowliste; GIF/SVG i ostali unsupported public format ne zaobilaze se;
- preflight završi bez missing file, permission, symlink, signature, checksum/size ili path-collision greške.

Runner namjerno ne ispisuje sirove error poruke jer filesystem/Prisma poruka može sadržavati path ili podatak. Ako se zaustavi, sačuvati postojeći volume i DB, zabilježiti generičku vrstu greške i analizirati uz kontrolisani staging kopiju; ne nastavljati naslijepo.

## 4. Apply — tek nakon zatvorenih gate-ova

1. Potvrditi da je unaprijed urađen i restore-tested backup DB-a i volumena; backup treba odgovarati trenutnom schema/data stanju.
2. U maintenance modu ponoviti dry-run neposredno prije apply i uporediti brojeve sa odobrenim change recordom.
3. Operator eksplicitno potvrđuje backup/rollback plan:

```sh
npm run media:storage:migrate -- --apply --ack-backup-and-rollback
```

4. Runner kopira/verifikuje sve planirane fajlove. Zatim skenira `public/` i kopira/verifikuje svaki unmapped fajl u `private/legacy/public-root/`, pa uklanja samo njegovu staru lokaciju ispod static root-a. Tek poslije quarantine-a radi DB path mapping u jednoj transakciji. Ako DB transakcija ne uspije, runner pokušava vratiti quarantined putanje i ukloniti samo kopije nastale u tom runu. Ako bilo koji rollback/cleanup ne uspije, zaustaviti rollout i pregledati volumen; ne izlagati `private/` niti ručno brisati sačuvane fajlove.
5. Izvorne bajtove zadržati. Izvori van `public/` ostaju na mjestu; neallowlistovani fajlovi koji su bili unutar budućeg static root-a ostaju kao privatne kopije pod `private/legacy/public-root/`, ne na javnoj putanji. Ne brisati druge legacy direktorije ni consented/private originale u istoj promjeni.

Runner nema trajni quarantine journal i ne može obraditi `SIGKILL`/host failure između pomjeranja fajlova i DB transakcije. U slučaju prekida prije urednog završetka: zadržati maintenance mode, ne deployati/otvoriti promet i ne pretpostaviti da je `--apply` sigurno samo ponoviti; koristiti upareni backup ili kontrolisani operator recovery na inventaru i volumenu prije nastavka.

## 5. Post-run provjere prije otvaranja prometa

U maintenance/staging okruženju provjeriti:

- `legacyPublicFilesToQuarantine` je nula na ponovljenom dry-run-u; static `public/` sadrži samo odredišta eksplicitno navedena u allowlist planu, bez legacy `entity=public` ili orphan fajlova;
- public URL-e za odabrane salon brand/service/blog aset-e, kategorički povezane non-client Gallery WEBP assete i objavljene APK-ove; provjeriti MIME, `nosniff`, APK hash/veličinu i da HTML/SVG/PDF nisu inline public;
- privatne avatar-upload putanje, invoice, expense attachment, before/after bez consent-a i neobjavljeni service/blog media: neautorizovan zahtjev odbijen, drugi klijent odbijen, dozvoljeni resource owner/role uspijeva; zasebno provjeriti da `/api/users/:id/avatar` radi samo za validan avatar vlasnika koji je uključio javnost i vraća 404 nakon isključivanja;
- client opt-in/revoke testirati odvojeno od avatar visibility: javni avatar ne smije dodati client media u Gallery; client photo može se prikazati samo kao aktivno consentovani derivative.
- eksplicitan client opt-in čuva tačnu policy verziju/actor/source i samo odgovarajući consent derivative postaje dostupan; revoke odmah blokira galerijski feed i direct consent-file route, uz privatno zadržan original;
- URL mapping radi u web i mobile klijentima; nested blog media, public settings, service hero, logo, avatar i APK rute koriste očekivani layout;
- filesystem mode: privatni direktoriji `0700`, privatni fajlovi `0600`; javni direktoriji `0755`, javni fajlovi `0644` (uz provjeru platformskog umask/mount ponašanja);
- DB brojevi i relacije odgovaraju dry-run/change recordu; ponovljeni dry-run ne predlaže duplikat standalone `Upload` reda i potvrđuje postojeće kopije.

Ovo su budući operativni acceptance kriteriji. U ovoj source-only fazi nisu izvršeni HTTP/browser, DB, storage, CORS ili deployment smoke tests.

## 6. Rollback — bez vraćanja starog javnog root-a

- Odmah zaustaviti promet i sve pisce; sačuvati logove i volume u izolaciji.
- Vratiti **uparene** DB+filesystem snapshot-e, ne samo jedno od toga. Preferirati snapshot napravljen nakon additive schema migration, a prije storage-map apply. Ako se vraća stariji DB snapshot, prvo primijeniti kompatibilnu schema migraciju pod maintenance modom.
- Pokrenuti samo prethodno odobreni **secure rollback release** koji statički servira `public/` poddirektorij i privatne resurse daje kroz autorizovane rute. Nikad ne pokretati staru verziju koja statički servira cijeli `UPLOAD_ROOT`.
- Ako DB/volume snapshot vraća legacy paths bez novih `public/` kopija, zadržati maintenance mode i ponovo izvršiti preflight/migraciju ili odabrani forward fix prije nego promet bude otvoren. Ne praviti blanket redirect ili symlink prema legacy root-u.
- Ne brisati stare kopije, consent derivatives, DB audit događaje ili backup da bi se “očistio” rollback. Ne tvrditi da već preuzete/screenshotted kopije mogu biti povučene.

## 7. Šta nije urađeno

Nijedna produkcijska/shared baza, upload volume, Redis, browser CORS ili deployment nije pregledan/testiran. Nije potvrđen stvarni mount, broj/veličina fajlova, backup, restore, retention rok ili poslovni consent state. Unit testovi u repozitoriju koriste isključivo sintetički temporary filesystem i mocked service/repository granice. Plan/runner je source-only i zahtijeva generated-client/DB kompatibilnost, vlasnički runbook signoff i disposable E2E/staging provjere prije bilo kakvog stvarnog cutovera.
