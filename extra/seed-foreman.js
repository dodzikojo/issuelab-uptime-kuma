/**
 * Seed script for Foreman health check monitors and status page.
 *
 * Usage:
 *   node extra/seed-foreman.js
 *
 * Prerequisites:
 *   - Uptime Kuma must be running (default: http://localhost:3001)
 *   - You must have already created an admin account via the setup wizard
 *
 * Environment variables:
 *   UPTIME_KUMA_URL      - Base URL (default: http://localhost:3001)
 *   UPTIME_KUMA_USERNAME - Admin username
 *   UPTIME_KUMA_PASSWORD - Admin password
 */

const { io } = require("socket.io-client");

const BASE_URL = process.env.UPTIME_KUMA_URL || "http://localhost:3001";
const USERNAME = process.env.UPTIME_KUMA_USERNAME;
const PASSWORD = process.env.UPTIME_KUMA_PASSWORD;

if (!USERNAME || !PASSWORD) {
    console.error("Error: Set UPTIME_KUMA_USERNAME and UPTIME_KUMA_PASSWORD environment variables.");
    process.exit(1);
}

const FOREMAN_BASE = "https://foreman.issuelab.co";

const monitors = [
    {
        name: "Foreman - Aggregate Health",
        url: `${FOREMAN_BASE}/health`,
        type: "keyword",
        keyword: "\"status\":\"ok\"",
        description: "All health checks (aggregate)",
    },
    {
        name: "Foreman - Database (PostgreSQL)",
        url: `${FOREMAN_BASE}/health/database`,
        type: "keyword",
        keyword: "\"status\":\"ok\"",
        description: "PostgreSQL connectivity",
    },
    {
        name: "Foreman - Autodesk API",
        url: `${FOREMAN_BASE}/health/aps_api`,
        type: "keyword",
        keyword: "\"status\":\"ok\"",
        description: "Autodesk Platform Services API",
    },
    {
        name: "Foreman - Stripe",
        url: `${FOREMAN_BASE}/health/stripe`,
        type: "keyword",
        keyword: "\"status\":\"ok\"",
        description: "Stripe payment integration",
    },
    {
        name: "Foreman - Email Service",
        url: `${FOREMAN_BASE}/health/email_service`,
        type: "keyword",
        keyword: "\"status\":\"ok\"",
        description: "Azure Email service",
    },
    {
        name: "Foreman - Job Scheduler",
        url: `${FOREMAN_BASE}/health/job_scheduler`,
        type: "keyword",
        keyword: "\"status\":\"ok\"",
        description: "Job scheduler heartbeat",
    },
    {
        name: "Foreman - Email Queue",
        url: `${FOREMAN_BASE}/health/email_queue`,
        type: "keyword",
        keyword: "\"status\":\"ok\"",
        description: "Email queue heartbeat",
    },
    {
        name: "Foreman - Quota Enforcement",
        url: `${FOREMAN_BASE}/health/quota_enforcement`,
        type: "keyword",
        keyword: "\"status\":\"ok\"",
        description: "Quota enforcement heartbeat",
    },
    {
        name: "Foreman - OAuth",
        url: `${FOREMAN_BASE}/health/oauth`,
        type: "keyword",
        keyword: "\"status\":\"ok\"",
        description: "OpenIddict discovery",
    },
    {
        name: "Foreman - MCP Server",
        url: `${FOREMAN_BASE}/health/mcp_server`,
        type: "keyword",
        keyword: "\"status\":\"ok\"",
        description: "MCP server",
    },
];

