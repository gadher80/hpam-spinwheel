import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { DEFAULT_PHOTO, PALETTE, getDisplayMembers, type Member, type WheelState } from '../lib/state';
import { SPIN_PRESETS, WIN_PRESETS } from '../lib/sounds';
import { ConfettiEngine } from '../lib/confetti';

export interface WheelHandle {
  spin: () => void;
}

interface WheelProps {
  state: WheelState;
  onWinner: (member: Member) => void;
  onHubClick?: () => void;
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

const Wheel = forwardRef<WheelHandle, WheelProps>(({ state, onWinner, onHubClick }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<ConfettiEngine | null>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const spinningRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [blurred, setBlurred] = useState(false);
  const [winnerCard, setWinnerCard] = useState<{ show: boolean; name: string; photo: string }>({ show: false, name: '', photo: '' });
  const [pointerLabel, setPointerLabel] = useState<{ show: boolean; text: string }>({ show: false, text: '' });
  const [pointerWiggle, setPointerWiggle] = useState(false);

  const R = 380; // canvas.width/2 (canvas is 760x760)

  function currentPointerSlice(members: Member[], rotation: number) {
    if (!members.length) return -1;
    const a = (Math.PI * 2) / members.length;
    const pointerAngle = -Math.PI / 2;
    const local = (((pointerAngle - rotation) % (Math.PI * 2)) + Math.PI * 2 * 2) % (Math.PI * 2);
    return Math.floor(local / a) % members.length;
  }

  function drawWheel(rot: number) {
    rotationRef.current = rot;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s = stateRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const members = getDisplayMembers(s);
    ctx.save();
    ctx.translate(R, R);
    ctx.rotate(rot);
    if (members.length === 0) {
      ctx.beginPath(); ctx.arc(0, 0, R - 6, 0, Math.PI * 2); ctx.fillStyle = '#efe6f5'; ctx.fill();
      ctx.fillStyle = '#7a6a8a'; ctx.font = '16px Georgia'; ctx.textAlign = 'center';
      ctx.rotate(-rot); ctx.fillText('Wheel has no entries yet', 0, 6);
      ctx.restore();
      return;
    }
    const a = (Math.PI * 2) / members.length;
    members.forEach((m, i) => {
      const start = i * a, end = start + a;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R - 6, start, end); ctx.closePath();
      ctx.fillStyle = PALETTE[i % PALETTE.length]; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      if (!s.blindMode) {
        ctx.save();
        ctx.rotate(start + a / 2);
        ctx.textAlign = 'right'; ctx.fillStyle = '#fff';
        const styleStr = s.fontFormat === 'italic' ? 'italic ' : '';
        const weightStr = s.fontFormat === 'bold' ? 'bold ' : '';
        ctx.font = `${styleStr}${weightStr}${s.fontSize}px Georgia`;
        ctx.shadowColor = '#0006'; ctx.shadowBlur = 3;
        ctx.fillText(m.name, R - 18, s.fontSize * 0.35);
        ctx.restore();
      }
    });
    ctx.restore();

    if (s.matchPointerColor && pointerRef.current) {
      const idx = currentPointerSlice(members, rot);
      if (idx >= 0) pointerRef.current.style.background = PALETTE[idx % PALETTE.length];
    } else if (pointerRef.current) {
      pointerRef.current.style.background = 'var(--purple-deep)';
    }
  }

  function computeTargetRotation(): number | null {
    const s = stateRef.current;
    const members = getDisplayMembers(s);
    const idx = members.findIndex((m) => m.id === s.winnerId);
    if (idx < 0) return null;
    const a = (Math.PI * 2) / members.length;
    const mid = idx * a + a / 2;
    const pointerAngle = -Math.PI / 2;
    const jitter = (Math.random() - 0.5) * a * 0.5;
    const TAU = Math.PI * 2;
    const rotation = rotationRef.current;
    const base = (((pointerAngle - (mid + jitter)) % TAU) + TAU * 2) % TAU;
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    if (s.spinDirection === 'ccw') {
      const k = Math.floor((rotation - base) / TAU);
      return base + (k - extraSpins) * TAU;
    }
    const k = Math.ceil((rotation - base) / TAU);
    return base + (k + extraSpins) * TAU;
  }

  function tick() {
    const s = stateRef.current;
    SPIN_PRESETS[s.spinSound]?.play(s.spinVol);
    if (s.pointerVibration) {
      setPointerWiggle(false);
      requestAnimationFrame(() => setPointerWiggle(true));
    }
  }

  function announceWinner() {
    const s = stateRef.current;
    const m = s.members.find((x) => x.id === s.winnerId);
    if (!m) return;
    if (s.winnerDisplayMode === 'popup') {
      setWinnerCard({ show: true, name: m.name, photo: m.photo || DEFAULT_PHOTO });
      setBlurred(true);
    } else {
      setPointerLabel({ show: true, text: m.name });
    }
    WIN_PRESETS[s.winSound]?.play(s.winVol);
    confettiRef.current?.burst(s.confettiEffect);
    onWinner(m);
  }

  function runSpin() {
    const s = stateRef.current;
    if (spinningRef.current) return;
    if (s.members.length < 2 || !s.winnerId) return;
    const target = computeTargetRotation();
    if (target === null) return;
    spinningRef.current = true;
    setWinnerCard((w) => ({ ...w, show: false }));
    setBlurred(false);
    setPointerLabel({ show: false, text: '' });
    const start = rotationRef.current;
    const durMul = s.spinSlowly ? 2.2 : 1;
    const duration = s.spinTime * 1000 * durMul;
    const t0 = performance.now();
    let lastTickSlice = -1;
    const members = getDisplayMembers(s);
    const a = (Math.PI * 2) / members.length;
    function frame(now: number) {
      const t = Math.min(1, (now - t0) / duration);
      const eased = easeOutCubic(t);
      const rot = start + eased * (target! - start);
      drawWheel(rot % (Math.PI * 2 * 1000));
      const slice = Math.floor((((rot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / a);
      if (slice !== lastTickSlice) { tick(); lastTickSlice = slice; }
      if (t < 1) { requestAnimationFrame(frame); }
      else { spinningRef.current = false; announceWinner(); }
    }
    requestAnimationFrame(frame);
  }

  useImperativeHandle(ref, () => ({ spin: runSpin }));

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [state]);

  useEffect(() => {
    if (confettiCanvasRef.current) {
      confettiRef.current = new ConfettiEngine(confettiCanvasRef.current);
      confettiRef.current.resize();
      const onResize = () => confettiRef.current?.resize();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
  }, []);

  const pointerClass = 'pointer' + (state.pointerStyle === 'classic' ? '' : ` ${state.pointerStyle}`) + (pointerWiggle ? ' wiggle' : '');

  return (
    <>
      <div className={'wheelWrap' + (blurred ? ' blurred' : '')} id="wheelWrap">
        <div ref={pointerRef} className={pointerClass} onAnimationEnd={() => setPointerWiggle(false)} />
        <div className={'pointerLabel' + (pointerLabel.show ? ' show' : '')}>{pointerLabel.text}</div>
        <canvas ref={canvasRef} id="wheel" width={760} height={760} />
        <div className="hub" id="hubEl" onClick={onHubClick} style={{ cursor: onHubClick ? 'pointer' : undefined }}>
          <img className="hubArt" src="/Hub Flower.png" alt="" />
        </div>
        <div className="winnerBanner">
          <div className={'winnerCard' + (winnerCard.show ? ' show' : '')}>
            <img
              className="winnerPhoto" src={winnerCard.photo} alt=""
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PHOTO; }}
            />
            <small>WINNER</small>
            <span>{winnerCard.name || '—'}</span>
          </div>
        </div>
      </div>
      <canvas ref={confettiCanvasRef} id="confettiCanvas" />
    </>
  );
});

export default Wheel;
