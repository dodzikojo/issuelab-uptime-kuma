const { R } = require("redbean-node");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const dayjs = require("dayjs");
const { Liquid } = require("liquidjs");
const { log } = require("../../src/util");
const { Settings } = require("../settings");
const path = require("path");
const fs = require("fs");

const engine = new Liquid({
    root: path.join(__dirname, "../templates"),
    extname: ".html",
});

class SubscriberService {

    /**
     * Subscribe an email to a status page
     * @param {number} statusPageId Status page ID
     * @param {string} email Email address
     * @param {string} baseURL Base URL of the application
     * @param {string} slug Status page slug
     * @returns {Promise<object>} Result
     */
    static async subscribe(statusPageId, email, baseURL, slug) {
        // Check for existing subscriber
        let existing = await R.findOne("status_page_subscriber", " status_page_id = ? AND email = ? ", [statusPageId, email]);

        if (existing && existing.confirmed) {
            return { ok: true, msg: "Already subscribed" };
        }

        let bean;
        if (existing) {
            bean = existing;
        } else {
            bean = R.dispense("status_page_subscriber");
            bean.status_page_id = statusPageId;
            bean.email = email;
            bean.unsubscribe_token = crypto.randomUUID();
            bean.created_date = R.isoDateTime(dayjs.utc());
        }

        bean.confirmed = false;
        bean.confirm_token = crypto.randomUUID();
        await R.store(bean);

        // Send confirmation email
        const confirmUrl = `${baseURL}/api/status-page/${slug}/confirm/${bean.confirm_token}`;
        const subject = "Confirm your subscription";
        const html = await engine.renderFile("subscription-confirm", {
            confirmUrl,
            slug,
        });

        await SubscriberService.sendEmail(email, subject, html);

        return { ok: true, msg: "Confirmation email sent" };
    }

    /**
     * Confirm a subscription
     * @param {string} token Confirmation token
     * @returns {Promise<boolean>} Success
     */
    static async confirmSubscription(token) {
        let bean = await R.findOne("status_page_subscriber", " confirm_token = ? ", [token]);
        if (!bean) {
            return false;
        }

        bean.confirmed = true;
        bean.confirm_token = null;
        await R.store(bean);
        return true;
    }

    /**
     * Unsubscribe using token
     * @param {string} token Unsubscribe token
     * @returns {Promise<boolean>} Success
     */
    static async unsubscribe(token) {
        let bean = await R.findOne("status_page_subscriber", " unsubscribe_token = ? ", [token]);
        if (!bean) {
            return false;
        }

        await R.trash(bean);
        return true;
    }

    /**
     * Notify all confirmed subscribers of a status page
     * @param {number} statusPageId Status page ID
     * @param {string} subject Email subject
     * @param {string} templateName Template file name (without extension)
     * @param {object} context Template context variables
     * @param {string} baseURL Base URL for unsubscribe links
     * @param {string} slug Status page slug
     * @returns {Promise<void>}
     */
    static async notifySubscribers(statusPageId, subject, templateName, context, baseURL, slug) {
        let subscribers = await R.find("status_page_subscriber", " status_page_id = ? AND confirmed = 1 ", [statusPageId]);

        if (subscribers.length === 0) {
            return;
        }

        for (let subscriber of subscribers) {
            try {
                const unsubscribeUrl = `${baseURL}/api/status-page/${slug}/unsubscribe/${subscriber.unsubscribe_token}`;
                const html = await engine.renderFile(templateName, {
                    ...context,
                    unsubscribeUrl,
                    slug,
                });

                await SubscriberService.sendEmail(subscriber.email, subject, html);
            } catch (e) {
                log.error("subscriber", `Failed to notify ${subscriber.email}: ${e.message}`);
            }
        }
    }

    /**
     * Get the count of confirmed subscribers for a status page
     * @param {number} statusPageId Status page ID
     * @returns {Promise<number>} Subscriber count
     */
    static async getSubscriberCount(statusPageId) {
        return await R.count("status_page_subscriber", " status_page_id = ? AND confirmed = 1 ", [statusPageId]);
    }

    /**
     * Send an email using the global SMTP settings
     * @param {string} to Recipient email
     * @param {string} subject Email subject
     * @param {string} html HTML body
     * @returns {Promise<void>}
     */
    static async sendEmail(to, subject, html) {
        const smtpSettings = await Settings.getSettings("smtp");

        if (!smtpSettings || !smtpSettings.smtpHost) {
            throw new Error("SMTP settings not configured. Please configure SMTP in Settings.");
        }

        const config = {
            host: smtpSettings.smtpHost,
            port: smtpSettings.smtpPort || 587,
            secure: !!smtpSettings.smtpSecure,
        };

        if (!smtpSettings.smtpSecure) {
            config.tls = {
                rejectUnauthorized: !smtpSettings.smtpIgnoreTLSError,
            };
        }

        if (smtpSettings.smtpUsername || smtpSettings.smtpPassword) {
            config.auth = {
                user: smtpSettings.smtpUsername,
                pass: smtpSettings.smtpPassword,
            };
        }

        const transporter = nodemailer.createTransport(config);

        await transporter.sendMail({
            from: smtpSettings.smtpFrom || smtpSettings.smtpUsername,
            to,
            subject,
            html,
        });
    }
}

module.exports = { SubscriberService };