function socketEmit(socket, event, ...args) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timeout: ${event}`)), 15000);
        socket.emit(event, ...args, (res) => {
            clearTimeout(timeout);
            if (res.ok) {
                resolve(res);
            } else {
                reject(new Error(res.msg || `Failed: ${event}`));
            }
        });
    });
}

async function main() {
    console.log(`Connecting to ${BASE_URL}...`);

    const socket = io(BASE_URL, {
        transports: ["websocket"],
        reconnection: false,
    });

    await new Promise((resolve, reject) => {
        socket.on("connect", resolve);
        socket.on("connect_error", (err) => reject(new Error(`Connection failed: ${err.message}`)));
        setTimeout(() => reject(new Error("Connection timeout")), 10000);
    });

    console.log("Connected. Logging in...");

    // Login
    const loginRes = await socketEmit(socket, "login", {
        username: USERNAME,
        password: PASSWORD,
        token: "",
    });
    console.log("Logged in.");

    // Create monitors
    const monitorIDs = [];
    for (const m of monitors) {
        console.log(`Creating monitor: ${m.name}...`);
        const res = await socketEmit(socket, "add", {
            name: m.name,
            url: m.url,
            type: m.type,
            method: "GET",
            interval: 60,
            retryInterval: 30,
            maxretries: 3,
            timeout: 10,
            active: true,
            accepted_statuscodes: ["200-299"],
            keyword: m.keyword || "",
            notificationIDList: [],
            conditions: [],
            kafkaProducerBrokers: [],
            kafkaProducerSaslOptions: {},
            rabbitmqNodes: [],
        });
        console.log(`  Created with ID: ${res.monitorID}`);
        monitorIDs.push({ id: res.monitorID, ...m });
    }

    // Create status page
    console.log("\nCreating status page: Foreman Status...");
    await socketEmit(socket, "addStatusPage", "Foreman Status", "foreman");
    console.log("  Status page created at /status/foreman");

    // Configure the status page with groups and monitors
    const publicGroupList = [
        {
            name: "Core Services",
            weight: 1,
            public: true,
            monitorList: [
                { id: monitorIDs[0].id, name: monitorIDs[0].name }, // Aggregate
                { id: monitorIDs[1].id, name: monitorIDs[1].name }, // Database
                { id: monitorIDs[8].id, name: monitorIDs[8].name }, // OAuth
            ],
        },
        {
            name: "External Integrations",
            weight: 2,
            public: true,
            monitorList: [
                { id: monitorIDs[2].id, name: monitorIDs[2].name }, // Autodesk
                { id: monitorIDs[3].id, name: monitorIDs[3].name }, // Stripe
                { id: monitorIDs[4].id, name: monitorIDs[4].name }, // Email Service
                { id: monitorIDs[9].id, name: monitorIDs[9].name }, // MCP Server
            ],
        },
        {
            name: "Background Services",
            weight: 3,
            public: true,
            monitorList: [
                { id: monitorIDs[5].id, name: monitorIDs[5].name }, // Job Scheduler
                { id: monitorIDs[6].id, name: monitorIDs[6].name }, // Email Queue
                { id: monitorIDs[7].id, name: monitorIDs[7].name }, // Quota Enforcement
            ],
        },
    ];

    console.log("Configuring status page with monitor groups...");
    await socketEmit(socket, "saveStatusPage", "foreman", {
        slug: "foreman",
        title: "Foreman Status",
        description: "Current status of Foreman services",
        theme: "auto",
        autoRefreshInterval: 30,
        showTags: false,
        showPoweredBy: true,
        showCertificateExpiry: false,
        showOnlyLastHeartbeat: false,
        showUptime: true,
        allowSubscriptions: true,
        footerText: "",
        customCSS: "",
        domainNameList: [],
        analyticsType: null,
        analyticsId: "",
        analyticsScriptUrl: "",
        rssTitle: "",
    }, "/issuelab-logo.png", publicGroupList);

    console.log("  Status page configured.");

    console.log("\n--- Seed complete ---");
    console.log(`Status page: ${BASE_URL}/status/foreman`);
    console.log(`Monitors created: ${monitorIDs.length}`);
    console.log("\nGroups:");
    console.log("  Core Services: Aggregate, Database, OAuth");
    console.log("  External Integrations: Autodesk, Stripe, Email Service, MCP Server");
    console.log("  Background Services: Job Scheduler, Email Queue, Quota Enforcement");

    socket.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
});
