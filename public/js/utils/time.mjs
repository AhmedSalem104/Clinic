export const clockMinutes = (value) => {
  if (value instanceof Date) return (value.getUTCHours() * 60) + value.getUTCMinutes();
  const text = String(value || '0:0');
  const match = text.match(/(?:^|T)(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return (Number(match[1]) * 60) + Number(match[2]);
};
