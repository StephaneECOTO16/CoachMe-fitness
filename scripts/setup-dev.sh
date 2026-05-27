#!/bin/bash

# Script de configuration pour l'environnement de développement CoachMe
# Usage: ./scripts/setup-dev.sh

set -e

echo "🚀 Configuration de l'environnement de développement CoachMe..."
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Vérifier les prérequis
echo "📋 Vérification des prérequis..."

if ! command -v node &> /dev/null; then
    error "Node.js n'est pas installé"
    exit 1
fi
info "Node.js $(node --version)"

if ! command -v pnpm &> /dev/null; then
    error "pnpm n'est pas installé"
    echo "   Installer avec: npm install -g pnpm"
    exit 1
fi
info "pnpm $(pnpm --version)"

if ! command -v docker &> /dev/null; then
    warn "Docker n'est pas installé (optionnel pour PostgreSQL)"
else
    info "Docker $(docker --version | cut -d' ' -f3)"
fi

echo ""

# 2. Vérifier le fichier .env
echo "🔧 Configuration des variables d'environnement..."

if [ ! -f .env ]; then
    warn "Fichier .env non trouvé"
    if [ -f .env.example ]; then
        cp .env.example .env
        info "Fichier .env créé depuis .env.example"
        warn "⚠️  IMPORTANT: Configurez les variables dans .env avant de continuer"
        exit 0
    else
        error "Fichier .env.example non trouvé"
        exit 1
    fi
else
    info "Fichier .env trouvé"
fi

echo ""

# 3. Installer les dépendances
echo "📦 Installation des dépendances..."

if [ ! -d "node_modules" ]; then
    pnpm install
    info "Dépendances installées"
else
    info "Dépendances déjà installées"
fi

echo ""

# 4. Démarrer PostgreSQL avec Docker
echo "🐘 Configuration de PostgreSQL..."

if command -v docker &> /dev/null; then
    if docker ps | grep -q coachme-postgres; then
        info "PostgreSQL est déjà en cours d'exécution"
    else
        echo "   Démarrage de PostgreSQL avec Docker..."
        docker compose up -d
        info "PostgreSQL démarré"
        
        # Attendre que PostgreSQL soit prêt
        echo "   Attente de PostgreSQL..."
        sleep 5
        
        if docker ps | grep -q coachme-postgres; then
            info "PostgreSQL est prêt"
        else
            error "Échec du démarrage de PostgreSQL"
            exit 1
        fi
    fi
else
    warn "Docker non disponible - assurez-vous que PostgreSQL est installé et en cours d'exécution"
fi

echo ""

# 5. Générer le client Prisma
echo "🔨 Génération du client Prisma..."
pnpm prisma:generate
info "Client Prisma généré"

echo ""

# 6. Appliquer les migrations
echo "🗄️  Application des migrations de base de données..."

if pnpm prisma:migrate:dev --name init 2>/dev/null; then
    info "Migrations appliquées"
else
    warn "Les migrations ont peut-être déjà été appliquées"
fi

echo ""

# 7. Seed (optionnel)
echo "🌱 Voulez-vous ajouter des données de test? (y/N)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    if [ -f "prisma/seed.ts" ]; then
        pnpm prisma:seed
        info "Données de test ajoutées"
    else
        warn "Fichier seed.ts non trouvé"
    fi
fi

echo ""

# 8. Résumé
echo "✅ Configuration terminée!"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Vérifiez votre fichier .env"
echo "   2. Lancez le serveur de développement: pnpm dev"
echo "   3. Ouvrez http://localhost:3000"
echo ""
echo "📚 Documentation complète: GUIDE_DEMARRAGE.md"
echo ""
echo "🔑 Comptes de test recommandés:"
echo "   Admin:  admin@coachme.cm / Admin123!"
echo "   Coach:  coach@test.com / Coach123!"
echo "   Client: client@test.com / Client123!"
echo ""
