# Environment Setup Guide

## Required Environment Variables

To enable the chat functionality in Lithos, you need to configure the following environment variables:

### 1. Create `.env.local` file

Create a `.env.local` file in the project root directory with the following content:

```bash
# OpenAI Configuration (REQUIRED for chat functionality)
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration (REQUIRED for database functionality)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional Configuration
NEXT_PUBLIC_URL=http://localhost:3000
```

### 2. Get Your API Keys

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key and paste it in your `.env.local` file

#### Supabase Configuration
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Go to Settings > API
4. Copy the "Project URL" and "anon public" key
5. Paste them in your `.env.local` file

### 3. Restart the Development Server

After adding your environment variables:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

## Troubleshooting

### Chat Not Responding
- **Issue**: Chat doesn't respond to messages
- **Solution**: Check that your OpenAI API key is correctly set in `.env.local`
- **Verify**: The console should not show "OpenAI API key not configured"

### API Key Invalid
- **Issue**: Getting "Invalid API Key" errors
- **Solution**: 
  1. Verify your API key is correct
  2. Check that you have credits/billing set up on OpenAI
  3. Ensure the key hasn't been revoked

### Rate Limits
- **Issue**: "Rate limit exceeded" errors
- **Solution**: 
  1. Wait a few minutes before trying again
  2. Consider upgrading your OpenAI plan
  3. Implement request throttling if needed

### Database Connection Issues
- **Issue**: Database context not loading
- **Solution**: 
  1. Verify Supabase URL and anon key are correct
  2. Check that your Supabase project is active
  3. Ensure tables are properly migrated

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env.local` to version control**
   - It's already in `.gitignore` by default
   - Keep your API keys secret

2. **Use environment variables in production**
   - Set these in your hosting platform (Vercel, Netlify, etc.)
   - Never hardcode API keys in your code

3. **Rotate keys regularly**
   - If a key is compromised, regenerate it immediately
   - Update all environments with the new key

## Need Help?

If you're still experiencing issues:

1. Check the browser console for error messages
2. Check the terminal/server logs for backend errors
3. Verify all environment variables are correctly set
4. Ensure you have an active internet connection
5. Try clearing your browser cache and cookies

For additional support, please refer to the project documentation or create an issue on GitHub.
