const { BeanModel } = require("redbean-node/dist/bean-model");
const { R } = require("redbean-node");
const dayjs = require("dayjs");

const VALID_SEVERITIES = ["minor", "major", "critical"];
const VALID_STATUSES = ["investigating", "identified", "monitoring", "resolved"];

class Incident extends BeanModel {
    /**
     * Resolve the incident and mark it as inactive
     * @returns {Promise<void>}
     */
    async resolve() {
        this.active = false;
        this.pin = false;
        this.status = "resolved";
        this.last_updated_date = R.isoDateTime(dayjs.utc());
        await R.store(this);
    }

    /**
     * Get all updates for this incident
     * @returns {Promise<Array>} List of incident updates
     */
    async getUpdates() {
        const updates = await R.find("incident_update", " incident_id = ? ORDER BY created_date DESC ", [this.id]);
        return updates.map((u) => u.toPublicJSON());
    }

    /**
     * Return an object that ready to parse to JSON for public
     * @returns {object} Object ready to parse
     */
    toPublicJSON() {
        return {
            id: this.id,
            style: this.style,
            title: this.title,
            content: this.content,
            pin: !!this.pin,
            active: !!this.active,
            severity: this.severity || "minor",
            status: this.status || "investigating",
            createdDate: this.created_date,
            lastUpdatedDate: this.last_updated_date,
            status_page_id: this.status_page_id,
        };
    }

    /**
     * Return an object with updates included
     * @returns {Promise<object>} Object ready to parse
     */
    async toPublicJSONWithUpdates() {
        const json = this.toPublicJSON();
        json.updates = await this.getUpdates();
        return json;
    }
}

module.exports = Incident;
module.exports.VALID_SEVERITIES = VALID_SEVERITIES;
module.exports.VALID_STATUSES = VALID_STATUSES;
