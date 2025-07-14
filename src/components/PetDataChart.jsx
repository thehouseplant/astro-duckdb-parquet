"use client"

import { useState, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#8dd1e1", "#d084d0", "#ffb347"]

export default function PetDataChart({ data, loading }) {
  const [chartType, setChartType] = useState("bar")
  const [metric, setMetric] = useState("species")

  // Prepare data for different chart types
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    switch (metric) {
      case "species":
        const speciesCount = data.reduce((acc, row) => {
          const species = row.species || "Unknown"
          acc[species] = (acc[species] || 0) + 1
          return acc
        }, {})
        return Object.entries(speciesCount).map(([species, count]) => ({
          name: species,
          value: count,
          count: count,
        }))

      case "primary_breed":
        const breedCount = data.reduce((acc, row) => {
          const breed = row.primary_breed || "Unknown"
          acc[breed] = (acc[breed] || 0) + 1
          return acc
        }, {})
        return Object.entries(breedCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10) // Top 10 breeds
          .map(([breed, count]) => ({
            name: breed.length > 20 ? breed.substring(0, 20) + "..." : breed,
            value: count,
            count: count,
          }))

      case "zip_code":
        const zipCount = data.reduce((acc, row) => {
          const zip = row.zip_code || "Unknown"
          acc[zip] = (acc[zip] || 0) + 1
          return acc
        }, {})
        return Object.entries(zipCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 15) // Top 15 zip codes
          .map(([zip, count]) => ({
            name: zip,
            value: count,
            count: count,
          }))

      case "issue_year":
        const yearCount = data.reduce((acc, row) => {
          try {
            const year = row.license_issue_date ? new Date(row.license_issue_date).getFullYear() : "Unknown"
            acc[year] = (acc[year] || 0) + 1
            return acc
          } catch {
            acc["Unknown"] = (acc["Unknown"] || 0) + 1
            return acc
          }
        }, {})
        return Object.entries(yearCount)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([year, count]) => ({
            name: year,
            value: count,
            count: count,
          }))

      default:
        return []
    }
  }, [data, metric])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`Count: ${entry.value}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="inline-flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Loading chart data...
          </div>
        </div>
      )
    }

    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No data available for visualization. Try adjusting your search criteria.
        </div>
      )
    }

    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--foreground))" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        )

      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )

      case "area":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
              <YAxis stroke="hsl(var(--foreground))" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  const getChartDescription = () => {
    switch (metric) {
      case "species":
        return "Distribution of pet species in Seattle"
      case "primary_breed":
        return "Top 10 most common primary breeds"
      case "zip_code":
        return "Top 15 ZIP codes with most pet licenses"
      case "issue_year":
        return "Pet license registrations by year"
      default:
        return ""
    }
  }

  return (
    <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h4 className="text-lg font-semibold leading-none tracking-tight">Pet License Data Visualization</h4>
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-w-[180px]"
          >
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="area">Area Chart</option>
          </select>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-w-[180px]"
          >
            <option value="species">Species</option>
            <option value="primary_breed">Primary Breed</option>
            <option value="zip_code">ZIP Code</option>
            <option value="issue_year">Issue Year</option>
          </select>
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="h-[500px] w-full">{renderChart()}</div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>{getChartDescription()}</p>
          {data && !loading && <p>Showing data from {data.length.toLocaleString()} records</p>}
        </div>
      </div>
    </div>
  )
}
