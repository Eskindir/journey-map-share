import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertCircle,
  BadgeCheck,
  Car,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  MapPin,
  Phone,
  Play,
  RotateCw,
  Share2,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";
import MapView from "@/components/MapView";
import besecLogo from "@/assets/app_logo.jpg";

type LatLng = { latitude: number; longitude: number };

/** How many seconds of the clip the preview plays before looping. */
const PREVIEW_SECONDS = 15;

export interface VideoReceiptProps {
  /** Publicly-resolvable ride confirmation id (also used as the receipt number). */
  receiptId: string;
  /** URL of the decrypted ride video, once available. */
  videoUrl?: string | null;
  /** Optional poster frame to show before the video loads. */
  posterUrl?: string | null;
  /** URL used for the QR code + share sheet. Falls back to window.location.href. */
  shareUrl?: string;

  /**
   * Whether to show the video (rider only). Friends & family following the ride
   * don't have the rider's key, so instead of the player they see an arrival
   * confirmation. Default true.
   */
  showVideo?: boolean;

  /** True when the video request/merge has failed (shows a retry affordance). */
  isFailed?: boolean;
  /** Retry the video request after a failure. */
  onRetry?: () => void;

  /**
   * Hero mode. 'full' (default, short rides): the full video plays inline as today.
   * 'preview' (long rides): a ~15s preview loops in the hero and Download prepares
   * the full video on demand.
   */
  mode?: "preview" | "full";
  /** Preview clip URL (preview mode). */
  previewUrl?: string | null;
  /** Preview request state (preview mode). */
  previewState?: "idle" | "loading" | "ready" | "unavailable" | "failed";
  /** Reason a preview request failed (shown under the failed state). */
  previewError?: string | null;
  /** Retry the preview request. */
  onRetryPreview?: () => void;
  /** Start preparing + downloading the full video (preview mode). */
  onDownloadFull?: () => void;
  /** True while the full video is being prepared after a Download tap. */
  fullPending?: boolean;

  driver: {
    name: string;
    pictureUrl?: string;
    plate?: string;
    model?: string;
    rating?: number;
    phone?: string;
  };

  trip: {
    pickupLabel?: string;
    dropoffLabel?: string;
    startedAt?: string; // ISO
    endedAt?: string; // ISO
    distanceKm?: number;
    status: "ArrivedSafely" | "RideEndedByDriver" | "Cancelled" | string;
  };

  /** Coordinates for the route preview (fallback endpoints). */
  map?: {
    lastPosition?: LatLng;
    destination?: LatLng;
  };

  /** Full travelled path — drawn as a polyline on the route strip when present. */
  locationHistory?: LatLng[];
}

const formatTime = (iso?: string) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
};

const formatDate = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
};

const formatDuration = (a?: string, b?: string) => {
  if (!a || !b) return "—";
  try {
    const ms = Math.max(0, new Date(b).getTime() - new Date(a).getTime());
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  } catch {
    return "—";
  }
};

/**
 * Video Receipt — reframes ride-end as a tamper-evident receipt whose "line item"
 * is the ride video itself. Ticket-style layout: perforated header with the
 * receipt number, video hero, then map + driver + trip metadata + verification
 * stamp with a QR code that points back to the shareable receipt URL.
 */
