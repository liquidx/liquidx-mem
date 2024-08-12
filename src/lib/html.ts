export const htmlEscape = (s: string | undefined) => {
  if (typeof s !== 'string') {
    return s;
  }
  return s.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      })[tag]
  );
};
