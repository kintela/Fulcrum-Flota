import NextAuth from "next-auth"
import type { AuthOptions } from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"

export const authOptions: AuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, account, profile }: any) {
      console.log("JWT Callback - Account:", account)
      console.log("JWT Callback - Profile:", profile)
      console.log("JWT Callback - Token before:", token)
      
      if (account) {
        token.accessToken = account.access_token
        token.idToken = account.id_token
        
        // Decodificar el id_token para obtener la información del usuario
        if (account.id_token) {
          try {
            const idTokenPayload = JSON.parse(Buffer.from(account.id_token.split('.')[1], 'base64').toString())
            console.log("ID Token Payload:", idTokenPayload)
            
            token.name = idTokenPayload.name
            token.email = idTokenPayload.email
          } catch (error) {
            console.error("Error decoding id_token:", error)
          }
        }
      }
      if (profile) {
        token.name = profile.name || profile.displayName
        token.email = profile.email || profile.mail || profile.userPrincipalName
      }
      
      console.log("JWT Callback - Token after:", token)
      return token
    },
    async session({ session, token }: any) {
      console.log("Session Callback - Token:", token)
      console.log("Session Callback - Session before:", session)
      
      session.accessToken = token.accessToken
      session.idToken = token.idToken
      
      if (token.name) {
        session.user.name = token.name
      }
      if (token.email) {
        session.user.email = token.email
      }
      
      console.log("Session Callback - Session after:", session)
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
