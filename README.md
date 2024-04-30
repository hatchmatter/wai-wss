WAI Websocket Server

### Setup

- Get `.env.development` file from team
- run `npm i`
- run `npm run dev`
- run `ngrok http 8080` to expose your local server to the internet
- Update the `NEXT_PUBLIC_WSS_URL` in the `.env.local` in the wai-web repo with the public ngrok url

### Running the web socket server in a Dev Container (optional)

- Ensure Dev Containers extension is installed for Visual Studio Code from [here](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
- Build and open your project in a dev container
  - In VS Code, open the Command Pallete
  - Run `Dev Containers: Rebuild and Reopen in Container`
- Run `npm run dev` from the dev container
