# Kindling Portal - Firebase Setup Helper

Write-Host "🔥 Kindling Portal - Firebase Setup" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencies installed!`n" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencies already installed`n" -ForegroundColor Green
}

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  No .env file found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your Firebase credentials.`n" -ForegroundColor Yellow
    exit 1
}

# Check if Firebase credentials are configured
$envContent = Get-Content ".env" -Raw
if ($envContent -match "GOOGLE_APPLICATION_CREDENTIALS" -or $envContent -match "FIREBASE_SERVICE_ACCOUNT") {
    Write-Host "✅ Firebase credentials found in .env`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  Firebase credentials not configured in .env!" -ForegroundColor Red
    Write-Host "Please add GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT to .env`n" -ForegroundColor Yellow
    Write-Host "See FIREBASE_SETUP.md for detailed instructions.`n" -ForegroundColor Cyan
    exit 1
}

# Ask user what to do
Write-Host "What would you like to do?" -ForegroundColor Cyan
Write-Host "  1. Seed the database (first time setup)" -ForegroundColor White
Write-Host "  2. Start the development server" -ForegroundColor White
Write-Host "  3. Seed database AND start server" -ForegroundColor White
Write-Host "  4. Exit`n" -ForegroundColor White

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host "`n🌱 Seeding database..." -ForegroundColor Yellow
        npm run seed
    }
    "2" {
        Write-Host "`n🚀 Starting development server..." -ForegroundColor Yellow
        npm run dev
    }
    "3" {
        Write-Host "`n🌱 Seeding database..." -ForegroundColor Yellow
        npm run seed
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n🚀 Starting development server..." -ForegroundColor Yellow
            npm run dev
        }
    }
    "4" {
        Write-Host "`nGoodbye! 👋" -ForegroundColor Cyan
        exit 0
    }
    default {
        Write-Host "`n❌ Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}
