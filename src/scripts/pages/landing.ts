import type { Locale } from '../../config/site';
import { setButtonBusy, setMessage } from '../../lib/app/dom';
import { observeSession, signInWithGoogle } from '../../lib/firebase/session';
import { ensureFirebaseReady, getPageTranslator, redirectTo } from './shared';

export function mountLandingPage({ locale }: { locale: Locale }) {
  const t = getPageTranslator(locale);
  const signInForm = document.querySelector<HTMLFormElement>('#google-sign-in-form');
  const signInMessage = document.querySelector<HTMLElement>('#google-sign-in-message');
  const signInButton = document.querySelector<HTMLButtonElement>('[data-google-sign-in-button]');
  const sessionLoading = document.querySelector<HTMLElement>('[data-auth-session-loading]');

  const setSessionCheckVisible = (isVisible: boolean) => {
    if (sessionLoading) {
      sessionLoading.hidden = !isVisible;
      sessionLoading.setAttribute('aria-busy', String(isVisible));
    }

    if (signInButton) {
      signInButton.hidden = isVisible;
      signInButton.disabled = isVisible;
    }
  };

  const revealSignIn = () => setSessionCheckVisible(false);

  setSessionCheckVisible(true);

  if (!ensureFirebaseReady(locale)) {
    revealSignIn();
    signInForm?.querySelectorAll('button').forEach((node) => node.setAttribute('disabled', 'true'));
    return;
  }

  observeSession((user) => {
    if (user) {
      redirectTo(locale, 'dashboard');
      return;
    }

    revealSignIn();
  });

  signInForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setButtonBusy(signInButton, true, t('auth.signIn'), t('auth.loading'));

    try {
      await signInWithGoogle();
      setMessage(signInMessage, t('auth.success'), 'success');
      redirectTo(locale, 'dashboard');
    } catch (error) {
      setMessage(signInMessage, error instanceof Error ? error.message : t('auth.error'), 'danger');
      setButtonBusy(signInButton, false, t('auth.signIn'), t('auth.loading'));
    }
  });
}