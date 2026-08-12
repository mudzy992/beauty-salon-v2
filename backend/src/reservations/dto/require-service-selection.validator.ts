import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

type ServiceSelectionDto = {
  serviceId?: string;
  serviceIds?: string[];
};

@ValidatorConstraint({ name: 'requireServiceSelection', async: false })
export class RequireServiceSelectionConstraint
  implements ValidatorConstraintInterface
{
  validate(_: unknown, args: ValidationArguments): boolean {
    const dto = args.object as ServiceSelectionDto;
    const ids = (dto.serviceIds ?? []).map((x) => x.trim()).filter(Boolean);
    if (ids.length > 0) return true;
    return Boolean(dto.serviceId?.trim());
  }

  defaultMessage(): string {
    return 'Potrebno je navesti serviceId ili serviceIds.';
  }
}
