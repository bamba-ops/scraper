// groupProducts.js

const supabase = require('../api/supabase'); // Assurez-vous que le module supabase est correctement configuré
const axios = require('axios');

// --- Configuration de l'API Hugging Face ---
const HF_API = '';
const HF_TOKEN = '';
// Seuil de similarité pour considérer deux noms comme équivalents (ajustable)
const SIMILARITY_THRESHOLD = 0.3;

/**
 * Appelle l'API Hugging Face pour comparer un texte source avec un tableau de phrases candidates.
 * @param {string} source - La phrase source.
 * @param {string[]} sentencesArray - Un tableau de phrases à comparer avec source.
 * @returns {Promise<number[]|null>} Un tableau de scores de similarité (entre 0 et 1) ou null en cas d'erreur.
 */
async function huggingFaceSimilarity(source, sentencesArray) {
    try {
        const payload = { inputs: { source_sentence: source, sentences: sentencesArray } };
        const response = await axios.post(HF_API, payload, {
            headers: {
                Authorization: `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json',
                'x-wait-for-model': 'true',
            },
            timeout: 60000,
        });
        // On attend un tableau de scores, par exemple [0.85, 0.2, 0.75, ...]
        return response.data;
    } catch (error) {
        console.error('[huggingFaceSimilarity] Error:', error.message);
        return null;
    }
}

async function localSimilarity(source, sentencesArray) {
    try {
        const payload = {
            source_sentence: source,
            sentences: sentencesArray,
        };
        const response = await axios.post('http://localhost:8001/similarity', payload, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 60000,
        });
        return response.data;
    } catch (error) {
        console.error('[localSimilarity] Error:', error.message);
        return null;
    }
}


/**
 * Fonction principale qui récupère les produits, les regroupe à l'aide de l'API Hugging Face
 * et affiche les 100 premiers groupes.
 */
(async () => {
    try {
        console.log('🔄 Récupération de tous les produits...');
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, unit'); // On récupère le nom et l'unité tel quel

        if (error) {
            console.error('❌ Erreur récupération produits:', error);
            return;
        }
        console.log(`✅ ${products.length} produits récupérés.`);

        // Tableau pour stocker les groupes. Chaque groupe est un objet : { canonicalName, products: [...] }
        const groups = [];

        console.log('🔄 Regroupement des produits à l\'aide de Hugging Face...');
        // Pour chaque produit, on teste s'il peut rejoindre un groupe existant
        for (const product of products) {
            const productName = product.name; // On se base sur le nom tel quel
            let bestGroupIndex = -1;
            let bestScore = -1;

            // Pour chaque groupe déjà créé, on compare le nom représentatif avec le nom de ce produit
            for (let i = 0; i < groups.length; i++) {
                const groupCanonical = groups[i].canonicalName;
                // Appel à Hugging Face avec le nom du groupe comme source et le nom du produit comme candidat
                const scores = await localSimilarity(groupCanonical, [productName]);
                if (scores && scores.length > 0) {
                    const score = scores[0];
                    if (score > bestScore) {
                        bestScore = score;
                        bestGroupIndex = i;
                    }
                }
            }

            // Si le meilleur score est au-dessus du seuil, on ajoute le produit à ce groupe
            if (bestScore >= SIMILARITY_THRESHOLD && bestGroupIndex >= 0) {
                groups[bestGroupIndex].products.push(product);
            } else {
                // Sinon, on crée un nouveau groupe avec ce produit comme représentant (canonical)
                groups.push({
                    canonicalName: productName,
                    products: [product],
                });
            }
        }

        // Limiter l'affichage à 100 groupes
        const groupedResult = groups.slice(0, 100);
        console.log(`✅ ${groupedResult.length} groupes créés (limités à 100). Voici le résultat :`);
        console.log(JSON.stringify(groupedResult, null, 2));
    } catch (err) {
        console.error('❌ Une erreur s\'est produite:', err.message);
    }
})();

/**
 * Fonction utilitaire pour découper un tableau en tranches (optionnel si besoin).
 * @param {Array} arr - Le tableau à découper.
 * @param {number} size - La taille des tranches.
 * @returns {Array[]} Un tableau contenant les tranches du tableau d'origine.
 */
function chunkArray(arr, size) {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
    );
}
