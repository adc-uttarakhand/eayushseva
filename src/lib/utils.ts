export const normalizeForSearch = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\s+/g, '');
};
