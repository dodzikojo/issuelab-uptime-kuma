const { BeanModel } = require("redbean-node/dist/bean-model");

class IncidentUpdate extends BeanModel {
    /**
     * Return an object that ready to parse to JSON for public
     * @returns {object} Object ready to parse
     */
    toPublicJSON() {
        return {
            id: this.id,
            incidentId: this.incident_id,
            status: this.status,
            content: this.content,
            createdDate: this.created_date,
        };
    }
}

module.exports = IncidentUpdate;
