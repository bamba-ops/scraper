const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio'); // Installer Cheerio si besoin: npm install cheerio
const supabase = require('../api/supabase')
const { CAT_URL, CAT_FOLDER, CAT_I_VAR } = require('./utils/categories');


function cleanBrand(brandText) {
    // On retire les espaces suivis d'un ou plusieurs chiffres et d'une unité parmi mL, L ou g
    return brandText.replace(/\s*\d+\s*(mL|L|g)\b/i, '').trim();
}

function cleanPart(text) {
    // 1) Remove numbers
    let textWithoutNumbers = text.replace(/\d+/g, '');

    // 2) Remove specific units
    const unitsToRemove = new Set(['mL', 'L', '%', 'g']);
    let words = textWithoutNumbers.split(/\s+/);

    // Filter out words that are in `unitsToRemove`
    words = words.filter((word) => !unitsToRemove.has(word));

    // 3) Remove single-character words
    words = words.filter((word) => word.length > 1);

    // 4) Rebuild the string
    return words.join(' ');
}

/**
 * Process a single name:
 *   - If there's a comma, split into two parts.
 *   - Clean each part separately.
 *   - Rejoin them only if both parts are non-empty.
 */
function cleanName(text) {
    if (text.includes(',')) {
        const parts = text.split(',', 2); // split into max 2 parts
        const before = cleanPart(parts[0]);
        const after = cleanPart(parts[1]);

        if (before && after) {
            return `${before}, ${after}`;
        } else if (before) {
            return before;
        } else if (after) {
            return after;
        } else {
            return '';
        }
    } else {
        // No comma, clean the entire string
        return cleanPart(text);
    }
}

/**
 * Main function: cleans a list of strings by:
 *   - Removing numbers
 *   - Stripping out specific units
 *   - Removing single-character words
 *   - Handling comma-separated parts
 */
function clean_name_list(names) {
    return names.map(cleanName);
}


function handle_clean_text(text) {
    // Replace multiple whitespace chars (\s+) with a single space, then trim
    return text.replace(/\s+/g, ' ').trim();
}

function handle_extract_unit_and_value(inputString) {
    // Common measurement units
    const units = ["g", "kg", "ml", "l", "cm", "m", "km", "oz", "lb", "x"];

    // Build a dynamic RegExp similar to the Python pattern:
    // (\b\d+(?:\.\d+)?(?:\s*[xX\*]\s*\d+)?\s*(?:g|kg|ml|l|cm|m|km|oz|lb|x))
    // 'i' flag for case-insensitive search
    const pattern = new RegExp(
        "(\\b\\d+(?:\\.\\d+)?(?:\\s*[xX\\*]\\s*\\d+)?\\s*(?:" + units.join("|") + "))",
        "i"
    );

    // Attempt to match
    const match = inputString.match(pattern);
    if (match) {
        // match[1] is the capturing group (the entire matched string in this case)
        const result = match[1].trim();
        return result;
    }

    // If no match, return an empty string
    return "";
}

function extraire_prix_un_metro(listePrix) {
    const prixExtraits = [];

    for (const element of listePrix) {
        // Check if the element matches "quantity / price $"
        const match = element.match(/(\d+)\s*\/\s*([\d,]+)\s*\$/);
        if (match) {
            // e.g., "2 / 10,99 $"
            const quantite = match[1];
            const prix = parseFloat(match[2].replace(',', '.'));
            prixExtraits.push([quantite, prix]);
        } else {
            // Otherwise, check for a simpler price like "9,50 $"
            const matchSimple = element.match(/([\d,]+)\s*\$/);
            if (matchSimple) {
                const prix = parseFloat(matchSimple[1].replace(',', '.'));
                prixExtraits.push(prix);
            }
        }
    }

    return prixExtraits;
}

function handle_standardize_units_2(data) {
    for (const item of data) {
        // Convert the unit to lowercase for comparison
        const unitLower = (item.unit || '').toLowerCase();
        //console.log(item); // Equivalent to Python's print(item)

        // 3) Case "g" => convert to "kg"
        // Example logic: price per 100g => price per 1kg => multiply price by 10
        // The Python code: (item["price"] * 1000) / 100 = item["price"] * 10
        if (unitLower.includes('g') && unitLower !== 'kg') {
            item.price = (item.price * 1000) / 100; // e.g., multiply by 10
            item.unit = 'kg';
        }

        // 4) Case "kg" => do nothing

        // 5) Case "ml" => convert to "L"
        // The Python code: (item["price"] * 1000) / 100 = item["price"] * 10
        // e.g., price for 100ml => price per 1L => multiply by 10
        if (unitLower.includes('ml') && unitLower !== 'l') {
            item.price = (item.price * 1000) / 100;
            item.unit = 'L';
        }

        // If "lb" is found, remove price & unit
        if (unitLower.includes('lb')) {
            delete item.price;
            delete item.unit;
        }

        // 6) Case "l" => set to "L"
        if (unitLower === 'l') {
            item.unit = 'L';
        }
    }

    return data;
}

