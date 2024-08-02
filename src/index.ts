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
  id?: string;
  username?: string;
  discriminator?: string;
  email?: string;
  verified?: boolean;
  error?: string;
}

interface Guild {
  id: string;
  name: string;
  owner: boolean;
  permissions: string;
}

interface MemberData {
  roles: string[];
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url: URL = new URL(request.url);
  const path: string = url.pathname;

  if (path === '/') { // If we're at the root path, redirect to the Discord login page
    return Response.redirect(`https://discord.com/api/oauth2/authorize?client_id=${env.clientId}&redirect_uri=${encodeURIComponent(env.redirectUri)}&response_type=code&scope=identify email guilds`);
  } else if (path === '/redirect') { // If we're at the redirect path, handle the authorization code
    const code: string | null = url.searchParams.get('code');
    if (!code) {
      return new Response('Authorization code not found.', { status: 400 });
    }

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `client_id=${env.clientId}&client_secret=${env.clientSecret}&grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(env.redirectUri)}`,
    });

    const tokenData: TokenResponse = await tokenResponse.json();

    if (tokenData.error) {
      return new Response(tokenData.error_description || 'Error fetching token', { status: 400 });
    }

    // Using the access token we obtained, fetch the user data

    const userDataResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const userData: UserData = await userDataResponse.json();

    if (userData.error) {
      return new Response(userData.error, { status: 400 });
    }

    // Fetch the user's guilds
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const guilds: Guild[] = await guildsResponse.json();

    // Check if the user is in the required guilds and has the necessary roles
    let authorized = false;

    for (const requiredGuild of env.guilds) {
      const guild = guilds.find(g => g.id === requiredGuild.id);

      if (guild) {
        const memberResponse = await fetch(`https://discord.com/api/guilds/${guild.id}/members/${userData.id}`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });

        const memberData: MemberData = await memberResponse.json();

        if (memberData.roles) {
          const hasAllRoles = requiredGuild.roleIDs.every(roleID => memberData.roles.includes(roleID));
          if (hasAllRoles) {
            authorized = true;
            break;
          }
        }
      }
    }

    if (authorized) {
      return Response.redirect(env.successRedirectUrl);
    } else {
      return new Response('Authentication failed', { status: 401 });
    }
  }

  return new Response('Not found', { status: 404 });
}
