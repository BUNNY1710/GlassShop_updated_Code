@echo off
REM Script to push code to a new Git repository (Windows)
REM Usage: push-to-new-repo.bat <new-repo-url>

if "%~1"=="" (
    echo Usage: push-to-new-repo.bat ^<new-repo-url^>
    echo Example: push-to-new-repo.bat https://github.com/username/new-repo.git
    exit /b 1
)

set NEW_REPO_URL=%~1

echo ==========================================
echo Pushing to New Repository
echo ==========================================
echo.

REM Step 1: Remove old remote
echo Step 1: Removing old remote...
git remote remove origin 2>nul || echo No existing origin remote

REM Step 2: Add new remote
echo Step 2: Adding new remote...
git remote add origin "%NEW_REPO_URL%"

REM Step 3: Verify remote
echo Step 3: Verifying remote...
git remote -v

REM Step 4: Push to new repository
echo.
echo Step 4: Pushing to new repository...
echo This will push all commits to: %NEW_REPO_URL%
set /p CONFIRM="Continue? (y/n): "

if /i "%CONFIRM%"=="y" (
    git push -u origin master
    echo.
    echo Successfully pushed to new repository!
) else (
    echo Push cancelled
    exit /b 1
)

