"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useOfflineData } from "@/hooks/use-offline-data"
import { formatCurrency } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"

// Parse currency string back to number
const parseCurrency = (value: string): number => {
  // Remove all non-digit characters (including thousand separators)
  const numStr = value.replace(/[^\d]/g, '')

  // Parse as integer and ensure it's not negative
  return Math.max(0, parseInt(numStr) || 0)
}

// Define the pricing package schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  price: z.coerce.number().min(50000, "Price must be a positive number"),
  session_count: z.coerce.number().int().min(1, "Session count must be at least 1"),
  is_subscription: z.boolean(),
})

// Define the pricing package type
type PricingPackage = {
  id: string
  trainer_id: string
  name: string
  description?: string
  price: number
  session_count: number
  is_subscription: boolean
  created_at?: string
}

export default function NewPricingPackagePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Use the offline data hook for pricing packages
  const { createItem: createPricingPackage } = useOfflineData<PricingPackage>({
    table: 'pricing_packages',
    select: '*',
    orderColumn: 'name'
  })

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      session_count: 1,
      is_subscription: false,
    },
  })

  // Handle form submission
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await createPricingPackage(values)
      toast.success("Pricing package created successfully")
      router.push("/dashboard/pricing-packages")
    } catch (error) {
      console.error("Error creating pricing package:", error)
      toast.error("Failed to create pricing package")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between pr-4 md:px-6 z-10">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/pricing-packages">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">New Pricing Package</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-md border shadow-sm p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Basic Package" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Includes basic training sessions" {...field} className="min-h-[100px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (Rp) *</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          value={formatCurrency(field.value)}
                          onChange={(e) => {
                            const value = parseCurrency(e.target.value)
                            field.onChange(value)
                          }}
                          onBlur={(e) => {
                            e.target.value = formatCurrency(field.value)
                            field.onBlur()
                          }}
                          placeholder="1000000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="session_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sessions *</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="is_subscription"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Subscription</FormLabel>
                      <FormDescription>
                        Is this a recurring subscription package?
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Package"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </main>
    </div>
  )
}
