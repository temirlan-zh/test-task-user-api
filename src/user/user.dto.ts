import { IsEmail, IsUrl } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsUrl({ require_tld: false })
  avatar: string;

  [key: string]: any;
}
