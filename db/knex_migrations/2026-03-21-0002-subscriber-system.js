exports.up = function (knex) {
    return knex.schema
        .createTable("status_page_subscriber", function (table) {
            table.increments("id");
            table.integer("status_page_id").unsigned().notNullable();
            table.string("email", 320).notNullable();
            table.string("unsubscribe_token").notNullable().unique();
            table.boolean("confirmed").defaultTo(false);
            table.string("confirm_token").unique();
            table.datetime("created_date").notNullable();
            table.unique(["status_page_id", "email"]);
        })
        .alterTable("status_page", function (table) {
            table.boolean("allow_subscriptions").defaultTo(false);
        });
};

exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists("status_page_subscriber")
        .alterTable("status_page", function (table) {
            table.dropColumn("allow_subscriptions");
        });
};
