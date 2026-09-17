Add-Type -AssemblyName System.Drawing
$src = "C:\Users\nisha\Downloads\ChatGPT Image Sep 18, 2026, 01_06_52 AM.png"
$dest = "C:\Users\nisha\Downloads\mailflow_icon_1024.png"
$img = [System.Drawing.Image]::FromFile($src)
$resized = New-Object System.Drawing.Bitmap 1024, 1024
$g = [System.Drawing.Graphics]::FromImage($resized)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 1024, 1024)
$resized.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$resized.Dispose()
$img.Dispose()
Write-Host "Success: $dest created, size:" (Get-Item $dest).Length
