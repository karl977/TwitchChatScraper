# Twitch Chat Scraper

This project allows to scrape the chat of Twitch VOD and save the result in JSON format.
## Example output
```json
[
    {
        "time": 13,
        "badges": [
            "https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1",
            "https://static-cdn.jtvnw.net/badges/v1/3158e758-3cb4-43c5-94b3-7639810451c5/1"
        ],
        "username": "Vanidor",
        "color": "#FFAFC7",
        "contents": [
            {
                "type": "text",
                "content": ":3"
            },
            {
                "type": "image",
                "content": "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_61bc9ef578ee473faa5e3d4533f4aff4/default/dark/1.0"
            }
        ]
    }
]
```

## Env file
- VIDEO_URL - Twitch VOD URL
- MATURE_AUDIENCES - whether to search for Mature Audiences confirmation button on page load
- CHROME_PATH - Chrome path (Puppeteer default Chromium browser does not support playing videos on Twitch)

## Run
- `npm install` or `yarn`
- `node index.js`


The resulting JSON in stored into `messages.json` on program exit (Ctrl+C or stop button in WebStorm)
## Improvements
- Detect and save links separately (besides image and text types)