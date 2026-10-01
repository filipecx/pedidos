import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  plugins: [nextCookies()],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification
    }
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "CLIENTE",
      },
      phone: {
        type: "string",
        required: false,
      }
    }
  },
  // Trava de Segurança: Nunca confia na role vinda do cliente HTTP
  hooks: {
    before: async (ctx) => {
      if (ctx.path.startsWith("/sign-up") && ctx.body) {
        // Se um hacker tentar injetar "ADMIN" via Postman, nós forçamos para CLIENTE.
        // Apenas o nosso Backend (via Drizzle) fará promoções.
        ctx.body.role = "CLIENTE";
      }
    }
  }
});
