module.exports = {
    apps: [
        {
            name: 'scraper',
            script: './server.js',
            instances: max, // Vous pouvez utiliser "max" pour exploiter tous les cœurs
            exec_mode: 'cluster',
        },
        {
            name: 'cron-scrape',
            script: './jobs/cronJobCheck.js',
            instances: 1,

        }
    ]
};
