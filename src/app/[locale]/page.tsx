import HomeHero from '@/components/home/Hero';
import AboutSection from '@/components/home/AboutSection';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import DisciplinesSection from '@/components/home/DisciplinesSection';
import HomeCTA from '@/components/home/HomeCTA';
import Testimonials from '@/components/home/Testimonials';

export default function HomePage() {
  return (
    <main>
      <HomeHero />
      <AboutSection />
      <WhyChooseUs />
      <DisciplinesSection />
      <HomeCTA />
      <Testimonials />
    </main>
  );
}
