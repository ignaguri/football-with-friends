// Migration template - Copy this file to migrations/ directory and rename
// File should be named: YYYYMMDDHHMMSS-description.ts

import type { ExtendedDatabase } from "@/lib/database/schema";
import type { Kysely, Migration } from "kysely";

export const up: Migration["up"] = async (db: Kysely<ExtendedDatabase>) => {
  // TODO: Implement your migration logic here

  // Example: Create a new table
  // await db.schema
  //   .createTable("table_name")
  //   .addColumn("id", "text", (col) => col.primaryKey())
  //   .addColumn("name", "text", (col) => col.notNull())
  //   .addColumn("created_at", "text", (col) =>
  //     col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
  //   )
  //   .execute();

  // Example: Check if table exists using sqlite_master
  // const tableExists = async (tableName: string): Promise<boolean> => {
  //   const result = await db
  //     .selectFrom("sqlite_master")
  //     .select("name")
  //     .where("type", "=", "table")
  //     .where("name", "=", tableName)
  //     .executeTakeFirst();
  //   return !!result;
  // };

  // Example: Add a column to existing table
  // await db.schema
  //   .alterTable("existing_table")
  //   .addColumn("new_column", "text")
  //   .execute();

  // Example: Create an index
  // await db.schema
  //   .createIndex("index_name")
  //   .on("table_name")
  //   .column("column_name")
  //   .execute();

  // Example: Insert data
  // await db
  //   .insertInto("table_name")
  //   .values({
  //     id: "unique-id",
  //     name: "Example Name",
  //     created_at: sql`CURRENT_TIMESTAMP`,
  //   })
  //   .execute();

  console.log("✅ Migration completed successfully");
};

export const down: Migration["down"] = async (db: Kysely<ExtendedDatabase>) => {
  // TODO: Implement rollback logic here
  // This should undo the changes made in the 'up' function

  // Example: Drop table
  // await db.schema.dropTable("table_name").execute();

  // Example: Drop column
  // await db.schema
  //   .alterTable("existing_table")
  //   .dropColumn("new_column")
  //   .execute();

  // Example: Drop index
  // await db.schema.dropIndex("index_name").on("table_name").execute();

  // Example: Delete data
  // await db
  //   .deleteFrom("table_name")
  //   .where("id", "=", "unique-id")
  //   .execute();

  console.log("↩️ Migration rolled back successfully");
};
