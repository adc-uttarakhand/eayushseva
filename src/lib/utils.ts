export const normalizeForSearch = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/ph/g, 'f')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/sh/g, 's')
    .replace(/c/g, 's')
    .replace(/q/g, 'k')
    .replace(/y/g, 'i')
    .replace(/z/g, 's');
};
