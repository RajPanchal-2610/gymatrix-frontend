import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import {
  Monitor,
  Download,
  Zap,
  Sparkles,
  CheckCircle2,
  X,
  ExternalLink,
} from "lucide-react";

interface InstallAppDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showBanner?: boolean;
}

export function InstallAppDialog({
  open: externalOpen,
  onOpenChange: setExternalOpen,
  showBanner = true,
}: InstallAppDialogProps) {
  const { isInstallable, isInstalled, promptInstall, hasNativePrompt } = usePWAInstall();
  const [internalOpen, setInternalOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const isDialogOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsDialogOpen = (val: boolean) => {
    if (setExternalOpen) {
      setExternalOpen(val);
    } else {
      setInternalOpen(val);
    }
  };

  useEffect(() => {
    const dismissed = localStorage.getItem("gymatrix_pwa_banner_dismissed");
    if (dismissed === "true") {
      setBannerDismissed(true);
    }
  }, []);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem("gymatrix_pwa_banner_dismissed", "true");
  };

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      const installed = await promptInstall();
      if (installed) {
        setIsDialogOpen(false);
        return;
      }
    }
    // If native prompt wasn't available or was already shown, open the modal with instructions
    setIsDialogOpen(true);
  };

  // If already running inside standalone desktop/mobile app, don't show prompts
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom-Right Banner for easy discovery */}
      {showBanner && !bannerDismissed && (
        <aside
          aria-label="Desktop application installation prompt"
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-primary/20 bg-card/95 p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-md">
              <Monitor className="h-6 w-6" />
            </div>

            <div className="flex-1 pr-6">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                Install Gymatrix App
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  Desktop
                </span>
              </h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Install Gymatrix as a standalone desktop app for instant access from your taskbar or start menu.
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleInstallClick}
                  className="h-8 gap-1.5 text-xs font-semibold px-3 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  Install Now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismissBanner}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  Later
                </Button>
              </div>
            </div>

            <button
              onClick={handleDismissBanner}
              className="absolute top-3 right-3 text-muted-foreground/60 hover:text-foreground transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Main Install Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-left">
            <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
              <Monitor className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold">
              Install Gymatrix as Desktop App
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Run Gymatrix in its own high-performance window with zero browser distractions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
              <Zap className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-foreground">One-Click Launch</p>
                <p className="text-muted-foreground">
                  Pin to your Windows Taskbar, Desktop, or Start Menu for instant access.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-foreground">Full Desktop Window</p>
                <p className="text-muted-foreground">
                  No URL bar, no tab clutter, with smooth native-like performance.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-foreground">Automatic Updates</p>
                <p className="text-muted-foreground">
                  Always up-to-date with your latest gym data and features automatically.
                </p>
              </div>
            </div>

            {!hasNativePrompt && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  How to install from your browser:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground dark:text-blue-200/80">
                  <li>
                    <strong>Chrome / Edge on PC:</strong> Look for the <strong>Install</strong> icon (🖥️ or ⬇️) on the right side of the address bar, or click browser menu <strong>(⋮) → Cast, save and share → Install Gymatrix</strong>.
                  </li>
                  <li>
                    <strong>Mobile (iOS Safari):</strong> Tap the <strong>Share</strong> button (📤) and select <strong>"Add to Home Screen"</strong>.
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Close
            </Button>
            {hasNativePrompt && (
              <Button
                type="button"
                className="gap-2 font-semibold shadow-md"
                onClick={async () => {
                  await promptInstall();
                  setIsDialogOpen(false);
                }}
              >
                <Download className="h-4 w-4" />
                Install App Now
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

