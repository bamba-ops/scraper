const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const FileManager = require('./models/FileManager')
const path = require('path');
const { v4: uuidv4 } = require('uuid');
//const { CAT_URL, CAT_FOLDER, CAT_I_VAR } = require('./utils/categories');
const { cookies, cookies_iga } = require('./utils/cookies');
const storeConfigs = require('./utils/storeConfig'); // tableau de config pour chaque store

const serverUrl = "http://localhost:80/api/scrape";



// Planifie le job tous les jours à minuit (0 0 * * *)
//cron.schedule('0 0 * * *', async () => {
setTimeout(async () => {
    console.log(`[${new Date().toISOString()}] Lancement du job de metro...`);

    for (const config of storeConfigs) {
        const { CAT_FOLDER, CAT_I_VAR, CAT_URL, name, baseUrl } = config;
        const nameOfFolder = `/scrap_data/${name}`
        const nameOfFolderForJoin = `scrap_data/${name}`
        const fileManager = new FileManager(__dirname + nameOfFolder)
        const isDirExist = await fileManager.exists('.');

        if (isDirExist) {
            await fileManager.deleteDir('.')
            console.log(`Le dossier '${nameOfFolder}' a été supprimé.`);
        } else {
            console.log(`Le dossier '${nameOfFolder}' n'existe pas.`);
        }

        // Boucle sur chaque catégorie
        for (let index = 0; index < CAT_I_VAR.length; index++) {
            const maxPage = CAT_I_VAR[index];  // Nombre de pages à scraper pour cette catégorie

            // Boucle sur chaque page
            for (let i = 1; i < maxPage; i++) {
                // Détermine l'URL de la page
                let pageUrl = null;
                if (name != 'IGA') {
                    pageUrl = (i > 1)
                        ? `${baseUrl}${CAT_URL[index]}-page-${i}`
                        : `${baseUrl}${CAT_URL[index]}`;

                } else {
                    pageUrl = (i > 1)
                        ? `${baseUrl}/parcourir?page=${i}&pageSize=24`
                        : `${baseUrl}/parcourir`
                }

                console.log(pageUrl)

                // Prépare le payload pour le scraping
                const payload = {
                    url: pageUrl,
                    cookies: cookies
                };

                // On peut définir un nombre maximum de tentatives
                let attempts = 0;
                let success = false;

                // Boucle de retry : réessayer jusqu'à 3 fois en cas d'erreur 500
                while (!success && attempts < 3) {
                    try {
                        // Envoi de la requête POST à notre serveur local
                        const response = await axios.post(serverUrl, payload);
                        const htmlContent = response.data;

                        // Création du dossier si besoin
                        const folderPath = path.join(nameOfFolderForJoin, CAT_FOLDER[index]);
                        if (!fs.existsSync(folderPath)) {
                            fs.mkdirSync(folderPath, { recursive: true });
                            console.log(`📂  Dossier créé : '${folderPath}'`);
                        }

                        // Génération d'un nom de fichier unique
                        const fileName = `${i}-${uuidv4()}.html`;
                        const filePath = path.join(folderPath, fileName);

                        // Écriture du contenu HTML dans le fichier
                        fs.writeFileSync(filePath, htmlContent, { encoding: 'utf-8' });
                        console.log(`💾  Contenu HTML enregistré dans '${filePath}'.`);

                        // Si tout se passe bien, on sort de la boucle de retry
                        success = true;

                    } catch (error) {
                        attempts++;

                        // Si on a une réponse HTTP (erreur 4xx ou 5xx)
                        if (error.response) {
                            console.error(`Erreur HTTP (status: ${error.response.status}): ${error.message}`);

                            // Si ce n'est pas une erreur 500, on ne retente pas
                            if (error.response.status !== 500) {
                                success = true;  // On arrête de boucler
                            }

                            // Si on n'a pas de réponse (problème de réseau, timeout, etc.)
                        } else if (error.request) {
                            console.error(`Erreur de connexion : ${error.message}`);

                            // Autres types d'erreurs (erreur de code, etc.)
                        } else {
                            console.error(`Erreur lors de la requête : ${error.message}`);
                        }

                        // Si on a atteint le max de tentatives, on arrête
                        if (attempts >= 3) {
                            console.error("Nombre maximal de tentatives atteint, on passe à la page suivante.");
                            success = true;
                        }
                    }
                }
            }
        }
    }


    console.log(`[${new Date().toISOString()}] Job de metro terminé.`);
}, 5000);
//});

console.log(`[${new Date().toISOString()}] Job de metro programmé.`);

