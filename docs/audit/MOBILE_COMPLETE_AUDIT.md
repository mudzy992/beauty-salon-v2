# Potpuni audit izvornog koda mobilne aplikacije — 2026-10-30

## Status i obuhvat

**Audit izvornog koda mobilne aplikacije je završen.** Audit-prvo faza nije mijenjala aplikacijski kod. MOB-01–MOB-06 su ranije implementirani; sada je započela zasebna implementacijska faza po uskim, testiranim sliceovima. Prvi slice pokriva dio MOB-AUD-02 i MOB-AUD-05; preostali nalazi i nedovršeni dijelovi ostaju u planu.

Pregledani su: Expo Router rute i rasporedi; ekrani za klijente, stiliste, prijavu i početno podešavanje naloga; zajedničke UI, medijske i navigacijske komponente; auth i notification storeovi; API, katalog, javne postavke i servisi za URL-ove uploadovanih fajlova; hookovi za osvježavanje, socket i push obavijesti; Android updater; aplikacijska/EAS konfiguracija i zavisnosti za mobilnu aplikaciju; te mobilni API pozivi u odnosu na odgovarajuće NestJS kontrolere, guardove i relevantne DTO/servisne oblike odgovora. U `mobile/src/screens` nalazi se 55 fajlova koji nisu testovi, a u `mobile/app` 51 TypeScript fajl koji nije test, uključujući rute, rasporede i komponente.

**Ovo nije potvrda ispravnosti na uređajima.** Nisu izvršeni pozivi prema živom API-ju, operacije nad produkcijskim podacima, instalacija Android/iOS native builda, provjera dozvola, test čitača ekrana, vizuelni pregled na uređaju ni simulacija mrežnih/native grešaka. Expo iOS JavaScript export i CI jesu korisni dokazi, ali ne dokazuju ponašanje na stvarnom uređaju. Korisnik planira vizuelnu provjeru na fizičkom uređaju nakon implementacije; ona ostaje obavezan završni korak.

## Sažetak

- Prioritetni problemi profila, auth/session toka, push grešaka i booking availabilityja iz MOB-01–MOB-06 su popravljeni i provjereni kroz CI.
- U obavljenim poređenjima izvornog koda nije potvrđeno novo nepoklapanje API rute/puta s backendom. Međutim, TypeScript anotacije odgovora ne provjeravaju stvarni JSON u runtimeu; više ekrana i dalje koristi API payload kao da anotacija garantuje njegov oblik.
- Najjasniji novootkriveni rizici su neispravni odgovori za dugove/loyalty, obavijesti, dnevnik, katalog i galeriju; neprovjeren payload availability Socket.IO događaja; te greške osvježavanja koje se mogu prikazati kao validni prazni rezultati.
- **Važno prije planiranog developer builda:** EAS profil `development` usmjerava `EXPO_PUBLIC_API_URL` i `EXPO_PUBLIC_API_FILES_URL` na isti aktivni API host koji koristi `production` (`mobile/eas.json:6-21,38-47`). Ako drugi build-time override ne promijeni ove vrijednosti, izmjene napravljene iz developer builda ići će na produkcijski backend. Prije rezervacija, prihvatanja/odbijanja termina, naplate dugova ili završavanja dnevnika koristite staging/test API ili izričito izolujte testne podatke.
- Provjere pristupačnosti i prevoda, testiranje native integracija i vidljive poruke o API greškama trenutno pokrivaju samo dio aplikacije.

## Već implementirano (MOB-01–MOB-06)

- **MOB-01:** ispravljen crash uzrokovan oblikom korisničkih `roles`; ojačana obrada profila, medijskih saglasnosti i dugova; potvrđeno je da privatni upload sadržaj zahtijeva autentifikaciju, dok je javni avatar zasebna, izričita opcija.
- **MOB-02:** uveden je zajednički refresh gate za pet ekrana s periodičnim osvježavanjem; greške callbacka su zaštićene od nekontrolisanog izbacivanja.
- **MOB-03:** validiraju se auth korisnički payloadi, a čišćenje sesije pri logoutu/401 je best-effort i ne ostavlja zastarjelu auth sesiju u memoriji.
- **MOB-04:** obuzdane su asinhrone/native greške push obavijesti i spriječena kasna navigacija nakon cold-starta.
- **MOB-05:** razlikuje se greška čitanja SecureStorea od odjavljene sesije; bootstrap i osvježavanje profila prikazuju stanje s ponovnim pokušajem bez brisanja sesije kod oporavljivih grešaka.
- **MOB-06:** validiraju se odgovori availability datuma/slotova, zastarjeli odgovori se ignorišu, dostupna je ponovna provjera, a greške pri slanju rezervacije obrađuju se sigurnim parserom.