/**
 * 1) Remove segments like "<price> $ ch." (no slash)
 *    e.g. "4,39 $ ch." -> removed
 *    Keep the rest (e.g. "1,43 $ /100g" stays unchanged)
 */
function removeChPrices(line) {
    // Equivalent to Python:
    // re.sub(r"\d+,\d+\s*\$\s*ch\.", "", line, flags=re.IGNORECASE)
    return line.replace(/\d+,\d+\s*\$\s*ch\./gi, '');
}

/**
 * 2) Insert a space between the unit and any immediately-following price
 *    e.g. "1,52 $ /kg0,69 $ /lb." -> "1,52 $ /kg 0,69 $ /lb."
 */
function separatePriceUnits(line) {
    // Equivalent to Python:
    // pattern = r"(kg|lb|g|ml|[0-9]+g|[0-9]+ml)(\d+,\d+)"
    // re.sub(pattern, r"\1 \2", line)
    const pattern = /(kg|lb|g|ml|\d+g|\d+ml)(\d+,\d+)/gi;
    return line.replace(pattern, '$1 $2');
}

/**
 * 3) Extract "<price> $ /<unit>" occurrences
 *    - Ignore "... $ ch." (handled by removeChPrices)
 *    - Skip any matches with "lb" in the unit
 */
function handle_extract_prices_metro_2(data) {
    const pattern = new RegExp('(\\d+,\\d+)\\s*\\$\\s*/(\\w+)\\.?', 'i');

    const cleanedData = [];

    for (let line of data) {
        // 1) Remove "XX,XX $ ch."
        line = removeChPrices(line);

        // 2) Separate "kg0,69" => "kg 0,69"
        line = separatePriceUnits(line);

        // 3) Extract the prices with the pattern
        // Use matchAll to find all matches in the line
        const matches = line.matchAll(new RegExp(pattern, 'gi'));
        for (const match of matches) {
            // match[1] => price_str (e.g., "9,99")
            // match[2] => unit_str  (e.g., "kg")
            const priceStr = match[1];
            const unitStr = match[2];

            // Skip if the unit is "lb"
            if (unitStr.toLowerCase().includes('lb')) {
                continue;
            }

            // Convert "9,99" to 9.99
            const price = parseFloat(priceStr.replace(',', '.'));
            cleanedData.push({ price, unit: unitStr });
        }
    }

    return cleanedData;
}




console.log(`[${new Date().toISOString()}] Lancement du job de scraping...`);

// Répertoire racine à parcourir
const baseDir = '/home/w_gharbi_tangerine/scraper/jobs/scrap_data';

// Fonction de parsing: c'est ici que vous implémentez votre logique 
// pour extraire les données du HTML. 
// Vous pouvez la personnaliser selon vos besoins.
function parseHtmlContent(htmlContent) {
    const $ = cheerio.load(htmlContent);
    // Equivalent to the Python lists
    const nameValue = [];
    const brandValue = [];
    const unitValue = [];
    const imgSrc = [];
    const priceValue = [];
    const dataProduct = [];
    const dataPrice = [];
    const priceUnValue = [];

    // Equivalent to: container = soup.select_one("div.products-search--grid.searchOnlineResults")
    const container = $('div.products-search--grid.searchOnlineResults');

    // If container not found, return empty array
    if (!container || container.length === 0) {
        console.log('Aucun produit trouvé.');
        return { dataProduct, dataPrice };
    }

    // Equivalent to the Python "select" calls
    const pictureElements = container.find('picture.defaultable-picture');
    const nameElements = container.find('div.content__head');
    const priceElements = container.find('div.pricing__secondary-price');
    const priceUnElements = container.find('div.pricing__sale-price');

    // -- 1) Loop over name elements --
    nameElements.each((_, el) => {
        const _title_unit = $(el).find('a');
        const _brand = $(el).find('span');
        if (_brand.length > 0 || _title_unit.length > 0) {
            nameValue.push(handle_clean_text(_title_unit.text().trim()));
            brandValue.push(cleanBrand(handle_clean_text(_brand.text().trim())));
            unitValue.push(
                handle_extract_unit_and_value(
                    handle_clean_text(_title_unit.text().trim())
                )
            );
        }
    });

    // -- 2) Loop over picture elements --
    pictureElements.each((_, el) => {
        const img = $(el).find('img');
        if (img && img.attr('src')) {
            imgSrc.push(img.attr('src'));
        }
    });

    // -- 3) Loop over price elements --
    priceElements.each((_, el) => {
        // Python code uses price.text -> the entire text inside that element
        priceValue.push($(el).text());
    });

    // -- 4) Loop over price_un elements --
    priceUnElements.each((_, el) => {
        priceUnValue.push(handle_clean_text($(el).text()));
    });

    // Equivalent to price_un_value_extrait = extraire_prix_un_metro(price_un_value)
    const priceUnValueExtrait = extraire_prix_un_metro(priceUnValue);

    // Print out the zipped "price" and "price_extrait"
    /*
    for (let i = 0; i < priceUnValue.length; i++) {
        console.log(`Price: ${priceUnValue[i]}\nPrice Extrait: ${priceUnValueExtrait[i]}`);
    }
        */

    if (priceValue.length === priceUnValueExtrait.length) {
        const cleanedNameList = clean_name_list(nameValue);
        const standardizedPrices = handle_standardize_units_2(
            handle_extract_prices_metro_2(priceValue)
        );

        for (let i = 0; i < priceValue.length; i++) {
            const name = cleanedNameList[i];
            const name_raw = nameValue[i];
            const brand = brandValue[i];
            const unit = unitValue[i];
            const img = imgSrc[i];
            const priceObj = standardizedPrices[i];
            const price_extrait = priceUnValueExtrait[i];

            // Si priceObj n'existe pas, on "skip" cette itération
            if (!priceObj) {
                //console.log(`priceObj est undefined pour l'index ${i}. On ignore cet élément...`);
                continue; // Passe à l'itération suivante
            }

            //console.log(priceObj);

            if (name && priceObj) {
                // Check if the extracted price is an array (promo) or not
                if (Array.isArray(price_extrait)) {
                    // Example: price_extrait = [quantity, price_un]
                    priceObj.price_un = price_extrait[1];
                    priceObj.quantity = price_extrait[0];
                    priceObj.is_promo = true;
                    dataProduct.push({
                        name,
                        name_raw,
                        image_url: img,
                        brand,
                        unit,
                        priceObj
                    });
                } else {
                    // Non-promo
                    //console.log('priceObj avant set :', priceObj);
                    priceObj.price_un = price_extrait;
                    priceObj.is_promo = false;
                    dataProduct.push({
                        name,
                        name_raw,
                        image_url: img,
                        brand,
                        unit,
                        priceObj
                    });
                }
            }
        }
        //console.log(data);
    }

    return { dataProduct };
}

