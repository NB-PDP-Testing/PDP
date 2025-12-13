# AI API Routes Setup Guide

This guide explains how to set up the AI API routes for coaching recommendations and session plans.

## Overview

The AI API routes act as server-side proxies to the Anthropic Claude API, keeping your API keys secure and avoiding CORS issues.

## Routes Created

1. **`/api/recommendations`** - Generates AI-powered coaching recommendations
2. **`/api/session-plan`** - Generates AI-powered training session plans

## Setup Steps

### Step 1: Get an Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key (starts with `sk-ant-...`)

### Step 2: Add Environment Variable

Add the API key to your environment variables:

#### For Local Development

Create or update `.env.local` in the `apps/web` directory:

```bash
# apps/web/.env.local
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
NEXT_PUBLIC_USE_REAL_AI=true
```

#### For Production (Vercel)

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: Your API key
   - **Environment**: Production, Preview, Development (select all)
4. Add:
   - **Name**: `NEXT_PUBLIC_USE_REAL_AI`
   - **Value**: `true`
   - **Environment**: Production, Preview, Development (select all)

### Step 3: Verify Setup

#### Test Recommendations API

```bash
curl -X POST http://localhost:3000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "teamData": {
      "teamName": "Test Team",
      "playerCount": 10,
      "avgSkillLevel": 3.5,
      "strengths": [{"skill": "Passing", "avg": 4.2}],
      "weaknesses": [{"skill": "Shooting", "avg": 2.1}],
      "attendanceIssues": 2,
      "overdueReviews": 1,
      "players": []
    }
  }'
```

#### Test Session Plan API

```bash
curl -X POST http://localhost:3000/api/session-plan \
  -H "Content-Type: application/json" \
  -d '{
    "teamData": {
      "teamName": "Test Team",
      "playerCount": 10,
      "ageGroup": "U12",
      "strengths": [{"skill": "Passing", "avg": 4.2}],
      "weaknesses": [{"skill": "Shooting", "avg": 2.1}]
    },
    "focus": "Shooting"
  }'
```

## How It Works

### Client-Side (`apps/web/src/lib/ai-service.ts`)

1. Checks if real AI should be used:
   - `NEXT_PUBLIC_USE_REAL_AI=true` enables real AI
   - Falls back to simulated mode if false or on localhost

2. Makes POST request to API route:
   ```typescript
   fetch("/api/recommendations", {
     method: "POST",
     body: JSON.stringify({ teamData }),
   });
   ```

### Server-Side (API Routes)

1. **`/api/recommendations/route.ts`**:
   - Receives team data from client
   - Builds coaching prompt
   - Calls Anthropic Claude API
   - Returns AI recommendations

2. **`/api/session-plan/route.ts`**:
   - Receives team data and optional focus area
   - Builds session plan prompt
   - Calls Anthropic Claude API
   - Returns AI-generated session plan

## Environment Variables

| Variable | Description | Required | Location |
|----------|-------------|----------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Yes | Server-side only |
| `NEXT_PUBLIC_USE_REAL_AI` | Enable real AI (vs simulated) | No | Client-side |

## Fallback Behavior

If the API key is not configured or the API call fails:

- **Recommendations**: Falls back to `generateSimulatedRecommendations()`
- **Session Plans**: Falls back to `generateSimulatedSessionPlan()`

The simulated mode provides basic recommendations based on team data without requiring an API key.

## Cost Considerations

- **Model**: `claude-3-5-haiku-20241022` (fastest, most cost-effective)
- **Recommendations**: ~1500 tokens per request (~$0.001 per request)
- **Session Plans**: ~1200 tokens per request (~$0.0008 per request)

For cost estimates, see [Anthropic Pricing](https://www.anthropic.com/pricing)

## Troubleshooting

### API Key Not Working

1. Verify the key is set in environment variables
2. Check that the key starts with `sk-ant-`
3. Ensure the key has proper permissions
4. Check server logs for detailed error messages

### CORS Errors

The API routes are server-side, so CORS shouldn't be an issue. If you see CORS errors:
- Verify you're calling from the same domain
- Check that the API route is accessible

### Timeout Errors

- Default timeout is 30 seconds
- If requests timeout, check your network connection
- Consider increasing timeout in `ai-service.ts` if needed

## Security Notes

- ✅ API key is stored server-side only (never exposed to client)
- ✅ API routes validate input before calling external API
- ✅ Error messages don't expose sensitive information
- ⚠️ Rate limiting should be added for production use

## Next Steps

1. Add rate limiting to prevent abuse
2. Add request logging for monitoring
3. Consider caching responses for similar team data
4. Add user authentication checks if needed

