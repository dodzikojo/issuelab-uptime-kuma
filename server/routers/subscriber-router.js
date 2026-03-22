const express = require("express");
const router = express.Router();
const { R } = require("redbean-node");
const { SubscriberService } = require("../services/subscriber-service");
const { sendHttpError } = require("../util-server");
const StatusPage = require("../model/status_page");
const { KumaRateLimiter } = require("../rate-limiter");

// Rate limiter: 5 subscribe requests per minute
const subscribeRateLimiter = new KumaRateLimiter({
    tokensPerInterval: 5,
    interval: "minute",
    fireImmediately: true,
});

/**
 * Get the base URL from the request
 * @param {express.Request} req Express request
 * @returns {string} Base URL
 */
function getBaseURL(req) {
    const protocol = req.protocol;
    const host = req.get("host");
    return `${protocol}://${host}`;
}

// Subscribe to status page updates
router.post("/api/status-page/:slug/subscribe", async (req, res) => {
    try {
        // Rate limit
        const pass = await subscribeRateLimiter.pass(null, 0);
        if (!pass) {
            res.status(429).json({ ok: false, msg: "Too many requests. Please try again later." });
            return;
        }

        const { slug } = req.params;
        const { email } = req.body;

        if (!email || typeof email !== "string") {
            res.status(400).json({ ok: false, msg: "Email is required" });
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ ok: false, msg: "Invalid email address" });
            return;
        }

        const statusPage = await R.findOne("status_page", " slug = ? ", [slug.toLowerCase()]);
        if (!statusPage) {
            res.status(404).json({ ok: false, msg: "Status page not found" });
            return;
        }

        if (!statusPage.allow_subscriptions) {
            res.status(403).json({ ok: false, msg: "Subscriptions are not enabled for this status page" });
            return;
        }

        const baseURL = getBaseURL(req);
        const result = await SubscriberService.subscribe(statusPage.id, email.trim().toLowerCase(), baseURL, slug);

        await subscribeRateLimiter.removeTokens(1);

        res.json(result);
    } catch (error) {
        sendHttpError(res, error.message);
    }
});

// Confirm subscription
router.get("/api/status-page/:slug/confirm/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const success = await SubscriberService.confirmSubscription(token);

        if (success) {
            res.send(`
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><title>Subscription Confirmed</title></head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 60px 20px;">
                    <h1 style="color: #28a745;">Subscription Confirmed</h1>
                    <p>You will now receive status updates via email.</p>
                </body>
                </html>
            `);
        } else {
            res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><title>Invalid Link</title></head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 60px 20px;">
                    <h1 style="color: #dc3545;">Invalid or Expired Link</h1>
                    <p>This confirmation link is no longer valid.</p>
                </body>
                </html>
            `);
        }
    } catch (error) {
        sendHttpError(res, error.message);
    }
});

// Unsubscribe
router.get("/api/status-page/:slug/unsubscribe/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const success = await SubscriberService.unsubscribe(token);

        if (success) {
            res.send(`
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><title>Unsubscribed</title></head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 60px 20px;">
                    <h1>Unsubscribed</h1>
                    <p>You have been unsubscribed and will no longer receive status updates.</p>
                </body>
                </html>
            `);
        } else {
            res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><title>Invalid Link</title></head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 60px 20px;">
                    <h1 style="color: #dc3545;">Invalid Link</h1>
                    <p>This unsubscribe link is no longer valid.</p>
                </body>
                </html>
            `);
        }
    } catch (error) {
        sendHttpError(res, error.message);
    }
});

module.exports = router;
