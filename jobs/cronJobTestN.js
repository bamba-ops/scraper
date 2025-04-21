const supabase = require('../api/supabase');
const axios = require('axios');

// Configuration constants
const LOCAL_API = 'http://localhost:8001/similarity';
const SIMILARITY_THRESHOLD = 0.3;
const MAX_RESULTS = 100;
const ERROR_MESSAGES = {
    SUPABASE: '❌ Erreur lors de l\'appel de la fonction search_products:',
    PROCESSING: '❌ Erreur lors du traitement:',
    SIMILARITY: '[localSimilarity] Error:'
};

async function localSimilarity(source, sentencesArray) {
    try {
        const response = await axios.post(
            LOCAL_API,
            { source_sentence: source, sentences: sentencesArray },
            { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
        );
        return response.data;
    } catch (error) {
        console.error(ERROR_MESSAGES.SIMILARITY, error.message);
        return null;
    }
}

async function searchProducts(searchTerm) {
    try {
        console.log(`🔄 Recherche de produits pour "${searchTerm}" via Supabase...`);

        // Récupération des produits
        const { data: products, error } = await supabase.rpc('search_products_v3', {
            search_text: searchTerm
        });

        if (error) throw new Error(error.message);
        console.log(`🔍 ${products.length} produits récupérés via Supabase.`);

        // Batch processing pour la similarité
        const productNames = products.map(p => p.product_name);
        const scores = await localSimilarity(searchTerm, productNames);

        if (!scores || scores.length !== products.length) {
            throw new Error('Erreur de correspondance des scores de similarité');
        }

        // Fusion des scores avec les produits
        const scoredProducts = products.map((product, index) => ({
            ...product,
            similarity: scores[index]
        }));

        // Filtrage et tri optimisé
        return scoredProducts
            .filter(p => p.similarity >= SIMILARITY_THRESHOLD)
            .sort((a, b) => b.similarity - a.similarity)

    } catch (error) {
        console.error(ERROR_MESSAGES.PROCESSING, error.message);
        return [];
    }
}

// Exemple d'utilisation
(async () => {
    const results = await searchProducts("Lait");
    console.log(`✅ ${results.length} produits trouvés :`);
    console.log(JSON.stringify(results, null, 2));
})();
