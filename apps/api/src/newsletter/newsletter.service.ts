import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NewsletterStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { UnsubscribeNewsletterDto } from './dto/unsubscribe-newsletter.dto';

const DEFAULT_EMAIL_FROM = 'onboarding@resend.dev';
const DEFAULT_ADMIN_NOTIFICATION_EMAIL = 'enquiry@gravitasedgeconsulting.com';
const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getFrontendUrl(): string {
    const raw = this.config.get<string>('FRONTEND_URL')?.trim() || DEFAULT_FRONTEND_URL;
    return raw.replace(/\/+$/, '');
  }

  private getFromEmail(): string {
    return this.config.get<string>('RESEND_EMAIL_FROM')?.trim() || DEFAULT_EMAIL_FROM;
  }

  private getAdminNotificationEmail(): string {
    return (
      this.config.get<string>('ADMIN_NOTIFICATION_EMAIL')?.trim() ||
      DEFAULT_ADMIN_NOTIFICATION_EMAIL
    );
  }

  async subscribe(dto: SubscribeNewsletterDto) {
    const email = dto.email.trim().toLowerCase();
    const now = new Date();

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing && existing.status === NewsletterStatus.SUBSCRIBED) {
      return {
        subscribed: true,
        alreadySubscribed: true,
        email: existing.email,
        status: existing.status,
        message: 'You are already subscribed to our newsletter updates!',
      };
    }

    const token = randomBytes(32).toString('hex');
    const isResubscribe = existing?.status === NewsletterStatus.UNSUBSCRIBED;

    const subscriber = existing
      ? await this.prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: {
            status: NewsletterStatus.SUBSCRIBED,
            unsubscribeToken: token,
            subscribedAt: now,
            unsubscribedAt: null,
          },
        })
      : await this.prisma.newsletterSubscriber.create({
          data: {
            email,
            status: NewsletterStatus.SUBSCRIBED,
            unsubscribeToken: token,
            subscribedAt: now,
          },
        });

    await this.dispatchSubscriptionEmails({
      email: subscriber.email,
      unsubscribeToken: subscriber.unsubscribeToken,
      subscribedAt: subscriber.subscribedAt,
      isResubscribe,
    });

    return {
      subscribed: true,
      alreadySubscribed: false,
      email: subscriber.email,
      status: subscriber.status,
      message: 'Thank you for subscribing! Please check your inbox for a welcome email.',
    };
  }

  async unsubscribe(dto: UnsubscribeNewsletterDto) {
    const token = dto.token?.trim() || undefined;
    const email = dto.email?.trim().toLowerCase() || undefined;

    if (!token && !email) {
      throw new BadRequestException('An unsubscribe token or email address is required.');
    }

    const subscriber = token
      ? await this.prisma.newsletterSubscriber.findUnique({
          where: { unsubscribeToken: token },
        })
      : await this.prisma.newsletterSubscriber.findUnique({
          where: { email: email! },
        });

    if (!subscriber || (token && email && subscriber.email !== email)) {
      throw new NotFoundException(
        'Subscription record not found or this unsubscribe link is invalid.',
      );
    }

    if (subscriber.status === NewsletterStatus.UNSUBSCRIBED) {
      return {
        unsubscribed: true,
        alreadyUnsubscribed: true,
        email: subscriber.email,
        status: subscriber.status,
        message: 'This email address is already unsubscribed from our newsletter.',
      };
    }

    const updated = await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: NewsletterStatus.UNSUBSCRIBED,
        unsubscribedAt: new Date(),
      },
    });

    return {
      unsubscribed: true,
      alreadyUnsubscribed: false,
      email: updated.email,
      status: updated.status,
      message: 'You have been unsubscribed from Gravitas Edge Consulting newsletter updates.',
    };
  }

  private async dispatchSubscriptionEmails(params: {
    email: string;
    unsubscribeToken: string;
    subscribedAt: Date;
    isResubscribe: boolean;
  }): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    if (!apiKey) {
      this.logger.warn(
        `RESEND_API_KEY is not configured; skipped newsletter emails for ${params.email}.`,
      );
      return;
    }

    const resend = new Resend(apiKey);

    const fromEmail = this.getFromEmail();
    const adminEmail = this.getAdminNotificationEmail();
    const frontendUrl = this.getFrontendUrl();

    const plansUrl = `${frontendUrl}/plans`;
    const opportunitiesUrl = `${frontendUrl}/opportunities`;
    const vaultsUrl = `${frontendUrl}/vaults`;
    const userPolicyUrl = `${frontendUrl}/privacy-policy`;
    const termsUrl = `${frontendUrl}/terms-and-conditions`;
    const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${encodeURIComponent(
      params.unsubscribeToken,
    )}&email=${encodeURIComponent(params.email)}`;

    const formattedTime = params.subscribedAt.toUTCString();
    const safeEmail = escapeHtml(params.email);

    const adminHtml = this.buildAdminNotificationHtml({
      safeEmail,
      formattedTime,
      isResubscribe: params.isResubscribe,
    });

    const welcomeHtml = this.buildSubscriberWelcomeHtml({
      safeEmail,
      plansUrl,
      opportunitiesUrl,
      vaultsUrl,
      unsubscribeUrl,
      userPolicyUrl,
      termsUrl,
    });

    const results = await Promise.allSettled([
      resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `${params.isResubscribe ? 'Newsletter Re-subscription' : 'New Newsletter Subscriber'} — ${params.email}`,
        html: adminHtml,
      }),
      resend.emails.send({
        from: fromEmail,
        to: params.email,
        subject: 'Welcome to Gravitas Edge Consulting Newsletter',
        html: welcomeHtml,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
        },
      }),
    ]);

    results.forEach((result, idx) => {
      const label = idx === 0 ? `admin (${adminEmail})` : `subscriber (${params.email})`;
      if (result.status === 'rejected') {
        this.logger.warn(`Failed to send newsletter email to ${label}: ${String(result.reason)}`);
      } else if (result.value?.error) {
        this.logger.warn(
          `Resend returned an error for newsletter email to ${label}: ${result.value.error.message}`,
        );
      }
    });
  }

  private buildAdminNotificationHtml(params: {
    safeEmail: string;
    formattedTime: string;
    isResubscribe: boolean;
  }): string {
    const heading = params.isResubscribe
      ? 'Newsletter Subscriber Re-subscribed'
      : 'New Newsletter Subscriber';

    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#F4F6FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 6px 24px rgba(6,27,54,0.08);">
          <tr>
            <td style="background-color:#061B36;padding:24px 28px;border-bottom:3px solid #D6952F;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#D6952F;">Gravitas Edge Consulting</p>
              <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#FFFFFF;">${heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#475569;">
                A visitor has ${params.isResubscribe ? 're-subscribed to' : 'subscribed to'} the Gravitas Edge Consulting newsletter from the website.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;">
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#64748B;width:140px;">Subscriber Email</td>
                  <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;font-size:14px;font-weight:600;color:#061B36;">${params.safeEmail}</td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#64748B;">Status</td>
                  <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;font-size:13px;font-weight:700;color:#15803D;">SUBSCRIBED</td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;font-size:13px;color:#64748B;">Subscribed At</td>
                  <td style="padding:14px 18px;font-size:13px;color:#334155;">${escapeHtml(params.formattedTime)}</td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:#64748B;">
                You can view and manage newsletter subscribers anytime from the Admin Dashboard (&ldquo;Newsletter&rdquo; section).
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildSubscriberWelcomeHtml(params: {
    safeEmail: string;
    plansUrl: string;
    opportunitiesUrl: string;
    vaultsUrl: string;
    unsubscribeUrl: string;
    userPolicyUrl: string;
    termsUrl: string;
  }): string {
    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#F4F6FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 8px 30px rgba(6,27,54,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#061B36 0%,#0B274D 100%);padding:32px;border-bottom:4px solid #D6952F;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;color:#D6952F;">
                Gravitas Edge Consulting
              </p>
              <h1 style="margin:10px 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#FFFFFF;">
                Welcome to Our Newsletter!
              </h1>
              <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#CBD5E1;">
                Thank you for subscribing with <strong style="color:#FFFFFF;">${params.safeEmail}</strong>.
              </p>
            </td>
          </tr>

          <!-- Welcome Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#334155;">
                We&rsquo;re glad to have you with us. You will receive curated updates on new international roles, newly added countries, and career market intelligence from Gravitas Edge Consulting.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#334155;">
                Start exploring what&rsquo;s live on the platform today:
              </p>

              <!-- Explore Links -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:0 0 12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0;font-size:15px;font-weight:700;color:#061B36;">Subscription Plans</p>
                          <p style="margin:4px 0 12px;font-size:13px;line-height:1.5;color:#64748B;">Compare flexible membership tiers and unlock full global career access.</p>
                          <a href="${escapeHtml(params.plansUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#D6952F;color:#061B36;font-size:13px;font-weight:700;text-decoration:none;padding:9px 18px;border-radius:999px;">
                            View Plans &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0;font-size:15px;font-weight:700;color:#061B36;">Latest Opportunities</p>
                          <p style="margin:4px 0 12px;font-size:13px;line-height:1.5;color:#64748B;">Discover verified roles and active recruitment openings across regions.</p>
                          <a href="${escapeHtml(params.opportunitiesUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#061B36;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;padding:9px 18px;border-radius:999px;">
                            Explore Opportunities &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0;font-size:15px;font-weight:700;color:#061B36;">Opportunity Vaults</p>
                          <p style="margin:4px 0 12px;font-size:13px;line-height:1.5;color:#64748B;">Browse curated country and sector vaults tailored to your experience level.</p>
                          <a href="${escapeHtml(params.vaultsUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#061B36;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;padding:9px 18px;border-radius:999px;">
                            Open Vaults &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action & Legal Buttons -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #E2E8F0;padding-top:22px;">
                <tr>
                  <td align="center" style="padding-bottom:14px;">
                    <a href="${escapeHtml(params.unsubscribeUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#FFF1F2;color:#BE123C;border:1px solid #FECDD3;font-size:12px;font-weight:600;text-decoration:none;padding:8px 16px;border-radius:999px;margin:4px;">
                      Unsubscribe
                    </a>
                    <a href="${escapeHtml(params.userPolicyUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#F8FAFC;color:#334155;border:1px solid #CBD5E1;font-size:12px;font-weight:600;text-decoration:none;padding:8px 16px;border-radius:999px;margin:4px;">
                      User Policy
                    </a>
                    <a href="${escapeHtml(params.termsUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#F8FAFC;color:#334155;border:1px solid #CBD5E1;font-size:12px;font-weight:600;text-decoration:none;padding:8px 16px;border-radius:999px;margin:4px;">
                      Terms &amp; Conditions
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#94A3B8;">
                      You are receiving this email because ${params.safeEmail} subscribed to the Gravitas Edge Consulting newsletter.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
