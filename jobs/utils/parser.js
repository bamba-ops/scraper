const TextCleaner = require('./cleaning')
const cheerio = require('cheerio'); // Installer Cheerio si besoin: npm install cheerio

class Parser {

    static igaParser(htmlContent) {
        const $ = cheerio.load(htmlContent);

        const data = []
        // 3. Sélectionner le div contenant la liste de produits
        const mainDiv = $('.grid.js-equal-height');

        // (Optionnel) Extraire une valeur d'attribut du div principal
        const dataEqualItemValue = mainDiv.attr('data-equal-item');
        //console.log('Valeur de data-equal-item :', dataEqualItemValue);

        // 4. Parcourir tous les éléments enfants directs
        mainDiv.children().each((index, element) => {
            const product = $(element);

            // Extraction de l'URL de l'image
            const imgElement = product.find('img.fluid');
            const imageUrl = imgElement.attr('src') || 'Aucune image trouvée';

            // Extraction du lien et du nom du produit
            const linkElement = product.find('a.js-ga-productname');
            const productLink = linkElement.attr('href') || null;
            const productName = linkElement.attr('aria-label') || linkElement.text().trim() || null;
            const productPriceUn = product.find('span.price.text--strong').text().trim() || null;
            const productPreviousPrice = product.find('span.price-amount').text().trim() || null;
            const productPricePerUnit = product.find('div.text--small').text().trim() || null;
            const productBrand = product.find('div.item-product__brand.push--top').text().trim() || null;
            // Extraction de la taille depuis l'attribut data-product contenu dans un div interne
            const dataProductStr = product.find('div.item-product').attr('data-product');
            let productSize = 'Taille non trouvée';
            if (dataProductStr) {
                try {
                    // Remplacer les quotes simples par des quotes doubles pour obtenir un JSON valide
                    const validJsonStr = dataProductStr.replace(/'/g, '"');
                    const productData = JSON.parse(validJsonStr);
                    productSize = productData.Size || productSize;
                } catch (err) {
                    console.error('Erreur lors du parsing de data-product:', err);
                }
            }

            const price_per_unit = TextCleaner.convertPriceAndUnitIGA(TextCleaner.extractPriceAndUnitIGA(productPricePerUnit))
            const productPriceUnClean = Number((productPriceUn.replace('$', '').trim()).replace(',', '.'))

            /*
            console.log(`Produit ${index + 1}`);
            console.log('URL de l\'image :', imageUrl);
            console.log('Lien du produit :', productLink);
            console.log('Nom du produit :', productName);
            console.log('Taille du produit :', productSize);
            console.log('Prix unitaire du produit :', productPriceUnClean)
            console.log('Historique de prix :', productPreviousPrice)
            console.log('La marque du produit :', productBrand)
            console.log('Le prix par unité', price_per_unit)
            console.log('Est-ce une promo ? :', productPreviousPrice ? true : false)
            console.log('-------------------------');
            */

            const _price = {
                price: price_per_unit ? price_per_unit.price : null,
                unit: price_per_unit ? price_per_unit.unit : null,
                price_un: productPriceUnClean,
                is_promo: productPreviousPrice ? true : false
            }

            const _product = {
                name: productName,
                brand: productBrand,
                unit: productSize,
                image_url: imageUrl,
                priceObj: _price
            }

            if (productPriceUnClean < 999) {
                data.push(_product)
            }

        });

        return data
    }

    static superCParser(htmlContent) {
        const $ = cheerio.load(htmlContent);

        const nameValues = [];
        const brandValues = [];
        const unitValues = [];
        const imgSrc = [];
        const priceValues = [];
        const priceUnValues = [];
        const data = [];

        const container = $('div.products-search--grid.searchOnlineResults').first();
        if (!container.length) {
            console.log("Auncu produit trouvé");
            return data;
        }

        const pictureElements = container.find("picture.defaultable-picture");
        const nameElements = container.find("div.content__head");
        const priceElements = container.find("div.pricing__secondary-price");
        const priceUnElements = container.find("div.pricing__sale-price");

        // Process name and brand elements
        nameElements.each((i, elem) => {
            const titleUnit = $(elem).find("a").first();
            const brand = $(elem).find("span").first();
            if (titleUnit.length || brand.length) {
                const titleText = TextCleaner.handleCleanText(titleUnit.text().trim());
                nameValues.push(titleText);
                brandValues.push(TextCleaner.handleCleanText(brand.text().trim()));
                unitValues.push(TextCleaner.handleExtractUnitAndValue(titleText));
            }
        });

        // Process picture elements
        pictureElements.each((i, elem) => {
            const img = $(elem).find("img").first();
            if (img.length && img.attr("src")) {
                imgSrc.push(img.attr("src"));
            }
        });

        // Process price elements
        priceElements.each((i, elem) => {
            const priceSpan = $(elem).find("span").first();
            if (priceSpan.length) {
                priceValues.push(TextCleaner.handleCleanText(priceSpan.text().trim()));
            }
        });

        // Process promotional price elements
        priceUnElements.each((i, elem) => {
            priceUnValues.push(TextCleaner.handleCleanText($(elem).text()));
        });

        if (priceValues.length !== nameValues.length || nameValues.length !== priceUnValues.length) {
            console.warn("Les longueurs des tableaux extraits ne correspondent pas.");
            return data;
        }

        // Only proceed if the lengths match
        if (priceValues.length === nameValues.length && nameValues.length === priceUnValues.length) {
            const standardizedPrices = TextCleaner.handleStandardizeUnitsMetro(TextCleaner.handleExtractPricesMetro(priceValues));
            const extractedPriceUn = TextCleaner.extrairePrixDeListeSuperc(priceUnValues);

            for (let i = 0; i < nameValues.length; i++) {
                const price = standardizedPrices[i];
                if (!price || typeof price.price !== 'number') {
                    console.warn(`Donnée de prix manquante pour l'index ${i}. On ignore cet élément.`);
                    continue;
                }

                price.price = Math.round(price.price * 100) / 100; // round to 2 decimals
                const priceUn = extractedPriceUn[i];

                const product = {
                    name: nameValues[i],
                    image_url: imgSrc[i],
                    brand: brandValues[i],
                    priceObj: price,
                    unit: unitValues[i]
                };

                if (Array.isArray(priceUn)) {
                    price.price_un = priceUn[1];
                    price.quantity = priceUn[0];
                    price.is_promo = true;
                } else {
                    price.price_un = priceUn;
                    price.is_promo = false;
                }
                //console.log(price)
                //console.log(product)
                data.push(product);
            }
        }

        //console.log(data);
        return data;
    }

    static metroParser(htmlContent) {
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
                nameValue.push(TextCleaner.handle_clean_text(_title_unit.text().trim()));
                brandValue.push(TextCleaner.cleanBrand(TextCleaner.handle_clean_text(_brand.text().trim())));
                unitValue.push(
                    TextCleaner.handle_extract_unit_and_value(
                        TextCleaner.handle_clean_text(_title_unit.text().trim())
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
            priceUnValue.push(TextCleaner.handle_clean_text($(el).text()));
        });

        // Equivalent to price_un_value_extrait = extraire_prix_un_metro(price_un_value)
        const priceUnValueExtrait = TextCleaner.extraire_prix_un_metro(priceUnValue);

        // Print out the zipped "price" and "price_extrait"
        /*
        for (let i = 0; i < priceUnValue.length; i++) {
            console.log(`Price: ${priceUnValue[i]}\nPrice Extrait: ${priceUnValueExtrait[i]}`);
        }
            */

        if (priceValue.length === priceUnValueExtrait.length) {
            const cleanedNameList = TextCleaner.clean_name_list(nameValue);
            const standardizedPrices = TextCleaner.handle_standardize_units_2(
                TextCleaner.handle_extract_prices_metro_2(priceValue)
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
}


module.exports = Parser 