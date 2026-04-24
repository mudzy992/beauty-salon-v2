# Global Cursor baseline (user-level) — Beauty Salon stack

Ovaj folder je **izvor istine (source)** za tvoja **globalna Cursor pravila i skillove** koja važe za sve buduće projekte sa istim stackom.

## Šta je globalno vs. project-level

- **Globalno (User Rules + User Skills)**: pravila koja su stabilna i važe za sve projekte (stack, plan-first, sigurnost, osnovne konvencije).
- **Project-level (`.cursor/rules/*`)**: domen/specifične stvari (npr. rezervacije, finansije), te project odluke (npr. rute, branding, specifične integracije).

## Gdje se šta nalazi

- **User Rules (global runtime)**: Cursor → Settings → Rules → User Rules
  - Kopiraj sadržaj iz `user-rules.md`.
- **User Hooks (bootstrap automation)**: `C:\\Users\\m.ceric\\.cursor\\hooks.json`
- **User Skills (global runtime)**: `C:\\Users\\m.ceric\\.cursor\\skills\\<skill>\\SKILL.md`

## Promocija pravila (project → global)

Kada dodaš/izmijeniš pravilo u projektu i pokaže se korisno cross-project:

1. Ako je pravilo **opšte** i stabilno → dodaj ga u **User Rules** (i u `user-rules.md`).
2. Ako pravilo zavisi od domene ili strukture konkretnog repoa → ostaje **project-level** u `.cursor/rules/`.
3. Svaki konflikt između dokova i koda evidentiraj u project `SOURCE_OF_TRUTH.md` i `.cursor/docs/03_gap_analysis.md`.

