import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, TextField, Button, Typography, Paper, IconButton } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import Wheel, { type WheelHandle } from './components/Wheel';
import AdminPanel from './components/AdminPanel';
import { supabase, STATE_TABLE, STATE_ROW_ID } from './lib/supabase';
import { defaultState, type WheelState, type Member } from './lib/state';
import { setCustomSoundData } from './lib/sounds';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

export default function App() {
  const [state, setState] = useState<WheelState>(defaultState());
  const [loaded, setLoaded] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState(location.hash === '#admin');
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem('wheeladmin_ok') === '1');
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');

  const wheelRef = useRef<WheelHandle>(null);
  const lastSpinToken = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ---- load + realtime sync ----
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase.from(STATE_TABLE).select('data').eq('id', STATE_ROW_ID).maybeSingle();
      if (data?.data) {
        applyIncoming(data.data as WheelState);
      } else {
        const init = defaultState();
        await supabase.from(STATE_TABLE).upsert({ id: STATE_ROW_ID, data: init });
        applyIncoming(init);
      }
      setLoaded(true);

      channel = supabase
        .channel('wheel_state_changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: STATE_TABLE, filter: `id=eq.${STATE_ROW_ID}` }, (payload) => {
          applyIncoming(payload.new.data as WheelState);
        })
        .subscribe();
    })();

    return () => { channel && supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyIncoming(incoming: WheelState) {
    if (incoming.customSoundData !== undefined) setCustomSoundData(incoming.customSoundData);
    setState(incoming);
    if (lastSpinToken.current !== null && incoming.spinToken !== lastSpinToken.current) {
      wheelRef.current?.spin();
    }
    lastSpinToken.current = incoming.spinToken;
  }

  const update = useCallback((patch: Partial<WheelState>) => {
    const next = { ...stateRef.current, ...patch };
    setState(next);
    stateRef.current = next;
    supabase.rpc('merge_wheel_state', { patch }).then();
  }, []);

  function triggerSpin() {
    const nextToken = stateRef.current.spinToken + 1;
    update({ spinToken: nextToken });
    lastSpinToken.current = nextToken; // don't double-spin if the realtime echo arrives later
    wheelRef.current?.spin();
  }

  function onWinner(m: Member) {
    const results = [...stateRef.current.results, { name: m.name, time: Date.now() }];
    update({ results });
    if (stateRef.current.autoRemoveWinner) {
      setTimeout(() => {
        update({ members: stateRef.current.members.filter((x) => x.id !== m.id), winnerId: null });
      }, 5000);
    }
  }

  // ---- hash routing ----
  useEffect(() => {
    const onHash = () => setIsAdminRoute(location.hash === '#admin');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function tryEnter() {
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('wheeladmin_ok', '1');
      setUnlocked(true);
      setPwErr('');
    } else {
      setPwErr('Incorrect password.');
      setPw('');
    }
  }

  const showAdmin = isAdminRoute && unlocked;
  const showGate = isAdminRoute && !unlocked;

  return (
    <>
      <div className="brandBadge">
        <img className="badgeLogo" src="/Logo Transparent Clean.png" alt="HPAM logo" />
        <img className="badgeTitle" src="/title HariPrabodham Amrut Mahotsav.png" alt="HariPrabodham Amrut Mahotsav" />
      </div>

      <IconButton
        id="fullscreenBtn"
        title="Fullscreen"
        onClick={() => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }}
      >
        <FullscreenIcon />
      </IconButton>

      <Box component="main" sx={{ maxWidth: 1100, mx: 'auto', p: 2.5, display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        {loaded && <Wheel ref={wheelRef} state={state} onWinner={onWinner} onHubClick={triggerSpin} />}
        {showAdmin && <AdminPanel state={state} update={update} onSpin={triggerSpin} />}
      </Box>

      {showGate && (
        <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(61,26,92,0.87)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper sx={{ borderRadius: 4, p: 3.5, width: 'min(90vw, 320px)', textAlign: 'center' }}>
            <Typography variant="h6" color="secondary.dark" gutterBottom>Admin Access</Typography>
            <TextField
              fullWidth size="small" type="password" placeholder="Password" value={pw} autoFocus
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tryEnter()}
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" color="error" sx={{ display: 'block', minHeight: 16, mb: 1 }}>{pwErr}</Typography>
            <Button fullWidth variant="contained" onClick={tryEnter}>Enter</Button>
          </Paper>
        </Box>
      )}
    </>
  );
}
