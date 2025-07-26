"use client"

import type React from "react"
import { useState, useCallback } from "react"
import UniversalDataTable from "./UniversalDataTable"
import * as duckdb from "@duckdb/duckdb-wasm"
import type { JSX } from "react/jsx-runtime"

// Type definitions
interface Dataset {
  id: string
  name: string
  description: string
  url: string
  category: string
  size: string
  rows: string
  columns: string
  lastUpdated: string
  tags: string[]
  featured: boolean
}

interface ProcessedFileData {
  name: string
  buffer: Uint8Array
  database: duckdb.AsyncDuckDB
  originalFile: File
  processedAt: string
  metadata: {
    rowCount: number
    columnCount: number
    columns: Array<{ name: string; type: string }>
    sampleData: Record<string, any>[]
  }
}

interface FileValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  fileInfo: {
    name: string
    size: number
    type: string
    lastModified: number
  }
}

const AVAILABLE_DATASETS: Dataset[] = [
  {
    id: "seattle-pets",
    name: "Seattle Pet Licenses",
    description: "Complete dataset of pet licenses issued in Seattle with species, breeds, and location data",
    url: "https://pub-e8c2549a621b4395b169873f5aec1b37.r2.dev/seattle_pet_licenses.parquet",
    category: "Government",
    size: "2.1 MB",
    rows: "53,000+",
    columns: "7",
    lastUpdated: "2024-01-15",
    tags: ["pets", "government", "seattle", "licenses"],
    featured: true,
  },
  {
    id: "nyc-taxi",
    name: "NYC Taxi Data (Sample)",
    description: "New York City yellow taxi trip data with pickup/dropoff locations, fares, and trip details",
    url: "https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-01.parquet",
    category: "Transportation",
    size: "45.2 MB",
    rows: "3M+",
    columns: "19",
    lastUpdated: "2023-02-01",
    tags: ["transportation", "nyc", "taxi", "geospatial"],
    featured: true,
  },
  {
    id: "flight-delays",
    name: "Flight Delays Dataset",
    description: "Historical flight delay data with airline, airport, and delay reason information",
    url: "https://github.com/plotly/datasets/raw/master/2011_february_us_airport_traffic.csv",
    category: "Transportation",
    size: "1.8 MB",
    rows: "45,000+",
    columns: "12",
    lastUpdated: "2023-12-01",
    tags: ["flights", "delays", "airports", "airlines"],
    featured: false,
  },
  {
    id: "covid-data",
    name: "COVID-19 Global Data",
    description: "Global COVID-19 statistics by country with cases, deaths, and vaccination data",
    url: "https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/owid-covid-data.csv",
    category: "Health",
    size: "12.5 MB",
    rows: "200,000+",
    columns: "67",
    lastUpdated: "2024-01-10",
    tags: ["covid", "health", "global", "statistics"],
    featured: false,
  },
]