Ove izmjene imaju fokusirane helper/source testove. One ne predstavljaju provjeru renderovanja React Native komponenti, živog servisa ili stvarnog uređaja.

## Status implementacije novih nalaza

- **Slice 1 — runtime API payload validacija:** dodani su normalizatori za debt iznose, loyalty preview, dugove (uključujući stylist debt listu), rezervacije, daily-log zapise, notifikacije, before/after medije i availability socket događaj. Povezani su s klijentskim booking/Home/listama, galerijama, notification storeom te stylist inbox/daily-log prikazima. Commit `72b4762`; CI run `41038262258` je prošao sva četiri joba.
- **Slice 2 — vidljivo stanje greške za obavijesti (lokalna provjera završena):** notification store sada razlikuje neuspješan/neispravan odgovor i čuva ranije učitana obavještenja; ekran prikazuje retry za prazan prikaz ili upozorenje za zastarjele podatke. Dodat je bosanski UI tekst i source-regresijski test. Node suite **152/152**, TypeScript `typecheck`, i18n guard prolaze lokalno; CI još treba potvrditi nakon commita/pusha.
- Za Slice 1 lokalno su prošli i Expo iOS i Android JavaScript export; YAML se parsira. ESLint nije pokrenut jer Mobile paket nema instaliran `eslint` binarni fajl/dependency. Fizički uređaj i živi API nisu testirani.
- Preostaje implementirati UX stanja i retry za ostale mrežne/API tokove (AUD-03), validirati ostale katalog liste (AUD-02) te sve preostale nalaze. Nijedan API host nije promijenjen i nijedan upis nije izveden.

## Nalazi i plan implementacije

Prioritet odražava uticaj na korisnika/runtime i pouzdanost nalaza iz pregleda koda, a ne procjenu mogućnosti eksploatacije produkcijskog sistema.

### MOB-AUD-01 — EAS developer build je podešen da koristi produkcijski API (P1 — sigurnost testiranja)

**Dokaz:** `mobile/eas.json` postavlja isti API host `https://api.nejra.ba101.top` i isti uploads host za profile `development`, `preview` i `production` (`:9-13`, `:31-35`, `:42-46`). Development je interni Android debug APK/iOS build za uređaj, ali taj profil nema zasebnu staging adresu.

**Uticaj:** vizuelno ili funkcionalno testiranje može nenamjerno napraviti ili izmijeniti stvarne produkcijske rezervacije, profilne podatke, dugove, zapise dnevnika, obavijesti i uploadovane medije. Ovo nije samo UI pitanje.

**Implementacija/prihvatni kriterij:** prije upotrebe developer builda za tokove koji šalju izmjene, izabrati staging/test API i odgovarajući host za fajlove ili izričito izolovati/odobriti produkcijski testni nalog i podatke. Ciljno okruženje ne mijenjati prešutno. Potvrditi adresu koju build zaista koristi, bez izlaganja kredencijala.

### MOB-AUD-02 — Ekrani s rizikom od crasha vjeruju tipiziranim API odgovorima (P2)

