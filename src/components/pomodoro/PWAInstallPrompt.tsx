'use client';

import { useState, useEffect } from 'react';
import { Share, PlusSquare, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'other' | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (navigator as any).standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // 2. Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);

    // 3. Handle Chrome/Android "beforeinstallprompt"
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform('other');
      
      // Show prompt after a short delay or based on logic
      const hasDismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!hasDismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Handle iOS Safari
    if (isIos && isSafari) {
      setTimeout(() => setPlatform('ios'), 0);
      const hasDismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!hasDismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-x-4 bottom-24 z-[100] flex justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-2xl p-5 pointer-events-auto"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pomodoro-work flex flex-shrink-0 items-center justify-center text-xl shadow-sm">
                🍅
              </div>
              <div>
                <h3 className="text-sm font-bold">Install Pomodoro Focus</h3>
                <p className="text-xs text-muted-foreground">Add to home screen for the best experience</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1 text-muted-foreground" onClick={dismissPrompt}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {platform === 'ios' ? (
            <div className="space-y-4">
              <div className="text-[13px] leading-relaxed text-foreground/80">
                1. Tap the <Share className="inline h-4 w-4 mx-1 text-blue-500" /> icon in the browser toolbar.
                <br />
                2. Scroll down and tap <span className="font-bold">"Add to Home Screen"</span> <PlusSquare className="inline h-4 w-4 mx-1" />.
              </div>
              <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-10 text-xs font-bold" onClick={dismissPrompt}>
                Got it
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[13px] text-foreground/80">
                Install our app to get full-screen mode and better background notifications.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-bold" onClick={dismissPrompt}>
                  Later
                </Button>
                <Button className="flex-1 bg-pomodoro-work hover:bg-pomodoro-work/90 text-white rounded-xl h-10 text-xs font-bold gap-2" onClick={handleInstall}>
                  <Download className="h-4 w-4" />
                  Install Now
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
