"use client"

import * as React from "react"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MiningProject } from "@/lib/types/mining-project"
import { Sparkles } from "lucide-react"

interface SensitivityAnalysisProps {
  project: MiningProject
}

interface SensitivityParameter {
  name: string
  key: string
  min: number
  max: number
  baseline: number
  unit: string
  step: number
  category: 'market' | 'production' | 'costs'
}

export function SensitivityAnalysis({ project }: SensitivityAnalysisProps) {
  const parameters: SensitivityParameter[] = [
    {
      name: "Commodity Price",
      key: "price",
      min: 80,
      max: 120,
      baseline: 100,
      unit: "%",
      step: 0.1,
      category: 'market'
    },
    {
      name: "Throughput",
      key: "throughput",
      min: 80,
      max: 120,
      baseline: 100,
      unit: "%",
      step: 0.1,
      category: 'production'
    },
    {
      name: "Head Grade",
      key: "grade",
      min: 80,
      max: 120,
      baseline: 100,
      unit: "%",
      step: 0.1,
      category: 'production'
    },
    {
      name: "Operating Costs",
      key: "opex",
      min: 80,
      max: 120,
      baseline: 100,
      unit: "%",
      step: 0.1,
      category: 'costs'
    },
    {
      name: "Capital Costs",
      key: "capex",
      min: 80,
      max: 120,
      baseline: 100,
      unit: "%",
      step: 0.1,
      category: 'costs'
    },
    {
      name: "Recovery Rate",
      key: "recovery",
      min: 80,
      max: 120,
      baseline: 100,
      unit: "%",
      step: 0.1,
      category: 'production'
    },
  ]

  const [values, setValues] = React.useState<Record<string, number>>(
    parameters.reduce((acc, param) => ({ ...acc, [param.key]: param.baseline }), {})
  )
  const [aiInsight, setAiInsight] = React.useState<string>("")
  const [isGeneratingInsight, setIsGeneratingInsight] = React.useState(false)
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null)

  const baselineNPV = project.npv || 0
  const baselineIRR = project.irr || 0

  const calculateNPVForValues = (vals: Record<string, number>) => {
    if (project.npv === null || project.npv === undefined) return 0

    const priceImpact = (vals.price - 100) * 0.02
    const throughputImpact = (vals.throughput - 100) * 0.015
    const gradeImpact = (vals.grade - 100) * 0.018
    const recoveryImpact = (vals.recovery - 100) * 0.012
    const opexImpact = -(vals.opex - 100) * 0.012
    const capexImpact = -(vals.capex - 100) * 0.008

    const totalImpact = 1 + priceImpact + throughputImpact + gradeImpact + recoveryImpact + opexImpact + capexImpact
    return project.npv * totalImpact
  }

  const calculateIRRForValues = (vals: Record<string, number>) => {
    if (project.irr === null || project.irr === undefined) return 0

    const priceImpact = (vals.price - 100) * 0.015
    const throughputImpact = (vals.throughput - 100) * 0.01
    const gradeImpact = (vals.grade - 100) * 0.012
    const recoveryImpact = (vals.recovery - 100) * 0.008
    const opexImpact = -(vals.opex - 100) * 0.008
    const capexImpact = -(vals.capex - 100) * 0.006

    const totalImpact = priceImpact + throughputImpact + gradeImpact + recoveryImpact + opexImpact + capexImpact
    return project.irr + totalImpact
  }

  const generateAIInsight = React.useCallback(async (currentValues: Record<string, number>) => {
    const changes = parameters
      .filter(p => Math.abs(currentValues[p.key] - p.baseline) > 0.1)
      .map(p => ({
        name: p.name,
        value: currentValues[p.key],
        change: ((currentValues[p.key] - p.baseline) / p.baseline * 100).toFixed(1)
      }))

    if (changes.length === 0) {
      setAiInsight("Base case scenario with all parameters at 100% baseline. This represents the original project assumptions with no sensitivity adjustments applied.")
      return
    }

    setIsGeneratingInsight(true)
    try {
      const npvCalc = calculateNPVForValues(currentValues)
      const irrCalc = calculateIRRForValues(currentValues)
      const npvChange = baselineNPV > 0 ? ((npvCalc - baselineNPV) / baselineNPV) * 100 : 0
      const irrChange = baselineIRR > 0 ? irrCalc - baselineIRR : 0

      const changesDescription = changes.map(c => `${c.name} adjusted to ${c.value}% (${c.change > 0 ? '+' : ''}${c.change}% from baseline)`).join(', ')

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a financial analyst specializing in mining project economics. Your role is to provide clear, actionable insights about how parameter changes affect project viability. Always explain the implications for project economics in practical terms.`
            },
            {
              role: 'user',
              content: `Analyze this mining project sensitivity scenario:

**Parameter Adjustments:**
${changesDescription}

**Financial Impact:**
- NPV changed from $${baselineNPV}M to $${npvCalc.toFixed(0)}M (${npvChange > 0 ? '+' : ''}${npvChange.toFixed(1)}% change)
- IRR changed from ${baselineIRR}% to ${irrCalc.toFixed(1)}% (${irrChange > 0 ? '+' : ''}${irrChange.toFixed(1)} percentage points change)

Provide 2-3 sentences explaining: (1) what these changes mean for project economics, (2) which parameter changes are driving the impact, and (3) any risk or opportunity this reveals. Be specific and actionable.`
            }
          ]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        throw new Error(`API error: ${response.status}`)
      }
      const data = await response.json()
      console.log('AI Insight response:', data)
      setAiInsight(data.content || data.message || "Parameter adjustments applied to sensitivity scenario.")
    } catch (error) {
      console.error('AI Insight error:', error)
      const npvCalc = calculateNPVForValues(currentValues)
      const npvChange = baselineNPV > 0 ? ((npvCalc - baselineNPV) / baselineNPV) * 100 : 0
      setAiInsight(`Sensitivity scenario with ${changes.length} parameter${changes.length > 1 ? 's' : ''} adjusted from baseline. NPV impact: ${npvChange > 0 ? '+' : ''}${npvChange.toFixed(1)}%.`)
    } finally {
      setIsGeneratingInsight(false)
    }
  }, [parameters, baselineNPV, baselineIRR, calculateNPVForValues])

  const debouncedGenerateInsight = React.useCallback((newValues: Record<string, number>) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      generateAIInsight(newValues)
    }, 1000)
  }, [generateAIInsight])

  const handleSliderChange = (param: string, value: number) => {
    const newValues = { ...values, [param]: value }
    setValues(newValues)
    debouncedGenerateInsight(newValues)
  }

  const handleInputChange = (param: string, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      const newValues = { ...values, [param]: numValue }
      setValues(newValues)
      debouncedGenerateInsight(newValues)
    }
  }

  const calculateNPV = () => calculateNPVForValues(values)
  const calculateIRR = () => calculateIRRForValues(values)

  const getPercentChange = (current: number, base: number) => {
    return ((current - base) / base * 100).toFixed(1)
  }

  const npv = calculateNPV()
  const irr = calculateIRR()
  const npvTrend = baselineNPV > 0 ? ((npv - baselineNPV) / baselineNPV) * 100 : 0
  const irrTrend = baselineIRR > 0 ? irr - baselineIRR : 0

  const groupedParams = {
    market: parameters.filter(p => p.category === 'market'),
    production: parameters.filter(p => p.category === 'production'),
    costs: parameters.filter(p => p.category === 'costs'),
  }

  React.useEffect(() => {
    generateAIInsight(values)
  }, [])

  const InputRow = ({ param }: { param: SensitivityParameter }) => {
    const [localValue, setLocalValue] = React.useState(values[param.key])

    // Sync local value with global state when values change externally (e.g., reset button)
    React.useEffect(() => {
      setLocalValue(values[param.key])
    }, [values[param.key]])

    const handleLocalSliderChange = (newValue: number[]) => {
      setLocalValue(newValue[0])
    }

    const handleSliderCommit = (newValue: number[]) => {
      handleSliderChange(param.key, newValue[0])
    }

    return (
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">{param.name}</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={values[param.key]}
              onChange={(e) => handleInputChange(param.key, e.target.value)}
              className="w-16 h-7 px-2 text-xs text-right"
              step={param.step}
            />
            <span className="text-xs text-muted-foreground">{param.unit}</span>
            {Math.abs(parseFloat(getPercentChange(values[param.key], param.baseline))) > 0.1 && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {getPercentChange(values[param.key], param.baseline)}%
              </span>
            )}
          </div>
        </div>
        <Slider
          value={[localValue]}
          onValueChange={handleLocalSliderChange}
          onValueCommit={handleSliderCommit}
          min={param.min}
          max={param.max}
          step={param.step}
          className="mb-1.5"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{param.min}{param.unit}</span>
          <span>Base: {param.baseline}{param.unit}</span>
          <span>{param.max}{param.unit}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Sensitivity Analysis</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const baseValues = parameters.reduce((acc, param) => ({ ...acc, [param.key]: param.baseline }), {})
            setValues(baseValues)
            generateAIInsight(baseValues)
          }}
        >
          Reset to Base
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left - Parameters */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Market</h4>
            {groupedParams.market.map((param) => (
              <InputRow key={param.key} param={param} />
            ))}
          </div>

          <div className="border-t pt-4">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Production</h4>
            {groupedParams.production.map((param) => (
              <InputRow key={param.key} param={param} />
            ))}
          </div>

          <div className="border-t pt-4">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Costs</h4>
            {groupedParams.costs.map((param) => (
              <InputRow key={param.key} param={param} />
            ))}
          </div>
        </div>

        {/* Right - Results */}
        <div className="space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">NPV (Net Present Value)</div>
                <div className="text-3xl font-bold text-blue-600">
                  {baselineNPV > 0 ? `$${npv.toFixed(0)}M` : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {baselineNPV > 0 && npvTrend !== 0
                    ? `${npvTrend > 0 ? '+' : ''}${npvTrend.toFixed(1)}% from baseline`
                    : '0.0% from baseline'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">IRR (Internal Rate of Return)</div>
                <div className="text-3xl font-bold text-green-600">
                  {baselineIRR > 0 ? `${irr.toFixed(1)}%` : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {baselineIRR > 0 && irrTrend !== 0
                    ? `${irrTrend > 0 ? '+' : ''}${irrTrend.toFixed(1)}% pts from baseline`
                    : '0.0% pts from baseline'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insight */}
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">AI Insight</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isGeneratingInsight ? "Analyzing scenario..." : aiInsight || "Base case scenario."}
              </p>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <Card>
            <CardContent className="p-3">
              <h4 className="text-xs font-semibold mb-2">Scenario Comparison</h4>
              <div className="text-xs">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-muted-foreground">
                      <th className="text-left py-2 font-medium">Parameter</th>
                      <th className="text-right py-2 font-medium">Base</th>
                      <th className="text-right py-2 font-medium">Current</th>
                      <th className="text-right py-2 font-medium">Δ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-2">Commodity Price</td>
                      <td className="py-2 text-right text-muted-foreground">{parameters[0].baseline}%</td>
                      <td className="py-2 text-right font-medium">{values.price}%</td>
                      <td className={`py-2 text-right font-medium ${
                        parseFloat(getPercentChange(values.price, parameters[0].baseline)) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {getPercentChange(values.price, parameters[0].baseline)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Head Grade</td>
                      <td className="py-2 text-right text-muted-foreground">{parameters[2].baseline}%</td>
                      <td className="py-2 text-right font-medium">{values.grade}%</td>
                      <td className={`py-2 text-right font-medium ${
                        parseFloat(getPercentChange(values.grade, parameters[2].baseline)) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {getPercentChange(values.grade, parameters[2].baseline)}%
                      </td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="py-2 font-semibold">NPV</td>
                      <td className="py-2 text-right text-muted-foreground">${baselineNPV}M</td>
                      <td className="py-2 text-right font-semibold">${npv.toFixed(0)}M</td>
                      <td className={`py-2 text-right font-semibold ${npvTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {npvTrend.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 