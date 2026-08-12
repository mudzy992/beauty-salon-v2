# Build problems (backend Docker)

**Status:** RESOLVED 2026-08-12 — `npm run build` prolazi lokalno.

**Uzroci i fixovi:**
1. `reservation-client-actions.service.ts` — tijelo `confirmAttendance` bilo izvan metode (nedostajala signatura); vraćeno `async confirmAttendance(id, clientId)`.
2. `availability.service.ts` — `export type { ... }` umjesto `export { ... }` (`isolatedModules`).
3. `create-reservation.dto.ts` / `admin-create-reservation.dto.ts` — `@Validate` na klasi nije validan; premješten na `serviceId` property.

---

## Originalni Docker log (prije fixa)

#12 1.718 Loaded Prisma config from prisma.config.ts.

#12 1.718

#12 1.918 Prisma schema loaded from prisma/schema.prisma.

#12 2.877

#12 2.877 ✔ Generated Prisma Client (v7.5.0) to ./node_modules/@prisma/client in 627ms

#12 2.877

#12 2.877 Start by importing your Prisma Client (See: ++[https://pris.ly/d/importing-client)](https://pris.ly/d/importing-client)++

#12 2.877

#12 2.877

#12 DONE 3.0s

#13 [builder 8/8] RUN npm run build

#13 0.332

#13 0.332 > backend@0.0.1 build

#13 0.332 > nest build

#13 0.332

#13 10.70 src/reservations/availability.service.ts:7:10 - error TS1205: Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'.

#13 10.70

#13 10.70 7 export { AvailableSlotDto, AvailableDateDto } from './availability.types';

#13 10.70            ~~~~~~~~~~~~~~~~

#13 10.70 src/reservations/availability.service.ts:7:28 - error TS1205: Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'.

#13 10.70

#13 10.70 7 export { AvailableSlotDto, AvailableDateDto } from './availability.types';

#13 10.70                              ~~~~~~~~~~~~~~~~

#13 10.70 src/reservations/dto/admin-create-reservation.dto.ts:12:1 - error TS1238: Unable to resolve signature of class decorator when called as an expression.

#13 10.70   The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.

#13 10.70

#13 10.70 12 @Validate(RequireServiceSelectionConstraint)

#13 10.70

#13 10.70 164     if (r.clientId !== clientId)

#13 10.70             ~

#13 10.70 src/reservations/reservation-client-actions.service.ts:164:24 - error TS2304: Cannot find name 'clientId'.

#13 10.70

#13 10.70 164     if (r.clientId !== clientId)

#13 10.70                            ~~~~~~~~

#13 10.70 src/reservations/reservation-client-actions.service.ts:168:9 - error TS2304: Cannot find name 'r'.

#13 10.70

#13 10.70 168     if (r.status !== RESERVATION_STATUS.CONFIRMED) {

#13 10.70             ~

#13 10.70 src/reservations/reservation-client-actions.service.ts:173:25 - error TS2532: Object is possibly 'undefined'.

#13 10.70

#13 10.70 173     const salon = await this.prisma.salonSettings.findFirst();

#13 10.70                             ~~~~

#13 10.70 src/reservations/reservation-client-actions.service.ts:175:32 - error TS2532: Object is possibly 'undefined'.

#13 10.70

#13 10.70 175     const reservationStartAt = this.dates.combineDateAndTime(

#13 10.70                                    ~~~~

#13 10.70 src/reservations/reservation-client-actions.service.ts:176:7 - error TS2304: Cannot find name 'r'.

#13 10.70

#13 10.70 176       r.reservationDate,

#13 10.70           ~

#13 10.70 src/reservations/reservation-client-actions.service.ts:177:7 - error TS2304: Cannot find name 'r'.

#13 10.70

#13 10.70 177       r.startTime,

#13 10.70           ~

#13 10.70 src/reservations/reservation-client-actions.service.ts:179:33 - error TS2532: Object is possibly 'undefined'.

#13 10.70

#13 10.70 179     const deadlineHours = await this.dates.getAttendanceConfirmDeadlineHours();

#13 10.70                                     ~~~~

#13 10.70 src/reservations/reservation-client-actions.service.ts:189:11 - error TS2532: Object is possibly 'undefined'.

#13 10.70

#13 10.70 189     await this.prisma.reservation.update({

#13 10.70               ~~~~

#13 10.70 src/reservations/reservation-client-actions.service.ts:190:16 - error TS18004: No value exists in scope for the shorthand property 'id'. Either declare one or provide an initializer.

#13 10.70

#13 10.70 190       where: { id },

#13 10.70                    ~~

#13 10.70 src/reservations/reservation-client-actions.service.ts:192:17 - error TS2532: Object is possibly 'undefined'.

#13 10.70

#13 10.70 192         status: this.shared.transitionTo(

#13 10.70                     ~~~~

#13 10.70 src/reservations/reservation-client-actions.service.ts:193:11 - error TS2304: Cannot find name 'r'.

#13 10.70

#13 10.70 193           r.status,

#13 10.70               ~

#13 10.70 src/reservations/reservation-client-actions.service.ts:199:29 - error TS2532: Object is possibly 'undefined'.

#13 10.70

#13 10.70 199     const confirmed = await this.queries.findOne(id, {

#13 10.70                                 ~~~~

#13 10.70 src/reservations/reservation-client-actions.service.ts:199:50 - error TS2304: Cannot find name 'id'.

#13 10.70

#13 10.70 199     const confirmed = await this.queries.findOne(id, {

#13 10.70                                                      ~~

#13 10.70 src/reservations/reservation-client-actions.service.ts:200:12 - error TS2304: Cannot find name 'clientId'.

#13 10.70

#13 10.70 200       sub: clientId,

#13 10.70                ~~~~~~~~

#13 10.70 src/reservations/reservation-client-actions.service.ts:205:5 - error TS2532: Object is possibly 'undefined'.

#13 10.70

#13 10.70 205     [this.events](http://this.events).emitToAdmins(

#13 10.70         ~~~~

#13 10.70 src/reservations/reservation-client-actions.service.ts:210:3 - error TS1128: Declaration or statement expected.

#13 10.70

#13 10.70 210   }

#13 10.70       ~

#13 10.70 src/reservations/reservation-client-actions.service.ts:211:1 - error TS1128: Declaration or statement expected.

#13 10.70

#13 10.70 211 }

#13 10.70     ~

#13 10.70 src/reservations/reservations.service.ts:96:34 - error TS2339: Property 'confirmAttendance' does not exist on type 'ReservationClientActionsService'.

#13 10.70

#13 10.70 96     return this.clientActionsSvc.confirmAttendance(id, clientId);

#13 10.70                                     ~~~~~~~~~~~~~~~~~

#13 10.70

#13 10.70 Found 30 error(s).

#13 10.70

#13 ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1

------

 > [builder 8/8] RUN npm run build:

10.70

10.70 211 }

10.70     ~

10.70 src/reservations/reservations.service.ts:96:34 - error TS2339: Property 'confirmAttendance' does not exist on type 'ReservationClientActionsService'.

10.70

10.70 96     return this.clientActionsSvc.confirmAttendance(id, clientId);

10.70                                     ~~~~~~~~~~~~~~~~~

10.70

10.70 Found 30 error(s).

10.70
