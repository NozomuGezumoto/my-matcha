<#
.SYNOPSIS
    Fetch Japan OSM data and extract sushi restaurants to GeoJSON.

.DESCRIPTION
    This script:
    1. Downloads Japan PBF from Geofabrik (if not present)
    2. Filters the PBF to reduce size (only sushi-related tags)
    3. Runs Python extraction to generate GeoJSON

.PARAMETER Pref
    Optional prefecture filter (e.g., "tokyo", "osaka")

.PARAMETER SkipDownload
    Skip downloading PBF (use existing file)

.PARAMETER TestMode
    Run in test mode (Tokyo only, faster)

.EXAMPLE
    .\fetch_and_extract_sushi.ps1
    # Full Japan extraction

.EXAMPLE
    .\fetch_and_extract_sushi.ps1 -Pref tokyo
    # Extract only Tokyo

.EXAMPLE
    .\fetch_and_extract_sushi.ps1 -TestMode
    # Test mode (Tokyo only)
#>

param(
    [string]$Pref = "",
    [switch]$SkipDownload,
    [switch]$TestMode
)

$ErrorActionPreference = "Stop"

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$DataRaw = Join-Path $ProjectRoot "data\raw"
$DataOut = Join-Path $ProjectRoot "data\out"

$JapanPbfUrl = "https://download.geofabrik.de/asia/japan-latest.osm.pbf"
$JapanPbf = Join-Path $DataRaw "japan-latest.osm.pbf"
$FilteredPbf = Join-Path $DataRaw "japan-sushi-filtered.osm.pbf"

# For test mode, use Kanto region (includes Tokyo, smaller file)
$KantoPbfUrl = "https://download.geofabrik.de/asia/japan/kanto-latest.osm.pbf"
$KantoPbf = Join-Path $DataRaw "kanto-latest.osm.pbf"

function Write-Status {
    param([string]$Message)
    Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] ERROR: $Message" -ForegroundColor Red
}

# Check for required tools
function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    # Check osmium
    try {
        $osmiumVersion = & osmium --version 2>&1
        Write-Host "  osmium: $($osmiumVersion[0])"
    }
    catch {
        Write-Error "osmium-tool not found. Please install via conda:"
        Write-Host "  conda install -c conda-forge osmium-tool"
        exit 1
    }
    
    # Check Python and osmium module
    try {
        $pythonVersion = & python --version 2>&1
        Write-Host "  Python: $pythonVersion"
        
        & python -c "import osmium" 2>&1 | Out-Null
        Write-Host "  Python osmium: OK"
    }
    catch {
        Write-Error "Python or osmium module not found. Please install:"
        Write-Host "  pip install osmium shapely"
        exit 1
    }
    
    Write-Success "Prerequisites OK"
}

# Download PBF file
function Get-PbfFile {
    param(
        [string]$Url,
        [string]$OutputPath
    )
    
    if (Test-Path $OutputPath) {
        $size = (Get-Item $OutputPath).Length / 1MB
        Write-Status "PBF already exists: $OutputPath ($([Math]::Round($size, 1)) MB)"
        return
    }
    
    Write-Status "Downloading PBF from $Url..."
    Write-Host "  This may take a while for large files..."
    
    try {
        # Use BITS for better download experience on Windows
        $job = Start-BitsTransfer -Source $Url -Destination $OutputPath -Description "Downloading OSM PBF" -ErrorAction Stop
        Write-Success "Download complete!"
    }
    catch {
        Write-Status "BITS transfer failed, trying Invoke-WebRequest..."
        try {
            Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UseBasicParsing
            Write-Success "Download complete!"
        }
        catch {
            Write-Error "Failed to download PBF: $_"
            exit 1
        }
    }
}

