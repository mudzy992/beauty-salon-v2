```

```


    modelName: 'Reservation',

    driverAdapterError: DriverAdapterError: ColumnNotFound

        at PrismaMariaDbAdapter.onError (/usr/app/node_modules/@prisma/adapter-mariadb/dist/index.js:354:11)

        at PrismaMariaDbAdapter.performIO (/usr/app/node_modules/@prisma/adapter-mariadb/dist/index.js:349:12)

        at process.processTicksAndRejections (node:internal/process/task_queues:103:5)

        at async PrismaMariaDbAdapter.queryRaw (/usr/app/node_modules/@prisma/adapter-mariadb/dist/index.js:315:20)

        at async e.interpretNode (/usr/app/node_modules/@prisma/client/runtime/client.js:11:44573)

        at async e.interpretNode (/usr/app/node_modules/@prisma/client/runtime/client.js:11:46237)

        at async [e.run](http://e.run) (/usr/app/node_modules/@prisma/client/runtime/client.js:11:43287)

        at async e.execute (/usr/app/node_modules/@prisma/client/runtime/client.js:57:815)

        at async jt.request (/usr/app/node_modules/@prisma/client/runtime/client.js:58:2327)

        at async Object.singleLoader (/usr/app/node_modules/@prisma/client/runtime/client.js:65:6569) {

      cause: {

        originalCode: '1054',

        originalMessage: "Unknown column 'reservations.reminder_sent_at' in 'where clause'",

        kind: 'ColumnNotFound',

        column: 'reservations.reminder_sent_at'

      }

    }

  },

  clientVersion: '7.5.0'

}

[Nest] 1  - 08/15/2026, 8:04:00 AM   ERROR [Scheduler] PrismaClientKnownRequestError:

Invalid `prisma.reservation.findMany()` invocation:

The column `reservations.reminder_sent_at` does not exist in the current database.

    at Gr.handleRequestError (/usr/app/node_modules/@prisma/client/runtime/client.js:65:8286)

    at Gr.handleAndLogRequestError (/usr/app/node_modules/@prisma/client/runtime/client.js:65:7581)

    at Gr.request (/usr/app/node_modules/@prisma/client/runtime/client.js:65:7288)

    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)

    at async a (/usr/app/node_modules/@prisma/client/runtime/client.js:75:6730)

    at async ReservationAppointmentReminderService.processAppointmentReminders (/usr/app/dist/src/reservations/reservation-appointment-reminder.service.js:40:22)

    at async ReservationDelayCron.tick (/usr/app/dist/src/reservations/reservation-delay.cron.js:42:9)

    at async CronJob.<anonymous> (/usr/app/node_modules/@nestjs/schedule/dist/schedule.explorer.js:119:17) {

  code: 'P2022',



{

    modelName: 'Reservation',

    driverAdapterError: DriverAdapterError: ColumnNotFound

        at PrismaMariaDbAdapter.onError (/usr/app/node_modules/@prisma/adapter-mariadb/dist/index.js:354:11)

        at PrismaMariaDbAdapter.performIO (/usr/app/node_modules/@prisma/adapter-mariadb/dist/index.js:349:12)

        at process.processTicksAndRejections (node:internal/process/task_queues:103:5)

        at async PrismaMariaDbAdapter.queryRaw (/usr/app/node_modules/@prisma/adapter-mariadb/dist/index.js:315:20)

        at async e.interpretNode (/usr/app/node_modules/@prisma/client/runtime/client.js:11:44573)

        at async e.interpretNode (/usr/app/node_modules/@prisma/client/runtime/client.js:11:46237)

        at async [e.run](http://e.run) (/usr/app/node_modules/@prisma/client/runtime/client.js:11:43287)

        at async e.execute (/usr/app/node_modules/@prisma/client/runtime/client.js:57:815)

        at async jt.request (/usr/app/node_modules/@prisma/client/runtime/client.js:58:2327)

        at async Object.singleLoader (/usr/app/node_modules/@prisma/client/runtime/client.js:65:6569) {

      cause: {

        originalCode: '1054',

        originalMessage: "Unknown column 'reservations.reminder_sent_at' in 'where clause'",

        kind: 'ColumnNotFound',

        column: 'reservations.reminder_sent_at'

      }

    }

  },

  clientVersion: '7.5.0'

}

[Nest] 1  - 08/15/2026, 8:05:00 AM   ERROR [Scheduler] PrismaClientKnownRequestError:

Invalid `prisma.reservation.findMany()` invocation:

The column `reservations.reminder_sent_at` does not exist in the current database.

    at Gr.handleRequestError (/usr/app/node_modules/@prisma/client/runtime/client.js:65:8286)

    at Gr.handleAndLogRequestError (/usr/app/node_modules/@prisma/client/runtime/client.js:65:7581)

    at Gr.request (/usr/app/node_modules/@prisma/client/runtime/client.js:65:7288)

    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)

    at async a (/usr/app/node_modules/@prisma/client/runtime/client.js:75:6730)

    at async ReservationAppointmentReminderService.processAppointmentReminders (/usr/app/dist/src/reservations/reservation-appointment-reminder.service.js:40:22)

    at async ReservationDelayCron.tick (/usr/app/dist/src/reservations/reservation-delay.cron.js:42:9)

    at async CronJob.<anonymous> (/usr/app/node_modules/@nestjs/schedule/dist/schedule.explorer.js:119:17) {

  code: 'P2022',



{

    modelName: 'Reservation',

    driverAdapterError: DriverAdapterError: ColumnNotFound

        at PrismaMariaDbAdapter.onError (/usr/app/node_modules/@prisma/adapter-mariadb/dist/index.js:354:11)

        at PrismaMariaDbAdapter.performIO (/usr/app/node_modules/@prisma/adapter-mariadb/dist/index.js:349:12)

        at process.processTicksAndRejections (node:internal/process/task_queues:103:5)

        at async PrismaMariaDbAdapter.queryRaw (/usr/app/node_modules/@prisma/adapter-mariadb/dist/index.js:315:20)

        at async e.interpretNode (/usr/app/node_modules/@prisma/client/runtime/client.js:11:44573)

        at async e.interpretNode (/usr/app/node_modules/@prisma/client/runtime/client.js:11:46237)

        at async [e.run](http://e.run) (/usr/app/node_modules/@prisma/client/runtime/client.js:11:43287)

        at async e.execute (/usr/app/node_modules/@prisma/client/runtime/client.js:57:815)

        at async jt.request (/usr/app/node_modules/@prisma/client/runtime/client.js:58:2327)

        at async Object.singleLoader (/usr/app/node_modules/@prisma/client/runtime/client.js:65:6569) {

      cause: {

        originalCode: '1054',

        originalMessage: "Unknown column 'reservations.reminder_sent_at' in 'where clause'",

        kind: 'ColumnNotFound',

        column: 'reservations.reminder_sent_at'

      }

    }

  },

  clientVersion: '7.5.0'

}
