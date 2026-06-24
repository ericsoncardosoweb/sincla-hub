import { useEffect } from 'react';

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content') ?? '';
    if (description && meta) {
      meta.setAttribute('content', description);
    }

    return () => {
      document.title = previousTitle;
      if (description && meta) {
        meta.setAttribute('content', previousDescription);
      }
    };
  }, [title, description]);
}
