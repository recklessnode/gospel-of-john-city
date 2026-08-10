#!/usr/bin/env bash
# Publish "The Gospel of John as a City" to GitHub with Pages enabled.
# Run this in WSL (needs: git, gh — already authenticated via `gh auth login`).
#
#   unzip gospel-of-john-city.zip && cd john-city && ./publish.sh
#
set -euo pipefail
REPO_NAME="${1:-gospel-of-john-city}"

command -v gh >/dev/null || { echo "gh CLI not found — install from https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Run 'gh auth login' first."; exit 1; }

OWNER=$(gh api user --jq .login)
echo "Publishing as $OWNER/$REPO_NAME ..."

# Make sure git has an identity (commit fails silently without one)
git config user.name  >/dev/null 2>&1 || git config user.name "$OWNER"
git config user.email >/dev/null 2>&1 || git config user.email "$(gh api user --jq '.email // (.login + "@users.noreply.github.com")')"

# Fill in the real Pages URL in README before pushing
sed -i "s|[a-z0-9-]*\.github\.io/[a-z0-9-]*/|${OWNER}.github.io/${REPO_NAME}/|" README.md
git add README.md
git -c commit.gpgsign=false commit -q -m "Set live Pages URL for ${OWNER}/${REPO_NAME}" || true

if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "Repo already exists — pushing updates."
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/${OWNER}/${REPO_NAME}.git"
  git push -u origin main
else
  gh repo create "$REPO_NAME" --public --source=. --push \
    --description "Interactive map of the Gospel of John rendered as a city — a collaboration by Ronald & PaulDz"
fi

# Enable GitHub Pages from main branch root
gh api -X POST "repos/${OWNER}/${REPO_NAME}/pages" \
  -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 \
  || gh api -X PUT "repos/${OWNER}/${REPO_NAME}/pages" \
       -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 || true

echo ""
echo "Done. Repo:    https://github.com/${OWNER}/${REPO_NAME}"
echo "Live map:      https://${OWNER}.github.io/${REPO_NAME}/"
echo "(Pages can take a minute or two to go live after the first push.)"
