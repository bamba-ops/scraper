const fs = require('fs');
const path = require('path');

class FileManager {
    constructor(basePath = __dirname) {
        // Définit le chemin de base pour toutes les opérations
        this.basePath = basePath;
    }

    // Construit un chemin absolu à partir du chemin de base
    resolve(...paths) {
        return path.resolve(this.basePath, ...paths);
    }

    // Lire le contenu d'un fichier
    readFile(filePath, encoding = 'utf8') {
        return new Promise((resolve, reject) => {
            fs.readFile(this.resolve(filePath), encoding, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }

    deleteDir(dirPath, options = { recursive: true, force: true }) {
        return new Promise((resolve, reject) => {
            fs.rm(this.resolve(dirPath), options, (err) => {
                if (err) return reject(err);
                resolve(true);
            });
        });
    }

    // Écrire des données dans un fichier
    writeFile(filePath, data, encoding = 'utf8') {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.resolve(filePath), data, encoding, (err) => {
                if (err) return reject(err);
                resolve(true);
            });
        });
    }

    // Supprimer un fichier
    deleteFile(filePath) {
        return new Promise((resolve, reject) => {
            fs.unlink(this.resolve(filePath), (err) => {
                if (err) return reject(err);
                resolve(true);
            });
        });
    }

    // Lister les fichiers et dossiers d'un répertoire
    listFiles(dirPath) {
        return new Promise((resolve, reject) => {
            fs.readdir(this.resolve(dirPath), (err, files) => {
                if (err) return reject(err);
                resolve(files);
            });
        });
    }

    // Copier un fichier vers une nouvelle destination
    copyFile(sourcePath, destPath) {
        return new Promise((resolve, reject) => {
            fs.copyFile(this.resolve(sourcePath), this.resolve(destPath), (err) => {
                if (err) return reject(err);
                resolve(true);
            });
        });
    }

    // Déplacer (ou renommer) un fichier
    moveFile(sourcePath, destPath) {
        return new Promise((resolve, reject) => {
            fs.rename(this.resolve(sourcePath), this.resolve(destPath), (err) => {
                if (err) return reject(err);
                resolve(true);
            });
        });
    }

    // Vérifier si un fichier ou dossier existe
    exists(filePath) {
        return new Promise((resolve) => {
            fs.access(this.resolve(filePath), fs.constants.F_OK, (err) => {
                resolve(!err);
            });
        });
    }

    // Créer un dossier (option recursive pour créer les dossiers parents si besoin)
    createDir(dirPath, options = { recursive: true }) {
        return new Promise((resolve, reject) => {
            fs.mkdir(this.resolve(dirPath), options, (err) => {
                if (err) return reject(err);
                resolve(true);
            });
        });
    }

    // Obtenir les statistiques d'un fichier ou dossier
    stat(filePath) {
        return new Promise((resolve, reject) => {
            fs.stat(this.resolve(filePath), (err, stats) => {
                if (err) return reject(err);
                resolve(stats);
            });
        });
    }
}

module.exports = FileManager;
