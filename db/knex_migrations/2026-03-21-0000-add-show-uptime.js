exports.up = function (knex) {
    return knex.schema.alterTable("status_page", function (table) {
        table.boolean("show_uptime").defaultTo(true);
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable("status_page", function (table) {
        table.dropColumn("show_uptime");
    });
};
