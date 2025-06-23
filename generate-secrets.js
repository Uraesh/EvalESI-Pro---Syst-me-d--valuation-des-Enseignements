import { nanoid } from 'nanoid';

// Générer des secrets sécurisés
const jwtSecret = nanoid(64); // 64 caractères pour JWT
const cookieSecret = nanoid(32); // 32 caractères pour les cookies

console.log('=== Secrets générés ===');
console.log('JWT_SECRET:', jwtSecret);
console.log('COOKIE_SECRET:', cookieSecret);
console.log('\nCopiez ces valeurs dans votre fichier .env'); 