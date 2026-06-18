import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly config: ConfigService) {}

  private createTransporter() {
    const host = this.config.get<string>('EMAIL_HOST') ?? 'localhost';
    const port = parseInt(this.config.get<string>('EMAIL_PORT') ?? '1025', 10);
    const user = this.config.get<string>('EMAIL_USER');
    const pass = this.config.get<string>('EMAIL_PASS');

    // auth est optionnel : Mailpit / Mailhog n'en ont pas besoin
    const auth = user && pass ? { user, pass } : undefined;

    return nodemailer.createTransport({ host, port, secure: false, auth });
  }

  async sendReviewReminder(tire: string, milestone: number): Promise<boolean> {
    const transporter = this.createTransporter();
    const from =
      this.config.get<string>('EMAIL_USER') ?? 'noreply@michelin.local';
    const to = this.config.get<string>('EMAIL_TO') ?? 'dev@michelin.local';
    const date = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    try {
      await transporter.sendMail({
        from: `"Michelin Road Intelligence" <${from}>`,
        to,
        subject: `🌟 ${milestone.toLocaleString('fr-FR')} km avec votre ${tire} — partagez votre avis`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:#00205B;padding:28px 24px;text-align:center;">
              <p style="color:white;margin:0;font-size:20px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;">MICHELIN</p>
              <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;">Road Intelligence</p>
            </div>

            <div style="padding:32px 24px;">
              <h2 style="color:#111827;font-size:18px;font-weight:700;margin:0 0 8px;">
                Palier ${milestone.toLocaleString('fr-FR')} km atteint 🎉
              </h2>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Vous avez parcouru <strong style="color:#111827;">${milestone.toLocaleString('fr-FR')} km</strong>
                avec votre pneu <strong style="color:#111827;">${tire}</strong>.
                Votre retour d'expérience aide la communauté à faire les meilleurs choix.
              </p>

              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
                <p style="color:#92400e;font-size:14px;font-weight:700;margin:0 0 6px;">Partagez votre expérience</p>
                <p style="color:#b45309;font-size:13px;line-height:1.5;margin:0;">
                  Grip, confort, durabilité, résistance aux crevaisons — quelques étoiles suffisent
                  pour guider d'autres cyclistes vers le pneu qui leur correspond.
                </p>
              </div>

              <p style="color:#6b7280;font-size:13px;margin:0 0 6px;">Pour laisser votre avis :</p>
              <ol style="color:#374151;font-size:13px;line-height:1.8;margin:0 0 28px;padding-left:20px;">
                <li>Ouvrez <strong>Michelin Road Intelligence</strong></li>
                <li>Allez dans <strong>Mes pneus</strong></li>
                <li>Appuyez sur <strong>Laisser un avis</strong></li>
              </ol>

              <div style="border-top:1px solid #f3f4f6;padding-top:20px;text-align:center;">
                <p style="color:#9ca3af;font-size:11px;margin:0;">Michelin Road Intelligence · ${date}</p>
              </div>
            </div>
          </div>
        `,
      });

      this.logger.log(`Rappel avis envoyé → ${to} (${tire} @ ${milestone} km)`);
      return true;
    } catch (err) {
      this.logger.error('Erreur envoi email rappel avis', err);
      return false;
    }
  }

  async sendWearAlert(tire: string, wear: number): Promise<boolean> {
    const transporter = this.createTransporter();

    const from =
      this.config.get<string>('EMAIL_USER') ?? 'noreply@michelin.local';
    const to = this.config.get<string>('EMAIL_TO') ?? 'dev@michelin.local';
    const date = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    try {
      await transporter.sendMail({
        from: `"Michelin Road Intelligence" <${from}>`,
        to,
        subject: `⚠️ Alerte usure : ${tire} à ${wear}%`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:#00205B;padding:28px 24px;text-align:center;">
              <p style="color:white;margin:0;font-size:20px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;">MICHELIN</p>
              <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;">Road Intelligence</p>
            </div>

            <div style="padding:32px 24px;">
              <h2 style="color:#111827;font-size:18px;font-weight:700;margin:0 0 8px;">Alerte d'usure critique</h2>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Votre pneu <strong style="color:#111827;">${tire}</strong> a atteint
                <strong style="color:#ef4444;">${wear}%</strong> d'usure.
                Il est temps d'envisager un remplacement.
              </p>

              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
                <p style="color:#991b1b;font-size:14px;font-weight:700;margin:0 0 6px;">Remplacement recommandé</p>
                <p style="color:#b91c1c;font-size:13px;line-height:1.5;margin:0;">
                  Un pneu usé à plus de 80% réduit le grip et augmente le risque de crevaison,
                  notamment en montagne ou sur terrain mouillé.
                </p>
              </div>

              <p style="color:#6b7280;font-size:13px;margin:0 0 6px;">Pour trouver un point de vente :</p>
              <ol style="color:#374151;font-size:13px;line-height:1.8;margin:0 0 28px;padding-left:20px;">
                <li>Ouvrez <strong>Michelin Road Intelligence</strong></li>
                <li>Allez dans <strong>Mon pneu</strong></li>
                <li>Cliquez sur <strong>Trouver un remplacement</strong></li>
              </ol>

              <div style="border-top:1px solid #f3f4f6;padding-top:20px;text-align:center;">
                <p style="color:#9ca3af;font-size:11px;margin:0;">Michelin Road Intelligence · ${date}</p>
              </div>
            </div>
          </div>
        `,
      });

      this.logger.log(`Alerte usure envoyée → ${to} (${tire} ${wear}%)`);
      return true;
    } catch (err) {
      this.logger.error('Erreur envoi email alerte usure', err);
      return false;
    }
  }
}
