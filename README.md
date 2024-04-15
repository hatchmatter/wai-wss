WAI Websocket Server

### Setup

- Get `.env.development` file from team
- run `npm i`
- run `npm run dev`
- run `ngrok http 8080` to expose your local server to the internet
- Update the `NEXT_PUBLIC_WSS_URL` in the `.env.local` in the wai-web repo with the public ngrok url