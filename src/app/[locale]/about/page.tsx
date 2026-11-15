import AboutHero from '@/components/about/AboutHero';
import MissionVision from '@/components/about/MissionVision';
import CoreValues from '@/components/about/CoreValues';
import AboutStory from '@/components/about/AboutStory';
import HomeCTA from '@/components/home/HomeCTA';
import React from 'react';

// <Testimonials /> is hidden until real client testimonials are available
// (the current items are placeholders). Re-add it below <HomeCTA /> later.

export default function AboutPage() {
    return (
        <main>
            <AboutHero />
            <MissionVision />
            <CoreValues />
            <AboutStory />
            <HomeCTA />
        </main>
    );
}
