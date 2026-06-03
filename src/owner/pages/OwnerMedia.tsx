import { useOwner } from '@/owner/owner-context';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Clock, Trash2, Video, FileVideo, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { isMediaFresh } from '@/owner/compliance';

export function OwnerMedia() {
  const { roomId } = useParams({ from: '/owner/media/$roomId' });
  const { media, uploadMedia, rooms, properties, roomStatuses } = useOwner();
  const navigate = useNavigate();
  const existing = media.find((m) => m.roomId === roomId);
  const room = rooms.find((r) => r.id === roomId);
  const status = roomStatuses.find((s) => s.roomId === roomId);
  const prop = properties.find((p) => p.id === status?.propertyId);

  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const [video, setVideo] = useState<string | File>(existing?.videoUrl ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const fresh = isMediaFresh(existing);

  // Photo handlers
  const handlePhotoFiles = (files: FileList) => {
    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file.`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds the 10MB size limit.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPhotos((prev) => {
            if (prev.length >= 6) {
              toast.warning('Maximum 6 photos allowed.');
              return prev;
            }
            return [...prev, e.target!.result as string];
          });
        }
      };
      reader.readAsDataURL(file);
    });
    toast.success('Photos added to upload queue');
  };

  // Video handler
  const handleVideoFile = (files: FileList) => {
    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Only video walkthrough files are allowed.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video file is too large. Max 50MB allowed.');
      return;
    }

    setVideo(file);
    toast.success('Video walkthrough attached');
  };

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handlePhotoFiles(e.dataTransfer.files);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    toast.info('Photo removed from upload queue');
  };

  const removeVideo = () => {
    setVideo('');
    toast.info('Video walkthrough removed');
  };

  const handleUpload = async () => {
    if (photos.length < 3) {
      toast.error('At least 3 photos are required for proof of vacancy.');
      return;
    }
    if (!video) {
      toast.error('A video walkthrough is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await uploadMedia(roomId, photos, video);
      toast.success('Room verification proof published successfully!', {
        description: 'Room listing is now verified and active for the sales team.'
      });
      setTimeout(() => {
        navigate({ to: '/owner/rooms' });
      }, 800);
    } catch (err) {
      console.error(err);
      toast.error('Upload failed. Please check files and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl pb-24">
      {/* HEADER */}
      <header className="border-b border-border/60 pb-5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-warning font-semibold font-mono">Room Verification</div>
        <h1 className="font-display text-2xl font-semibold tracking-tight mt-1">Upload Media Proof</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Provide physical proof of vacancy for room <span className="font-mono text-foreground font-bold">{room?.type ?? roomId}</span> at <span className="font-semibold text-foreground">{prop?.name ?? 'your property'}</span>.
        </p>
        <Link to="/owner/rooms" className="inline-block mt-3 text-xs text-warning-foreground font-semibold hover:underline">
          ← Back to Rooms Management
        </Link>
      </header>

      {/* COMPLIANCE WARNING */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-sm flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-warning" />
            Media Freshness Policy
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            Vacant rooms must have at least 3 photos and 1 video walkthrough. Uploads remain valid for **7 days** before requiring verification renewal to keep listings live.
          </p>
        </div>
        {existing && (
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold uppercase shrink-0 text-center ${
            fresh ? 'bg-success/5 border-success/30 text-success' : 'bg-destructive/5 border-destructive/30 text-destructive'
          }`}>
            {fresh ? `Fresh · Active` : 'Expired'}
            <div className="text-[9px] font-normal text-muted-foreground lowercase mt-0.5">
              {fresh ? `expires ${new Date(existing.expiresAt).toLocaleDateString()}` : 'requires upload'}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PHOTOS COLUMN */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-warning-foreground" />
                <h2 className="font-display font-semibold text-sm">Room Photos ({photos.length}/6)</h2>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">Min 3 required</span>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => photoInputRef.current?.click()}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-warning bg-warning/5 text-warning-foreground ring-2 ring-warning/10'
                  : 'border-muted hover:border-warning/60 hover:bg-muted/10'
              }`}
            >
              <Upload className="h-8 w-8 text-muted-foreground/80 mb-2" />
              <span className="text-xs font-semibold">Select Room Photos or Drag Here</span>
              <span className="text-[10px] text-muted-foreground mt-1 font-mono">PNG, JPG up to 10MB per photo</span>
              <input
                ref={photoInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handlePhotoFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Photo Previews */}
            {photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 pt-2">
                {photos.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/75 hover:bg-destructive text-white flex items-center justify-center transition-colors"
                      title="Remove photo"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-mono text-white leading-none">
                      {idx === 0 ? 'Cover' : `Photo ${idx + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center text-xs text-muted-foreground">
                No room photos uploaded yet. High-intent tenants prioritize rooms with clear, detailed images.
              </div>
            )}
          </div>
        </div>

        {/* VIDEO COLUMN */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-warning-foreground" />
                <h2 className="font-display font-semibold text-sm">Walkthrough Video</h2>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">1 required</span>
            </div>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => e.target.files && handleVideoFile(e.target.files)}
              className="hidden"
            />

            {/* Video Box */}
            {!video ? (
              <div
                onClick={() => videoInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-muted hover:border-warning/60 hover:bg-muted/10 rounded-lg p-6 text-center cursor-pointer transition-all min-h-[160px]"
              >
                <FileVideo className="h-8 w-8 text-muted-foreground/80 mb-2" />
                <span className="text-xs font-semibold">Select Walkthrough Video</span>
                <span className="text-[10px] text-muted-foreground mt-1 font-mono">MP4, MOV up to 50MB</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col rounded-lg border border-border bg-muted/10 p-4 space-y-3 justify-center min-h-[160px]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                    <FileVideo className="h-5 w-5 text-warning-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {typeof video === 'string' ? 'Walkthrough Video' : video.name}
                    </div>
                    <div className="text-[9px] text-muted-foreground font-mono">
                      {typeof video === 'string' ? 'Active Remote Asset' : `${(video.size / (1024 * 1024)).toFixed(2)} MB`}
                    </div>
                  </div>
                </div>

                {typeof video === 'string' && video.startsWith('http') && (
                  <video src={video} controls className="w-full aspect-video rounded-md object-cover border border-border bg-black" />
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeVideo}
                  className="w-full border-destructive/30 hover:bg-destructive/5 text-destructive text-xs gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove Video
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate({ to: '/owner/rooms' })}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleUpload}
          disabled={isSubmitting || photos.length < 3 || !video}
          className="bg-warning text-warning-foreground hover:bg-warning/90 font-semibold px-6 gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Publishing Proof...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" /> Publish & Verify Room
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
