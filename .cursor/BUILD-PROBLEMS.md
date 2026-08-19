# 13 0.493

#13 12.39 src/daily-log/daily-log-restore.service.ts:120:30 - error TS2339: Property 'items' does not exist on type '{ id: string; updatedAt: Date; createdAt: Date; kind: DailyLogEntryKind; date: Date; publicReferenceCode: string; reservationId: string | null; ... 17 more ...; deleteReason: string | null; } & { ...; }'.

#13 12.39

#13 12.39 120     const serviceIds = entry.items?.length

#13 12.39                                  ~~~~~

#13 12.39 src/daily-log/daily-log-restore.service.ts:121:15 - error TS2339: Property 'items' does not exist on type '{ id: string; updatedAt: Date; createdAt: Date; kind: DailyLogEntryKind; date: Date; publicReferenceCode: string; reservationId: string | null; ... 17 more ...; deleteReason: string | null; } & { ...; }'.

#13 12.39

#13 12.39 121       ? [entry.items.map](http://entry.items.map)((i) => i.serviceId)

#13 12.39                   ~~~~~

#13 12.39 src/daily-log/daily-log-restore.service.ts:121:26 - error TS7006: Parameter 'i' implicitly has an 'any' type.

#13 12.39

#13 12.39 121       ? [entry.items.map](http://entry.items.map)((i) => i.serviceId)

#13 12.39                              ~

#13 12.39 src/daily-log/daily-log-restore.service.ts:174:31 - error TS7006: Parameter 'sid' implicitly has an 'any' type.

#13 12.39

#13 12.39 174         data: [serviceIds.map](http://serviceIds.map)((sid, idx) => ({

#13 12.39                                   ~~~

#13 12.39 src/daily-log/daily-log-restore.service.ts:174:36 - error TS7006: Parameter 'idx' implicitly has an 'any' type.

#13 12.39

#13 12.39 174         data: [serviceIds.map](http://serviceIds.map)((sid, idx) => ({

#13 12.39                                        ~~~

#13 12.39

#13 12.39 Found 5 error(s).

#13 12.39

#13 ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1

------

 > [builder 8/8] RUN npm run build:

12.39

12.39 174         data: [serviceIds.map](http://serviceIds.map)((sid, idx) => ({

12.39                                   ~~~

12.39 src/daily-log/daily-log-restore.service.ts:174:36 - error TS7006: Parameter 'idx' implicitly has an 'any' type.

12.39

12.39 174         data: [serviceIds.map](http://serviceIds.map)((sid, idx) => ({

12.39                                        ~~~

12.39

12.39 Found 5 error(s).
