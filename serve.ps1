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

try { Add-Type -AssemblyName System.Web -ErrorAction SilentlyContinue } catch {}

function Get-UrlQueryDict($queryString) {
    $dict = @{}
    if ([string]::IsNullOrWhiteSpace($queryString)) { return $dict }
    $qs = $queryString.TrimStart('?')
    $pairs = $qs.Split('&')
    foreach ($pair in $pairs) {
        if ([string]::IsNullOrWhiteSpace($pair)) { continue }
        $parts = $pair.Split('=')
        if ($parts.Length -ge 1) {
            $k = [System.Uri]::UnescapeDataString($parts[0])
            $v = if ($parts.Length -ge 2) { [System.Uri]::UnescapeDataString($parts[1]) } else { "" }
            $dict[$k] = $v
        }
    }
    return $dict
}

function Read-OrdersJson($filePath) {
    if (-not (Test-Path $filePath)) { return @() }
    try {
        $content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
        if ([string]::IsNullOrWhiteSpace($content)) { return @() }
        $data = ConvertFrom-Json $content
        $items = @()
        if ($data -is [System.Collections.IEnumerable] -and $data -isnot [string]) {
            foreach ($it in $data) {
                if ($it.PSObject.Properties['id']) { $items += $it }
            }
        } elseif ($data.PSObject.Properties['id']) {
            $items += $data
        }
        return $items
    } catch {
        return @()
    }
}

