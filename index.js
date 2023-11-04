const fs = require('fs');
require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const {Cleanup} = require("./cleanup");

// Write JSON to file when program exits
Cleanup(writeMessagesToFile);

let options = {
    width: 1920,
    height: 1080
};

const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

let messages = [];

(async () => {

    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({
        headless: false,
        args: [`--window-size=${options.width},${options.height}`],
        executablePath: process.env.CHROME_PATH,
        defaultViewPort: null
    });
    const page = await browser.newPage();

    // Set screen size
    //await page.setViewport({width: options.width, height: options.height});

    // Navigate the page to a URL
    await page.goto(process.env.VIDEO_URL);

    try {
        if (process.env.MATURE_AUDIENCES === "true") {
            let startWatchingButton = 'button[data-a-target="content-classification-gate-overlay-start-watching-button"]';
            await page.waitForSelector(startWatchingButton, {visible: true, timeout: 5000});
            await page.click(startWatchingButton);
        }else{
            await page.waitForTimeout(5000)
        }
    } catch (e) {
        console.log("Mature audiences confirmation didn't display");
    }

    const messageProcessQueue = [];

    await page.exposeFunction('addMessageId', messageId =>
        messageProcessQueue.push(messageId)
    );

    await page.evaluate(() => {

        function uuidv4 (){
            let uuid =  "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
            uuid = "a" + uuid.slice(1);
            return uuid;
        }

        let mList = document.querySelector(".video-chat__message-list-wrapper > div > ul");
        let options = {
            childList: true
        };
        let observer = new MutationObserver(mCallback);

        function mCallback(mutations) {
            for (let mutation of mutations) {
                if (mutation.type === 'childList') {
                    console.log(mutation);
                    mutation.addedNodes.forEach(node => {
                        let id = uuidv4();
                        node.id = id;
                        window.addMessageId(id);
                    })
                }
            }
        }
        observer.observe(mList, options);
    });

    setInterval(async () => {
        while(messageProcessQueue.length > 0){
            let id = messageProcessQueue.shift();
            try{
                let message = {};
                const messageRow = await page.$('#' + id);

                // Extract time
                message["time"] = 0;
                let timeElement = await messageRow.$(".tw-interactable > div > p");
                let time = await timeElement.evaluate(el => el.textContent);
                let timeArr = time.split(":");
                for(let i = timeArr.length - 1; i >=0; i--){
                    message["time"] += parseInt(timeArr[i]) * (60 ** (timeArr.length - i - 1));
                }

                // Extract badges
                message["badges"] = [];
                let badgeElements = await messageRow.$$(".chat-badge");
                for(let i = 0; i < badgeElements.length; i++){
                    let src = await badgeElements[i].evaluate(el => el.getAttribute("src"));
                    message["badges"].push(src);
                }

                // Extract username
                let usernameElement = await messageRow.$(".chat-author__display-name");
                message["username"] = await usernameElement.evaluate(el => el.textContent);

                // Extract username color
                let colorRgb = await usernameElement.evaluate(el => el.style.color);
                const regexp = /(?<=rgb\().*(?=\))/g
                let found = colorRgb.match(regexp);
                let parts = found[0].split(", ");
                message["color"] = rgbToHex(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])).toUpperCase();

                // Extract message contents
                message["contents"] = []
                let messageContentElements = await messageRow.$$(".video-chat__message > span:nth-child(2) > *")
                for(let i = 0; i < messageContentElements.length; i ++){
                    let tagName = await messageContentElements[i].evaluate(el => el.tagName);
                    let className = await messageContentElements[i].evaluate(el => el.className);
                    let imgElement = null;
                    try{
                        imgElement = await messageContentElements[i].waitForSelector("img", {visible: true, timeout: 10});;
                    }catch(e){}
                    if(tagName.toLowerCase() === "div" && imgElement){
                        let src = await imgElement.evaluate(el => el.getAttribute("src"));
                        message["contents"].push({
                            type: "image",
                            content: src
                        })
                    }else if (tagName.toLowerCase() === "span" && className === "text-fragment"){
                        let text = await messageContentElements[i].evaluate(el => el.textContent);
                        message["contents"].push({
                            type: "text",
                            content: text
                        })
                    }
                }
                messages.push(message);
                console.log(message);
            }catch(e){
                console.log(e)
            }
        }
    }, 1000);
    //await browser.close();
})();

function writeMessagesToFile(){
    fs.writeFileSync('messages.json', JSON.stringify(messages, null, "\t"))
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}