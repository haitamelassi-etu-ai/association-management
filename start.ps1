# Kill existing processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "Starting Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "C:\Users\hp\ss\backend\start-backend.ps1"

Start-Sleep -Seconds 3

Write-Host "Starting Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "C:\Users\hp\ss\start-frontend.ps1"

Start-Sleep -Seconds 5

Write-Host "Servers started!" -ForegroundColor Green
Write-Host "Phone URL: http://192.168.1.3:5173/" -ForegroundColor Yellow
Write-Host "Keep both windows open!" -ForegroundColor Red
