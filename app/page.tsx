"use client"
import { useSession, signIn } from "next-auth/react"

export default function SignIn() {
  const { data: session, status } = useSession()

  if (status === "loading") return <p>Loading...</p>

  if (session) {
    return (
      <div>
        <p>Signed in as {session.user?.name || session.user?.email}</p>
        <p>Username: {session.user?.name}</p> {/* GitHub username */}
      </div>
    )
  }

  return (
    <form
      action={async () => {
        await signIn("github")
      }}
    >
      <button type="submit">Sign in with GitHub</button>
    </form>
  )
}