const VideoReceipt = ({
  receiptId,
  videoUrl,
  posterUrl,
  shareUrl,
  showVideo = true,
  isFailed,
  onRetry,
  mode = "full",
  previewUrl,
  previewState = "idle",
  previewError,
  onRetryPreview,
  onDownloadFull,
  fullPending,
  driver,
  trip,
  map,
  locationHistory,
}: VideoReceiptProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const isPreview = mode === "preview";

  const resolvedShareUrl = useMemo(() => {
    if (shareUrl) return shareUrl;
    if (typeof window !== "undefined") return window.location.href;
    return "";
  }, [shareUrl]);

  const qrSrc = useMemo(() => {
    if (!resolvedShareUrl) return "";
    const encoded = encodeURIComponent(resolvedShareUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encoded}`;
  }, [resolvedShareUrl]);

  const statusLabel =
    trip.status === "Cancelled"
      ? "Cancelled"
      : trip.status === "RideEndedByDriver"
        ? "Ended by driver"
        : "Arrived safely";

  const arrivalLabel =
    trip.status === "Cancelled" ? "Ride cancelled" : "Customer has arrived";

  const handleDownload = async () => {
    if (!videoUrl) return;
    try {
      const res = await fetch(videoUrl, { credentials: "omit" });
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `ride-receipt-${receiptId}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5_000);
    } catch {
      // Fallback: open in new tab so the browser can save it.
      window.open(videoUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleShare = async () => {
    if (!resolvedShareUrl) return;
    const nav =
      typeof navigator !== "undefined"
        ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> })
        : null;
    if (nav?.share) {
      try {
        await nav.share({ title: `Ride receipt ${receiptId}`, url: resolvedShareUrl });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(resolvedShareUrl);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="w-full max-w-lg drop-shadow-xl">
    <Card className="receipt-torn-bottom w-full rounded-b-none bg-gradient-to-b from-card via-card to-accent/20 backdrop-blur-sm border-border/60 overflow-hidden">
      {/* Perforated ticket header */}
      <div className="relative bg-gradient-to-br from-primary/15 via-accent/40 to-card px-6 pt-6 pb-8 border-b-2 border-dashed border-muted-foreground/40">
        <div
          aria-hidden
          className="absolute -left-3 -bottom-3 h-6 w-6 rounded-full bg-background"
        />
        <div
          aria-hidden
          className="absolute -right-3 -bottom-3 h-6 w-6 rounded-full bg-background"
        />
        <div className="flex items-start justify-between gap-3">
          {/* BeSEC brand lockup */}
          <div className="flex items-center gap-3">
            <img
              src={besecLogo}
              alt="BeSEC"
              className="h-11 w-11 shrink-0 rounded-xl bg-white p-1 shadow-sm ring-1 ring-border/50"
            />
            <div>
              <p className="font-display text-xl font-bold leading-none tracking-tight">
                BeSEC
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                {showVideo ? "Video Receipt" : "Ride Summary"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-success">
              <ShieldCheck className="h-3.5 w-3.5" />
              {statusLabel}
            </div>
            {typeof driver.rating === "number" && (
              <div className="flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">
                <Star className="h-3.5 w-3.5 fill-current" />
                {driver.rating.toFixed(1)}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono font-semibold tracking-tight text-foreground">
            #{receiptId.slice(0, 10).toUpperCase()}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(trip.endedAt)} · {formatTime(trip.endedAt)}
          </span>
          <span>·</span>
          <span>Duration {formatDuration(trip.startedAt, trip.endedAt)}</span>
        </div>
      </div>

      <CardContent className="p-0">
        {/* Video hero (the receipt's "line item") */}
        <div className="relative aspect-video w-full bg-muted">
          {!showVideo ? (
            /* Friends & family don't have the rider's key — show an arrival
               confirmation instead of the video. */
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-success/15 via-success/5 to-transparent px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 ring-4 ring-success/10">
                <CheckCircle2 className="h-9 w-9 text-success" strokeWidth={2.5} />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{arrivalLabel}</p>
                <p className="text-xs text-muted-foreground">
                  The ride has been completed.
                </p>
              </div>
            </div>
          ) : isPreview ? (
            /* PREVIEW MODE — ~15s looping clip; full video is on-demand (Download). */
            previewState === "ready" && previewUrl ? (
              <>
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain bg-black"
                />
                <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                  {PREVIEW_SECONDS}s preview
                </span>
              </>
            ) : previewState === "failed" ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted to-muted/40 px-6 text-center">
                <div className="rounded-full bg-background p-3 shadow-sm">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-sm font-medium">Couldn&apos;t load the preview</p>
                {previewError && (
                  <p className="max-w-[90%] break-words text-xs text-muted-foreground">
                    {previewError}
                  </p>
                )}
                {onRetryPreview && (
                  <Button variant="outline" size="sm" onClick={onRetryPreview} className="gap-1.5">
                    <RotateCw className="h-4 w-4" /> Try again
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/40 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm font-medium">Loading preview…</p>
              </div>
            )
          ) : videoUrl ? (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                poster={posterUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={() => setVideoReady(true)}
                className="h-full w-full object-cover"
              />
              {!videoReady && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/50 to-transparent">
                  <div className="rounded-full bg-white/90 p-3 shadow-lg">
                    <Play className="h-6 w-6 text-primary" />
                  </div>
                </div>
              )}
            </>
          ) : isFailed ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted to-muted/40 px-6 text-center">
              <div className="rounded-full bg-background p-3 shadow-sm">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Couldn&apos;t prepare your video</p>
                <p className="text-xs text-muted-foreground">
                  Something went wrong while decrypting the recording.
                </p>
              </div>
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
                  <RotateCw className="h-4 w-4" /> Try again
                </Button>
              )}
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/40 text-center text-muted-foreground">
              <div className="rounded-full bg-background p-3 shadow-sm">
                <Play className="h-6 w-6 text-primary/70" />
              </div>
              <p className="text-sm font-medium">Video receipt preparing…</p>
              <p className="text-xs">
                Your recording will appear here as soon as it&apos;s decrypted.
              </p>
            </div>
          )}
          {showVideo && (
            <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/90">
              Rec · {receiptId.slice(-6).toUpperCase()}
            </div>
          )}
        </div>

        {/* Video actions (rider only) */}
        {showVideo && (
        <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
          {isPreview ? (
            <Button
              variant="default"
              size="sm"
              onClick={onDownloadFull}
              disabled={fullPending || !onDownloadFull}
              className="gap-1.5"
            >
              {fullPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparing full video…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Download full video
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleDownload}
              disabled={!videoUrl}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" /> Download
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
            <Share2 className="h-4 w-4" /> Share receipt
          </Button>
        </div>
        )}

        {/* Route strip */}
        {(map?.lastPosition || map?.destination) && (
          <div className="border-b border-border bg-muted/40">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                Route
              </p>
              <span className="text-xs text-muted-foreground">Path travelled</span>
            </div>
            <div className="h-40 w-full">
              <MapView
                initialPosition={map.lastPosition || map.destination || undefined}
                destinationPosition={map.destination || undefined}
                locationHistory={locationHistory}
                showGoogleMap
              />
            </div>
          </div>
        )}

        {/* Driver + vehicle */}
        <div className="border-b border-border bg-accent/30 px-4 py-4">
          <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            Driver
          </p>
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border border-border">
              <AvatarImage src={driver.pictureUrl} alt={driver.name} />
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">
                  {driver.name || "Unknown driver"}
                </p>
                {typeof driver.rating === "number" && (
                  <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-warning/10 px-1.5 py-0.5 text-[11px] font-semibold text-warning">
                    <Star className="h-3 w-3 fill-current" />
                    {driver.rating.toFixed(1)}
                  </span>
                )}
              </div>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <Car className="h-3.5 w-3.5" />
                {driver.model || "Vehicle"}
              </p>
              {driver.phone && (
                <a
                  href={`tel:${driver.phone}`}
                  className="mt-0.5 flex items-center gap-1 truncate text-xs text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {driver.phone}
                </a>
              )}
            </div>
            {driver.plate && (
              <div className="self-start rounded-md border border-border bg-muted/50 px-2.5 py-1 font-mono text-xs font-semibold tracking-widest">
                {driver.plate}
              </div>
            )}
          </div>
        </div>

        {/* Trip line items */}
        <div className="border-b border-border bg-muted/40 px-4 py-4">
          <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            Trip
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <dt className="text-xs text-muted-foreground">Pickup</dt>
                <dd className="truncate">{trip.pickupLabel || "—"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <dt className="text-xs text-muted-foreground">Dropoff</dt>
                <dd className="truncate">{trip.dropoffLabel || "—"}</dd>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Start</p>
                <p className="mt-0.5 font-mono text-sm">{formatTime(trip.startedAt)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">End</p>
                <p className="mt-0.5 font-mono text-sm">{formatTime(trip.endedAt)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Distance</p>
                <p className="mt-0.5 font-mono text-sm">
                  {trip.distanceKm ? `${trip.distanceKm.toFixed(1)} km` : "—"}
                </p>
              </div>
            </div>
          </dl>
        </div>

        {/* Security stamp + QR */}
        <div className="flex items-center gap-4 bg-gradient-to-br from-success/10 to-accent/25 px-4 py-4">
          {qrSrc && (
            <img
              src={qrSrc}
              alt="Scan to open this receipt"
              width={96}
              height={96}
              className="h-24 w-24 rounded-md border border-border bg-white p-1"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-success">
              <BadgeCheck className="h-4 w-4" />
              <p className="text-sm font-semibold">
                {showVideo ? "Verified recording" : "Verified ride"}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {showVideo
                ? "This receipt links a tamper-evident video to the trip above. Scan the code to reopen the receipt on any device."
                : "This receipt confirms the trip details above. Scan the code to reopen it on any device."}
            </p>
            <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
              ID {receiptId}
            </p>
          </div>
        </div>

        {/* Perforated footer — bottom padding leaves room for the torn sawtooth */}
        <div className="relative border-t-2 border-dashed border-muted-foreground/40 bg-muted/40 px-4 pt-3 pb-7 text-center text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
          <div aria-hidden className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-background" />
          <div aria-hidden className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-background" />
          End of receipt
        </div>
      </CardContent>
    </Card>
    </div>
  );
};

export default VideoReceipt;
