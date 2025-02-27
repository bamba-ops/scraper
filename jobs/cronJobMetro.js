const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

setTimeout(async () => {
    console.log(`[${new Date().toISOString()}] Lancement du job de scraping...`);
    // Définition des tableaux de configuration
    const CAT_URL = [
        "/fruits-et-legumes",
        "/produits-laitiers-et-oeufs",
        "/garde-manger",
        "/plats-cuisines",
        "/format-economique",
        "/boissons",
        "/bieres-et-vins",
        "/viandes-et-volailles",
        "/aliments-vegetariens-et-vegetaliens",
        "/epicerie-biologique",
        "/collations",
        "/produits-surgeles",
        "/pains-et-patisseries",
        "/charcuteries-et-plats-prepares",
        "/poissons-et-fruits-de-mer",
        "/cuisine-du-monde",
        "/entretien-menager-et-nettoyage",
        "/bebe",
        "/soins-et-beaute",
        "/essentiels-pour-animaux",
        "/pharmacie"
    ];
    const CAT_FOLDER = [
        "fruits_et_legumes",
        "produits-laitiers-et-oeufs",
        "garde-manger",
        "plats-cuisines",
        "format-economique",
        "boissons",
        "bieres-et-vins",
        "viandes-et-volailles",
        "aliments-vegetariens-et-vegetaliens",
        "epicerie-biologique",
        "collations",
        "produits-surgeles",
        "pains-et-patisseries",
        "charcuteries-et-plats-prepares",
        "poissons-et-fruits-de-mer",
        "cuisine-du-monde",
        "entretien-menager-et-nettoyage",
        "bebe",
        "soins-et-beaute",
        "essentiels-pour-animaux",
        "pharmacie"

    ];
    const CAT_I_VAR = [30, 40, 130, 10, 15, 55, 40, 20, 20, 26, 70, 40, 30, 42, 12, 15, 30, 5, 20, 12, 8];
    let index = 0;
    // Définition des cookies
    let succes = false;
    for (const cat of CAT_I_VAR) {
        let i = 1;
        while (i < CAT_I_VAR[index]) {
            while (!succes) {
                const cookies = [
                    {
                        name: "JSESSIONID",
                        value: "B5F4AD94F355A0458C20BF40DFCD4668",
                        url: "https://www.metro.ca",
                    },
                    {
                        name: "METRO_ANONYMOUS_COOKIE",
                        value: "53221d3b-b05a-4b99-b601-e595ca115f04",
                        url: "https://www.metro.ca",
                    },
                    {
                        name: "CRITEO_RETAILER_VISITOR_COOKIE",
                        value: "5ea44f9b-41f2-466a-a495-cd7f44f5be34",
                        url: "https://www.metro.ca",
                    },
                    {
                        name: "OptanonConsent",
                        value: "geolocation=CA%3BQC",
                        url: "https://www.metro.ca",
                    },
                    { name: "hprl", value: "fr", url: "https://www.metro.ca" },
                    { name: "show-store-banner", value: "true", url: "https://www.metro.ca" },
                    {
                        name: "APP_D_USER_ID",
                        value: "EQJEIlyf-2246925667",
                        url: "https://www.metro.ca",
                    },
                    {
                        name: "coveo_visitorId",
                        value: "3d05ffed-5cff-4a99-8f53-09de61075719",
                        url: "https://www.metro.ca",
                    },
                    {
                        name: "__cf_bm",
                        value:
                            "pSzJbUBQNSLd9K0QQegt7nBy5ebdGtwZhljQKJtzV4Q-1737902064-1.0.1.1-enBZC1LeiB0DTsJhPf19Y69Mnq0XgMFCKdR5nXxT36smsubAd7OdYb7YmhFn5ZiO3YK6WOAlxldUUub2eSLttOTu2SCWZjWmRhF_g.uYGac",
                        url: "https://www.metro.ca",
                    },
                ];

                // Construction des URLs de base et de page
                const baseUrl = "https://www.metro.ca/epicerie-en-ligne/allees";
                const url = `${baseUrl}${cat_url[index]}`;
                const url_page = `${baseUrl}${cat_url[index]}-page-${page}`;
                const server_url = "http://localhost:3000/api/scrape";

                // Détermine l'URL à scraper selon la page
                const target_url = page > 1 ? url_page : url;

                // Préparation de la charge utile (payload) en JSON
                const payload = { url: target_url, cookies: cookies };
                const succes = false;

                try {
                    // Envoi de la requête POST
                    const response = await axios.post(server_url, payload);
                    const html_content = response.data;
                    console.log("Contenu HTML récupéré :");
                    console.log(html_content);

                    // Dossier de destination
                    const dossier = path.join("scrap_data", cat_folder[index]);

                    // Génération d'un nom de fichier unique à l'aide d'un UUID
                    const nom_fichier = `${page}-${uuidv4()}.html`;
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

}, 10000);

//console.log(`[${new Date().toISOString()}] Job de scraping lancé.`);
