#!/usr/bin/env bash
set -e

MESSAGE="${1:-feat: automated update $(date '+%Y-%m-%d %H:%M:%S')}"
BRANCH="${2:-main}"

echo -e "\n🚀 [1/3] Checking Git working tree..."
if [[ -n $(git status --porcelain) ]]; then
  echo "📦 Changes detected. Staging all files..."
  git add -A
  echo "✍️  [2/3] Committing with message: '$MESSAGE'..."
  git commit -m "$MESSAGE"
else
  echo "✅ Working tree clean (no new local changes to commit)."
fi

echo -e "🌐 [3/3] Pushing to origin/$BRANCH..."
git push origin "$BRANCH"

echo -e "\n🎉 Successfully pushed to GitHub ($BRANCH)!"
echo -e "✨ Automated deployments on Render and Vercel have been triggered.\n"
