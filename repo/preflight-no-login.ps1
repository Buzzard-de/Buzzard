param(
    [string]$SitePath = 'Buzzard'
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoPath = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $repoPath

$siteBase = "https://buzzard-de.github.io/$SitePath"

$requiredFiles = @(
    'index.html',
    'products.html',
    'impressum.html',
    'datenschutz.html',
    'styles.css',
    'scripts.js',
    'sitemap.xml',
    'robots.txt',
    'google1206d6d713142108.html'
)

$errors = New-Object System.Collections.Generic.List[string]

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $errors.Add("Fehlt: $file")
    }
}

if (Test-Path 'google1206d6d713142108.html') {
    $verification = (Get-Content 'google1206d6d713142108.html' -Raw).Trim()
    if ($verification -ne 'google-site-verification: google1206d6d713142108.html') {
        $errors.Add('Inhalt von google1206d6d713142108.html ist unerwartet.')
    }
}

if (Test-Path 'robots.txt') {
    $robots = Get-Content 'robots.txt' -Raw
    $expectedSitemapInRobots = [regex]::Escape("$siteBase/sitemap.xml")
    if ($robots -notmatch $expectedSitemapInRobots) {
        $errors.Add("robots.txt enthaelt keine korrekte Sitemap-URL fuer $SitePath.")
    }
}

if (Test-Path 'sitemap.xml') {
    $sitemap = Get-Content 'sitemap.xml' -Raw
    $expectedUrls = @(
        "$siteBase/",
        "$siteBase/products.html",
        "$siteBase/impressum.html",
        "$siteBase/datenschutz.html"
    )

    foreach ($url in $expectedUrls) {
        if ($sitemap -notmatch [regex]::Escape($url)) {
            $errors.Add("Sitemap-Eintrag fehlt: $url")
        }
    }
}

Write-Output 'Preflight (ohne Login) abgeschlossen.'

if ($errors.Count -gt 0) {
    Write-Output ''
    Write-Output 'Fehler gefunden:'
    foreach ($err in $errors) {
        Write-Output "- $err"
    }
    exit 1
}

Write-Output 'Alle lokalen Checks sind OK.'
Write-Output 'Optionaler Live-Check ohne Auth (nur Lesetest):'

$liveUrls = @(
    "$siteBase/",
    "$siteBase/robots.txt",
    "$siteBase/sitemap.xml"
)

foreach ($url in $liveUrls) {
    try {
        $resp = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 20
        Write-Output ("- {0} -> HTTP {1}" -f $url, [int]$resp.StatusCode)
    }
    catch {
        Write-Output ("- {0} -> nicht erreichbar ({1})" -f $url, $_.Exception.Message)
    }
}
