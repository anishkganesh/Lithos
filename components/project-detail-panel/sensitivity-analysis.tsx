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
  const baselineAISC = project.aisc || 0

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

  const calculateAISCForValues = (vals: Record<string, number>) => {
    if (project.aisc === null || project.aisc === undefined) return 0

    // AISC impacts (inverse for throughput, grade, recovery)
    const throughputImpact = -(vals.throughput - 100) * 0.007 // Higher throughput spreads fixed costs
    const gradeImpact = -(vals.grade - 100) * 0.008 // Higher grade reduces cost per unit
    const opexImpact = (vals.opex - 100) * 0.009 // Direct impact
    const capexImpact = (vals.capex - 100) * 0.002 // Sustaining capex component
    const recoveryImpact = -(vals.recovery - 100) * 0.007 // Higher recovery reduces cost per unit

    const totalImpact = 1 + throughputImpact + gradeImpact + opexImpact + capexImpact + recoveryImpact
    return project.aisc * totalImpact
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
      // Calculate parameter changes as percentages from baseline
      const parameterChanges = {
        commodityPrice: currentValues.price - 100,
        throughput: currentValues.throughput - 100,
        grade: currentValues.grade - 100,
        opex: currentValues.opex - 100,
        capex: currentValues.capex - 100,
        recovery: currentValues.recovery - 100
      }

      // Call new sensitivity analysis API with GPT integration
      const response = await fetch('/api/sensitivity-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseCase: {
            npv: baselineNPV,
            irr: baselineIRR,
            aisc: baselineAISC
          },
          parameters: parameterChanges,
          projectContext: {
            name: project.name,
            commodity: project.commodities?.[0],
            mineLife: project.mine_life,
            annualProduction: project.annual_production
          }
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      if (data.success && data.result) {
        const { explanation, assumptions, riskFactors } = data.result

        let insightText = explanation

        if (assumptions && assumptions.length > 0) {
          insightText += `\n\nKey Assumptions: ${assumptions.join('; ')}`
        }

        if (riskFactors && riskFactors.length > 0) {
          insightText += `\n\nRisk Factors: ${riskFactors.join('; ')}`
        }

        setAiInsight(insightText)
      } else {
        throw new Error('Invalid API response')
      }
    } catch (error) {
      console.error('AI Insight error:', error)
      // Fallback to simple calculation-based insight
      const npvCalc = calculateNPVForValues(currentValues)
      const aiscCalc = calculateAISCForValues(currentValues)
      const npvChange = baselineNPV > 0 ? ((npvCalc - baselineNPV) / baselineNPV) * 100 : 0
      setAiInsight(`Sensitivity scenario with ${changes.length} parameter${changes.length > 1 ? 's' : ''} adjusted. NPV impact: ${npvChange > 0 ? '+' : ''}${npvChange.toFixed(1)}%. ${baselineAISC > 0 ? `AISC: $${aiscCalc.toFixed(0)}/unit` : ''}`)
    } finally {
      setIsGeneratingInsight(false)
    }
  }, [parameters, baselineNPV, baselineIRR, baselineAISC, calculateNPVForValues, calculateAISCForValues, project])

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
  const calculateAISC = () => calculateAISCForValues(values)

  const getPercentChange = (current: number, base: number) => {
    return ((current - base) / base * 100).toFixed(1)
  }

  const npv = calculateNPV()
  const irr = calculateIRR()
  const aisc = calculateAISC()
  const npvTrend = baselineNPV > 0 ? ((npv - baselineNPV) / baselineNPV) * 100 : 0
  const irrTrend = baselineIRR > 0 ? irr - baselineIRR : 0
  const aiscTrend = baselineAISC > 0 ? ((aisc - baselineAISC) / baselineAISC) * 100 : 0

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
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">NPV</div>
                <div className="text-2xl font-bold text-blue-600">
                  {baselineNPV > 0 ? `$${npv.toFixed(0)}M` : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {baselineNPV > 0 && npvTrend !== 0
                    ? `${npvTrend > 0 ? '+' : ''}${npvTrend.toFixed(1)}%`
                    : '0.0%'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">IRR</div>
                <div className="text-2xl font-bold text-green-600">
                  {baselineIRR > 0 ? `${irr.toFixed(1)}%` : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {baselineIRR > 0 && irrTrend !== 0
                    ? `${irrTrend > 0 ? '+' : ''}${irrTrend.toFixed(1)} pts`
                    : '0.0 pts'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">AISC</div>
                <div className="text-2xl font-bold text-orange-600">
                  {baselineAISC > 0 ? `$${aisc.toFixed(0)}` : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {baselineAISC > 0 && aiscTrend !== 0
                    ? `${aiscTrend > 0 ? '+' : ''}${aiscTrend.toFixed(1)}%`
                    : '0.0%'}
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