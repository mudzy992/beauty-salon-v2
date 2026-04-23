-- Add optional reservation reference to client_debts
ALTER TABLE `client_debts`
  ADD CONSTRAINT `client_debts_reservation_id_fkey`
  FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