**Dokaz:** rezervacijski ekran direktno sprema `/api/loyalty/client/me` kao `LoyaltyInfo`, a zatim poziva `service.maxDiscountAmount.toFixed(2)` (`ReservationScreen.tsx:327-332,748-764`). Provjera dugova potvrđuje samo da je odgovor niz; null red bi izazvao grešku pri čitanju `d.amount` (`:340-345`). Home ekran ponavlja računanje dugova, a nastalu grešku proguta širi tihi `catch` (`HomeScreen.tsx:201-217`). Notification store poziva `data.filter` bez runtime provjere niza/redova (`notificationStore.ts:19-27`). Ekran dnevnika stiliste direktno dodjeljuje tipizirani odgovor u `entries`, a zatim ga iterira (`DailyLogListScreen.tsx:53-68`). Stylist inbox isto tako sprema neprovjeren niz prije poziva `.filter` (`StylistInboxScreen.tsx:42-54,67-72`). Javne galerije provjeravaju da li postoji kontejner `items`, ali vjeruju ugniježđenim `before`/`after` putanjama svakog reda koje renderer direktno čita (`ServiceWorkGalleryScreen.tsx:58-68,92+`; `SatisfiedClientsScreen.tsx:35-48,63-69`). Parsiranje obavijesti je unutar `catch` bloka, pa se greška ne širi dalje, ali se zadržava staro stanje ili prazan prikaz bez poruke o grešci (`notificationStore.ts:19-27`).

**Uticaj:** neočekivan uspješan HTTP odgovor (null red, pogrešan tip polja ili nepotpun ugniježđeni medijski DTO) može izazvati grešku u obradi/renderovanju na nekim ekranima; druge greške se uhvate, ali se podaci neprimjetno izgube ili ostanu zastarjeli. Nevažeće numeričke vrijednosti mogu dati pogrešan zbir dugova. Ovo nije tvrdnja da ovi endpointi trenutno vraćaju neispravne podatke.

**Smjer implementacije:** uvesti uske runtime validatore za DTO-e ili zajedničke parsere za obavijesti, dugove, loyalty, dnevnik, katalog i before/after redove; odbaciti/preskočiti nevažeće redove uz vidljivo stanje djelimično dostupnih podataka; dodati testove za null, pogrešne primitive, nedostajuće ugniježđene objekte i nevažeća numerička/datumska polja. Backend mora ostati mjerodavan za pravila rezervacije i naplate.

### MOB-AUD-03 — Greške mreže se na više mjesta ne razlikuju od validno praznih rezultata (P2)

**Dokaz:** ekrani kataloga prešutno progutaju greške i završe na praznoj listi (`ServicesScreen.tsx:42-55`, katalog efekat u `ServiceDetailScreen.tsx`); dohvat dnevnika zamijeni podatke praznim nizom pri bilo kojoj grešci (`DailyLogListScreen.tsx:65-68`); notification store pri grešci samo ugasi `isLoading`, a ranije učitane obavijesti zadrži (`notificationStore.ts:19-27`); booking pomoćni pozivi uklanjaju loyalty/dugove iz prikaza ako ne uspiju (`ReservationScreen.tsx:331-345`). Opšti `catch` u Home ekranu je tih (`HomeScreen.tsx:200-266`).

**Uticaj:** korisnik može timeout, 401/403, serversku grešku ili neispravan payload protumačiti kao „nema usluga/dugova/zapisa/obavijesti“. Neki prikazi zadržavaju stare podatke bez oznake da su zastarjeli. U rezervacijskom toku konačni submit i dalje primjenjuje pravila na serveru, ali pomoćni prikaz može navesti korisnika na pogrešan zaključak.

**Smjer implementacije:** odvojiti stanja učitavanja, praznih podataka, zastarjelih podataka i greške; prikazati lokalizovanu opciju ponovnog pokušaja gdje je oporavak moguć; ranije uspješne podatke zadržati samo uz vidljivu oznaku zastarjelosti. Oporavljive greške ne smiju mijenjati stanje auth sesije.

### MOB-AUD-04 — Zastarjeli asinhroni odgovori i obavijesti između korisničkih sesija nisu svugdje izolovani (P2)

**Dokaz:** pretraga klijenata stiliste nakon slanja zahtjeva nema provjeru generacije zahtjeva; raniji odgovor može prepisati rezultate novijeg upita (`use-stylist-direct-booking-form.ts:32-51`). Paginacija galerije nema zaštitu generacije zahtjeva pri promjeni `serviceId` (`ServiceWorkGalleryScreen.tsx:53-90`); više ekrana detalja direktno postavlja stanje nakon `await` poziva. Notification store nema ID korisnika, generaciju zahtjeva ni reset pri logoutu (`notificationStore.ts:14-41`), a koristi se globalno u rootu i oba navigacijska područja.

