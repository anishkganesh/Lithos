# GitHub Push Instructions

Your code has been committed and is ready to push to GitHub. Follow these steps:

## Option 1: Command Line (Recommended)

Run this command in your terminal:

```bash
cd /Users/anishkganesh/Downloads/lithos
git push origin main
```

When prompted:
- Username: `anishkganesh`
- Password: Use your Personal Access Token (PAT)

## Option 2: Update Remote with Token

Run this command (replace YOUR_PAT with your actual token):

```bash
git remote set-url origin https://anishkganesh:YOUR_PAT@github.com/anishkganesh/Lithos.git
git push origin main
```

## Option 3: Use GitHub Desktop

1. Open GitHub Desktop
2. Add this repository: `/Users/anishkganesh/Downloads/lithos`
3. Push the commits

## Current Status

✅ All changes have been committed
✅ Commit message: "feat: Add authentication system and consolidate to single main page"
✅ Ready to push to GitHub

## After Pushing

1. Visit https://github.com/anishkganesh/Lithos to verify
2. Go to your Vercel dashboard
3. Import the repository if not already done
4. Set these environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Security Note

**NEVER share your GitHub Personal Access Token with anyone or commit it to code.**
After pushing, consider regenerating your PAT if it was exposed.
