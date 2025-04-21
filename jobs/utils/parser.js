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
            const productLinkClean = 'https://www.iga.net' + productLink

            /*
            console.log(`Produit ${index + 1}`);
            console.log('URL de l\'image :', imageUrl);
            console.log('Lien du produit :', productLinkClean);
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
                link: productLinkClean,
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

        const dataProducts = []
        // Equivalent to: container = soup.select_one("div.products-search--grid.searchOnlineResults")
        const container = $('div.products-search--grid.searchOnlineResults');

        // If container not found, return empty array
        if (!container || container.length === 0) {
            console.log('Aucun produit trouvé.');
            return dataProducts;
        }

        const container2 = $('div.products-search--grid.searchOnlineResults');

        // Sélectionne tous les produits
        const products = container2.find('div.default-product-tile.tile-product.item-addToCart');

        products.each((i, prodElem) => {
            const $prod = $(prodElem);
            const productName = $prod.attr('data-product-name') || null;
            const productBrand = $prod.attr('data-product-brand') || null;

            // Si plusieurs spans sont présents pour le produit, par exemple, on prend le premier :
            const unitSpan = $prod.find('span.head__unit-details').first();
            const pictureElem = $prod.find('picture.defaultable-picture').first();
            const priceElem = $prod.find('div.pricing__secondary-price').first();
            const urlElem = $prod.find('a.product-details-link').first();
            const priceUnElem = $prod.find('div.pricing__sale-price').first();

            const productPrice = priceElem.find('span').text().trim() || null;
            const productImgUrl = pictureElem.find('img').attr('src') || null;
            const productUnit = unitSpan.text().trim() || null;
            const productURL = urlElem.attr('href') || null;
            const productPriceUn = priceUnElem.text().trim() || null;

            const productPriceUnClean = TextCleaner.handle_clean_text(productPriceUn)
            const productPriceUnClean2 = TextCleaner.extraire_prix_un_metro_string_2(productPriceUnClean)
            const productPriceClean = TextCleaner.handle_extract_prices_metro_2_string(productPrice)
            const productPriceClean2 = TextCleaner.handle_standardize_units_2_string(productPriceClean)
            const productURLClean = 'https://www.superc.ca' + productURL

            /*
            console.log('Product Name :', productName);
            console.log('Product Brand :', productBrand);
            console.log('Product Unit :', productUnit);
            console.log('Product imgUrl :', productImgUrl)
            console.log('Product price :', productPriceClean2)
            console.log('Product URL :', productURLClean)
            console.log('Product price un :', productPriceUnClean2)
            console.log('==========================================')
            */


            let _price = {}
            if (Array.isArray(productPriceUnClean2)) {
                _price = {
                    price: productPriceClean2 ? productPriceClean2.price : null,
                    unit: productPriceClean2 ? productPriceClean2.unit : null,
                    price_un: productPriceUnClean2 ? productPriceUnClean2[1] : null,
                    quantity: productPriceUnClean2 ? productPriceUnClean2[0] : null,
                    is_promo: true
                }
            } else {
                _price = {
                    price: productPriceClean2 ? productPriceClean2.price : null,
                    unit: productPriceClean2 ? productPriceClean2.unit : null,
                    price_un: productPriceUnClean2,
                    is_promo: false
                }
            }

            const _product = {
                name: productName,
                brand: productBrand,
                unit: productUnit,
                image_url: productImgUrl,
                link: productURLClean,
                priceObj: _price
            }

            dataProducts.push(_product)
        });

        return dataProducts;
    }

    static metroParser(htmlContent) {
        const $ = cheerio.load(htmlContent);

        const dataProducts = []
        // Equivalent to: container = soup.select_one("div.products-search--grid.searchOnlineResults")
        const container = $('div.products-search--grid.searchOnlineResults');

        // If container not found, return empty array
        if (!container || container.length === 0) {
            console.log('Aucun produit trouvé.');
            return dataProducts;
        }

        const container2 = $('div.products-search--grid.searchOnlineResults');

        // Sélectionne tous les produits
        const products = container2.find('div.default-product-tile.tile-product.item-addToCart');

        products.each((i, prodElem) => {
            const $prod = $(prodElem);
            const productName = $prod.attr('data-product-name') || null;
            const productBrand = $prod.attr('data-product-brand') || null;

            // Si plusieurs spans sont présents pour le produit, par exemple, on prend le premier :
            const unitSpan = $prod.find('span.head__unit-details').first();
            const pictureElem = $prod.find('picture.defaultable-picture').first();
            const priceElem = $prod.find('div.pricing__secondary-price').first();
            const urlElem = $prod.find('a.product-details-link').first();
            const priceUnElem = $prod.find('div.pricing__sale-price').first();

            const productPrice = priceElem.find('span').text().trim() || null;
            const productImgUrl = pictureElem.find('img').attr('src') || null;
            const productUnit = unitSpan.text().trim() || null;
            const productURL = urlElem.attr('href') || null;
            const productPriceUn = priceUnElem.text().trim() || null;

            const productPriceUnClean = TextCleaner.handle_clean_text(productPriceUn)
            const productPriceUnClean2 = TextCleaner.extraire_prix_un_metro_string_2(productPriceUnClean)
            const productPriceClean = TextCleaner.handle_extract_prices_metro_2_string(productPrice)
            const productPriceClean2 = TextCleaner.handle_standardize_units_2_string(productPriceClean)
            const productURLClean = 'https://www.metro.ca' + productURL


            /*
            console.log('Product Name :', productName);
            console.log('Product Brand :', productBrand);
            console.log('Product Unit :', productUnit);
            console.log('Product imgUrl :', productImgUrl)
            console.log('Product price :', productPriceClean2)
            console.log('Product URL :', productURLClean)
            console.log('Product price un :', productPriceUnClean2)
            console.log('==========================================')
            */

            let _price = {}
            if (Array.isArray(productPriceUnClean2)) {
                _price = {
                    price: productPriceClean2 ? productPriceClean2.price : null,
                    unit: productPriceClean2 ? productPriceClean2.unit : null,
                    price_un: productPriceUnClean2 ? productPriceUnClean2[1] : null,
                    quantity: productPriceUnClean2 ? productPriceUnClean2[0] : null,
                    is_promo: true
                }
            } else {
                _price = {
                    price: productPriceClean2 ? productPriceClean2.price : null,
                    unit: productPriceClean2 ? productPriceClean2.unit : null,
                    price_un: productPriceUnClean2,
                    is_promo: false
                }
            }

            const _product = {
                name: productName,
                brand: productBrand,
                unit: productUnit,
                image_url: productImgUrl,
                link: productURLClean,
                priceObj: _price
            }

            dataProducts.push(_product)
        });

        return dataProducts;
    }
}


module.exports = Parser 