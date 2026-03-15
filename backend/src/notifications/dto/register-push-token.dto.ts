import { IsIn, IsString, Matches } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @Matches(/^Expo(?:nent)?PushToken\[.+\]$/, {
    message: 'Token mora biti valjani Expo push token',
  })
  token: string;

  @IsIn(['IOS', 'ANDROID', 'WEB'])
  platform: 'IOS' | 'ANDROID' | 'WEB';
}