export default function MultiDatasetViewer(): JSX.Element {
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [showDataViewer, setShowDataViewer] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showFeaturedOnly, setShowFeaturedOnly] = useState<boolean>(false)
  const [customUrl, setCustomUrl] = useState<string>("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [processedFileData, setProcessedFileData] = useState<ProcessedFileData | null>(null)
  const [processing, setProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState<boolean>(false)

  // Get unique categories
  const categories = Array.from(new Set(AVAILABLE_DATASETS.map((d) => d.category))).sort()

  // Filter datasets
  const filteredDatasets = AVAILABLE_DATASETS.filter((dataset) => {
    const matchesSearch =
      dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dataset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dataset.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === "all" || dataset.category === selectedCategory
    const matchesFeatured = !showFeaturedOnly || dataset.featured

    return matchesSearch && matchesCategory && matchesFeatured
  })

  const handleDatasetSelect = useCallback((dataset: Dataset) => {
    setSelectedDataset(dataset)
    setShowDataViewer(true)
    setError(null)
    setProcessedFileData(null)
    setUploadedFile(null)
  }, [])

  const handleCustomUrlLoad = useCallback(async () => {
    if (!customUrl.trim()) return

    try {
      const url = new URL(customUrl.trim())
      if (!url.protocol.startsWith("http")) {
        throw new Error("URL must use HTTP or HTTPS protocol")
      }

      const customDataset: Dataset = {
        id: "custom-url",
        name: "Custom Dataset",
        description: `Dataset loaded from: ${customUrl}`,
        url: customUrl.trim(),
        category: "Custom",
        size: "Unknown",
        rows: "Unknown",
        columns: "Unknown",
        lastUpdated: new Date().toISOString().split("T")[0],
        tags: ["custom", "url"],
        featured: false,
      }

      setSelectedDataset(customDataset)
      setShowDataViewer(true)
      setError(null)
      setProcessedFileData(null)
      setUploadedFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid URL format")
    }
  }, [customUrl])

  const validateFile = useCallback((file: File): FileValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []

    if (!file.name.toLowerCase().endsWith(".parquet")) {
      errors.push("File must have a .parquet extension")
    }

    if (file.size === 0) {
      errors.push("File is empty")
    }

    if (file.size > 100 * 1024 * 1024) {
      errors.push(`File size exceeds 100MB limit`)
    }

    if (file.size > 50 * 1024 * 1024) {
      warnings.push("Large file detected - processing may take longer")
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        lastModified: file.lastModified,
      },
    }
  }, [])

  const handleFileUpload = useCallback(
    async (file: File) => {
      const validation = validateFile(file)
      if (!validation.isValid) {
        setError(validation.errors.join(", "))
        return
      }

      setProcessing(true)
      setError(null)

      try {
        // Initialize DuckDB
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

        // Process file
        const fileArrayBuffer = await file.arrayBuffer()
        const buffer = new Uint8Array(fileArrayBuffer.slice())
        await database.registerFileBuffer(file.name, buffer)

        const conn = await database.connect()

        try {
          // Get metadata
          const schemaQuery = `DESCRIBE SELECT * FROM '${file.name}' LIMIT 1`
          const schemaResult = await conn.query(schemaQuery)
          const columns = schemaResult.toArray().map((row) => {
            const data = row.toJSON()
            return {
              name: data.column_name as string,
              type: data.column_type as string,
            }
          })

          const countQuery = `SELECT COUNT(*) as row_count FROM '${file.name}'`
          const countResult = await conn.query(countQuery)
          const rowCount = countResult.toArray()[0].toJSON().row_count as number

          const sampleQuery = `SELECT * FROM '${file.name}' LIMIT 10`
          const sampleResult = await conn.query(sampleQuery)
          const sampleData = sampleResult.toArray().map((row) => {
            const jsonRow = row.toJSON()
            const processedRow: Record<string, any> = {}
            Object.keys(jsonRow).forEach((key) => {
              const value = jsonRow[key]
              processedRow[key] = typeof value === "bigint" ? value.toString() : value
            })
            return processedRow
          })

          const fileData: ProcessedFileData = {
            name: file.name,
            buffer: buffer,
            database: database,
            originalFile: file,
            processedAt: new Date().toISOString(),
            metadata: {
              rowCount,
              columnCount: columns.length,
              columns,
              sampleData,
            },
          }

          setProcessedFileData(fileData)
          setUploadedFile(file)

          const uploadedDataset: Dataset = {
            id: "uploaded-file",
            name: file.name,
            description: `Uploaded file: ${file.name}`,
            url: `local://${file.name}`,
            category: "Uploaded",
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            rows: rowCount.toLocaleString(),
            columns: columns.length.toString(),
            lastUpdated: new Date().toISOString().split("T")[0],
            tags: ["uploaded", "local"],
            featured: false,
          }

          setSelectedDataset(uploadedDataset)
          setShowDataViewer(true)
        } finally {
          await conn.close()
        }
      } catch (err) {
        console.error("Error processing file:", err)
        setError(err instanceof Error ? err.message : "Failed to process file")
      } finally {
        setProcessing(false)
      }
    },
    [validateFile],
  )

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0]
        handleFileUpload(file)
      }
    },
    [handleFileUpload],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
        handleFileUpload(file)
      }
    },
    [handleFileUpload],
  )

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (showDataViewer && selectedDataset) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{selectedDataset.name}</h2>
            <p className="text-muted-foreground">{selectedDataset.description}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>Category: {selectedDataset.category}</span>
              <span>Size: {selectedDataset.size}</span>
              <span>Rows: {selectedDataset.rows}</span>
              <span>Columns: {selectedDataset.columns}</span>
            </div>
          </div>
          <button
            onClick={() => {
              setShowDataViewer(false)
              setSelectedDataset(null)
              setError(null)
            }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            ← Back to Datasets
          </button>
        </div>

        <UniversalDataTable
          parquetUrl={selectedDataset.url}
          title={selectedDataset.name}
          showMetrics={selectedDataset.id === "seattle-pets"}
          processedFileData={processedFileData}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search datasets by name, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[140px]"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showFeaturedOnly}
                  onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                  className="rounded border-input"
                />
                Featured only
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-xl font-semibold leading-none tracking-tight">Upload Your Own Dataset</h3>
          <p className="text-sm text-muted-foreground">Upload a parquet file or load from URL</p>
        </div>
        <div className="p-6 pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File Upload */}
            <div>
              <h4 className="font-medium mb-3">Upload File</h4>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <svg
                  className="h-8 w-8 mx-auto mb-2 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  ></path>
                </svg>
                <p className="text-sm font-medium mb-1">Drop parquet file here</p>
                <p className="text-xs text-muted-foreground mb-3">or click to browse</p>
                <input type="file" accept=".parquet" onChange={handleFileInput} className="hidden" id="file-upload" />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 cursor-pointer"
                >
                  Choose File
                </label>
              </div>
            </div>

            {/* URL Input */}
            <div>
              <h4 className="font-medium mb-3">Load from URL</h4>
              <div className="space-y-3">
                <input
                  type="url"
                  placeholder="https://example.com/data.parquet"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  onClick={handleCustomUrlLoad}
                  disabled={!customUrl.trim() || processing}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                >
                  Load Dataset
                </button>
              </div>
            </div>
          </div>

          {/* Processing Status */}
          {processing && (
            <div className="mt-4 p-3 rounded-lg border bg-blue-50 dark:bg-blue-950">
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="text-sm">Processing file...</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Available Datasets */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-xl font-semibold leading-none tracking-tight">Available Datasets</h3>
          <p className="text-sm text-muted-foreground">
            Choose from our curated collection of datasets ({filteredDatasets.length} available)
          </p>
        </div>
        <div className="p-6 pt-0">
          {filteredDatasets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No datasets match your current filters.</p>
              <button
                onClick={() => {
                  setSearchTerm("")
                  setSelectedCategory("all")
                  setShowFeaturedOnly(false)
                }}
                className="mt-2 text-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredDatasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors relative"
                >
                  {dataset.featured && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                        Featured
                      </span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-lg">{dataset.name}</h4>
                      <p className="text-sm text-muted-foreground">{dataset.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Category:</span> {dataset.category}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span> {dataset.size}
                      </div>
                      <div>
                        <span className="font-medium">Rows:</span> {dataset.rows}
                      </div>
                      <div>
                        <span className="font-medium">Columns:</span> {dataset.columns}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {dataset.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        Updated: {new Date(dataset.lastUpdated).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDatasetSelect(dataset)}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
                      >
                        Explore Dataset
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
