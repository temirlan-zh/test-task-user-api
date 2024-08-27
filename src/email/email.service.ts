import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private host: string;
  private port: number;
  private user: string;
  private pass: string;

  constructor(private configService: ConfigService) {
    this.host = this.configService.get<string>('EMAIL_HOST');
    this.port = Number(this.configService.get<string>('EMAIL_PORT'));
    this.user = this.configService.get<string>('EMAIL_USER');
    this.pass = this.configService.get<string>('EMAIL_PASS');
  }

  sendEmail(to: string, subject: string, content: string) {
    console.log(`Sending email to ${to} with subject "${subject}" and content "${content}"`);
  }
}
