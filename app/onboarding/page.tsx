'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import Image from 'next/image'

const commodityOptions = [
  'Gold', 'Silver', 'Copper', 'Lithium', 'Cobalt', 'Nickel',
  'Zinc', 'Lead', 'Uranium', 'Rare Earths', 'Coal', 'Iron Ore'
]

const jurisdictionOptions = [
  'Canada', 'United States', 'Australia', 'Chile', 'Peru', 'Mexico',
  'Brazil', 'South Africa', 'China', 'Russia', 'Indonesia', 'Europe'
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([])
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { updateProfile } = useAuth()

  const totalSteps = 3
  const progress = (step / totalSteps) * 100

  const handleCommodityToggle = (commodity: string) => {
    setSelectedCommodities(prev =>
      prev.includes(commodity)
        ? prev.filter(c => c !== commodity)
        : [...prev, commodity]
    )
  }

  const handleJurisdictionToggle = (jurisdiction: string) => {
    setSelectedJurisdictions(prev =>
      prev.includes(jurisdiction)
        ? prev.filter(j => j !== jurisdiction)
        : [...prev, jurisdiction]
    )
  }

  const handleComplete = async () => {
    setIsLoading(true)
    
    try {
      await updateProfile({
        mining_interests: [...selectedCommodities, ...selectedJurisdictions]
      })
      
      // Save preferences
      const preferences = {
        default_commodity_filters: selectedCommodities,
        default_jurisdiction_filters: selectedJurisdictions
      }
      
      // TODO: Save preferences to user_preferences table
      
      router.push('/')
    } catch (error) {
      // Error handled in auth context
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Image
              src="/favicon.avif"
              alt="Lithos"
              width={48}
              height={48}
              className="rounded-lg"
            />
          </div>
          <Progress value={progress} className="mb-4" />
          <CardTitle className="text-2xl font-bold text-center">
            {step === 1 && 'Welcome to Lithos'}
            {step === 2 && 'Select Your Commodities'}
            {step === 3 && 'Select Your Jurisdictions'}
          </CardTitle>
          <CardDescription className="text-center">
            {step === 1 && 'Let\'s personalize your mining intelligence experience'}
            {step === 2 && 'Choose the commodities you\'re interested in tracking'}
            {step === 3 && 'Select the jurisdictions you want to monitor'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Lithos provides real-time intelligence on mining projects worldwide.
                We'll help you track the commodities and regions that matter to you.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="font-semibold mb-2">📊 Project Screener</h3>
                  <p className="text-sm text-muted-foreground">
                    Filter and analyze 8,000+ mining projects
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="font-semibold mb-2">🤖 AI Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Get instant insights from technical reports
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="font-semibold mb-2">🔔 Real-time Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    Never miss critical project updates
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {commodityOptions.map(commodity => (
                  <div key={commodity} className="flex items-center space-x-2">
                    <Checkbox
                      id={commodity}
                      checked={selectedCommodities.includes(commodity)}
                      onCheckedChange={() => handleCommodityToggle(commodity)}
                    />
                    <label
                      htmlFor={commodity}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {commodity}
                    </label>
                  </div>
                ))}
              </div>
              {selectedCommodities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <p className="text-sm text-muted-foreground mr-2">Selected:</p>
                  {selectedCommodities.map(commodity => (
                    <Badge key={commodity} variant="secondary">
                      {commodity}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {jurisdictionOptions.map(jurisdiction => (
                  <div key={jurisdiction} className="flex items-center space-x-2">
                    <Checkbox
                      id={jurisdiction}
                      checked={selectedJurisdictions.includes(jurisdiction)}
                      onCheckedChange={() => handleJurisdictionToggle(jurisdiction)}
                    />
                    <label
                      htmlFor={jurisdiction}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {jurisdiction}
                    </label>
                  </div>
                ))}
              </div>
              {selectedJurisdictions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <p className="text-sm text-muted-foreground mr-2">Selected:</p>
                  {selectedJurisdictions.map(jurisdiction => (
                    <Badge key={jurisdiction} variant="secondary">
                      {jurisdiction}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="ghost"
            onClick={step === 1 ? handleSkip : () => setStep(step - 1)}
            disabled={isLoading}
          >
            {step === 1 ? 'Skip' : (
              <>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </>
            )}
          </Button>
          
          <Button
            onClick={step === totalSteps ? handleComplete : () => setStep(step + 1)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : step === totalSteps ? (
              'Complete Setup'
            ) : (
              <>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
