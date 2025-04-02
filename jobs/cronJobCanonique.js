const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const supabase = require('../api/supabase')
const today = new Date().toISOString().split('T')[0];

// Fonction de normalisation
function normalizeName(name) {
    return name.toLowerCase().trim()
}

setTimeout(async () => {
    // 1. Récupérer les produits sans canonical_product_id
    let { data: products, error } = await supabase
        .from('products')
        .select('id, name')
    //.is('canonical_product_id', null);
    if (error) {
        console.error('Erreur lors de la récupération des produits:', error);
        return;
    }

    for (const product of products) {
        console.log(product.name)
    }


}, 1000);