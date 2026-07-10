import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    url: process.env.ASSET_DB_URL ?? "postgresql://postgres:postgres@localhost:5432/rea3_assets?schema=public",
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
