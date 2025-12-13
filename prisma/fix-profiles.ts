/**
 * Fix missing profiles for existing users
 * Run with: npx tsx prisma/fix-profiles.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Fixing missing user profiles...\n');

    // Fix PROSPECT users without ClientProfile
    const prospectsWithoutProfile = await prisma.user.findMany({
        where: {
            role: 'PROSPECT',
            clientProfile: null,
        },
    });

    if (prospectsWithoutProfile.length > 0) {
        console.log(`Found ${prospectsWithoutProfile.length} PROSPECT users without ClientProfile`);

        for (const user of prospectsWithoutProfile) {
            await prisma.clientProfile.create({
                data: {
                    userId: user.id,
                },
            });
            console.log(`  ✅ Created ClientProfile for user ${user.email}`);
        }
    } else {
        console.log('✅ All PROSPECT users have ClientProfile');
    }

    // Fix COACH users without CoachProfile
    const coachesWithoutProfile = await prisma.user.findMany({
        where: {
            role: 'COACH',
            coachProfile: null,
        },
    });

    if (coachesWithoutProfile.length > 0) {
        console.log(`\nFound ${coachesWithoutProfile.length} COACH users without CoachProfile`);

        for (const user of coachesWithoutProfile) {
            await prisma.coachProfile.create({
                data: {
                    userId: user.id,
                    discipline: 'General Fitness',
                    status: 'APPROVED',
                },
            });
            console.log(`  ✅ Created CoachProfile for user ${user.email}`);
        }
    } else {
        console.log('✅ All COACH users have CoachProfile');
    }

    // Fix coach role mismatch (users with CoachProfile but wrong role)
    const mismatched = await prisma.user.findMany({
        where: {
            role: 'PROSPECT',
            coachProfile: {
                isNot: null,
            },
        },
        include: {
            coachProfile: true,
        },
    });

    if (mismatched.length > 0) {
        console.log(`\nFound ${mismatched.length} users with CoachProfile but PROSPECT role`);

        for (const user of mismatched) {
            await prisma.user.update({
                where: { id: user.id },
                data: { role: 'COACH' },
            });
            console.log(`  ✅ Updated role to COACH for user ${user.email}`);
        }
    } else {
        console.log('✅ All users have correct roles');
    }

    console.log('\n🎉 Profile fix completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
