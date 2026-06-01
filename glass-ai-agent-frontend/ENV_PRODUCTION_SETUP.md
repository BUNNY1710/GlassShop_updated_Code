# Environment Variables Setup for S3 Deployment

## Create `.env.production` file

Create a file named `.env.production` in the `glass-ai-agent-frontend` directory with the following content:

```
REACT_APP_API_URL=http://16.16.73.29
```

## How to Create

### Option 1: Using Terminal
```bash
cd glass-ai-agent-frontend
echo "REACT_APP_API_URL=http://16.16.73.29" > .env.production
```

### Option 2: Manually
1. Create a new file named `.env.production` in `glass-ai-agent-frontend/` directory
2. Add the line: `REACT_APP_API_URL=http://16.16.73.29`
3. Save the file

## Important Notes

- This file is used when you run `npm run build`
- The API URL will be baked into the production build
- If you change the backend URL later, you'll need to rebuild and redeploy
- This file should NOT be committed to git (it's in .gitignore)

## Verification

After building, you can verify the API URL is set correctly by checking the built JavaScript files in `build/static/js/` - they should contain references to `http://16.16.73.29`.

