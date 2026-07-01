Set-Location -LiteralPath "E:\Aura-core\desktop-gpt"

$env:OPENAI_API_KEY = [Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "User")
$env:OPENAI_MODEL = [Environment]::GetEnvironmentVariable("OPENAI_MODEL", "User")

npm start *> ".\logs\aura-desktop.log"
