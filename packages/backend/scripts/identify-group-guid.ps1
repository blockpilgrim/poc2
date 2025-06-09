# PowerShell script to identify the correct GUID for "Partner Portal - EC Oregon - Testing"
# This script uses Microsoft Graph PowerShell module

param(
    [Parameter(Mandatory=$true)]
    [string]$TenantId,
    
    [Parameter(Mandatory=$true)]
    [string]$ClientId,
    
    [Parameter(Mandatory=$true)]
    [string]$ClientSecret
)

# The 14 GUIDs we need to check
$guidsToCheck = @(
    '94a2bdc0-2fda-461e-b6a1-b8870dc3d09a',
    'e61e451d-8bbc-469c-bb68-5e6bbcb41499',
    '8de42847-85cc-4cce-970f-a2d07aa0d6c8',
    'dd793259-26da-4f98-a5ee-efd5283a3ba3',
    'f61f8f59-660d-451d-8634-d3130ad83c57',
    '51deb97c-11f3-429c-a3ac-10bdbde61971',
    'e6ae3a86-446e-40f0-a2fb-e1b83f11cd3b',
    '82126aa3-ffb3-4372-bb4a-28016c1f2146',
    'e701fbcf-60fc-45b1-b3b5-30f648983f60',
    'fbed8fd9-ed6f-4d02-a07c-a2a64d2e167e',
    '54d4d7ec-5199-4fad-a2f8-27858a3c2320',
    '33702bef-c518-4082-981a-eb6d75b4e6b3',
    'dda668f1-8b71-446f-90ce-d73a49bd8dc6',
    '194a0bf2-77f5-4f87-a637-5cc356eced81'
)

Write-Host "🔍 Identifying correct GUID for 'Partner Portal - EC Oregon - Testing'..." -ForegroundColor Cyan
Write-Host ""

# Check if Microsoft.Graph module is installed
if (-not (Get-Module -ListAvailable -Name Microsoft.Graph.Authentication)) {
    Write-Host "❌ Microsoft.Graph PowerShell module is not installed." -ForegroundColor Red
    Write-Host "Please install it with: Install-Module Microsoft.Graph -Scope CurrentUser" -ForegroundColor Yellow
    exit 1
}

try {
    # Import required modules
    Import-Module Microsoft.Graph.Authentication
    Import-Module Microsoft.Graph.Groups

    Write-Host "🔑 Connecting to Microsoft Graph..." -ForegroundColor Green
    
    # Create secure string for client secret
    $secureClientSecret = ConvertTo-SecureString $ClientSecret -AsPlainText -Force
    
    # Connect using client credentials
    Connect-MgGraph -TenantId $TenantId -ClientId $ClientId -ClientSecretCredential (New-Object System.Management.Automation.PSCredential($ClientId, $secureClientSecret)) -NoWelcome
    
    Write-Host "✅ Connected to Microsoft Graph" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Fetching group information for all 14 GUIDs..." -ForegroundColor Cyan
    Write-Host ""

    $results = @()
    $correctGroup = $null
    
    foreach ($guid in $guidsToCheck) {
        try {
            $group = Get-MgGroup -GroupId $guid -ErrorAction SilentlyContinue
            
            if ($group) {
                $groupInfo = @{
                    Id = $guid
                    Name = $group.DisplayName
                    Description = $group.Description
                    Error = $null
                }
                
                Write-Host "✅ $guid`: `"$($group.DisplayName)`"" -ForegroundColor Green
                
                # Check if this is our target group
                if ($group.DisplayName -eq "Partner Portal - EC Oregon - Testing") {
                    $correctGroup = $groupInfo
                }
            } else {
                $groupInfo = @{
                    Id = $guid
                    Name = "GROUP_NOT_FOUND"
                    Description = $null
                    Error = "Group not found"
                }
                Write-Host "❌ $guid`: Group not found" -ForegroundColor Red
            }
        }
        catch {
            $groupInfo = @{
                Id = $guid
                Name = "ERROR_FETCHING"
                Description = $null
                Error = $_.Exception.Message
            }
            Write-Host "❌ $guid`: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        $results += $groupInfo
        Start-Sleep -Milliseconds 100  # Small delay to avoid rate limiting
    }

    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor Yellow
    Write-Host "📋 SUMMARY REPORT" -ForegroundColor Yellow
    Write-Host ("=" * 80) -ForegroundColor Yellow

    if ($correctGroup) {
        Write-Host ""
        Write-Host "🎯 FOUND EXACT MATCH!" -ForegroundColor Green
        Write-Host "   GUID: $($correctGroup.Id)" -ForegroundColor White
        Write-Host "   Name: `"$($correctGroup.Name)`"" -ForegroundColor White
        Write-Host "   Description: $($correctGroup.Description)" -ForegroundColor White
    } else {
        # Look for partial matches
        $partialMatches = $results | Where-Object { 
            $_.Name -and 
            $_.Name -ne "GROUP_NOT_FOUND" -and 
            $_.Name -ne "ERROR_FETCHING" -and
            ($_.Name -like "*Oregon*" -or $_.Name -like "*Partner*" -or $_.Name -like "*Testing*")
        }

        if ($partialMatches) {
            Write-Host ""
            Write-Host "🔍 POTENTIAL MATCHES FOUND:" -ForegroundColor Yellow
            foreach ($match in $partialMatches) {
                Write-Host "   GUID: $($match.Id)" -ForegroundColor White
                Write-Host "   Name: `"$($match.Name)`"" -ForegroundColor White
                Write-Host "   Description: $($match.Description)" -ForegroundColor White
                Write-Host "   ---" -ForegroundColor Gray
            }
        } else {
            Write-Host ""
            Write-Host "❌ NO MATCHING GROUPS FOUND" -ForegroundColor Red
            Write-Host "   None of the 14 GUIDs correspond to groups containing 'Oregon', 'Partner', or 'Testing'" -ForegroundColor Yellow
        }
    }

    # Show all groups for reference
    Write-Host ""
    Write-Host "📝 ALL GROUPS FOUND:" -ForegroundColor Cyan
    $validGroups = $results | Where-Object { $_.Name -and $_.Name -ne "GROUP_NOT_FOUND" -and $_.Name -ne "ERROR_FETCHING" }
    foreach ($group in $validGroups) {
        Write-Host "   $($group.Id): `"$($group.Name)`"" -ForegroundColor White
    }

    # Show errors
    $errors = $results | Where-Object { $_.Error }
    if ($errors) {
        Write-Host ""
        Write-Host "⚠️  GROUPS WITH ERRORS:" -ForegroundColor Yellow
        foreach ($error in $errors) {
            Write-Host "   $($error.Id): $($error.Error)" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor Yellow

    # Generate code snippet for updating auth.service.ts
    if ($correctGroup) {
        Write-Host ""
        Write-Host "💡 TO FIX THE AUTH SERVICE:" -ForegroundColor Green
        Write-Host "Replace the temporary mapping in auth.service.ts with:" -ForegroundColor White
        Write-Host ""
        Write-Host "['$($correctGroup.Id)', 'Partner Portal - EC Oregon - Testing']," -ForegroundColor Cyan
        Write-Host ""
        Write-Host "And remove all the other temporary mappings for this group." -ForegroundColor White
    }

} catch {
    Write-Host "❌ Script failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Disconnect from Microsoft Graph
    Disconnect-MgGraph -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "✅ Script completed successfully!" -ForegroundColor Green