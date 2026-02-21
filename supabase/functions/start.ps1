# Quick Start Script for Python Backend
# Run this to start the development server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Python Backend - Starting Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-Not (Test-Path "..\..\..env")) {
    Write-Host "⚠️  WARNING: No .env file found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please create a .env file in the project root with:" -ForegroundColor Yellow
    Write-Host "  AZURE_AGENT_KEY=your_key" -ForegroundColor Gray
    Write-Host "  AZURE_AGENT_ENDPOINT=your_endpoint" -ForegroundColor Gray
    Write-Host "  AZURE_MAPS_KEY=your_key" -ForegroundColor Gray
    Write-Host "  AZURE_WHISPER_API_KEY=your_key" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can copy .env.example to .env and fill in your keys" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue without .env file? (y/n)"
    if ($continue -ne "y") {
        exit
    }
}

Write-Host "✓ Starting Python development server..." -ForegroundColor Green
Write-Host ""
Write-Host "Server will be available at:" -ForegroundColor White
Write-Host "  http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Endpoints:" -ForegroundColor White
Write-Host "  • POST http://localhost:8000/analyze-insights" -ForegroundColor Gray
Write-Host "  • POST http://localhost:8000/nearby-hospitals" -ForegroundColor Gray
Write-Host "  • POST http://localhost:8000/transcribe" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start the server
python dev_server.py
