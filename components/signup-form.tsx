"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { useRedirectIfAuthenticated } from "@/lib/auth-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Info } from "lucide-react"

export function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [step, setStep] = useState<"account" | "company">("account")
  const router = useRouter()
  const { signUp } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "info" | null;
    message: string;
  }>({ type: null, message: "" })
  
  // Form data state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    brand: "", // This will store company name but map to brand field in DB
    desc: "",
    category: "",
    website: "",
    founded: ""
  })
  
  // Redirect if already authenticated
  useRedirectIfAuthenticated()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }
  
  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, category: value }))
  }

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    setAlert({ type: null, message: "" })
    
    // Validate account information
    if (!formData.name || !formData.email || !formData.password) {
      setAlert({
        type: "error",
        message: "Please fill in all required fields"
      })
      return
    }
    
    // Password validation
    if (formData.password.length < 8) {
      setAlert({
        type: "error",
        message: "Password must be at least 8 characters long"
      })
      return
    }
    
    setStep("company")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAlert({ type: null, message: "" })
    
    // Validate company information
    if (!formData.brand || !formData.desc || !formData.category) {
      setAlert({
        type: "error",
        message: "Please fill in all required fields"
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const { error, success, message } = await signUp(
        formData.email, 
        formData.password,
        {
          name: formData.name,
          brand: formData.brand, // Company name stored as brand
          desc: formData.desc,
          category: formData.category,
          website: formData.website,
          founded: formData.founded
        }
      )
      
      if (success) {
        setAlert({
          type: "success",
          message: message || "A confirmation link has been sent to your email"
        })
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      } else {
        if (message === 'Email already taken') {
          setAlert({
            type: "error",
            message: "Email already taken"
          })
        } else if (message?.includes('verification')) {
          setAlert({
            type: "info",
            message: "Please verify your email address before logging in"
          })
        } else {
          setAlert({
            type: "error",
            message: message || "Failed to create account"
          })
        }
      }
    } catch (error) {
      setAlert({
        type: "error",
        message: "An unexpected error occurred"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Join our platform for critical minerals intelligence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alert.type && (
            <Alert 
              variant={alert.type === "success" ? "default" : alert.type === "error" ? "destructive" : "default"}
              className="mb-6"
            >
              {alert.type === "success" && <CheckCircle className="h-4 w-4" />}
              {alert.type === "error" && <AlertCircle className="h-4 w-4" />}
              {alert.type === "info" && <Info className="h-4 w-4" />}
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          )}
          <Tabs value={step} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="account" disabled={step === "company"}>Account</TabsTrigger>
              <TabsTrigger value="company" disabled={step === "account"}>Company Details</TabsTrigger>
            </TabsList>
            <TabsContent value="account">
              <form onSubmit={handleNextStep}>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Smith"
                      required
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@yourcompany.com"
                      required
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                  <Button type="submit" className="w-full">
                    Continue
                  </Button>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="company">
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="brand">Company Name</Label>
                    <Input
                      id="brand"
                      placeholder="Your Company Name"
                      required
                      value={formData.brand}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="desc">Company Description</Label>
                    <Textarea
                      id="desc"
                      placeholder="Tell us about your company and what makes it unique..."
                      className="min-h-24"
                      required
                      value={formData.desc}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Primary Industry</Label>
                    <Select required value={formData.category} onValueChange={handleSelectChange}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mining">Mining</SelectItem>
                        <SelectItem value="battery">Battery Manufacturing</SelectItem>
                        <SelectItem value="automotive">Automotive</SelectItem>
                        <SelectItem value="energy">Energy Storage</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="recycling">Recycling</SelectItem>
                        <SelectItem value="consulting">Consulting</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://yourcompany.com"
                      required
                      value={formData.website}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="founded">Founded Year</Label>
                    <Input
                      id="founded"
                      type="number"
                      placeholder="2025"
                      min="1900"
                      max="2025"
                      value={formData.founded}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep("account")}
                    >
                      Back
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating Account..." : "Complete Setup"}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center border-t px-6 py-4">
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </div>
        </CardFooter>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}
