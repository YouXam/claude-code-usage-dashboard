import { apiClient } from './api-client';
import { billingCalculator } from './billing-calculator';
import indexHtml from '../client/index.html';

// Middleware to validate API key and get user ID
const validateApiKey = async (request: Request): Promise<{valid: boolean, userId?: string, error?: string}> => {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return { valid: false, error: 'API key required' };
  }

  try {
    const userId = await apiClient.getKeyId(apiKey);
    return { valid: true, userId };
  } catch (error) {
    return { valid: false, error: 'Invalid API key' };
  }
};

const port = parseInt(process.env.PORT || '3000');

Bun.serve({
  port,
  routes: {
    '/': indexHtml,
    
    '/api/periods': {
      async GET(req) {
        const validation = await validateApiKey(req);
        if (!validation.valid) {
          return new Response(JSON.stringify({ error: validation.error }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        try {
          const periods = await billingCalculator.getPeriods();
          return new Response(JSON.stringify({ periods }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Error getting periods:', error);
          return new Response(JSON.stringify({ error: 'Failed to get periods' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    },
    
    '/api/periods/:index/summary': {
      async GET(req: Request) {
        const validation = await validateApiKey(req);
        if (!validation.valid) {
          return new Response(JSON.stringify({ error: validation.error }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        try {
          const url = new URL(req.url);
          const periodIndex = parseInt(url.pathname.split('/')[3] || '0');
          
          if (isNaN(periodIndex)) {
            return new Response(JSON.stringify({ error: 'Invalid period index' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const summary = await billingCalculator.getPeriodSummary(periodIndex, validation.userId);
          return new Response(JSON.stringify(summary), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Error getting period summary:', error);
          if (error instanceof Error && error.message.includes('not found')) {
            return new Response(JSON.stringify({ error: 'Period not found' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return new Response(JSON.stringify({ error: 'Failed to get period summary' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    },
    
    '/api/periods/:index/me': {
      async GET(req) {
        const validation = await validateApiKey(req);
        if (!validation.valid) {
          return new Response(JSON.stringify({ error: validation.error }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        try {
          const url = new URL(req.url);
          const periodIndex = parseInt(url.pathname.split('/')[3] || '0');
          
          if (isNaN(periodIndex)) {
            return new Response(JSON.stringify({ error: 'Invalid period index' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const userDetail = await billingCalculator.getUserDetail(periodIndex, validation.userId!);
          return new Response(JSON.stringify(userDetail), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Error getting user detail:', error);
          if (error instanceof Error && error.message.includes('not found')) {
            return new Response(JSON.stringify({ error: 'User not found in this period (possibly deleted)' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return new Response(JSON.stringify({ error: 'Failed to get user details' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    },
    
    '/api/auth/test': {
      async POST(req: Request) {
        try {
          const body = await req.json() as { apiKey?: string };
          const { apiKey } = body;
          
          if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API key required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const userId = await apiClient.getKeyId(apiKey);
          return new Response(JSON.stringify({ success: true, userId }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Error testing API key:', error);
          return new Response(JSON.stringify({ error: 'Invalid API key' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  },
  development: {
    hmr: Bun.env.DEV === "development",
    console: Bun.env.DEV === "development"
  }
});

console.log(`Server running on http://localhost:${port}`);