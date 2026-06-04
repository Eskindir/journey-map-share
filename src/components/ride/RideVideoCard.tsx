import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Video,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useVideoRequest } from "@/hooks/useVideoRequest";

interface RideVideoCardProps {
  /** Ride confirmation to request the video for. Null while still resolving. */
  confirmationId: string | null;
  /** Rider's decryption key (captured from the tracking link). */
  riderKey: string | null;
}

/**
 * Hosts the entire "request a ride video" state machine on the ride-end screen.
 *
 * Delivery is via Telegram: the rider taps to start the decrypt/merge and link
 * their Telegram chat; the bot sends the ready video link when merging finishes
 * (minutes later). The card also offers an in-app open as a fallback. State is
 * persisted by useVideoRequest, so closing and returning resumes correctly.
 */
const RideVideoCard = ({ confirmationId, riderKey }: RideVideoCardProps) => {
  const {
    state,
    isBusy,
    isStalled,
    error,
    requestAndOpenTelegram,
    resendToTelegram,
    openInApp,
    retry,
  } = useVideoRequest(confirmationId, riderKey);

  const disabled = isBusy || !confirmationId;

  return (
    <Card className="w-full max-w-md border-primary/30">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Video className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold leading-tight">Ride video</h3>
            <p className="text-xs text-muted-foreground">
              Get a recording of your ride
            </p>
          </div>
        </div>

        {/* IDLE — invite to request */}
        {state === "idle" && (
          <>
            <p className="text-sm text-muted-foreground">
              We can prepare a video of your ride and send it to your Telegram.
              It takes a few minutes — you don&apos;t have to wait here.
            </p>
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={requestAndOpenTelegram}
              disabled={disabled}
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Get my video on Telegram
            </Button>
          </>
        )}

        {/* GENERATING — calm waiting state, polling in background */}
        {state === "generating" && (
          <>
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Preparing your video…</p>
                <p className="text-xs text-muted-foreground">
                  We&apos;ll send the link to your Telegram when it&apos;s ready.
                  You can close this page and come back anytime.
                </p>
              </div>
            </div>

            {isStalled && (
              <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500">
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  This is taking longer than usual — it&apos;s still working.
                  Hang tight, or re-open Telegram below.
                </span>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={resendToTelegram}
              disabled={disabled}
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Open Telegram again
            </Button>
          </>
        )}

        {/* READY — delivered to Telegram, with in-app fallback */}
        {state === "ready" && (
          <>
            <div className="flex items-start gap-3 rounded-lg bg-success/10 p-3">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Your video is ready</p>
                <p className="text-xs text-muted-foreground">
                  We&apos;ve sent the link to your Telegram. You can also open it
                  here.
                </p>
              </div>
            </div>

            <Button
              className="w-full gap-2"
              size="lg"
              onClick={openInApp}
              disabled={disabled}
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Video className="h-4 w-4" />
              )}
              Open video here
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={resendToTelegram}
              disabled={disabled}
            >
              <Send className="h-4 w-4" />
              Resend to Telegram
            </Button>
          </>
        )}

        {/* FAILED — explicit retry, never a dead end */}
        {state === "failed" && (
          <>
            <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Couldn&apos;t request the video</p>
                <p className="text-xs text-muted-foreground">
                  {error || "Something went wrong. Please try again."}
                </p>
              </div>
            </div>
            <Button
              className="w-full gap-2"
              onClick={retry}
              disabled={disabled}
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Try again
            </Button>
          </>
        )}

        {/* Inline error for non-fatal action failures (e.g. open fallback) */}
        {state !== "failed" && error && (
          <p className="text-xs text-destructive text-center">{error}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default RideVideoCard;
