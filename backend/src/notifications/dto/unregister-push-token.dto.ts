import { IsString, Matches } from 'class-validator';

export class UnregisterPushTokenDto {
  @IsString()
  @Matches(/^Expo(?:nent)?PushToken\[.+\]$/, {
    message: 'Token mora biti valjani Expo push token',
  })
  token: string;
}
