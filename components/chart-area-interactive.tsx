"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { ContextMenuChat } from '@/components/ui/context-menu-chat'

import { useIsMobile } from '@/hooks/use-mobile'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'

export const description = "An interactive area chart"

// Mining-specific data: Production (oz/day) and Operating Costs ($/oz)
const chartData = [
  { date: "2024-04-01", production: 850, costs: 1150 },
  { date: "2024-04-02", production: 920, costs: 1180 },
  { date: "2024-04-03", production: 780, costs: 1220 },
  { date: "2024-04-04", production: 1050, costs: 1100 },
  { date: "2024-04-05", production: 1200, costs: 1050 },
  { date: "2024-04-06", production: 1150, costs: 1080 },
  { date: "2024-04-07", production: 980, costs: 1120 },
  { date: "2024-04-08", production: 1350, costs: 980 },
  { date: "2024-04-09", production: 650, costs: 1280 },
  { date: "2024-04-10", production: 1100, costs: 1090 },
  { date: "2024-04-11", production: 1250, costs: 1020 },
  { date: "2024-04-12", production: 1180, costs: 1060 },
  { date: "2024-04-13", production: 1320, costs: 990 },
  { date: "2024-04-14", production: 870, costs: 1200 },
  { date: "2024-04-15", production: 820, costs: 1230 },
  { date: "2024-04-16", production: 890, costs: 1190 },
  { date: "2024-04-17", production: 1420, costs: 960 },
  { date: "2024-04-18", production: 1380, costs: 970 },
  { date: "2024-04-19", production: 1050, costs: 1100 },
  { date: "2024-04-20", production: 720, costs: 1250 },
  { date: "2024-04-21", production: 880, costs: 1180 },
  { date: "2024-04-22", production: 1020, costs: 1110 },
  { date: "2024-04-23", production: 890, costs: 1170 },
  { date: "2024-04-24", production: 1380, costs: 980 },
  { date: "2024-04-25", production: 1050, costs: 1090 },
  { date: "2024-04-26", production: 680, costs: 1270 },
  { date: "2024-04-27", production: 1360, costs: 970 },
  { date: "2024-04-28", production: 850, costs: 1180 },
  { date: "2024-04-29", production: 1220, costs: 1040 },
  { date: "2024-04-30", production: 1450, costs: 950 },
  { date: "2024-05-01", production: 920, costs: 1160 },
  { date: "2024-05-02", production: 1180, costs: 1060 },
  { date: "2024-05-03", production: 1080, costs: 1090 },
  { date: "2024-05-04", production: 1380, costs: 980 },
  { date: "2024-05-05", production: 1480, costs: 940 },
  { date: "2024-05-06", production: 1520, costs: 920 },
  { date: "2024-05-07", production: 1380, costs: 980 },
  { date: "2024-05-08", production: 880, costs: 1190 },
  { date: "2024-05-09", production: 1020, costs: 1120 },
  { date: "2024-05-10", production: 1180, costs: 1050 },
  { date: "2024-05-11", production: 1280, costs: 1010 },
  { date: "2024-05-12", production: 980, costs: 1140 },
  { date: "2024-05-13", production: 980, costs: 1140 },
  { date: "2024-05-14", production: 1420, costs: 960 },
  { date: "2024-05-15", production: 1460, costs: 940 },
  { date: "2024-05-16", production: 1320, costs: 990 },
  { date: "2024-05-17", production: 1480, costs: 930 },
  { date: "2024-05-18", production: 1220, costs: 1040 },
  { date: "2024-05-19", production: 1050, costs: 1100 },
  { date: "2024-05-20", production: 950, costs: 1150 },
  { date: "2024-05-21", production: 720, costs: 1260 },
  { date: "2024-05-22", production: 710, costs: 1270 },
  { date: "2024-05-23", production: 1080, costs: 1080 },
  { date: "2024-05-24", production: 1180, costs: 1050 },
  { date: "2024-05-25", production: 1020, costs: 1110 },
  { date: "2024-05-26", production: 1050, costs: 1100 },
  { date: "2024-05-27", production: 1420, costs: 960 },
  { date: "2024-05-28", production: 1050, costs: 1100 },
  { date: "2024-05-29", production: 690, costs: 1260 },
  { date: "2024-05-30", production: 1280, costs: 1010 },
  { date: "2024-05-31", production: 950, costs: 1150 },
  { date: "2024-06-01", production: 950, costs: 1150 },
  { date: "2024-06-02", production: 1460, costs: 940 },
  { date: "2024-06-03", production: 820, costs: 1210 },
  { date: "2024-06-04", production: 1420, costs: 960 },
  { date: "2024-06-05", production: 720, costs: 1260 },
  { date: "2024-06-06", production: 1180, costs: 1050 },
  { date: "2024-06-07", production: 1250, costs: 1020 },
  { date: "2024-06-08", production: 1350, costs: 980 },
  { date: "2024-06-09", production: 1420, costs: 960 },
  { date: "2024-06-10", production: 880, costs: 1180 },
  { date: "2024-06-11", production: 750, costs: 1240 },
  { date: "2024-06-12", production: 1480, costs: 930 },
  { date: "2024-06-13", production: 710, costs: 1270 },
  { date: "2024-06-14", production: 1420, costs: 960 },
  { date: "2024-06-15", production: 1220, costs: 1040 },
  { date: "2024-06-16", production: 1320, costs: 990 },
  { date: "2024-06-17", production: 1460, costs: 940 },
  { date: "2024-06-18", production: 820, costs: 1210 },
  { date: "2024-06-19", production: 1280, costs: 1010 },
  { date: "2024-06-20", production: 1380, costs: 970 },
  { date: "2024-06-21", production: 920, costs: 1160 },
  { date: "2024-06-22", production: 1220, costs: 1040 },
  { date: "2024-06-23", production: 1480, costs: 930 },
  { date: "2024-06-24", production: 850, costs: 1190 },
  { date: "2024-06-25", production: 880, costs: 1180 },
  { date: "2024-06-26", production: 1420, costs: 960 },
  { date: "2024-06-27", production: 1440, costs: 950 },
  { date: "2024-06-28", production: 880, costs: 1180 },
  { date: "2024-06-29", production: 820, costs: 1210 },
  { date: "2024-06-30", production: 1440, costs: 950 },
]

const chartConfig = {
  metrics: {
    label: "Mining Metrics",
  },
  production: {
    label: "Production (oz/day)",
    color: "var(--primary)",
  },
  costs: {
    label: "Operating Costs ($/oz)",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Mining Operations Metrics</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Production & Operating Costs Trends
          </span>
          <span className="@[540px]/card:hidden">Operations Data</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ContextMenuChat
          data={filteredData}
          dataType="chart"
          context="Mining production and operating costs over time"
        >
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillProduction" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-production)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-production)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillCosts" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-costs)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-costs)"
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
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="costs"
              type="natural"
              fill="url(#fillCosts)"
              stroke="var(--color-costs)"
              stackId="a"
            />
            <Area
              dataKey="production"
              type="natural"
              fill="url(#fillProduction)"
              stroke="var(--color-production)"
              stackId="a"
            />
          </AreaChart>
          </ChartContainer>
        </ContextMenuChat>
      </CardContent>
    </Card>
  )
}