**Uticaj:** stariji odgovor pretrage/stranice/profila može zamijeniti novije podatke. Pri brzoj promjeni naloga stanje obavijesti prethodnog korisnika može ostati vidljivo do uspješnog narednog dohvata; može se kratkotrajno prikazati i njegov unread badge/lista. Serverske kontrole pristupa ostaju na snazi, ali ovo je problem izolacije stanja i privatnosti prikaza na klijentu.

**Smjer implementacije:** otkazivati zahtjeve ili provjeravati njihovu generaciju; vezati/resetovati obavijesti pri logoutu i promjeni naloga te odbiti primjenu odgovora za drugi identitet. Testirati promjenu rute, brze izmjene upita, unmount i preklapanje logout/login tokova.

### MOB-AUD-05 — Availability socket događaj koristi nepoznat payload bez validacije (P2)

**Dokaz:** `useAvailabilitySocketRefresh.ts:14-23` pretvara `data` u `AvailabilityChangedPayload` TypeScript castom i odmah čita `payload.serviceIds`/`payload.serviceId` ako postoje izabrani servisi. Null ili primitivni payload može izazvati grešku u callbacku socket događaja; TypeScript anotacije ne ograničavaju stvarne podatke na žici.

**Uticaj:** neispravni ili verzijski neusklađeni realtime događaji mogu izazvati neuhvaćenu grešku callbacka. Postojeći recovery helper obrađuje običan prekid/ponovno povezivanje transporta; ovaj nalaz se odnosi na validaciju payloada, ne na reconnect mehanizam.

**Smjer implementacije:** parsirati `unknown` kao nenulti objekt, validirati pojedinačne ID-jeve/listu ID-jeva i opcionalni datum, sigurno ignorisati neispravne događaje te testirati null/string/niz/pogrešna polja i validne događaje za jedan ili više servisa.

### MOB-AUD-06 — Obrada grešaka mutacija i upload sastavljen od više koraka nisu ujednačeni (P2/P3)

**Dokaz:** postoji zajednički sigurni parser, ali više ekrana za izmjene i dalje direktno čita `error.response.data.message` ili se oslanja na `any`: akcije klijentskih rezervacija, slanje recenzije, direktno zakazivanje i inbox stiliste te povezivanje slike uz dnevnik. Neki handleri obrađuju niz poruka, dok drugi sirove vrijednosti prosljeđuju native alert API-ju. Dodavanje slike u dnevnik čine dva zahtjeva: upload fajla, pa povezivanje njegovog `uploadId` sa zapisom (`DailyLogDetailScreen.tsx:205-217`).

**Uticaj:** neispravne/mrežne greške mogu dati generičku, sirovu ili neupotrebljivu poruku; ako upload uspije, a povezivanje ne uspije, klijent tada nema tok za ponovni pokušaj ili čišćenje. Ovo je moguća djelimično uspješna/orphan-media putanja; ovim pregledom klijenta nije utvrđeno da li backend kasnije uklanja nepovezan upload.

**Smjer implementacije:** sve greške mutacija prikazivati kroz sigurni, lokalizovani parser; gdje je prikladno spriječiti dvostruko slanje; osmisliti ponovni pokušaj ili kompenzaciju za upload/povezivanje i testirati grešku između dva zahtjeva. Zadržati idempotency zaštitu rezervacije, a prije automatskog ponavljanja drugih upisa provjeriti njihovu idempotency podršku.

### MOB-AUD-07 — Metapodaci APK updatera i ograničenja preuzimanja nisu runtime validirani (P3)

**Dokaz:** `fetchLatestAndroidRelease()` direktno castuje `res.json()` u `LatestAndroidRelease`, a `fetch` nema timeout (`apk-update.ts:43-48`). Preuzimanje koristi URL i `versionCode` iz metapodataka. SHA-256 se provjerava prije instalacije — to je vrijedna kontrola integriteta — ali ne postoji validacija tipova polja release objekta, ograničenje apsolutnog APK hosta ni poređenje preuzete veličine s `apkSizeBytes` prije hashiranja/instalacije (`:95-120`).

**Uticaj:** neispravni/verzijski neusklađeni metapodaci ili nedostupan/spor endpoint mogu tiho onemogućiti automatsku provjeru ili srušiti tok instalacije; neočekivano veliko preuzimanje može potrošiti cache/prostor prije provjere hasha. Nije pronađen dokaz da postoji zlonamjeran trenutni release.

