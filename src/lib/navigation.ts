import type { useRouter } from 'expo-router';

// router.back() throws when there is no history (e.g. after a redirect or a page reload on web).
export function goBack(router: ReturnType<typeof useRouter>, fallback: '/' | '/orders' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
