"use client";

import React from 'react';

export default function ContactMap() {
    return (
        <div style={{
            width: '100%',
            height: '300px',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
        }}>
            <iframe
                src="https://maps.google.com/maps?q=Bonamoussadi%20KM%2C%20Douala&t=&z=15&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
            />
        </div>
    );
}
