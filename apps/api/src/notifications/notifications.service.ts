import { Injectable, Inject, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.module';
import { ConfigService } from '@nestjs/config';

export type NotificationType = 'election_invite' | 'election_open' | 'election_closed' | 'vote_receipt' | 'results_released' | 'member_invited';

interface NotificationPayload {
    type: NotificationType;
    recipient_email: string;
    recipient_name?: string;
    subject: string;
    body: string;
    meta?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabase: SupabaseClient,
        private readonly config: ConfigService,
    ) { }

    async send(payload: NotificationPayload) {
        // Store in notifications table for in-app display
        await this.supabase.from('notifications').insert({
            recipient_email: payload.recipient_email,
            type: payload.type,
            subject: payload.subject,
            body: payload.body,
            meta: payload.meta || {},
            read: false,
        });

        // Email sending (scaffold — plug in SendGrid / Resend / AWS SES)
        const emailEnabled = this.config.get('EMAIL_ENABLED', 'false') === 'true';
        if (emailEnabled) {
            this.logger.log(`[EMAIL] To: ${payload.recipient_email} Subject: ${payload.subject}`);
            // TODO: Integrate actual email provider
        }

        // SMS/WhatsApp hooks (optional)
        const smsEnabled = this.config.get('SMS_ENABLED', 'false') === 'true';
        if (smsEnabled) {
            this.logger.log(`[SMS] To: ${payload.recipient_email} Body: ${payload.body.slice(0, 160)}`);
            // TODO: Integrate Twilio / Africa's Talking
        }
    }

    async sendBulk(type: NotificationType, electionId: string, subject: string, body: string) {
        // Get all registered voters for this election
        const { data: registry } = await this.supabase
            .from('voter_registry')
            .select('profiles(email, full_name)')
            .eq('election_id', electionId);

        if (!registry) return { sent: 0 };

        let sent = 0;
        for (const r of registry) {
            const profile = r.profiles as any;
            if (profile?.email) {
                await this.send({
                    type,
                    recipient_email: profile.email,
                    recipient_name: profile.full_name,
                    subject,
                    body,
                    meta: { election_id: electionId },
                });
                sent++;
            }
        }

        return { sent };
    }

    async getUnread(email: string) {
        const { data, error } = await this.supabase
            .from('notifications')
            .select('*')
            .eq('recipient_email', email)
            .eq('read', false)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw new Error(error.message);
        return data;
    }

    async markRead(notificationId: string) {
        await this.supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);
    }
}
