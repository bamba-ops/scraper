class TextCleaner {

    static convertPriceAndUnitIGA(data) {
        // Si data est null ou non défini, retourne null
        if (data == null) {
            return null;
        }

        const { price, unit } = data;

        // Si l'unité est "unité", on retourne null
        if (unit === 'unité') {
            return null;
        }

        // Convertir la chaîne de prix avec virgule en nombre (en remplaçant la virgule par un point)
        const priceNumber = parseFloat(price.replace(',', '.'));
        if (isNaN(priceNumber)) {
            return null;
        }

        // Si unité est "g", multiplier par 10 pour obtenir le prix par kg et retourner l'objet
        if (unit === 'g') {
            const newPrice = priceNumber * 10;
            // On formate avec 2 décimales et on remet une virgule
            const newPriceStr = newPrice.toFixed(2);
            return { price: newPriceStr, unit: 'kg' };
        }

        // Si unité est "ml", multiplier par 10 pour obtenir le prix par litre et retourner l'objet
        if (unit === 'ml') {
            const newPrice = priceNumber * 10;
            const newPriceStr = newPrice.toFixed(2);
            return { price: newPriceStr, unit: 'L' };
        }

        // Pour toute autre unité, on retourne null
        return null;
    }

    static extractPriceAndUnitIGA(input) {
        // Si la chaîne vaut "null", retourne une chaîne vide
        if (input === null) {
            return null;
        }

        // Regex pour capturer le prix et l'unité
        // Le prix est composé de chiffres et de virgules (ex : "5,10")
        // L'unité est la partie après "$ /"
        const regex = /^([\d,]+)\s*\$\s*\/\s*(.+)$/;
        const match = input.trim().match(regex);

        if (match) {
            let price = match[1];      // Exemple : "5,10"
            let unit = match[2].trim();  // Exemple : "100 G." ou "100 ML" ou "UNITE"

            // Retirer le préfixe numérique et les espaces (ex: "100 " dans "100 G.")
            unit = unit.replace(/^\d+\s*/, "");
            // Supprimer le point final s'il existe (ex: "G." devient "G")
            unit = unit.replace(/\.$/, "");
            // Mettre en minuscules
            unit = unit.toLowerCase();
            // Si l'unité est "unite", retourner "unité"
            if (unit === "unite") {
                unit = "unité";
            }
            return { price, unit };
        }

        // Si le format n'est pas reconnu, retourne une chaîne vide
        return null;
    }

    static handleExtractPrices(data) {
        const cleanedData = [];
        const regex = /(\d+,\d+)\s?\$\s?\/\s?(\d+\s?\w+)?/i;

        for (const item of data) {
            const match = item.match(regex);
            if (match) {
                const price = parseFloat(match[1].replace(",", "."));
                const unit = match[2] ? match[2].trim() : "unité";
                cleanedData.push({ price, unit });
            } else if (item.includes("ch.")) {
                const fixedMatch = item.match(/(\d+,\d+)/);
                if (fixedMatch) {
                    const fixedPrice = parseFloat(fixedMatch[1].replace(",", "."));
                    cleanedData.push({ price: fixedPrice, unit: "unité" });
                } else {
                    cleanedData.push({ price: null, unit: null });
                }
            } else {
                cleanedData.push({ price: null, unit: null });
            }
        }
        return cleanedData;
    }

    static extraire_prix_iga(string_prix) {
        const regex = /\d+[.,]?\d*/;
        const match = string_prix.match(regex);
        if (match) {
            try {
                const prixNumerique = match[0].replace(",", ".");
                return parseFloat(prixNumerique);
            } catch (e) {
                return null;
            }
        }
        return null;
    }
    /**
 * Cleans a string by replacing multiple whitespace characters with a single space.
 * @param {string} text
 * @returns {string}
 */
    static handleCleanText(text) {
        return text.replace(/\s+/g, ' ').trim();
    }

    /**
     * Extracts the first unit value found in the input string.
     * @param {string} inputString
     * @returns {string}
     */
    static handleExtractUnitAndValue(inputString) {
        const units = ["g", "kg", "ml", "l", "cm", "m", "km", "oz", "lb", "x"];
        const pattern = new RegExp(`(\\b\\d+(?:\\.\\d+)?(?:\\s*[xX\\*]\\s*\\d+)?\\s*(?:${units.join('|')}))`, 'i');
        const match = inputString.match(pattern);
        return match ? match[0].trim() : "";
    }

    /**
     * Extracts prices from an array of strings.
     * Looks for patterns like "1,43 $ /100g" and returns an object with the price and unit.
     * @param {string[]} data
     * @returns {Array<{price: number, unit: string}>}
     */
    static handleExtractPricesMetro(data) {
        const cleanedData = [];
        data.forEach(item => {
            const match = item.match(/(\d+,\d+)\s*\$\s*\/(\w+)/);
            if (match) {
                const price = parseFloat(match[1].replace(",", "."));
                const unit = match[2];
                cleanedData.push({ price, unit });
            }
        });
        return cleanedData;
    }

    /**
     * Standardizes price units.
     * For example, converts prices per 100g to prices per kg.
     * @param {Array<{price: number, unit: string}>} data
     * @returns {Array<{price: number, unit: string}>}
     */
    static handleStandardizeUnitsMetro(data) {
        data.forEach(item => {
            if (item.unit === "100g") {
                item.price *= 10; // Convert to kg
                item.unit = "kg";
            } else if (item.unit === "100ml") {
                item.price *= 10; // Convert to L
                item.unit = "L";
            }
            // For "kg" or "L", no conversion is needed.
        });
        return data;
    }

    /**
     * Extracts prices from a list of strings.
     * It handles cases like "2 / 3,98 $" by returning an array [quantity, priceTotal],
     * or returns a float for other formats.
     * @param {string[]} listeStrings
     * @returns {Array<number | [number, number] | null>}
     */
    static extrairePrixDeListeSuperc(listeStrings) {
        const resultat = [];
        listeStrings.forEach(item => {
            if (item.includes("/")) {
                const match = item.match(/^(\d+)\s*\/\s*([\d,]+)\s*\$/);
                if (match) {
                    const quantite = parseInt(match[1], 10);
                    const prixTotal = parseFloat(match[2].replace(",", "."));
                    resultat.push([quantite, prixTotal]);
                } else {
                    resultat.push(null);
                }
            } else {
                const match = item.match(/[\d,]+/);
                if (match) {
                    const prix = parseFloat(match[0].replace(",", "."));
                    resultat.push(prix);
                } else {
                    resultat.push(null);
                }
            }
        });
        return resultat;
    }

    static cleanBrand(brandText) {
        // On retire les espaces suivis d'un ou plusieurs chiffres et d'une unité parmi mL, L ou g
        return brandText.replace(/\s*\d+\s*(mL|L|g)\b/i, '').trim();
    }

    static extrairePrixDeListeSuperc(listeStrings) {
        const resultat = [];

        for (const item of listeStrings) {
            // Vérifier si la chaîne contient un format '2 / 3,98 $'
            if (item.includes("/")) {
                const regex = /^(\d+)\s*\/\s*([\d,]+)\s*\$$/;
                const match = item.match(regex);
                if (match) {
                    try {
                        const quantite = parseInt(match[1], 10);
                        const prix_total = parseFloat(match[2].replace(",", "."));
                        resultat.push([quantite, prix_total]);
                    } catch (err) {
                        resultat.push(null);
                    }
                } else {
                    resultat.push(null);
                }
            } else {
                // Pour les autres formats, extraire le prix comme float
                const regex = /[\d,]+/;
                const match = item.match(regex);
                if (match) {
                    try {
                        const prix = parseFloat(match[0].replace(",", "."));
                        resultat.push(prix);
                    } catch (err) {
                        resultat.push(null);
                    }
                } else {
                    resultat.push(null);
                }
            }
        }
        return resultat;
    }

    static cleanPart(text) {
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
    static cleanName(text) {
        if (text.includes(',')) {
            const parts = text.split(',', 2); // split into max 2 parts
            const before = TextCleaner.cleanPart(parts[0]);
            const after = TextCleaner.cleanPart(parts[1]);

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
            return TextCleaner.cleanPart(text);
        }
    }

    /**
     * Main static: cleans a list of strings by:
     *   - Removing numbers
     *   - Stripping out specific units
     *   - Removing single-character words
     *   - Handling comma-separated parts
     */
    static clean_name_list(names) {
        return names.map(TextCleaner.cleanName);
    }


    static handle_clean_text(text) {
        // Replace multiple whitespace chars (\s+) with a single space, then trim
        return text.replace(/\s+/g, ' ').trim();
    }

    static handle_extract_unit_and_value(inputString) {
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

    static extraire_prix_un_metro(listePrix) {
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

    static handle_standardize_units_2(data) {
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
    static removeChPrices(line) {
        // Equivalent to Python:
        // re.sub(r"\d+,\d+\s*\$\s*ch\.", "", line, flags=re.IGNORECASE)
        return line.replace(/\d+,\d+\s*\$\s*ch\./gi, '');
    }

    /**
     * 2) Insert a space between the unit and any immediately-following price
     *    e.g. "1,52 $ /kg0,69 $ /lb." -> "1,52 $ /kg 0,69 $ /lb."
     */
    static separatePriceUnits(line) {
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
    static handle_extract_prices_metro_2(data) {
        const pattern = new RegExp('(\\d+,\\d+)\\s*\\$\\s*/(\\w+)\\.?', 'i');

        const cleanedData = [];

        for (let line of data) {
            // 1) Remove "XX,XX $ ch."
            line = TextCleaner.removeChPrices(line);

            // 2) Separate "kg0,69" => "kg 0,69"
            line = TextCleaner.separatePriceUnits(line);

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
}

module.exports = TextCleaner