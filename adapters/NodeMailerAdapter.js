import { EmailAdapter } from './EmailAdapter.js';
import nodemailer from 'nodemailer';

export class NodeMailerAdapter extends EmailAdapter {
  constructor(transporterConfig, fromEmail) {
    super();
    this.transporter = nodemailer.createTransport(transporterConfig);
    this.fromEmail = fromEmail;
  }

  async sendMail(to, subject, htmlContent) {
    await this.transporter.sendMail({
      from: this.fromEmail,
      to,
      subject,
      html: htmlContent
    });
  }
}
