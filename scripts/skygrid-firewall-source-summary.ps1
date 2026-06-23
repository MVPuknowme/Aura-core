$LogPath = "C:\Windows\System32\LogFiles\Firewall\pfirewall.log"
$OutDir = "E:\Aura-core\.skygrid\firewall"
$Stamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$OutCsv = Join-Path $OutDir "remote-firewall-sources-$Stamp.csv"

New-Item -ItemType Directory -Force $OutDir | Out-Null

if (!(Test-Path $LogPath)) {
  Write-Host "Firewall log does not exist yet." -ForegroundColor Yellow
  Write-Host "This usually means no inbound packets have been dropped since logging was enabled."
  Write-Host "Log expected at: $LogPath"

  "sourceIp,destinationPort,protocol,hits,firstSeen,lastSeen,note" |
    Set-Content -Encoding utf8 $OutCsv

  '"none","none","none","0","none","none","no firewall drop log exists yet"' |
    Add-Content -Encoding utf8 $OutCsv

  Write-Host "Placeholder summary written:"
  Write-Host $OutCsv -ForegroundColor Green
  exit 0
}

$lines = Get-Content $LogPath | Where-Object {
  $_ -and $_ -notmatch "^#" -and $_ -match "\bDROP\b"
}

if (!$lines -or $lines.Count -eq 0) {
  Write-Host "Firewall log exists, but no DROP records found yet." -ForegroundColor Yellow

  "sourceIp,destinationPort,protocol,hits,firstSeen,lastSeen,note" |
    Set-Content -Encoding utf8 $OutCsv

  '"none","none","none","0","none","none","log exists but no drops recorded yet"' |
    Add-Content -Encoding utf8 $OutCsv

  Write-Host "Placeholder summary written:"
  Write-Host $OutCsv -ForegroundColor Green
  exit 0
}

$records = foreach ($line in $lines) {
  $p = $line -split "\s+"

  if ($p.Count -ge 8) {
    [pscustomobject]@{
      date = $p[0]
      time = $p[1]
      action = $p[2]
      protocol = $p[3]
      sourceIp = $p[4]
      destinationIp = $p[5]
      sourcePort = $p[6]
      destinationPort = $p[7]
      raw = $line
    }
  }
}

$records |
  Group-Object sourceIp,destinationPort |
  ForEach-Object {
    $first = $_.Group | Select-Object -First 1
    $last = $_.Group | Select-Object -Last 1

    [pscustomobject]@{
      sourceIp = $first.sourceIp
      destinationPort = $first.destinationPort
      protocol = $first.protocol
      hits = $_.Count
      firstSeen = "$($first.date) $($first.time)"
      lastSeen = "$($last.date) $($last.time)"
      note = "dropped inbound packet source"
    }
  } |
  Sort-Object hits -Descending |
  Export-Csv -NoTypeInformation -Encoding utf8 $OutCsv

Write-Host "Remote firewall source summary written:" -ForegroundColor Green
Write-Host $OutCsv

Import-Csv $OutCsv | Format-Table -AutoSize
notepad $OutCsv