# Filter PBF to reduce size
function Invoke-OsmiumFilter {
    param(
        [string]$InputPbf,
        [string]$OutputPbf
    )
    
    Write-Status "Filtering PBF with osmium (keeping only potential sushi shops)..."
    
    # Tag filter expression for sushi-related features
    # This keeps: restaurants, fast_food, seafood shops
    $tagFilter = @(
        "nwr/amenity=restaurant",
        "nwr/amenity=fast_food", 
        "nwr/shop=seafood"
    )
    
    $filterArgs = @(
        "tags-filter",
        $InputPbf,
        "-o", $OutputPbf,
        "--overwrite"
    ) + $tagFilter
    
    try {
        & osmium @filterArgs
        
        if (Test-Path $OutputPbf) {
            $size = (Get-Item $OutputPbf).Length / 1MB
            Write-Success "Filtered PBF created: $([Math]::Round($size, 1)) MB"
        }
    }
    catch {
        Write-Error "Osmium filtering failed: $_"
        exit 1
    }
}

# Run Python extraction
function Invoke-PythonExtraction {
    param(
        [string]$InputPbf,
        [string]$OutputGeoJson,
        [string]$PrefFilter = ""
    )
    
    Write-Status "Running Python extraction..."
    
    $pythonScript = Join-Path $ScriptDir "extract_sushi.py"
    
    $pythonArgs = @(
        $pythonScript,
        $InputPbf,
        $OutputGeoJson
    )
    
    if ($PrefFilter) {
        $pythonArgs += @("--pref", $PrefFilter)
    }
    
    try {
        & python @pythonArgs
        
        if (Test-Path $OutputGeoJson) {
            $size = (Get-Item $OutputGeoJson).Length / 1KB
            Write-Success "GeoJSON created: $([Math]::Round($size, 1)) KB"
        }
    }
    catch {
        Write-Error "Python extraction failed: $_"
        exit 1
    }
}

# Main execution
function Main {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host " Sushi Restaurant Extractor for Japan" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    
    # Set mode
    $effectivePref = $Pref
    if ($TestMode) {
        Write-Status "Running in TEST MODE (Tokyo only)"
        $effectivePref = "tokyo"
    }
    
    # Check prerequisites
    Test-Prerequisites
    
    # Ensure directories exist
    if (-not (Test-Path $DataRaw)) { New-Item -ItemType Directory -Path $DataRaw -Force | Out-Null }
    if (-not (Test-Path $DataOut)) { New-Item -ItemType Directory -Path $DataOut -Force | Out-Null }
    
    # Determine which PBF to use
    if ($TestMode) {
        $sourcePbf = $KantoPbf
        $sourceUrl = $KantoPbfUrl
    }
    else {
        $sourcePbf = $JapanPbf
        $sourceUrl = $JapanPbfUrl
    }
    
    # Download PBF
    if (-not $SkipDownload) {
        Get-PbfFile -Url $sourceUrl -OutputPath $sourcePbf
    }
    
    if (-not (Test-Path $sourcePbf)) {
        Write-Error "PBF file not found: $sourcePbf"
        exit 1
    }
    
    # Filter PBF (optional but recommended for large files)
    $filteredPbf = $sourcePbf -replace "\.osm\.pbf$", "-filtered.osm.pbf"
    Invoke-OsmiumFilter -InputPbf $sourcePbf -OutputPbf $filteredPbf
    
    # Determine output filename
    if ($effectivePref) {
        $outputGeoJson = Join-Path $DataOut "sushi_$effectivePref.geojson"
    }
    else {
        $outputGeoJson = Join-Path $DataOut "sushi_japan.geojson"
    }
    
    # Run extraction
    Invoke-PythonExtraction -InputPbf $filteredPbf -OutputGeoJson $outputGeoJson -PrefFilter $effectivePref
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Extraction Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Output: $outputGeoJson"
    
    # Show feature count
    if (Test-Path $outputGeoJson) {
        $content = Get-Content $outputGeoJson -Raw | ConvertFrom-Json
        $count = $content.features.Count
        Write-Host "Total sushi restaurants: $count" -ForegroundColor Cyan
    }
}

# Run main
Main
