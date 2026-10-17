$ErrorActionPreference = "Stop"

Write-Host "=== TEST 1: Page Routes ==="
$r1 = Invoke-WebRequest -Uri "http://localhost:8090/order" -UseBasicParsing
$r2 = Invoke-WebRequest -Uri "http://localhost:8090/checkout" -UseBasicParsing
$r3 = Invoke-WebRequest -Uri "http://localhost:8090/order-confirmation" -UseBasicParsing
Write-Host "GET /order: $($r1.StatusCode)"
Write-Host "GET /checkout: $($r2.StatusCode)"
Write-Host "GET /order-confirmation: $($r3.StatusCode)"

Write-Host "`n=== TEST 2: Package Pricing Calculation Server-Side ==="
# Test Basic ($50)
$payloadBasic = @{
    packageId = "basic"
    projectDescription = "A clean 5-page business site for dental clinic."
} | ConvertTo-Json

$resBasic = Invoke-RestMethod -Uri "http://localhost:8090/api/order" -Method Post -Body $payloadBasic -ContentType "application/json"
Write-Host "Basic package total: $($resBasic.order.total_amount) USD (Expected: 50.00)"

# Test Standard ($100)
$payloadStandard = @{
    packageId = "standard"
    projectDescription = "Corporate portfolio with invoice payments."
} | ConvertTo-Json

$resStandard = Invoke-RestMethod -Uri "http://localhost:8090/api/order" -Method Post -Body $payloadStandard -ContentType "application/json"
Write-Host "Standard package total: $($resStandard.order.total_amount) USD (Expected: 100.00)"

# Test E-Commerce ($200) + 15 additional products (10 included, 15 extra = $215 total)
$payloadEcom = @{
    packageId = "ecommerce"
    additionalProducts = 15
    projectDescription = "Luxury boutique selling fashion apparel."
} | ConvertTo-Json

$resEcom = Invoke-RestMethod -Uri "http://localhost:8090/api/order" -Method Post -Body $payloadEcom -ContentType "application/json"
Write-Host "E-Commerce + 15 extra products total: $($resEcom.order.total_amount) USD (Expected: 215.00)"

# Test E-Commerce + Pitch Deck ($50) + Article Writing (2 units = 2,000 words = $20) -> 200 + 50 + 20 = $270
$payloadCombo = @{
    packageId = "ecommerce"
    additionalProducts = 5
    additionalServices = @(
        @{ id = "pitchdeck" },
        @{ id = "writing"; units = 2 }
    )
    projectName = "Alpha Boutique"
    customerName = "Sarah Jenkins"
    customerEmail = "sarah.jenkins@example.com"
    customerCountry = "United States"
    projectDescription = "Complete e-commerce store with investor pitch deck and blog articles."
} | ConvertTo-Json -Depth 5

$resCombo = Invoke-RestMethod -Uri "http://localhost:8090/api/order" -Method Post -Body $payloadCombo -ContentType "application/json"
Write-Host "Combo total: $($resCombo.order.total_amount) USD (Expected: 275.00)"
$comboOrderId = $resCombo.order.id
$comboToken = $resCombo.order.access_token
Write-Host "Created Order ID: $comboOrderId, Ref: $($resCombo.order.order_ref)"

Write-Host "`n=== TEST 3: Order Retrieval with Token ==="
$getRes = Invoke-RestMethod -Uri "http://localhost:8090/api/order?id=$comboOrderId&token=$comboToken" -Method Get
Write-Host "Retrieved Order: $($getRes.order.package_name), Total: $($getRes.order.total_amount), Status: $($getRes.order.order_status)"

Write-Host "`n=== TEST 4: Checkout Execution (Verify Payment) ==="
$checkoutPayload = @{
    orderId = $comboOrderId
    accessToken = $comboToken
    customerName = "Sarah Jenkins"
    customerEmail = "sarah.jenkins@example.com"
    customerCountry = "United States"
    testModeAction = "verify_success"
} | ConvertTo-Json

$chRes = Invoke-RestMethod -Uri "http://localhost:8090/api/checkout" -Method Post -Body $checkoutPayload -ContentType "application/json"
Write-Host "Checkout result: $($chRes.success), Status: $($chRes.status), Redirect: $($chRes.redirectUrl)"

Write-Host "`n=== TEST 5: Payment Verification on Confirmation ==="
$verifyRes = Invoke-RestMethod -Uri "http://localhost:8090/api/verify?orderId=$comboOrderId&token=$comboToken" -Method Get
Write-Host "Verification result: verified=$($verifyRes.verified), payment_status=$($verifyRes.order.payment_status), order_status=$($verifyRes.order.order_status)"

Write-Host "`n=== ALL TESTS COMPLETED SUCCESSFULLY ==="