**Smjer implementacije:** runtime validirati release objekat, koristiti ograničene mrežne rokove i maksimalnu veličinu, provjeriti dozvoljenu shemu/host URL-a prema planu objave te testirati nevažeće metapodatke, prevelike/nepotpune fajlove, nepodudaranje hasha i prekinuto preuzimanje. Zadržati postojeću SHA-256 provjeru.

### MOB-AUD-08 — Provjere pristupačnosti i lokalizacije ne obuhvataju cijeli UI (P2/P3)

**Dokaz:** automatski guard za sirovi vidljivi tekst provjerava sedam fajlova (`scripts/check-mobile-i18n.cjs`); mnogi drugi ekrani imaju samo usko fokusirane source-copy testove, a ne provjeru lokalizacije cijele aplikacije ili test renderovanja na više jezika. Pregled izvornog koda našao je i gesture/icon kontrole bez potpune semantike za čitače ekrana: before/after slider je `View` s gesture handlerima, ali nema pristupačnu promjenjivu vrijednost (`components/BeforeAfterSlider.tsx`); zvjezdice za recenziju nemaju zasebne accessibility oznake ni stanje odabira (`screens/client/ReviewsScreen.tsx`, `StarRating`).

**Uticaj:** na nepregledanim ekranima mogu nedostajati prevodi ili accessibility oznake; neke kontrole možda neće biti upotrebljive ili razumljive uz VoiceOver/TalkBack. Ovim auditom nisu izvršeni testovi assistive tehnologija ni vizuelna matrica kontrasta/rasporeda.

**Smjer implementacije:** postepeno proširiti copy guard na sve ekrane; dodati semantičke role/oznake/stanja i pristupačne alternative za geste; tokom planirane provjere na fizičkom uređaju provjeriti dužinu prevoda, skaliranje teksta, redoslijed fokusa, kontrast i veličinu dodirnih ciljeva.

### MOB-AUD-09 — Greške pri otvaranju vanjskih linkova mogu ostati neuhvaćene na Contact ekranu (P3)

**Dokaz:** kontakt linkovi direktno pozivaju `Linking.openURL`, a web fallback za mapu se čeka nakon `catch` bloka za native link (`ContactScreen.tsx`, `SocialLink` i `openMaps`). Ako OS ne može otvoriti URL, nema završnog `catch` bloka ni poruke za korisnika.

**Uticaj:** odbijeni native link promise može postati neuhvaćena greška handlera događaja. Ovo se odnosi na otvaranje vanjskih linkova, ne na API klijent.

**Smjer implementacije:** validirati dozvoljene URL sheme i obuhvatiti neuspjehe `canOpenURL/openURL` uz lokalizovani fallback ili poruku; testirati slučaj kada OS nema aplikaciju/handler za link.

## Pregledani API obuhvat mobilne aplikacije

Pozivi iz izvornog koda grupisani su i poređeni s rutama/guardovima Nest kontrolera. Spisak opisuje mobilnu stranu; ne potvrđuje da endpointi rade na živom servisu.

