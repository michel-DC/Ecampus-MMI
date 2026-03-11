import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { TeacherCredentialsPayload } from './types/mail.types';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');

    if (!apiKey) throw new Error('RESEND_API_KEY is not defined');
    if (!fromEmail) throw new Error('RESEND_FROM_EMAIL is not defined');

    this.resend = new Resend(apiKey);
    this.fromEmail = fromEmail;
  }

  async sendTeacherCredentials(
    payload: TeacherCredentialsPayload,
  ): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: payload.email,
      subject: 'Bienvenue sur la plateforme SAE — Vos identifiants',
      html: this.buildTeacherWelcomeTemplate(payload),
    });

    if (error) {
      throw new InternalServerErrorException('Failed to send welcome email');
    }
  }

  private buildTeacherWelcomeTemplate(
    payload: TeacherCredentialsPayload,
  ): string {
    const fullName = `${payload.firstname} ${payload.lastname || ''}`.trim();
    return `
      <h1>Bienvenue, ${fullName} !</h1>
      <p>Votre compte professeur a été créé sur la plateforme SAE.</p>
      <p><strong>Email :</strong> ${payload.email}</p>
      <p><strong>Mot de passe temporaire :</strong> ${payload.temporaryPassword}</p>
      <p>Veuillez vous connecter et changer votre mot de passe dès que possible.</p>
    `;
  }
}
