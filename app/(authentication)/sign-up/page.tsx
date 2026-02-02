/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Mail, Lock, Github, AlertCircle, UserPlus } from "lucide-react"

export default function SignUp() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCredentialSignUp = async () => {
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
        action: "register",
        callbackUrl: "/Chat"
      })

      console.log("result : ", result);

      if (result?.error === "CredentialsSignin") {
        console.log("yes there is error");
        setError("check your email and password")
      } else if (result?.ok) {
        router.push("/Chat")
      } else {
        setError("An unexpected error occurred")
      }
    } catch (error) {
      console.error("Sign-up error:", error)
      setError("Network error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubSignUp = async () => {
    setLoading(true)
    try {
      await signIn("github", { callbackUrl: "/Chat" })
    } catch (error) {
      console.error("GitHub sign-up error:", error)
      setError("GitHub sign-up failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      handleCredentialSignUp()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md bg-white shadow-lg border border-gray-200">
        <CardHeader className="space-y-3 pt-8 pb-6">
          <div className="mx-auto w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-sm mb-2">
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-center text-2xl font-semibold text-gray-900">
            Create Account
          </CardTitle>
          <CardDescription className="text-center text-sm text-gray-600">
            Sign up to get started
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-6">
          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">{error}</p>
                {error.includes("already exists") && (
                  <Link
                    href="/sign-in"
                    className="text-sm text-blue-600 hover:text-blue-500 underline font-medium mt-1 inline-block"
                  >
                    Click here to sign in instead
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                required
                className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                required
                minLength={8}
                className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500">Must be at least 8 characters</p>
          </div>

          {/* Sign up button */}
          <Button
            type="button"
            onClick={handleCredentialSignUp}
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Creating account...</span>
              </div>
            ) : (
              "Sign up"
            )}
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Social sign-up buttons */}
          <div className="flex justify-center gap-2 w-full">
            <Button
              type="button"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700 h-11 disabled:opacity-50 font-medium"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>

            <Button
              type="button"
              onClick={handleGitHubSignUp}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700 h-11 disabled:opacity-50 font-medium"
            >
              <Github className="w-5 h-5 mr-2" />
              GitHub
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-center gap-4 pb-8 pt-4">
          <div className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}