- **Identitet/profil/početno podešavanje:** `/auth/login`, `/auth/register`, `/auth/change-password`, `/auth/send-verification-email`, `/auth/verify-email`; `/api/users/profile` (GET/PUT), upload avatara i vidljivost; pretraga klijenata za dnevnik; pronalaženje profila stiliste. MOB-01/03/05 pokrivaju ključne putanje korisnika/uloga/sesije/avatara; ponašanje početnog podešavanja i stanja odgovora još zahtijeva provjeru renderovanja/uređaja.
- **Katalog/javni sadržaj:** javne postavke, radno vrijeme salona, kategorije/potkategorije/usluge/popularne usluge, spisak stilista/usluga, lista/detalj/komentari bloga, recenzije/istaknuta recenzija i before/after galerije. Rute su poređene s backendom, ali runtime validacija stranica/redova i oporavljiva stanja greške nisu ujednačeni (AUD-02/03/04).
- **Rezervacije klijenta:** lista/detalj, availability datumi/slotovi, kreiranje s idempotency ključem, otkazivanje/potvrda dolaska/prihvatanje ili odbijanje promjene termina; pomoćni loyalty i debt pozivi. Availability i kreiranje ojačani su u MOB-06; ostaju UX grešaka za akcije i pomoćni prikazi.
- **Operacije stiliste:** lista rezervacija u inboxu i lock/unlock/accept/reject; raspored/detalj/start/staff-confirm/otkazivanje/no-show/reorder/reschedule; direktno zakazivanje; dnevnik — lista/detalj/kreiranje/izmjena/završetak/raspoređivanje/brisanje/upload slika; lista/naplata dugova; statistika. Putanje odgovaraju porodicama ruta s guardovima u Nest kontrolerima reservations, daily-log, finance/client-debts, users i uploads. Ostaju validacija odgovora, zaštita zastarjelih zahtjeva, UX grešaka, djelimične mutacije i provjera na uređaju.
- **Obavijesti/realtime:** lista/čitanje obavijesti, registracija/uklanjanje push tokena, Socket.IO događaji rezervacija/dnevnika/postavki/availabilityja i osvježavanje obavijesti. Zaštita push promise grešaka i oporavak socket veze su implementirani; izolacija stanja obavijesti i validacija payload događaja ostaju.
- **Platforma/update/mediji:** SecureStore, ImagePicker, Expo Notifications, metapodaci/preuzimanje/instalacija aplikacijskog ažuriranja, autentifikovani privatni uploadi, eksplicitni javni mediji i rezervne slike. Pristup privatnom upload sadržaju i fallback slika pregledani su u kodu; updater validacija i native dozvole/instalacija nisu provjereni na uređaju.

## Provjera zavisnosti i builda

- Najnoviji CI prije ovog audita: GitHub Actions `41029530788`, sva četiri joba su prošla. Mobilni job uključuje kompletnu Node test suite (**141 test** na MOB-06 reviziji koda), TypeScript provjeru i Expo SDK57 iOS JavaScript export. To nije native iOS/Android binary build.
- `npm audit` za `mobile` prijavljuje **10 low, 0 moderate, 0 high i 0 critical** upozorenja. Jedan identifikovani paket je tranzitivni `deepmerge@4.3.1` ispod Expo configa (`GHSA-gcqx-w48m-w2h4`); riječ je o build/config alatu, ne o potvrđenoj putanji aplikacijskog runtimea. Više preostalih npm stavki koristi široke/canary raspone, a npm predlaže major/downgrade rješenja (uključujući Expo 51), pa rezultat nije siguran plan za masovne nadogradnje. Zavisnosti nisu mijenjane. Svako upozorenje treba provjeriti prema instaliranom lancu zavisnosti prije ciljane izmjene; ne raditi grupni upgrade Expo/RN/Router paketa.
- Za trenutni kod postoje uspješni typecheck, CI i Expo iOS export rezultati iz MOB-06. U ovom audit krugu nije rađen Android Expo export/native build ni test na uređaju.

## Predloženi redoslijed implementacije nakon audita

1. Odrediti staging/test backend i host za fajlove u developer profilu prije fizičkog testiranja tokova koji mijenjaju podatke (AUD-01).
2. Dodati DTO validatore i regresijske fixture za booking pomoćne prikaze, Home, obavijesti, katalog/galerije i stylist daily-log/inbox ekrane (AUD-02/AUD-05).
3. Dodati vidljiva stanja greške/ponovnog pokušaja/zastarjelih podataka i izolovati asinhrone zahtjeve/store podatke po ruti i prijavljenom identitetu (AUD-03/AUD-04).
4. Ujednačiti obradu grešaka mutacija i učiniti višekoračni upload/akcije sigurnim pri djelimičnom neuspjehu (AUD-06).
5. Ojačati validaciju updater metapodataka/ograničenja preuzimanja i obradu vanjskih linkova (AUD-07/AUD-09).
6. Proširiti lokalizacijske/pristupačne provjere istovremeno s implementacijom zahvaćenih UI dijelova (AUD-08).
7. Nakon što se implementacijski sliceovi commituju i prođu CI, napraviti developer build prema dogovorenom neprodukcijskom API-ju; zatim prije produkcijskog builda obaviti vizuelnu provjeru na fizičkom uređaju, provjeru dozvola, VoiceOver/TalkBack, mrežnih grešaka i tokova po ulogama.
