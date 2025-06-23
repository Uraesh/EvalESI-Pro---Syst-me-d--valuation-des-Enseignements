const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Fonction pour générer les différentes tailles de favicon
async function generateFavicons() {
    const svgBuffer = fs.readFileSync(path.join(__dirname, '../assets/images/favicon.svg'));
    
    // Générer favicon.png (32x32)
    await sharp(svgBuffer)
        .resize(32, 32)
        .png()
        .toFile(path.join(__dirname, '../assets/images/favicon.png'));
    
    // Générer apple-touch-icon.png (180x180)
    await sharp(svgBuffer)
        .resize(180, 180)
        .png()
        .toFile(path.join(__dirname, '../assets/images/apple-touch-icon.png'));
    
    console.log('Favicons générés avec succès !');
}

generateFavicons().catch(console.error); 