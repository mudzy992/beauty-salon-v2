# slot-hold checklist

- [x] Plan + POLICY_BACKLOG
- [x] Prisma `hasLockedOnce` + migracija
- [x] Settings `system_reservation_inbox_timeout_hours`
- [x] Capacity helper + availability slots (held UI state)
- [x] Lock: no steal, no re-lock; unlock endpoint
- [x] Accept bez aktivnog locka ako `hasLockedOnce`
- [x] Reject + lock/unlock → `availability:changed`
- [x] Inbox list: sakrij overlapping dok traje lock
- [x] CRON: expire locks + inbox timeout
- [x] Web + mobile booking UI
- [x] Web + mobile inbox: Oslobodi + accept after lock
- [x] Unit testovi (slot-hold + availability + accept)
- [x] MATRIX + MODULE + CHANGELOG
