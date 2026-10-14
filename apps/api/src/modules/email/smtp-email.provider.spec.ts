import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SmtpEmailProvider } from './smtp-email.provider';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('SmtpEmailProvider', () => {
  const message = {
    to: 'test@example.com',
    subject: 'Verify email',
    text: 'private verification link',
  };
  const sendMail = jest.fn();
  const close = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue({});
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail, close });
  });
  afterEach(() => jest.useRealTimers());
  const create = (extra: Record<string, unknown> = {}) => {
    const configuration: Record<string, unknown> = {
      SMTP_HOST: 'localhost',
      SMTP_PORT: '1025',
      SMTP_SECURE: 'false',
      SMTP_FROM: 'StudyPilot <noreply@studypilot.test>',
      ...extra,
    };
    return new SmtpEmailProvider({
      get: (name: string, fallback?: unknown) => configuration[name] ?? fallback,
    } as ConfigService);
  };
  it('sends local mail without authentication using bounded transport options', async () => {
    await create().send(message);
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'localhost',
        port: 1025,
        secure: false,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        dnsTimeout: 5000,
        logger: false,
        debug: false,
        tls: { rejectUnauthorized: true },
      })
    );
    expect((nodemailer.createTransport as jest.Mock).mock.calls[0][0].auth).toBeUndefined();
    expect(sendMail).toHaveBeenCalledWith({
      ...message,
      from: 'StudyPilot <noreply@studypilot.test>',
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    expect(close).toHaveBeenCalled();
  });
  it('requires production TLS and uses externally configured authentication', async () => {
    await create({
      NODE_ENV: 'production',
      SMTP_PORT: '587',
      SMTP_USER: 'test-user',
      SMTP_PASSWORD: 'test-password',
    }).send(message);
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        requireTLS: true,
        auth: { user: 'test-user', pass: 'test-password' },
        tls: { rejectUnauthorized: true },
      })
    );
  });
  it('supports implicit TLS without downgrading certificate validation', async () => {
    await create({ NODE_ENV: 'production', SMTP_PORT: '465', SMTP_SECURE: 'true' }).send(message);
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true, tls: { rejectUnauthorized: true } })
    );
  });
  it('reports unavailable transport without exposing credentials recipient or token', async () => {
    sendMail.mockRejectedValueOnce(
      new Error('test-password test@example.com private verification link')
    );
    await expect(create().send(message)).rejects.toThrow('Email delivery failed');
    await expect(create({ SMTP_HOST: '', SMTP_FROM: '' }).send(message)).rejects.toThrow(
      'Email transport is not configured'
    );
    expect(close).toHaveBeenCalled();
  });
  it.each([
    { SMTP_PORT: 'bad' },
    { SMTP_PORT: '0' },
    { SMTP_SECURE: 'invalid' },
    { SMTP_USER: 'user' },
    { SMTP_PASSWORD: 'password' },
  ])('rejects invalid configuration safely (%o)', async (extra) => {
    await expect(create(extra).send(message)).rejects.toThrow('Email transport is not configured');
    expect(sendMail).not.toHaveBeenCalled();
  });
  it('bounds total delivery duration and does not retry', async () => {
    jest.useFakeTimers();
    sendMail.mockImplementationOnce(() => new Promise(() => undefined));
    const attempt = create().send(message);
    const rejection = expect(attempt).rejects.toThrow('Email delivery failed');
    await jest.advanceTimersByTimeAsync(15000);
    await rejection;
    expect(close).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
