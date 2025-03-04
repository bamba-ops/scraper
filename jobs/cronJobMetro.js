const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { CAT_URL, CAT_FOLDER, CAT_I_VAR } = require('./utils/categories');
const { cookies } = require('./utils/cookies')


cron.schedule('0 0 * * *', async () => {
    //setTimeout(async () => {
    console.log(`[${new Date().toISOString()}] Lancement du job de metro...`);
    // Définition des tableaux de configuration
    let index = 0;
    // Définition des cookies
    let succes = false;
    for (const cat of CAT_I_VAR) {
        let i = 1;
        while (i < CAT_I_VAR[index]) {
            while (!succes) {

                // Construction des URLs de base et de page
                const baseUrl = "https://www.metro.ca/epicerie-en-ligne/allees";
                const url = `${baseUrl}${CAT_URL[index]}`;
                const url_page = `${baseUrl}${CAT_URL[index]}-page-${i}`;
                const server_url = "http://localhost:80/api/scrape";

                // Détermine l'URL à scraper selon la page
                const target_url = i > 1 ? url_page : url;

                // Préparation de la charge utile (payload) en JSON
                const payload = { url: target_url, cookies: cookies };
                const succes = false;

                try {
                    // Envoi de la requête POST
                    const response = await axios.post(server_url, payload);
                    const html_content = response.data;
                    console.log("Contenu HTML récupéré :");

                    // Dossier de destination
                    const dossier = path.join("scrap_data", CAT_FOLDER[index]);

                    // Génération d'un nom de fichier unique à l'aide d'un UUID
                    const nom_fichier = `${i}-${uuidv4()}.html`;
                    const chemin_fichier = path.join(dossier, nom_fichier);

                    // Création du dossier s'il n'existe pas
                    if (!fs.existsSync(dossier)) {
                        fs.mkdirSync(dossier, { recursive: true });
                        console.log(`📂  Le dossier '${dossier}' a été créé.`);
                    }

                    // Enregistrement du contenu HTML dans le fichier
                    fs.writeFileSync(chemin_fichier, html_content, { encoding: 'utf-8' });
                    console.log(`💾  Le contenu HTML a été enregistré dans '${chemin_fichier}'.`);
                    sucess = true;
                    break;
                } catch (error) {
                    if (error.response) {
                        // Erreur HTTP (code d'erreur reçu)
                        console.error(`Erreur HTTP : ${error.message}`);
                        if (error.response.status !== 500) {
                            break;
                        }
                    } else if (error.request) {
                        // Aucun réponse reçue (problème de connexion)
                        console.error(`Erreur de connexion : ${error.message}`);
                        sucess = true;
                    } else {
                        // Autres erreurs lors de la requête
                        console.error(`Erreur lors de la requête : ${error.message}`);
                        sucess = true;
                    }
                }

            }
            i++;

        }
        index++;

    }
    //}, 5000);


});

console.log(`[${new Date().toISOString()}] Job de metro lancé.`);
