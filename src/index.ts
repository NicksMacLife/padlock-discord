export interface Env {
    clientId: event.env.clientId,
    clientSecret: event.env.clientSecret,
    tenantId: event.env.tenantId,
    redirectUri: event.env.redirectUri,
    targetDomain: event.env.targetDomain,
    successRedirectUrl: event.env.successRedirectUrl,
};

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return handleRequest(request, env);
	}
};

// Generic interfaces for the token and user data responses

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface UserData {
  organization?: string;
  error?: string;
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url: URL = new URL(request.url);
  const path: string = url.pathname;

  if (path === '/') { // If we're at the root path, redirect to the Microsoft login page
    return Response.redirect(`https://login.microsoftonline.com/${env.tenantId}/oauth2/v2.0/authorize?client_id=${env.clientId}&response_type=code&redirect_uri=${encodeURIComponent(env.redirectUri)}&response_mode=query&scope=User.Read`);
  } else if (path === '/redirect') { // If we're at the redirect path, handle the authorization code
    const code: string | null = url.searchParams.get('code');
    if (!code) {
      return new Response('Authorization code not found.', { status: 400 });
    }

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${env.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `client_id=${env.clientId}&scope=User.Read&code=${code}&redirect_uri=${encodeURIComponent(env.redirectUri)}&grant_type=authorization_code&client_secret=${env.clientSecret}`,
    });

    const tokenData: TokenResponse = await tokenResponse.json();

    if (tokenData.error) {
      return new Response(tokenData.error_description || 'Error fetching token', { status: 400 });
    }

    // Using the access token we obtained, fetch the user data

    const userDataResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const userData: UserData = await userDataResponse.json();

    if (userData.error) {
      return new Response(userData.error, { status: 400 });
    }


    if (userData.mail && userData.mail.endsWith(env.targetDomain)) { // If the user is authenticated and has the correct domain, redirect to the success URL
      return Response.redirect(env.successRedirectUrl);
    } else {  // If the user is authenticated but doesn't have the correct domain, return a 401
      return new Response('Authentication failed', { status: 401 });
    }
  }

  return new Response('Not found', { status: 404 });
}

