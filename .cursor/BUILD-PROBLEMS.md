#13 [builder 8/8] RUN npm run build

#13 0.317

#13 0.317 > backend@0.0.1 build

#13 0.317 > nest build

#13 0.317

#13 11.85 src/daily-log/daily-log-disposition-apply.ts:119:5 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 119     deps.prisma,

#13 11.85         ~~~~~~~~~~~

#13 11.85 src/daily-log/daily-log-disposition-apply.ts:226:40 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 226   const ctx = await resolvePushContext(deps.prisma, reservationId);

#13 11.85                                            ~~~~~~~~~~~

#13 11.85 src/reservations/reservation-attendance-cron.service.ts:83:44 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 83       const ctx = await resolvePushContext(this.prisma, [r.id](http://r.id));

#13 11.85                                               ~~~~~~~~~~~

#13 11.85 src/reservations/reservation-client-actions.service.ts:103:46 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 103         const ctx = await resolvePushContext(this.prisma, id, r.publicReferenceCode);

#13 11.85                                                  ~~~~~~~~~~~

#13 11.85 src/reservations/reservation-client-actions.service.ts:156:44 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 156       const ctx = await resolvePushContext(this.prisma, id, r.publicReferenceCode);

#13 11.85                                                ~~~~~~~~~~~

#13 11.85 src/reservations/reservation-delay.cron.ts:97:48 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 97           const ctx = await resolvePushContext(this.prisma, [f.id](http://f.id));

#13 11.85                                                   ~~~~~~~~~~~

#13 11.85 src/reservations/reservation-inbox-cron.service.ts:106:9 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 106         this.prisma,

#13 11.85             ~~~~~~~~~~~

#13 11.85 src/reservations/reservation-notify.service.ts:36:7 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 36       this.prisma,

#13 11.85          ~~~~~~~~~~~

#13 11.85 src/reservations/reservation-notify.service.ts:73:7 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 73       this.prisma,

#13 11.85          ~~~~~~~~~~~

#13 11.85 src/reservations/reservation-reorder.service.ts:150:42 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 150     const ctx = await resolvePushContext(this.prisma, [reservation.id](http://reservation.id));

#13 11.85                                              ~~~~~~~~~~~

#13 11.85 src/reservations/reservation-reschedule-commit.service.ts:93:44 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 93       const ctx = await resolvePushContext(this.prisma, [item.id](http://item.id));

#13 11.85                                               ~~~~~~~~~~~

#13 11.85 src/reservations/reservation-runtime-cancel.service.ts:100:9 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 100         this.prisma,

#13 11.85             ~~~~~~~~~~~

#13 11.85 src/reservations/reservation-runtime-cancel.service.ts:206:42 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 206     const ctx = await resolvePushContext(this.prisma, reservationId);

#13 11.85                                              ~~~~~~~~~~~

#13 11.85 src/reservations/reservation-stylist-accept.service.ts:150:44 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 150       const ctx = await resolvePushContext(this.prisma, reservationId);

#13 11.85                                                ~~~~~~~~~~~

#13 11.85 src/reservations/reservation-stylist-reject.service.ts:98:11 - error TS2345: Argument of type 'PrismaService' is not assignable to parameter of type 'PrismaLike'.

#13 11.85   The types of 'reservation.findUnique(...).then' are incompatible between these types.

#13 11.85     Type '<TResult1 = { id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | Promi...' is not assignable to type '<TResult1 = { publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null, TResult2 = never>(onfulfilled?: ((value: { ...; } | null) => TResult1 | PromiseLike<....'.

#13 11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

#13 11.85         Types of parameters 'value' and 'value' are incompatible.

#13 11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

#13 11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

#13 11.85

#13 11.85 98           this.prisma,

#13 11.85              ~~~~~~~~~~~

#13 11.85

#13 11.85 Found 15 error(s).

#13 11.85

#13 ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1

Dockerfile:12

------

 > [builder 8/8] RUN npm run build:

11.85       Types of parameters 'onfulfilled' and 'onfulfilled' are incompatible.

11.85         Types of parameters 'value' and 'value' are incompatible.

11.85           Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; } | null' is not assignable to type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; } | null'.

11.85             Type '{ id: string; updatedAt: Date; createdAt: Date; publicReferenceCode: string; clientViewToken: string; status: string; confirmedStylistId: string | null; reservationDate: Date; ... 26 more ...; payDebtsIntent: boolean; }' is missing the following properties from type '{ publicReferenceCode: string; reservationDate: Date; startTime: string; endTime: string; attendancePolicy: string; service: { name: string; } | null; items: { sortOrder: number; service: { ...; } | null; }[]; }': service, items

11.85

11.85 98           this.prisma,

11.85              ~~~~~~~~~~~

11.85

11.85 Found 15 error(s).

11.85

------

--------------------

  10 |     ENV DATABASE_URL="***:3306/beauty-salon-v2"

  11 |     RUN npx prisma generate

  12 | >>> RUN npm run build

  13 |

  14 |     FROM node:22-alpine
