-- Script SQL pour créer un compte administrateur
-- Usage: psql -U postgres -d coachme -f scripts/create-admin.sql

-- Créer un admin avec mot de passe: Admin123!
-- Hash bcrypt généré pour "Admin123!"
INSERT INTO "User" (id, email, password, role, name, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@coachme.cm',
  '$2b$12$4q5BsvAkr6a013rZzzl5TeYy4Wq3gmmgjy.UDqwdz8.Rl5iO81ysy',
  'ADMIN',
  'Admin CoachMe',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Créer quelques disciplines de base
INSERT INTO "Discipline" (name, "imageUrl", "createdAt", "updatedAt") VALUES
('Yoga', NULL, NOW(), NOW()),
('CrossFit', NULL, NOW(), NOW()),
('Musculation', NULL, NOW(), NOW()),
('Cardio', NULL, NOW(), NOW()),
('Pilates', NULL, NOW(), NOW()),
('Boxing', NULL, NOW(), NOW()),
('HIIT', NULL, NOW(), NOW()),
('Natation', NULL, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Afficher les résultats
SELECT 'Admin créé:' as message;
SELECT email, role, name FROM "User" WHERE role = 'ADMIN';

SELECT '' as message;
SELECT 'Disciplines créées:' as message;
SELECT id, name FROM "Discipline" ORDER BY name;
