import { useRef, useState } from 'react';
import {
  Box, Paper, Tabs, Tab, TextField, Button, Stack, Select, MenuItem,
  Slider, Checkbox, FormControlLabel, Switch, Typography, IconButton, Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  DEFAULT_PHOTO, PALETTE, fmtPct, type WheelState, type Member,
  type ConfettiEffect, type PointerStyle, type FontFormat,
} from '../lib/state';
import { SPIN_PRESETS, WIN_PRESETS, setCustomSoundData } from '../lib/sounds';
import { CONFETTI_EFFECTS } from '../lib/confetti';
import { supabase } from '../lib/supabase';
import PhotoCropDialog from './PhotoCropDialog';

interface AdminPanelProps {
  state: WheelState;
  update: (patch: Partial<WheelState>) => void;
  onSpin: () => void;
}

const TABS = ['Entries', 'Customize', 'Sound', 'Skin', 'Results'] as const;

export default function AdminPanel({ state, update, onSpin }: AdminPanelProps) {
  const [tab, setTab] = useState(0);
  const [soundSub, setSoundSub] = useState<'spin' | 'win'>('spin');
  const [nameInput, setNameInput] = useState('');
  const [status, setStatus] = useState('');
  const dragId = useRef<string | null>(null);
  const [cropFor, setCropFor] = useState<{ id: string; file: File } | null>(null);

  function addMember() {
    const name = nameInput.trim();
    if (!name) return;
    update({ members: [...state.members, { id: crypto.randomUUID(), name }] });
    setNameInput('');
  }

  function removeMember(id: string) {
    update({
      members: state.members.filter((m) => m.id !== id),
      winnerId: state.winnerId === id ? null : state.winnerId,
    });
  }

  function duplicateMember(i: number) {
    const m = state.members[i];
    const copy: Member = { id: crypto.randomUUID(), name: m.name + ' (copy)', photo: m.photo || null };
    const members = [...state.members];
    members.splice(i + 1, 0, copy);
    update({ members });
  }

  function setPhoto(id: string, url: string) {
    update({ members: state.members.map((m) => (m.id === id ? { ...m, photo: url } : m)) });
  }

  async function uploadCroppedPhoto(id: string, blob: Blob) {
    setCropFor(null);
    const path = `${id}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('member-photos').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) { setStatus('Photo upload failed: ' + error.message); return; }
    const { data } = supabase.storage.from('member-photos').getPublicUrl(path);
    setPhoto(id, data.publicUrl);
  }

  function shuffle() {
    const members = [...state.members];
    for (let i = members.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [members[i], members[j]] = [members[j], members[i]];
    }
    update({ members });
  }

  function clearMembers() {
    if (!confirm('Remove all entries?')) return;
    update({ members: [], winnerId: null });
  }

  function resetWheel() {
    if (!confirm('Clear all members and winner?')) return;
    update({ members: [], winnerId: null, results: state.results });
  }

  function doSpin() {
    if (state.members.length < 2) { setStatus('Add at least 2 members.'); return; }
    if (!state.winnerId) { setStatus('Pick a predetermined winner first.'); return; }
    setStatus('Spinning...');
    onSpin();
  }

  function onDrop(overId: string) {
    if (!dragId.current || dragId.current === overId) return;
    const members = [...state.members];
    const from = members.findIndex((m) => m.id === dragId.current);
    const to = members.findIndex((m) => m.id === overId);
    if (from < 0 || to < 0) return;
    const [moved] = members.splice(from, 1);
    members.splice(to, 0, moved);
    update({ members });
  }

  return (
    <Paper elevation={4} sx={{ width: 'min(94vw, 480px)', maxHeight: '88vh', overflow: 'auto', borderRadius: 4 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 2 }}>
        {TABS.map((t) => <Tab key={t} label={t} sx={{ fontSize: 12 }} />)}
      </Tabs>
      <Box sx={{ p: 2.5 }}>

        {tab === 0 && (
          <Stack spacing={1.5}>
            <Typography variant="h6" color="secondary.dark">Entries</Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small" fullWidth placeholder="Member name" value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMember()}
              />
              <Button variant="contained" onClick={addMember}>Add</Button>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={shuffle}>Shuffle order</Button>
              <Button size="small" variant="outlined" color="error" onClick={clearMembers}>Clear all</Button>
            </Stack>
            <ul className="memberList">
              {state.members.map((m, i) => (
                <li
                  key={m.id}
                  draggable
                  onDragStart={() => (dragId.current = m.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(m.id)}
                >
                  <label>
                    <img
                      className="thumb" src={m.photo || DEFAULT_PHOTO} title="Click to change photo"
                      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PHOTO; }}
                    />
                    <input
                      type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        setCropFor({ id: m.id, file: f });
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <span className="swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="nm">{m.name}</span>
                  <span className="pct">{fmtPct(state.members.length)}</span>
                  <IconButton size="small" onClick={() => duplicateMember(i)}><ContentCopyIcon fontSize="inherit" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => removeMember(m.id)}><DeleteIcon fontSize="inherit" /></IconButton>
                </li>
              ))}
            </ul>

            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'secondary.dark' }}>Predetermined Winner</Typography>
            <Select size="small" fullWidth value={state.winnerId ?? ''} onChange={(e) => update({ winnerId: e.target.value || null })}>
              <MenuItem value="">— none —</MenuItem>
              {state.members.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
            </Select>
            <Button fullWidth variant="contained" size="large" sx={{ mt: 1 }} onClick={doSpin}>SPIN</Button>
            <Button fullWidth variant="outlined" onClick={resetWheel}>Reset Wheel</Button>
            {status && <Typography variant="caption" sx={{ color: 'teal', textAlign: 'center' }}>{status}</Typography>}
            <Typography variant="caption" color="text.secondary">Audience only ever sees the plain wheel. This panel is admin-only.</Typography>
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={1.5}>
            <Typography variant="h6" color="secondary.dark">Customize</Typography>
            <FormControlLabel control={<Checkbox checked={state.spinSlowly} onChange={(e) => update({ spinSlowly: e.target.checked })} />} label="Spin slowly" />
            <FormControlLabel control={<Checkbox checked={state.blindMode} onChange={(e) => update({ blindMode: e.target.checked })} />} label="Blind mode" />
            <FormControlLabel control={<Checkbox checked={state.matchPointerColor} onChange={(e) => update({ matchPointerColor: e.target.checked })} />} label="Match pointer with segment color" />

            <Typography variant="caption">Spin duration (seconds): {state.spinTime}</Typography>
            <Slider min={1} max={60} value={state.spinTime} onChange={(_, v) => update({ spinTime: v as number })} />

            <Typography variant="caption">Max names displayed on wheel: {state.maxDisplayed}</Typography>
            <Slider min={2} max={100} value={state.maxDisplayed} onChange={(_, v) => update({ maxDisplayed: v as number })} />

            <Divider />
            <FormControlLabel labelPlacement="start" sx={{ justifyContent: 'space-between', ml: 0 }}
              control={<Switch checked={state.autoRemoveWinner} onChange={(e) => update({ autoRemoveWinner: e.target.checked })} />}
              label="Auto-remove winner (5s after spin)" />
            <FormControlLabel labelPlacement="start" sx={{ justifyContent: 'space-between', ml: 0 }}
              control={<Switch checked={state.autoSwitchResults} onChange={(e) => update({ autoSwitchResults: e.target.checked })} />}
              label="Auto switch to Results" />

            <Typography variant="caption">Winner display mode</Typography>
            <Stack direction="row" spacing={1}>
              <Button fullWidth variant={state.winnerDisplayMode === 'popup' ? 'contained' : 'outlined'} onClick={() => update({ winnerDisplayMode: 'popup' })}>Popup Dialog</Button>
              <Button fullWidth variant={state.winnerDisplayMode === 'wheel' ? 'contained' : 'outlined'} onClick={() => update({ winnerDisplayMode: 'wheel' })}>Directly on Wheel</Button>
            </Stack>

            <Typography variant="caption">Confetti effect</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              {CONFETTI_EFFECTS.map(([key, label]) => (
                <Button key={key} size="small" variant={state.confettiEffect === key ? 'contained' : 'outlined'}
                  onClick={() => update({ confettiEffect: key as ConfettiEffect })}>{label}</Button>
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary">Entries and settings sync live via Supabase — no local save toggle needed.</Typography>
          </Stack>
        )}

        {tab === 2 && (
          <Stack spacing={1.5}>
            <Typography variant="h6" color="secondary.dark">Sound</Typography>
            <Stack direction="row" spacing={1}>
              <Button fullWidth size="small" variant={soundSub === 'spin' ? 'contained' : 'outlined'} onClick={() => setSoundSub('spin')}>Spin sound</Button>
              <Button fullWidth size="small" variant={soundSub === 'win' ? 'contained' : 'outlined'} onClick={() => setSoundSub('win')}>Win sound</Button>
            </Stack>

            {soundSub === 'spin' && (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  {Object.entries(SPIN_PRESETS).map(([key, p]) => (
                    <Paper key={key} variant="outlined" sx={{ p: 1, cursor: 'pointer', borderColor: state.spinSound === key ? 'secondary.dark' : undefined, borderWidth: state.spinSound === key ? 2 : 1 }}
                      onClick={() => update({ spinSound: key })}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{p.sub}</Typography>
                      <Button size="small" sx={{ mt: 0.5 }} onClick={(e) => { e.stopPropagation(); p.play(state.spinVol); }}>Preview</Button>
                    </Paper>
                  ))}
                </Box>
                <Typography variant="caption">Custom</Typography>
                <input type="file" accept="audio/*" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => { setCustomSoundData(reader.result as string); update({ customSoundData: reader.result as string, spinSound: 'custom' }); };
                  reader.readAsDataURL(f);
                }} />
                <Typography variant="caption">Master volume: {Math.round(state.spinVol * 100)}%</Typography>
                <Slider min={0} max={100} value={Math.round(state.spinVol * 100)} onChange={(_, v) => update({ spinVol: (v as number) / 100 })} />
              </>
            )}

            {soundSub === 'win' && (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  {Object.entries(WIN_PRESETS).map(([key, p]) => (
                    <Paper key={key} variant="outlined" sx={{ p: 1, cursor: 'pointer', borderColor: state.winSound === key ? 'secondary.dark' : undefined, borderWidth: state.winSound === key ? 2 : 1 }}
                      onClick={() => update({ winSound: key })}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{p.sub}</Typography>
                      <Button size="small" sx={{ mt: 0.5 }} onClick={(e) => { e.stopPropagation(); p.play(state.winVol); }}>Preview</Button>
                    </Paper>
                  ))}
                </Box>
                <Typography variant="caption">Fanfare intensity: {Math.round(state.winVol * 100)}%</Typography>
                <Slider min={0} max={100} value={Math.round(state.winVol * 100)} onChange={(_, v) => update({ winVol: (v as number) / 100 })} />
                <Button fullWidth variant="outlined" onClick={() => WIN_PRESETS[state.winSound]?.play(state.winVol)}>▷ Preview celebration</Button>
              </>
            )}
          </Stack>
        )}

        {tab === 3 && (
          <Stack spacing={1.5}>
            <Typography variant="h6" color="secondary.dark">Skin</Typography>
            <FormControlLabel labelPlacement="start" sx={{ justifyContent: 'space-between', ml: 0 }}
              control={<Switch checked={state.pointerVibration} onChange={(e) => update({ pointerVibration: e.target.checked })} />}
              label="Pointer vibration (wiggle on segment pass)" />

            <Typography variant="caption">Pointer style</Typography>
            <Stack direction="row" spacing={1}>
              {(['classic', 'diamond', 'wedge'] as PointerStyle[]).map((p) => (
                <Button key={p} fullWidth variant={state.pointerStyle === p ? 'contained' : 'outlined'} onClick={() => update({ pointerStyle: p })}>
                  {p[0].toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </Stack>

            <Typography variant="caption">Wheel Spin</Typography>
            <Stack direction="row" spacing={1}>
              <Button fullWidth variant={state.spinDirection === 'cw' ? 'contained' : 'outlined'} onClick={() => update({ spinDirection: 'cw' })}>Clockwise</Button>
              <Button fullWidth variant={state.spinDirection === 'ccw' ? 'contained' : 'outlined'} onClick={() => update({ spinDirection: 'ccw' })}>Counter-clockwise</Button>
            </Stack>

            <Typography variant="caption">Font size: {state.fontSize}px</Typography>
            <Slider min={10} max={30} value={state.fontSize} onChange={(_, v) => update({ fontSize: v as number })} />

            <Typography variant="caption">Font format</Typography>
            <Stack direction="row" spacing={1}>
              {(['normal', 'bold', 'italic'] as FontFormat[]).map((f) => (
                <Button key={f} fullWidth variant={state.fontFormat === f ? 'contained' : 'outlined'} onClick={() => update({ fontFormat: f })}>
                  {f[0].toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </Stack>

            <Typography variant="caption">Font color</Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <input
                type="color" value={state.fontColor}
                onChange={(e) => update({ fontColor: e.target.value })}
                style={{ width: 44, height: 36, padding: 0, border: 'none', borderRadius: 6, cursor: 'pointer' }}
              />
              <TextField
                size="small" value={state.fontColor}
                onChange={(e) => update({ fontColor: e.target.value })}
                sx={{ width: 110 }}
              />
            </Stack>
          </Stack>
        )}

        {tab === 4 && (
          <Stack spacing={1.5}>
            <Typography variant="h6" color="secondary.dark">Results</Typography>
            <ul className="resultsList">
              {state.results.length === 0 && <li style={{ justifyContent: 'center', color: '#9a8aa8' }}>No spins yet</li>}
              {state.results.slice().reverse().map((r, i) => (
                <li key={i}><span>{r.name}</span><span className="t">{new Date(r.time).toLocaleTimeString()}</span></li>
              ))}
            </ul>
            <Button fullWidth variant="outlined" onClick={() => update({ results: [] })}>Clear results</Button>
          </Stack>
        )}

      </Box>

      {cropFor && (
        <PhotoCropDialog
          file={cropFor.file}
          onCancel={() => setCropFor(null)}
          onCropped={(blob) => uploadCroppedPhoto(cropFor.id, blob)}
        />
      )}
    </Paper>
  );
}
