# Padlock

> Simple CloudFlare worker to lock redirects to a certain Microsoft oAuth domain.

## Setting up

### Requirements

- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

These instructions assume you have basic familiarity with using Wrangler and have it installed and authenticated to a CloudFlare account.

### Creating a Microsoft oAuth Application

1. Access the [Azure Portal](https://portal.azure.com) and click "Microsoft Entra ID", in the overview section click "app registrations" and finally click "new registration"
2. Fill out the application name, account type and add in a redirect URL
3. On the next page take note of the `Application (client) ID` and the `Directory (tenant) ID`
4. On the sidebar, click "Certificates & Secrets" and click "New client secret", create a client secret and take note of the `value`

### Configure & Deploy

1. Using the example, create the wrangler.toml
```bash
cp wrangler-example.toml wrangler.toml
```
2. Using your editor of choice, fill out the enviornment variables
3. Using wrangler, add the client secret
```bash
wrangler secret put clientSecret
```
4. Using wrangler, deploy
```
wrangler deploy
```


