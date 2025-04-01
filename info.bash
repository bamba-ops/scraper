cat <<EOF > install_node_nvm.sh
#!/bin/bash

set -e  # Arrête le script en cas d'erreur

echo "🔄 Mise à jour des paquets..."
apt-get update

echo "📥 Installation de curl..."
apt install curl -y

echo "📥 Téléchargement et installation de NVM..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

echo "🔄 Chargement de NVM dans l'environnement actuel..."
\. "\$HOME/.nvm/nvm.sh"

echo "📥 Installation de Node.js v22..."
nvm install 22

echo "✅ Vérification de la version de Node.js..."
node -v  # Devrait afficher "v22.14.0"
nvm current  # Devrait afficher "v22.14.0"

echo "✅ Vérification de la version de npm..."
npm -v  # Devrait afficher "10.9.2"

echo "🔄 Mise à jour des paquets et installation de xvfb..."
apt-get update && apt-get install -y xvfb

echo "🔄 Mise à jour des paquets et installation de playwright..."
apt-get install -y libnss3 libatk1.0-0 libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxfixes3 libxi6 libxrandr2 libxrender1 libxtst6 libglib2.0-0 libdbus-1-3 libdrm2 libxshmfence1 && npx playwright install chromium --with-deps

echo "🎉 Installation terminée avec succès !"
EOF

chmod +x install_node_nvm.sh

./install_node_nvm.sh