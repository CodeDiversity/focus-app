import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EMAIL_PROVIDER } from './email-provider';
import { SmtpEmailProvider } from './smtp-email.provider';

@Module({
  imports: [ConfigModule],
  providers: [{ provide: EMAIL_PROVIDER, useClass: SmtpEmailProvider }],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
