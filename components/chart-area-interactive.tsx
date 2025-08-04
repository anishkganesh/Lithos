"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const chartData = [
  { date: "2024-01", lithium: 68500, copper: 9850, nickel: 18200 },
  { date: "2024-02", lithium: 72300, copper: 9920, nickel: 17800 },
  { date: "2024-03", lithium: 69800, copper: 10100, nickel: 18500 },
  { date: "2024-04", lithium: 71200, copper: 10250, nickel: 19200 },
  { date: "2024-05", lithium: 74500, copper: 10180, nickel: 18900 },
  { date: "2024-06", lithium: 76800, copper: 10350, nickel: 19500 },
  { date: "2024-07", lithium: 78200, copper: 10420, nickel: 20100 },
  { date: "2024-08", lithium: 75900, copper: 10280, nickel: 19800 },
  { date: "2024-09", lithium: 77400, copper: 10500, nickel: 20300 },
  { date: "2024-10", lithium: 79100, copper: 10650, nickel: 20800 },
  { date: "2024-11", lithium: 81200, copper: 10720, nickel: 21200 },
  { date: "2024-12", lithium: 82500, copper: 10850, nickel: 21500 },
]

const chartConfig = {
  lithium: {
    label: "Lithium ($/t)",
    color: "hsl(var(--chart-1))",
  },
  copper: {
    label: "Copper ($/t)",
    color: "hsl(var(--chart-2))",
  },
  nickel: {
    label: "Nickel ($/t)",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const [timeRange, setTimeRange] = React.useState("12m")

  const filteredData = React.useMemo(() => {
    const now = new Date()
    const ranges = {
      "3m": 3,
      "6m": 6,
      "12m": 12,
    }
    const monthsToShow = ranges[timeRange as keyof typeof ranges] || 12
    return chartData.slice(-monthsToShow)
  }, [timeRange])

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Commodity Price Trends</CardTitle>
          <CardDescription>
            Average monthly spot prices for critical minerals
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select time range"
          >
            <SelectValue placeholder="Last 12 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="3m" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="6m" className="rounded-lg">
              Last 6 months
            </SelectItem>
            <SelectItem value="12m" className="rounded-lg">
              Last 12 months
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillLithium" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-lithium)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-lithium)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillCopper" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-copper)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-copper)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillNickel" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-nickel)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-nickel)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  }}
                  formatter={(value) => `$${value.toLocaleString()}/t`}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="lithium"
              type="monotone"
              fill="url(#fillLithium)"
              stroke="var(--color-lithium)"
              stackId="a"
            />
            <Area
              dataKey="copper"
              type="monotone"
              fill="url(#fillCopper)"
              stroke="var(--color-copper)"
              stackId="a"
            />
            <Area
              dataKey="nickel"
              type="monotone"
              fill="url(#fillNickel)"
              stroke="var(--color-nickel)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
