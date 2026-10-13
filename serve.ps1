param([int]$Port = 8090)

$root = if ($PSScriptRoot) { $PSScriptRoot } else { "c:\Users\AK\Downloads\P1" }

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Output "HTTP server listening at $prefix"
} catch {
    $Port = 8095
    $prefix = "http://localhost:$Port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($prefix)
    $listener.Start()
    Write-Output "HTTP server listening at $prefix"
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".json" = "application/json; charset=utf-8"
    ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath
        if ($path -eq "/log") {
            [System.IO.File]::AppendAllText((Join-Path $root "debug_log.txt"), $request.Url.Query + "`n")
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        # API: Quote Inquiry Submission
        if ($path -eq "/api/quote") {
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
            $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 204
                $response.Close()
                continue
            }

            if ($request.HttpMethod -eq "POST") {
                try {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                    $body = $reader.ReadToEnd()
                    $inquiriesFile = Join-Path $root "quote_inquiries.json"
                    $inquiries = @()
                    if (Test-Path $inquiriesFile) {
                        try {
                            $rawJson = [System.IO.File]::ReadAllText($inquiriesFile, [System.Text.Encoding]::UTF8)
                            $inquiries = ConvertFrom-Json $rawJson
                            if ($inquiries -isnot [System.Collections.IEnumerable] -or $inquiries -is [string]) {
                                $inquiries = @($inquiries)
                            }
                        } catch {
                            $inquiries = @()
                        }
                    }
                    $newInquiry = ConvertFrom-Json $body
                    $newInquiry | Add-Member -NotePropertyName "receivedAt" -NotePropertyValue (Get-Date -Format "o") -Force
                    $inquiries = @($inquiries) + $newInquiry
                    $outJson = ConvertTo-Json $inquiries -Depth 6
                    [System.IO.File]::WriteAllText($inquiriesFile, $outJson, [System.Text.Encoding]::UTF8)

                    # Forward directly to Supabase project gehsytzcfikikzkuzstc
                    try {
                        $sbUrl = "https://gehsytzcfikikzkuzstc.supabase.co/rest/v1/quote_inquiries"
                        $sbKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaHN5dHpjZmlraWt6a3V6c3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzc5ODEsImV4cCI6MjEwNjg1Mzk4MX0.U0iXv6VRBOZbOL2qNHn9j8L6Z5u3-lEQ8SsFYmZVd5I"
                        $headers = @{
                            "apikey" = $sbKey
                            "Authorization" = "Bearer $sbKey"
                            "Content-Type" = "application/json"
                            "Prefer" = "return=minimal"
                        }
                        $sbRecord = @{
                            name = $newInquiry.name
                            email = $newInquiry.email
                            business = $newInquiry.business
                            website = $newInquiry.website
                            project_type = $newInquiry.projectType
                            services = if ($newInquiry.services) { @($newInquiry.services) } else { @() }
                            description = $newInquiry.description
                            package = $newInquiry.package
                            budget = $newInquiry.budget
                            timeline = $newInquiry.timeline
                        }
                        $sbPayload = ConvertTo-Json $sbRecord -Depth 4
                        Invoke-RestMethod -Uri $sbUrl -Method Post -Headers $headers -Body $sbPayload -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null
                    } catch {}

                    $resBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true,"message":"Inquiry received"}')
                    $response.StatusCode = 200
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $resBytes.Length
                    $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                } catch {
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"error":"Unable to save quote"}')
                    $response.StatusCode = 500
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $errBytes.Length
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
                $response.OutputStream.Flush()
                $response.OutputStream.Close()
                $response.Close()
                continue
            }
        }

        if ($path -eq "/" -or [string]::IsNullOrWhiteSpace($path)) {
            $path = "/index.html"
        } elseif ($path -eq "/founder-story" -or $path -eq "/founder-story/") {
            $path = "/founder-story.html"
        } elseif ($path -eq "/services" -or $path -eq "/services/") {
            $path = "/services.html"
        } elseif ($path -eq "/get-quote" -or $path -eq "/get-quote/" -or $path -eq "/quote" -or $path -eq "/quote/") {
            $path = "/get-quote.html"
        }

        $relPath = $path.TrimStart('/').Replace('/', '\')
        $filePath = Join-Path $root $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)

            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.StatusCode = 200

            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        } else {
            $response.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentType = "text/plain"
            $response.ContentLength64 = $err.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($err, 0, $err.Length)
            }
        }
        $response.OutputStream.Flush()
        $response.OutputStream.Close()
        $response.Close()
    } catch {
        # ignore disconnect exceptions
    }
}

