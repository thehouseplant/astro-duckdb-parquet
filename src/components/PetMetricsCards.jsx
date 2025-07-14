"use client"

import { useMemo } from "react"

export default function PetMetricsCards({ data, loading }) {
  const metrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalPets: 0,
        speciesBreakdown: {},
        topBreed: { name: "N/A", count: 0 },
        topZipCode: { code: "N/A", count: 0 },
        recentRegistrations: 0,
        avgPetsPerZip: 0,
        yearlyTrends: [],
        breedDiversity: 0,
      }
    }

    // Total pets
    const totalPets = data.length

    // Species breakdown
    const speciesBreakdown = data.reduce((acc, pet) => {
      const species = pet.species || "Unknown"
      acc[species] = (acc[species] || 0) + 1
      return acc
    }, {})

    // Top breed
    const breedCounts = data.reduce((acc, pet) => {
      const breed = pet.primary_breed || "Unknown"
      acc[breed] = (acc[breed] || 0) + 1
      return acc
    }, {})
    const topBreed = Object.entries(breedCounts).reduce(
      (max, [breed, count]) => (count > max.count ? { name: breed, count } : max),
      { name: "N/A", count: 0 },
    )

    // Top ZIP code
    const zipCounts = data.reduce((acc, pet) => {
      const zip = pet.zip_code || "Unknown"
      acc[zip] = (acc[zip] || 0) + 1
      return acc
    }, {})
    const topZipCode = Object.entries(zipCounts).reduce(
      (max, [code, count]) => (count > max.count ? { code, count } : max),
      { code: "N/A", count: 0 },
    )

    // Recent registrations (last 2 years)
    const currentYear = new Date().getFullYear()
    const recentRegistrations = data.filter((pet) => {
      try {
        const issueYear = new Date(pet.license_issue_date).getFullYear()
        return issueYear >= currentYear - 1
      } catch {
        return false
      }
    }).length

    // Average pets per ZIP code
    const uniqueZips = Object.keys(zipCounts).filter((zip) => zip !== "Unknown").length
    const avgPetsPerZip = uniqueZips > 0 ? Math.round(totalPets / uniqueZips) : 0

    // Yearly trends
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

    const yearlyTrends = Object.entries(yearlyData)
      .sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b))
      .map(([year, count]) => ({ year: Number.parseInt(year), count }))

    // Breed diversity (unique breeds)
    const breedDiversity = Object.keys(breedCounts).filter((breed) => breed !== "Unknown").length

    return {
      totalPets,
      speciesBreakdown,
      topBreed,
      topZipCode,
      recentRegistrations,
      avgPetsPerZip,
      yearlyTrends,
      breedDiversity,
    }
  }, [data])

  const getTrendDirection = () => {
    if (metrics.yearlyTrends.length < 2) return "stable"
    const recent = metrics.yearlyTrends.slice(-2)
    if (recent[1].count > recent[0].count) return "up"
    if (recent[1].count < recent[0].count) return "down"
    return "stable"
  }

  const getTrendPercentage = () => {
    if (metrics.yearlyTrends.length < 2) return 0
    const recent = metrics.yearlyTrends.slice(-2)
    const change = ((recent[1].count - recent[0].count) / recent[0].count) * 100
    return Math.abs(change).toFixed(1)
  }

  const getSpeciesPercentage = (species) => {
    if (metrics.totalPets === 0) return 0
    return (((metrics.speciesBreakdown[species] || 0) / metrics.totalPets) * 100).toFixed(1)
  }

  const trendDirection = getTrendDirection()
  const trendPercentage = getTrendPercentage()

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Pets */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Pets</p>
            <p className="text-3xl font-bold">{metrics.totalPets.toLocaleString()}</p>
          </div>
          <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <svg
              className="h-6 w-6 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              ></path>
            </svg>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Licensed pets in Seattle</p>
      </div>

      {/* Dogs vs Cats */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">Dogs vs Cats</p>
          <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <svg
              className="h-6 w-6 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              ></path>
            </svg>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Dogs</span>
            <span className="text-sm font-medium">{getSpeciesPercentage("Dog")}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${getSpeciesPercentage("Dog")}%` }}></div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Cats</span>
            <span className="text-sm font-medium">{getSpeciesPercentage("Cat")}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${getSpeciesPercentage("Cat")}%` }}></div>
          </div>
        </div>
      </div>

      {/* Top Breed */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Most Popular Breed</p>
            <p className="text-lg font-bold truncate">{metrics.topBreed.name}</p>
            <p className="text-2xl font-bold text-primary">{metrics.topBreed.count.toLocaleString()}</p>
          </div>
          <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <svg
              className="h-6 w-6 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              ></path>
            </svg>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">registrations</p>
      </div>

      {/* Registration Trend */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Registration Trend</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{trendPercentage}%</p>
              {trendDirection === "up" && (
                <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 17l9.2-9.2M17 17V7m0 10H7"
                  ></path>
                </svg>
              )}
              {trendDirection === "down" && (
                <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 7l-9.2 9.2M7 7v10m0-10h10"
                  ></path>
                </svg>
              )}
              {trendDirection === "stable" && (
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                </svg>
              )}
            </div>
          </div>
          <div
            className={`h-12 w-12 rounded-lg flex items-center justify-center ${
              trendDirection === "up"
                ? "bg-green-100 dark:bg-green-900"
                : trendDirection === "down"
                  ? "bg-red-100 dark:bg-red-900"
                  : "bg-gray-100 dark:bg-gray-900"
            }`}
          >
            <svg
              className={`h-6 w-6 ${
                trendDirection === "up"
                  ? "text-green-600 dark:text-green-400"
                  : trendDirection === "down"
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-600 dark:text-gray-400"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              ></path>
            </svg>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Year-over-year change</p>
      </div>

      {/* Recent Registrations */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Recent Registrations</p>
            <p className="text-3xl font-bold">{metrics.recentRegistrations.toLocaleString()}</p>
          </div>
          <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
            <svg
              className="h-6 w-6 text-indigo-600 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Last 2 years</p>
      </div>

      {/* Top ZIP Code */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Top ZIP Code</p>
            <p className="text-2xl font-bold">{metrics.topZipCode.code}</p>
            <p className="text-lg text-muted-foreground">{metrics.topZipCode.count.toLocaleString()} pets</p>
          </div>
          <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
            <svg
              className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              ></path>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              ></path>
            </svg>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Highest concentration</p>
      </div>

      {/* Breed Diversity */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Breed Diversity</p>
            <p className="text-3xl font-bold">{metrics.breedDiversity}</p>
          </div>
          <div className="h-12 w-12 bg-teal-100 dark:bg-teal-900 rounded-lg flex items-center justify-center">
            <svg
              className="h-6 w-6 text-teal-600 dark:text-teal-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              ></path>
            </svg>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Unique breeds registered</p>
      </div>

      {/* Average Pets per ZIP */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Avg Pets per ZIP</p>
            <p className="text-3xl font-bold">{metrics.avgPetsPerZip}</p>
          </div>
          <div className="h-12 w-12 bg-pink-100 dark:bg-pink-900 rounded-lg flex items-center justify-center">
            <svg
              className="h-6 w-6 text-pink-600 dark:text-pink-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              ></path>
            </svg>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Distribution density</p>
      </div>
    </div>
  )
}
