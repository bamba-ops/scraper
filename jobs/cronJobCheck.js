const cron = require('node-cron');
const axios = require('axios');

cron.schedule('*/2 * * * *', async () => {
    console.log(`[${new Date().toISOString()}] Lancement du job de scraping...`);
    try {
        const response = await axios.get('http://localhost:3000/api/health');
        console.log(response.data);
    } catch (error) {
        console.error('Erreur lors du job de scraping :', error.message);
    }
});

console.log(`[${new Date().toISOString()}] Job de scraping lancé.`);
