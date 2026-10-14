import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type SMTPTransport = require('nodemailer/lib/smtp-transport');
import { createConnection, Socket } from 'net';
import { EmailMessage, EmailProvider } from './email-provider';

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  constructor(private readonly config: ConfigService) {}

  async send(message: EmailMessage): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    const from = this.config.get<string>('SMTP_FROM');
    const port = Number(this.config.get('SMTP_PORT'));
    const secureSetting = String(this.config.get('SMTP_SECURE', 'false'));
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    if (
      !host ||
      !from ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      !['true', 'false'].includes(secureSetting) ||
      Boolean(user) !== Boolean(pass)
    ) {
      throw new Error('Email transport is not configured');
    }
    const secure = secureSetting === 'true';
    let socket: Socket | undefined;
    let connectTimer: NodeJS.Timeout | undefined;
    const options: SMTPTransport.Options = {
      host,
      port,
      secure,
      requireTLS: this.config.get('NODE_ENV') === 'production' && !secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
      tls: { rejectUnauthorized: true },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      dnsTimeout: 5000,
      logger: false,
      debug: false,
      // Nodemailer's non-pooled close() cannot cancel an active send. Owning
      // the underlying socket through its supported getSocket hook lets the
      // total deadline terminate TCP even after Nodemailer wraps it in TLS.
      getSocket: (_options, callback) => {
        const connection = (socket = createConnection({ host, port }));
        let completed = false;
        const finish = (error?: Error) => {
          if (completed) return;
          completed = true;
          clearTimeout(connectTimer);
          callback(error ?? null, error ? undefined : { connection });
        };
        connectTimer = setTimeout(() => {
          connection.destroy();
          finish(new Error('SMTP connection timed out'));
        }, 5000);
        connection.once('connect', () => finish());
        connection.on('error', () => finish(new Error('SMTP connection failed')));
      },
    };
    const transport = nodemailer.createTransport(options);
    let timer: NodeJS.Timeout | undefined;
    try {
      // Total budget also bounds a server which keeps the socket active.
      await Promise.race([
        transport.sendMail({ ...message, from, disableFileAccess: true, disableUrlAccess: true }),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Email delivery timed out')), 15000);
        }),
      ]);
    } catch {
      // SMTP exceptions can contain credentials, recipients and message data.
      throw new Error('Email delivery failed');
    } finally {
      clearTimeout(timer);
      clearTimeout(connectTimer);
      socket?.destroy();
      transport.close();
    }
  }
}
