"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [signUpSuccess, setSignUpSuccess] = useState(false)
  const router = useRouter()

  const handleCredentialSignIn = async () => {
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        redirect: false, 
        email,
        password,
        action: "login",
      })

      console.log("result : ", result);
      
      if (result?.error === "CredentialsSignin") {
        console.log("yes there is error");
        setError("check your email and password")
      } else if (result?.ok) {
        // Success - redirect to Chat
        router.push("/Chat")
      } else {
        setError("An unexpected error occurred")
      }
    } catch (error) {
      console.error("Sign-in error:", error)
      setError("Network error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // GitHub sign-in
  const handleGitHubSignIn = async () => {
    setLoading(true)
    try {
      await signIn("github", { callbackUrl: "/Chat" }) // Updated to Chat
    } catch (error) {
      console.error("GitHub sign-in error:", error)
      setError("GitHub sign-in failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="flex items-center justify-center bg-green-800 h-screen">
      <Card className="w-62 h-96 sm:w-80 md:w-96 lg:w-[24rem] lg:h-[30rem] shadow-lg">
        <CardHeader>
          <CardTitle className="text-center lg:text-3xl text-[16px] font-semibold">Welcome Back</CardTitle>
          <CardDescription className="text-center lg:text-sm text-[10px]">Sign in to your account</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
              {error.includes("already exists") && (
                <div className="mt-2">
                  <Link 
                    href="/sign-in" 
                    className="text-blue-600 hover:text-blue-500 underline font-medium"
                  >
                    Click here to sign in instead
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[12px] lg:text-sm font-medium text-gray-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-6 lg:h-8 border placeholder:text-[10px] pb-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[12px] lg:text-sm font-medium text-gray-700">
                Password
              </Label>
              <a href="#" className="text-[12px] lg:text-sm text-blue-600 hover:text-blue-500 font-medium">
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="h-6 lg:h-8 border placeholder:text-[10px] pb-2"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-center gap-4">
          {/* Credential sign-in */}
          <Button
            type="button"
            onClick={handleCredentialSignIn}
            disabled={loading}
            variant="outline"
            className="w-full text-[12px] lg:text-xs h-6 lg:h-8 bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Sign in"}
          </Button>

          <hr className="border-t-2 border-gray-300 w-full" />

          {/* Social sign-in */}
          <div className="flex justify-center gap-x-2 w-full">
            <Button 
              type="button" 
              disabled={loading}
              className="flex-1 bg-sky-500 text-white text-[12px] lg:text-xs h-6 lg:h-8 disabled:opacity-50"
            >
              Google
            </Button>

            <Button
              type="button"
              onClick={handleGitHubSignIn}
              disabled={loading}
              className="flex-1 bg-sky-500 text-white text-[12px] lg:text-xs h-6 lg:h-8 disabled:opacity-50"
            >
              GitHub
            </Button>
          </div>

          <Link
            href="/sign-up"
            className="text-[10px] lg:text-sm text-blue-600 hover:text-blue-500 font-medium"
          >
            Create an account
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}