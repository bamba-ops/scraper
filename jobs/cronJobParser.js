const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const supabase = require('../api/supabase')
const Parser = require('./utils/parser')
const FileManager = require('./models/FileManager')
const storeConfigs = require('./utils/storeConfig'); // tableau de config pour chaque store
const today = new Date().toISOString().split('T')[0];

console.log(`[${today}] Lancement du job de scraping...`);

async function processStore(storeConfig) {
    const { store_id, CAT_FOLDER, name } = storeConfig;
    for (const folder of CAT_FOLDER) {
        const nameOfFolder = `/scrap_data/${name}`
        const fileManager = new FileManager(path.join(__dirname + nameOfFolder, folder))
        const isDirExist = await fileManager.exists('.')
        let folderProducts = [];

        // On vérifie si le dossier existe
        if (!isDirExist) {
            console.warn(`Le dossier ${fileManager.basePath} n'existe pas. On passe à la suite.`);
            continue;
        }


        //process.exit()
        console.log(`Traitement du dossier: ${fileManager.basePath}`);

        // On liste tous les éléments du dossier
        const items = await fileManager.listFiles('.')

        for (const item of items) {
            const fullPath = path.join(fileManager.basePath, item);
            const stats = await fileManager.stat(fullPath)

            // On traite uniquement les fichiers HTML
            // On traite uniquement les fichiers HTML
            if (stats.isFile() && path.extname(item) === '.html') {
                const content = fs.readFileSync(fullPath, 'utf8');

                // Mapping entre le nom et la fonction de parsing correspondante
                const parsers = {
                    'Metro': Parser.metroParser,
                    'SuperC': Parser.superCParser,
                    'IGA': Parser.igaParser
                };

                const parserFunction = parsers[name];
                if (parserFunction) {
                    const result = parserFunction(content);
                    // On vérifie si le résultat est directement un tableau ou bien un objet avec dataProduct
                    let dataProduct;
                    if (Array.isArray(result)) {
                        dataProduct = result;
                    } else if (result && Array.isArray(result.dataProduct)) {
                        dataProduct = result.dataProduct;
                    } else {
                        console.warn(`Le parser pour ${name} n'a pas renvoyé de tableau itérable pour le fichier ${fullPath}`);
                        continue;
                    }

                    //console.log(dataProduct);
                    console.log(`Fichier analysé : ${fullPath}`);
                    folderProducts.push(...dataProduct);
                } else {
                    console.warn(`Aucun parser défini pour ${name}`);
                }
            }



        }


        /*
        // Insertion des données extraites pour le dossier courant (si elles existent)
        if (folderProducts.length > 0) {
            //console.log(`Insertion des données du dossier ${folderPath}`);
            //console.log(folderProducts)
        
            const jsonFilePath = path.join(fileManager.basePath, 'folderProducts.json');
            try {
                await fs.promises.writeFile(jsonFilePath, JSON.stringify(folderProducts, null, 2), 'utf8');
                console.log(`Données enregistrées dans ${jsonFilePath}`);
            } catch (error) {
                console.error(`Erreur lors de l'enregistrement du fichier JSON: ${error}`);
            }
            
            await saveProductAndPrice(folderProducts, store_id, name);
        } else {
            console.log(`Aucune donnée trouvée dans le dossier ${fileManager.basePath}`);
        }

        */

    }
}

async function saveProductAndPrice(dataProduct, store_id, storeName) {
    try {
        console.log('Données avant insertion');
        let dataPrice = [];
        let finalProducts = [];

        // Si le store est "Metro", on effectue la déduplication sur "name_raw"
        if (storeName === 'Metro') {
            finalProducts = Array.from(
                dataProduct.reduce((map, prod) => {
                    if (!map.has(prod.name_raw)) {
                        map.set(prod.name_raw, prod);
                    }
                    return map;
                }, new Map()).values()
            );
        } else {
            // Pour les autres stores, on prend les données telles quelles
            finalProducts = dataProduct;
        }

        // Préparation des données pour l'insertion
        const today = new Date().toISOString().split('T')[0]; // format YYYY-MM-DD
        finalProducts.forEach(prod => {
            dataPrice.push(prod.priceObj);
            delete prod.priceObj;
            prod.store_id = store_id;
            prod.created_date = today;
        });

        console.log('Début insertion en base de données (table products)...');

        // Insertion en BDD - Table "products"
        const { data: productsCreated, error: productError } = await supabase
            .from('products')
            .upsert(finalProducts, {
                onConflict: 'store_id,name_raw,created_date'
            })
            .select();

        if (productError) {
            console.error('Erreur lors de l’insertion dans "products":', productError);
            return;
        }

        console.log('Insertion products réussie, produits créés');

        // Associer l'id du produit inséré aux données de prix
        if (productsCreated && productsCreated.length > 0) {
            for (let i = 0; i < productsCreated.length; i++) {
                dataPrice[i].product_id = productsCreated[i].id;
                dataPrice[i].store_id = store_id;
                dataPrice[i].created_date = today;
            }
        }

        console.log('Insertion des données dans "prices"...');
        const { data: pricesInserted, error: priceError } = await supabase
            .from('prices')
            .upsert(dataPrice, {
                onConflict: 'store_id,product_id,created_date'
            })
            .select();

        if (priceError) {
            console.error('Erreur lors de l’insertion dans "prices":', priceError);
            return;
        }

        console.log('Insertion prices réussie:');
        console.log('Tout est inséré avec succès !');
    } catch (err) {
        console.error('Une erreur est survenue:', err);
    }
}



async function processAllStores() {
    // Traitement séquentiel de chaque store
    for (const config of storeConfigs) {
        await processStore(config);
    }
}

//cron.schedule('45 0 * * *', async () => {
setTimeout(async () => {
    console.log(`[${today}] Lancement du job de parser...`);
    await processAllStores();
}, 1000);
//});

console.log(`[${today}] Job de parser lancé.`);

