Write-Host "Checking for submitted wiki article revisions..."
node scripts/review-wiki-edits.js review
if ($LASTEXITCODE -ne 0) {
    Write-Host "Wiki article review failed or was stopped. Aborting publish."
    Read-Host "Press Enter to exit"
    exit
}

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
if ($LASTEXITCODE -ne 0) {
    Write-Host "Could not stage changes. Aborting publish."
    Read-Host "Press Enter to exit"
    exit
}

git commit -m $changeNote
if ($LASTEXITCODE -ne 0) {
    Write-Host "Commit failed. Approved wiki revisions remain available for the next upload."
    Read-Host "Press Enter to exit"
    exit
}

git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed. Approved wiki revisions remain available for the next upload."
    Read-Host "Press Enter to exit"
    exit
}

node scripts/review-wiki-edits.js clear-approved
if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload succeeded, but shared approved revisions could not be cleared."
    Read-Host "Press Enter to exit"
    exit
}

Read-Host "Done! Press Enter to exit"