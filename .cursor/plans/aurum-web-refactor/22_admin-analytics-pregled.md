# Pregled `/admin/analytics` — u toku

## Opseg i plan
- Hub: overview, klijentski i stilistički detalj te postojeći deep linkovi i legacy redirecti. Uloge: dashboard i klijentska analitika OWNER/SYSTEM_ADMIN na API-ju; stilistički ugovor provjeriti posebno. Očuvati sve podatke i funkcionalnosti, globalnu paletu i Classic; korisnik je rekao da Classic nije prioritet opsežne matrice.
- Inventar: `AnalyticsHub.tsx`, `analytics-tab-nav.tsx`, `Analytics.tsx`, `ClientAnalytics.tsx`, `StylistAnalytics.tsx`, shared Card/Button/Input/Label, Recharts i tabele; povezani backend `analytics` service/controller/DTO, users client analytics, stylists analytics, auth/route; lokalizacije BS/EN, E2E i source testovi. Pregled širiti na stvarne zavisnosti, ne tvrditi cijeli backend audit.
- Redoslijed: (1) učitavanje i period, greške/retry, validacija i utrke; (2) brojevi, graf i tekstualna tabela, formati i granice; (3) obje detaljne analitike i deep linkovi; (4) autorizacija, tokovi tastature i BS/EN; (5) svijetli/tamni desktop i 320px, axe AA/AAA sa svim violations i incomplete; (6) CI, evidence matrix, korisnikov vizuelni pregled. Pravi AT/400% zoom nisu dostupni u ovom sandboxu; ne lažno potvrđivati.

## Početni nalazi
- A-01: overview učitava novi zahtjev prilikom svake promjene custom datuma i već pri izboru custom, iako postoji dugme Primijeni; race odgovori nisu sekvencirani. Tokom svakog zahtjeva cijela forma nestaje, a neuspjeh nema retry. Potrebno razlikovati draft od primijenjenog perioda, čuvati mogućnost ispravke, odvojiti loading/error i zaštititi od zastarjelih rezultata.
- A-02: stilistička analitika također automatski učitava pri svakoj promjeni inputa, moguće šalje nepotpun par datuma, nema zaštitu od zastarjelih zahtjeva niti retry; potrebno testirati deep link i filter.
- A-03: overview tabele stilista/usluga nemaju `scope` i jasno pridružene naslove/caption; auditirati responsive i kontrast te graf (uključujući njegove namjenske boje; bez promjene palete bez korisnikove odluke).
- A-04: `/admin/users` deep link popravljen i testiran ranije (`43745675214`), ali to nije audit cijelog huba.

## Evidencija i matrica
Na početku nijedna kombinacija nije zaključena. Posebno evidentirati prikaz s podacima/prazno/greška, odgođene odgovore i 320px za oba Aurum moda; korisnik radi vizuelni pregled. Nema tvrdnje o potpunoj WCAG konformnosti.

## Napredak — overview (nije završetak pregleda)
- A-01 implementirano: custom datumi su draft do Primijeni, obrnuti raspon blokiran; filteri ostaju dostupni dok se učitava, ponovni pokušaj koristi posljednje poslane parametre, sekvenciranje odbacuje zastarjele odgovore, neispravan oblik i nefinancijski numerički podaci se odbacuju. Ne predstavlja iscrpnu validaciju svih polja.
- A-03 djelimično: naslovi pridruženi tabelama i scope na zaglavljima. Pregled kontrasta, responsive i grafa još nije završen.
- CI `43763504337` imao 405 prolaza i jedan neuspjeli novi browser test zbog nepreciznog status lokatora, te frontend source test koji je pretpostavljao uklonjeni early return. Lokator i test ažurirani; CI `43764239517` na `175cf70` prošao svih 5 poslova. Novi browser testovi obuhvataju potvrdu i neispravan raspon, utrku i retry sa mock API podacima; nisu potpuni pregled stranice.
- CI inventar kontrasta pokazao overview Classic AAA nalaze i nepotpune procjene legende grafa; provjeriti namjenski u okviru ove stranice, ne predstavljati kao riješeno.
- A-02, puni backend/računski audit, matrica stvarnih stanja, oba detaljna taba, i stvarni AT/400% ostaju otvoreni. Stranica nije spremna za zatvaranje ni finalnu vizuelnu verifikaciju.