function Write-OrdersJson($filePath, $ordersArray) {
    $cleanList = @($ordersArray)
    $json = ConvertTo-Json -InputObject $cleanList -Depth 6
    [System.IO.File]::WriteAllText($filePath, $json, [System.Text.Encoding]::UTF8)
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".webp" = "image/webp"
    ".avif" = "image/avif"
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

        # API: Order Management (/api/order)
        if ($path -eq "/api/order") {
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 204
                $response.Close()
                continue
            }

            $ordersFile = Join-Path $root "orders.json"
            $orders = Read-OrdersJson $ordersFile

            if ($request.HttpMethod -eq "GET") {
                $query = Get-UrlQueryDict $request.Url.Query
                $orderId = if ($query.ContainsKey("id")) { $query["id"] } else { $query["orderId"] }
                if (-not $orderId -and $query.ContainsKey("order_id")) { $orderId = $query["order_id"] }
                $token = if ($query.ContainsKey("token")) { $query["token"] } else { "" }
                $ref = if ($query.ContainsKey("ref")) { $query["ref"] } else { $query["order_ref"] }

                $matched = $orders | Where-Object { ($orderId -and $_.id -eq $orderId) -or ($ref -and $_.order_ref -eq $ref) } | Select-Object -First 1

                if (-not $matched) {
                    # Try Supabase
                    try {
                        $sbKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaHN5dHpjZmlraWt6a3V6c3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzc5ODEsImV4cCI6MjEwNjg1Mzk4MX0.U0iXv6VRBOZbOL2qNHn9j8L6Z5u3-lEQ8SsFYmZVd5I"
                        $urlFilter = if ($orderId) { "id=eq.$orderId" } else { "order_ref=eq.$ref" }
                        $sbRes = Invoke-RestMethod -Uri "https://gehsytzcfikikzkuzstc.supabase.co/rest/v1/orders?$urlFilter&select=*" -Headers @{ "apikey" = $sbKey; "Authorization" = "Bearer $sbKey" } -TimeoutSec 4 -ErrorAction Stop
                        if ($sbRes -and $sbRes.Count -gt 0) { $matched = $sbRes[0] }
                    } catch {}
                }

                if ($matched) {
                    if ($token -and $matched.access_token -ne $token) {
                        $resBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"error":"Unauthorized order access"}')
                        $response.StatusCode = 403
                    } else {
                        if ($matched.PSObject.Properties['metadata'] -and $matched.metadata) {
                            if ($matched.metadata.PSObject.Properties['internal_notes']) {
                                $matched.metadata.PSObject.Properties.Remove('internal_notes')
                            }
                        }
                        $payload = @{ success = $true; order = $matched }
                        $resBytes = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json $payload -Depth 5))
                        $response.StatusCode = 200
                    }
                } else {
                    $resBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"error":"Order not found"}')
                    $response.StatusCode = 404
                }
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $resBytes.Length
                $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                $response.OutputStream.Flush()
                $response.OutputStream.Close()
                $response.Close()
                continue
            }

            if ($request.HttpMethod -eq "POST") {
                try {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                    $bodyStr = $reader.ReadToEnd()
                    $body = ConvertFrom-Json $bodyStr

                    $hasCart = ($body.cartItems -and ($body.cartItems.Count -gt 0 -or $body.cartItems.Length -gt 0))

                    if ($hasCart) {
                        $subtotal = 0.00
                        $lineItems = @()
                        $pkgName = "Custom Cart Order"
                        $pkgId = "cart"
                        $pkgPrice = 0.00
                        $addQty = 0
                        $addCost = 0.00
                        $addedServices = @()

                        foreach ($cItem in $body.cartItems) {
                            $cId = ($cItem.id).ToString().ToLower().Trim()
                            $cQty = if ($cItem.quantity) { [Math]::Max(1, [int]$cItem.quantity) } else { 1 }
                            $cUnitPrice = 0.00
                            $cName = if ($cItem.name) { $cItem.name } else { $cId }

                            if ($cId -eq "basic") {
                                $cUnitPrice = 50.00
                                $cName = "Basic Website"
                                if ($pkgId -eq "cart") { $pkgId = "basic"; $pkgName = $cName; $pkgPrice = 50.00 }
                            } elseif ($cId -eq "standard") {
                                $cUnitPrice = 100.00
                                $cName = "Standard Website"
                                if ($pkgId -eq "cart") { $pkgId = "standard"; $pkgName = $cName; $pkgPrice = 100.00 }
                            } elseif ($cId -eq "ecommerce") {
                                $cUnitPrice = 200.00
                                $cName = "E-Commerce Website"
                                if ($pkgId -eq "cart") { $pkgId = "ecommerce"; $pkgName = $cName; $pkgPrice = 200.00 }
                            } elseif ($cId -eq "pitchdeck") {
                                $cUnitPrice = 50.00
                                $cName = "Pitch Deck Design"
                                $addedServices += @{ id = "pitchdeck"; name = "Pitch Deck Design"; amount = (50.00 * $cQty) }
                            } elseif ($cId -eq "writing") {
                                $cUnitPrice = 10.00
                                $cName = "Article Writing"
                                if ($cItem.options -and $cItem.options.words) {
                                    $cQty = [Math]::Max(1, [int][Math]::Ceiling([double]$cItem.options.words / 1000.0))
                                }
                                $addedServices += @{ id = "writing"; name = "Article Writing"; units = $cQty; amount = (10.00 * $cQty) }
                            }

                            $itemTotal = [double]$cUnitPrice * $cQty
                            $subtotal += $itemTotal

                            $lineItems += @{
                                type = "cart_item"
                                id = $cId
                                name = $cName
                                unitPrice = $cUnitPrice
                                quantity = $cQty
                                amount = $itemTotal
                            }

                            if ($cId -eq "ecommerce" -and $cItem.options -and $cItem.options.additionalProducts) {
                                $extraCount = [Math]::Max(0, [int]$cItem.options.additionalProducts)
                                if ($extraCount -gt 0) {
                                    $extraCost = [double]$extraCount * 1.00
                                    $subtotal += $extraCost
                                    $addQty += $extraCount
                                    $addCost += $extraCost
                                    $lineItems += @{
                                        type = "addon_products"
                                        id = "ecommerce_extra_products"
                                        name = "Additional E-Commerce Products"
                                        description = "$extraCount additional products ($1.00 each)"
                                        unitPrice = 1.00
                                        quantity = $extraCount
                                        amount = $extraCost
                                    }
                                }
                            }
                        }
                    } else {
                        $pkgId = if ($body.packageId) { ($body.packageId).ToString().ToLower().Trim() } else { "basic" }
                        $pkgName = "Basic"
                        $pkgPrice = 50.00
                        $lineItems = @()

                        if ($pkgId -eq "standard") {
                            $pkgName = "Standard"
                            $pkgPrice = 100.00
                        } elseif ($pkgId -eq "ecommerce") {
                            $pkgName = "E-Commerce"
                            $pkgPrice = 200.00
                        } elseif ($pkgId -eq "pitchdeck") {
                            $pkgName = "Pitch Deck Design"
                            $pkgPrice = 50.00
                        } elseif ($pkgId -eq "writing") {
                            $pkgName = "Article Writing"
                            $pkgPrice = 10.00
                        }

                        $lineItems += @{
                            type = "package"
                            id = $pkgId
                            name = $pkgName
                            unitPrice = $pkgPrice
                            quantity = 1
                            amount = $pkgPrice
                        }
                        $subtotal = $pkgPrice

                        $addQty = 0
                        $addCost = 0.00
                        if ($pkgId -eq "ecommerce" -and $body.additionalProducts) {
                            $addQty = [Math]::Max(0, [int]$body.additionalProducts)
                            if ($addQty -gt 0) {
                                $addCost = [double]$addQty * 1.00
                                $subtotal += $addCost
                                $lineItems += @{
                                    type = "addon_products"
                                    id = "ecommerce_extra_products"
                                    name = "Additional E-Commerce Products"
                                    description = "$addQty additional products ($1.00 each)"
                                    unitPrice = 1.00
                                    quantity = $addQty
                                    amount = $addCost
                                }
                            }
                        }

                        $addedServices = @()
                        if ($body.additionalServices) {
                            foreach ($svc in $body.additionalServices) {
                                $sId = if ($svc -is [string]) { $svc.ToLower() } else { $svc.id.ToLower() }
                                if ($sId -eq "pitchdeck" -and $pkgId -ne "pitchdeck") {
                                    $subtotal += 50.00
                                    $addedServices += @{ id = "pitchdeck"; name = "Pitch Deck Design"; amount = 50.00 }
                                    $lineItems += @{ type = "addon_service"; id = "pitchdeck"; name = "Pitch Deck Design"; unitPrice = 50.00; quantity = 1; amount = 50.00 }
                                } elseif ($sId -eq "writing" -and $pkgId -ne "writing") {
                                    $units = 1
                                    if ($svc.units) { $units = [Math]::Max(1, [int]$svc.units) }
                                    $wCost = [double]$units * 10.00
                                    $subtotal += $wCost
                                    $addedServices += @{ id = "writing"; name = "Article Writing"; units = $units; amount = $wCost }
                                    $lineItems += @{ type = "addon_service"; id = "writing"; name = "Article Writing"; unitPrice = 10.00; quantity = $units; amount = $wCost }
                                }
                            }
                        }
                    }

                    $dateStr = (Get-Date -Format "yyyyMMdd")
                    $rand = (Get-Random -Minimum 1000 -Maximum 9999)
                    $orderRef = "AK-$dateStr-$rand"
                    $orderId = if ($body.existingOrderId) { $body.existingOrderId } else { "ord_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + "_" + (Get-Random -Minimum 100000 -Maximum 999999) }
                    $token = if ($body.accessToken) { $body.accessToken } else { [guid]::NewGuid().ToString() }

                    $orderRecord = @{
                        id = $orderId
                        order_ref = $orderRef
                        customer_name = if ($body.customerName) { $body.customerName } else { "Guest Customer" }
                        customer_email = if ($body.customerEmail) { $body.customerEmail } else { "" }
                        customer_country = if ($body.customerCountry) { $body.customerCountry } else { "" }
                        customer_business = if ($body.customerBusiness) { $body.customerBusiness } else { "" }
                        package_id = $pkgId
                        package_name = $pkgName
                        package_price = $pkgPrice
                        additional_products_count = $addQty
                        additional_products_cost = $addCost
                        additional_services = $addedServices
                        line_items = $lineItems
                        project_name = if ($body.projectName) { $body.projectName } else { "" }
                        brand_name = if ($body.brandName) { $body.brandName } else { "" }
                        website_url = if ($body.websiteUrl) { $body.websiteUrl } else { "" }
                        project_description = if ($body.projectDescription) { $body.projectDescription } else { "" }
                        project_goals = if ($body.projectGoals) { $body.projectGoals } else { "" }
                        project_references = if ($body.projectReferences) { $body.projectReferences } else { "" }
                        special_requirements = if ($body.specialRequirements) { $body.specialRequirements } else { "" }
                        subtotal = $subtotal
                        tax_amount = 0.00
                        total_amount = $subtotal
                        currency = "USD"
                        order_status = "pending"
                        payment_status = "pending"
                        payment_provider = $null
                        payment_reference = $null
                        access_token = $token
                        created_at = (Get-Date -Format "o")
                        updated_at = (Get-Date -Format "o")
                    }

                    # Save to local orders.json
                    $orders = @($orders | Where-Object { $_.id -ne $orderId }) + $orderRecord
                    Write-OrdersJson $ordersFile $orders

                    # Forward to Supabase
                    try {
                        $sbKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaHN5dHpjZmlraWt6a3V6c3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzc5ODEsImV4cCI6MjEwNjg1Mzk4MX0.U0iXv6VRBOZbOL2qNHn9j8L6Z5u3-lEQ8SsFYmZVd5I"
                        $headers = @{ "apikey" = $sbKey; "Authorization" = "Bearer $sbKey"; "Content-Type" = "application/json"; "Prefer" = "resolution=merge-duplicates" }
                        $payload = ConvertTo-Json $orderRecord -Depth 5
                        Invoke-RestMethod -Uri "https://gehsytzcfikikzkuzstc.supabase.co/rest/v1/orders" -Method Post -Headers $headers -Body $payload -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null
                    } catch {}

                    $resObj = @{ success = $true; order = $orderRecord }
                    $resBytes = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json $resObj -Depth 5))
                    $response.StatusCode = 200
                } catch {
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"error":"Failed to process order"}')
                    $response.StatusCode = 500
                    $resBytes = $errBytes
                }
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $resBytes.Length
                $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                $response.OutputStream.Flush()
                $response.OutputStream.Close()
                $response.Close()
                continue
            }
        }

        # API: Checkout Initiation (/api/checkout)
        if ($path -eq "/api/checkout") {
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
            $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 204
                $response.Close()
                continue
            }

            if ($request.HttpMethod -eq "POST") {
                try {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                    $body = ConvertFrom-Json ($reader.ReadToEnd())

                    $orderId = $body.orderId
                    $token = $body.accessToken
                    $action = $body.testModeAction

                    $ordersFile = Join-Path $root "orders.json"
                    $orders = Read-OrdersJson $ordersFile

                    $order = $orders | Where-Object { $_.id -eq $orderId } | Select-Object -First 1

                    if ($order -and $order.access_token -eq $token) {
                        if ($body.customerName) { $order.customer_name = $body.customerName }
                        if ($body.customerEmail) { $order.customer_email = $body.customerEmail }
                        if ($body.customerCountry) { $order.customer_country = $body.customerCountry }
                        if ($body.customerBusiness) { $order.customer_business = $body.customerBusiness }

                        if ($action -eq "verify_success") {
                            $order.payment_provider = "test_mode"
                            $order.payment_reference = "test_ch_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                            $order.payment_status = "paid"
                            $order.order_status = "confirmed"
                            $order.updated_at = (Get-Date -Format "o")
                            Write-OrdersJson $ordersFile $orders

                            # Update Supabase
                            try {
                                $sbKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaHN5dHpjZmlraWt6a3V6c3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzc5ODEsImV4cCI6MjEwNjg1Mzk4MX0.U0iXv6VRBOZbOL2qNHn9j8L6Z5u3-lEQ8SsFYmZVd5I"
                                $patchPayload = ConvertTo-Json @{
                                    customer_name = $order.customer_name; customer_email = $order.customer_email; customer_country = $order.customer_country
                                    payment_provider = "test_mode"; payment_status = "paid"; order_status = "confirmed"; payment_reference = $order.payment_reference
                                    updated_at = $order.updated_at
                                }
                                Invoke-RestMethod -Uri "https://gehsytzcfikikzkuzstc.supabase.co/rest/v1/orders?id=eq.$orderId" -Method Patch -Headers @{ "apikey" = $sbKey; "Authorization" = "Bearer $sbKey"; "Content-Type" = "application/json" } -Body $patchPayload -TimeoutSec 4 -ErrorAction SilentlyContinue | Out-Null
                            } catch {}

                            $resObj = @{ success = $true; provider = "test_mode"; status = "paid"; redirectUrl = "/order-confirmation?order_id=$orderId&token=$token&status=paid" }
                        } elseif ($action -eq "test_pending") {
                            $order.payment_provider = "test_mode"
                            $order.payment_reference = "test_pen_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                            $order.payment_status = "processing"
                            $order.updated_at = (Get-Date -Format "o")
                            [System.IO.File]::WriteAllText($ordersFile, (ConvertTo-Json $orders -Depth 6), [System.Text.Encoding]::UTF8)
                            $resObj = @{ success = $true; provider = "test_mode"; status = "processing"; redirectUrl = "/order-confirmation?order_id=$orderId&token=$token&status=pending" }
                        } elseif ($action -eq "test_failed") {
                            $order.payment_provider = "test_mode"
                            $order.payment_status = "failed"
                            $order.updated_at = (Get-Date -Format "o")
                            [System.IO.File]::WriteAllText($ordersFile, (ConvertTo-Json $orders -Depth 6), [System.Text.Encoding]::UTF8)
                            $resObj = @{ success = $true; provider = "test_mode"; status = "failed"; redirectUrl = "/checkout?order_id=$orderId&token=$token&error=payment_failed" }
                        } elseif ($action -eq "test_cancel") {
                            $order.payment_provider = "test_mode"
                            $order.payment_status = "cancelled"
                            $order.updated_at = (Get-Date -Format "o")
                            [System.IO.File]::WriteAllText($ordersFile, (ConvertTo-Json $orders -Depth 6), [System.Text.Encoding]::UTF8)
                            $resObj = @{ success = $true; provider = "test_mode"; status = "cancelled"; redirectUrl = "/order-confirmation?order_id=$orderId&token=$token&status=cancelled" }
                        } else {
                            $resObj = @{ success = $false; requiresConfiguration = $true; provider = "stripe"; message = "Stripe secret key is not set. Use Sandbox Test Mode to verify order workflows." }
                        }
                    } else {
                        $resObj = @{ success = $false; error = "Order not found or invalid token" }
                    }

                    $resBytes = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json $resObj -Depth 5))
                    $response.StatusCode = 200
                } catch {
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"error":"Checkout session error"}')
                    $response.StatusCode = 500
                    $resBytes = $errBytes
                }
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $resBytes.Length
                $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                $response.OutputStream.Flush()
                $response.OutputStream.Close()
                $response.Close()
                continue
            }
        }

        # API: Payment Verification (/api/verify)
        if ($path -eq "/api/verify") {
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 204
                $response.Close()
                continue
            }

            $query = Get-UrlQueryDict $request.Url.Query
            $orderId = if ($query.ContainsKey("orderId")) { $query["orderId"] } elseif ($query.ContainsKey("id")) { $query["id"] } else { $query["order_id"] }
            $token = if ($query.ContainsKey("token")) { $query["token"] } else { "" }
            $sessionId = if ($query.ContainsKey("sessionId")) { $query["sessionId"] } else { $query["session_id"] }

            $ordersFile = Join-Path $root "orders.json"
            $orders = Read-OrdersJson $ordersFile

            $matched = $orders | Where-Object { ($orderId -and $_.id -eq $orderId) -or ($sessionId -and $_.payment_reference -eq $sessionId) } | Select-Object -First 1

            if (-not $matched) {
                # Try Supabase
                try {
                    $sbKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaHN5dHpjZmlraWt6a3V6c3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzc5ODEsImV4cCI6MjEwNjg1Mzk4MX0.U0iXv6VRBOZbOL2qNHn9j8L6Z5u3-lEQ8SsFYmZVd5I"
                    $urlFilter = if ($orderId) { "id=eq.$orderId" } else { "payment_reference=eq.$sessionId" }
                    $sbRes = Invoke-RestMethod -Uri "https://gehsytzcfikikzkuzstc.supabase.co/rest/v1/orders?$urlFilter&select=*" -Headers @{ "apikey" = $sbKey; "Authorization" = "Bearer $sbKey" } -TimeoutSec 4 -ErrorAction Stop
                    if ($sbRes -and $sbRes.Count -gt 0) { $matched = $sbRes[0] }
                } catch {}
            }

            if ($matched) {
                $isPaid = ($matched.payment_status -eq "paid")
                $resObj = @{ success = $true; verified = $isPaid; order = $matched }
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json $resObj -Depth 5))
                $response.StatusCode = 200
            } else {
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"error":"Order not found"}')
                $response.StatusCode = 404
            }
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $resBytes.Length
            $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
            $response.OutputStream.Flush()
            $response.OutputStream.Close()
            $response.Close()
            continue
        }

        # API: Admin Management (/api/admin)
        if ($path -eq "/api/admin") {
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key, X-CSRF-Token")

            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 204
                $response.Close()
                continue
            }

            try {
                $reqObj = @{
                    method = $request.HttpMethod
                    path = $path
                    url = $request.Url.PathAndQuery
                    query = (Get-UrlQueryDict $request.Url.Query)
                    headers = @{}
                }
                foreach ($h in $request.Headers.AllKeys) {
                    if ($h) {
                        $reqObj.headers[$h.ToLower()] = $request.Headers[$h]
                    }
                }
                if ($request.HasEntityBody) {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                    $bodyStr = $reader.ReadToEnd()
                    try {
                        $reqObj.body = (ConvertFrom-Json $bodyStr)
                    } catch {
                        $reqObj.body = $bodyStr
                    }
                }

                $jsonInput = ConvertTo-Json $reqObj -Depth 7 -Compress
                $bridgeScript = Join-Path $root "api\bridge.js"
                
                $psi = New-Object System.Diagnostics.ProcessStartInfo
                $psi.FileName = "node"
                $psi.Arguments = "`"$bridgeScript`""
                $psi.WorkingDirectory = $root
                $psi.RedirectStandardInput = $true
                $psi.RedirectStandardOutput = $true
                $psi.RedirectStandardError = $true
                $psi.UseShellExecute = $false
                $psi.CreateNoWindow = $true

                $proc = [System.Diagnostics.Process]::Start($psi)
                $proc.StandardInput.Write($jsonInput)
                $proc.StandardInput.Flush()
                $proc.StandardInput.Close()

                $output = $proc.StandardOutput.ReadToEnd()
                $proc.WaitForExit(8000)

                if ([string]::IsNullOrWhiteSpace($output)) {
                    $resBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"error":"Bridge process returned empty response"}')
                    $response.StatusCode = 500
                } else {
                    $bridgeRes = ConvertFrom-Json $output
                    $response.StatusCode = if ($bridgeRes.statusCode) { [int]$bridgeRes.statusCode } else { 200 }
                    $payloadJson = ConvertTo-Json $bridgeRes.body -Depth 8
                    $resBytes = [System.Text.Encoding]::UTF8.GetBytes($payloadJson)
                }
            } catch {
                $errPayload = @{ success = $false; error = $_.Exception.Message }
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json $errPayload))
                $response.StatusCode = 500
            }

            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $resBytes.Length
            $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
            $response.OutputStream.Flush()
            $response.OutputStream.Close()
            $response.Close()
            continue
        }

        if ($path -eq "/" -or [string]::IsNullOrWhiteSpace($path)) {
            $path = "/index.html"
        } elseif ($path -eq "/founder-story" -or $path -eq "/founder-story/") {
            $path = "/founder-story.html"
        } elseif ($path -eq "/services" -or $path -eq "/services/") {
            $path = "/services.html"
        } elseif ($path -eq "/portfolio/presentations" -or $path -eq "/portfolio/presentations/" -or $path -eq "/portfolio-presentations" -or $path -eq "/portfolio-presentations.html") {
            $path = "/portfolio-presentations.html"
        } elseif ($path -eq "/portfolio" -or $path -eq "/portfolio/") {
            $path = "/portfolio.html"
        } elseif ($path -eq "/cart" -or $path -eq "/cart/") {
            $path = "/cart.html"
        } elseif ($path -eq "/get-quote" -or $path -eq "/get-quote/" -or $path -eq "/quote" -or $path -eq "/quote/") {
            $path = "/get-quote.html"
        } elseif ($path -eq "/order" -or $path -eq "/order/") {
            $path = "/order.html"
        } elseif ($path -eq "/checkout" -or $path -eq "/checkout/") {
            $path = "/checkout.html"
        } elseif ($path -eq "/order-confirmation" -or $path -eq "/order-confirmation/") {
            $path = "/order-confirmation.html"
        } elseif ($path -eq "/login" -or $path -eq "/login/") {
            $path = "/login.html"
        } elseif ($path -eq "/register" -or $path -eq "/register/") {
            $path = "/register.html"
        } elseif ($path -eq "/forgot-password" -or $path -eq "/forgot-password/") {
            $path = "/forgot-password.html"
        } elseif ($path -eq "/reset-password" -or $path -eq "/reset-password/") {
            $path = "/reset-password.html"
        } elseif ($path -eq "/verify-email" -or $path -eq "/verify-email/") {
            $path = "/verify-email.html"
        } elseif ($path -eq "/privacy-policy" -or $path -eq "/privacy-policy/") {
            $path = "/privacy-policy.html"
        } elseif ($path -eq "/terms-and-conditions" -or $path -eq "/terms-and-conditions/") {
            $path = "/terms-and-conditions.html"
        } elseif ($path -eq "/cancellation-return-refund-policy" -or $path -eq "/cancellation-return-refund-policy/") {
            $path = "/cancellation-return-refund-policy.html"
        } elseif ($path -eq "/ownership-statement" -or $path -eq "/ownership-statement/") {
            $path = "/ownership-statement.html"
        } elseif ($path -eq "/admin" -or $path -eq "/admin/" -or $path.StartsWith("/admin/")) {
            $path = "/admin.html"
        }

        $relPath = $path.TrimStart('/').Replace('/', '\')
        $filePath = Join-Path $root $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)

            $response.ContentType = $contentType
            $response.AddHeader("Access-Control-Allow-Origin", "*")

            if ($path.StartsWith("/assets/") -or $ext -in @(".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg", ".ico")) {
                $response.AddHeader("Cache-Control", "public, max-age=31536000, immutable")
            } elseif ($path.StartsWith("/css/") -or $path.StartsWith("/js/") -or $ext -in @(".css", ".js")) {
                $response.AddHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
            } else {
                $response.AddHeader("Cache-Control", "public, max-age=0, must-revalidate")
            }

            $isText = $ext -in @(".html", ".css", ".js", ".json", ".svg")
            $acceptsGzip = $request.Headers["Accept-Encoding"] -and ($request.Headers["Accept-Encoding"].IndexOf("gzip") -ge 0)
            if ($isText -and $acceptsGzip -and $bytes.Length -gt 256) {
                try {
                    $ms = New-Object System.IO.MemoryStream
                    $gz = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionMode]::Compress)
                    $gz.Write($bytes, 0, $bytes.Length)
                    $gz.Close()
                    $bytes = $ms.ToArray()
                    $ms.Close()
                    $response.AddHeader("Content-Encoding", "gzip")
                } catch {}
            }

            $response.ContentLength64 = $bytes.Length
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

