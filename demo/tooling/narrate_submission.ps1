$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$audioDir = Join-Path $root 'tmp\submission-audio'
if (-not (Test-Path $audioDir)) { New-Item -ItemType Directory -Force $audioDir | Out-Null }

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    # Pick the best available voice — prefer a female Indian English voice
    $voices = $synth.GetInstalledVoices() | Where-Object { $_.Enabled }
    $indian = $voices | Where-Object { $_.VoiceInfo.Culture.Name -match 'en-IN' } | Select-Object -First 1
    $chosen = if ($indian) { $indian.VoiceInfo.Name } else { ($voices | Select-Object -First 1).VoiceInfo.Name }
    $synth.SelectVoice($chosen)
    Write-Host "Using voice: $chosen"

    # Slow down slightly for clarity
    $synth.Rate = -1

    $script = Get-Content (Join-Path $root 'demo\tooling\submission_script.json') -Raw | ConvertFrom-Json
    foreach ($scene in $script) {
        $wav = Join-Path $audioDir "$($scene.id).wav"
        Write-Host "  Generating $($scene.id)..."
        $synth.SetOutputToWaveFile($wav)
        $synth.Speak($scene.text)
        $synth.SetOutputToNull()
    }
    Write-Host "Audio generated in $audioDir"
} finally {
    $synth.Dispose()
}

# Compute timing from WAV durations
$pythonExe = if (Test-Path (Join-Path $root '.venv\Scripts\python.exe')) {
    Join-Path $root '.venv\Scripts\python.exe'
} else { 'python' }
& $pythonExe (Join-Path $root 'demo\tooling\submission_timing.py')
if ($LASTEXITCODE -ne 0) { throw 'submission_timing.py failed' }

Write-Host "`nNarration ready. Next: from repo root, run:"
Write-Host "  node demo/tooling/record_submission.js"
