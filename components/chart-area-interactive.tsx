"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

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

const chartData = [
  { date: "2024-10-01", technical: 12, feasibility: 8 },
  { date: "2024-10-02", technical: 9, feasibility: 10 },
  { date: "2024-10-03", technical: 15, feasibility: 7 },
  { date: "2024-10-04", technical: 18, feasibility: 12 },
  { date: "2024-10-05", technical: 22, feasibility: 15 },
  { date: "2024-10-06", technical: 20, feasibility: 18 },
  { date: "2024-10-07", technical: 16, feasibility: 10 },
  { date: "2024-10-08", technical: 25, feasibility: 20 },
  { date: "2024-10-09", technical: 8, feasibility: 6 },
  { date: "2024-10-10", technical: 19, feasibility: 11 },
  { date: "2024-10-11", technical: 21, feasibility: 17 },
  { date: "2024-10-12", technical: 17, feasibility: 13 },
  { date: "2024-10-13", technical: 23, feasibility: 19 },
  { date: "2024-10-14", technical: 11, feasibility: 9 },
  { date: "2024-10-15", technical: 10, feasibility: 8 },
  { date: "2024-10-16", technical: 12, feasibility: 10 },
  { date: "2024-10-17", technical: 28, feasibility: 22 },
  { date: "2024-10-18", technical: 24, feasibility: 20 },
  { date: "2024-10-19", technical: 18, feasibility: 12 },
  { date: "2024-10-20", technical: 9, feasibility: 7 },
  { date: "2024-10-21", technical: 13, feasibility: 11 },
  { date: "2024-10-22", technical: 16, feasibility: 10 },
  { date: "2024-10-23", technical: 14, feasibility: 12 },
  { date: "2024-10-24", technical: 26, feasibility: 18 },
  { date: "2024-10-25", technical: 17, feasibility: 14 },
  { date: "2024-10-26", technical: 8, feasibility: 6 },
  { date: "2024-10-27", technical: 25, feasibility: 21 },
  { date: "2024-10-28", technical: 10, feasibility: 9 },
  { date: "2024-10-29", technical: 20, feasibility: 15 },
  { date: "2024-10-30", technical: 29, feasibility: 23 },
  { date: "2024-10-31", technical: 13, feasibility: 11 },
  { date: "2024-11-01", technical: 19, feasibility: 16 },
  { date: "2024-11-02", technical: 18, feasibility: 11 },
  { date: "2024-11-03", technical: 26, feasibility: 22 },
  { date: "2024-11-04", technical: 30, feasibility: 24 },
  { date: "2024-11-05", technical: 31, feasibility: 26 },
  { date: "2024-11-06", technical: 25, feasibility: 18 },
  { date: "2024-11-07", technical: 12, feasibility: 10 },
  { date: "2024-11-08", technical: 16, feasibility: 11 },
  { date: "2024-11-09", technical: 20, feasibility: 17 },
  { date: "2024-11-10", technical: 22, feasibility: 16 },
  { date: "2024-11-11", technical: 14, feasibility: 12 },
  { date: "2024-11-12", technical: 15, feasibility: 10 },
  { date: "2024-11-13", technical: 28, feasibility: 25 },
  { date: "2024-11-14", technical: 29, feasibility: 22 },
  { date: "2024-11-15", technical: 23, feasibility: 20 },
  { date: "2024-11-16", technical: 32, feasibility: 26 },
  { date: "2024-11-17", technical: 21, feasibility: 18 },
  { date: "2024-11-18", technical: 17, feasibility: 11 },
  { date: "2024-11-19", technical: 13, feasibility: 12 },
  { date: "2024-11-20", technical: 8, feasibility: 7 },
  { date: "2024-11-21", technical: 9, feasibility: 6 },
  { date: "2024-11-22", technical: 18, feasibility: 15 },
  { date: "2024-11-23", technical: 20, feasibility: 13 },
  { date: "2024-11-24", technical: 15, feasibility: 13 },
  { date: "2024-11-25", technical: 16, feasibility: 10 },
  { date: "2024-11-26", technical: 27, feasibility: 24 },
  { date: "2024-11-27", technical: 17, feasibility: 12 },
  { date: "2024-11-28", technical: 7, feasibility: 6 },
  { date: "2024-11-29", technical: 22, feasibility: 16 },
  { date: "2024-11-30", technical: 13, feasibility: 12 },
  { date: "2024-12-01", technical: 14, feasibility: 11 },
  { date: "2024-12-02", technical: 29, feasibility: 23 },
  { date: "2024-12-03", technical: 10, feasibility: 8 },
  { date: "2024-12-04", technical: 28, feasibility: 22 },
  { date: "2024-12-05", technical: 9, feasibility: 7 },
  { date: "2024-12-06", technical: 20, feasibility: 14 },
  { date: "2024-12-07", technical: 22, feasibility: 19 },
  { date: "2024-12-08", technical: 25, feasibility: 18 },
  { date: "2024-12-09", technical: 28, feasibility: 25 },
  { date: "2024-12-10", technical: 12, feasibility: 11 },
  { date: "2024-12-11", technical: 9, feasibility: 8 },
  { date: "2024-12-12", technical: 31, feasibility: 24 },
  { date: "2024-12-13", technical: 8, feasibility: 7 },
  { date: "2024-12-14", technical: 27, feasibility: 21 },
  { date: "2024-12-15", technical: 21, feasibility: 18 },
  { date: "2024-12-16", technical: 24, feasibility: 17 },
  { date: "2024-12-17", technical: 30, feasibility: 27 },
  { date: "2024-12-18", technical: 11, feasibility: 9 },
  { date: "2024-12-19", technical: 23, feasibility: 16 },
  { date: "2024-12-20", technical: 26, feasibility: 24 },
  { date: "2024-12-21", technical: 13, feasibility: 11 },
  { date: "2024-12-22", technical: 21, feasibility: 15 },
  { date: "2024-12-23", technical: 31, feasibility: 28 },
  { date: "2024-12-24", technical: 10, feasibility: 9 },
  { date: "2024-12-25", technical: 11, feasibility: 10 },
  { date: "2024-12-26", technical: 28, feasibility: 21 },
  { date: "2024-12-27", technical: 29, feasibility: 26 },
  { date: "2024-12-28", technical: 12, feasibility: 11 },
  { date: "2024-12-29", technical: 10, feasibility: 8 },
  { date: "2024-12-30", technical: 29, feasibility: 23 },
]

const chartConfig = {
  reports: {
    label: "Reports",
  },
  technical: {
    label: "NI 43-101",
    color: "var(--primary)",
  },
  feasibility: {
    label: "Feasibility Studies",
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
    const referenceDate = new Date("2024-12-30")
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
        <CardTitle data-contextmenu="Mining Reports Published">Mining Reports Published</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block" data-contextmenu="Technical reports and feasibility studies for the last 3 months">
            Technical reports and feasibility studies for the last 3 months
          </span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
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
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
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
              dataKey="feasibility"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--color-feasibility)"
              stackId="a"
            />
            <Area
              dataKey="technical"
              type="natural"
              fill="url(#fillDesktop)"
              stroke="var(--color-technical)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
