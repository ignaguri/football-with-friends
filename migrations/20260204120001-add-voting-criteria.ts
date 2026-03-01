// Migration: add-voting-criteria
// Adds voting_criteria table and seeds with initial 10 criteria from Figma design

import { sql } from "kysely";
import type { Kysely, Migration } from "kysely";

// Seed data for voting criteria
const votingCriteria = [
  {
    id: "vc_el_abeja",
    code: "el_abeja",
    name_en: "The Bee",
    name_es: "El abeja",
    description_en: "One sprint and dies",
    description_es: "Un pique y se muere",
    sort_order: 1,
  },
  {
    id: "vc_zapatilla_running",
    code: "zapatilla_running",
    name_en: "Running Shoe",
    name_es: "Zapatilla de running",
    description_en: "Only good for running",
    description_es: "Solo sirve para correr",
    sort_order: 2,
  },
  {
    id: "vc_el_diablo",
    code: "el_diablo",
    name_en: "The Devil",
    name_es: "El diablo",
    description_en: "Bad wherever you put him",
    description_es: "Es malo donde lo pongas",
    sort_order: 3,
  },
  {
    id: "vc_juguete_porcelana",
    code: "juguete_porcelana",
    name_en: "Porcelain Toy",
    name_es: "El juguete de porcelana",
    description_en: "Touch it and it breaks",
    description_es: "Apenas lo tocás y se rompe",
    sort_order: 4,
  },
  {
    id: "vc_panza_embarazada",
    code: "panza_embarazada",
    name_en: "Pregnant Belly",
    name_es: "El panza de embarazada",
    description_en: "Only there to kick",
    description_es: "Solo está para dar patadas",
    sort_order: 5,
  },
  {
    id: "vc_televisor_robado",
    code: "televisor_robado",
    name_en: "Stolen TV",
    name_es: "El televisor robado",
    description_en: "Has no control",
    description_es: "No tiene control",
    sort_order: 6,
  },
  {
    id: "vc_el_ginecologo",
    code: "el_ginecologo",
    name_en: "The Gynecologist",
    name_es: "El ginecólogo",
    description_en: "Touches well, never scores",
    description_es: "La toca bien, pero no la mete nunca",
    sort_order: 7,
  },
  {
    id: "vc_celular_sin_credito",
    code: "celular_sin_credito",
    name_en: "Phone Without Credit",
    name_es: "Celular sin crédito",
    description_en: "Doesn't score anything",
    description_es: "No marca nada",
    sort_order: 8,
  },
  {
    id: "vc_jesucristo",
    code: "jesucristo",
    name_en: "Jesus Christ",
    name_es: "Jesucristo",
    description_en: "Always pulls off a miracle",
    description_es: "Siempre se manda alguna de milagro",
    sort_order: 9,
  },
  {
    id: "vc_el_aguinaldo",
    code: "el_aguinaldo",
    name_en: "The Bonus",
    name_es: "El aguinaldo",
    description_en: "You don't know when, but brings joy",
    description_es: "No sabes cuando, pero te da una alegría",
    sort_order: 10,
  },
];

export const up: Migration["up"] = async (db: Kysely<any>) => {
  // Helper to check if table exists
  const tableExists = async (table: string) => {
    const result = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table' AND name=${table}
    `.execute(db);
    return result.rows.length > 0;
  };

  if (!(await tableExists("voting_criteria"))) {
    await db.schema
      .createTable("voting_criteria")
      .addColumn("id", "text", (col) => col.primaryKey().notNull())
      .addColumn("code", "text", (col) => col.notNull().unique())
      .addColumn("name_en", "text", (col) => col.notNull())
      .addColumn("name_es", "text", (col) => col.notNull())
      .addColumn("description_en", "text")
      .addColumn("description_es", "text")
      .addColumn("is_active", "integer", (col) => col.defaultTo(1).notNull())
      .addColumn("sort_order", "integer", (col) => col.defaultTo(0).notNull())
      .addColumn("created_at", "text", (col) => col.notNull())
      .addColumn("updated_at", "text", (col) => col.notNull())
      .execute();
    console.log("✅ Created voting_criteria table");

    // Seed with initial criteria
    const now = new Date().toISOString();
    for (const criteria of votingCriteria) {
      await db
        .insertInto("voting_criteria")
        .values({
          ...criteria,
          is_active: 1,
          created_at: now,
          updated_at: now,
        })
        .execute();
    }
    console.log("✅ Seeded voting_criteria table with 10 initial criteria");
  } else {
    console.log("⏭️  voting_criteria table already exists, skipping");
  }

  console.log("✅ Migration: add-voting-criteria completed");
};

export const down: Migration["down"] = async (db: Kysely<any>) => {
  await db.schema.dropTable("voting_criteria").ifExists().execute();
  console.log("↩️ Dropped voting_criteria table");
};
