import { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Slider } from '@mui/material';

const PREVIEW = 280;
const OUTPUT = 480;

interface PhotoCropDialogProps {
  file: File;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

export default function PhotoCropDialog({ file, onCancel, onCropped }: PhotoCropDialogProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [url, setUrl] = useState('');

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  function onImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    const s = Math.max(PREVIEW / img.naturalWidth, PREVIEW / img.naturalHeight);
    setBaseScale(s);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function clamp(next: { x: number; y: number }, z: number) {
    const img = imgRef.current;
    if (!img) return next;
    const w = img.naturalWidth * baseScale * z;
    const h = img.naturalHeight * baseScale * z;
    const maxX = Math.max(0, (w - PREVIEW) / 2);
    const maxY = Math.max(0, (h - PREVIEW) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset(clamp({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }, zoom));
  }
  function onPointerUp() { dragRef.current = null; }
  function onZoom(v: number) {
    setZoom(v);
    setOffset((o) => clamp(o, v));
  }

  function confirm() {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d')!;
    const ratio = OUTPUT / PREVIEW;
    const w = img.naturalWidth * baseScale * zoom * ratio;
    const h = img.naturalHeight * baseScale * zoom * ratio;
    ctx.save();
    ctx.translate(OUTPUT / 2 + offset.x * ratio, OUTPUT / 2 + offset.y * ratio);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    canvas.toBlob((blob) => { if (blob) onCropped(blob); }, 'image/jpeg', 0.85);
  }

  return (
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Crop photo</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            width: PREVIEW, height: PREVIEW, borderRadius: '50%', overflow: 'hidden', mx: 'auto',
            position: 'relative', bgcolor: '#eee', touchAction: 'none', cursor: 'grab',
            border: '3px solid', borderColor: 'secondary.dark',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {url && (
            <img
              ref={imgRef}
              src={url}
              alt=""
              onLoad={onImgLoad}
              draggable={false}
              style={{
                position: 'absolute', left: '50%', top: '50%', userSelect: 'none',
                width: imgRef.current ? imgRef.current.naturalWidth * baseScale * zoom : undefined,
                height: imgRef.current ? imgRef.current.naturalHeight * baseScale * zoom : undefined,
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          )}
        </Box>
        <Box sx={{ px: 1, mt: 2 }}>
          <Slider min={1} max={3} step={0.01} value={zoom} onChange={(_, v) => onZoom(v as number)} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={confirm}>Use photo</Button>
      </DialogActions>
    </Dialog>
  );
}
