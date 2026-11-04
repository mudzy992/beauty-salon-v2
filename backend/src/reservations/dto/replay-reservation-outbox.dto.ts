import { Equals, IsBoolean } from 'class-validator';

export class ReplayReservationOutboxDto {
  @IsBoolean()
  @Equals(true)
  confirmAtLeastOnce!: boolean;
}
