"use client"

import { useMemo } from "react"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"

export default function TrendChart({ data, loading }) {
  const trendData = useMemo(() => {
    if (!data || data.length === 0) return []

    const currentYear = new Date().getFullYear()
    const yearlyData = data.reduce((acc, pet) => {
      try {
        const year = new Date(pet.license_issue_date).getFullYear()
        if (year >= 2015 && year <= currentYear) {
          acc[year] = (acc[year] || 0) + 1
        }
      } catch {
        // Skip invalid dates
      }
      return acc
    }, {})

    return Object.entries(yearlyData)
      .sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b))
      .map(([year, count]) => ({ year: Number.parseInt(year), registrations: count }))
  }, [data])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{`Year: ${label}`}</p>
          <p style={{ color: payload[0].color }}>{`Registrations: ${payload[0].value.toLocaleString()}`}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm mb-8">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (trendData.length === 0) {
    return null
  }

  return (
    <div className="bg-card text-card-foreground rounded-lg border shadow-sm mb-8">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-xl font-semibold leading-none tracking-tight">Registration Trends Over Time</h3>
        <p className="text-sm text-muted-foreground">
          Pet license registrations by year showing growth patterns and seasonal trends
        </p>
      </div>
      <div className="p-6 pt-0">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="registrations"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="font-semibold text-lg">
              {trendData.length > 0 ? Math.max(...trendData.map((d) => d.registrations)).toLocaleString() : 0}
            </p>
            <p className="text-muted-foreground">Peak Year</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg">
              {trendData.length > 0
                ? Math.round(trendData.reduce((sum, d) => sum + d.registrations, 0) / trendData.length).toLocaleString()
                : 0}
            </p>
            <p className="text-muted-foreground">Average per Year</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg">
              {trendData.reduce((sum, d) => sum + d.registrations, 0).toLocaleString()}
            </p>
            <p className="text-muted-foreground">Total Registrations</p>
          </div>
        </div>
      </div>
    </div>
  )
}
