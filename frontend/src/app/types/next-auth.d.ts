import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface User {
    id: string;
  }
  interface Token {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
  }
}