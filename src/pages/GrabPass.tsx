import { useEffect } from "react";

export default function GrabPass() {
  useEffect(() => {
    // Redirect old grab-pass URLs to the new payment flow
    window.location.href = '/pay';
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Redirecting...</h2>
        <p className="text-muted-foreground">Taking you to the new payment flow</p>
      </div>
    </div>
  );
}