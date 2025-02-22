const express = require('express');
const { spawn } = require("child_process");
const path = require("path");
const { chromium } = require('playwright-chromium');

const router = express.Router();

router.post('/scrape', (req, res) => {
    console.log('🔔  [Server] Requête POST reçue sur /scrape');
    console.log(req.body)
    const url = req.body.url;
    const cookies = req.body.cookies;
    const waitFor = req.body.waitForSelector;
    console.log(`🔍  [Server] Corps de la requête: ${JSON.stringify(req.body)}`);

    if (!url) {
        console.error('❌  [Server] Aucune URL fournie dans la requête.');
        return res.status(400).json({ error: 'L\'URL est requise dans le corps de la requête.' });
    }

    console.log(`🚀  [Server] Démarrage du processus de scraping pour l'URL: ${url}`);
    console.log(`🖥️   [Server] Commande lancée: xvfb-run --server-args="-screen 0 1920x1080x24" node scraper.js ${url}`);

    const scraperPath = path.resolve(__dirname, "../worker/scraper.js");

    // Lancement du processus scraper via xvfb-run
    const args = [
        '--server-args=-screen 0 1920x1080x24',
        'node',
        scraperPath,
        JSON.stringify(req.body)
    ];
    /*
    if(cookies){
            args.push(JSON.stringify(cookies));
    }

    if(waitFor){
if(waitFor){
            args.push(waitFor);
    }
    */
    const scraperProcess = spawn('xvfb-run', args);
    console.log(`🆔  [Server] Processus scraper démarré avec le PID: ${scraperProcess.pid}`);

    let scrapedHTML = '';
    let errorLogs = '';

    // Collecte des données de sortie (stdout) : le contenu HTML
    scraperProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        console.log(`📥  [Server] Données reçues sur stdout (les 100 premiers caractères): ${dataStr.substring(0, 100)}...`);
        scrapedHTML += dataStr;
    });

    // Collecte des logs d'erreur (stderr)
    scraperProcess.stderr.on('data', (data) => {
        const errStr = data.toString();
        console.error(`⚠️ [Server] Données reçues sur stderr: ${errStr}`);
        errorLogs += errStr;
    });

    // Gestion de la fermeture du processus
    scraperProcess.on('close', (code) => {
        console.log(`🔚  [Server] Processus scraper terminé avec le code de sortie: ${code}`);
        if (code === 0) {
            console.log('✅  [Server] Scraping terminé avec succès. Envoi de la réponse HTML.');
            res.set('Content-Type', 'text/html');
            res.send(scrapedHTML);
        } else {
            console.error('❌  [Server] Une erreur est survenue lors du scraping. Détails:', errorLogs);
            res.status(500).json({
                error: 'Erreur lors du scraping',
                details: errorLogs
            });
        }
    });

    // Gestion des erreurs lors du lancement du processus
    scraperProcess.on('error', (err) => {
        console.error(`🚨  [Server] Échec au lancement du processus scraper: ${err}`);
        res.status(500).json({
            error: 'Erreur lors du lancement du processus de scraping',
            details: err.toString()
        });
    });
})

module.exports = router 