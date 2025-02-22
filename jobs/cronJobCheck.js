const cron = require('node-cron');
const axios = require('axios');

cron.schedule('*/15 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] Lancement du job de scraping...`);
    try {
        const response = await axios.get('http://localhost:3000/api/health');
        console.log(response.data)
        // Envoi du résultat du scraping au webhook Discord
        await axios.post('https://discord.com/api/webhooks/1341564235469291521/QhGA40Vg_USmD6hlJQbjMF4JpoDrgdPfyGKIZIdssYLPt9gjjVUM4Q6R8BeaDz_nur9i', {
            content: response.data   // Le contenu du message sera le résultat du scraping
        });
    } catch (error) {
        console.error('Erreur lors du job de scraping :', error.message);
    }
});

console.log(`[${new Date().toISOString()}] Job de scraping lancé.`);
