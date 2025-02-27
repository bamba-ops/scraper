const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio'); // Installer Cheerio si besoin: npm install cheerio



setTimeout(async () => {
    console.log(`[${new Date().toISOString()}] Lancement du job de scraping...`);


    // Répertoire racine à parcourir
    const baseDir = '/home/w_gharbi_tangerine/scraper/jobs/scrap_data';

    // Fonction de parsing: c'est ici que vous implémentez votre logique 
    // pour extraire les données du HTML. 
    // Vous pouvez la personnaliser selon vos besoins.
    function parseHtmlContent(htmlContent) {
        // Avec Cheerio, on charge le contenu HTML
        const $ = cheerio.load(htmlContent);

        // Exemple: récupérer le titre de la page
        const title = $('title').text();

        // Exemple: récupérer tous les liens
        const links = [];
        $('a').each((i, el) => {
            links.push($(el).attr('href'));
        });

        // Retourne un objet avec les données extraites
        return {
            title,
            links
        };
    }

    // Fonction récursive pour parcourir un répertoire et ses sous-répertoires
    function parseDirectory(directoryPath) {
        // On liste le contenu du répertoire
        const items = fs.readdirSync(directoryPath);

        for (const item of items) {
            const fullPath = path.join(directoryPath, item);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                // Si c'est un dossier, on le parcourt récursivement
                parseDirectory(fullPath);
            } else if (stats.isFile() && path.extname(item) === '.html') {
                // Si c'est un fichier HTML, on le parse
                const content = fs.readFileSync(fullPath, 'utf8');

                // Extraire les données
                const extractedData = parseHtmlContent(content);

                // Afficher le résultat (ou l'enregistrer dans une base, un fichier JSON, etc.)
                console.log(`Fichier analysé : ${fullPath}`);
                console.log(extractedData);
            }
        }
    }

    // Exécuter le script
    parseDirectory(baseDir);



}, 10000);

//console.log(`[${new Date().toISOString()}] Job de scraping lancé.`);
