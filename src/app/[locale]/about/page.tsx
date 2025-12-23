import AboutHero from '@/components/about/AboutHero';
import MissionVision from '@/components/about/MissionVision';
import CoreValues from '@/components/about/CoreValues';
import AboutStory from '@/components/about/AboutStory';
import HomeCTA from '@/components/home/HomeCTA';
import Testimonials from '@/components/home/Testimonials';
import React from 'react';

export default function AboutPage() {
    return (
        <main>
            <AboutHero />
            <MissionVision />
            <CoreValues />
            <AboutStory />
            <HomeCTA />
            <Testimonials />
        </main>
    );
}
