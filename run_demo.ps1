# ALONG Protocol - QuickStart Demo Script
# This script installs dependencies and launches the Pitch Dashboard.

Write-Host "🚀 INITIALIZING ALONG PROTOCOL DEMO..." -ForegroundColor Cyan

# 1. Install Dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
npm install --no-package-lock

# 2. Check for node_modules
if (!(Test-Path "node_modules")) {
    Write-Host "❌ Failed to install dependencies. Please run 'npm install' manually." -ForegroundColor Red
    exit
}

# 3. Launch Vite Dev Server
Write-Host "🔥 IGNITING PITCH DASHBOARD..." -ForegroundColor Green
Write-Host "--------------------------------------------------"
Write-Host "Once the dashboard starts:"
Write-Host "1. Open http://localhost:5173/ in your browser."
Write-Host "2. Click 'RUN PROTOCOL' to demonstrate the War Game."
Write-Host "3. Show 'Dispute Replay' for technical auditability."
Write-Host "--------------------------------------------------"

npm run dev
