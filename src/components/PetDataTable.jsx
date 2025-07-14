"use client"

import { useState, useMemo, useEffect } from "react"
import * as duckdb from "@duckdb/duckdb-wasm"

const PARQUET_URL = "https://pub-e8c2549a621b4395b169873f5aec1b37.r2.dev/seattle_pet_licenses.parquet"

const COLUMN_MAP = {
  license_issue_date: "Issue Date",
  license_number: "Number",
  animal_name: "Name",
  species: "Species",
  primary_breed: "Primary Breed",
  secondary_breed: "Secondary Breed",
  zip_code: "ZIP Code",
}

// Custom replacer function to handle BigInt
const replacer = (key, value) => (typeof value === "bigint" ? value.toString() : value)

export default function PetDataTable() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [db, setDb] = useState(null)

  // Table state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchColumn, setSearchColumn] = useState("animal_name")
  const [sortField, setSortField] = useState(null)
  const [sortDirection, setSortDirection] = useState(null)

  // Initialize DuckDB
  useEffect(() => {
    const initializeDuckDB = async () => {
      try {
        setLoading(true)
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles()
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES)
        const worker_url = URL.createObjectURL(
          new Blob([`importScripts("${bundle.mainWorker}");`], {
            type: "text/javascript",
          }),
        )
        const worker = new Worker(worker_url)
        const logger = new duckdb.ConsoleLogger()
        const database = new duckdb.AsyncDuckDB(logger, worker)
        await database.instantiate(bundle.mainModule, bundle.pthreadWorker)
        URL.revokeObjectURL(worker_url)

        setDb(database)
        await queryData(database) // Load initial data
      } catch (err) {
        console.error("Error initializing DuckDB:", err)
        setError("Failed to initialize database")
        setLoading(false)
      }
    }

    initializeDuckDB()
  }, [])

  // Query data function
  const queryData = async (database = db, search = searchTerm, column = searchColumn) => {
    if (!database) return

    try {
      setLoading(true)
      const c = await database.connect()
      let query

      if (search && column) {
        switch (column) {
          case "license_issue_date":
            query = `SELECT * FROM '${PARQUET_URL}' WHERE "${column}" ILIKE '%${search}%'`
            break
          case "license_number":
            query = `SELECT * FROM '${PARQUET_URL}' WHERE "${column}" = '${search}'`
            break
          case "animal_name":
            query = `SELECT * FROM '${PARQUET_URL}' WHERE "${column}" ILIKE '%${search}%'`
            break
          case "species":
            query = `SELECT * FROM '${PARQUET_URL}' WHERE "${column}" ILIKE '%${search}%'`
            break
          case "primary_breed":
            query = `SELECT * FROM '${PARQUET_URL}' WHERE "${column}" ILIKE '%${search}%'`
            break
          case "secondary_breed":
            query = `SELECT * FROM '${PARQUET_URL}' WHERE "${column}" ILIKE '%${search}%'`
            break
          case "zip_code":
            query = `SELECT * FROM '${PARQUET_URL}' WHERE "${column}" = '${search}'`
            break
          default:
            query = `SELECT * FROM '${PARQUET_URL}'`
        }
      } else {
        query = `SELECT * FROM '${PARQUET_URL}'`
      }

      const result = await c.query(query)
      await c.close()

      const dataArray = result.toArray().map((row) => {
        const jsonRow = row.toJSON()
        // Convert all values using the replacer function
        const processedRow = {}
        Object.keys(jsonRow).forEach((key) => {
          processedRow[key] = replacer(key, jsonRow[key])
        })
        return processedRow
      })

      setData(dataArray)
      setCurrentPage(1) // Reset to first page when data changes
      setError(null)
    } catch (err) {
      console.error("Error querying data:", err)
      setError("Error querying data")
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // Handle search
  const handleSearch = () => {
    queryData(db, searchTerm, searchColumn)
  }

  // Handle Enter key in search input
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  // Get column headers
  const headers = data.length > 0 ? Object.keys(data[0]) : []

  // Filter and sort data (client-side for the loaded subset)
  const filteredAndSortedData = useMemo(() => {
    const filtered = [...data]

    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        const aVal = a[sortField]
        const bVal = b[sortField]

        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal
        }

        return 0
      })
    }

    return filtered
  }, [data, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedData = filteredAndSortedData.slice(startIndex, startIndex + pageSize)

  const handleSort = (field) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortField(null)
        setSortDirection(null)
      } else {
        setSortDirection("asc")
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          ></path>
        </svg>
      )
    }
    if (sortDirection === "asc") {
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
        </svg>
      )
    }
    if (sortDirection === "desc") {
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      )
    }
  }

  const formatCellValue = (value, header) => {
    if (value === null || value === undefined) return "-"

    // Format dates
    if (header === "license_issue_date" && value) {
      try {
        const date = new Date(value)
        return date.toLocaleDateString()
      } catch {
        return value
      }
    }

    return value
  }

  if (error) {
    return (
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div className="p-6">
          <div className="text-center text-red-500">
            <p className="text-lg font-semibold mb-2">Error Loading Data</p>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2 flex-1">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <select
                value={searchColumn}
                onChange={(e) => setSearchColumn(e.target.value)}
                className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[140px]"
              >
                {Object.entries(COLUMN_MAP).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  "Search"
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading pet license data...
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No results found. Try adjusting your search criteria.
            </div>
          ) : (
            <>
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      {headers.map((header) => (
                        <th
                          key={header}
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
                        >
                          <button
                            onClick={() => handleSort(header)}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-auto p-0 font-semibold"
                          >
                            {COLUMN_MAP[header] || header} {getSortIcon(header)}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {paginatedData.map((row, index) => (
                      <tr
                        key={`${row.license_number || index}`}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        {headers.map((header) => (
                          <td key={header} className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                            {formatCellValue(row[header], header)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredAndSortedData.length)} of{" "}
                    {filteredAndSortedData.length} entries
                  </p>
                  <select
                    value={pageSize.toString()}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="flex h-8 w-[70px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  >
                    Next
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