async function processFolders() {
    for (const folder of CAT_FOLDER) {
        const folderPath = path.join(baseDir, folder);
        console.log(`Traitement du dossier: ${folderPath}`);

        // Accumule les produits extraits du dossier courant
        let folderProducts = [];

        // On liste tous les éléments du dossier
        const items = fs.readdirSync(folderPath);
        for (const item of items) {
            const fullPath = path.join(folderPath, item);
            const stats = fs.statSync(fullPath);

            // On traite uniquement les fichiers HTML
            if (stats.isFile() && path.extname(item) === '.html') {
                const content = fs.readFileSync(fullPath, 'utf8');
                const { dataProduct } = parseHtmlContent(content);
                console.log(`Fichier analysé : ${fullPath}`);
                //console.log(dataProduct);
                folderProducts.push(...dataProduct);
            }
        }

        // Insertion des données extraites pour le dossier courant (si elles existent)
        if (folderProducts.length > 0) {
            //console.log(`Insertion des données du dossier ${folderPath}`);
            await saveProductAndPriceMetro(folderProducts);
        } else {
            console.log(`Aucune donnée trouvée dans le dossier ${folderPath}`);
        }
    }
}

async function saveProductAndPriceMetro(dataProduct) {
    try {
        console.log('Données avant insertion');
        let dataPrice = []
        // 1) Enlever les doublons sur le champ "name_raw"
        const seen = new Set();
        const result = [];

        for (const produit of dataProduct) {
            const value = produit.name_raw;
            if (!seen.has(value)) {
                seen.add(value);
                result.push(produit);
            }
        }

        // 2) Préparer les données pour l'insertion
        //    - Séparer le champ "price" vers un tableau à part
        //    - Ajouter "store_id" et "created_date"
        const today = new Date().toISOString().split('T')[0]; // format YYYY-MM-DD

        for (const prod of result) {
            dataPrice.push(prod.priceObj)
            delete prod.priceObj
            prod.store_id = '32d6dd89-4216-4588-a096-631bfaf5df56';
            prod.created_date = today;
        }

        console.log('Début insertion en base de données (table products)...');

        // 3) Insertion en BDD - Table "products"
        const { data: productsCreated, error: productError } = await supabase
            .from('products')
            .upsert(result, {
                onConflict: 'store_id,name_raw,created_date'
            })
            // .select() si vous voulez récupérer les lignes insérées
            .select();

        if (productError) {
            console.error('Erreur lors de l’insertion dans "products":', productError);
            return; // ou throw productError
        }

        console.log('Insertion products réussie, produits créés');

        // 4) Associer l'id du produit inséré aux données de prix
        if (productsCreated && productsCreated.length > 0) {
            for (let i = 0; i < productsCreated.length; i++) {
                // Ici, on suppose que l’ordre d’insertion correspond à l’ordre dans "prices"
                dataPrice[i].product_id = productsCreated[i].id;
                dataPrice[i].store_id = '32d6dd89-4216-4588-a096-631bfaf5df56';
                dataPrice[i].created_date = today;
            }
        }

        // 5) Insertion des prix dans la table "prices"
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

cron.schedule('0 0 * * *', async () => {
    console.log(`[${new Date().toISOString()}] Lancement du job de parser...`);
    // Exécuter le script
    await processFolders();

});

console.log(`[${new Date().toISOString()}] Job de parser lancé.`);

