exports.up = function (knex) {
    return knex.schema
        .alterTable("incident", function (table) {
            table.string("severity").defaultTo("minor");
            table.string("status").defaultTo("investigating");
        })
        .createTable("incident_update", function (table) {
            table.increments("id");
            table.integer("incident_id").unsigned().notNullable();
            table.string("status").notNullable();
            table.text("content").notNullable();
            table.datetime("created_date").notNullable();
            table.index("incident_id");
        });
};

exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists("incident_update")
        .alterTable("incident", function (table) {
            table.dropColumn("severity");
            table.dropColumn("status");
        });
};
