module.exports = {
    apps: [
        {
            name: 'scraper',
            script: './server.js',
            instances: "max", // Vous pouvez utiliser "max" pour exploiter tous les cœurs
            exec_mode: 'cluster',
        },
        {
            name: 'cron-scrape',
            script: './jobs/cronJobCheck.js',
            instances: 1,

        },
        /*
        {
            name: 'cron-metro',
            script: './jobs/cronJobMetro.js',
            instances: 1
        },
        {
            name: 'cron-parser',
            script: './jobs/cronJobParser.js',
            instances: 1
        }
            */
    ]
};
