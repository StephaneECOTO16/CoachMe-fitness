'use client';

import React, { useState, useEffect } from 'react';
import DashboardSection from '@/components/sections/DashboardSection';
import Button from '@/components/ui/Button';

export default function AdminWhatsAppSettings() {
    const [status, setStatus] = useState<string>('loading');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const checkStatus = async () => {
        try {
            setError(null);
            const res = await fetch('/api/admin/whatsapp?action=status');
            const data = await res.json();
            
            if (data.error) throw new Error(data.error);
            setStatus(data.status); // e.g. "open", "close", "connecting", "not_created"
        } catch (err: any) {
            setStatus('error');
            setError(err.message || 'Failed to fetch WhatsApp status');
        }
    };

    const handleConnect = async () => {
        setIsLoading(true);
        setError(null);
        setQrCode(null);
        try {
            const res = await fetch('/api/admin/whatsapp?action=connect');
            const data = await res.json();
            
            if (data.error) throw new Error(data.error);
            
            // If evolution api returns a QR in base64 format
            if (data.qrcode && data.qrcode.base64) {
                setQrCode(data.qrcode.base64);
                setStatus('qr_ready');
            } else if (data.base64) {
                setQrCode(data.base64);
                setStatus('qr_ready');
            } else {
                // Already connected or unexpected response
                await checkStatus();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to generate QR Code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Êtes-vous sûr de vouloir déconnecter WhatsApp ?')) return;
        
        setIsLoading(true);
        try {
            await fetch('/api/admin/whatsapp', { method: 'DELETE' });
            await checkStatus();
        } catch (err: any) {
            setError(err.message || 'Failed to disconnect');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
        // Polling if waiting for scan
        const interval = setInterval(() => {
            if (status === 'qr_ready' || status === 'connecting') {
                checkStatus();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [status]);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">Intégration WhatsApp (Evolution API)</h1>
            <p className="text-gray-400">
                Liez un numéro de téléphone WhatsApp à la plateforme CoachMe pour envoyer automatiquement les notifications par message WhatsApp en plus de l'application.
            </p>

            <DashboardSection title="État de la connexion">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-medium mb-1">Statut Actuel</h3>
                        <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${status === 'open' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                            <span className="font-semibold uppercase">
                                {status === 'open' ? 'Connecté' : 
                                 status === 'loading' ? 'Vérification...' : 
                                 status === 'qr_ready' ? 'En attente de scan' : 
                                 status === 'not_created' ? 'Non configuré' : 
                                 status}
                            </span>
                        </div>
                    </div>
                </div>

                {status === 'open' ? (
                    <div>
                        <p className="text-green-400 mb-4">Le système WhatsApp est connecté et fonctionnel. Les notifications seront envoyées automatiquement aux numéros de téléphone valides.</p>
                        <Button 
                            variant="danger" 
                            onClick={handleDisconnect} 
                            disabled={isLoading}
                        >
                            {isLoading ? 'Déconnexion...' : 'Déconnecter le numéro'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <p className="text-gray-300">
                            Pour configurer WhatsApp, générez un QR code ci-dessous et scannez-le avec l'application WhatsApp de votre téléphone professionnel (Appareils connectés).
                        </p>
                        
                        {!qrCode ? (
                            <Button 
                                variant="primary" 
                                onClick={handleConnect} 
                                disabled={isLoading || status === 'loading'}
                            >
                                {isLoading ? 'Génération...' : 'Générer le QR Code'}
                            </Button>
                        ) : (
                            <div className="flex flex-col items-center p-6 bg-white rounded-xl w-fit">
                                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                                <p className="text-black font-medium mt-4">Scannez ce QR Code avec WhatsApp</p>
                            </div>
                        )}
                    </div>
                )}
            </DashboardSection>
        </div>
    );
}
