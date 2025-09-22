param(
  [string]$BaseUrl = "http://localhost:3001",
  [string]$Device = "PE-TEST-FALLBACK"
)

# 1) Post telemetry with GPS
# Use Int64 milliseconds timestamp
$ts = [Int64]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
$body = @{ device=$Device; ts=$ts; soc=60; gps=@{ lat=30.5728; lng=104.0668; speed=0 } }
$json = $body | ConvertTo-Json -Depth 5
$resp1 = Invoke-RestMethod -Method POST -Uri "$BaseUrl/api/telemetry" -ContentType 'application/json' -Body $json
Write-Host "POST telemetry =>" ($resp1 | ConvertTo-Json -Depth 10)

Start-Sleep -Milliseconds 400

# 2) Get tracking latest (should work even if tracking:latest not written)
$trkUrl = "$BaseUrl/api/tracking?device=$Device&type=latest"
$trk = Invoke-RestMethod -Uri $trkUrl
Write-Host "GET tracking latest =>" ($trk | ConvertTo-Json -Depth 10)

# 3) Get telemetry latest
$telUrl = "$BaseUrl/api/telemetry?device=$Device&latest=1"
$tel = Invoke-RestMethod -Uri $telUrl
Write-Host "GET telemetry latest =>" ($tel | ConvertTo-Json -Depth 10)

# Quick assertion
$hasGps = ($trk.point -ne $null) -and ($trk.point.lat -ne $null) -and ($trk.point.lng -ne $null)
Write-Host "Has GPS from tracking latest:" $hasGps