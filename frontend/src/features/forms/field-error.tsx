import { useEffect, useRef } from 'react'

/**
 * Dijeljivi primitivi za greške u formama (WCAG 3.3.1 / 3.3.3 / 4.1.2).
 *
 * Zašto postoje
 * ─────────────
 * Prije ovoga greške su išle **samo kroz toast** (28 `toast.error` poziva u `src/`), a
 * `aria-invalid`/`aria-describedby` su postojali u svega 3 fajla. Konkretno za dnevnu
 * knjigu: `use-daily-log-form.ts` je u `catch` grani bacao **cijeli** serverski odgovor i
 * prikazivao generički `saveFailed` — a backend koristi `ValidationPipe` s DTO dekoratorima
 * (`@IsUUID`, `@IsArray`, …), dakle vraća popis poruka po polju. Prijedlozi za ispravku su
 * **poznati**, pa ih 3.3.3 traži; toast ih je odbacivao.
 *
 * Uzorak je preuzet iz jedinog mjesta koje je ovo već radilo ispravno
 * (`features/settings/setting-editor-form.tsx:32,232`): `errorId = `${inputId}-error``,
 * `role="alert"`, `text-rose-700`. Nove boje nisu uvodene namjerno — svaka klasa ovdje već
 * postoji u kodnoj bazi, da `check_ui_contrast.py --strict` ne dobije novi par.
 *
 * 🔴 Ograničenje: ovo su source-level primitivi. Da li čitač ekrana stvarno najavi sažetak
 * prije čitanja polja nije provjereno — za to treba AT test, kojeg u projektu još nema.
 */

/** `id` elementa koji nosi tekst greške za dato polje. */
export function fieldErrorId(fieldId: string): string {
  return `${fieldId}-error`
}

/**
 * Jedna greška u sažetku.
 *
 * `fieldId` je opcionalan: serverske validacijske poruke (NestJS `ValidationPipe` vraća
 * `{ message: string[] }`) nisu vezane za naša polja, pa se prikazuju kao tekst bez linka
 * umjesto da se izmišlja veza koje nema.
 */
export type FieldErrorEntry = { fieldId?: string; message: string }

/**
 * Atributi koje kontrola treba kad ima grešku.
 *
 * Vraća prazan objekt kad greške nema, pa se može bezuslovno rasprostraniti:
 * `{...fieldErrorProps(id, errors[id])}`.
 */
export function fieldErrorProps(fieldId: string, message: string | undefined | null) {
  if (!message) return {}
  return {
    'aria-invalid': true as const,
    'aria-describedby': fieldErrorId(fieldId),
  }
}

/**
 * Tekst greške uz samo polje.
 *
 * `role="alert"` da čitač ekrana najavi čim se pojavi; `id` je meta za
 * `aria-describedby` na kontroli i za link iz sažetka.
 */
export function FieldError({
  fieldId,
  message,
}: {
  fieldId: string
  message: string | undefined | null
}) {
  if (!message) return null
  return (
    <p
      id={fieldErrorId(fieldId)}
      role="alert"
      className="mt-1 text-sm font-medium text-rose-700"
    >
      {message}
    </p>
  )
}

/**
 * Sažetak grešaka na vrhu forme, s linkovima na polja.
 *
 * Zašto i `aria-describedby` uz polju i ovaj sažetak: toast je prolazan i nije vezan za
 * kontrolu, pa ga korisnik čitača ekrana lako promaši. Sažetak je trajan, najavljen kroz
 * `role="alert"`, i prima fokus (`tabIndex={-1}`) da korisnik odmah zna da nešto treba
 * ispraviti — fokus prsten dolazi iz globalnog pravila `globals.css:208`
 * (`:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible`).
 *
 * Linkovi rade i bez JS-a (`href="#id"`), a `onClick` samo sprječava skok i fokusira polje.
 */
export function FormErrorSummary({
  title,
  errors,
}: {
  title: string
  errors: readonly FieldErrorEntry[]
}) {
  // ⚠️ Hookovi MORAJU biti iznad early return-a: `react-hooks/rules-of-hooks` je error,
  // a `test:hooks-order` čita cijeli `src/`.
  const ref = useRef<HTMLDivElement>(null)
  const count = errors.length

  useEffect(() => {
    if (count > 0) ref.current?.focus()
  }, [count])

  if (count === 0) return null

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3"
    >
      <p className="text-sm font-semibold text-rose-900">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.map((entry) => {
          const targetId = entry.fieldId
          return (
            <li key={`${targetId ?? 'form'}:${entry.message}`} className="text-sm text-rose-800">
              {targetId ? (
                <a
                  href={`#${targetId}`}
                  className="underline underline-offset-2"
                  onClick={(event) => {
                    event.preventDefault()
                    document.getElementById(targetId)?.focus()
                  }}
                >
                  {entry.message}
                </a>
              ) : (
                entry.message
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
