// scraper.js
const { chromium } = require('playwright-chromium');

const log = (...args) => console.error(...args);

(async () => {
    try {
        //const url = process.argv[2] || 'https://example.com';
        //log(`🚀  Starting Playwright Scraper for ${url}...`);
        //let cookies = [];
        //let waitForSelector = "";
        //let url = "";
        const req = JSON.parse(process.argv[2])
        /*
    if(process.argv.length >= 4){
            try {
            cookies = JSON.parse(process.argv[3]);
            waitFor = process.argv[4];
                    log(waitFor)
                    //log(`🍪  Cookies reçus: ${JSON.stringify(cookies)}`);
        } catch (err) {
                console.log(err)
           // log("🚨  [Scraper] Erreur lors du parsing des cookies:", err);
        }
    }
    */



        const browser = await chromium.launch({
            headless: false, // Obligé de garder headless false
            args: [
                "--disable-blink-features=AutomationControlled",
                "--blink-settings=imagesEnabled=false",
                "--disable-extensions",
                "--disable-dev-shm-usage",
                "--no-sandbox",
            ]
        });




        const context = await browser.newContext({
            viewport: { width: 1366, height: 768 }
        });


        const page = await context.newPage();

        await page.addInitScript(() => {
            // Masquer la propriété navigator.webdriver
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
            // Simuler la présence de plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            // Définir les langues du navigateur
            Object.defineProperty(navigator, 'languages', {
                get: () => ['fr-FR', 'fr'],
            });
        });

        //log(`🔗  Navigating to ${url}...`);
        if (req.cookies) {
            await page.context().addCookies(req.cookies);
            //log(`🍪  ${cookies.length} cookie(s) ajoutés au contexte.`);
        }
        await page.goto(req.url, { waitUntil: 'domcontentloaded' });
        if (req.waitForSelector) {
            await page.waitForSelector(req.waitForSelector);
        }
        const htmlContent = await page.content();

        await context.clearCookies();
        await context.close();
        await browser.close();

        // Affiche uniquement le HTML sur stdout
        process.stdout.write(htmlContent);
    } catch (error) {
        // Affiche l'erreur sur stderr et force un exit avec un code d'erreur
        console.error("🚨  [Scraper] Une erreur s'est produite :", error);

        process.exit(1);
    }
})();