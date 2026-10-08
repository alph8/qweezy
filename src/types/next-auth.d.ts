import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      balance: number;
      name?: string | null;
      email?: string | null;
    };
  }
}
