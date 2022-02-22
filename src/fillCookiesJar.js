const createBrowser = require('./createBrowser');
const {Cookie} = require('tough-cookie');
const handleCaptcha = require('./handleCaptcha');
const {isCloudflareJSChallenge, isCloudflareCaptchaChallenge} = require('./utils');
const DEFAULT_EXPIRATION_TIME_IN_SECONDS = 3000;

function convertCookieToTough(cookie) {
    const {name, value, expires, domain, path} = cookie;
    const isExpiresValid = expires && typeof expires === 'number';

    const expiresDate = isExpiresValid
        ? new Date(expires * 1000)
        : new Date(Date.now() + DEFAULT_EXPIRATION_TIME_IN_SECONDS * 1000);

    return new Cookie({
        key: name,
        value,
        expires: expiresDate,
        domain: domain.startsWith('.') ? domain.substring(1) : domain,
        path
    });
}

async function fillCookiesJar(request, options) {
    let {jar, url, uri} = options;
    url = url || uri;
    let browser;

try {
      browser = await createBrowser(options);
        const page = await browser.newPage();
        let response = await page.goto(url, {
            timeout: 45000,
            waitUntil: 'domcontentloaded'
        });

        let count = 1;
        let content = await page.content();

        while (isCloudflareJSChallenge(content)) {
            response = await page.waitForNavigation({
                timeout: 15000,
                waitUntil: 'domcontentloaded'
            });
            await new Promise((resolve) => setTimeout(resolve, 10000));
            content = await page.content();
            if (count++ === 100) {
                throw new Error('timeout on just a moment');
            }
        }

        try {
            content = await page.content();
            await page.select('#table-apps_length select', "5000");
            await new Promise((resolve) => setTimeout(resolve, 10000));
            content = await page.content();
        } catch (err) {
            console.log(err);
        }

        return content;
    } catch (err) {
        console.log(err);
    } finally {
      if(browser)
        await browser.close();
    }
}

module.exports = fillCookiesJar;
