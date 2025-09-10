$path = 'C:\Users\helli\.gemini\settings.json'
$obj = @{
  ideMode = $false
  selectedAuthType = 'vertex-ai'
  project = 'solar-study-470916-s7'
  vertex = @{ location = 'us-central1' }
  auth = @{ type = 'vertex'; credentials_file = 'C:\Users\helli\.gemini\oauth_creds.json' }
}
$json = $obj | ConvertTo-Json -Depth 5
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $json, $enc)
Write-Output "WROTE: $path"
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\Users\helli\AppData\Local\Microsoft\Windows\INetCache\IE\9FWXTGNI\solar-study-470916-s7-b95108118576[1].json'
$env:GOOGLE_GENAI_USE_VERTEXAI = '1'
$env:GEMINI_DISABLE_IDE_INTEGRATION = '1'
Write-Output 'RUNNING: gemini -p "health check" --debug'
& gemini -p 'health check' --debug