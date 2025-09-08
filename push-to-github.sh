#!/bin/bash

# Git push script for Lithos repository

echo "🚀 Preparing to push Lithos to GitHub..."

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Not in a git repository. Initializing..."
    git init
fi

# Add all changes
echo "📦 Adding all changes..."
git add -A

# Create commit
echo "💾 Creating commit..."
git commit -m "feat: Add authentication system and consolidate to single main page

- Implemented complete authentication system with sign-up/login
- Added Supabase integration for user management
- Consolidated dashboard into main page
- Added chat functionality with sidebar
- Protected routes with authentication
- Updated UI components and styling"

# Check if remote exists
if ! git remote | grep -q "origin"; then
    echo "🔗 Adding remote origin..."
    echo "Please enter your GitHub username:"
    read github_username
    git remote add origin https://github.com/$github_username/lithos.git
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
echo "You'll be prompted for your GitHub credentials."
echo "Use your GitHub username and PAT as the password."
git push -u origin main

echo "✅ Done! Your code should now be on GitHub."
echo "🌐 Visit https://github.com/YOUR_USERNAME/lithos to verify"
echo "📝 Next steps:"
echo "  1. Go to Vercel dashboard"
echo "  2. Import the GitHub repository"
echo "  3. Set environment variables in Vercel:"
echo "     - NEXT_PUBLIC_SUPABASE_URL"
echo "     - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "     - SUPABASE_SERVICE_ROLE_KEY"