/**
 * prisma/seed.ts
 * Database seeding script to create initial admin user and test data
 * Run with: node --loader ts-node/esm prisma/seed.ts
 * Or add to package.json: "prisma:seed": "tsx prisma/seed.ts"
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create disciplines
  const disciplines = [
    "Yoga",
    "Strength Training",
    "CrossFit",
    "Pilates",
    "Boxing",
    "Running",
    "Swimming",
    "Personal Training",
    "Nutrition Coaching",
    "Cycling",
    "Martial Arts",
    "Dance",
    "Calisthenics",
    "Powerlifting",
    "Bodybuilding",
    // Combined disciplines used by coaches
    "Yoga & Pilates",
    "Boxing & Cardio",
  ];

  for (const disciplineName of disciplines) {
    const existingDiscipline = await prisma.discipline.findUnique({
      where: { name: disciplineName },
    });

    if (!existingDiscipline) {
      await prisma.discipline.create({
        data: { name: disciplineName },
      });
      console.log(`✅ Created discipline: ${disciplineName}`);
    } else {
      console.log(`✅ Discipline already exists: ${disciplineName}`);
    }
  }

  // Create admin user
  const adminEmail = "admin@mandara-fitness.com";
  const adminPassword = "Admin123!";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("✅ Admin user already exists");
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: "ADMIN",
        name: "Admin User",
      },
    });
    console.log(`✅ Created admin user: ${admin.email}`);
    console.log(`   Password: ${adminPassword}`);
  }

  // Create 5 approved coaches with complete profile data
  const coaches = [
    {
      email: "sarah.kamga@mandara.com",
      password: "Coach123!",
      name: "Sarah Kamga",
      discipline: "Yoga & Pilates",
      bio: "Certified yoga instructor specializing in Vinyasa and Hatha yoga. I help clients find balance between strength, flexibility, and mindfulness. 8 years of teaching experience.",
      portfolio: "https://sarahyoga-cm.com",
      rateAmount: 8000,
      rateType: "HOUR" as const,
      experienceYears: 8,
      address: "Bonapriso",
      city: "Douala",
      country: "Cameroon",
      minRating: 4.8,
      instagram: "https://instagram.com/sarahyoga_cm",
      facebook: "https://facebook.com/sarahkamgayoga",
      tiktok: "https://tiktok.com/@sarahyoga",
    },
    {
      email: "pierre.nkomo@mandara.com",
      password: "Coach123!",
      name: "Pierre Nkomo",
      discipline: "Strength Training",
      bio: "Former professional athlete turned strength and conditioning coach. Specialized in functional training and athletic performance. I work with both beginners and advanced athletes.",
      portfolio: "https://pierrefitness.com",
      rateAmount: 60000,
      rateType: "WEEK" as const,
      experienceYears: 12,
      address: "Bastos",
      city: "Yaoundé",
      country: "Cameroon",
      minRating: 4.9,
      instagram: "https://instagram.com/pierre_strength",
      youtube: "https://youtube.com/@pierrenkomofit",
    },
    {
      email: "marie.fotso@mandara.com",
      password: "Coach123!",
      name: "Marie Fotso",
      discipline: "CrossFit",
      bio: "CrossFit Level 2 certified trainer with a passion for high-intensity functional movements. I help clients push their limits safely while building strength and endurance.",
      portfolio: null,
      rateAmount: 10000,
      rateType: "HOUR" as const,
      experienceYears: 6,
      address: "Akwa",
      city: "Douala",
      country: "Cameroon",
      minRating: 4.7,
      facebook: "https://facebook.com/mariefotsofit",
      tiktok: "https://tiktok.com/@mariefitness",
    },
    {
      email: "hassan.mballa@mandara.com",
      password: "Coach123!",
      name: "Hassan Mballa",
      discipline: "Boxing & Cardio",
      bio: "Professional boxing coach and cardio specialist. I combine boxing techniques with high-energy cardio workouts for maximum fat burn and conditioning. All fitness levels welcome!",
      portfolio: "https://hassanboxing.com",
      rateAmount: 45000,
      rateType: "WEEK" as const,
      experienceYears: 10,
      address: "Bali",
      city: "Douala",
      country: "Cameroon",
      minRating: 4.6,
      instagram: "https://instagram.com/hassanboxing",
      twitter: "https://x.com/hassanboxfit",
      youtube: "https://youtube.com/@hassanmballa",
    },
    {
      email: "grace.ewane@mandara.com",
      password: "Coach123!",
      name: "Grace Ewane",
      discipline: "Personal Training",
      bio: "Holistic fitness coach focusing on sustainable lifestyle changes. I create personalized training and nutrition plans to help you reach your goals while maintaining balance in life.",
      portfolio: "https://gracefit-cm.com",
      rateAmount: 250000,
      rateType: "MONTH" as const,
      experienceYears: 9,
      address: "Odza",
      city: "Yaoundé",
      country: "Cameroon",
      minRating: 4.8,
      instagram: "https://instagram.com/gracefit_cm",
      facebook: "https://facebook.com/graceewanefit",
    },
  ];

  const password = "Coach123!";
  const hashedPassword = await bcrypt.hash(password, 10);

  for (const coachData of coaches) {
    const existingCoach = await prisma.user.findUnique({
      where: { email: coachData.email },
    });

    if (!existingCoach) {
      // Find the discipline by name
      const discipline = await prisma.discipline.findUnique({
        where: { name: coachData.discipline },
      });

      if (!discipline) {
        console.log(
          `❌ Discipline not found: ${coachData.discipline} for coach ${coachData.name}`
        );
        continue;
      }

      await prisma.user.create({
        data: {
          email: coachData.email,
          password: hashedPassword,
          role: "COACH",
          name: coachData.name,
          coachProfile: {
            create: {
              disciplineId: discipline.id,
              bio: coachData.bio,
              portfolio: coachData.portfolio,
              rateAmount: coachData.rateAmount,
              rateType: coachData.rateType,
              experienceYears: coachData.experienceYears,
              address: coachData.address,
              city: coachData.city,
              country: coachData.country,
              minRating: coachData.minRating,
              instagram: coachData.instagram || null,
              facebook: coachData.facebook || null,
              tiktok: coachData.tiktok || null,
              twitter: coachData.twitter || null,
              youtube: coachData.youtube || null,
              status: "APPROVED",
            },
          },
        },
      });
      console.log(`✅ Created coach: ${coachData.name} (${coachData.email})`);
    } else {
      console.log(`✅ Coach already exists: ${coachData.name}`);
    }
  }

  // Create a test client
  const clientEmail = "client@example.com";
  const clientPassword = "Client123!";

  const existingClient = await prisma.user.findUnique({
    where: { email: clientEmail },
  });

  if (!existingClient) {
    const hashedPassword = await bcrypt.hash(clientPassword, 10);
    const client = await prisma.user.create({
      data: {
        email: clientEmail,
        password: hashedPassword,
        role: "PROSPECT",
        name: "Jane Client",
        clientProfile: {
          create: {
            ageRange: "25-34",
            heightCm: 165,
            weightKg: 60,
          },
        },
      },
      include: {
        clientProfile: true,
      },
    });
    console.log(`✅ Created test client: ${client.email}`);
    console.log(`   Password: ${clientPassword}`);
  } else {
    console.log("✅ Test client already exists");
  }

  console.log("\n🎉 Database seeding completed!");
  console.log("\n📝 Test Credentials:");
  console.log("━".repeat(60));
  console.log("Admin:  admin@mandara-fitness.com / Admin123!");
  console.log("Client: client@example.com / Client123!");
  console.log("\n🏋️ Approved Coaches (all with password: Coach123!):");
  console.log("  1. sarah.kamga@mandara.com - Yoga & Pilates (8000 XAF/hr)");
  console.log(
    "  2. pierre.nkomo@mandara.com - Strength Training (60000 XAF/week)"
  );
  console.log("  3. marie.fotso@mandara.com - CrossFit (10000 XAF/hr)");
  console.log(
    "  4. hassan.mballa@mandara.com - Boxing & Cardio (45000 XAF/week)"
  );
  console.log(
    "  5. grace.ewane@mandara.com - Personal Training (250000 XAF/month)"
  );
  console.log("━".repeat(60));
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
