$changeNote = Read-Host "Changes since the last upload"
$env:WIKI_CHANGE_NOTE = $changeNote

Write-Host "Building wiki..."
node scripts/build-index.js

Remove-Item Env:WIKI_CHANGE_NOTE

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Aborting publish."
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "Adding changed files..."
git add .

git commit -m $changeNote
git push

Read-Host "Done! Press Enter to exit"