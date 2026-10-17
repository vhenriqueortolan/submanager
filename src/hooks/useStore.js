import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { normalizeSettings } from '../lib/settings.js';
import { removePersonFromState, renamePerson } from '../lib/people.js';
import { addPayment, removePayment } from '../lib/payments.js';
import { cancelSub, pauseSub, resumeSub } from '../lib/status.js';
import { clearAllData, defaultState, loadState, saveState, STORAGE_KEY } from '../lib/storage.js';

function reducer(state, action) {
  switch (action.type) {
    case 'replace':
      return action.state;

    case 'completeOnboarding':
      return {
        ...state,
        name: action.name.trim() || 'Membro',
        budget: parseFloat(action.budget) || 0,
        interests: action.interests,
        onboarded: true,
      };

    case 'saveProfile':
      return {
        ...state,
        name: action.name.trim() || state.name || 'Membro',
        budget: parseFloat(action.budget) || 0,
        interests: action.interests,
      };

    case 'upsertSub': {
      const exists = state.subs.some((s) => s.id === action.sub.id);
      return {
        ...state,
        subs: exists
          ? state.subs.map((s) => (s.id === action.sub.id ? action.sub : s))
          : [...state.subs, action.sub],
      };
    }

    case 'deleteSub':
      return { ...state, subs: state.subs.filter((s) => s.id !== action.id) };

    case 'setStatus': {
      const op = { pause: pauseSub, cancel: cancelSub, resume: resumeSub }[action.op];
      if (!op) return state;
      return { ...state, subs: state.subs.map((s) => (s.id === action.id ? op(s, action.day) : s)) };
    }

    case 'markPaid':
      return {
        ...state,
        subs: state.subs.map((s) =>
          s.id === action.id ? addPayment(s, action.cycle, action.day, action.paymentId) : s),
      };

    case 'unmarkPaid':
      return {
        ...state,
        subs: state.subs.map((s) => (s.id === action.id ? removePayment(s, action.paymentId) : s)),
      };

    case 'addPerson':
      return state.people.some((p) => p.id === action.person.id)
        ? state
        : { ...state, people: [...state.people, action.person] };

    case 'renamePerson': {
      const result = renamePerson(state.people, action.id, action.name);
      return result.people ? { ...state, people: result.people } : state;
    }

    case 'removePerson':
      return removePersonFromState(state, action.id);

    case 'updateSettings':
      return { ...state, settings: normalizeSettings({ ...state.settings, ...action.patch }) };

    case 'backupDone':
      return { ...state, lastBackupAt: action.day };

    case 'snoozeBackup':
      return { ...state, backupSnoozeUntil: action.until };

    case 'markNotified': {
      const ids = new Set(action.ids);
      return {
        ...state,
        subs: state.subs.map((s) => (ids.has(s.id) ? { ...s, lastNotified: action.day } : s)),
      };
    }

    default:
      return state;
  }
}

/** Estado global do app, persistido no localStorage e sincronizado entre abas. */
export function useStore() {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState());
  const [saveFailed, setSaveFailed] = useState(false);
  const lastSaved = useRef(null);

  // Persistência: grava sempre que o estado muda (pula se for idêntico ao que já está salvo).
  useEffect(() => {
    const json = JSON.stringify(state);
    if (json === lastSaved.current) return;
    lastSaved.current = json;
    setSaveFailed(!saveState(state));
  }, [state]);

  // Sincroniza com outras abas/janelas (evita uma aba antiga sobrescrever dados novos).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      const next = loadState();
      lastSaved.current = JSON.stringify(next); // já está salvo: não regrava
      dispatch({ type: 'replace', state: next });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Apaga o armazenamento e volta ao estado inicial sem regravá-lo (nada fica salvo depois de apagar).
  const resetAll = useCallback(() => {
    const ok = clearAllData();
    const fresh = defaultState();
    lastSaved.current = JSON.stringify(fresh);
    dispatch({ type: 'replace', state: fresh });
    return ok;
  }, []);

  return { state, dispatch, saveFailed, resetAll };
}
