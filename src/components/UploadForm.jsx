"use client"

import { useState } from "react"
import UniversalDataTable from "./UniversalDataTable.jsx"
import * as duckdb from "@duckdb/duckdb-wasm"

export default function UploadForm() {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [parquetUrl, setParquetUrl] = useState("")
  const [customUrl, setCustomUrl] = useState("")
  const [showData, setShowData] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processStatus, setProcessStatus] = useState("")
  const [processedFileData, setProcessedFileData] = useState(null)

  // Predefined datasets
  const predefinedDatasets = [
    {
      name: "Seattle Pet Licenses",
      url: "https://pub-e8c2549a621b4395b169873f5aec1b37.r2.dev/seattle_pet_licenses.parquet",
      description: "Complete dataset of pet licenses issued in Seattle",
    },
  ]

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.name.endsWith(".parquet")) {
        setUploadedFile(file)
      }
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.name.endsWith(".parquet")) {
        setUploadedFile(file)
      }
    }
  }

  const handleLoadDataset = (url, name) => {
    setParquetUrl(url)
    setShowData(true)
    setUploadedFile(null)
    setProcessedFileData(null)
  }

  const handleLoadCustomUrl = () => {
    if (customUrl.trim()) {
      setParquetUrl(customUrl.trim())
      setShowData(true)
      setUploadedFile(null)
      setProcessedFileData(null)
    }
  }

  const handleProcessFile = async () => {
    if (!uploadedFile) {
      setProcessStatus("No file selected")
      return
    }

    setProcessing(true)
    setProcessStatus("Initializing DuckDB...")

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

      setProcessStatus("Reading file into memory...")

      // Read the file into a buffer
      const buffer = await uploadedFile.arrayBuffer()

      setProcessStatus("Registering file with DuckDB...")

      // Register the file buffer with DuckDB
      await database.registerFileBuffer(uploadedFile.name, new Uint8Array(buffer))

      setProcessStatus("Processing file and testing query...")

      // Test the file by running a simple query
      const conn = await database.connect()
      const testQuery = `SELECT * FROM '${uploadedFile.name}' LIMIT 1`
      const testResult = await conn.query(testQuery)

      if (testResult.numRows === 0) {
        // Try to get schema info even if no rows
        const schemaQuery = `DESCRIBE SELECT * FROM '${uploadedFile.name}' LIMIT 1`
        const schemaResult = await conn.query(schemaQuery)
        if (schemaResult.numRows === 0) {
          throw new Error("File appears to be empty or invalid")
        }
      }

      await conn.close()

      setProcessStatus("File processed successfully!")

      // Store the processed file data
      const fileData = {
        name: uploadedFile.name,
        buffer: new Uint8Array(buffer),
        database: database,
        originalFile: uploadedFile,
      }

      setProcessedFileData(fileData)
      setParquetUrl(`local://${uploadedFile.name}`)
      setShowData(true)
      setProcessStatus("")
    } catch (error) {
      console.error("Error processing file:", error)
      setProcessStatus(`Error processing file: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  if (showData && parquetUrl) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Dataset Viewer</h2>
            <p className="text-muted-foreground">
              Viewing: {parquetUrl.startsWith("local://") ? uploadedFile?.name || "Local file" : parquetUrl}
            </p>
          </div>
          <button
            onClick={() => {
              setShowData(false)
              setParquetUrl("")
              setProcessStatus("")
              setProcessedFileData(null)
            }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            ← Back to Upload
          </button>
        </div>

        <UniversalDataTable
          parquetUrl={parquetUrl}
          title="Parquet Dataset"
          showMetrics={parquetUrl.includes("seattle_pet_licenses")}
          processedFileData={processedFileData}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Upload Parquet File</h3>
          <p className="text-sm text-muted-foreground">
            Upload your own parquet file or try one of our sample datasets
          </p>
        </div>
        <div className="p-6 pt-0">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <svg
              className="h-12 w-12 mx-auto mb-4 text-muted-foreground"
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
            <h3 className="text-lg font-semibold mb-2">Drop your parquet file here</h3>
            <p className="text-muted-foreground mb-4">or click to browse files</p>
            <input type="file" accept=".parquet" onChange={handleFileInput} className="hidden" id="file-upload" />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer"
            >
              Choose File
            </label>
          </div>

          {uploadedFile && (
            <div className="mt-6">
              <div className="border border-border rounded-lg p-4 bg-background">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  <div>
                    <strong>File selected:</strong> {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)}{" "}
                    MB)
                  </div>
                </div>
              </div>

              {/* Processing Status */}
              {processStatus && (
                <div className="mt-4 p-4 rounded-lg border">
                  <div className="flex items-center gap-2">
                    {processing && (
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
                    )}
                    <span
                      className={
                        processing
                          ? "text-blue-600"
                          : processStatus.includes("Error")
                            ? "text-red-600"
                            : "text-green-600"
                      }
                    >
                      {processStatus}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleProcessFile}
                  disabled={processing}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  {processing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
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
                      Processing...
                    </>
                  ) : (
                    "Process File"
                  )}
                </button>
                <button
                  onClick={() => {
                    setUploadedFile(null)
                    setProcessStatus("")
                    setProcessedFileData(null)
                  }}
                  disabled={processing}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom URL Section */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-xl font-semibold leading-none tracking-tight">Load from URL</h3>
          <p className="text-sm text-muted-foreground">Enter a direct URL to a parquet file</p>
        </div>
        <div className="p-6 pt-0">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/data.parquet"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              onClick={handleLoadCustomUrl}
              disabled={!customUrl.trim()}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Load Data
            </button>
          </div>
        </div>
      </div>

      {/* Predefined Datasets */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-xl font-semibold leading-none tracking-tight">Sample Datasets</h3>
          <p className="text-sm text-muted-foreground">Try these sample datasets to explore the functionality</p>
        </div>
        <div className="p-6 pt-0">
          <div className="grid gap-4">
            {predefinedDatasets.map((dataset, index) => (
              <div key={index} className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{dataset.name}</h4>
                    <p className="text-sm text-muted-foreground">{dataset.description}</p>
                  </div>
                  <button
                    onClick={() => handleLoadDataset(dataset.url, dataset.name)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
                  >
                    Load Dataset
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="border border-border rounded-lg p-4 bg-background">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <div>
            <strong>How it works:</strong> Upload a Parquet file to process it locally in your browser using DuckDB
            WebAssembly. Your data never leaves your device and is processed entirely client-side.
          </div>
        </div>
      </div>
    </div>
  )
}
