import { ConfigService } from '@nestjs/config';
import { createServer, Socket } from 'net';
import { AddressInfo } from 'net';
import { SmtpEmailProvider } from './smtp-email.provider';

// Real Nodemailer and TCP sockets: a peer which sends incomplete responses
// frequently enough defeats idle timeouts. Only the provider's 15-second total
// deadline is shortened, keeping the SMTP timing/cleanup behavior authentic.
describe('SmtpEmailProvider resource deadline', () => {
  it('closes a continually active SMTP socket at the deadline and cannot continue delivery', async () => {
    const sockets = new Set<Socket>();
    const commands: string[] = [];
    let closed = false;
    let envelopeStarted!: () => void;
    const envelope = new Promise<void>((resolve) => {
      envelopeStarted = resolve;
    });
    const server = createServer((socket) => {
      sockets.add(socket);
      socket.write('220 localhost test SMTP\r\n');
      let drip: NodeJS.Timeout | undefined;
      socket.on('data', (data) => {
        for (const line of data.toString().trim().split('\r\n')) {
          commands.push(line.split(' ')[0]);
          if (line.startsWith('EHLO')) socket.write('250-localhost\r\n250 SIZE 100000\r\n');
          if (line.startsWith('MAIL FROM')) {
            envelopeStarted();
            socket.write('250-Still processing\r\n');
            drip = setInterval(() => socket.write('250-Still processing\r\n'), 10);
          }
        }
      });
      socket.on('error', () => undefined);
      socket.on('close', () => {
        closed = true;
        clearInterval(drip);
        sockets.delete(socket);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const configuration: Record<string, unknown> = {
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: (server.address() as AddressInfo).port,
      SMTP_SECURE: false,
      SMTP_FROM: 'noreply@studypilot.test',
      NODE_ENV: 'test',
    };
    const provider = new SmtpEmailProvider({
      get: (name: string, fallback?: unknown) => configuration[name] ?? fallback,
    } as ConfigService);
    const originalTimeout = global.setTimeout;
    const timeout = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(((
        callback: (...args: unknown[]) => void,
        delay?: number,
        ...args: unknown[]
      ) => originalTimeout(callback, delay === 15000 ? 200 : delay, ...args)) as typeof setTimeout);
    try {
      const result = provider.send({ to: 'test@example.com', subject: 'Test', text: 'Test body' });
      const rejected = expect(result).rejects.toThrow('Email delivery failed');
      await envelope;
      await rejected;
      await new Promise<void>((resolve) => originalTimeout(resolve, 50));
      expect(closed).toBe(true);
      expect(commands).toEqual(['EHLO', 'MAIL']);
    } finally {
      timeout.mockRestore();
      sockets.forEach((socket) => socket.destroy());
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
