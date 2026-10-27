import { SetMetadata } from '@nestjs/common';

export const ALLOW_DURING_PASSWORD_CHANGE = 'allowDuringPasswordChange';

/** Allow only bootstrap/password-change routes for users with a forced change pending. */
export const AllowDuringPasswordChange = () =>
  SetMetadata(ALLOW_DURING_PASSWORD_CHANGE, true);
