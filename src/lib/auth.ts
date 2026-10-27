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
    sendResetPassword: async ({ user, url }) => {
      // Importação dinâmica para não quebrar no Edge se houver exports Node
      const { emailQueue } = await import("@/server/queues/email.queue");
      
      await emailQueue.add("password-reset", {
        email: user.email,
        url,
      });
    }
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "CLIENTE",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      }
    }
  },
  // Trava de Segurança: Nunca confia na role vinda do cliente HTTP em nenhuma rota
  hooks: {
    // @ts-ignore - melhor-auth tipagens desatualizadas
    before: async (ctx: any) => {
      if (ctx.body && typeof ctx.body === "object") {
        if (ctx.path && ctx.path.startsWith("/sign-up")) {
          // No cadastro, força sempre CLIENTE (promoções ocorrem exclusivamente via Drizzle no servidor)
          ctx.body.role = "CLIENTE";
        } else if ("role" in ctx.body) {
          // Em qualquer outra rota (ex: /update-user), impede alteração de role pelo cliente
          delete ctx.body.role;
        }
      }
    }
  }
});
