/**
 * src/lib/i18n.ts
 * Internationalization (i18n) utility for English (EN) and French (FR).
 * Provides translation lookups and language selection.
 */

export type Language = 'EN' | 'FR';

export const translations: Record<Language, Record<string, string>> = {
    EN: {
        // Common
        'app.title': 'Mandara Sport',
        'nav.home': 'Home',
        'nav.coaches': 'Find Coaches',
        'nav.profile': 'Profile',
        'nav.chat': 'Chat',
        'nav.admin': 'Admin',
        'nav.logout': 'Logout',

        // Auth
        'auth.register': 'Sign Up',
        'auth.login': 'Log In',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.name': 'Full Name',
        'auth.signupCoach': 'Sign Up as Coach',
        'auth.signupProspect': 'Sign Up as Prospect',
        'auth.loginError': 'Invalid email or password',
        'auth.registerSuccess': 'Account created! Please log in.',

        // Prospect onboarding
        'prospect.onboarding.title': 'Complete Your Profile',
        'prospect.onboarding.ageRange': 'Age Range',
        'prospect.onboarding.height': 'Height (cm)',
        'prospect.onboarding.weight': 'Weight (kg)',
        'prospect.onboarding.skip': 'Skip',
        'prospect.onboarding.complete': 'Complete',

        // Coach onboarding
        'coach.onboarding.title': 'Coach Profile',
        'coach.onboarding.discipline': 'Discipline/Expertise',
        'coach.onboarding.portfolio': 'Portfolio or Resume',
        'coach.onboarding.bio': 'Bio',
        'coach.onboarding.upload': 'Upload Certificates & Media',
        'coach.onboarding.pending': 'Your profile is pending admin approval.',
        'coach.onboarding.approved': 'Your profile is approved! You are visible to prospects.',
        'coach.onboarding.rejected': 'Your profile was rejected. Reason: ',

        // Coach discovery
        'coaches.title': 'Find a Coach',
        'coaches.filter': 'Filter by Discipline',
        'coaches.noresults': 'No coaches found',
        'coaches.viewprofile': 'View Profile',
        'coaches.startchat': 'Start Chat',

        // Chat
        'chat.title': 'Messages',
        'chat.nochats': 'No active chats',
        'chat.typemessage': 'Type a message...',
        'chat.send': 'Send',

        // Admin
        'admin.title': 'Admin Panel',
        'admin.pendingcoaches': 'Pending Coaches',
        'admin.approve': 'Approve',
        'admin.reject': 'Reject',
        'admin.rejectreason': 'Rejection Reason',
        'admin.nomorecoaches': 'No more pending coaches',

        // Errors
        'error.unauthorized': 'Unauthorized',
        'error.notfound': 'Not Found',
        'error.internal': 'Something went wrong',
    },

    FR: {
        // Common
        'app.title': 'Mandara Sport',
        'nav.home': 'Accueil',
        'nav.coaches': 'Trouver des Coachs',
        'nav.profile': 'Profil',
        'nav.chat': 'Messages',
        'nav.admin': 'Admin',
        'nav.logout': 'Déconnexion',

        // Auth
        'auth.register': 'Inscription',
        'auth.login': 'Connexion',
        'auth.email': 'Email',
        'auth.password': 'Mot de passe',
        'auth.name': 'Nom complet',
        'auth.signupCoach': "S'inscrire en tant que Coach",
        'auth.signupProspect': "S'inscrire en tant que Client",
        'auth.loginError': 'Email ou mot de passe invalide',
        'auth.registerSuccess': 'Compte créé! Veuillez vous connecter.',

        // Prospect onboarding
        'prospect.onboarding.title': 'Complétez Votre Profil',
        'prospect.onboarding.ageRange': 'Tranche d\'âge',
        'prospect.onboarding.height': 'Hauteur (cm)',
        'prospect.onboarding.weight': 'Poids (kg)',
        'prospect.onboarding.skip': 'Passer',
        'prospect.onboarding.complete': 'Terminer',

        // Coach onboarding
        'coach.onboarding.title': 'Profil du Coach',
        'coach.onboarding.discipline': 'Discipline/Expertise',
        'coach.onboarding.portfolio': 'Portfolio ou CV',
        'coach.onboarding.bio': 'Bio',
        'coach.onboarding.upload': 'Télécharger Certificats et Médias',
        'coach.onboarding.pending': 'Votre profil est en attente d\'approbation.',
        'coach.onboarding.approved': 'Votre profil est approuvé! Vous êtes visible pour les clients.',
        'coach.onboarding.rejected': 'Votre profil a été rejeté. Raison: ',

        // Coach discovery
        'coaches.title': 'Trouver un Coach',
        'coaches.filter': 'Filtrer par Discipline',
        'coaches.noresults': 'Aucun coach trouvé',
        'coaches.viewprofile': 'Voir le Profil',
        'coaches.startchat': 'Démarrer une Conversation',

        // Chat
        'chat.title': 'Messages',
        'chat.nochats': 'Pas de conversations actives',
        'chat.typemessage': 'Tapez un message...',
        'chat.send': 'Envoyer',

        // Admin
        'admin.title': 'Tableau de Bord Admin',
        'admin.pendingcoaches': 'Coachs en Attente',
        'admin.approve': 'Approuver',
        'admin.reject': 'Rejeter',
        'admin.rejectreason': 'Raison du Rejet',
        'admin.nomorecoaches': 'Pas de coachs en attente',

        // Errors
        'error.unauthorized': 'Non autorisé',
        'error.notfound': 'Non trouvé',
        'error.internal': 'Une erreur est survenue',
    },
};

/**
 * Get a translated string for the given language and key.
 * Falls back to French if translation not found.
 */
export function t(key: string, language: Language = 'FR'): string {
    return translations[language]?.[key] || translations.FR[key] || key;
}

/**
 * Get the preferred language from browser or localStorage.
 * Defaults to 'FR'.
 */
export function getPreferredLanguage(): Language {
    if (typeof window !== 'undefined') {
        // Client-side: check localStorage or browser locale
        const stored = localStorage.getItem('language');
        if (stored === 'FR' || stored === 'EN') return stored;

        const browserLang = navigator.language.split('-')[0].toUpperCase();
        if (browserLang === 'FR') return 'FR';
    }

    return 'FR';
}
