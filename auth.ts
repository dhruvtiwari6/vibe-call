import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { NextAuthConfig } from "next-auth"
import credentialProvider from "next-auth/providers/credentials"
import { prisma } from "./app/lib/db"
import bcrypt from 'bcryptjs'

const authOptions: NextAuthConfig = {
    providers: [
        GitHub({
            clientId: process.env.AUTH_GITHUB_ID!,
            clientSecret: process.env.AUTH_GITHUB_SECRET!,
            authorization: {
                params: { prompt: "consent", scope: "read:user user:email" }
            },
            profile(profile) {
                return {
                    id: profile.id.toString(),
                    name: profile.name || profile.login,
                    email: profile.email,
                    image: profile.avatar_url,
                }
            }
        }),

        credentialProvider({
            name: "credentials",
            credentials: {
                email: { type: "email" },
                password: { type: "password" },
                action: { type: "text" }
            },

            async authorize(credentials) {
                try {
                    if (!credentials?.email || !credentials.password || !credentials.action) {
                        return null;
                    }

                    const email = credentials.email as string
                    const password = credentials.password as string
                    const action = credentials.action as string

                    console.log(action);

                    if (action === "register") {
                        const existingUser = await prisma.user.findUnique({
                            where: { email }
                        })

                        if (existingUser) {
                            console.log("yes")
                            return null;
                        }
                        
                        console.log("ongoing");
                        const hashedPassword = await bcrypt.hash(password, 12)
                        const newUser = await prisma.user.create({
                            data: {
                                email,
                                password: hashedPassword,
                                name: email.split('@')[0],
                            }
                        })

                        console.log("user regisetered successfully");

                        return {
                            id: newUser.id,
                            name: newUser.name,
                            email: newUser.email,
                            image: newUser.image
                        }

                    } else if (action === "login") {
                        const user = await prisma.user.findUnique({
                            where: { email }
                        })

                        if (!user || !user.password) {
                            return null;
                        }

                        const isPasswordValid = await bcrypt.compare(password, user.password)
                        if (!isPasswordValid) {
                            return null;
                        }


                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            image: user.image
                        }
                    } else {
                        throw new Error("INVALID_ACTION")
                    }

                } catch (error) {
                    console.error("Authorize error:", error)
                    return null;
                }
            }
        })
    ],

    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "github") {
                try {
                    const existingUser = await prisma.user.findUnique({
                        where: { email: user.email! }
                    })

                    if (!existingUser) {
                        await prisma.user.create({
                            data: {
                                email: user.email!,
                                name: user.name,
                                image: user.image,
                                emailVerified: new Date(),
                            }
                        })
                    }
                } catch (error) {
                    console.error("Error handling GitHub user:", error)
                    return false
                }
            }
            return true
        },

        async jwt({ token, user, account }) {
            if (user) {
                if (account?.provider === "credentials") {
                    token.id = user.id;
                    
                } else if (account?.provider === "github") {
                    // Get database user ID for GitHub users
                    const dbUser = await prisma.user.findUnique({
                        where: { email: user.email! }
                    })
                    token.id = dbUser?.id || ""
                }
                token.email = user.email;
                token.image = user.image;

            }
            return token;
        },

        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
                session.user.email = token.email as string; 
                session.user.image = token.image as string?? "";
            }
            return session
        }
    },

    pages: {
        error: '/api/auth/error', 
    },

    session: {
        strategy: "jwt",
    },

    secret: process.env.NEXTAUTH_SECRET,
}

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions)
export { authOptions }