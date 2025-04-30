/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('email').notNullable().unique();
      table.string('password').notNullable();
      table.timestamps(true, true); // created_at and updated_at
    });
  
    await knex.schema.createTable('products', (table) => {
      table.increments('productId').primary();
      table.string('productName').notNullable();
      table.text('description').notNullable();
      table.integer('quantity').notNullable();
      table.float('price').notNullable();
      table.timestamps(true, true);
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('products');
    await knex.schema.dropTableIfExists('users');
  };
  