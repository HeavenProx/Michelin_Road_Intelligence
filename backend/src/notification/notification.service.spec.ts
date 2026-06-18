/// <reference types="jest" />

// jest.mock est hissé avant les imports — nodemailer.createTransport devient un jest.fn()
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

import * as nodemailer from 'nodemailer';
import type { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';

const mockedCreateTransport = nodemailer.createTransport as jest.MockedFunction<
  typeof nodemailer.createTransport
>;

function makeConfig(values: Record<string, string> = {}): ConfigService {
  return {
    get: jest.fn((key: string) => values[key] ?? undefined),
  } as unknown as ConfigService;
}

describe('NotificationService', () => {
  let sendMail: jest.Mock;

  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });

    mockedCreateTransport.mockReturnValue({ sendMail } as unknown as ReturnType<
      typeof nodemailer.createTransport
    >);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendReviewReminder', () => {
    it('retourne true quand le mail part sans erreur', async () => {
      const service = new NotificationService(makeConfig());

      const result = await service.sendReviewReminder('POWER ROAD', 500);

      expect(result).toBe(true);
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it('inclut le nom du pneu dans le sujet', async () => {
      const service = new NotificationService(makeConfig());

      await service.sendReviewReminder('POWER ALL SEASON', 1000);

      const [mailOptions] = sendMail.mock.calls[0] as [
        { subject: string; html: string },
      ];
      expect(mailOptions.subject).toContain('POWER ALL SEASON');
    });

    it('inclut le nom du pneu dans le corps HTML', async () => {
      const service = new NotificationService(makeConfig());

      await service.sendReviewReminder('POWER CLIMBER TLR', 2000);

      const [mailOptions] = sendMail.mock.calls[0] as [
        { subject: string; html: string },
      ];
      expect(mailOptions.html).toContain('POWER CLIMBER TLR');
    });

    it("utilise l'adresse EMAIL_USER comme expéditeur quand elle est définie", async () => {
      const service = new NotificationService(
        makeConfig({ EMAIL_USER: 'team@michelin.com' }),
      );

      await service.sendReviewReminder('POWER ROAD', 500);

      const [mailOptions] = sendMail.mock.calls[0] as [{ from: string }];
      expect(mailOptions.from).toContain('team@michelin.com');
    });

    it('retourne false quand nodemailer lève une erreur', async () => {
      sendMail.mockRejectedValue(new Error('SMTP connection refused'));
      const service = new NotificationService(makeConfig());

      const result = await service.sendReviewReminder('POWER ROAD', 500);

      expect(result).toBe(false);
    });
  });

  describe('sendWearAlert', () => {
    it('retourne true quand le mail part sans erreur', async () => {
      const service = new NotificationService(makeConfig());

      const result = await service.sendWearAlert('POWER ROAD', 85);

      expect(result).toBe(true);
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it("inclut le nom du pneu et le taux d'usure dans le sujet", async () => {
      const service = new NotificationService(makeConfig());

      await service.sendWearAlert('POWER ENDURANCE', 92);

      const [mailOptions] = sendMail.mock.calls[0] as [{ subject: string }];
      expect(mailOptions.subject).toContain('POWER ENDURANCE');
      expect(mailOptions.subject).toContain('92');
    });

    it("inclut le taux d'usure dans le corps HTML", async () => {
      const service = new NotificationService(makeConfig());

      await service.sendWearAlert('POWER ROAD', 87);

      const [mailOptions] = sendMail.mock.calls[0] as [{ html: string }];
      expect(mailOptions.html).toContain('87');
      expect(mailOptions.html).toContain('POWER ROAD');
    });

    it('retourne false quand nodemailer lève une erreur', async () => {
      sendMail.mockRejectedValue(new Error('Timeout'));
      const service = new NotificationService(makeConfig());

      const result = await service.sendWearAlert('POWER ROAD', 80);

      expect(result).toBe(false);
    });

    it('configure le transport SMTP avec EMAIL_HOST et EMAIL_PORT', async () => {
      const service = new NotificationService(
        makeConfig({ EMAIL_HOST: 'mailpit', EMAIL_PORT: '1025' }),
      );

      await service.sendWearAlert('POWER ROAD', 80);

      expect(mockedCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ host: 'mailpit', port: 1025 }),
      );
    });
  });
});
